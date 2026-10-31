import { roomIdAt, visible } from './spatial.js';

const LINE='这么客气，连招呼都不打。';

// M03 is tied to a generated, traversable side route. Only normal door crossings
// count; losing the route or waking up discards the current opportunity.
export function stepMetaBypass(plan,story,view,dt,{door=null,previousRoomId=null,threat=null,
  boxes=[...plan.walls,...plan.obstacles],presentCue}={}) {
  const fit=plan.threat?.bypass;
  if(!fit||!threat||story.consumed.includes('M03'))return;
  const state=story.metaBypass??={phase:'waiting',exposure:0,next:0};
  if(state.phase==='invalid'||state.phase==='complete')return;
  const roomId=roomIdAt(plan,view);
  if(threat?.phase!=='dormant') {state.phase='invalid';return;}
  if(state.phase==='waiting') {
    if(roomId!==fit.observationRoomId) {state.exposure=0;return;}
    const near=Math.hypot(view.x-fit.observation.x,view.z-fit.observation.z)<=2;
    const seen=near&&visible({...view,halfH:.5,halfV:.5},
      {...plan.threat.spawn,y:1.15},boxes);
    state.exposure=seen?state.exposure+Math.max(0,dt):0;
    if(state.exposure>=.5) {state.phase='observed';story.facts.push('M03.threatObserved');}
    return;
  }
  if(previousRoomId===roomId)return;
  if(!door) {state.phase='invalid';return;}
  if(state.phase==='observed') {
    if(previousRoomId===fit.observationRoomId&&roomId===fit.neighborRoomId&&door.id===fit.doorId) {
      state.phase='traversing';state.next=1;
    } else state.phase='invalid';
    return;
  }
  const route=fit.returnRoute;
  if(previousRoomId!==route[state.next-1]||roomId!==route[state.next]) {
    state.phase='invalid';return;
  }
  state.next++;
  if(state.next!==route.length)return;
  state.phase='complete';story.facts.push('M03.safeBypass');
  if(story.behaviorCount<2&&presentCue(story,'behavior','M03',LINE,roomId,3))story.behaviorCount++;
}
