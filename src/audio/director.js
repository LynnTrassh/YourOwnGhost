import { roomIdAt, sightClear } from '../story/spatial.js';

// Presentation only: audio never writes story facts or unlocks a threat.
export function spatialMix(view, source, boxes = []) {
  const dx=source.x-view.x,dz=source.z-view.z,distance=Math.hypot(dx,dz);
  const clear=sightClear({...view,y:view.y??1.65},{...source,y:source.y??.6},boxes);
  return {gain:Math.max(0,1-distance/14)**2*(clear?1:.16),
    pan:distance>.01 ? Math.max(-1,Math.min(1,(Math.cos(view.yaw)*dx-Math.sin(view.yaw)*dz)/distance)) : 0,
    cutoff:clear?4200:550};
}

export function createSoundDirector() {
  let previous=null,stride=0,catClock=1.2,catIndex=0;
  function reset() {previous=null;stride=0;catClock=1.2;catIndex=0;}
  return {reset,step(plan,state,view,dt,{active=true,boxes=[]}={}) {
    const t=state.threat,transition=state.flow.transition;
    const now={plan,x:state.player.x,z:state.player.z,door:state.doors.bedroom.open,
      flashlight:state.player.flashlight,transition:transition?.id??null,
      threat:t?{x:t.x,z:t.z,phase:t.phase}:null};
    if(previous?.plan!==plan) reset();
    const before=previous;previous=now;
    const frame={events:[],scrape:null,catAlive:false};
    dt=Math.min(.05,Math.max(0,dt));
    if(!active || state.completed) {stride=0;return frame;}
    if(before && transition && before.transition!==transition.id)
      frame.events.push({kind:transition.kind==='death'?'death':'departure'});
    if(transition) {stride=0;return frame;}
    if(before && state.player.standing) {
      const distance=Math.hypot(now.x-before.x,now.z-before.z);
      // Ignore teleports and reset travel at rest; blocked input cannot make footsteps.
      if(distance>0.0001 && distance<=2.4*dt+.01) stride+=distance;
      else if(distance>.01) stride=0;
      if(stride>=.95) {stride%=.95;frame.events.push({kind:'step'});}
      if(now.door && !before.door) {
        const door=plan.doors.find(d=>d.id==='bedroom');
        if(door) frame.events.push({kind:'door',...spatialMix(view,{...door,y:1.2},boxes)});
      }
      if(now.flashlight!==before.flashlight) frame.events.push({kind:'switch'});
    }
    if(t && before?.threat && ['demo','pursuing'].includes(t.phase) && !t.lit
      && Math.hypot(t.x-before.threat.x,t.z-before.threat.z)>.0001)
      frame.scrape=spatialMix(view,{...t,y:.7},boxes);
    if(t?.phase==='escaped' && before?.threat?.phase!=='escaped') frame.events.push({kind:'relief'});
    const cat=plan.story.cat;
    frame.catAlive=Boolean(cat && state.story.catPhase!=='dead');
    if(frame.catAlive) {
      const room=roomIdAt(plan,view);
      const connected=room===cat.roomId || plan.edges.some(e=>[e.a,e.b].includes(room) && [e.a,e.b].includes(cat.roomId));
      if(connected) {
        catClock-=dt;
        if(catClock<=0) {
          const source=cat.slots[catIndex++%cat.slots.length];
          catClock=3.8+(catIndex%3)*.65;
          if(source) {
            const mix=spatialMix(view,{...source,y:.5},boxes);
            if(mix.gain>.005) frame.events.push({kind:'cat',...mix});
          }
        }
      }
    }
    return frame;
  }};
}
