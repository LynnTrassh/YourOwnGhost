import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generateDream } from '../src/planning/dream.js';
import { validatePlan, pathThroughTiles } from '../src/planning/validate.js';
import { contentEligibility } from '../src/planning/content-catalog.js';
import { createStoryState, stepContent } from '../src/story/runtime.js';
import { createWorld } from '../src/world.js';

const look=(from,to)=>{
  const dx=to.x-from.x,dz=to.z-from.z,dy=(to.y??1.65)-(from.y??1.65);
  return {...from,y:from.y??1.65,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};
};

test('RI02 requires a confirmed cat or flower and keeps other group scenes apart',()=>{
  assert.equal(contentEligibility('RI02').reason,'PREFERENCE_UNCONFIRMED');
  for(const likedObject of ['cat','flower']) {
    const dream=generateDream('12',{catEnabled:likedObject==='cat',preferences:[`like.${likedObject}`]});
    const plan=dream.find(layer=>layer.content.instances.some(item=>item.definitionId==='RI02'));
    assert.ok(plan);assert.equal(validatePlan(plan).valid,true);
    const instance=plan.content.instances.find(item=>item.definitionId==='RI02');
    assert.ok(pathThroughTiles(plan,plan.spawn,instance.observation));
    assert.equal(instance.likedObject,likedObject);
    assert.ok(plan.doors.some(door=>door.id===instance.entryDoorId));
    const groups=[plan.story.cat?.roomId,...plan.content.instances.filter(item=>['RI01','B06'].includes(item.definitionId)).map(item=>item.roomId)].filter(Boolean);
    assert.ok(!plan.edges.some(edge=>[edge.a,edge.b].includes(instance.roomId)
      &&[edge.a,edge.b].some(roomId=>groups.includes(roomId))));
    const scene=new THREE.Scene(),world=createWorld(scene,plan);
    const liked=scene.getObjectByName(`story-${instance.instanceId}-liked`);
    assert.ok(liked);assert.ok(liked.children.length>=5);world.dispose();
    const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles];
    stepContent(plan,state,look(instance.observation,instance.focus),.5,boxes);
    assert.equal(state.instances[instance.instanceId].phase,'waiting');
    stepContent(plan,state,look(instance.observation,instance.focus),.5,boxes);
    assert.equal(state.instances[instance.instanceId].phase,'observed');
    assert.equal(state.cue?.text,'你喜欢的，大家也该喜欢嘛。');
    assert.ok(state.facts.includes(`${instance.instanceId}.worshipSeen`));
    const invalid=structuredClone(plan);invalid.content.preferences=[];
    assert.ok(validatePlan(invalid).errors.includes('UNCONFIRMED_CONTENT_PREFERENCE:RI02'));
    const wrong=structuredClone(plan);
    wrong.content.instances.find(item=>item.definitionId==='RI02').likedObject=likedObject==='cat'?'flower':'cat';
    assert.ok(validatePlan(wrong).errors.includes('WRONG_LIKED_OBJECT:RI02'));
  }
  const skipped=generateDream('12',{catEnabled:false});
  assert.ok(skipped.every(plan=>!plan.content.instances.some(item=>item.definitionId==='RI02')));
});
