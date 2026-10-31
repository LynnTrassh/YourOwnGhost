import { roomIdAt } from './story/spatial.js';
import { movePlayer } from './collision.js';
import { buildNavigation, pathThroughTiles } from './planning/validate.js';

const WORLD_NOISE=new Set(['step','door','impact','shatter']);
const MAX_LEVEL=20;

export function createWorldNoise(plan,{id,kind,position,level=1}) {
  if(!WORLD_NOISE.has(kind)||!id||!Number.isFinite(position?.x)||!Number.isFinite(position?.z)
    ||!Number.isFinite(level)||level<=0||level>MAX_LEVEL)return null;
  const roomId=roomIdAt(plan,position);
  return roomId?{id,kind,position:{x:position.x,z:position.z},roomId,level}:null;
}

export function acousticDistance(plan,fromRoomId,toRoomId,{closedDoorIds=[]}={}) {
  if(fromRoomId===toRoomId)return 0;
  const closed=new Set(closedDoorIds),costs=new Map([[fromRoomId,0]]),queue=[fromRoomId];
  while(queue.length) {
    queue.sort((a,b)=>costs.get(a)-costs.get(b));
    const roomId=queue.shift(),doors=costs.get(roomId);
    for(const edge of plan.edges) {
      const next=edge.a===roomId?edge.b:edge.b===roomId?edge.a:null;
      if(!next)continue;
      const door=plan.doors.find(item=>item.edgeId===edge.id);
      const nextCost=doors+(door&&closed.has(door.id)?3:1);
      if(nextCost>=(costs.get(next)??Infinity))continue;
      costs.set(next,nextCost);
      if(!queue.includes(next))queue.push(next);
    }
  }
  return costs.get(toRoomId)??Infinity;
}

export function audibleWorldNoise(plan,listener,noise,{maxDoors=2,maxDistance=18,closedDoorIds=[]}={}) {
  if(!noise||!WORLD_NOISE.has(noise.kind)||!Number.isFinite(listener?.x)
    ||!Number.isFinite(listener?.z))return false;
  const listenerRoom=roomIdAt(plan,listener);
  if(!listenerRoom||roomIdAt(plan,noise.position)!==noise.roomId)return false;
  const doors=acousticDistance(plan,listenerRoom,noise.roomId,{closedDoorIds});
  const distance=Math.hypot(listener.x-noise.position.x,listener.z-noise.position.z);
  return doors<=maxDoors && distance<=maxDistance*noise.level/(1+doors*.6);
}

export function createHearingMemory() {
  return {phase:'idle',lastSound:null,searchRemaining:0,consumedIds:new Set()};
}

// The only pursuit target is an accepted world event's source; never the player's live position.
export function stepHearingMemory(plan,memory,listener,events,dt,
  {active=true,searchDuration=4,closedDoorIds=[]}={}) {
  if(!active)return memory;
  dt=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
  let candidate=null;
  for(const event of events) {
    if(memory.consumedIds.has(event?.id))continue;
    if(!audibleWorldNoise(plan,listener,event,{closedDoorIds}))continue;
    memory.consumedIds.add(event.id);
    candidate=event;
  }
  if(candidate) {
    memory.lastSound={...candidate.position,roomId:candidate.roomId,eventId:candidate.id};
    memory.phase='investigating';memory.searchRemaining=searchDuration;
  } else if(memory.phase==='searching') {
    memory.searchRemaining=Math.max(0,memory.searchRemaining-dt);
    if(memory.searchRemaining<=1e-6) {memory.searchRemaining=0;memory.phase='idle';}
  }
  return memory;
}

export function arriveAtLastSound(memory) {
  if(memory.phase==='investigating'&&memory.lastSound)memory.phase='searching';
  return memory;
}

export function createHearingInvestigator(spawn) {
  return {x:spawn.x,z:spawn.z,memory:createHearingMemory(),path:[],targetEventId:null};
}

export function resetHearingInvestigator(investigator,spawn) {
  investigator.x=spawn.x;investigator.z=spawn.z;
  investigator.memory=createHearingMemory();investigator.path=[];investigator.targetEventId=null;
  return investigator;
}

// Perception and movement use the same event-derived target. No player position is an input.
export function stepHearingInvestigator(plan,investigator,events,dt,
  {active=true,boxes=[...plan.walls,...plan.obstacles],speed=1.65,closedDoorIds=[]}={}) {
  if(!active)return investigator;
  const tick=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
  stepHearingMemory(plan,investigator.memory,investigator,events,tick,{closedDoorIds});
  const memory=investigator.memory;
  if(memory.phase!=='investigating'||!memory.lastSound)return investigator;
  if(investigator.targetEventId!==memory.lastSound.eventId) {
    const route=pathThroughTiles(plan,investigator,memory.lastSound,[],buildNavigation(plan));
    if(!route) {memory.phase='searching';investigator.path=[];return investigator;}
    investigator.path=[...route,memory.lastSound];
    investigator.targetEventId=memory.lastSound.eventId;
  }
  let travel=Math.max(0,speed)*tick;
  for(let i=0;i<8&&travel>1e-6;i++) {
    const waypoint=investigator.path[0];
    if(!waypoint) {arriveAtLastSound(memory);break;}
    const dx=waypoint.x-investigator.x,dz=waypoint.z-investigator.z;
    const distance=Math.hypot(dx,dz);
    if(distance<.025) {investigator.path.shift();continue;}
    const step=Math.min(distance,travel),before={x:investigator.x,z:investigator.z};
    movePlayer(investigator,dx/distance*step,dz/distance*step,boxes);
    const moved=Math.hypot(investigator.x-before.x,investigator.z-before.z);
    if(moved<step*.6) {investigator.path=[];memory.phase='searching';break;}
    travel-=moved;
  }
  if(!investigator.path.length&&memory.phase==='investigating')arriveAtLastSound(memory);
  return investigator;
}
