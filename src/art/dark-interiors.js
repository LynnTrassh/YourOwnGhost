import * as THREE from 'three';
import { INTERIOR_ASSETS, PREFAB_ASSETS } from './interior-catalog.js';
import { createInteriorModelLoader } from './interior-models.js';
import { createInteriorSurfaces } from './interior-surfaces.js';
import { createInteriorLighting } from './interior-lighting.js';
import { createRoomDetailDressing } from './room-detail-dressing.js';

export function createDarkInteriors({ plan, root, resources }) {
  const models = createInteriorModelLoader(resources);
  const surfaces = createInteriorSurfaces({ plan, root, resources });
  const lighting = createInteriorLighting({ root, resources });
  const details = createRoomDetailDressing({ plan, root, resources });
  const furnished = [], pending = [];
  function place(id, options) { const ready = models.attach(id,options); pending.push(ready); return ready; }
  function illuminate(group, {emitter, target, color, intensity, distance, angle, roomId, glow = true, fill = false}) {
    // The fitted model is the transform and lifetime owner of all its light.
    // A lamp's closed bulb/shade mesh must not swallow its own light source.
    group.traverse(node => { if (node.isMesh) node.castShadow = false; });
    lighting.practical({parent:group,position:emitter,target,color,intensity,distance,angle,roomId});
    if (glow) lighting.glow(group,emitter,color,.015).name = 'fixture-bulb';
    if (fill) lighting.accent(emitter,color,.6,2.2,group);
  }
  function furnish(obstacle, fallback) {
    const id = PREFAB_ASSETS[obstacle.prefabId ?? obstacle.kind];
    if (!id) return;
    const asset = INTERIOR_ASSETS[id];
    const w = obstacle.maxX-obstacle.minX, d = obstacle.maxZ-obstacle.minZ;
    let yaw = w >= d ? 0 : Math.PI/2;
    if (obstacle.wallNormal) yaw = Math.atan2(...obstacle.wallNormal);
    if (obstacle.kind === 'bed') yaw = 0;
    const alongX = Math.abs(Math.cos(yaw)) > .5;
    const width = (alongX ? w : d) * .985, depth = (alongX ? d : w) * .985;
    const height = Math.min(asset.height,obstacle.height ?? asset.height);
    const position = [(obstacle.minX+obstacle.maxX)/2,0,(obstacle.minZ+obstacle.maxZ)/2];
    const anchor = new THREE.Group(); anchor.position.set(...position); anchor.rotation.y = yaw; root.add(anchor);
    const item = {obstacle,anchor,id,width,depth,height,position};
    place(id,{parent:anchor,width,height,depth,fallback,onReady:()=>details.furnish(item)});
    furnished.push(item);
  }
  function wallModel(id, face, {height,width,depth = .07, y = 0, along, sourceYaw = 0, onReady} = {}) {
    const slot = surfaces.decor.reserve({roomId:face.roomId,preferredFace:face,height,width,depth,y,along,kind:id});
    if (!slot) return null;
    const anchor = surfaces.wallGroup(slot.face,slot.along,.018);
    anchor.name = `mount-${id}`; anchor.userData.wallDecor = slot;
    // Wall group faces +Z into room; canonical prop fronts face -Z.
    place(id,{parent:anchor,position:[0,y,depth/2],yaw:Math.PI,sourceYaw,height,width,depth,onReady});
    return anchor;
  }
  function dress(doorAssembly) {
    surfaces.dressWalls();
    if (doorAssembly) place('architecture-door-panelled',{
      parent:doorAssembly,position:[0,-1.2,0],width:1.58,height:2.4,depth:.12,fallback:[...doorAssembly.children],
    });
    const primary = new Map();
    for (const item of furnished) {
      const {obstacle,anchor,id,width,depth,height} = item;
      if (!primary.has(obstacle.roomId) && ['furniture-nightstand','furniture-dresser','furniture-writing-desk','furniture-child-table','furniture-offering-table'].includes(id)) {
        const lamp = id === 'furniture-writing-desk' ? 'lighting-desk-lamp-green' : 'lighting-table-lamp';
        place(lamp,{parent:anchor,position:[-width*.27,height,0],width:.24,height:.4,depth:.24,
          onReady:group=>illuminate(group,{emitter:[lamp==='lighting-desk-lamp-green'?.05:0,.29,0],target:[.15,-.4,-.3],
            color:surfaces.look(obstacle.roomId).light,intensity:7,distance:5,angle:1.2,roomId:obstacle.roomId,fill:true})});
        primary.set(obstacle.roomId,true);
      }
      if (['furniture-writing-desk','furniture-child-table','furniture-document-table'].includes(id)) {
        // A tucked seat stays entirely within the already reserved furnishing footprint.
        place('furniture-dining-chair',{parent:anchor,position:[0,0,-depth*.18],width:Math.min(.36,width*.32),height:id==='furniture-child-table'?.5:.72,depth:depth*.48,yaw:Math.PI});
      }
    }
    for (const room of plan.rooms) {
      const theme = surfaces.theme(room.id), look = surfaces.look(room.id);
      const x = room.center[0]*plan.cellSize, z = room.center[1]*plan.cellSize;
      const lamp = theme==='clinic'?'lighting-strip-double':theme==='shrine'?'lighting-chandelier-three-arm':'lighting-pendant-bare-bulb';
      const h = lamp==='lighting-strip-double'?.18:.38;
      place(lamp,{parent:root,position:[x,2.98-h,z],height:h,
        onReady:group=>illuminate(group,{emitter:[0,.035,0],target:[.3,-2.5,.2],color:look.light,
          intensity:primary.has(room.id)?3.5:8.5,distance:6,angle:1.05,roomId:room.id,glow:lamp==='lighting-pendant-bare-bulb'})});
      const faces = surfaces.faces.filter(f=>f.roomId===room.id && f.end-f.start>1.2);
      if (!faces.length) continue;
      const face = faces[Math.floor(room.tint*faces.length)%faces.length];
      // This source's bulb faces +X. Turn it to canonical -Z BEFORE fitting its bounds.
      wallModel('lighting-wall-sconce',face,{height:.36,width:.23,depth:.17,y:1.95,sourceYaw:Math.PI/2,
        onReady:group=>illuminate(group,{emitter:[0,.26,-.025],target:[0,-1.55,-.5],color:look.light,
          intensity:4,distance:4.2,angle:1.05,roomId:room.id})});
      const second = faces[(faces.indexOf(face)+Math.floor(faces.length/2))%faces.length];
      if (theme==='parlor' || theme==='shrine') {
        wallModel('fixture-curtain-oxblood-velvet',second,{height:2.72,width:Math.min(2.6,second.end-second.start-.26),depth:.065,y:.03,
          onReady:group=>lighting.accent([0,1.77,-.1],0xa32232,.8,2.3,group)});
      } else {
        wallModel('architecture-window-four-pane',second,{height:1.1,width:1.05,depth:.07,y:1.32,
          onReady:group=>lighting.accent([0,.58,-.1],0x637eaa,.8,2.4,group)});
      }
      if (theme==='clinic') wallModel('fixture-radiator-cast-iron',second,{height:.6,width:.86,depth:.13,y:.03});
      if (theme==='bedroom' || theme==='nursery') {
        const mirrorFace=faces[(faces.indexOf(face)+1)%faces.length];
        wallModel('fixture-mirror-aged',mirrorFace,{height:.72,width:.45,depth:.045,y:1.3});
      }
    }
    details.dress();
    lighting.update(0,plan.spawn);
  }
  return { ...surfaces, furnish, dress, update:lighting.update, stats:models.stats, ready:()=>Promise.all(pending), lights:lighting, models, detailStats:details.stats };
}
