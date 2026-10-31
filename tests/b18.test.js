import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan } from '../src/planning/validate.js';
import { createStoryState, stepContent, stepStory } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';

const look=(from,to)=>{
  const dx=to.x-from.x,dz=to.z-from.z,dy=(to.y??1.65)-(from.y??1.65);
  return {...from,y:from.y??1.65,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};
};

test('B18 changes the same visible window only after observed normal departure and preserves passage',()=>{
  const plan=generatePlan('12',{catEnabled:false,contentIds:['B18']}),instance=plan.content.instances.find(item=>item.definitionId==='B18');
  assert.ok(instance);assert.equal(validatePlan(plan).valid,true);
  const boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,instance.focus);
  const door=plan.doors.find(item=>item.id===instance.entryDoorId),axis=door.axis,other=axis==='x'?'z':'x';
  const inside=door.cells.find(([x,z])=>plan.cells.find(cell=>cell.x===x&&cell.z===z)?.roomId===instance.roomId);
  const sign=Math.sign(inside[axis==='x'?0:1]*plan.cellSize-door[axis]);
  const near={...view,[axis]:door[axis]+sign*.25,[other]:door[other]};
  const far={...near,[axis]:door[axis]-sign*.25};
  const unseen=createStoryState();stepStory(plan,unseen,near,.01,{suppressRoutes:true,boxes});
  stepStory(plan,unseen,far,.01,{suppressRoutes:true,boxes});
  assert.equal(unseen.instances[instance.instanceId].phase,'waiting');
  const state=createStoryState();stepContent(plan,state,view,.85,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'observed');assert.equal(state.cue,null);
  const scene=new THREE.Scene(),world=createWorld(scene,plan),garden=scene.getObjectByName(`story-${instance.instanceId}-garden`),
    neighbor=scene.getObjectByName(`story-${instance.instanceId}-neighbor`);
  assert.ok(garden&&neighbor);world.updateStory(state,view);
  assert.equal(garden.visible,true);assert.equal(neighbor.visible,false);
  stepStory(plan,state,near,.01,{suppressRoutes:true,boxes});
  stepStory(plan,state,far,.01,{suppressRoutes:true,boxes});
  assert.equal(state.instances[instance.instanceId].phase,'changed');
  world.updateStory(state,view);assert.equal(garden.visible,false);assert.equal(neighbor.visible,true);
  stepStory(plan,state,near,.01,{suppressRoutes:true,boxes});
  stepContent(plan,state,view,.85,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'revisited');
  assert.equal(state.cue?.text,'邻居近一点，也热闹。');
  assert.equal(validatePlan(plan).valid,true);world.dispose();
  const teleported=createStoryState();stepContent(plan,teleported,view,.85,boxes);
  stepStory(plan,teleported,far,.1,{cause:'death',suppressRoutes:true,boxes});
  assert.equal(teleported.instances[instance.instanceId].phase,'observed');
});
