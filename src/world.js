import * as THREE from 'three';
import { INTERIOR_NAMES } from './planning/interiors.js';
import { generatePlan } from './planning/generate.js';
import { CELL_SIZE, DIRECTIONS, keyOf } from './planning/templates.js';
import { createBedroomSet } from './art/bedroom-set.js';
import { createThreatProxy } from './rendering/threat-proxy.js';
import { appearanceFor } from './personalization/fear.js';
import { wallSurfaces, unionPatches } from './rendering/wall-surfaces.js';
import { createStoryProxies } from './rendering/story-proxies.js';
import { sealDoorTransaction } from './planning/door-transaction.js';

export function createWorld(scene, plan = generatePlan('42'), {threatAppearanceId='generic-proxy'}={}) {
  appearanceFor(threatAppearanceId);
  const root = new THREE.Group();
  const solids = [], doorMeshes = [], resources = new Set();
  function material(color, extra = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: .9, ...extra }); resources.add(m); return m;
  }
  const wall = material(0x677267), trim = material(0x343e36), wood = material(0x62523f);
  const floor = material(0x514c3f), bedroomFloor = material(0x39363f), cloth = material(0x8d917d);
  const palette = [0x758779, 0x7b8699, 0x96836d, 0x85768a];
  const roomMaterials = new Map(plan.rooms.map(r => [r.id, material(palette[Math.floor(r.tint * palette.length)])]));
  const roomTrimMaterials=new Map(plan.rooms.map(r=>[r.id,material(0x343e36)]));
  roomMaterials.set('bedroom', material(0x514a58));
  const unitBox = new THREE.BoxGeometry(1, 1, 1); resources.add(unitBox);
  let activeParent=null;
  function box(w, h, d, x, y, z, mat, solid = false) {
    const mesh = new THREE.Mesh(unitBox, mat);
    mesh.scale.set(w, h, d);
    mesh.position.set(x-(activeParent?.pivot.x??0), y, z-(activeParent?.pivot.z??0));
    mesh.receiveShadow = true; mesh.castShadow = solid;
    (activeParent?.group??root).add(mesh); if (solid) solids.push(mesh); return mesh;
  }
  for (const tile of plan.cells) {
    const x = tile.x * CELL_SIZE, z = tile.z * CELL_SIZE;
    const isBedroom = tile.roomId === 'bedroom';
    box(CELL_SIZE, .12, CELL_SIZE, x, -.06, z, isBedroom ? bedroomFloor : floor);
    box(CELL_SIZE, .1, CELL_SIZE, x, 3.05, z, isBedroom ? roomMaterials.get('bedroom') : wall);
    if (!isBedroom) for (const offset of [-1, 0, 1]) box(.012, .004, CELL_SIZE, x + offset * CELL_SIZE / 3, .002, z, trim);
  }
  function boundaryMesh(boxes, height, getMaterial, cap=false,roomFilter=null) {
    const vertices=[],indices=[],groups=[],materials=[];
    const quad=(points,mat)=>{
      let materialIndex=materials.indexOf(mat);
      if(materialIndex<0) {materialIndex=materials.length;materials.push(mat);}
      const offset=vertices.length/3,start=indices.length;
      vertices.push(...points.flat());indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
      groups.push([start,6,materialIndex]);
    };
    for(const f of wallSurfaces(boxes)) {
      if(roomFilter && f.roomId!==roomFilter)continue;
      const at=(t,y)=>f.axis==='X'?[f.plane,y,t]:[t,y,f.plane];
      const points=[at(f.start,0),at(f.start,height),at(f.end,height),at(f.end,0)];
      if(f.axis==='X' ? f.sign<0 : f.sign>0) points.reverse();
      quad(points,getMaterial(f.roomId));
    }
    if(cap) for(const p of unionPatches(boxes)) {
      if(roomFilter&&p.roomId!==roomFilter)continue;
      quad([[p.minX,height,p.minZ],[p.minX,height,p.maxZ],[p.maxX,height,p.maxZ],[p.maxX,height,p.minZ]],getMaterial(p.roomId));
    }
    const geometry=new THREE.BufferGeometry();resources.add(geometry);
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    for(const group of groups) geometry.addGroup(...group);
    const mesh=new THREE.Mesh(geometry,materials);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
  }
  const baseWalls=boundaryMesh(plan.walls,3,id=>roomMaterials.get(id)??wall);
  solids.push(baseWalls);
  const trimBoxes=plan.walls.map(b=>({...b,minX:b.minX-.0175,maxX:b.maxX+.0175,
    minZ:b.minZ-.0175,maxZ:b.maxZ+.0175}));
  const baseTrim=boundaryMesh(trimBoxes,.12,id=>roomTrimMaterials.get(id)??trim,true);
  const bookMaterials = [material(0x78604b), material(0x405756), material(0x884f46), material(0xaba17b)];
  let doorHeight = 1.2;
  const doorHeaders=new Map();
  const bedroomDoor = plan.doors.find(d => d.id === 'bedroom');
  let bedroomDoorAssembly = null;
  for (const d of plan.doors) {
    doorHeaders.set(d.id,box(d.axis === 'x' ? .2 : 1.6, .6,
      d.axis === 'x' ? 1.6 : .2, d.x, 2.7, d.z, trim));
    if (!d.closed) continue;
    if (d.id === 'bedroom') {
      bedroomDoorAssembly = new THREE.Group();
      bedroomDoorAssembly.position.set(d.x, doorHeight, d.z);
      root.add(bedroomDoorAssembly);
      const geometry = new THREE.BoxGeometry(d.axis === 'x' ? .12 : 1.6, 2.4, d.axis === 'x' ? 1.6 : .12);
      resources.add(geometry);
      const door = new THREE.Mesh(geometry, wood);
      door.userData.doorId = d.id;
      door.castShadow = true; door.receiveShadow = true;
      bedroomDoorAssembly.add(door); doorMeshes.push(door);
    } else {
      const door = box(d.axis === 'x' ? .12 : 1.6, 2.4, d.axis === 'x' ? 1.6 : .12, d.x, doorHeight, d.z, wood);
      door.userData.doorId = d.id; doorMeshes.push(door);
    }
  }
  const sealedDoors=(plan.content?.instances??[]).filter(item=>item.definitionId==='B20')
    .map(instance=>{
      const door=plan.doors.find(item=>item.id===instance.entryDoorId),
        transaction=sealDoorTransaction(plan,instance.entryDoorId);
      if(!door||!transaction.accepted)return null;
      const mesh=boundaryMesh(transaction.plan.walls,3,id=>roomMaterials.get(id)??wall);
      mesh.name=`story-${instance.instanceId}-sealed-wall`;mesh.visible=false;
      const trimMesh=boundaryMesh(transaction.plan.walls.map(b=>({...b,
        minX:b.minX-.0175,maxX:b.maxX+.0175,
        minZ:b.minZ-.0175,maxZ:b.maxZ+.0175})),.12,
        id=>roomTrimMaterials.get(id)??trim,true);
      trimMesh.visible=false;
      return {instance,mesh,trimMesh,transaction,active:false};
    }).filter(Boolean);
  const tiltInstance=plan.content?.instances.find(item=>item.definitionId==='B19');
  let tiltRoom=null;
  if(tiltInstance) {
    const group=new THREE.Group();group.name=`story-${tiltInstance.instanceId}-visual-group`;
    group.matrixAutoUpdate=false;
    group.matrix.makeTranslation(tiltInstance.pivot.x,0,tiltInstance.pivot.z);
    group.matrixWorldNeedsUpdate=true;root.add(group);
    const wallMaterial=roomMaterials.get(tiltInstance.roomId).clone(),
      trimMaterial=roomTrimMaterials.get(tiltInstance.roomId).clone();
    resources.add(wallMaterial);resources.add(trimMaterial);
    const wallMesh=boundaryMesh(plan.walls,3,()=>wallMaterial,false,tiltInstance.roomId),
      trimMesh=boundaryMesh(trimBoxes,.12,()=>trimMaterial,true,tiltInstance.roomId);
    for(const mesh of [wallMesh,trimMesh]) {
      root.remove(mesh);group.add(mesh);
      mesh.position.set(-tiltInstance.pivot.x,0,-tiltInstance.pivot.z);
      mesh.visible=false;
    }
    tiltRoom={instance:tiltInstance,group,wallMesh,trimMesh};
  }
  const bedroomDecor = createBedroomSet({
    THREE, plan, root, addBox: box, addMaterial: material, unitBox,
    doorAssembly: bedroomDoorAssembly, resources,
  });
  for (const b of plan.obstacles) {
    activeParent=tiltRoom&&b.roomId===tiltRoom.instance.roomId
      ?{group:tiltRoom.group,pivot:tiltRoom.instance.pivot}:null;
    if (bedroomDecor.handledObstacles.has(b.id)) continue;
    if (['statue-plinth','story-actor','banquet-table','banquet-chair','head-pedestal','doll-chair','joint-chair','monitor-chair','mirror-chair','story-door-leaf','memory-bed','water-story-bed','flower-stand','cabinet','side-door-figure','frozen-table','frozen-person','water-basin'].includes(b.kind)) continue;
    const x = (b.minX + b.maxX) / 2, z = (b.minZ + b.maxZ) / 2;
    const w = b.maxX-b.minX, d = b.maxZ-b.minZ;
    if (b.kind === 'bed') {
      box(w, .45, d, x, .225, z, wood, true);
      box(w, .18, d, x, .54, z, cloth);
      box(.65, .12, .45, x, .69, z + .5, cloth);
    } else if (b.kind === 'bookshelf') {
      const alongX = w > d, h = b.height;
      const [nx,nz]=b.wallNormal,tx=-nz,tz=nx,length=Math.max(w,d),depth=Math.min(w,d);
      const part=(length,height,depth,u,y,v,mat,solid=false)=>box(alongX?length:depth,height,alongX?depth:length,x+tx*u+nx*v,y,z+tz*u+nz*v,mat,solid);
      // Rear panel faces the wall; sides, shelves and books meet without overlapping.
      part(length,h,.1,0,h/2,(depth-.1)/2,wood,true);
      for (const sign of [-1,1]) part(.1,h,depth-.1,sign*(length-.1)/2,h/2,-.05,wood,true);
      for (let row=0; row<4; row++) {
        const y=.08+row*.56;
        part(length-.2,.08,depth-.1,0,y,-.05,wood);
        for (let col=0; col<7; col++) {
          const bookStep=(length-.2)/7, offset=(col-3)*bookStep, bh=.29+.13*((col+row)%3)/2;
          part(bookStep*.7,bh,depth-.2,offset,y+.04+bh/2,-.05,bookMaterials[(col+row+Math.floor(b.decoration*4))%4]);
        }
      }
      part(length-.2,.08,depth-.1,0,h-.04,-.05,wood);
    } else {
      box(w,b.height-.08,d,x,(b.height-.08)/2,z,wood,true);
      box(w,.08,d,x,b.height-.04,z,trim,true);
    }
  }
  activeParent=null;
  const storyProxies=createStoryProxies(THREE,root,plan,{material,box,resources,scene});
  function label(text, x, z, y = 2.55, width = 2.4) {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas'); canvas.width = Math.round(width/.45*96); canvas.height = 96;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#17211de6'; ctx.fillRect(0, 0, canvas.width, 96);
    ctx.fillStyle = '#d1d7bd'; ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, canvas.width/2, 59);
    const texture = new THREE.CanvasTexture(canvas); resources.add(texture);
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: true }); resources.add(mat);
    const sprite = new THREE.Sprite(mat); sprite.position.set(x, y, z); sprite.scale.set(width, .45, 1); root.add(sprite);
  }
  const windowMat = material(0x73838a, { emissive: 0x34454c, emissiveIntensity: .2 });
  const eyeWindowMat = material(0x101514);
  for (const room of plan.rooms) {
    const x = room.center[0] * CELL_SIZE, z = room.center[1] * CELL_SIZE;
    const isBedroom = room.id === 'bedroom';
    const light = new THREE.PointLight(room.tint > .5 ? 0xf0cca1 : 0xaec7bc, isBedroom ? 2.6 : 5.5, 12, 2);
    light.position.set(x, 2.65, z); root.add(light);
    box(.65, .08, .65, x, 2.95, z, material(isBedroom ? 0x514a58 : 0x8d9488, { emissive: isBedroom ? 0x282431 : 0x777b70, emissiveIntensity: isBedroom ? .12 : .16 }));
    if (!isBedroom) label(`${room.name} · ${INTERIOR_NAMES[room.interior.type]}`, x, z);
    const boundaries = [];
    const roomCells = new Set(room.cells.map(([x,z])=>keyOf(x,z)));
    for (const [cx, cz] of room.cells) for (const [dx, dz] of DIRECTIONS) {
      if (!roomCells.has(keyOf(cx + dx, cz + dz))) boundaries.push({ cx, cz, dx, dz });
    }
    if (boundaries.length && !isBedroom) {
      const { cx, cz, dx, dz } = boundaries[Math.floor(room.tint * boundaries.length)];
      const wx = cx * CELL_SIZE + dx * (CELL_SIZE / 2 - .13), wz = cz * CELL_SIZE + dz * (CELL_SIZE / 2 - .13);
      box(dx ? .04 : 1.4, 1.3, dx ? 1.4 : .04, wx, 1.9, wz, trim);
      const hasEye=plan.content?.instances.some(instance=>instance.definitionId==='BO01'&&instance.roomId===room.id);
      box(dx ? .06 : 1.2, 1.1, dx ? 1.2 : .06, wx - dx * .025, 1.9, wz - dz * .025, hasEye?eyeWindowMat:windowMat);
      box(dx ? .08 : .06, 1.15, dx ? .06 : .08, wx - dx * .06, 1.9, wz - dz * .06, trim);
    }
  }
  root.add(new THREE.HemisphereLight(0xb0bfb1, 0x3d382e, .62));
  // Small non-interactive placeholders; do not change the validated walking space.
  const cats = [];
  if (plan.story?.cat) {
    const group = new THREE.Group(); group.name = 'story-CAT01'; root.add(group);
    const fur = material(0x7c776f), eyes = material(0xcbdba0, { emissive: 0x839257, emissiveIntensity: .6 });
    for (const slot of plan.story.cat.slots) {
      const body = new THREE.Group(), head = new THREE.Group();
      body.position.set(slot.x, 0, slot.z); group.add(body);
      const part = (parent, w, h, d, x, y, z, mat) => {
        const mesh = new THREE.Mesh(unitBox, mat); mesh.scale.set(w, h, d); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
      };
      part(body, .38, .36, .6, 0, .25, 0, fur);
      head.position.set(0, .55, -.14); body.add(head);
      part(head, .34, .28, .3, 0, 0, 0, fur);
      for (const side of [-1, 1]) {
        part(head, .09, .16, .12, side * .12, .19, 0, fur);
        part(head, .045, .05, .015, side * .09, .02, -.155, eyes);
      }
      part(body, .08, .35, .08, 0, .4, .3, fur);
      cats.push({ body, head });
    }
  }
  function updateStory(story, player) {
    storyProxies.update(story);
    if(tiltRoom) {
      const phase=story.instances?.[tiltRoom.instance.instanceId],
        active=phase?.phase==='tilting'||phase?.phase==='tilted',
        progress=Math.max(0,Math.min(1,phase?.progress??0)),
        ease=progress*progress*(3-2*progress),
        shear=Math.tan(tiltRoom.instance.tiltRadians)*tiltRoom.instance.tiltSign*ease,
        pivot=tiltRoom.instance.pivot;
      tiltRoom.group.matrix.set(1,tiltRoom.instance.tiltAxis==='z'?shear:0,0,pivot.x,
        0,1,0,0,
        0,tiltRoom.instance.tiltAxis==='x'?shear:0,1,pivot.z,
        0,0,0,1);
      tiltRoom.group.matrixWorldNeedsUpdate=true;
      roomMaterials.get(tiltRoom.instance.roomId).visible=!active;
      roomTrimMaterials.get(tiltRoom.instance.roomId).visible=!active;
      tiltRoom.wallMesh.visible=active;tiltRoom.trimMesh.visible=active;
    }
    for(const door of sealedDoors) {
      const phase=story.instances?.[door.instance.instanceId]?.phase;
      const closed=phase==='sealed'||phase==='confirmed';
      door.mesh.visible=closed;
      door.trimMesh.visible=closed;
      baseWalls.visible=!closed;baseTrim.visible=!closed;
      doorHeaders.get(door.instance.entryDoorId).visible=!closed;
      if(closed!==door.active) {
        if(closed) {
          solids.splice(solids.indexOf(baseWalls),1);
          solids.push(door.mesh);
        } else {
          solids.splice(solids.indexOf(door.mesh),1);
          solids.push(baseWalls);
        }
        door.active=closed;
      }
    }
    for (const { body, head } of cats) {
      const dead = story.catPhase === 'dead';
      body.rotation.z = dead ? Math.PI / 2 : 0;
      body.position.y = dead ? .2 : 0;
      head.rotation.y = dead ? 0 : Math.atan2(body.position.x - player.x, body.position.z - player.z);
    }
  }
  let statue=null;
  if(plan.threat) {
    statue=createThreatProxy(threatAppearanceId,resources);root.add(statue);
    statue.position.set(plan.threat.spawn.x,0,plan.threat.spawn.z);
    statue.rotation.y=Math.atan2(plan.threat.observation.x-plan.threat.spawn.x,plan.threat.observation.z-plan.threat.spawn.z);
  }

  function updateThreat(threat,player) {
    exitLight.intensity=threat?.phase==='escaped'?15:10;
    exitMarker.material.emissiveIntensity=threat?.phase==='escaped'?1.2:.7;
    if(!statue || !threat) return;
    statue.position.set(threat.x,0,threat.z);
    const facing=threat.behaviorId==='hearing-investigator'?threat.memory?.lastSound
      :threat.seesPlayer?player:null;
    if(facing&&threat.phase!=='escaped')
      statue.rotation.y=Math.atan2(facing.x-threat.x,facing.z-threat.z);
  }
  const exitMarker = box(1.25, .035, 1.25, plan.exit.x, .02, plan.exit.z, material(0x84bba2, { emissive: 0x497e61, emissiveIntensity: .7 }));
  exitMarker.name='exit-marker';
  // Overhead fixture and pool of light occupy no additional walking space.
  const exitFixture=box(.9,.06,.9,plan.exit.x,2.87,plan.exit.z,material(0xc3d7c9,{emissive:0xb3d1c0,emissiveIntensity:1}));
  exitFixture.name='exit-fixture';
  const exitLight=new THREE.SpotLight(0xb8e4cd,10,4,Math.PI/6,.7,1.5);
  exitLight.name='exit-light';exitLight.position.set(plan.exit.x,2.82,plan.exit.z);
  exitLight.target.position.set(plan.exit.x,0,plan.exit.z);
  exitLight.castShadow=true;exitLight.shadow.mapSize.set(256,256);exitLight.shadow.bias=-.0003;
  resources.add(exitLight);root.add(exitLight,exitLight.target);
  label('出口', plan.exit.x, plan.exit.z, 2.15, 1.2);

  const doorCollider = bedroomDoor && { minX: bedroomDoor.x - (bedroomDoor.axis === 'x' ? .08 : .8), maxX: bedroomDoor.x + (bedroomDoor.axis === 'x' ? .08 : .8), minZ: bedroomDoor.z - (bedroomDoor.axis === 'x' ? .8 : .08), maxZ: bedroomDoor.z + (bedroomDoor.axis === 'x' ? .8 : .08) };
  const chaseDoor=plan.chase&&plan.doors.find(d=>d.id===plan.chase.retreatDoorId);
  const chaseDoorMesh=chaseDoor?box(chaseDoor.axis==='x'?.14:1.6,2.4,
    chaseDoor.axis==='x'?1.6:.14,chaseDoor.x,1.2,chaseDoor.z,wood):null;
  if(chaseDoorMesh){chaseDoorMesh.visible=false;chaseDoorMesh.name='chase-retreat-door';}
  const chaseDoorCollider=chaseDoor&&{minX:chaseDoor.x-(chaseDoor.axis==='x'?.08:.8),
    maxX:chaseDoor.x+(chaseDoor.axis==='x'?.08:.8),minZ:chaseDoor.z-(chaseDoor.axis==='x'?.8:.08),
    maxZ:chaseDoor.z+(chaseDoor.axis==='x'?.8:.08)};
  let chaseDoorClosed=false;
  scene.add(root);
  return {
    plan, solids, doorMeshes, door: doorMeshes[0], exitMarker,
    getTopology() {return sealedDoors.find(door=>door.active)?.transaction.plan??plan;},
    update(dt, state) {
      storyProxies.updateAmbient(dt);
      chaseDoorClosed=Boolean(chaseDoorMesh&&state.threat?.doorRemaining>0);
      if(chaseDoorMesh)chaseDoorMesh.visible=chaseDoorClosed;
      const target = state.doors.bedroom.open ? 4 : 1.2;
      doorHeight += Math.sign(target - doorHeight) * Math.min(Math.abs(target - doorHeight), dt * 3.2);
      if (bedroomDoorAssembly) { bedroomDoorAssembly.position.y = doorHeight; bedroomDoorAssembly.visible = doorHeight < 3.9; }
      else if (doorMeshes[0]) { doorMeshes[0].position.y = doorHeight; doorMeshes[0].visible = doorHeight < 3.9; }
    },
    reset() { updateStory({ catPhase: 'unobserved' }, plan.spawn); doorHeight = 1.2;chaseDoorClosed=false;if(chaseDoorMesh)chaseDoorMesh.visible=false; if (bedroomDoorAssembly) { bedroomDoorAssembly.position.y = doorHeight; bedroomDoorAssembly.visible = true; } else if (doorMeshes[0]) { doorMeshes[0].position.y = doorHeight; doorMeshes[0].visible = true; } },
    updateStory, updateThreat,
    renderScreens(renderer) { storyProxies.renderScreens(renderer); },
    updateAmbient(dt) { storyProxies.updateAmbient(dt); },
    getColliders() {
      const walls=[...plan.walls,...sealedDoors.filter(door=>door.active).map(door=>door.instance.sealedWall)];
      const result=[...walls,...plan.obstacles];
      if(doorHeight<3&&doorCollider)result.push(doorCollider);
      if(chaseDoorClosed&&chaseDoorCollider)result.push(chaseDoorCollider);
      return result;
    },
    roomAt(x, z) {
      const cell = plan.cells.find(c => c.x === Math.round(x / CELL_SIZE) && c.z === Math.round(z / CELL_SIZE));
      return plan.rooms.find(r => r.id === cell?.roomId)?.name ?? '房间边界';
    },
    dispose() { scene.remove(root); for (const resource of resources) resource.dispose(); },
  };
}
