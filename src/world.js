import * as THREE from 'three';
import { INTERIOR_NAMES } from './planning/interiors.js';
import { generatePlan } from './planning/generate.js';
import { CELL_SIZE, DIRECTIONS, keyOf } from './planning/templates.js';
import { createBedroomSet } from './art/bedroom-set.js';

export function createWorld(scene, plan = generatePlan('42')) {
  const root = new THREE.Group(); scene.add(root);
  const solids = [], doorMeshes = [], resources = new Set();
  function material(color, extra = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: .9, ...extra }); resources.add(m); return m;
  }
  const wall = material(0x677267), trim = material(0x343e36), wood = material(0x62523f);
  const floor = material(0x514c3f), bedroomFloor = material(0x39363f), cloth = material(0x8d917d);
  const palette = [0x758779, 0x7b8699, 0x96836d, 0x85768a];
  const roomMaterials = new Map(plan.rooms.map(r => [r.id, material(palette[Math.floor(r.tint * palette.length)])]));
  roomMaterials.set('bedroom', material(0x514a58));
  const unitBox = new THREE.BoxGeometry(1, 1, 1); resources.add(unitBox);
  function box(w, h, d, x, y, z, mat, solid = false) {
    const mesh = new THREE.Mesh(unitBox, mat);
    mesh.scale.set(w, h, d); mesh.position.set(x, y, z);
    mesh.receiveShadow = true; mesh.castShadow = solid;
    root.add(mesh); if (solid) solids.push(mesh); return mesh;
  }
  for (const tile of plan.cells) {
    const x = tile.x * CELL_SIZE, z = tile.z * CELL_SIZE;
    const isBedroom = tile.roomId === 'bedroom';
    box(CELL_SIZE, .12, CELL_SIZE, x, -.06, z, isBedroom ? bedroomFloor : floor);
    box(CELL_SIZE, .1, CELL_SIZE, x, 3.05, z, isBedroom ? roomMaterials.get('bedroom') : wall);
    if (!isBedroom) for (const offset of [-1, 0, 1]) box(.012, .004, CELL_SIZE, x + offset * CELL_SIZE / 3, .002, z, trim);
  }
  for (const b of plan.walls) {
    const w = b.maxX - b.minX, d = b.maxZ - b.minZ, x = (b.minX + b.maxX) / 2, z = (b.minZ + b.maxZ) / 2;
    box(w, 3, d, x, 1.5, z, roomMaterials.get(b.roomId) ?? wall, true);
    box(w + .035, .12, d + .035, x, .06, z, trim);
  }
  const bookMaterials = [material(0x78604b), material(0x405756), material(0x884f46), material(0xaba17b)];
  let doorHeight = 1.2;
  const bedroomDoor = plan.doors.find(d => d.id === 'bedroom');
  let bedroomDoorAssembly = null;
  for (const d of plan.doors) {
    box(d.axis === 'x' ? .2 : 1.6, .6, d.axis === 'x' ? 1.6 : .2, d.x, 2.7, d.z, trim);
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
  const bedroomDecor = createBedroomSet({
    THREE, plan, root, addBox: box, addMaterial: material, unitBox,
    doorAssembly: bedroomDoorAssembly, resources,
  });
  for (const b of plan.obstacles) {
    if (bedroomDecor.handledObstacles.has(b.id)) continue;
    const x = (b.minX + b.maxX) / 2, z = (b.minZ + b.maxZ) / 2;
    const w = b.maxX-b.minX, d = b.maxZ-b.minZ;
    if (b.kind === 'bed') {
      box(w, .45, d, x, .225, z, wood, true);
      box(w, .18, d, x, .54, z, cloth);
      box(.65, .12, .45, x, .69, z + .5, cloth);
    } else if (b.kind === 'bookshelf') {
      const alongX = w > d, h = b.height;
      // Shelves and books remain within the collision envelope.
      box(alongX ? w : .12, h, alongX ? .12 : d, x, h/2, z, wood, true);
      for (const sign of [-1,1]) box(alongX ? .1 : w, h, alongX ? d : .1,
        x+(alongX ? sign*(w-.1)/2 : 0), h/2, z+(alongX ? 0 : sign*(d-.1)/2), wood);
      for (let row=0; row<4; row++) {
        const y=.08+row*.56;
        box(w,.08,d,x,y,z,wood);
        for (let col=0; col<7; col++) {
          const bookStep=(Math.max(w,d)-.2)/7, offset=(col-3)*bookStep, bh=.29+.13*((col+row)%3)/2;
          box(alongX ? bookStep*.7 : .5, bh, alongX ? .5 : bookStep*.7,
            x+(alongX ? offset : 0), y+.04+bh/2, z+(alongX ? 0 : offset),
            bookMaterials[(col+row+Math.floor(b.decoration*4))%4]);
        }
      }
      box(w,.08,d,x,h-.04,z,wood);
    } else {
      box(w,b.height,d,x,b.height/2,z,b.kind === 'partition' ? roomMaterials.get(b.roomId) : wood,true);
      box(w,.08,d,x,b.height-.04,z,trim);
    }
  }
  function label(text, x, z, y = 2.55) {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#17211de6'; ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#d1d7bd'; ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 59);
    const texture = new THREE.CanvasTexture(canvas); resources.add(texture);
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: true }); resources.add(mat);
    const sprite = new THREE.Sprite(mat); sprite.position.set(x, y, z); sprite.scale.set(2.4, .45, 1); root.add(sprite);
  }
  const occupied = new Set(plan.cells.map(t => keyOf(t.x, t.z)));
  const windowMat = material(0x73838a, { emissive: 0x34454c, emissiveIntensity: .2 });
  for (const room of plan.rooms) {
    const x = room.center[0] * CELL_SIZE, z = room.center[1] * CELL_SIZE;
    const isBedroom = room.id === 'bedroom';
    const light = new THREE.PointLight(room.tint > .5 ? 0xf0cca1 : 0xaec7bc, isBedroom ? 2.6 : 5.5, 12, 2);
    light.position.set(x, 2.65, z); root.add(light);
    box(.65, .08, .65, x, 2.95, z, material(isBedroom ? 0x514a58 : 0x8d9488, { emissive: isBedroom ? 0x282431 : 0x777b70, emissiveIntensity: isBedroom ? .12 : .16 }));
    if (!isBedroom) label(`${room.name} · ${INTERIOR_NAMES[room.interior.type]}`, x, z);
    const boundaries = [];
    for (const [cx, cz] of room.cells) for (const [dx, dz] of DIRECTIONS) {
      if (!occupied.has(keyOf(cx + dx, cz + dz))) boundaries.push({ cx, cz, dx, dz });
    }
    if (boundaries.length && !isBedroom) {
      const { cx, cz, dx, dz } = boundaries[Math.floor(room.tint * boundaries.length)];
      const wx = cx * CELL_SIZE + dx * (CELL_SIZE / 2 - .13), wz = cz * CELL_SIZE + dz * (CELL_SIZE / 2 - .13);
      box(dx ? .04 : 1.4, 1.3, dx ? 1.4 : .04, wx, 1.9, wz, trim);
      box(dx ? .06 : 1.2, 1.1, dx ? 1.2 : .06, wx - dx * .025, 1.9, wz - dz * .025, windowMat);
      box(dx ? .08 : .06, 1.15, dx ? .06 : .08, wx - dx * .06, 1.9, wz - dz * .06, trim);
    }
  }
  root.add(new THREE.HemisphereLight(0xb0bfb1, 0x3d382e, .62));
  const markers = material(0xbcb18b, { emissive: 0x534527, emissiveIntensity: .3 });
  for (const slot of plan.reserved.cat.slots) box(.4, .025, .4, slot.x, .014, slot.z, markers);
  const exitMarker = box(1.25, .035, 1.25, plan.exit.x, .02, plan.exit.z, material(0x84bba2, { emissive: 0x497e61, emissiveIntensity: .7 }));
  label('出口 · E 完成地图巡查', plan.exit.x, plan.exit.z, 1.9);

  const doorCollider = bedroomDoor && { minX: bedroomDoor.x - (bedroomDoor.axis === 'x' ? .08 : .8), maxX: bedroomDoor.x + (bedroomDoor.axis === 'x' ? .08 : .8), minZ: bedroomDoor.z - (bedroomDoor.axis === 'x' ? .8 : .08), maxZ: bedroomDoor.z + (bedroomDoor.axis === 'x' ? .8 : .08) };
  return {
    plan, solids, doorMeshes, door: doorMeshes[0], exitMarker,
    update(dt, state) {
      const target = state.doors.bedroom.open ? 4 : 1.2;
      doorHeight += Math.sign(target - doorHeight) * Math.min(Math.abs(target - doorHeight), dt * 3.2);
      if (bedroomDoorAssembly) { bedroomDoorAssembly.position.y = doorHeight; bedroomDoorAssembly.visible = doorHeight < 3.9; }
      else if (doorMeshes[0]) { doorMeshes[0].position.y = doorHeight; doorMeshes[0].visible = doorHeight < 3.9; }
    },
    reset() { doorHeight = 1.2; if (bedroomDoorAssembly) { bedroomDoorAssembly.position.y = doorHeight; bedroomDoorAssembly.visible = true; } else if (doorMeshes[0]) { doorMeshes[0].position.y = doorHeight; doorMeshes[0].visible = true; } },
    getColliders() { return doorHeight < 3 && doorCollider ? [...plan.walls, ...plan.obstacles, doorCollider] : [...plan.walls, ...plan.obstacles]; },
    roomAt(x, z) {
      const cell = plan.cells.find(c => c.x === Math.round(x / CELL_SIZE) && c.z === Math.round(z / CELL_SIZE));
      return plan.rooms.find(r => r.id === cell?.roomId)?.name ?? '连接走廊';
    },
    dispose() { scene.remove(root); for (const resource of resources) resource.dispose(); },
  };
}
