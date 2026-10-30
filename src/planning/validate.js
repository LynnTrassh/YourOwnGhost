import { CELL_SIZE, DIRECTIONS, keyOf } from './templates.js';
import { PLAYER_RADIUS, overlaps } from '../collision.js';

export function buildWalls(plan) {
  const tiles = new Map(plan.cells.map(t => [keyOf(t.x, t.z), t]));
  const walls = [];
  function wall(x, z, alongX, length, roomId) {
    const w = alongX ? length : .18, d = alongX ? .18 : length;
    walls.push({ roomId, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }
  for (const t of plan.cells) for (const [dx, dz] of DIRECTIONS) {
    const n = tiles.get(keyOf(t.x + dx, t.z + dz));
    const x = (t.x + dx / 2) * CELL_SIZE, z = (t.z + dz / 2) * CELL_SIZE;
    if (!n) wall(x, z, Boolean(dz), CELL_SIZE + .18, t.roomId);
    else if (n.roomId !== t.roomId && (dx > 0 || dz > 0)) {
      const width = (CELL_SIZE - 1.6) / 2;
      for (const sign of [-1, 1]) wall(x + (dz ? sign * (1.6 + width) / 2 : 0), z + (dx ? sign * (1.6 + width) / 2 : 0), Boolean(dz), width, t.roomId);
    }
  }
  return walls;
}
export function buildNavigation(plan) {
  const boxes = [...plan.walls, ...plan.obstacles];
  const tiles = new Map(plan.cells.map(t => [keyOf(t.x,t.z), t]));
  const graph = new Map();
  for (const t of plan.cells) {
    const x = t.x*CELL_SIZE, z = t.z*CELL_SIZE;
    if (boxes.some(b => overlaps(x,z,b))) continue;
    const neighbors = [];
    for (const [dx,dz] of DIRECTIONS) {
      const next = keyOf(t.x+dx,t.z+dz);
      if (!tiles.has(next)) continue;
      // Expanded AABBs conservatively include player clearance along straight edges.
      const nx=x+dx*CELL_SIZE, nz=z+dz*CELL_SIZE;
      const blocked = boxes.some(b => Math.max(x,nx) > b.minX-PLAYER_RADIUS && Math.min(x,nx) < b.maxX+PLAYER_RADIUS
        && Math.max(z,nz) > b.minZ-PLAYER_RADIUS && Math.min(z,nz) < b.maxZ+PLAYER_RADIUS);
      if (!blocked) neighbors.push(next);
    }
    graph.set(keyOf(t.x,t.z), neighbors);
  }
  return graph;
}
export function pathThroughTiles(plan, from, to, excludedRooms = [], graph = buildNavigation(plan)) {
  const tiles = new Map(plan.cells.filter(t => !excludedRooms.includes(t.roomId)).map(t => [keyOf(t.x, t.z), t]));
  const a = keyOf(Math.round(from.x / CELL_SIZE), Math.round(from.z / CELL_SIZE));
  const b = keyOf(Math.round(to.x / CELL_SIZE), Math.round(to.z / CELL_SIZE));
  if (!tiles.has(a) || !tiles.has(b) || !graph.has(a) || !graph.has(b)) return null;
  const previous = new Map([[a, null]]), queue = [a];
  for (let i = 0; i < queue.length; i++) {
    const key = queue[i]; if (key === b) break;
    for (const next of graph.get(key) ?? []) {
      if (tiles.has(next) && !previous.has(next)) { previous.set(next, key); queue.push(next); }
    }
  }
  if (!previous.has(b)) return null;
  const route = [];
  for (let key = b; key !== null; key = previous.get(key)) { const t = tiles.get(key); route.push({ x: t.x * CELL_SIZE, z: t.z * CELL_SIZE }); }
  return route.reverse();
}
export function validatePlan(plan) {
  const errors = [];
  const keys = new Set(plan.cells.map(t => keyOf(t.x, t.z)));
  if (keys.size !== plan.cells.length) errors.push('ROOM_OVERLAP');
  if (new Set(plan.rooms.map(r => r.id)).size !== plan.rooms.length) errors.push('DUPLICATE_ROOM_ID');
  if (new Set(plan.doors.map(d => d.id)).size !== plan.doors.length) errors.push('DUPLICATE_DOOR_ID');
  const boxes = [...plan.walls, ...plan.obstacles];
  const graph = buildNavigation(plan);
  const path = (from,to,excluded=[]) => pathThroughTiles(plan,from,to,excluded,graph);
  const roomPoint = id => { const room = plan.rooms.find(r => r.id === id); return room && { x: room.center[0] * CELL_SIZE, z: room.center[1] * CELL_SIZE }; };
  if (boxes.some(b => overlaps(plan.spawn.x, plan.spawn.z, b))) errors.push('BLOCKED_SPAWN');
  if (!path(plan.spawn, plan.exit)) errors.push('EXIT_UNREACHABLE');
  for (const room of plan.rooms) if (!path(plan.spawn, roomPoint(room.id))) errors.push(`ROOM_UNREACHABLE:${room.id}`);
  for (const d of plan.doors) {
    if (!d.cells.every(([x, z]) => keys.has(keyOf(x, z)))) errors.push(`INVALID_DOOR:${d.id}`);
    if (boxes.some(b => overlaps(d.x, d.z, b))) errors.push(`BLOCKED_DOOR:${d.id}`);
  }
  for (const d of plan.doors) for (const [x,z] of d.cells) {
    if (!path(plan.spawn, {x:x*CELL_SIZE,z:z*CELL_SIZE})) errors.push(`DOOR_UNREACHABLE:${d.id}`);
  }
  for (let i = 1; i < plan.returnLoop.length; i++) {
    const a = plan.returnLoop[i - 1], b = plan.returnLoop[i];
    if (!plan.edges.some(e => e.a === a && e.b === b || e.a === b && e.b === a)) errors.push('BROKEN_RETURN_LOOP');
  }
  for (const side of ['left', 'right']) {
    const other = side === 'left' ? 'right' : 'left';
    const point = roomPoint(plan.branches[side]);
    if (!point || !path(point, plan.exit, [plan.branches[other]])) errors.push(`BLOCKED_BRANCH:${side}`);
  }
  for (const slot of plan.reserved.cat.slots) if (!keys.has(keyOf(Math.round(slot.x / CELL_SIZE), Math.round(slot.z / CELL_SIZE))) || boxes.some(b => overlaps(slot.x, slot.z, b))) errors.push('BLOCKED_CONTENT_SLOT');
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}
