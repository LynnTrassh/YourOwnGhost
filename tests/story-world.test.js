import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { generateDream } from '../src/planning/dream.js';
import { fitStories } from '../src/planning/story-fit.js';
import { createStoryState, stepStory } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';

function meshCount(scene) {
  let count=0;scene.traverse(object=>{if(object.isMesh) count++;});return count;
}

test('rejected cat reservations produce neither scene markers nor story observations',()=>{
  const p=generatePlan('4'),cat=p.story.cat;
  assert.ok(cat);
  p.obstacles.push({minX:cat.focus.x-2.5,maxX:cat.focus.x+2.5,minZ:cat.focus.z-2.5,maxZ:cat.focus.z+2.5,height:3,kind:'counter',roomId:cat.roomId});
  p.story=fitStories(p);
  assert.equal(p.story.cat,null);
  assert.ok(p.reserved.cat.slots.length>0,'failed fitting retains diagnostic reservation');
  const scene=new THREE.Scene(),world=createWorld(scene,p);
  assert.equal(scene.getObjectByName('story-CAT01'),undefined);
  const count=meshCount(scene);
  const s=createStoryState(),v={...cat.observation,yaw:Math.atan2(cat.focus.x-cat.observation.x,cat.focus.z-cat.observation.z)+Math.PI,pitch:-.15};
  stepStory(p,s,v,2);
  assert.equal(s.catPhase,'unobserved');assert.equal(s.cue,null);assert.deepEqual(s.facts,[]);
  world.dispose();
  const withoutReservation=structuredClone(p);withoutReservation.reserved.cat=null;
  const control=createWorld(scene,withoutReservation);
  assert.equal(meshCount(scene),count,'a rejected reservation must add no rendered objects');
  control.dispose();assert.equal(scene.children.length,0);
});

test('accepted cats reset their pose, release with their layer, and return fresh on restart',()=>{
  const [first,second]=generateDream('12'),scene=new THREE.Scene();
  assert.ok(first.story.cat);assert.equal(second.story.cat,null);
  const world=createWorld(scene,first),group=scene.getObjectByName('story-CAT01');
  assert.equal(group.children.length,9);
  assert.deepEqual(group.children.map(body=>({x:body.position.x,z:body.position.z})),first.story.cat.slots);
  const colliders=world.getColliders();
  world.updateStory({catPhase:'dead'},first.spawn);
  assert.ok(group.children.every(body=>body.rotation.z===Math.PI/2 && body.position.y===.2));
  assert.deepEqual(world.getColliders(),colliders,'story poses do not change navigation');
  world.reset();
  assert.ok(group.children.every(body=>body.rotation.z===0 && body.position.y===0));
  const fur=group.children[0].children.find(child=>child.isMesh).material;
  let disposed=0;fur.addEventListener('dispose',()=>disposed++);
  world.dispose();assert.equal(disposed,1);assert.equal(scene.children.length,0);
  const next=createWorld(scene,second);
  next.updateStory({catPhase:'dead'},second.spawn);
  assert.equal(scene.getObjectByName('story-CAT01'),undefined);
  next.dispose();
  const restarted=createWorld(scene,first),fresh=scene.getObjectByName('story-CAT01');
  assert.notEqual(fresh,group);assert.equal(fresh.children.length,9);
  assert.ok(fresh.children.every(body=>body.rotation.z===0 && body.position.y===0));
  restarted.dispose();assert.equal(scene.children.length,0);
});
