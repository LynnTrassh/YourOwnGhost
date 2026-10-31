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

test('ME01 fits an actual reflective view with hidden occupants and three empty real chairs',()=>{
  for(const seed of ['12','42']) {
    const plan=generatePlan(seed,{catEnabled:false,contentIds:['ME01']});
    assert.equal(validatePlan(plan).valid,true);
    const instance=plan.content.instances.find(item=>item.definitionId==='ME01');assert.ok(instance);
    const baseline=generatePlan(seed,{catEnabled:false,contentIds:[]});
    assert.deepEqual(plan.doors,baseline.doors);
    assert.equal(plan.obstacles.filter(item=>item.kind==='mirror-chair').length,3);
    assert.equal(instance.chairSlots.length,3);
    assert.notDeepEqual(instance.observation,instance.sideObservation);
    const scene=new THREE.Scene(),world=createWorld(scene,plan);
    const mirror=scene.getObjectByName(`story-${instance.instanceId}-mirror`),
      people=scene.getObjectByName(`story-${instance.instanceId}-mirror-people`),
      chairs=scene.getObjectByName(`story-${instance.instanceId}-empty-chairs`);
    assert.ok(mirror?.isReflector&&mirror.getRenderTarget().texture.isTexture);
    assert.equal(people.visible,false);
    assert.equal(people.children.length,3);
    assert.equal(chairs.children.length,3);
    const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles];
    stepContent(plan,state,look(instance.observation,instance.focus),.9,boxes);
    assert.equal(state.instances[instance.instanceId].mirrorSeen,true);
    assert.equal(state.instances[instance.instanceId].phase,'waiting');
    assert.equal(state.cue,null);
    stepContent(plan,state,look(instance.observation,instance.chairFocus),.9,boxes);
    assert.equal(state.instances[instance.instanceId].chairSeen,true);
    assert.equal(state.instances[instance.instanceId].phase,'compared');
    assert.equal(state.cue?.text,'你转过去，他们就不好意思了。');
    state.cue=null;stepContent(plan,state,look(instance.sideObservation,instance.focus),1,boxes);
    assert.equal(state.cue,null);
    assert.equal(people.visible,false);
    world.dispose();assert.equal(scene.children.length,0);
  }
});
