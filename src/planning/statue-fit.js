import { CELL_SIZE } from './templates.js';
import { buildNavigation, pathThroughTiles } from './validate.js';
import { sightClear } from '../story/spatial.js';
import { roomRoute } from './topology.js';
import { THREAT_BODY } from '../threat-profile.js';

// Read existing space only. No room, door or furniture is moved to fit the encounter.
export function fitStatue(plan) {
  const route=plan.opportunities.exitRoute,graph=buildNavigation(plan),boxes=[...plan.walls,...plan.obstacles];
  for(let i=1;i<route.length-2;i++) {
    const room=plan.rooms.find(r=>r.id===route[i]);
    if(room.id===plan.story.cat?.roomId || plan.content?.instances.some(instance=>instance.roomId===room.id)) continue;
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
      const approachRoom=plan.rooms.find(r=>r.id===route[i-1]);
      const approachCell=door.cells.find(([cx,cz])=>approachRoom.cells.some(([rx,rz])=>rx===cx&&rz===cz));
      const approachObservation={x:approachCell[0]*CELL_SIZE,z:approachCell[1]*CELL_SIZE};
      const sideRoutes=[];
      if(approachRoom.id!=='bedroom'
        &&sightClear({...approachObservation,y:1.65},{...spawn,y:THREAT_BODY.lightTargetHeight},boxes))
        for(const edge of plan.edges) {
          const neighbor=edge.a===approachRoom.id?edge.b:edge.b===approachRoom.id?edge.a:null;
          if(!neighbor||neighbor===room.id||neighbor===route[i-2]||neighbor==='bedroom')continue;
          const withoutThreat=plan.rooms.filter(r=>r.id!==room.id&&r.id!=='bedroom');
          const remainingEdges=plan.edges.filter(e=>e.a!==room.id&&e.b!==room.id
            &&e.a!=='bedroom'&&e.b!=='bedroom');
          const returnRoute=roomRoute(withoutThreat,remainingEdges,neighbor,plan.exit.roomId);
          if(!returnRoute||returnRoute.includes(approachRoom.id))continue;
          const sideDoor=plan.doors.find(d=>d.edgeId===edge.id);
          const tile=sideDoor?.cells.find(([cx,cz])=>approachRoom.cells.some(([rx,rz])=>rx===cx&&rz===cz));
          if(!tile)continue;
          const sidePoint={x:tile[0]*CELL_SIZE,z:tile[1]*CELL_SIZE};
          const approach=pathThroughTiles(plan,approachObservation,sidePoint,[],graph);
          if(!approach)continue;
          sideRoutes.push({doorId:sideDoor.id,neighborRoomId:neighbor,returnRoute,
            observationRoomId:approachRoom.id,observation:approachObservation,approach});
        }
      return {id:'statue-1',roomId:room.id,spawn,observation,entryDoorId:door.id,
        escapeRoomId:plan.exit.roomId,escapeRoute:escape,roomRoute:route.slice(i),
        bypass:sideRoutes[0]??null};
    }
  }
  return null;
}
