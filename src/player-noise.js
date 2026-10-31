import { createWorldNoise } from './threat-hearing.js';

// Gameplay noise is derived from post-collision displacement, independent of audio playback.
export function createPlayerNoiseTracker({strideLength=.95,maxSpeed=2.4}={}) {
  let previous=null,stride=0,serial=0;
  return {
    reset(position=null) {previous=position&&{x:position.x,z:position.z};stride=0;serial=0;},
    step(plan,position,dt,{active=true,standing=true}={}) {
      const now={x:position.x,z:position.z},before=previous;previous=now;
      if(!active||!standing||!before) {stride=0;return [];}
      const tick=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
      const distance=Math.hypot(now.x-before.x,now.z-before.z);
      if(tick===0||distance>maxSpeed*tick+.01) {stride=0;return [];}
      if(distance<1e-4)return [];
      stride+=distance;
      const events=[];
      while(stride>=strideLength) {
        stride-=strideLength;
        const event=createWorldNoise(plan,{id:`player-step-${++serial}`,kind:'step',position:now});
        if(event)events.push(event);
      }
      return events;
    },
  };
}
