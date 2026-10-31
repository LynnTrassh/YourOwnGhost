import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan } from '../src/planning/validate.js';
import { createStoryState, stepContent } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';

const look=(from,to)=>{
  const dx=to.x-from.x,dz=to.z-from.z,dy=to.y-from.y;
  return {...from,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};
};

test('B09 remains on the ceiling, crawls only while watched and never creates damage or collision',()=>{
  const plan=generatePlan('12',{contentIds:['B09']}),instance=plan.content.instances.find(item=>item.definitionId==='B09');
  assert.ok(instance);assert.equal(validatePlan(plan).valid,true);
  assert.equal(plan.threat,null);
  assert.equal(plan.obstacles.some(box=>box.id.startsWith('B09-')),false);
  assert.equal(instance.focus.y,2.92);
  const boxes=[...plan.walls,...plan.obstacles],state=createStoryState(),view=look(instance.observation,instance.focus);
  stepContent(plan,state,{...view,yaw:view.yaw+Math.PI},2,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'waiting');
  assert.equal(state.instances[instance.instanceId].progress,0);
  stepContent(plan,state,view,.8,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'observed');
  assert.equal(state.cue?.text,'上面还有位置，就都安排上去了。');
  const before=state.instances[instance.instanceId].progress;
  stepContent(plan,state,{...view,yaw:view.yaw+Math.PI},2,boxes);
  assert.equal(state.instances[instance.instanceId].progress,before);
  const scene=new THREE.Scene(),world=createWorld(scene,plan);
  const group=scene.getObjectByName(`story-${instance.instanceId}-spiders`);
  assert.equal(group.children.length,8);
  world.updateStory(state,view);
  const positions=group.children.map(spider=>spider.position.toArray());
  assert.ok(positions.every(([x,y,z])=>y===2.83&&Math.hypot(x-instance.focus.x,z-instance.focus.z)<2));
  stepContent(plan,state,view,.1,boxes);world.updateStory(state,view);
  assert.notDeepEqual(group.children.map(spider=>spider.position.toArray()),positions);
  world.dispose();
});
