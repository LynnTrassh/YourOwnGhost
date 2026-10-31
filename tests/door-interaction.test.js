import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { targetsBedroomDoor } from '../src/door-interaction.js';

test('art replacement preserves door interaction, distance and wall occlusion', () => {
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, .12));
  door.position.z = -1;
  door.updateMatrixWorld();
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), 0, 2);
  const state = {player: {standing: true}, doors: {bedroom: {open: false}}};
  const world = {door, solids: []};
  assert.equal(targetsBedroomDoor(ray, world, state), true);
  door.visible = false; // createInteriorModelLoader hides fallback on successful GLB load.
  assert.equal(targetsBedroomDoor(ray, world, state), true);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 3, .1));
  wall.position.z = -.5;
  wall.updateMatrixWorld();
  world.solids.push(wall);
  assert.equal(targetsBedroomDoor(ray, world, state), false);
  world.solids.length = 0;
  ray.far = .4;
  assert.equal(targetsBedroomDoor(ray, world, state), false);
  ray.far = 2;
  state.player.standing = false;
  assert.equal(targetsBedroomDoor(ray, world, state), false);
  state.player.standing = true;
  state.doors.bedroom.open = true;
  assert.equal(targetsBedroomDoor(ray, world, state), false);
  door.geometry.dispose(); wall.geometry.dispose();
  door.material.dispose(); wall.material.dispose();
});
