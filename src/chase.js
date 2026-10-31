import { movePlayer } from './collision.js';
import { pathThroughTiles } from './planning/validate.js';
import { roomIdAt, sightClear } from './story/spatial.js';
import { presentCue } from './story/runtime.js';
import { createHearingMemory, stepHearingInvestigator } from './threat-hearing.js';

export const CHASE_BEHAVIOR='chase-investigator';
const SPEED=2.05,CONTACT=.48;

export function createChaseState(plan) {
  const {source}=plan.chase;
  return {id:'chase-1',behaviorId:CHASE_BEHAVIOR,x:source.x,z:source.z,
    phase:'dormant',stage:0,warningRemaining:1.15,doorRemaining:0,
    memory:createHearingMemory(),path:[],targetEventId:null,
    targetKey:null,route:[],lastSeen:null,searchTarget:null,
    seesPlayer:false,sensesPlayer:false,passed:false,b14LinePending:false,b15LinePending:false};
}
export function canCloseChaseDoor(plan,state) {
  const t=state.threat,door=plan.doors.find(d=>d.id===plan.chase?.retreatDoorId);
  const distance=door&&Math.hypot(state.player.x-door.x,state.player.z-door.z);
  return Boolean(door&&t?.behaviorId===CHASE_BEHAVIOR&&t.stage>=2&&t.stage<=3&&t.doorRemaining<=0
    &&roomIdAt(plan,state.player)===plan.chase.stages.B14
    &&![plan.chase.stages.B14,plan.chase.stages.B15,plan.chase.stages.B16].includes(roomIdAt(plan,t))
    &&distance<=2.4&&distance>=.95);
}
export function closeChaseDoor(plan,state) {
  if(!canCloseChaseDoor(plan,state))return false;
  const t=state.threat;
  t.doorRemaining=2.4;
  t.b14LinePending=true;
  return true;
}
function moveToward(plan,t,target,dt,boxes) {
  const key=`${Math.round(target.x/plan.cellSize)},${Math.round(target.z/plan.cellSize)}`;
  if(t.targetKey!==key||!t.route.length) {
    t.route=pathThroughTiles(plan,t,target,[],undefined)??[];
    t.targetKey=key;
    if(t.route.length)t.route.push(target);
  }
  let travel=SPEED*dt;
  for(let n=0;n<8&&travel>1e-6&&t.route.length;n++) {
    const p=t.route[0],dx=p.x-t.x,dz=p.z-t.z,length=Math.hypot(dx,dz);
    if(length<.04){t.route.shift();continue;}
    const step=Math.min(travel,length),before={x:t.x,z:t.z};
    movePlayer(t,dx/length*step,dz/length*step,boxes);
    const moved=Math.hypot(t.x-before.x,t.z-before.z);
    if(moved<step*.5){t.route=[];break;}
    travel-=moved;
  }
}
export function stepChase(plan,state,dt,{active=true,boxes=[...plan.walls,...plan.obstacles],noiseEvents=[]}={}) {
  const t=state.threat,chase=plan.chase;
  if(!active||!chase||t?.behaviorId!==CHASE_BEHAVIOR||!state.player.standing
    ||state.completed||state.flow.transition)return false;
  dt=Math.max(0,Math.min(.05,dt));
  const room=roomIdAt(plan,state.player),stages=Object.values(chase.stages);
  const entered=stages.indexOf(room)+1;
  if(t.phase==='dormant') {
    if(entered!==1)return false;
    t.phase='warning';t.stage=1;
    return false;
  }
  if(entered>t.stage&&entered<=t.stage+1) {
    t.stage=entered;
    if(entered===3)t.b15LinePending=true;
  }
  if(t.phase==='warning') {
    t.warningRemaining=Math.max(0,t.warningRemaining-dt);
    if(t.warningRemaining===0) {
      t.phase='pursuing';
      presentCue(state.story,'chase','B13.charge','这位好像等不及了。',chase.stages.B13);
    }
    return false;
  }
  t.doorRemaining=Math.max(0,t.doorRemaining-dt);
  if(t.b14LinePending) {
    if(room!==chase.stages.B14)t.b14LinePending=false;
    else if(presentCue(state.story,'chase','B14.closed','关得真快。可惜它也会敲门。',room))
      t.b14LinePending=false;
  }
  const behindDoor=t.doorRemaining>0&&![chase.stages.B14,chase.stages.B15,chase.stages.B16].includes(roomIdAt(plan,t));
  const canSee=room!=='bedroom'&&Boolean(room)&&state.flow.graceRemaining<=0
    &&Math.hypot(t.x-state.player.x,t.z-state.player.z)<14
    &&sightClear({x:t.x,y:1.65,z:t.z},{...state.player,y:1.65},boxes);
  t.seesPlayer=canSee;
  t.sensesPlayer=canSee||t.memory.phase==='investigating';
  if(t.b15LinePending&&room===chase.stages.B15
    &&Math.hypot(t.x-state.player.x,t.z-state.player.z)>=4.5) {
    if(presentCue(state.story,'chase','B15.safe','绕这么远，还是带着它呀。',room))
      t.b15LinePending=false;
  }
  if(t.phase==='escaped'&&!canSee)return false;
  if(canSee){
    t.phase='pursuing';t.lastSeen={x:state.player.x,z:state.player.z};t.searchTarget=null;t.passed=false;
  }
  if(!behindDoor) {
    if(canSee)moveToward(plan,t,state.player,dt,boxes);
    else if(t.lastSeen) {
      moveToward(plan,t,t.lastSeen,dt,boxes);
      if(Math.hypot(t.x-t.lastSeen.x,t.z-t.lastSeen.z)<.5){t.lastSeen=null;t.route=[];t.targetKey=null;}
    } else if(t.stage>=4) {
      const door=plan.doors.find(d=>d.id===chase.routeDoorIds[4]);
      const forward=door&&{x:door.x,z:door.z};
      if(forward) {
        t.phase='searching';moveToward(plan,t,forward,dt,boxes);
        if(Math.hypot(t.x-forward.x,t.z-forward.z)<1.5&&room===chase.hideRoomId
          &&Math.hypot(t.x-state.player.x,t.z-state.player.z)>5) {
          t.passed=true;t.phase='escaped';
          presentCue(state.story,'chase','B16.passed','过去了。你倒挺会让客人自己走。',room);
        }
      }
    } else stepHearingInvestigator(plan,t,noiseEvents,dt,{boxes,speed:SPEED});
  }
  if(t.phase==='escaped'&&canSee){t.phase='pursuing';t.passed=false;}
  return t.phase!=='escaped'&&state.flow.graceRemaining<=0
    &&Math.hypot(t.x-state.player.x,t.z-state.player.z)<=CONTACT
    &&sightClear({x:t.x,y:1,z:t.z},{...state.player,y:1,z:state.player.z},boxes);
}
