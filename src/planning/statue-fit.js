import { CELL_SIZE } from './templates.js';
import { buildNavigation, pathThroughTiles } from './validate.js';
import { sightClear } from '../story/spatial.js';
import { THREAT_BODY } from '../threat-profile.js';

// Read existing space only. No room, door or furniture is moved to fit the encounter.
export function fitStatue(plan) {
  const route=plan.opportunities.exitRoute,graph=buildNavigation(plan),boxes=[...plan.walls,...plan.obstacles];
  for(let i=1;i<route.length-2;i++) {
    const room=plan.rooms.find(r=>r.id===route[i]);
    if(room.id===plan.story.cat?.roomId) continue;
    const edge=plan.edges.find(e=>[e.a,e.b].includes(room.id) && [e.a,e.b].includes(route[i-1]));
    const door=plan.doors.find(d=>d.edgeId===edge.id);
    const cell=door.cells.find(([x,z])=>room.cells.some(c=>c[0]===x&&c[1]===z));
    const observation={x:door.x+Math.sign(cell[0]*CELL_SIZE-door.x)*1.3,z:door.z+Math.sign(cell[1]*CELL_SIZE-door.z)*1.3};
    if(!pathThroughTiles(plan,plan.spawn,observation,[],graph)) continue;
    const escape=pathThroughTiles(plan,observation,plan.exit,['bedroom'],graph);
    if(!escape) continue;
    for(const [x,z] of room.cells) {
      const spawn={x:x*CELL_SIZE,z:z*CELL_SIZE},distance=Math.hypot(spawn.x-observation.x,spawn.z-observation.z);
      if(distance<6 || distance>10) continue;
      if(!sightClear({...observation,y:1.65},{...spawn,y:THREAT_BODY.lightTargetHeight},boxes)) continue;
      if(!pathThroughTiles(plan,spawn,observation,['bedroom'],graph)) continue;
      return {id:'statue-1',roomId:room.id,spawn,observation,entryDoorId:door.id,
        escapeRoomId:plan.exit.roomId,escapeRoute:escape,roomRoute:route.slice(i)};
    }
  }
  return null;
}
