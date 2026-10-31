import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan, pathThroughTiles } from '../src/planning/validate.js';
import { createState } from '../src/state.js';
import { createWorld } from '../src/world.js';
import { movePlayer } from '../src/collision.js';
import { stepChase, canCloseChaseDoor, closeChaseDoor } from '../src/chase.js';
import { requestDeath, stepTransition, commitTransition } from '../src/flow.js';
import { roomIdAt, sightClear } from '../src/story/spatial.js';
import { contentEligibility } from '../src/planning/content-catalog.js';

const make=()=>generatePlan('42',{catEnabled:false,chaseEnabled:true,contentIds:[]});
const boxes=plan=>[...plan.walls,...plan.obstacles];

test('B13–B16 fits only as one connected, concealed, dual-route unit',()=>{
  for(const id of ['B13','B14','B15','B16'])
    assert.equal(contentEligibility(id).reason,'PREVIEW_ONLY');
  const plan=make(),chase=plan.chase;
  assert.ok(chase);assert.equal(validatePlan(plan).valid,true);
  assert.deepEqual(make().chase,chase);
  assert.deepEqual(Object.keys(chase.stages),['B13','B14','B15','B16']);
  assert.equal(chase.bypassRoutes.length,2);
  const inner=route=>route.slice(1,-1).map(point=>point.join(','));
  assert.ok(inner(chase.bypassRoutes[0]).every(key=>!inner(chase.bypassRoutes[1]).includes(key)));
  assert.equal(roomIdAt(plan,chase.hidingPoint),chase.hideRoomId);
  const approachDoor=plan.doors.find(d=>d.id===chase.routeDoorIds[3]);
  const approachCell=approachDoor.cells.find(([x,z])=>
    plan.cells.find(c=>c.x===x&&c.z===z)?.roomId===chase.stages.B16);
  assert.equal(sightClear({x:approachCell[0]*plan.cellSize,y:1.65,z:approachCell[1]*plan.cellSize},
    {...chase.hidingPoint,y:1.65},boxes(plan)),false);
  assert.ok(pathThroughTiles(plan,chase.source,chase.observation));
  assert.ok(pathThroughTiles(plan,chase.observation,plan.exit));
});

test('side impact gives a reaction window and pause freezes the warning',()=>{
  const plan=make(),state=createState(plan);
  state.player={...plan.chase.observation,standing:true,flashlight:true};
  assert.equal(stepChase(plan,state,.05,{boxes:boxes(plan)}),false);
  assert.equal(state.threat.phase,'warning');
  const remaining=state.threat.warningRemaining;
  stepChase(plan,state,1,{active:false,boxes:boxes(plan)});
  assert.equal(state.threat.warningRemaining,remaining);
  for(let i=0;i<25;i++)stepChase(plan,state,.05,{boxes:boxes(plan)});
  assert.equal(state.threat.phase,'pursuing');
  assert.ok(state.story.consumed.includes('B13.charge'));
  assert.ok(Math.hypot(state.threat.x-state.player.x,state.threat.z-state.player.z)>2);
});

test('B14 closes its own door briefly, leaves the forward exit open, and death restores it',()=>{
  const plan=make(),state=createState(plan),world=createWorld(new THREE.Scene(),plan);
  const chase=plan.chase,door=plan.doors.find(d=>d.id===chase.retreatDoorId);
  const tile=door.cells.find(([x,z])=>plan.cells.find(c=>c.x===x&&c.z===z)?.roomId===chase.stages.B14);
  const cx=tile[0]*plan.cellSize,cz=tile[1]*plan.cellSize;
  const dx=Math.sign(cx-door.x),dz=Math.sign(cz-door.z);
  state.player={x:door.x+dx*1.9,z:door.z+dz*1.9,standing:true,flashlight:true};
  state.threat.stage=2;state.threat.phase='pursuing';
  assert.equal(canCloseChaseDoor(plan,state),true);
  assert.equal(closeChaseDoor(plan,state),true);
  world.update(.6,state);
  const closedLeaf=world.getColliders().filter(b=>b.doorId===chase.retreatDoorId);
  assert.ok(closedLeaf.some(b=>door.x>=b.minX&&door.x<=b.maxX&&door.z>=b.minZ&&door.z<=b.maxZ));
  assert.equal(canCloseChaseDoor(plan,state),false);
  const forward=plan.doors.find(d=>d.id===chase.routeDoorIds[2]);
  assert.ok(pathThroughTiles(plan,{x:forward.x,z:forward.z},plan.exit));
  const before={x:state.threat.x,z:state.threat.z};
  stepChase(plan,state,.05,{boxes:world.getColliders()});
  assert.deepEqual({x:state.threat.x,z:state.threat.z},before);
  for(let i=0;i<50;i++) {stepChase(plan,state,.05,{boxes:world.getColliders()});world.update(.05,state);}
  assert.equal(state.threat.doorRemaining,0);
  for(let i=0;i<15;i++)world.update(.05,state);
  assert.ok(!world.getColliders().filter(b=>b.doorId===chase.retreatDoorId)
    .some(b=>door.x>=b.minX&&door.x<=b.maxX&&door.z>=b.minZ&&door.z<=b.maxZ));
  assert.equal(requestDeath(state),true);
  const action=stepTransition(state,.6);
  assert.equal(commitTransition(state,action.id,plan),true);
  world.update(0,state);
  assert.equal(state.threat.stage,0);
  assert.equal(state.threat.doorRemaining,0);
  assert.ok(!state.story.cue);
  world.dispose();
});

