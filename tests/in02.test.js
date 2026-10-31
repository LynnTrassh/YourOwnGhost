import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan, pathThroughTiles } from '../src/planning/validate.js';
import { createStoryState, stepContent, stepStory } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';
import { roomIdAt } from '../src/story/spatial.js';
import { overlaps } from '../src/collision.js';

const face=(from,to)=>({...from,y:1.65,
  yaw:Math.atan2(-(to.x-from.x),-(to.z-from.z)),
  pitch:Math.atan2((to.y??1.65)-1.65,Math.hypot(to.x-from.x,to.z-from.z))});

test('IN02 uses a compatible confirmed doll fear, a real safe drawer, and a bounded recycled visual pool',()=>{
  for(const seed of ['4','12']) {
    const plan=generatePlan(seed,{catEnabled:false,contentIds:['IN02'],preferences:['fear.doll']});
    const instance=plan.content.instances.find(item=>item.definitionId==='IN02');
    assert.ok(instance);assert.equal(instance.fearId,'doll');
    assert.equal(instance.maxVisible,6);assert.equal(validatePlan(plan).valid,true);
    const unconfirmed=structuredClone(plan);unconfirmed.content.preferences=[];
    assert.ok(validatePlan(unconfirmed).errors.includes('UNCONFIRMED_CONTENT_PREFERENCE:IN02'));
    assert.ok(pathThroughTiles(plan,instance.observation,instance.spillEnd));
    for(const distance of [.3,.7,1.1,1.55])for(const lateral of [-.28,0,.28]) {
      const inward={x:-instance.normal.x,z:-instance.normal.z};
      const point={x:instance.focus.x+inward.x*distance-inward.z*lateral,
        z:instance.focus.z+inward.z*distance+inward.x*lateral};
      assert.equal(roomIdAt(plan,point),instance.roomId);
      assert.equal([...plan.walls,...plan.obstacles.filter(item=>item.id!==instance.fixture.id)]
        .some(box=>overlaps(point.x,point.z,box,.1)),false);
    }
    const scene=new THREE.Scene(),world=createWorld(scene,plan),state=createStoryState(),
      boxes=world.getColliders(),initialBoxes=JSON.stringify(boxes);
    const drawer=scene.getObjectByName(`story-${instance.instanceId}-drawer`);
    const dolls=Array.from({length:6},(_,index)=>scene.getObjectByName(`story-${instance.instanceId}-doll-${index}`));
    assert.ok(drawer);assert.ok(dolls.every(Boolean));assert.ok(dolls.every(doll=>!doll.visible));
    const view=face(instance.observation,instance.focus);
    stepContent(plan,state,{...view,yaw:view.yaw+Math.PI},1,boxes);
    assert.equal(state.instances[instance.instanceId].phase,'waiting');
    stepContent(plan,state,view,.6,boxes);
    const phase=state.instances[instance.instanceId];assert.equal(phase.phase,'pouring');
    world.updateStory(state,view);assert.equal(dolls.filter(doll=>doll.visible).length,1);
    stepContent(plan,state,view,1.15,boxes);world.updateStory(state,view);
    assert.equal(phase.firstFullVisible,true);
    assert.equal(state.cue?.text,'都想出来见见你。挤一挤嘛。');
    assert.ok(dolls[0].position.distanceTo(drawer.position)>.3);
    assert.equal(JSON.stringify(world.getColliders()),initialBoxes);
    const elapsed=phase.elapsed;state.cue=null;
    stepContent(plan,state,{x:plan.spawn.x,z:plan.spawn.z,y:1.65,yaw:0,pitch:0},2,boxes);
    assert.equal(phase.elapsed,elapsed);
    stepStory(plan,state,{x:plan.spawn.x,z:plan.spawn.z,y:1.65,yaw:0,pitch:0},.1,
      {cause:'death',suppressRoutes:true,boxes});
    assert.equal(phase.elapsed,elapsed);
    stepContent(plan,state,view,12,boxes);world.updateStory(state,view);
    assert.ok(phase.elapsed>7.2);assert.ok(dolls.filter(doll=>doll.visible).length<=6);
    assert.equal(state.cue,null);
    world.reset();assert.ok(dolls.every(doll=>!doll.visible));
    world.updateStory(state,view);assert.ok(dolls.some(doll=>doll.visible));
    world.dispose();assert.equal(scene.children.length,0);
  }
  const unsupported=generatePlan('4',{catEnabled:false,contentIds:['IN02'],preferences:[]});
  assert.equal(unsupported.content.instances.some(item=>item.definitionId==='IN02'),false);
  assert.equal(unsupported.content.report.find(item=>item.id==='IN02')?.reason,'PREFERENCE_UNCONFIRMED');
});
