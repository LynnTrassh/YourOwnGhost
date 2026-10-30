import { roomIdAt, crossedDoor, visible } from './spatial.js';

const LINES={catSeen:'看，它们也在看你。',catDead:'啊呀呀……怎么都倒下了。',suggest:'左边也给你开着呢。',right:'哦，右边。你自己挑的。'};
export function presentCue(state,kind,key,text,roomId,duration=4) {
  if(state.cue || state.consumed.includes(key)) return false;
  state.consumed.push(key);state.cue={kind,key,text,roomId,remaining:duration};return true;
}
export function createStoryState() {
  return {catPhase:'unobserved',exposure:0,deadSeen:false,previous:null,entryDoorId:null,route:null,routeFinished:false,consumed:[],cue:null,behaviorCount:0,facts:[]};
}
export function stepStory(plan,state,view,dt,{active=true,cause='normal',suppressRoutes=false,boxes=[...plan.walls,...plan.obstacles]}={}) {
  if(!active) return;
  const roomId=roomIdAt(plan,view),previous=state.previous;
  if(cause!=='normal') {
    state.previous={x:view.x,z:view.z,roomId};state.entryDoorId=null;
    state.exposure=0;state.cue=null;state.route=null;state.routeFinished=false;
    return;
  }
  const door=previous && previous.roomId!==roomId && cause==='normal' ? crossedDoor(plan,previous,view,previous.roomId,roomId):null;
  const cat=plan.story.cat;
  let chosenRight=false;
  if(previous && previous.roomId!==roomId) {
    if(door && previous.roomId===cat?.roomId && state.catPhase==='observed') {state.catPhase='dead';state.facts.push('cat.normalLeave');}
    if(door && state.route && previous.roomId===state.route.roomId) {
      chosenRight=state.routeFinished && door.id===state.route.rightDoorId;
      state.route=null;state.routeFinished=false;
    }
    state.entryDoorId=door?.id??null;state.exposure=0;
    if(!door) {state.route=null;state.routeFinished=false;}
  }
  state.previous={x:view.x,z:view.z,roomId};
  const cueValid=cue=>cue.roomId===roomId;
  if(state.cue) {
    if(!cueValid(state.cue)) state.cue=null;
    else {
      state.cue.remaining-=dt;
      if(state.cue.remaining<=0) {
        if(state.cue.kind==='suggest' && state.route) {state.routeFinished=true;state.facts.push('route.presented');}
        state.cue=null;
      }
    }
  }
  const say=(kind,key,roomId,duration=4)=>presentCue(state,kind,key,LINES[kind],roomId,duration);
  if(cat && roomId===cat.roomId) {
    const count=cat.slots.filter(p=>visible(view,{...p,y:state.catPhase==='dead'?.2:.55},boxes)).length;
    state.exposure=count>=6 ? state.exposure+dt:0;
    if(state.exposure>=.8) {
      if(state.catPhase==='unobserved') {state.catPhase='observed';state.facts.push('cat.observed');}
      if(state.catPhase==='observed') say('catSeen','catSeen',roomId);
      if(state.catPhase==='dead') {state.deadSeen=true;say('catDead','catDead',roomId);}
    }
  }
  if(!suppressRoutes && chosenRight && state.behaviorCount<2 && say('right','right',roomId,3)) {state.behaviorCount++;state.facts.push('route.rightAfterSuggestion');}
  if(!suppressRoutes && !state.route && !state.consumed.includes('suggest')) {
    const route=plan.story.routes.find(r=>r.roomId===roomId && r.entryDoorId===state.entryDoorId && Math.hypot(view.x-r.origin.x,view.z-r.origin.z)<2);
    if(route) {
      const left=plan.doors.find(d=>d.id===route.leftDoorId);
      const facing=Math.cos(view.yaw-route.yaw)>.5;
      if(facing && visible(view,{x:left.x,y:1.5,z:left.z},boxes) && say('suggest','suggest',roomId)) state.route=route;
    }
  }
}
