import { visible, roomIdAt } from './story/spatial.js';
import { presentCue } from './story/runtime.js';

export function activeState(plan,state) {
  state.activeEncounters??={};
  const key=plan.planHash??plan.seed;
  return state.activeEncounters[key]??=( {lever:plan.activeEncounters?.puzzle?.initial??0,solved:false,scarePhase:'waiting',elapsed:0} );
}
export function activeInteraction(plan,state,view,boxes=[]) {
  const p=plan.activeEncounters?.puzzle;if(!p||!state.player.standing)return null;
  const s=activeState(plan,state);
  if(p.fuse&&!s.fuseCollected&&Math.hypot(view.x-p.fuse.x,view.z-p.fuse.z)<2.2&&visible(view,p.fuse,boxes))
    return {label:'取走保险丝 · 带到琥珀灯配电台',id:p.id,action:'take-fuse'};
  return !s.solved&&Math.hypot(view.x-p.control.x,view.z-p.control.z)<2.2&&visible(view,p.control,boxes)
    ?{label:p.fuse&&!s.powered?(s.fuseCollected?'装入保险丝 · 恢复供电':'没有电 · 寻找蓝灯下的保险丝'):'拨动摇杆 · 对齐门框亮灯',id:p.id,action:p.fuse&&!s.powered?'power':'lever'}:null;
}
export function interactActive(plan,state,view,boxes=[]) {
  const interaction=activeInteraction(plan,state,view,boxes);if(!interaction)return false;
  const s=activeState(plan,state),p=plan.activeEncounters.puzzle;
  if(interaction.action==='take-fuse'){
    s.fuseCollected=true;
    presentCue(state.story,'interaction',`${p.id}.fuse`,'保险丝拿到了。带到琥珀灯下的配电台。',p.fuse.roomId,5);
    return true;
  }
  if(interaction.action==='power'){
    if(s.fuseCollected){s.powered=true;presentCue(state.story,'interaction',`${p.id}.power`,'供电恢复。拨动摇杆，让台上的亮灯与门框一致。',p.roomIds[0],5);}
    return true;
  }
  s.lever=(s.lever+1)%3;
  s.solved=s.lever===p.target;
  return true;
}
export function stepActive(plan,state,view,dt,boxes=[]) {
  const s=activeState(plan,state),p=plan.activeEncounters?.scare;
  if(!p||!state.player.standing||state.flow.transition||state.completed)return s;
  if(roomIdAt(plan,state.player)===p.roomIds[0])s.scareArmed=true;
  if(s.scareArmed&&s.scarePhase==='waiting'&&roomIdAt(plan,state.player)===p.roomIds[1]
    &&Math.hypot(view.x-p.target.x,view.z-p.target.z)<9&&visible(view,p.target,boxes)) {
    s.scarePhase='warning';s.elapsed=0;
  }
  if(s.scarePhase==='warning'||s.scarePhase==='burst') {
    s.elapsed+=Math.min(Math.max(dt,0),.05);
    if(s.elapsed>=.8)s.scarePhase='burst';
    if(s.elapsed>=1.45)s.scarePhase='done';
  }
  // The next room pays off the corridor encounter once, without another
  // attack: the silhouette briefly reappears at the doorway behind the player.
  if(s.scarePhase==='done'&&roomIdAt(plan,state.player)===p.roomIds[2]&&!s.echoSeen){s.echoSeen=true;s.echoRemaining=2.5;}
  if(s.echoRemaining>0)s.echoRemaining=Math.max(0,s.echoRemaining-Math.min(Math.max(dt,0),.05));
  return s;
}
