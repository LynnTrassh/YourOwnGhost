import * as THREE from 'three';
import { wallSurfaces } from '../rendering/wall-surfaces.js';
import { createWallDecorLayout } from './wall-decor-layout.js';
import { batchStaticInteriorGroups, compactOpaqueMaterialGroups } from './static-interior-batch.js';
import { createSurfaceDetailMaterials } from './surface-detail-materials.js';

export const ROOM_LOOKS = {
  bedroom: { wall: 'wallpaper-sage-floral', floor: 'floor-walnut-planks', color: 0xc1b6a0, light: 0xffc183, art: 'art-misaligned-portrait' },
  parlor: { wall: 'wallpaper-ochre-geometric', floor: 'floor-chevron-stone', color: 0x74635c, light: 0xffb777, art: 'art-misaligned-portrait' },
  nursery: { wall: 'wallpaper-dustyrose-floral', floor: 'floor-walnut-planks', color: 0xc5b6a4, light: 0xffc28b, art: 'art-child-room' },
  clinic: { wall: 'wall-clinic-tiles', floor: 'wall-clinic-tiles', color: 0x739387, light: 0xc2e1c5, art: 'art-endless-corridor' },
  archive: { wall: 'wallpaper-bluegray-stripe', floor: 'floor-walnut-planks', color: 0xa0acb0, light: 0xffd19b, art: 'art-endless-corridor' },
  shrine: { wall: 'wallpaper-ochre-geometric', floor: 'floor-carpet-geometric', color: 0xb49b78, light: 0xffb068, art: 'art-misaligned-portrait' },
};

export function createInteriorSurfaces({ plan, root, resources }) {
  const textures = new Map(), materials = new Map(), roomById = new Map(plan.rooms.map(r => [r.id, r]));
  const surfaceDetails = createSurfaceDetailMaterials({resources});
  let disposed = false;
  resources.add({ dispose() { disposed = true; } });
  const theme = id => roomById.get(id)?.interior?.presetId ?? 'bedroom';
  const look = id => ROOM_LOOKS[theme(id)] ?? ROOM_LOOKS.bedroom;
  function texture(id) {
    if (!textures.has(id) && typeof document !== 'undefined') {
      const value = new THREE.TextureLoader().load(`/art/room-presets/v03/textures/${id}.jpg`, loaded => {
        if (disposed) loaded.dispose();
      });
      value.colorSpace = THREE.SRGBColorSpace;
      value.wrapS = value.wrapT = THREE.RepeatWrapping; value.anisotropy = 4;
      resources.add(value); textures.set(id, value);
    }
    return textures.get(id);
  }
  function material(id, color = 0xffffff, roughness = .9) {
    const key = `${id}:${color}:${roughness}`;
    if (!materials.has(key)) {
      const value = new THREE.MeshStandardMaterial({ color, map: id ? texture(id) ?? null : null, roughness });
      surfaceDetails.apply(value,id ?? '');
      resources.add(value); materials.set(key, value);
    }
    return materials.get(key);
  }
  const wood = material('floor-walnut-planks', 0x71604c, .77);
  const rail = material(null, 0x302820, .7);
  const ceilingMaterial = material(null, 0x56524a, .98);
  const wallMaterial = id => material(look(id).wall, look(id).color);
  const floorMaterial = id => material(look(id).floor, theme(id) === 'parlor' ? 0x9f9789 : 0xaaa294, theme(id) === 'parlor' ? .52 : .93);
  function mesh(geometry, mat, parent = root) {
    resources.add(geometry); const value = new THREE.Mesh(geometry, mat);
    value.receiveShadow = true; parent.add(value); return value;
  }
  function wallGroup(face, along = (face.start + face.end) / 2, inset = .012) {
    const group = new THREE.Group();
    if (face.axis === 'X') { group.position.set(face.plane + face.sign * inset, 0, along); group.rotation.y = face.sign * Math.PI / 2; }
    else { group.position.set(along, 0, face.plane + face.sign * inset); group.rotation.y = face.sign > 0 ? 0 : Math.PI; }
    root.add(group); return group;
  }
  const cellMap = new Map(plan.cells.map(c => [`${c.x},${c.z}`, c.roomId]));
  const faces = wallSurfaces(plan.walls).map(face => {
    const mid = (face.start + face.end) / 2;
    const x = face.axis === 'X' ? face.plane + face.sign * .18 : mid;
    const z = face.axis === 'Z' ? face.plane + face.sign * .18 : mid;
    const roomId = cellMap.get(`${Math.round(x / plan.cellSize)},${Math.round(z / plan.cellSize)}`);
    return { ...face, roomId };
  }).filter(face => face.roomId);
  const decor = createWallDecorLayout(faces, plan.obstacles);
  function frame(parent, artId, width = .68, height = .83) {
    const surround = mesh(new THREE.BoxGeometry(width + .09, height + .09, .045), rail, parent);
    surround.position.set(0, 1.96, .025); surround.castShadow = true;
    const picture = mesh(new THREE.PlaneGeometry(width, height), material(artId, 0xc4b49c), parent);
    picture.position.set(0, 1.96, .051);
  }
  function dressWalls() {
    root.userData.wallMaterialBatchStats = compactOpaqueMaterialGroups(root);
    const staticGroups = [];
    for (const face of faces) {
      const length = face.end - face.start;
      const group = wallGroup(face);
      staticGroups.push({group,roomId:face.roomId});
      const panel = mesh(new THREE.PlaneGeometry(length, .78), theme(face.roomId) === 'clinic' ? material('wall-clinic-tiles', 0x698775, .55) : wood, group);
      panel.position.y = .51;
      const uv = panel.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * length, uv.getY(i));
      for (const [y, h, depth] of [[.12,.15,.028],[.94,.045,.045],[2.89,.08,.035]]) {
        const bar = mesh(new THREE.BoxGeometry(length, h, depth), rail, group); bar.position.set(0,y,.014);
      }
      for (let u = -.5 * length + .45; u < length / 2 - .1; u += .7) {
        const stile = mesh(new THREE.BoxGeometry(.025,.72,.022),rail,group); stile.position.set(u,.51,.014);
      }
    }
    root.userData.wallBatchStats = batchStaticInteriorGroups(staticGroups,root,resources);
    for (const room of plan.rooms) {
      const suitable = faces.filter(f => f.roomId === room.id && f.end-f.start > .95);
      if (!suitable.length) continue;
      const face = suitable[Math.floor(room.tint * suitable.length) % suitable.length];
      const slot = decor.reserve({roomId:room.id,preferredFace:face,width:.77,height:.92,y:1.5,depth:.08,kind:'picture'});
      if (slot) {
        const anchor = wallGroup(slot.face, slot.along, .028);
        anchor.name = 'wall-picture'; anchor.userData.wallDecor = slot;
        frame(anchor, look(room.id).art);
      }
      if (suitable.length > 2 && room.tint < .3) {
        const damageSlot = decor.reserve({roomId:room.id,preferredFace:suitable[(suitable.indexOf(face)+2)%suitable.length],width:.33,height:.52,y:.24,depth:.05,kind:'plaster'});
        if (!damageSlot) continue;
        const patch = wallGroup(damageSlot.face,damageSlot.along,.02);
        const damage = mesh(new THREE.PlaneGeometry(.33,.52),material('wall-damage-plaster',0x8e826b),patch);
        damage.position.set(0,.5,.024);
      }
    }
  }
  return { theme, look, texture, material, wallMaterial, floorMaterial, ceilingMaterial, faces, wallGroup, frame, dressWalls, decor };
}
