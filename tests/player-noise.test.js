import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDream } from '../src/planning/dream.js';
import { movePlayer } from '../src/collision.js';
import { createPlayerNoiseTracker } from '../src/player-noise.js';
import { createHearingInvestigator,stepHearingInvestigator } from '../src/threat-hearing.js';

const plan=generateDream('12')[0];

test('post-collision movement creates world footsteps, blocked input and teleports do not',()=>{
  const tracker=createPlayerNoiseTracker(),player={...plan.spawn};
  tracker.step(plan,player,.05);
  const events=[];
  for(let i=0;i<25;i++) {
    movePlayer(player,.12,0,[...plan.walls,...plan.obstacles]);
    events.push(...tracker.step(plan,player,.05));
  }
  assert.ok(events.length>=1);
  assert.ok(events.every(event=>event.kind==='step'&&event.roomId&&event.id));
  for(let i=0;i<25;i++)assert.deepEqual(tracker.step(plan,player,.05),[]);
  player.x+=30;
  assert.deepEqual(tracker.step(plan,player,.05),[]);
  assert.deepEqual(tracker.step(plan,player,.05,{active:false}),[]);
  assert.deepEqual(tracker.step(plan,player,.05,{standing:false}),[]);
});

test('real displacement event updates investigator to the actual last sound, not player input',()=>{
  const tracker=createPlayerNoiseTracker({strideLength:.2}),player={...plan.spawn},
    investigator=createHearingInvestigator({x:plan.spawn.x+.5,z:plan.spawn.z});
  tracker.step(plan,player,.05);
  let event=null;
  for(let i=0;i<6&&!event;i++) {
    movePlayer(player,-.12,0,[...plan.walls,...plan.obstacles]);
    event=tracker.step(plan,player,.05)[0]??null;
  }
  assert.ok(event);
  stepHearingInvestigator(plan,investigator,[event],.05);
  assert.equal(investigator.memory.lastSound.eventId,event.id);
  const heard={...investigator.memory.lastSound};
  player.x+=2;
  for(let i=0;i<10;i++)stepHearingInvestigator(plan,investigator,[],.05);
  assert.deepEqual(investigator.memory.lastSound,heard);
});
