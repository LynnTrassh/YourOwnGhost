import { movePlayer } from './collision.js';
import { buildNavigation, pathThroughTiles } from './planning/validate.js';
import { roomIdAt, sightClear, visible } from './story/spatial.js';
import { presentCue } from './story/runtime.js';
import { GAZE_BEHAVIOR, THREAT_BODY } from './threat-profile.js';

export const STATUE_RULES={speed:1.75,demoSpeed:.8,demoTravel:1,demoExposure:.6,demoDuration:4,safeDistance:3,contact:.48};
const navigation=new WeakMap();
export function createThreatState(plan,previous=null) {
  if(!plan?.threat) return null;
  return {id:plan.threat.id,behaviorId:GAZE_BEHAVIOR,...plan.threat.spawn,phase:'dormant',lit:false,seesPlayer:false,
    demoMoved:previous?.demoMoved??0,exposure:0,demoStarted:previous?.demoStarted??false,
    barrierRemaining:previous?.barrierRemaining??STATUE_RULES.demoDuration,demoComplete:previous?.demoComplete??false,
    path:[],pathTarget:null};
}
export function statueIlluminated(view,target,beam,boxes) {
  if(!beam?.enabled || !visible(view,target,boxes)) return false;
  const dx=target.x-beam.origin.x,dy=target.y-beam.origin.y,dz=target.z-beam.origin.z;
  const distance=Math.hypot(dx,dy,dz);
  return distance>0 && distance<=beam.distance
    && (dx*beam.direction.x+dy*beam.direction.y+dz*beam.direction.z)/distance>=Math.cos(beam.angle*.8)
    && sightClear(beam.origin,target,boxes);
}
function approach(plan,t,player,boxes,distance) {
  if(!navigation.has(plan)) navigation.set(plan,buildNavigation(plan));
  const target=`${Math.round(player.x/plan.cellSize)},${Math.round(player.z/plan.cellSize)}`;
  if(target!==t.pathTarget || !t.path.length) {
    t.path=pathThroughTiles(plan,t,player,['bedroom',plan.threat.escapeRoomId],navigation.get(plan))??[];
    t.pathTarget=target;
    if(t.path.length) t.path.push({x:player.x,z:player.z});
    // Already between tile centers: skip the first center only if the direct step is collision-free.
    if(t.path.length>1) {
      const probe={x:t.x,z:t.z},next=t.path[1];
      movePlayer(probe,next.x-probe.x,next.z-probe.z,boxes);
      if(Math.hypot(probe.x-next.x,probe.z-next.z)<1e-5) t.path.shift();
    }
  }
  if(!t.path.length) return 0;
  t.path[t.path.length-1]={x:player.x,z:player.z};
  let moved=0;
  for(let guard=0;guard<8 && distance>1e-6;guard++) {
    const waypoint=t.path[0]??player,dx=waypoint.x-t.x,dz=waypoint.z-t.z,length=Math.hypot(dx,dz);
    if(length<.02) {if(t.path.length) {t.path.shift();continue;} break;}
    const step=Math.min(distance,length),before={x:t.x,z:t.z};
    movePlayer(t,dx/length*step,dz/length*step,boxes);
    const actual=Math.hypot(t.x-before.x,t.z-before.z);moved+=actual;distance-=step;
    if(actual<step*.8) {t.path=[];break;}
  }
  return moved;
}
export function stepThreat(plan,state,view,beam,dt,{active=true,boxes=[...plan.walls,...plan.obstacles]}={}) {
  const t=state.threat,config=plan.threat;
  if(!active || !t || !config || state.completed || state.flow.transition || !state.player.standing) return false;
  dt=Math.min(.05,Math.max(0,dt));
  const room=roomIdAt(plan,state.player),target={x:t.x,y:THREAT_BODY.lightTargetHeight,z:t.z};
  t.lit=statueIlluminated(view,target,beam,boxes);
  t.seesPlayer=false;
  if(t.phase==='escaped') return false;
  if(room===config.escapeRoomId && t.phase!=='dormant') {
    t.phase='escaped';t.path=[];t.pathTarget=null;state.story.facts.push('statue.escaped');return false;
  }
  // The statue needs its own unobstructed sightline, independent of the player's camera or light.
  t.seesPlayer=room!=='bedroom' && Boolean(room) && state.flow.graceRemaining<=0
    && sightClear({x:t.x,y:THREAT_BODY.eyeHeight,z:t.z},{...state.player,y:1.65},boxes);
  if(!t.seesPlayer) {
    t.path=[];t.pathTarget=null;t.exposure=0;return false;
  }
  if(t.phase==='dormant') {
    const nearObservation=Math.hypot(state.player.x-config.observation.x,state.player.z-config.observation.z)<=2
      && sightClear({...state.player,y:1.65},target,boxes);
    if(room!==config.roomId || (!nearObservation && !visible(view,target,boxes))) return false;
    t.phase=t.demoComplete?'pursuing':'demo';
  }
  const distance=Math.hypot(t.x-state.player.x,t.z-state.player.z);
  if(t.phase==='demo') {
    if(room!==config.roomId) {t.exposure=0;return false;}
    if(!t.demoStarted) {
      if(!t.lit && t.demoMoved<STATUE_RULES.demoTravel && distance>STATUE_RULES.safeDistance)
        t.demoMoved+=approach(plan,t,state.player,boxes,Math.min(STATUE_RULES.demoSpeed*dt,STATUE_RULES.demoTravel-t.demoMoved,distance-STATUE_RULES.safeDistance));
      t.exposure=t.lit && t.demoMoved>=.3 ? t.exposure+dt:0;
      if(t.exposure>=STATUE_RULES.demoExposure && presentCue(state.story,'statueDemo','statue.demo','你看着，它就懂规矩。',room,STATUE_RULES.demoDuration))
        t.demoStarted=true;
    } else {
      t.barrierRemaining=Math.max(0,t.barrierRemaining-dt);
      if(t.barrierRemaining===0 && distance>=STATUE_RULES.safeDistance) {
        t.demoComplete=true;t.phase='pursuing';state.story.facts.push('statue.demonstrated');
      }
    }
    return false;
  }
  if(!t.lit) approach(plan,t,state.player,boxes,STATUE_RULES.speed*dt);
  // Contact cannot reach through a wall; light stops motion, not contact damage.
  return Math.hypot(t.x-state.player.x,t.z-state.player.z)<=STATUE_RULES.contact
    && sightClear({...state.player,y:1},{x:t.x,y:1,z:t.z},boxes);
}
