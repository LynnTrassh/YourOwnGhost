import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan } from '../src/planning/generate.js';
import { sealDoorTransaction } from '../src/planning/door-transaction.js';
import { pathThroughTiles, validatePlan } from '../src/planning/validate.js';
import { overlaps } from '../src/collision.js';

test('a disappearing door seals geometry and topology only when every room stays reachable',()=>{
  for(const seed of ['12','58']) {
    const plan=generatePlan(seed,{catEnabled:false,contentIds:[]}),
      originalDoors=plan.doors.map(door=>door.id),
      transaction=plan.doors.map(door=>sealDoorTransaction(plan,door.id)).find(result=>result.accepted);
    assert.ok(transaction);
    assert.deepEqual(plan.doors.map(door=>door.id),originalDoors);
    assert.equal(validatePlan(transaction.plan).valid,true);
    assert.equal(transaction.plan.doors.some(door=>door.id===transaction.doorId),false);
    assert.equal(transaction.plan.edges.some(edge=>edge.id===transaction.edgeId),false);
    const door=plan.doors.find(item=>item.id===transaction.doorId);
    assert.ok(overlaps(door.x,door.z,transaction.gapWall));
    assert.ok(transaction.plan.walls.some(wall=>overlaps(door.x,door.z,wall)));
    assert.ok(pathThroughTiles(transaction.plan,plan.spawn,plan.exit));
  }
  const bridgePlan=generatePlan('42',{catEnabled:false,contentIds:[]});
  assert.equal(bridgePlan.doors.some(door=>sealDoorTransaction(bridgePlan,door.id).accepted),false);
  assert.equal(sealDoorTransaction(bridgePlan,'bedroom').reason,'INELIGIBLE_DOOR');
});
