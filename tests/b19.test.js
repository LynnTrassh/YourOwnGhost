import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan, pathThroughTiles } from '../src/planning/validate.js';
import { createStoryState, stepContent, stepStory } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';
import { movePlayer } from '../src/collision.js';

test('B19 tilts walls and furniture within a safe visual envelope while camera and routes stay level',()=>{
  for(const seed of ['4','12']) {
    const plan=generatePlan(seed,{catEnabled:false,contentIds:['B19']}),
      instance=plan.content.instances.find(item=>item.definitionId==='B19');
    assert.ok(instance);assert.equal(validatePlan(plan).valid,true);
    const room=plan.rooms.find(item=>item.id===instance.roomId);
    assert.ok(room.interior.obstacleIds.length>0);
    const outside=plan.rooms.filter(item=>item.id!==room.id).map(item=>item.id);
    const route=pathThroughTiles(plan,instance.entryObservation,instance.observation,outside);
    assert.ok(route);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),world=createWorld(scene,plan),
      state=createStoryState(),group=scene.getObjectByName(`story-${instance.instanceId}-visual-group`),
      boxes=JSON.stringify(world.getColliders());
    assert.ok(group);assert.ok(group.children.length>2);
    assert.equal(group.children[0].visible,false);
    assert.ok(1.6-2*3*Math.tan(instance.tiltRadians)>.95);
    group.updateMatrixWorld(true);
    const before=new THREE.Box3().setFromObject(group);
    stepContent(plan,state,instance.entryObservation,.7,world.getColliders());
    const phase=state.instances[instance.instanceId];assert.equal(phase.phase,'waiting');
    const player={...instance.entryObservation};
    for(const waypoint of [...route,instance.observation]) {
      for(let attempts=0;attempts<500;attempts++) {
        const distance=Math.hypot(waypoint.x-player.x,waypoint.z-player.z);
        if(distance<.025)break;
        const step=Math.min(.2,distance),dx=(waypoint.x-player.x)/distance*step,
          dz=(waypoint.z-player.z)/distance*step;
        const previous={x:player.x,z:player.z};
        movePlayer(player,dx,dz,world.getColliders());
        assert.ok(Math.hypot(player.x-previous.x,player.z-previous.z)>.001,'walking route must not stall');
        stepContent(plan,state,player,.025,world.getColliders());
      }
      assert.ok(Math.hypot(waypoint.x-player.x,waypoint.z-player.z)<.025,'walking reaches waypoint');
    }
    stepContent(plan,state,player,.5,world.getColliders());
    assert.equal(phase.phase,'tilting');
    stepContent(plan,state,instance.observation,2.1,world.getColliders());
    world.updateStory(state,instance.observation);group.updateMatrixWorld(true);
    assert.equal(group.children[0].visible,true);
    const mid=new THREE.Box3().setFromObject(group);
    assert.ok(Math.abs(group.matrix.elements[instance.tiltAxis==='z'?4:6])>0);
    assert.ok(Math.abs(mid.min.x-before.min.x)<=.17 && Math.abs(mid.max.x-before.max.x)<=.17);
    assert.ok(Math.abs(mid.min.z-before.min.z)<=.17 && Math.abs(mid.max.z-before.max.z)<=.17);
    assert.equal(camera.rotation.z,0);
    assert.equal(JSON.stringify(world.getColliders()),boxes);
    const progress=phase.progress;
    stepContent(plan,state,{x:plan.spawn.x,z:plan.spawn.z,y:1.65,yaw:0,pitch:0},2,world.getColliders());
    assert.equal(phase.progress,progress);
    stepStory(plan,state,{x:plan.spawn.x,z:plan.spawn.z,y:1.65,yaw:0,pitch:0},.1,
      {cause:'death',suppressRoutes:true,boxes:world.getColliders()});
    assert.equal(phase.progress,progress);
    stepContent(plan,state,instance.observation,2.1,world.getColliders());
    assert.equal(phase.phase,'tilted');
    assert.equal(state.cue?.text,'站稳就好。歪一点，不耽误住。');
    state.cue=null;stepContent(plan,state,instance.observation,1,world.getColliders());
    assert.equal(state.cue,null);
    world.reset();assert.ok(Math.abs(group.matrix.elements[instance.tiltAxis==='z'?4:6])<1e-9);
    assert.equal(group.children[0].visible,false);
    world.updateStory(state,instance.observation);
    assert.ok(Math.abs(group.matrix.elements[instance.tiltAxis==='z'?4:6])>0);
    world.dispose();assert.equal(scene.children.length,0);
  }
});
