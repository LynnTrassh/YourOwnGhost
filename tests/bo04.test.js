import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan } from '../src/planning/validate.js';
import { createStoryState, stepContent, stepStory } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';

const look=(from,to)=>{
  const dx=to.x-from.x,dz=to.z-from.z,dy=(to.y??1.65)-(from.y??1.65);
  return {...from,y:from.y??1.65,yaw:Math.atan2(-dx,-dz),
    pitch:Math.atan2(dy,Math.hypot(dx,dz))};
};

test('BO04 bends one real chair joint only after observation, normal departure and return',()=>{
  for(const seed of ['12','20']) {
    const plan=generatePlan(seed,{catEnabled:false,contentIds:['BO04']});
    assert.equal(validatePlan(plan).valid,true);
    const instance=plan.content.instances.find(item=>item.definitionId==='BO04');assert.ok(instance);
    const baseline=generatePlan(seed,{catEnabled:false,contentIds:[]});
    assert.deepEqual(plan.doors,baseline.doors);
    assert.equal(plan.obstacles.filter(item=>item.kind==='joint-chair').length,1);
    const scene=new THREE.Scene(),world=createWorld(scene,plan);
    const chair=scene.getObjectByName(`story-${instance.instanceId}-chair`),
      joint=scene.getObjectByName(`story-${instance.instanceId}-bend-joint`);
    assert.ok(chair&&joint);assert.equal(joint.rotation.z,0);
    const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,instance.focus);
    stepContent(plan,state,view,.9,boxes);
    assert.equal(state.instances[instance.instanceId].phase,'observed');
    const door=plan.doors.find(item=>item.id===instance.entryDoorId),axis=door.axis,
      other=axis==='x'?'z':'x';
    const inside=door.cells.find(([x,z])=>plan.cells.find(cell=>cell.x===x&&cell.z===z)?.roomId===instance.roomId);
    const sign=Math.sign(inside[axis==='x'?0:1]*plan.cellSize-door[axis]);
    const near={...view,[axis]:door[axis]+sign*.25,[other]:door[other]};
    const far={...near,[axis]:door[axis]-sign*.25};
    const teleport=createStoryState();stepContent(plan,teleport,view,.9,boxes);
    stepStory(plan,teleport,far,.01,{cause:'teleport',boxes});
    assert.equal(teleport.instances[instance.instanceId].phase,'observed');
    stepStory(plan,state,near,.01,{suppressRoutes:true,boxes});
    stepStory(plan,state,far,.01,{suppressRoutes:true,boxes});
    assert.equal(state.instances[instance.instanceId].phase,'readyToBend');
    stepStory(plan,state,near,.01,{suppressRoutes:true,boxes});
    stepContent(plan,state,view,.9,boxes);
    assert.equal(state.instances[instance.instanceId].phase,'bending');
    stepContent(plan,state,view,1.6,boxes);world.updateStory(state,view);
    assert.equal(state.instances[instance.instanceId].phase,'bent');
    assert.ok(joint.rotation.z<-.4);
    assert.equal(chair.position.x,instance.focus.x);
    assert.equal(state.cue?.text,'坐久了，总得活动一下。');
    state.cue=null;stepContent(plan,state,view,1,boxes);assert.equal(state.cue,null);
    world.dispose();assert.equal(scene.children.length,0);
  }
});
