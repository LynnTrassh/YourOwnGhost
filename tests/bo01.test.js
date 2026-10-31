import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan } from '../src/planning/validate.js';
import { createStoryState, stepContent } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';

const look=(from,to)=>{
  const dx=to.x-from.x,dz=to.z-from.z,dy=(to.y??1.65)-(from.y??1.65),distance=Math.hypot(dx,dz);
  return {...from,y:from.y??1.65,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,distance)};
};

test('BO01 eye stays inside a real window, aligns only while watched, then speaks once',()=>{
  const plan=generatePlan('12',{catEnabled:false,contentIds:['BO01']});
  assert.equal(validatePlan(plan).valid,true);
  const eye=plan.content.instances.find(instance=>instance.definitionId==='BO01');assert.ok(eye);
  const before=generatePlan('12',{catEnabled:false,contentIds:[]});
  assert.deepEqual(plan.doors,before.doors);
  assert.deepEqual(plan.obstacles,before.obstacles);
  const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles],view=look(eye.observation,eye.focus);
  const scene=new THREE.Scene(),world=createWorld(scene,plan);
  const pupil=scene.getObjectByName(`story-${eye.instanceId}-pupil`);
  assert.ok(pupil);assert.equal(pupil.position.x,.23);
  stepContent(plan,state,view,.8,boxes);
  assert.equal(state.instances[eye.instanceId].phase,'turning');
  const away={...view,yaw:view.yaw+Math.PI};
  stepContent(plan,state,away,2.4,boxes);world.updateStory(state,away);
  assert.equal(pupil.position.x,.23);
  stepContent(plan,state,view,1.2,boxes);world.updateStory(state,view);
  assert.ok(pupil.position.x>0&&pupil.position.x<.23);
  stepContent(plan,state,view,1.2,boxes);world.updateStory(state,view);
  assert.equal(state.instances[eye.instanceId].phase,'aligned');
  assert.equal(pupil.position.x,0);
  assert.equal(state.cue?.text,'它已经离得很远了。');
  state.cue=null;stepContent(plan,state,view,1,boxes);assert.equal(state.cue,null);
  world.dispose();assert.equal(scene.children.length,0);
});
