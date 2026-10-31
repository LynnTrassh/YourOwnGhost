import { CELL_SIZE, keyOf } from './templates.js';
import { buildNavigation, pathThroughTiles } from './validate.js';
import { overlaps } from '../collision.js';
import { roomIdAt, sightClear } from '../story/spatial.js';

const point=cell=>({x:cell[0]*CELL_SIZE,z:cell[1]*CELL_SIZE});
const owners=(plan,door)=>door.cells.map(([x,z])=>plan.cells.find(c=>c.x===x&&c.z===z)?.roomId);
const doorBetween=(plan,a,b)=>plan.doors.find(d=>{
  const pair=owners(plan,d);return pair.includes(a)&&pair.includes(b);
});
function roomSide(door,roomId,plan) {
  const index=owners(plan,door).indexOf(roomId);
  return index<0?null:point(door.cells[index]);
}
function roomPaths(plan,roomId,start,end,graph) {
  const allowed=new Set(plan.cells.filter(c=>c.roomId===roomId).map(c=>keyOf(c.x,c.z)));
  const a=keyOf(Math.round(start.x/CELL_SIZE),Math.round(start.z/CELL_SIZE));
  const b=keyOf(Math.round(end.x/CELL_SIZE),Math.round(end.z/CELL_SIZE));
  if(!allowed.has(a)||!allowed.has(b)||a===b)return [];
  // Find two independent routes inside the room; shared door tiles are allowed.
  const walk=excluded=>{
    const previous=new Map([[a,null]]),queue=[a];
    for(let i=0;i<queue.length;i++)for(const next of graph.get(queue[i])??[])
      if(allowed.has(next)&&!excluded.has(next)&&!previous.has(next)){
        previous.set(next,queue[i]);queue.push(next);
      }
    if(!previous.has(b))return null;
    const route=[];for(let k=b;k!==null;k=previous.get(k))route.push(k);
    return route.reverse();
  };
  const first=walk(new Set());if(!first)return [];
  const second=walk(new Set(first.slice(1,-1)));
  return second?[first,second]:[];
}
export function fitChase(plan) {
  const route=plan.opportunities.exitRoute,graph=buildNavigation(plan);
  const occupied=new Set([plan.story?.cat?.roomId,...plan.content?.instances?.map(i=>i.roomId)??[]].filter(Boolean));
  for(let i=1;i+4<route.length;i++) {
    const stages=route.slice(i,i+4),before=route[i-1],after=route[i+4];
    if(stages.some(id=>occupied.has(id)))continue;
    const [start,retreat,clutter,hideApproach]=stages;
    const clutterRoom=plan.rooms.find(r=>r.id===clutter);
    if(clutterRoom?.type==='ring'||(clutterRoom?.interior.obstacleIds.length??0)<3)continue;
    const sourceRooms=plan.edges.flatMap(e=>e.a===start?[e.b]:e.b===start?[e.a]:[])
      .filter(id=>id!==before&&!stages.includes(id)&&id!==after&&!occupied.has(id));
    const hideRooms=plan.edges.flatMap(e=>e.a===hideApproach?[e.b]:e.b===hideApproach?[e.a]:[])
      .filter(id=>id!==after&&!stages.includes(id)&&id!==before&&!occupied.has(id));
    const stageDoors=[doorBetween(plan,before,start),doorBetween(plan,start,retreat),
      doorBetween(plan,retreat,clutter),doorBetween(plan,clutter,hideApproach),
      doorBetween(plan,hideApproach,after)];
    if(stageDoors.some(d=>!d))continue;
    const paths=roomPaths(plan,clutter,roomSide(stageDoors[2],clutter,plan),
      roomSide(stageDoors[3],clutter,plan),graph);
    if(paths.length!==2)continue;
    for(const sourceRoomId of sourceRooms)for(const hideRoomId of hideRooms) {
      if(sourceRoomId===hideRoomId)continue;
      const sideDoor=doorBetween(plan,start,sourceRoomId),hideDoor=doorBetween(plan,hideApproach,hideRoomId);
      if(!sideDoor||!hideDoor)continue;
      const source=roomSide(sideDoor,sourceRoomId,plan);
      if(!source)continue;
      const entry=roomSide(stageDoors[0],start,plan),forward=roomSide(stageDoors[1],start,plan);
      const observationPath=pathThroughTiles(plan,entry,forward,[],graph)??[];
      const observation=observationPath.find(candidate=>roomIdAt(plan,candidate)===start
        &&Math.hypot(source.x-candidate.x,source.z-candidate.z)>=5
        &&sightClear({...candidate,y:1.65},{x:sideDoor.x,y:1.5,z:sideDoor.z},[...plan.walls,...plan.obstacles])
        &&sightClear({...candidate,y:1.65},{...source,y:1.65},[...plan.walls,...plan.obstacles]));
      const concealment=plan.rooms.find(r=>r.id===hideRoomId)?.center;
      if(!source||!observation||!concealment)continue;
      const hidingPoint=point(concealment);
      if(plan.obstacles.some(b=>overlaps(hidingPoint.x,hidingPoint.z,b)))continue;
      const passage=roomSide(stageDoors[3],hideApproach,plan);
      if(sightClear({...passage,y:1.65},{...hidingPoint,y:1.65},[...plan.walls,...plan.obstacles]))continue;
      if(!pathThroughTiles(plan,source,observation,[],graph)
        ||!pathThroughTiles(plan,roomSide(hideDoor,hideRoomId,plan),hidingPoint,[],graph)
        ||!pathThroughTiles(plan,roomSide(stageDoors[4],hideApproach,plan),plan.exit,[],graph))continue;
      return {instanceId:`B13-B16-${start}`,narrativeUnitId:'B13-B16',behaviorId:'TH02',
        stages:{B13:start,B14:retreat,B15:clutter,B16:hideApproach},
        sourceRoomId,hideRoomId,source,observation,hidingPoint,
        sideDoorId:sideDoor.id,retreatDoorId:stageDoors[1].id,hideDoorId:hideDoor.id,
        routeDoorIds:stageDoors.map(d=>d.id),bypassRoutes:paths.map(path=>path.map(key=>key.split(',').map(Number).map(n=>n*CELL_SIZE)))};
    }
  }
  return null;
}
