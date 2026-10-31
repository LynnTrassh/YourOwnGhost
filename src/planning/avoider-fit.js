import { CELL_SIZE } from './templates.js';
import { fitStatue } from './statue-fit.js';
import { buildNavigation, pathThroughTiles } from './validate.js';
import { sightClear } from '../story/spatial.js';
import { THREAT_BODY } from '../threat-profile.js';

// Reserve an existing visible, reachable retreat lane. Do not alter room or furniture geometry.
export function fitLightAvoider(plan) {
  const base=fitStatue(plan);
  if(!base)return null;
  const room=plan.rooms.find(item=>item.id===base.roomId),graph=buildNavigation(plan),
    boxes=[...plan.walls,...plan.obstacles],initialDistance=Math.hypot(
      base.spawn.x-base.observation.x,base.spawn.z-base.observation.z);
  const options=room.cells.map(([x,z])=>({x:x*CELL_SIZE,z:z*CELL_SIZE}))
    .filter(point=>Math.hypot(point.x-base.observation.x,point.z-base.observation.z)>=initialDistance+1.2
      &&Math.hypot(point.x-base.observation.x,point.z-base.observation.z)<=13
      &&sightClear({...base.observation,y:1.65},{...point,y:THREAT_BODY.lightTargetHeight},boxes)
      &&pathThroughTiles(plan,base.spawn,point,['bedroom',base.escapeRoomId],graph))
    .sort((a,b)=>Math.hypot(a.x-base.spawn.x,a.z-base.spawn.z)
      -Math.hypot(b.x-base.spawn.x,b.z-base.spawn.z));
  return options[0]?{...base,id:'avoider-1',retreatPoint:options[0]}:null;
}
