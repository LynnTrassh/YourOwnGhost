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

test('ME02 keeps a live mirror camera while only its hidden avatar lags and turns',()=>{
  for(const seed of ['12','42']) {
    const plan=generatePlan(seed,{catEnabled:false,contentIds:['ME02']});
    assert.equal(validatePlan(plan).valid,true);
    const instance=plan.content.instances.find(item=>item.definitionId==='ME02');assert.ok(instance);
    const baseline=generatePlan(seed,{catEnabled:false,contentIds:[]});
    assert.deepEqual(plan.doors,baseline.doors);
    assert.notDeepEqual(instance.observation,instance.sideObservation);
    const scene=new THREE.Scene(),world=createWorld(scene,plan);
    const mirror=scene.getObjectByName(`story-${instance.instanceId}-mirror`),
      avatar=scene.getObjectByName(`story-${instance.instanceId}-delayed-avatar`),
      head=scene.getObjectByName(`story-${instance.instanceId}-head`);
    assert.ok(mirror?.isReflector&&mirror.getRenderTarget().texture.isTexture);
    assert.equal(avatar.visible,false);assert.ok(head);
    const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles];
    stepContent(plan,state,look(instance.observation,instance.focus),.9,boxes);
    const phase=state.instances[instance.instanceId];
    assert.equal(phase.phase,'matched');assert.equal(state.cue,null);
    world.updateStory(state,instance.observation);
    assert.equal(avatar.position.x,instance.observation.x);
    stepContent(plan,state,look(instance.sideObservation,instance.focus),.05,boxes);
    assert.equal(phase.phase,'lagging');
    assert.deepEqual(phase.actorPose,phase.anchorPose);
    world.updateStory(state,instance.sideObservation);
    assert.equal(avatar.position.x,instance.observation.x);
    assert.equal(avatar.position.z,instance.observation.z);
    stepContent(plan,state,look(instance.sideObservation,instance.focus),1.3,boxes);
    world.updateStory(state,instance.sideObservation);
    assert.ok(head.rotation.y>0&&head.rotation.y<.95);
    assert.equal(state.cue,null);
    stepContent(plan,state,look(instance.sideObservation,instance.focus),1.3,boxes);
    assert.equal(phase.phase,'turned');
    assert.equal(state.cue?.text,'你先走。它还想再待一会儿。');
    state.cue=null;stepContent(plan,state,look(instance.sideObservation,instance.focus),1,boxes);
    assert.equal(state.cue,null);assert.equal(avatar.visible,false);
    world.dispose();assert.equal(scene.children.length,0);
  }
});
