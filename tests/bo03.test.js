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

test('BO03 moves wall and ceiling skins while furniture, camera and passage stay fixed',()=>{
  const plan=generatePlan('12',{catEnabled:false,contentIds:['BO03']});
  assert.equal(validatePlan(plan).valid,true);
  const instance=plan.content.instances.find(item=>item.definitionId==='BO03');assert.ok(instance);
  const before=generatePlan('12',{catEnabled:false,contentIds:[]});
  assert.deepEqual(plan.doors,before.doors);assert.deepEqual(plan.obstacles,before.obstacles);
  const scene=new THREE.Scene(),world=createWorld(scene,plan);
  const wall=scene.getObjectByName(`story-${instance.instanceId}-wall-0`),
    ceiling=scene.getObjectByName(`story-${instance.instanceId}-ceiling-0`);
  assert.ok(wall&&ceiling);
  const peak=mesh=>Math.max(...Array.from({length:mesh.geometry.attributes.position.count},
    (_,index)=>mesh.geometry.attributes.position.getZ(index)));
  const wallStart=peak(wall),ceilingStart=peak(ceiling);
  const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,instance.focus);
  stepContent(plan,state,view,.8,boxes);
  stepContent(plan,state,view,1.5,boxes);world.updateStory(state,view);
  assert.ok(peak(wall)>wallStart);
  assert.ok(peak(ceiling)>ceilingStart);
  const progress=state.instances[instance.instanceId].progress;
  stepContent(plan,state,{...plan.spawn,y:1.65,yaw:0,pitch:0},2,boxes);
  assert.equal(state.instances[instance.instanceId].progress,progress);
  assert.equal(state.instances[instance.instanceId].watchTime,0);
  stepContent(plan,state,view,.8,boxes);
  stepContent(plan,state,view,6,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'observed');
  assert.equal(state.cue?.text,'放松点。这间屋子也在学。');
  state.cue=null;stepContent(plan,state,view,1,boxes);assert.equal(state.cue,null);
  world.dispose();assert.equal(scene.children.length,0);
});
