import { CELL_SIZE } from './templates.js';
import { buildNavigation, pathThroughTiles } from './validate.js';
import { overlaps } from '../collision.js';
import { roomIdAt, sightClear } from '../story/spatial.js';

function routeToExit(plan,from) {
  const graph=new Map(plan.rooms.map(room=>[room.id,[]]));
  for(const edge of plan.edges) {
    graph.get(edge.a).push(edge.b);graph.get(edge.b).push(edge.a);
  }
  const queue=[from],previous=new Map([[from,null]]);
  for(let index=0;index<queue.length;index++)for(const next of graph.get(queue[index])??[])
    if(!previous.has(next)) {previous.set(next,queue[index]);queue.push(next);}
  if(!previous.has(plan.exit.roomId))return [];
  const route=[];
  for(let id=plan.exit.roomId;id!==null;id=previous.get(id))route.push(id);
  return route.reverse();
}

export function fitTraceFollow(plan) {
  const source=plan.content.instances.find(item=>item.definitionId==='B03');
  if(!source)return null;
  const route=routeToExit(plan,source.roomId),supportRoomId=route[1];
  if(!supportRoomId||supportRoomId==='bedroom')return null;
  const room=plan.rooms.find(item=>item.id===supportRoomId);
  const edge=plan.edges.find(item=>[item.a,item.b].includes(source.roomId)
    &&[item.a,item.b].includes(supportRoomId));
  const door=plan.doors.find(item=>item.edgeId===edge?.id);
  if(!room||!door)return null;
  const boxes=[...plan.walls,...plan.obstacles],graph=buildNavigation(plan);
  const sightBoxes=boxes.filter(item=>item.id!==`${source.instanceId}-flower-stand`);
  const sourceFocus=[[.95,0],[-.95,0],[0,.95],[0,-.95]].map(([dx,dz])=>({
    x:source.focus.x+dx,z:source.focus.z+dz,y:.06})).find(point=>
    roomIdAt(plan,point)===source.roomId
      &&!boxes.some(box=>overlaps(point.x,point.z,box,.2))
      &&sightClear(source.observation,point,sightBoxes));
  if(!sourceFocus)return null;
  const inside=door.cells.find(([x,z])=>plan.cells.some(cell=>
    cell.x===x&&cell.z===z&&cell.roomId===supportRoomId));
  if(!inside)return null;
  const entry={x:inside[0]*CELL_SIZE,z:inside[1]*CELL_SIZE,y:1.65};
  const follow=room.cells.flatMap(([x,z])=>[[2.15,0],[-2.15,0],[0,2.15],[0,-2.15]]
    .map(([dx,dz])=>({x:x*CELL_SIZE+dx,z:z*CELL_SIZE+dz,y:.06})))
    .toSorted((a,b)=>Math.hypot(a.x-entry.x,a.z-entry.z)-Math.hypot(b.x-entry.x,b.z-entry.z))
    .find(point=>Math.hypot(point.x-entry.x,point.z-entry.z)>=1.2
      &&Math.hypot(point.x-entry.x,point.z-entry.z)<=5.5
      &&roomIdAt(plan,point)===supportRoomId
      &&!boxes.some(box=>overlaps(point.x,point.z,box,.35))
      &&pathThroughTiles(plan,entry,point,[],graph)
      &&sightClear({...entry,y:1.65},point,boxes));
  if(!follow)return null;
  return {instanceId:`IN04-${source.roomId}-${supportRoomId}`,
    definitionId:'IN04',role:'short',readiness:'conditional-greybox',
    roomId:source.roomId,supportRoomId,sourceInstanceId:source.instanceId,
    traceId:`petals:${source.instanceId}`,traceKind:'petals',
    focus:sourceFocus,observation:source.observation,
    followFocus:follow,followEntry:entry,followDoorId:door.id};
}

export function fitBedroomTrace(plan,trace) {
  const boxes=[...plan.walls,...plan.obstacles];
  const focus=[[-.72,1.18],[-.72,.72],[.72,1.18],[.72,.72]].map(([x,z])=>({x,z,y:.06}))
    .find(point=>roomIdAt(plan,point)==='bedroom'
      &&!boxes.some(box=>overlaps(point.x,point.z,box,.35))
      &&pathThroughTiles(plan,plan.spawn,point));
  return focus?{id:'IN04',definitionId:'IN04',roomId:'bedroom',focus,
    sourceInstanceId:trace.instanceId,traceId:trace.traceId,traceKind:trace.traceKind}:null;
}
