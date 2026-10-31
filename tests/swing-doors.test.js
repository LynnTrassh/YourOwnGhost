import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDoorStates,doorLeafBoxes} from '../src/doors.js';
import {createDoorSystem} from '../src/rendering/doors.js';
import {targetsDoor} from '../src/door-interaction.js';
import {overlaps,movePlayer} from '../src/collision.js';

const make=()=>{
  const plan={doors:[{id:'bedroom',x:0,z:0,axis:'z',closed:true},{id:'other',x:8,z:0,axis:'x',closed:false}],walls:[],obstacles:[]};
  const root=new THREE.Group(),resources=new Set(),system=createDoorSystem(plan,root,resources);
  const state={doors:createDoorStates(plan),player:{x:0,z:3,standing:true},flow:{},completed:false};
  const dispose=()=>{for(const resource of resources)resource.dispose();};
  return {plan,root,resources,system,state,dispose};
};
test('every portal has one physical leaf; both orientations rotate around a fixed hinge',()=>{
  const {system,state,dispose}=make();assert.equal(system.meshes.length,2);
  const bed=system.records.get('bedroom'),hinge=bed.pivot.position.clone();
  let p={x:0,z:1};movePlayer(p,0,-2,system.colliders());assert.ok(p.z>0);
  system.toggle('bedroom',state);system.update(1,state);
  assert.equal(bed.angle,Math.PI/2);assert.deepEqual(bed.pivot.position,hinge);assert.equal(bed.assembly.position.y,1.2);
  p={x:0,z:1};movePlayer(p,0,-2,system.colliders());assert.ok(p.z<0);
  for(let i=0;i<20;i++)system.update(1,state);
  assert.equal(state.doors.bedroom.open,true);assert.equal(bed.angle,Math.PI/2);
  system.toggle('bedroom',state);system.update(1,state);assert.equal(bed.angle,0);
  system.toggle('other',state);system.update(1,state);assert.equal(system.records.get('other').angle,0);dispose();
});
test('open and closed hidden-art proxies remain targetable from either side, walls occlude',()=>{
  const {system,state,dispose}=make(),mesh=system.records.get('bedroom').mesh;
  const world={solids:[],getDoorTargets:()=>system.targets()};
  system.update(0,state);mesh.visible=false;
  for(const sign of [-1,1]) {
    const ray=new THREE.Raycaster(new THREE.Vector3(0,1.2,sign),new THREE.Vector3(0,0,-sign),0,2.25);
    assert.equal(targetsDoor(ray,world,state),'bedroom');
    ray.far=.2;assert.equal(targetsDoor(ray,world,state),null);
  }
  system.toggle('bedroom',state);system.update(1,state);
  const center=mesh.getWorldPosition(new THREE.Vector3());
  const ray=new THREE.Raycaster(center.clone().add(new THREE.Vector3(1,0,0)),new THREE.Vector3(-1,0,0),0,2.25);
  assert.equal(targetsDoor(ray,world,state),'bedroom');
  const wall=new THREE.Mesh(new THREE.BoxGeometry(.1,3,3));wall.position.copy(center).add(new THREE.Vector3(.5,0,0));wall.updateMatrixWorld();world.solids.push(wall);
  assert.equal(targetsDoor(ray,world,state),null);wall.geometry.dispose();wall.material.dispose();
  system.setSealed(['bedroom']);assert.ok(!system.targets().includes(mesh));assert.equal(system.records.get('bedroom').pivot.visible,false);dispose();
});
test('closing stops before the player and resumes only after the doorway clears',()=>{
  const {system,state,dispose}=make(),record=system.records.get('bedroom');
  system.toggle('bedroom',state);system.update(1,state);
  state.player={x:0,z:0,standing:true};system.toggle('bedroom',state);system.update(1,state);
  assert.ok(record.angle>0);assert.ok(!system.colliders().some(b=>overlaps(0,0,b)));
  state.player.z=3;system.update(1,state);assert.equal(record.angle,0);dispose();
});
test('swing geometry remains finite and physically present throughout the animation',()=>{
  const {system,dispose}=make(),pose=system.records.get('bedroom').pose;
  for(let i=0;i<=16;i++)for(const b of doorLeafBoxes(pose,i*Math.PI/32)){
    assert.ok([b.minX,b.maxX,b.minZ,b.maxZ].every(Number.isFinite));assert.ok(b.maxX>b.minX&&b.maxZ>b.minZ);
  }dispose();
});
