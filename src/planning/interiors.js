import { CELL_SIZE, DIRECTIONS, keyOf, rotate } from './templates.js';
import { createRoomPrefabPicker, ROOM_PRESET_IDS } from './room-presets.js';

export const INTERIOR_NAMES = { island: '中央绕行', empty: '留白空间', staggered: '交错柜体', perimeter: '沿墙陈设' };

// Dressing must not consume layout randomness or change the familiar bedroom.
function furnishingRandom(plan, room) {
  const seed = room.id === 'bedroom' ? 'bedroom:furnishings:v1'
    : `${plan.seed}:${plan.attempt}:${room.id}:furnishings:v1`;
  let n = 2166136261;
  for (const char of seed) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
  return () => {
    n += 0x6D2B79F5;
    let t = Math.imul(n ^ n >>> 15, n | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Layout randomness is independent of shell geometry and cosmetic decoration.
export function populateInteriors(plan, rng, decor, presetOverrides = {}) {
  for (const room of plan.rooms) {
    const types = Object.keys(INTERIOR_NAMES);
    const sampledType = types[Math.floor(rng() * types.length)], sampledTurn = Math.floor(rng() * 4);
    const type = room.id === 'bedroom' ? 'island' : sampledType;
    const turn = room.id === 'bedroom' ? 3 : sampledTurn;
    const artRandom = furnishingRandom(plan, room);
    const presetId = room.id === 'bedroom' ? 'bedroom'
      : presetOverrides[room.id] ?? presetOverrides.default ?? ROOM_PRESET_IDS[Math.floor(artRandom() * ROOM_PRESET_IDS.length)];
    const choosePrefab = createRoomPrefabPicker(presetId, artRandom);
    const tiles = new Set(room.cells.map(([x,z]) => keyOf(x,z)));
    const protectedTiles = new Set([keyOf(...room.center)]);
    for (const door of plan.doors) for (const [x,z] of door.cells) if (tiles.has(keyOf(x,z))) protectedTiles.add(keyOf(x,z));
    if (room.id === plan.reserved.cat?.roomId) for (const p of plan.reserved.cat.slots) protectedTiles.add(keyOf(Math.round(p.x/CELL_SIZE), Math.round(p.z/CELL_SIZE)));
    for (const b of plan.obstacles) {
      for (const [x,z] of room.cells) {
        if (x*CELL_SIZE+CELL_SIZE/2 > b.minX && x*CELL_SIZE-CELL_SIZE/2 < b.maxX
          && z*CELL_SIZE+CELL_SIZE/2 > b.minZ && z*CELL_SIZE-CELL_SIZE/2 < b.maxZ) protectedTiles.add(keyOf(x,z));
      }
    }
    const blocked = new Set(), candidates = [];
    for (const [x,z] of room.cells) {
      const [lx,lz] = rotate([x-room.center[0], z-room.center[1]], (4-turn)%4);
      const boundary = DIRECTIONS.some(([dx,dz]) => !tiles.has(keyOf(x+dx,z+dz)));
      const fits = type === 'island' ? lx === 1 && Math.abs(lz) <= 1
        : type === 'empty' ? false
        : type === 'staggered' ? (lz === -1 && lx <= 0 || lz === 1 && lx >= 0)
        : boundary && (lx + lz) % 2 === 0;
      if (fits && !protectedTiles.has(keyOf(x,z))) candidates.push([x,z]);
    }
    room.interior = { type, rotation: turn, presetId, obstacleIds: [] };
    for (const [x,z] of candidates) {
      const key = keyOf(x,z); blocked.add(key);
      // Conservatively reserve an entire tile per furnishing. All remaining tiles,
      // entrances and scene anchors must stay connected inside this room.
      const seen = new Set([keyOf(...room.center)]), queue = [room.center];
      for (let i=0; i<queue.length; i++) for (const [dx,dz] of DIRECTIONS) {
        const next = [queue[i][0]+dx, queue[i][1]+dz], k = keyOf(...next);
        if (tiles.has(k) && !blocked.has(k) && !seen.has(k)) { seen.add(k); queue.push(next); }
      }
      if (seen.size !== tiles.size-blocked.size) { blocked.delete(key); continue; }
      const wallNormal = DIRECTIONS.find(([dx,dz])=>!tiles.has(keyOf(x+dx,z+dz)));
      const kind = type === 'island' || !wallNormal ? 'counter' : 'bookshelf';
      const alongX = kind === 'bookshelf' ? wallNormal[1]!==0 : turn % 2 === 1;
      const length = CELL_SIZE - .35;
      const w = alongX ? length : .7, d = alongX ? .7 : length;
      // Back of shelf sits 2.5 cm off the wall face, clearing the skirting.
      const inset=kind==='bookshelf' ? CELL_SIZE/2-.09-.025-.7/2 : 0;
      const cx=x*CELL_SIZE+(wallNormal?.[0]??0)*inset,cz=z*CELL_SIZE+(wallNormal?.[1]??0)*inset;
      const id = `${room.id}-interior-${room.interior.obstacleIds.length}`;
      plan.obstacles.push({ id, roomId: room.id, kind, prefabId: choosePrefab(kind), height: kind === 'counter' ? 1 : 2.3,
        minX: cx-w/2, maxX: cx+w/2, minZ: cz-d/2, maxZ: cz+d/2,
        ...(kind==='bookshelf' ? {wallNormal:[...wallNormal]} : {}),
        decoration: room.id === 'bedroom' ? .35 : decor() });
      room.interior.obstacleIds.push(id);
    }
  }
}
