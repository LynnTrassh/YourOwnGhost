import { inspectTopology } from './topology.js';
import { CELL_SIZE, MODULE_SIZE, DIRECTIONS, keyOf } from './templates.js';
import { PLAYER_RADIUS, overlaps } from '../collision.js';
import { roomIdAt, sightClear } from '../story/spatial.js';
import { LIGHT_AVOIDER_BEHAVIOR, THREAT_BODY } from '../threat-profile.js';

export function buildWalls(plan) {
  const tiles = new Map(plan.cells.map(t => [keyOf(t.x, t.z), t]));
  const walls = [];
  const portals = new Set(plan.doors.map(d => d.cells.map(([x,z])=>keyOf(x,z)).sort().join('|')));
  function wall(x, z, alongX, length, roomId) {
    const w = alongX ? length : .18, d = alongX ? .18 : length;
    walls.push({ roomId, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }
  for (const t of plan.cells) for (const [dx, dz] of DIRECTIONS) {
    const n = tiles.get(keyOf(t.x + dx, t.z + dz));
    const x = (t.x + dx / 2) * CELL_SIZE, z = (t.z + dz / 2) * CELL_SIZE;
    if (!n) wall(x, z, Boolean(dz), CELL_SIZE + .18, t.roomId);
    else if (n.roomId !== t.roomId && (t.roomId === 'bedroom' || n.roomId !== 'bedroom' && (dx > 0 || dz > 0))) {
      const portal=portals.has([keyOf(t.x,t.z),keyOf(n.x,n.z)].sort().join('|'));
      if (!portal) { wall(x,z,Boolean(dz),CELL_SIZE+.18,t.roomId); continue; }
      const width = (CELL_SIZE - 1.6) / 2;
      for (const sign of [-1, 1]) wall(x + (dz ? sign * (1.6 + width) / 2 : 0), z + (dx ? sign * (1.6 + width) / 2 : 0), Boolean(dz), width, t.roomId);
    }
  }
  return walls;
}
// Check continuous wall coverage along each room boundary, excluding only its door opening.
export function validateRoomBoundaries(plan) {
  const tiles=new Map(plan.cells.map(t=>[keyOf(t.x,t.z),t]));
  const portals=new Set(plan.doors.map(d=>d.cells.map(c=>keyOf(...c)).sort().join('|')));
  const errors=[];
  for (const t of plan.cells) for (const [dx,dz] of DIRECTIONS) {
    const n=tiles.get(keyOf(t.x+dx,t.z+dz));
    if (n?.roomId===t.roomId) continue;
    const normal=(dx ? t.x+dx/2 : t.z+dz/2)*CELL_SIZE;
    const center=(dx ? t.z:t.x)*CELL_SIZE;
    const door=n && portals.has([keyOf(t.x,t.z),keyOf(n.x,n.z)].sort().join('|'));
    const ranges=door ? [[center-CELL_SIZE/2,center-.8],[center+.8,center+CELL_SIZE/2]] : [[center-CELL_SIZE/2,center+CELL_SIZE/2]];
    const intervals=plan.walls.filter(b=>normal >= (dx ? b.minX:b.minZ)-1e-6 && normal <= (dx ? b.maxX:b.maxZ)+1e-6)
      .map(b=>dx ? [b.minZ,b.maxZ]:[b.minX,b.maxX]).sort((a,b)=>a[0]-b[0]);
    for (const [start,end] of ranges) {
      let covered=start;
      for (const [lo,hi] of intervals) {
        if (lo>covered+1e-6) break;
        if (hi>covered) covered=hi;
        if (covered>=end-1e-6) break;
      }
      if (covered<end-1e-6) errors.push(`OPEN_ROOM_BOUNDARY:${t.roomId}:${t.x},${t.z}:${dx},${dz}`);
    }
  }
  return errors;
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
  const errors = validateRoomBoundaries(plan);
  if (plan.edges.some(e=>e.unplaced)) errors.push('UNPLACED_CONNECTION');
  const keys = new Set(plan.cells.map(t => keyOf(t.x, t.z)));
  if (keys.size !== plan.cells.length) errors.push('ROOM_OVERLAP');
  if (new Set(plan.rooms.map(r => r.id)).size !== plan.rooms.length) errors.push('DUPLICATE_ROOM_ID');
  if (new Set(plan.doors.map(d => d.id)).size !== plan.doors.length) errors.push('DUPLICATE_DOOR_ID');
  const boxes = [...plan.walls, ...plan.obstacles];
  const graph = buildNavigation(plan);
  const path = (from,to,excluded=[]) => pathThroughTiles(plan,from,to,excluded,graph);
  const roomPoint = id => { const room = plan.rooms.find(r => r.id === id); return room && { x: room.center[0] * CELL_SIZE, z: room.center[1] * CELL_SIZE }; };
  if(plan.chase) {
    const chase=plan.chase,stages=Object.values(chase.stages),route=plan.opportunities.exitRoute;
    const index=route.indexOf(stages[0]);
    if(index<1||index+4>=route.length||stages.some((id,i)=>route[index+i]!==id)
      ||new Set([...stages,chase.sourceRoomId,chase.hideRoomId]).size!==6)
      errors.push('INVALID_CHASE_SEQUENCE');
    const connected=(doorId,a,b)=>{
      const door=plan.doors.find(d=>d.id===doorId);
      const edge=plan.edges.find(e=>e.id===door?.edgeId);
      return Boolean(edge&&[edge.a,edge.b].includes(a)&&[edge.a,edge.b].includes(b));
    };
    const chain=[route[index-1],...stages,route[index+4]];
    if(chase.routeDoorIds.length!==5||chase.routeDoorIds.some((id,i)=>!connected(id,chain[i],chain[i+1]))
      ||!connected(chase.sideDoorId,stages[0],chase.sourceRoomId)
      ||!connected(chase.hideDoorId,stages[3],chase.hideRoomId))errors.push('INVALID_CHASE_DOORS');
    const routes=chase.bypassRoutes;
    if(routes.length!==2||routes.some(r=>r.length<3)
      ||routes[0].slice(1,-1).some(p=>routes[1].slice(1,-1).some(q=>p[0]===q[0]&&p[1]===q[1])))
      errors.push('INVALID_CHASE_BYPASS');
    if(roomIdAt(plan,chase.hidingPoint)!==chase.hideRoomId
      ||!path(chase.source,chase.observation)
      ||!path(chase.hidingPoint,roomPoint(stages[3])))errors.push('INVALID_CHASE_ACCESS');
    const approachDoor=plan.doors.find(d=>d.id===chase.routeDoorIds[3]);
    const approachTile=approachDoor?.cells.find(([x,z])=>plan.cells.find(c=>c.x===x&&c.z===z)?.roomId===stages[3]);
    if(!approachTile||sightClear({x:approachTile[0]*CELL_SIZE,y:1.65,z:approachTile[1]*CELL_SIZE},
      {...chase.hidingPoint,y:1.65},boxes))errors.push('INVALID_CHASE_CONCEALMENT');
  }
  if (boxes.some(b => overlaps(plan.spawn.x, plan.spawn.z, b))) errors.push('BLOCKED_SPAWN');
  if(plan.threat?.behaviorId===LIGHT_AVOIDER_BEHAVIOR) {
    const threat=plan.threat,point=threat.retreatPoint;
    const startDistance=Math.hypot(threat.spawn.x-threat.observation.x,
      threat.spawn.z-threat.observation.z);
    if(!point||roomIdAt(plan,point)!==threat.roomId
      ||Math.hypot(point.x-threat.observation.x,point.z-threat.observation.z)<startDistance+1.2-1e-6
      ||!pathThroughTiles(plan,threat.spawn,point,['bedroom',threat.escapeRoomId],graph)
      ||!sightClear({...threat.observation,y:1.65},
        {...point,y:THREAT_BODY.lightTargetHeight},boxes))errors.push('INVALID_AVOIDER_RETREAT');
  }
  if (!path(plan.spawn, plan.exit)) errors.push('EXIT_UNREACHABLE');
  for (const room of plan.rooms) if (!path(plan.spawn, roomPoint(room.id))) errors.push(`ROOM_UNREACHABLE:${room.id}`);
  for (const d of plan.doors) {
    if (!d.cells.every(([x, z]) => keys.has(keyOf(x, z)))) errors.push(`INVALID_DOOR:${d.id}`);
    const [a,b]=d.cells;
    if (d.cells.length!==2 || !a || !b || Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])!==1
      || d.axis!==(a[0]!==b[0] ? 'x':'z')
      || Math.abs(d.x-(a[0]+b[0])*CELL_SIZE/2)>1e-6 || Math.abs(d.z-(a[1]+b[1])*CELL_SIZE/2)>1e-6) errors.push(`INVALID_DOOR_GEOMETRY:${d.id}`);
    for (const [x,z] of d.cells) {
      const owner=plan.rooms.find(r=>r.id===plan.cells.find(t=>t.x===x && t.z===z)?.roomId);
      const cx=owner?.gridCenter[0]*CELL_SIZE,cz=owner?.gridCenter[1]*CELL_SIZE;
      const halfFrame=MODULE_SIZE*3/2;
      const centered=owner && (d.axis==='x'
        ? Math.abs(d.z-cz)<1e-6 && Math.abs(Math.abs(d.x-cx)-halfFrame)<1e-6
        : d.axis==='z' && Math.abs(d.x-cx)<1e-6 && Math.abs(Math.abs(d.z-cz)-halfFrame)<1e-6);
      if(!centered) errors.push(`OFF_CENTER_ROOM_DOOR:${d.id}`);
    }
    if (boxes.some(b => overlaps(d.x, d.z, b))) errors.push(`BLOCKED_DOOR:${d.id}`);
  }
  for (const d of plan.doors) for (const [x,z] of d.cells) {
    if (!path(plan.spawn, {x:x*CELL_SIZE,z:z*CELL_SIZE})) errors.push(`DOOR_UNREACHABLE:${d.id}`);
  }
  for (const edge of plan.edges) {
    const matching=plan.doors.filter(d=>d.edgeId===edge.id);
    if (matching.length!==1) errors.push(`INVALID_EDGE_DOOR:${edge.id}`);
    for (const d of matching) {
      const owners=d.cells.map(([x,z])=>plan.cells.find(t=>t.x===x && t.z===z)?.roomId);
      if (!owners.includes(edge.a) || !owners.includes(edge.b)) errors.push(`INVALID_EDGE_DOOR:${edge.id}`);
    }
  }
  const expected=inspectTopology(plan.rooms,plan.edges);
  if (JSON.stringify(expected)!==JSON.stringify(plan.opportunities)) errors.push('STALE_OPPORTUNITIES');
  for (const slot of (plan.reserved.cat?.slots ?? [])) if (!keys.has(keyOf(Math.round(slot.x / CELL_SIZE), Math.round(slot.z / CELL_SIZE))) || boxes.some(b => overlaps(slot.x, slot.z, b))) errors.push('BLOCKED_CONTENT_SLOT');
  for(const instance of plan.content?.instances??[]) {
    if(instance.definitionId==='AB01') {
      if(plan.story.cat)errors.push('CAT_GROUP_CONFLICT:AB01');
      if(instance.slots?.length!==9||instance.slots.some(point=>
        plan.cells.find(cell=>cell.x===Math.round(point.x/CELL_SIZE)&&cell.z===Math.round(point.z/CELL_SIZE))?.roomId!==instance.roomId
        ||boxes.some(box=>overlaps(point.x,point.z,box))))errors.push('INVALID_CAT_GROUP:AB01');
    }
    if(['B01','B03'].includes(instance.definitionId)
      &&!plan.content.preferences?.includes('like.flower'))
      errors.push(`UNCONFIRMED_CONTENT_PREFERENCE:${instance.definitionId}`);
    if(instance.definitionId==='RI02'
      &&!plan.content.preferences?.some(token=>['like.cat','like.flower'].includes(token)))
      errors.push('UNCONFIRMED_CONTENT_PREFERENCE:RI02');
    if(instance.definitionId==='RI02'
      &&instance.likedObject!==(plan.content.preferences?.includes('like.cat')?'cat':'flower'))
      errors.push('WRONG_LIKED_OBJECT:RI02');
    if(instance.definitionId==='IN02'
      &&(!plan.content.preferences?.includes('fear.doll')||instance.fearId!=='doll'))
      errors.push('UNCONFIRMED_CONTENT_PREFERENCE:IN02');
    if(instance.definitionId==='IN04') {
      const source=plan.content.instances.find(item=>item.instanceId===instance.sourceInstanceId);
      const adjacent=plan.edges.some(edge=>[edge.a,edge.b].includes(instance.roomId)
        &&[edge.a,edge.b].includes(instance.supportRoomId));
      if(source?.definitionId!=='B03'||source.roomId!==instance.roomId
        ||instance.traceId!==`petals:${source.instanceId}`||!adjacent
        ||roomIdAt(plan,instance.focus)!==instance.roomId
        ||roomIdAt(plan,instance.followFocus)!==instance.supportRoomId
        ||boxes.some(box=>overlaps(instance.focus.x,instance.focus.z,box,.2)
          ||overlaps(instance.followFocus.x,instance.followFocus.z,box,.35)))
        errors.push('INVALID_TRACE_SOURCE:IN04');
    }
  }
  for (const slot of plan.content?.conditionalSlots??[]) {
    const owner=plan.cells.find(cell=>cell.x===Math.round(slot.focus.x/CELL_SIZE)
      &&cell.z===Math.round(slot.focus.z/CELL_SIZE))?.roomId;
    if(owner!==slot.roomId||boxes.some(box=>overlaps(slot.focus.x,slot.focus.z,box))
      ||!path(plan.spawn,slot.focus))errors.push(`INVALID_CONDITIONAL_SLOT:${slot.id}`);
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}
