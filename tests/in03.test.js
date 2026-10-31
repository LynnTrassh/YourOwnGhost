import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan, pathThroughTiles } from '../src/planning/validate.js';
import { roomIdAt } from '../src/story/spatial.js';
import { createStoryState, stepContent, stepStory } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';

const look=(from,to)=>{
  const dx=to.x-from.x,dz=to.z-from.z,dy=to.y-(from.y??1.65);
  return {...from,y:from.y??1.65,yaw:Math.atan2(-dx,-dz),
    pitch:Math.atan2(dy,Math.hypot(dx,dz))};
};

test('IN03 seeps through three bounded sources in two actual adjacent rooms without blocking a route',()=>{
  for(const seed of ['12','42']) {
    const plan=generatePlan(seed,{catEnabled:false,contentIds:['IN03']});
    assert.equal(validatePlan(plan).valid,true);
    const instance=plan.content.instances.find(item=>item.definitionId==='IN03');assert.ok(instance);
    assert.deepEqual(plan.doors,generatePlan(seed,{catEnabled:false,contentIds:[]}).doors);
    const door=plan.doors.find(item=>item.id===instance.supportEntryDoorId),
      edge=plan.edges.find(item=>item.id===door.edgeId);
    assert.deepEqual(new Set([edge.a,edge.b]),new Set([instance.roomId,instance.supportRoomId]));
    assert.ok(pathThroughTiles(plan,plan.spawn,instance.observation));
    assert.ok(pathThroughTiles(plan,instance.observation,instance.wallObservation));
    assert.ok(pathThroughTiles(plan,instance.wallObservation,instance.doorObservation));
    assert.equal(plan.obstacles.filter(item=>item.kind==='water-story-bed').length,1);
    assert.ok(plan.coverage.rooms.find(row=>row.roomId===instance.supportRoomId).units.includes('IN03'));
    for(const [roomId,point] of [[instance.roomId,instance.focus],
      [instance.supportRoomId,instance.wallFocus],[instance.supportRoomId,instance.doorFocus]]) {
      assert.equal(roomIdAt(plan,point),roomId);
      for(const [dx,dz] of [[.38,0],[-.38,0],[0,.38],[0,-.38]])
        assert.equal(roomIdAt(plan,{x:point.x+dx,z:point.z+dz}),roomId);
    }
    const scene=new THREE.Scene(),world=createWorld(scene,plan),water=[0,1,2].map(index=>
      scene.getObjectByName(`story-${instance.instanceId}-water-${index}`));
    assert.ok(water.every(Boolean));
    const wallRunoff=scene.getObjectByName(`story-${instance.instanceId}-wall-runoff`),
      doorRunoff=scene.getObjectByName(`story-${instance.instanceId}-door-runoff`),
      crevice=scene.getObjectByName(`story-${instance.instanceId}-wall-crevice`);
    assert.ok(wallRunoff&&doorRunoff&&crevice);
    const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles],
      bed=look(instance.observation,instance.focus),wall=look(instance.wallObservation,instance.wallFocus),
      seam=look(instance.doorObservation,instance.doorFocus);
    stepContent(plan,state,bed,.8,boxes);
    const phase=state.instances[instance.instanceId];assert.equal(phase.phase,'bedSeeping');
    stepContent(plan,state,bed,2,boxes);assert.equal(phase.phase,'wallReady');
    world.updateStory(state,instance.observation);
    assert.equal(water[0].visible,true);assert.equal(water[1].visible,true);
    assert.equal(water[2].visible,false);assert.equal(state.cue,null);
    assert.equal(wallRunoff.visible,true);assert.equal(doorRunoff.visible,false);
    stepContent(plan,state,wall,.8,boxes);
    assert.equal(phase.phase,'wallSeeping');
    assert.equal(state.cue?.text,'这儿也有。看来不是你眼花。');
    state.cue=null;stepContent(plan,state,{...wall,yaw:wall.yaw+Math.PI},1,boxes);
    assert.equal(phase.wallProgress,0);
    stepContent(plan,state,wall,2,boxes);assert.equal(phase.phase,'doorReady');
    stepContent(plan,state,seam,.8,boxes);assert.equal(phase.phase,'doorSeeping');
    stepContent(plan,state,seam,2,boxes);assert.equal(phase.phase,'complete');
    world.updateStory(state,instance.wallObservation);
    assert.ok(water.every(item=>item.visible));
    assert.equal(doorRunoff.visible,true);
    assert.equal(state.cue,null);
    stepStory(plan,state,{x:plan.spawn.x,z:plan.spawn.z,y:1.65,yaw:0,pitch:0},.1,
      {cause:'death',suppressRoutes:true,boxes});
    stepContent(plan,state,seam,1,boxes);
    assert.equal(phase.phase,'complete');assert.equal(state.cue,null);
    world.dispose();assert.equal(scene.children.length,0);
  }
});
