import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan, pathThroughTiles } from '../src/planning/validate.js';
import { createStoryState, stepContent, stepStory } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';

const look=(from,to)=>{
  const dx=to.x-from.x,dz=to.z-from.z,dy=to.y-(from.y??1.65);
  return {...from,y:from.y??1.65,yaw:Math.atan2(-dx,-dz),
    pitch:Math.atan2(dy,Math.hypot(dx,dz))};
};
const maxHeight=mesh=>Math.max(...mesh.geometry.attributes.position.array.filter((_,i)=>i%3===2));

test('AB04 collapses only its duvet mesh and keeps an empty bed indentation after return',()=>{
  for(const seed of ['12','42']) {
    const plan=generatePlan(seed,{catEnabled:false,contentIds:['AB04']});
    assert.equal(validatePlan(plan).valid,true);
    const instance=plan.content.instances.find(item=>item.definitionId==='AB04');assert.ok(instance);
    assert.deepEqual(plan.doors,generatePlan(seed,{catEnabled:false,contentIds:[]}).doors);
    assert.equal(plan.obstacles.filter(item=>item.kind==='memory-bed').length,1);
    assert.ok(pathThroughTiles(plan,plan.spawn,instance.observation));
    const scene=new THREE.Scene(),world=createWorld(scene,plan),
      frame=scene.getObjectByName(`story-${instance.instanceId}-frame`),
      duvet=scene.getObjectByName(`story-${instance.instanceId}-duvet`),
      indent=scene.getObjectByName(`story-${instance.instanceId}-indent`);
    assert.ok(frame&&duvet&&indent);
    const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,instance.focus);
    world.updateStory(state,instance.observation);
    const before=maxHeight(duvet);assert.ok(before>.45);
    stepContent(plan,state,view,.9,boxes);
    const phase=state.instances[instance.instanceId];assert.equal(phase.phase,'collapsing');
    stepContent(plan,state,view,1.8,boxes);world.updateStory(state,instance.observation);
    assert.ok(maxHeight(duvet)<before);assert.equal(indent.visible,false);
    stepContent(plan,state,{...view,yaw:view.yaw+Math.PI},1,boxes);
    assert.equal(phase.progress,.5);
    stepContent(plan,state,view,1.8,boxes);world.updateStory(state,instance.observation);
    assert.equal(phase.phase,'collapsed');assert.equal(indent.visible,true);
    assert.ok(maxHeight(duvet)<.01);assert.equal(frame.scale.y,1);
    assert.equal(state.cue?.text,'啊，原来不用给它留位置。');
    state.cue=null;
    stepStory(plan,state,{x:plan.spawn.x,z:plan.spawn.z,y:1.65,yaw:0,pitch:0},.1,
      {cause:'death',suppressRoutes:true,boxes});
    stepContent(plan,state,view,1,boxes);
    assert.equal(phase.phase,'collapsed');assert.equal(state.cue,null);
    world.dispose();
    const second=new THREE.Scene(),restored=createWorld(second,plan);
    restored.updateStory(state,instance.observation);
    assert.equal(second.getObjectByName(`story-${instance.instanceId}-indent`).visible,true);
    restored.dispose();
  }
});
