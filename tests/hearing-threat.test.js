import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDream } from '../src/planning/dream.js';
import { createState } from '../src/state.js';
import { createThreatState,stepThreat } from '../src/threat.js';
import { createWorldNoise } from '../src/threat-hearing.js';
import { HEARING_BEHAVIOR,GAZE_BEHAVIOR } from '../src/threat-profile.js';

const plan=generateDream('12',{threatBehaviorId:HEARING_BEHAVIOR})[1];
const view=()=>({x:state.player.x,z:state.player.z,y:1.65,yaw:0,pitch:0});
let state;
const dark={enabled:false};

function setup() {
  state=createState(plan);state.player.standing=true;state.doors.bedroom.open=true;
  Object.assign(state.player,plan.threat.observation);
  return state;
}

test('hearing mode is explicit; default generated threat retains gaze behavior',()=>{
  assert.equal(plan.threat.behaviorId,HEARING_BEHAVIOR);
  assert.equal(createState(plan).threat.behaviorId,HEARING_BEHAVIOR);
  assert.equal(createState(generateDream('12')[1]).threat.behaviorId,GAZE_BEHAVIOR);
});

test('hearing demonstration requires a real world event and stays harmless until barrier ends',()=>{
  const s=setup(),t=s.threat,source={...s.player};
  for(let i=0;i<30;i++)stepThreat(plan,s,view(),dark,.05);
  assert.equal(t.phase,'dormant');
  assert.equal(t.memory.lastSound,null);
  const event=createWorldNoise(plan,{id:'real-step-1',kind:'step',position:source});
  assert.ok(event);
  assert.equal(stepThreat(plan,s,view(),dark,.05,{noiseEvents:[event]}),false);
  assert.equal(t.phase,'demo');
  for(let i=0;i<10;i++)assert.equal(stepThreat(plan,s,view(),dark,.05),false);
  assert.ok(t.demoMoved>=.3);
  assert.equal(t.demoStarted,true);
  assert.equal(s.story.consumed.filter(key=>key==='hearing.demo').length,1);
  const before={x:t.x,z:t.z,remaining:t.barrierRemaining};
  for(let i=0;i<10;i++)stepThreat(plan,s,view(),dark,.05,{active:false});
  assert.deepEqual({x:t.x,z:t.z,remaining:t.barrierRemaining},before);
  for(let i=0;i<100&&t.phase==='demo';i++)stepThreat(plan,s,view(),dark,.05);
  assert.equal(t.phase,'pursuing');
  assert.equal(t.demoComplete,true);
  assert.equal(s.story.facts.filter(fact=>fact==='hearing.demonstrated').length,1);
  const remembered={...t.memory.lastSound};
  s.player.x+=3;
  for(let i=0;i<10;i++)stepThreat(plan,s,view(),dark,.05);
  assert.deepEqual(t.memory.lastSound,remembered);
  const reset=createThreatState(plan,t);
  assert.equal(reset.phase,'dormant');
  assert.equal(reset.demoComplete,true);
  assert.equal(reset.memory.lastSound,null);
});
