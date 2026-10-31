import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDream } from '../src/planning/dream.js';
import { acousticDistance, audibleWorldNoise, createHearingMemory, createWorldNoise,
  stepHearingMemory, arriveAtLastSound, createHearingInvestigator,
  stepHearingInvestigator } from '../src/threat-hearing.js';
import { resetHearingInvestigator } from '../src/threat-hearing.js';

const plan=generateDream('42')[0];
const room=plan.rooms.find(r=>r.id!=='bedroom');
const at={x:room.center[0]*plan.cellSize,z:room.center[1]*plan.cellSize};

test('only actual located world events can become sound targets',()=>{
  assert.equal(createWorldNoise(plan,{id:'n',kind:'narration',position:at}),null);
  assert.equal(createWorldNoise(plan,{id:'n',kind:'step',position:{x:999,z:999}}),null);
  const noise=createWorldNoise(plan,{id:'step-1',kind:'step',position:at});
  assert.equal(noise.roomId,room.id);
  assert.deepEqual(noise.position,at);
});

test('sound traverses connected rooms but not beyond its door and distance budget',()=>{
  const noise=createWorldNoise(plan,{id:'step-1',kind:'step',position:at});
  assert.equal(acousticDistance(plan,room.id,room.id),0);
  assert.equal(audibleWorldNoise(plan,at,noise),true);
  assert.equal(audibleWorldNoise(plan,{...at,x:at.x+1},noise,{maxDistance:.5}),false);
  assert.equal(audibleWorldNoise(plan,at,noise,{maxDoors:-1}),false);
  const isolated={...plan,edges:[]};
  const bedroom={...plan.spawn};
  assert.equal(acousticDistance(isolated,'bedroom',room.id),Infinity);
  assert.equal(audibleWorldNoise(isolated,bedroom,noise),false);
  const door=plan.doors.find(item=>item.id==='bedroom');
  const adjacent=plan.edges.find(edge=>edge.id===door.edgeId);
  const adjacentRoom=adjacent.a==='bedroom'?adjacent.b:adjacent.a;
  const adjacentTile=door.cells.find(([x,z])=>plan.cells.find(cell=>cell.x===x&&cell.z===z).roomId===adjacentRoom);
  const adjacentPosition={x:adjacentTile[0]*plan.cellSize,z:adjacentTile[1]*plan.cellSize};
  const nearby=createWorldNoise(plan,{id:'door-1',kind:'door',position:adjacentPosition,level:4});
  assert.equal(acousticDistance(plan,'bedroom',adjacentRoom),1);
  assert.equal(acousticDistance(plan,'bedroom',adjacentRoom,{closedDoorIds:['bedroom']}),3);
  assert.equal(audibleWorldNoise(plan,bedroom,nearby),true);
  assert.equal(audibleWorldNoise(plan,bedroom,nearby,{closedDoorIds:['bedroom']}),false);
});

test('heard event fixes last source, repeat and silence cannot track a moving player',()=>{
  const noise=createWorldNoise(plan,{id:'step-1',kind:'step',position:at});
  const memory=createHearingMemory();
  stepHearingMemory(plan,memory,at,[noise],.05);
  assert.equal(memory.phase,'investigating');
  assert.deepEqual(memory.lastSound,{...at,roomId:room.id,eventId:'step-1'});
  const newerListener={...at,x:at.x+1};
  stepHearingMemory(plan,memory,newerListener,[noise],.05);
  assert.equal(memory.lastSound.x,at.x);
  arriveAtLastSound(memory);
  stepHearingMemory(plan,memory,newerListener,[],.05,{active:false});
  assert.equal(memory.searchRemaining,4);
  for(let i=0;i<80;i++)stepHearingMemory(plan,memory,newerListener,[],.05);
  assert.equal(memory.phase,'idle');
  assert.equal(memory.lastSound.x,at.x);
});

test('investigator follows the event source through a real doorway, then searches',()=>{
  const door=plan.doors.find(item=>item.id==='bedroom');
  const outer=door.cells.find(([x,z])=>plan.cells.find(cell=>cell.x===x&&cell.z===z).roomId!=='bedroom');
  const target={x:outer[0]*plan.cellSize,z:outer[1]*plan.cellSize};
  const noise=createWorldNoise(plan,{id:'door-1',kind:'impact',position:target,level:10});
  const investigator=createHearingInvestigator(plan.spawn);
  const starting=Math.hypot(investigator.x-target.x,investigator.z-target.z);
  for(let i=0;i<600&&investigator.memory.phase!=='searching';i++)
    stepHearingInvestigator(plan,investigator,i===0?[noise]:[],.05);
  assert.equal(investigator.memory.phase,'searching');
  assert.ok(Math.hypot(investigator.x-target.x,investigator.z-target.z)<.05);
  assert.ok(starting>1);
  const after={x:investigator.x,z:investigator.z};
  for(let i=0;i<100;i++)stepHearingInvestigator(plan,investigator,[],.05,{active:false});
  assert.deepEqual({x:investigator.x,z:investigator.z},after);
  assert.equal(investigator.memory.phase,'searching');
  resetHearingInvestigator(investigator,plan.spawn);
  assert.deepEqual({x:investigator.x,z:investigator.z},{x:plan.spawn.x,z:plan.spawn.z});
  assert.equal(investigator.memory.phase,'idle');
  assert.equal(investigator.memory.lastSound,null);
  assert.equal(investigator.path.length,0);
});
