import { CONTENT_CATALOG } from './content-catalog.js';
import { fitContent } from './content-fit.js';
import { analyzeCoverage } from './coverage.js';
import { CELL_SIZE, DIRECTIONS } from './templates.js';
import { overlaps } from '../collision.js';
import { sightClear, roomIdAt } from '../story/spatial.js';

const quietVariants=['tea','letters','clocks','place-setting'];
const labels={tea:'未喝完的茶',letters:'未寄出的信',clocks:'不同时间的钟', 'place-setting':'多出的一套餐具'};
function rng(seed) {
  let n=2166136261;
  for(const c of seed)n=Math.imul(n^c.charCodeAt(0),16777619);
  return ()=>{n+=0x6D2B79F5;let t=Math.imul(n^n>>>15,n|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
}

// An explicit, rendered still life on a shelf against an intact wall. Its small
// footprint stays at the perimeter, away from doors and navigation tile centers.
function quietSlot(plan,room) {
  const occupied=new Set(plan.cells.map(c=>`${c.x},${c.z}`));
  const boxes=[...plan.walls,...plan.obstacles];
  for(const [x,z] of room.cells)for(const [dx,dz] of DIRECTIONS) {
    if(occupied.has(`${x+dx},${z+dz}`))continue;
    const wall={x:x*CELL_SIZE+dx*CELL_SIZE/2,z:z*CELL_SIZE+dz*CELL_SIZE/2};
    if(plan.doors.some(d=>Math.hypot(d.x-wall.x,d.z-wall.z)<2))continue;
    const focus={x:wall.x-dx*.25,z:wall.z-dz*.25,y:1.05};
    const observation={x:wall.x-dx*2,z:wall.z-dz*2,y:1.65};
    if(roomIdAt(plan,observation)!==room.id||boxes.some(b=>overlaps(observation.x,observation.z,b)||overlaps(focus.x,focus.z,b,.12))
      ||!sightClear(observation,focus,boxes))continue;
    const width=dx?.22:1.5,depth=dx?1.5:.22;
    const fixture={id:`B25-${room.id}-shelf`,kind:'quiet-shelf',roomId:room.id,height:.93,
      minX:focus.x-width/2,maxX:focus.x+width/2,minZ:focus.z-depth/2,maxZ:focus.z+depth/2};
    if(boxes.some(b=>fixture.minX<b.maxX+.025&&fixture.maxX>b.minX-.025&&fixture.minZ<b.maxZ+.025&&fixture.maxZ>b.minZ-.025))continue;
    return {focus,observation,fixture,yaw:Math.atan2(-dx,-dz)};
  }
  return null;
}

export function completeRoomContent(plans,seed) {
  const selected=new Set(plans.flatMap(p=>p.content.instances.map(i=>i.definitionId)));
  plans.forEach((plan,layer)=>{
    const random=rng(`${seed}:rhythm:${layer}`);
    for(const uniqueOnly of [true,false]) {
      const occupied=analyzeCoverage(plan).rooms.filter(r=>r.role!=='connector').map(r=>r.roomId);
      const own=new Set(plan.content.instances.map(i=>i.definitionId));
      const photos=['B05','ID03','AB02'];
      const allowed=new Set(CONTENT_CATALOG.filter(d=>d.readiness==='greybox'&&d.definitionId!=='B25'
        &&!own.has(d.definitionId)&&(!selected.has(d.definitionId)||(!uniqueOnly&&d.role!=='major'))
        &&(!photos.includes(d.definitionId)||!photos.some(id=>own.has(id)))
        &&!(d.definitionId==='AB01'&&plans.some(p=>p.story.cat)))
        .map(d=>d.definitionId));
      const extra=fitContent(plan,random,allowed,occupied,plan.content.preferences,{complete:true});
      plan.content.instances.push(...extra.instances);
      for(const item of extra.instances) {
        selected.add(item.definitionId);
        plan.content.report=plan.content.report.filter(r=>r.id!==item.definitionId);
        plan.content.report.push({id:item.definitionId,accepted:true,roomId:item.roomId,
          instanceId:item.instanceId,reason:uniqueOnly?'ROOM_COVERAGE_UNIQUE':'ROOM_COVERAGE_REPEAT'});
      }
    }
    const empty=analyzeCoverage(plan).rooms.filter(r=>r.role==='connector');
    empty.forEach(row=>{
      plan.content.instances.push({instanceId:`B25-${row.roomId}`,definitionId:'B25',roomId:row.roomId,
        role:'rest',roomClass:'quiet',readiness:'greybox'});
    });
    plan.content.instances.filter(i=>i.definitionId==='B25').forEach((instance,index)=>{
      const row={roomId:instance.roomId};
      const room=plan.rooms.find(r=>r.id===row.roomId),slot=quietSlot(plan,room);
      if(!slot)throw new Error(`安静房缺少真实可见构图：${room.id}`);
      const variant=quietVariants[(index+layer)%quietVariants.length];
      plan.obstacles.push(slot.fixture);
      Object.assign(instance,{quietVariant:variant,quietLabel:labels[variant],quietNarration:index===0,...slot});
      plan.content.report=plan.content.report.filter(r=>!(r.id==='B25'&&r.roomId===room.id));
      plan.content.report.push({id:'B25',accepted:true,roomId:room.id,reason:'AUTHORED_QUIET_STILL_LIFE',variant});
    });
    plan.content.requireCompleteRooms=true;
    plan.coverage=analyzeCoverage(plan);
  });
}
