import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan, pathThroughTiles } from '../src/planning/validate.js';
import { createStoryState, stepContent } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';

const look=(from,to)=>{
  const dx=to.x-from.x,dz=to.z-from.z,dy=(to.y??1.65)-(from.y??1.65),distance=Math.hypot(dx,dz);
  return {...from,y:from.y??1.65,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,distance)};
};

test('B10 keeps a dry route beside its basin while a visible submerged outline passes once',()=>{
  const plan=generatePlan('12',{catEnabled:false,contentIds:['B10']});
  assert.equal(validatePlan(plan).valid,true);
  const instance=plan.content.instances.find(item=>item.definitionId==='B10');assert.ok(instance);
  const basin=plan.obstacles.find(box=>box.id===instance.fixture.id);assert.ok(basin);
  assert.equal(basin.kind,'water-basin');
  assert.ok(pathThroughTiles(plan,instance.observation,plan.exit));
  const scene=new THREE.Scene(),world=createWorld(scene,plan),shadow=scene.getObjectByName(`story-${instance.instanceId}-outline`);
  assert.ok(shadow);assert.ok(world.getColliders().includes(basin));
  const staysUnderWater=()=>{
    for(const part of shadow.children) {
      const x=shadow.position.x+part.position.x,z=shadow.position.z+part.position.z;
      assert.ok(x-part.scale.x>=basin.minX&&x+part.scale.x<=basin.maxX);
      assert.ok(z-part.scale.z>=basin.minZ&&z+part.scale.z<=basin.maxZ);
    }
  };
  staysUnderWater();
  const boxes=[...plan.walls,...plan.obstacles],state=createStoryState(),view=look(instance.observation,instance.focus);
  stepContent(plan,state,view,.8,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'passing');
  const initial={x:shadow.position.x,z:shadow.position.z};
  stepContent(plan,state,{...view,yaw:view.yaw+Math.PI},2,boxes);world.updateStory(state,view);
  assert.deepEqual({x:shadow.position.x,z:shadow.position.z},initial);
  stepContent(plan,state,view,2,boxes);world.updateStory(state,view);
  assert.ok(Math.hypot(shadow.position.x-initial.x,shadow.position.z-initial.z)>.4);
  assert.ok(shadow.position.y<.15,'the silhouette remains below the water surface');
  stepContent(plan,state,view,2,boxes);world.updateStory(state,view);
  assert.equal(state.instances[instance.instanceId].phase,'passed');
  staysUnderWater();
  assert.equal(state.cue?.text,'看不清也好。省得你嫌它大。');
  state.cue=null;stepContent(plan,state,view,1,boxes);assert.equal(state.cue,null);
  world.dispose();assert.equal(scene.children.length,0);
});
