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

test('ME03 renders the same room to a real screen with the chair turned only in that view',()=>{
  for(const seed of ['12','42']) {
    const plan=generatePlan(seed,{catEnabled:false,contentIds:['ME03']});
    assert.equal(validatePlan(plan).valid,true);
    const instance=plan.content.instances.find(item=>item.definitionId==='ME03');assert.ok(instance);
    const baseline=generatePlan(seed,{catEnabled:false,contentIds:[]});
    assert.deepEqual(plan.doors,baseline.doors);
    assert.equal(plan.obstacles.filter(item=>item.kind==='monitor-chair').length,1);
    const scene=new THREE.Scene(),world=createWorld(scene,plan);
    const screen=scene.getObjectByName(`story-${instance.instanceId}-screen`),
      real=scene.getObjectByName(`story-${instance.instanceId}-real-chair`),
      alternate=scene.getObjectByName(`story-${instance.instanceId}-screen-chair`);
    assert.ok(screen&&real&&alternate);
    assert.ok(screen.material.map?.isTexture);
    assert.ok(Math.abs(real.rotation.y-alternate.rotation.y)>=Math.PI-.001);
    let currentTarget=null,renders=0;
    const fakeRenderer={getRenderTarget:()=>currentTarget,setRenderTarget:next=>{currentTarget=next;},
      clear:()=>{},render:(usedScene,camera)=>{
        assert.equal(usedScene,scene);assert.ok(camera.isPerspectiveCamera);
        assert.equal(real.visible,false);assert.equal(alternate.visible,true);
        assert.equal(screen.visible,false);renders++;
      }};
    world.renderScreens(fakeRenderer);world.renderScreens(fakeRenderer);
    assert.equal(renders,1);assert.equal(currentTarget,null);
    assert.equal(real.visible,true);assert.equal(alternate.visible,false);
    assert.equal(screen.visible,true);
    const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles];
    stepContent(plan,state,look(instance.observation,instance.focus),.9,boxes);
    assert.equal(state.instances[instance.instanceId].screenSeen,true);
    assert.equal(state.instances[instance.instanceId].phase,'waiting');
    assert.equal(state.cue,null);
    stepContent(plan,state,look(instance.observation,instance.chairFocus),.9,boxes);
    assert.equal(state.instances[instance.instanceId].chairSeen,true);
    assert.equal(state.instances[instance.instanceId].phase,'compared');
    assert.equal(state.cue?.text,'都看见了？那你信哪一个？');
    state.cue=null;stepContent(plan,state,look(instance.observation,instance.focus),1,boxes);
    assert.equal(state.cue,null);
    world.dispose();assert.equal(scene.children.length,0);
  }
});
