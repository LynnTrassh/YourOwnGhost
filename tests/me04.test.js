import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan } from '../src/planning/validate.js';
import { createStoryState, stepContent } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';

const look=(from,to)=>{
  const dx=to.x-from.x,dz=to.z-from.z,dy=to.y-(from.y??1.65);
  return {...from,y:from.y??1.65,yaw:Math.atan2(-dx,-dz),
    pitch:Math.atan2(dy,Math.hypot(dx,dz))};
};

test('ME04 is a floor projection with no body and needs a continuous observed breath',()=>{
  for(const seed of ['12','42']) {
    const plan=generatePlan(seed,{catEnabled:false,contentIds:['ME04']});
    assert.equal(validatePlan(plan).valid,true);
    const instance=plan.content.instances.find(item=>item.definitionId==='ME04');assert.ok(instance);
    const baseline=generatePlan(seed,{catEnabled:false,contentIds:[]});
    assert.deepEqual(plan.doors,baseline.doors);
    assert.deepEqual(plan.obstacles,baseline.obstacles);
    const scene=new THREE.Scene(),world=createWorld(scene,plan);
    const shadow=scene.getObjectByName(`story-${instance.instanceId}-shadow`);
    assert.ok(shadow);
    assert.equal(shadow.children.length,2);
    for(const mesh of shadow.children) {
      mesh.geometry.computeBoundingBox();
      const box=mesh.geometry.boundingBox;
      assert.ok(Math.abs(box.max.z-box.min.z)<.001);
      assert.ok(mesh.position.y<.01);
    }
    const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,instance.focus);
    stepContent(plan,state,view,.8,boxes);
    stepContent(plan,state,view,1,boxes);world.updateStory(state,view);
    const widened=shadow.scale.x;assert.ok(widened>1.05);
    const progress=state.instances[instance.instanceId].progress;
    stepContent(plan,state,{...plan.spawn,y:1.65,yaw:0,pitch:0},2,boxes);
    assert.equal(state.instances[instance.instanceId].watchTime,0);
    assert.equal(state.instances[instance.instanceId].progress,progress);
    stepContent(plan,state,view,.8,boxes);
    stepContent(plan,state,view,4,boxes);
    assert.equal(state.instances[instance.instanceId].phase,'observed');
    assert.equal(state.cue?.text,'地方小了点，只够它这一部分进来。');
    const afterBreath=state.instances[instance.instanceId].progress;
    state.cue=null;stepContent(plan,state,view,1,boxes);assert.equal(state.cue,null);
    assert.ok(state.instances[instance.instanceId].progress>afterBreath);
    world.dispose();assert.equal(scene.children.length,0);
  }
});
