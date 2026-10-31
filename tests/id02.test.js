import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan, pathThroughTiles } from '../src/planning/validate.js';
import { createStoryState, stepContent } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';

const look=(from,to)=>{
  const dx=to.x-from.x,dz=to.z-from.z,dy=(to.y??1.65)-(from.y??1.65);
  return {...from,y:from.y??1.65,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};
};

test('ID02 follows visible player motion, stops with the player and stays inside its safe footprint',()=>{
  const plan=generatePlan('12:dream:2:0',{catEnabled:false,threatEnabled:true,contentIds:['ID02']}),
    instance=plan.content.instances.find(item=>item.definitionId==='ID02');
  assert.ok(instance);assert.equal(validatePlan(plan).valid,true);
  assert.ok(pathThroughTiles(plan,plan.spawn,instance.observation));
  const boxes=[...plan.walls,...plan.obstacles],state=createStoryState();
  const first=look(instance.observation,instance.focus);
  stepContent(plan,state,first,.6,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'seen');
  const moved=look(instance.lateralObservation,instance.focus);
  stepContent(plan,state,moved,.05,boxes);
  const phase=state.instances[instance.instanceId];
  assert.equal(phase.moving,true);
  assert.ok(Math.hypot(phase.offsetX??0,phase.offsetZ??0)>0);
  const previous={x:phase.offsetX,z:phase.offsetZ};
  stepContent(plan,state,moved,.3,boxes);
  assert.equal(phase.phase,'stopped');assert.equal(phase.moving,false);
  assert.equal(phase.offsetX,previous.x);assert.equal(phase.offsetZ,previous.z);
  assert.equal(state.cue?.text,'挺像的，对吧？别急着让他转过来。');
  assert.equal(state.facts.filter(fact=>fact.endsWith('.syncStopSeen')).length,1);
  const scene=new THREE.Scene(),world=createWorld(scene,plan),figure=scene.getObjectByName(`story-${instance.instanceId}-figure`);
  assert.ok(figure);world.updateStory(state,moved);
  const bodyBox=plan.obstacles.find(box=>box.id===`${instance.instanceId}-actor`);
  assert.ok(bodyBox);assert.ok(figure.position.x>=bodyBox.minX+.2&&figure.position.x<=bodyBox.maxX-.2);
  assert.ok(figure.position.z>=bodyBox.minZ+.2&&figure.position.z<=bodyBox.maxZ-.2);
  const forward={x:-Math.sin(figure.rotation.y),z:-Math.cos(figure.rotation.y)};
  const toPlayer={x:moved.x-figure.position.x,z:moved.z-figure.position.z};
  assert.ok(forward.x*toPlayer.x+forward.z*toPlayer.z<0);
  world.dispose();

  const unseen=createStoryState();stepContent(plan,unseen,first,.6,boxes);
  stepContent(plan,unseen,moved,.05,boxes);
  stepContent(plan,unseen,{...moved,yaw:moved.yaw+Math.PI},.4,boxes);
  assert.ok(!unseen.facts.some(fact=>fact.endsWith('.syncStopSeen')));
});
