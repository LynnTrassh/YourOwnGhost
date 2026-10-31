import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDream } from '../src/planning/dream.js';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan } from '../src/planning/validate.js';
import { createState } from '../src/state.js';
import { createThreatState,stepThreat } from '../src/threat.js';
import { GAZE_BEHAVIOR,LIGHT_AVOIDER_BEHAVIOR } from '../src/threat-profile.js';

const plan=generateDream('12',{threatBehaviorId:LIGHT_AVOIDER_BEHAVIOR})[1];
function setup() {
  const state=createState(plan);state.layer=2;
  state.player={...plan.threat.observation,standing:true,flashlight:true};
  state.doors.bedroom.open=true;return state;
}
function aim(state,lit=true) {
  const dx=state.threat.x-state.player.x,dz=state.threat.z-state.player.z,
    dy=1.3-1.65,length=Math.hypot(dx,dy,dz);
  return {view:{...state.player,y:1.65,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))},
    beam:{enabled:lit,origin:{...state.player,y:1.65},
      direction:{x:dx/length,y:dy/length,z:dz/length},angle:Math.PI/7,distance:15}};
}
function tick(state,lit,n=1,options={}) {
  let lethal=false;
  for(let i=0;i<n;i++) {
    const {view,beam}=aim(state,lit);
    lethal=stepThreat(plan,state,view,beam,.05,options)||lethal;
  }
  return lethal;
}

test('light avoider reserves a visible, reachable retreat without changing room geometry',()=>{
  assert.equal(plan.threat.behaviorId,LIGHT_AVOIDER_BEHAVIOR);
  assert.ok(plan.threat.retreatPoint);
  assert.equal(validatePlan(plan).valid,true);
  assert.equal(createState(generateDream('12')[1]).threat.behaviorId,GAZE_BEHAVIOR);
  const normal=generatePlan('12:dream:2:0',{catEnabled:false,threatEnabled:true});
  assert.deepEqual(plan.cells,normal.cells);
  assert.deepEqual(plan.doors,normal.doors);
  const altered=structuredClone(plan);altered.threat.retreatPoint={x:999,z:999};
  assert.ok(validatePlan(altered).errors.includes('INVALID_AVOIDER_RETREAT'));
});

test('first actual illumination retreats safely; darkness stops retreat and later permits approach',()=>{
  const state=setup(),threat=state.threat;
  const initialDistance=Math.hypot(threat.x-state.player.x,threat.z-state.player.z);
  tick(state,false,20);assert.equal(threat.phase,'dormant');
  assert.equal(threat.demoMoved,0);
  assert.equal(tick(state,true,12),false);
  assert.equal(threat.phase,'demo');
  assert.ok(threat.demoMoved>=.3);
  assert.ok(Math.hypot(threat.x-state.player.x,threat.z-state.player.z)>initialDistance);
  assert.equal(threat.demoStarted,true);
  assert.deepEqual(state.story.consumed.filter(key=>key==='avoider.demo'),['avoider.demo']);
  const before={x:threat.x,z:threat.z,remaining:threat.barrierRemaining};
  tick(state,true,12,{active:false});
  assert.deepEqual({x:threat.x,z:threat.z,remaining:threat.barrierRemaining},before);
  const outside=plan.rooms.find(room=>room.id!==plan.threat.roomId
    &&room.id!==plan.threat.escapeRoomId&&room.id!=='bedroom');
  state.player.x=outside.cells[0][0]*plan.cellSize;
  state.player.z=outside.cells[0][1]*plan.cellSize;
  tick(state,false,20);
  assert.equal(threat.barrierRemaining,before.remaining);
  state.player={...plan.threat.observation,standing:true,flashlight:true};
  tick(state,false,10);
  assert.equal(threat.x,before.x);assert.equal(threat.z,before.z);
  assert.equal(threat.phase,'demo');
  tick(state,true,90);
  assert.equal(threat.phase,'pursuing');
  assert.equal(threat.demoComplete,true);
  assert.equal(state.story.facts.filter(fact=>fact==='avoider.demonstrated').length,1);
  const far=Math.hypot(threat.x-state.player.x,threat.z-state.player.z);
  tick(state,false,10);
  assert.ok(Math.hypot(threat.x-state.player.x,threat.z-state.player.z)<far);
  const preserved=createThreatState(plan,threat);
  assert.equal(preserved.phase,'dormant');
  assert.equal(preserved.demoComplete,true);
  assert.equal(preserved.demoStarted,true);
});

test('dangerous contact requires completed demonstration, while exit room ends pursuit',()=>{
  const state=setup(),threat=state.threat;
  tick(state,true,12);
  state.player={x:threat.x,z:threat.z,standing:true,flashlight:false};
  assert.equal(tick(state,false),false);
  assert.equal(threat.phase,'demo');
  threat.demoStarted=true;threat.barrierRemaining=0;
  tick(state,false);
  assert.equal(threat.phase,'pursuing');
  assert.equal(tick(state,false),true);
  const exit=plan.rooms.find(room=>room.id===plan.threat.escapeRoomId);
  state.player.x=exit.cells[0][0]*plan.cellSize;
  state.player.z=exit.cells[0][1]*plan.cellSize;
  assert.equal(tick(state,false),false);
  assert.equal(threat.phase,'escaped');
  assert.equal(state.story.facts.filter(fact=>fact==='avoider.escaped').length,1);
});
