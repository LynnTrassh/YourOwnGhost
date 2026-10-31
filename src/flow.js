import { createThreatState } from './threat.js';
import { createStoryState, presentCue } from './story/runtime.js';
import { roomIdAt, visible, sightClear } from './story/spatial.js';

const FADE_OUT=.6,FADE_IN=.6;
export const RESPAWN_GRACE=3;
export const canExplore=state=>!state.completed && !state.flow.transition;
export function canUseExit(state,plan,view,boxes) {
  return canExplore(state) && state.player.standing && roomIdAt(plan,view)===plan.exit.roomId
    && Math.hypot(view.x-plan.exit.x,view.z-plan.exit.z)<1.7
    && sightClear(view,{...plan.exit,y:.08},boxes);
}
function clearTransientStory(state) {
  Object.assign(state.story,{cue:null,previous:null,entryDoorId:null,route:null,routeFinished:false,exposure:0});
}
export function requestExit(state,plan,view,boxes) {
  if(!canUseExit(state,plan,view,boxes)) return false;
  state.flow.transition={id:++state.flow.transitionId,kind:state.layer===1?'layer':'ending',elapsed:0,committed:false};
  state.flow.phase='transition';
  clearTransientStory(state);
  return true;
}
export function requestDeath(state) {
  const t=state.flow.transition;
  if(state.completed || !state.player.standing || state.flow.graceRemaining>0 || t?.committed || t?.kind==='death') return false;
  // A lethal frame wins over an exit request that has not committed yet.
  state.flow.transition={id:++state.flow.transitionId,kind:'death',elapsed:0,committed:false};
  state.flow.phase='deathReturn';
  clearTransientStory(state);
  return true;
}
export function stepRespawnProtection(state,dt,active=true) {
  if(active && canExplore(state) && state.player.standing)
    state.flow.graceRemaining=Math.max(0,state.flow.graceRemaining-Math.max(0,dt));
}
export function transitionOpacity(state) {
  const t=state.flow.transition;
  if(!t) return 0;
  return t.committed ? Math.max(0,1-(t.elapsed-FADE_OUT)/FADE_IN):Math.min(1,t.elapsed/FADE_OUT);
}
export function stepTransition(state,dt,active=true) {
  const t=state.flow.transition;
  if(!active || !t) return null;
  t.elapsed+=Math.max(0,dt);
  if(!t.committed && t.elapsed>=FADE_OUT) return {id:t.id,kind:t.kind};
  if(t.committed && t.elapsed>=FADE_OUT+FADE_IN) {
    state.flow.transition=null;state.flow.phase=state.completed?'ending':'waking';
    return {kind:'revealed'};
  }
  return null;
}
export function commitTransition(state,id,nextPlan) {
  const t=state.flow.transition;
  if(!t || t.id!==id || t.committed || t.elapsed<FADE_OUT) return false;
  if(t.kind==='layer' && (!nextPlan?.validation.valid || state.layer!==1 || state.flow.falseAwakenings!==0)) return false;
  if(t.kind==='death' && (!nextPlan?.validation.valid || nextPlan.planHash!==state.planHash)) return false;
  if(t.kind!=='death') state.flow.history.push({layer:state.layer,planHash:state.planHash,story:structuredClone(state.story)});
  if(t.kind==='layer') {
    const {consumed,behaviorCount}=state.story;
    const facts=new Set(state.story.facts);
    const conditional={};
    const eligible=(nextPlan.content?.conditionalSlots??[]).filter(slot=>['B27','B28'].includes(slot.id)&&
      facts.has(`${slot.sourceInstanceId}.${slot.id==='B27'?'witheredSeen':'tearSeen'}`));
    const chosen=eligible.find(slot=>slot.id==='B27')??eligible.find(slot=>slot.id==='B28');
    if(chosen)conditional[chosen.id]={enabled:true,phase:'waiting',exposure:0,
      sourceInstanceId:chosen.sourceInstanceId};
    const trace=(nextPlan.content?.conditionalSlots??[]).find(slot=>slot.id==='IN04'
      &&facts.has(`${slot.sourceInstanceId}.followSeen`));
    if(trace)conditional.IN04={enabled:true,phase:'waiting',exposure:0,
      sourceInstanceId:trace.sourceInstanceId,traceId:trace.traceId};
    state.story={...createStoryState(),consumed:[...consumed],behaviorCount,conditional};
    state.threat=createThreatState(nextPlan);
    state.layer=2;state.planHash=nextPlan.planHash;state.flow.falseAwakenings++;
    state.player={x:nextPlan.spawn.x,z:nextPlan.spawn.z,standing:false,flashlight:true};
    state.doors={bedroom:{open:false}};
    state.flow.wakeExposure=0;state.flow.exitExposure=0;state.flow.wakeReason='layer';state.flow.graceRemaining=0;
  } else if(t.kind==='death') {
    state.threat=createThreatState(nextPlan,state.threat);
    state.flow.deaths++;state.flow.wakeReason='death';state.flow.graceRemaining=RESPAWN_GRACE;
    state.player={x:nextPlan.spawn.x,z:nextPlan.spawn.z,standing:false,flashlight:true};
    state.doors={bedroom:{open:false}};
    state.flow.wakeExposure=0;state.flow.exitExposure=0;
    clearTransientStory(state);
  } else {
    state.completed=true;
  }
  t.committed=true;t.elapsed=FADE_OUT;
  return true;
}
export function cancelTransition(state) {
  if(state.flow.transition?.committed) return false;
  state.flow.transition=null;state.flow.phase='exploring';return true;
}
export function stepFlowNarration(state,plan,view,dt,boxes) {
  if(!canExplore(state)) return;
  const roomId=roomIdAt(plan,view),f=state.flow;
  // Recognizable bedroom ahead; no forced camera or movement lock for narration.
  f.wakeExposure=roomId==='bedroom' && visible(view,{x:plan.spawn.x,y:1.4,z:plan.spawn.z-2},boxes)?f.wakeExposure+dt:0;
  if(f.wakeReason==='death') {
    if(state.player.standing && roomId==='bedroom') presentCue(state.story,'flow','flow.death','慢一点。又没人催你。',roomId,RESPAWN_GRACE);
  } else if(f.wakeExposure>=.5) presentCue(state.story,'flow',state.layer===1?'flow.wake':'flow.falseWake',
    state.layer===1?'醒了？给你留着门呢。':'啊，回来了。还是这儿睡得惯吧。',roomId);
  f.exitExposure=state.layer===1 && roomId===plan.exit.roomId && visible(view,{...plan.exit,y:.08},boxes)?f.exitExposure+dt:0;
  if(f.exitExposure>=.5) presentCue(state.story,'flow','flow.exit','你看，出口一直在那儿。',roomId);
}
