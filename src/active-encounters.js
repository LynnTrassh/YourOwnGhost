import { visible, roomIdAt, crossedDoor } from './story/spatial.js';
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
    ?{label:p.fuse&&!s.powered?(s.fuseCollected?'装入保险丝 · 恢复供电':'没有电 · 寻找蓝灯下的保险丝'):!s.clueSeen?'缺少接线提示 · 查看蓝灯房间的灯号':'拨动摇杆 · 对齐记住的灯号',id:p.id,action:p.fuse&&!s.powered?'power':!s.clueSeen?'need-clue':'lever'}:null;
}
export function interactActive(plan,state,view,boxes=[]) {
  const interaction=activeInteraction(plan,state,view,boxes);if(!interaction)return false;
  const s=activeState(plan,state),p=plan.activeEncounters.puzzle;
  if(interaction.action==='take-fuse'){
    s.fuseCollected=true;
    presentCue(state.story,'interaction',`${p.id}.fuse`,'保险丝拿到了。带到琥珀灯下的配电台。',p.fuse.roomId,5);
    return true;
  }
  if(interaction.action==='need-clue')return true;
  if(interaction.action==='power'){
    if(s.fuseCollected){s.powered=true;presentCue(state.story,'interaction',`${p.id}.power`,'供电恢复。按蓝灯房间的接线提示调整摇杆。',p.roomIds[0],5);}
    return true;
  }
  s.lever=(s.lever+1)%3;
  s.solved=s.lever===p.target;
  return true;
}
export function stepActive(plan,state,view,dt,boxes=[]) {
  const s=activeState(plan,state),p=plan.activeEncounters?.scare,puzzle=plan.activeEncounters?.puzzle;
  if(!state.player.standing||state.flow.transition||state.completed){s.previous=null;return s;}
  const room=roomIdAt(plan,state.player),previous=s.previous;
  const crossing=previous&&previous.roomId!==room?crossedDoor(plan,previous,state.player,previous.roomId,room):null;
  s.previous={x:state.player.x,z:state.player.z,roomId:room};
  if(puzzle&&!s.clueSeen){
    const seen=roomIdAt(plan,state.player)===puzzle.clueRoomId&&Math.hypot(view.x-puzzle.clue.x,view.z-puzzle.clue.z)<=4&&visible(view,puzzle.clue,boxes);
    s.clueExposure=seen?(s.clueExposure??0)+Math.min(Math.max(dt,0),.05):0;
    if(s.clueExposure>=.6)s.clueSeen=true;
  }
  if(!p)return s;
  if(s.scarePhase==='waiting'){
    if(crossing?.id===p.entryDoorId&&room===p.roomIds[1])s.scareArmed=true;
    else if(room!==p.roomIds[1])s.scareArmed=false;
  }
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
  if(p.echoAllowed!==false&&s.scarePhase==='done'&&crossing?.id===p.exitDoorId&&room===p.roomIds[2]&&!s.echoSeen){s.echoSeen=true;s.echoRemaining=2.5;}
  if(s.echoRemaining>0)s.echoRemaining=Math.max(0,s.echoRemaining-Math.min(Math.max(dt,0),.05));
  return s;
}
