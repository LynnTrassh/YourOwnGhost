import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan, pathThroughTiles } from '../src/planning/validate.js';
import { roomIdAt } from '../src/story/spatial.js';
import { createStoryState, stepContent } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';

const look=(from,to)=>{
  const dx=to.x-from.x,dz=to.z-from.z,dy=to.y-(from.y??1.65);
  return {...from,y:from.y??1.65,yaw:Math.atan2(-dx,-dz),
    pitch:Math.atan2(dy,Math.hypot(dx,dz))};
};

test('BO02 binds two real rooms with a safe door slit and a separate normal-size head',()=>{
  for(const seed of ['12','42']) {
    const plan=generatePlan(seed,{catEnabled:false,contentIds:['BO02']});
    assert.equal(validatePlan(plan).valid,true);
    const instance=plan.content.instances.find(item=>item.definitionId==='BO02');assert.ok(instance);
    const baseline=generatePlan(seed,{catEnabled:false,contentIds:[]});
    assert.deepEqual(plan.doors,baseline.doors);
    const edge=plan.edges.find(item=>item.id===plan.doors.find(d=>d.id===instance.entryDoorId).edgeId);
    assert.deepEqual(new Set([edge.a,edge.b]),new Set([instance.roomId,instance.actorRoomId]));
    assert.ok(pathThroughTiles(plan,plan.spawn,instance.observation));
    assert.equal(roomIdAt(plan,instance.track.origin),instance.actorRoomId);
    assert.equal(plan.obstacles.filter(item=>item.kind==='story-door-leaf').length,1);
    assert.ok(plan.coverage.rooms.find(row=>row.roomId===instance.actorRoomId).units.includes('BO02'));
    const scene=new THREE.Scene(),world=createWorld(scene,plan);
    const figure=scene.getObjectByName(`story-${instance.instanceId}-segmented-figure`),
      head=scene.getObjectByName(`story-${instance.instanceId}-normal-head`),
      leaf=scene.getObjectByName(`story-${instance.instanceId}-door-leaf`);
    assert.ok(figure&&head&&leaf);
    assert.equal(head.scale.y,1);
    const segments=Array.from({length:9},(_,index)=>
      scene.getObjectByName(`story-${instance.instanceId}-body-${index}`));
    assert.ok(segments.every(Boolean));assert.ok(segments.every(item=>!item.visible));
    const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,instance.focus);
    stepContent(plan,state,view,.8,boxes);
    const phase=state.instances[instance.instanceId];
    assert.equal(phase.phase,'passing');assert.equal(state.cue,null);
    stepContent(plan,state,{...view,yaw:view.yaw+Math.PI},1,boxes);
    assert.equal(phase.progress,0);
    stepContent(plan,state,view,2.75,boxes);
    assert.equal(phase.progress,.5);
    world.updateStory(state,instance.observation);
    assert.ok(segments.every(item=>item.visible));
    assert.equal(head.scale.y,1);
    assert.equal(state.cue,null);
    stepContent(plan,state,view,.7,boxes);
    assert.equal(state.cue?.text,'别急，还没过去完。');
    state.cue=null;stepContent(plan,state,view,3,boxes);
    assert.equal(phase.phase,'passed');assert.equal(state.cue,null);
    world.dispose();assert.equal(scene.children.length,0);
  }
});
