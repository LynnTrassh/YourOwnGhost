import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan, pathThroughTiles } from '../src/planning/validate.js';
import { createStoryState, stepContent, stepStory } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';
import { overlaps, movePlayer } from '../src/collision.js';
import { roomIdAt } from '../src/story/spatial.js';
import { createState } from '../src/state.js';

const look=(from,to)=>{
  const dx=to.x-from.x,dz=to.z-from.z,dy=to.y-(from.y??1.65);
  return {...from,y:from.y??1.65,yaw:Math.atan2(-dx,-dz),
    pitch:Math.atan2(dy,Math.hypot(dx,dz))};
};

test('B20 closes only after entrance and forward exit are seen, and keeps a valid detour',()=>{
  for(const seed of ['4','12']) {
    const plan=generatePlan(seed,{catEnabled:false,contentIds:['B20']}),
      instance=plan.content.instances.find(item=>item.definitionId==='B20');
    assert.ok(instance);assert.equal(validatePlan(plan).valid,true);
    const scene=new THREE.Scene(),world=createWorld(scene,plan),state=createStoryState(),
      door=plan.doors.find(item=>item.id===instance.entryDoorId),
      wall=scene.getObjectByName(`story-${instance.instanceId}-sealed-wall`);
    assert.ok(wall);assert.equal(wall.visible,false);
    const initialTopology=world.getTopology();
    // This scene starts after the player opened and crossed its entrance.
    const game=createState(plan);
    for(const portal of plan.doors)world.toggleDoor(portal.id,game);world.update(1,game);
    const entry=look(instance.observation,instance.focus),
      forward=look(instance.forwardObservation,instance.forwardFocus),
      confirmation=look(instance.confirmationObservation,instance.focus);
    const crossing={x:instance.observation.x,z:instance.observation.z};
    movePlayer(crossing,(door.x-crossing.x)*1.8,(door.z-crossing.z)*1.8,world.getColliders());
    assert.notEqual(roomIdAt(plan,crossing),instance.roomId);
    stepContent(plan,state,forward,1,world.getColliders());
    let phase=state.instances[instance.instanceId];assert.equal(phase.phase,'waiting');
    stepContent(plan,state,entry,.8,world.getColliders());
    assert.equal(phase.phase,'entrySeen');assert.equal(wall.visible,false);
    stepContent(plan,state,{...forward,yaw:forward.yaw+Math.PI},1,world.getColliders());
    assert.equal(phase.phase,'entrySeen');
    const outside=plan.rooms.filter(room=>room.id!==instance.roomId).map(room=>room.id),
      route=pathThroughTiles(world.getTopology(),instance.observation,instance.forwardObservation,outside);
    assert.ok(route);
    const walker={x:instance.observation.x,z:instance.observation.z};
    for(const waypoint of [...route,instance.forwardObservation]) {
      const dx=waypoint.x-walker.x,dz=waypoint.z-walker.z,
        steps=Math.ceil(Math.hypot(dx,dz)/.2);
      for(let n=0;n<steps;n++) {
        movePlayer(walker,dx/steps,dz/steps,world.getColliders());
        stepContent(plan,state,look({...walker,y:1.65},instance.forwardFocus),.025,world.getColliders());
        world.updateStory(state,walker);
      }
    }
    assert.ok(Math.hypot(walker.x-forward.x,walker.z-forward.z)<.1);
    if(phase.phase!=='sealed')stepContent(plan,state,forward,.8,world.getColliders());
    assert.equal(phase.phase,'sealed');world.updateStory(state,instance.forwardObservation);
    assert.equal(wall.visible,true);
    assert.equal(world.getTopology().doors.some(item=>item.id===door.id),false);
    assert.equal(world.getTopology().edges.some(item=>item.id===door.edgeId),false);
    assert.equal(validatePlan(world.getTopology()).valid,true);
    assert.ok(world.getColliders().some(box=>overlaps(door.x,door.z,box)));
    const blocked={x:instance.observation.x,z:instance.observation.z};
    movePlayer(blocked,(door.x-blocked.x)*1.8,(door.z-blocked.z)*1.8,world.getColliders());
    assert.equal(roomIdAt(plan,blocked),instance.roomId);
    assert.ok(pathThroughTiles(world.getTopology(),plan.spawn,plan.exit));
    stepContent(plan,state,confirmation,.6,world.getColliders());
    assert.equal(phase.phase,'confirmed');
    assert.equal(state.cue?.text,'后面省了一扇。往前走吧。');
    state.cue=null;stepContent(plan,state,confirmation,.5,world.getColliders());
    assert.equal(state.cue,null);
    stepStory(plan,state,{x:plan.spawn.x,z:plan.spawn.z,y:1.65,yaw:0,pitch:0},.1,
      {cause:'death',suppressRoutes:true,boxes:world.getColliders()});
    assert.equal(phase.phase,'confirmed');
    world.reset();assert.equal(world.getTopology(),initialTopology);assert.equal(wall.visible,false);
    world.updateStory(state,instance.observation);assert.equal(wall.visible,true);
    world.dispose();assert.equal(scene.children.length,0);
  }
});