test('B16 hides by occlusion, investigator passes, then a real sightline retriggers',()=>{
  const plan=make(),chase=plan.chase,state=createState(plan),t=state.threat;
  const entry=plan.doors.find(d=>d.id===chase.routeDoorIds[3]);
  const cell=entry.cells.find(([x,z])=>plan.cells.find(c=>c.x===x&&c.z===z)?.roomId===chase.stages.B16);
  t.x=cell[0]*plan.cellSize;t.z=cell[1]*plan.cellSize;
  t.phase='searching';t.stage=4;
  state.player={...chase.hidingPoint,standing:true,flashlight:true};
  for(let i=0;i<220&&t.phase!=='escaped';i++)stepChase(plan,state,.05,{boxes:boxes(plan)});
  assert.equal(t.phase,'escaped');
  assert.equal(t.passed,true);
  assert.ok(state.story.consumed.includes('B16.passed'));
  const next=plan.doors.find(d=>d.id===chase.routeDoorIds[4]);
  state.player={x:next.x,z:next.z,standing:true,flashlight:true};
  stepChase(plan,state,.05,{boxes:boxes(plan)});
  assert.equal(t.phase,'pursuing');
});

test('the player can run the generated four-room route into hiding without teleporting',()=>{
  for(const seed of ['42','70']) {
    const plan=generatePlan(seed,{catEnabled:false,chaseEnabled:true,contentIds:[]});
    const state=createState(plan),world=createWorld(new THREE.Scene(),plan);
    state.player={...plan.chase.observation,standing:true,flashlight:true};
    const route=pathThroughTiles(world.getTopology(),state.player,plan.chase.hidingPoint);
    assert.ok(route&&route.length>6);
    let waypoint=1,lethal=false;
    const seen=new Set();
    for(let frame=0;frame<850&&waypoint<route.length;frame++) {
      const target=route[waypoint],dx=target.x-state.player.x,dz=target.z-state.player.z;
      const distance=Math.hypot(dx,dz);
      if(distance<.08){waypoint++;continue;}
      const currentRoom=roomIdAt(plan,state.player),nextRoom=route.slice(waypoint).map(point=>roomIdAt(plan,point)).find(id=>id!==currentRoom);
      const nextEdge=plan.edges.find(edge=>[edge.a,edge.b].includes(currentRoom)&&[edge.a,edge.b].includes(nextRoom));
      for(const door of plan.doors)if(door.edgeId===nextEdge?.id&&!state.doors[door.id]?.open&&Math.hypot(door.x-state.player.x,door.z-state.player.z)<2.2){if(world.toggleDoor(door.id,state))for(let wait=0;wait<13;wait++){world.update(.05,state);lethal ||= stepChase(world.getTopology(),state,.05,{boxes:world.getColliders()});}}
      world.update(.05,state);
      movePlayer(state.player,dx/distance*Math.min(distance,.12),dz/distance*Math.min(distance,.12),world.getColliders());
      const room=roomIdAt(plan,state.player);if(room)seen.add(room);
      lethal=stepChase(world.getTopology(),state,.05,{boxes:world.getColliders()});
      if(lethal)break;
    }
    assert.equal(lethal,false,`${seed}: reached by the investigator before the hiding room`);
    assert.equal(roomIdAt(plan,state.player),plan.chase.hideRoomId,`${seed}: failed to enter hide room ${JSON.stringify({player:state.player,target:route[waypoint],doors:plan.doors.filter(d=>Math.hypot(d.x-state.player.x,d.z-state.player.z)<3).map(d=>({id:d.id,x:d.x,z:d.z,state:state.doors[d.id],prompt:world.doorPrompt(d.id,state)}))})}`);
    assert.ok(Object.values(plan.chase.stages).every(room=>seen.has(room)),`${seed}: stage not crossed`);
    assert.equal(state.threat.stage,4);
    world.dispose();
  }
});
