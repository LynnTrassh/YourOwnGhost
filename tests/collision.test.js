import test from 'node:test';
import assert from 'node:assert/strict';
import { movePlayer, overlaps } from '../src/collision.js';
import { createState } from '../src/state.js';

test('large movements cannot tunnel through thin walls', () => {
  const player = { x: 0, z: 2 };
  movePlayer(player, 0, -6, [{ minX: -4, maxX: 4, minZ: -.1, maxZ: .1 }]);
  assert.ok(player.z >= .34 - 1e-8);
});
test('diagonal movement slides along a wall without penetrating', () => {
  const wall = { minX: 1, maxX: 1.1, minZ: -5, maxZ: 5 };
  const player = { x: 0, z: 0 };
  movePlayer(player, 2, -2, [wall]);
  assert.equal(overlaps(player.x, player.z, wall), false);
  assert.ok(Math.abs(player.z + 2) < 1e-8);
});
test('closed doorway blocks travel and open doorway permits it', () => {
  const door = { minX: -.8, maxX: .8, minZ: -4.1, maxZ: -3.9 };
  const player = { x: 0, z: -3 };
  movePlayer(player, 0, -2, [door]);
  assert.ok(player.z > -3.9);
  movePlayer(player, 0, -2, []);
  assert.ok(player.z < -4.1);
});
test('new games have independent world state', () => {
  const first = createState(); first.doors.bedroom.open = true;
  first.player.standing = true;
  const second = createState();
  assert.equal(second.doors.bedroom.open, false);
  assert.equal(second.player.standing, false);
});

test('actual scene supports bedroom to living-room travel after door opens', async () => {
  const THREE = await import('three');
  const { createWorld } = await import('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const state = createState();
  assert.equal(world.getColliders().some(box => overlaps(state.player.x, state.player.z, box)), false);
  state.player.x = 0;
  movePlayer(state.player, 0, -9, world.getColliders());
  assert.ok(state.player.z > -3.9, 'closed door stops player');
  state.doors.bedroom.open = true;
  for (let i = 0; i < 60; i++) world.update(1 / 60, state);
  movePlayer(state.player, 0, -4, world.getColliders());
  assert.ok(state.player.z < -6, 'open door permits entry into living room');
  movePlayer(state.player, 0, 8, world.getColliders());
  assert.ok(state.player.z > 0, 'return path remains open');
  world.reset();
  movePlayer(state.player, 0, -8, world.getColliders());
  assert.ok(state.player.z > -3.9, 'reset restores closed-door collision');
});
