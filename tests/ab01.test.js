import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { generateDream } from '../src/planning/dream.js';
import { validatePlan } from '../src/planning/validate.js';
import { createStoryState, stepContent, stepStory } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';

const look=(from,to)=>{
  const dx=to.x-from.x,dz=to.z-from.z,dy=(to.y??1.65)-(from.y??1.65);
  return {...from,y:from.y??1.65,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};
};

test('AB01 live group disappears only after actual observation and normal departure, leaving bowl and traces',()=>{
  const plan=generatePlan('12',{catEnabled:false,contentIds:['AB01']}),instance=plan.content.instances.find(item=>item.definitionId==='AB01');
  assert.ok(instance);assert.equal(validatePlan(plan).valid,true);
  assert.equal(instance.slots.length,9);assert.equal(plan.story.cat,null);
  const boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,instance.focus);
  const door=plan.doors.find(item=>item.id===instance.entryDoorId),axis=door.axis,other=axis==='x'?'z':'x';
  const inside=door.cells.find(([x,z])=>plan.cells.find(cell=>cell.x===x&&cell.z===z)?.roomId===instance.roomId);
  const sign=Math.sign(inside[axis==='x'?0:1]*plan.cellSize-door[axis]);
  const near={...view,[axis]:door[axis]+sign*.25,[other]:door[other]};
  const far={...near,[axis]:door[axis]-sign*.25};
  const unseen=createStoryState();
  stepStory(plan,unseen,near,.01,{suppressRoutes:true,boxes});
  stepStory(plan,unseen,far,.01,{suppressRoutes:true,boxes});
  assert.equal(unseen.instances[instance.instanceId].phase,'waiting');
  const state=createStoryState();stepContent(plan,state,view,.85,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'observed');
  assert.equal(state.cue?.text,'这回，都在这儿了。');state.cue=null;
  stepStory(plan,state,near,.01,{suppressRoutes:true,boxes});
  stepStory(plan,state,far,.01,{suppressRoutes:true,boxes});
  assert.equal(state.instances[instance.instanceId].phase,'absent');
  const scene=new THREE.Scene(),world=createWorld(scene,plan);
  const cats=scene.getObjectByName(`story-${instance.instanceId}-cats`);
  const traces=scene.getObjectByName(`story-${instance.instanceId}-traces`);
  const bowl=scene.getObjectByName(`story-${instance.instanceId}-bowl`);
  assert.equal(cats.children.length,9);assert.ok(bowl);
  world.updateStory(state,view);assert.equal(cats.visible,false);assert.equal(traces.visible,true);
  stepStory(plan,state,near,.01,{suppressRoutes:true,boxes});
  stepContent(plan,state,view,.85,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'revisited');
  assert.equal(state.cue?.text,'啊，你回来晚了一点。');
  world.dispose();
  const teleported=createStoryState();stepContent(plan,teleported,view,.85,boxes);
  stepStory(plan,teleported,far,.1,{cause:'death',suppressRoutes:true,boxes});
  assert.equal(teleported.instances[instance.instanceId].phase,'observed');
});

test('AB01 excludes the fixed cat scene across both dream layers',()=>{
  for(const seed of ['0','4','7','12','42']) {
    const dream=generateDream(seed,{catEnabled:true});
    if(dream[0].story.cat)
      assert.ok(!dream.some(plan=>plan.content.instances.some(instance=>instance.definitionId==='AB01')));
  }
});
