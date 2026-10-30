import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generateDream } from '../src/planning/dream.js';
import { createState } from '../src/state.js';
import { createWorld } from '../src/world.js';
import { stepStory } from '../src/story/runtime.js';
import { requestDeath, requestExit, stepTransition, commitTransition, stepRespawnProtection, stepFlowNarration, RESPAWN_GRACE } from '../src/flow.js';

const view=s=>({...s.player,y:1.65,yaw:0,pitch:0});
const boxes=p=>[...p.walls,...p.obstacles];
function die(s,p) {
  s.player.standing=true;
  assert.equal(requestDeath(s),true);
  const action=stepTransition(s,.6);
  assert.equal(action.kind,'death');
  assert.equal(commitTransition(s,action.id,p),true);
  stepTransition(s,.6);
}
function enterSecond(s,plans) {
  const p=plans[0];s.player={...s.player,x:p.exit.x,z:p.exit.z,standing:true};
  assert.equal(requestExit(s,p,view(s),boxes(p)),true);
  const action=stepTransition(s,.6);assert.equal(commitTransition(s,action.id,plans[1]),true);stepTransition(s,.6);
}

test('ordinary death preserves each cat phase, facts, consumption and same-layer geometry',()=>{
  const [p]=generateDream('12');assert.ok(p.story.cat);
  const original=JSON.stringify(p);
  for(const catPhase of ['unobserved','observed','dead']) {
    const s=createState(p);
    Object.assign(s.story,{catPhase,deadSeen:catPhase==='dead',consumed:['catSeen','right'],facts:['fixture.fact'],behaviorCount:1,
      cue:{kind:'catSeen',text:'stale',remaining:2},previous:{...p.story.cat.observation,roomId:p.story.cat.roomId},
      exposure:.7,entryDoorId:'old',route:{roomId:p.story.cat.roomId},routeFinished:true});
    s.player={x:p.story.cat.focus.x,z:p.story.cat.focus.z,standing:true,flashlight:false};
    die(s,p);
    assert.equal(s.layer,1);assert.equal(s.planHash,p.planHash);assert.equal(s.flow.falseAwakenings,0);
    assert.equal(s.flow.history.length,0);assert.equal(s.flow.deaths,1);
    assert.deepEqual(s.player,{x:p.spawn.x,z:p.spawn.z,standing:false,flashlight:true});
  }
  assert.equal(JSON.stringify(p),original);
});

test('death never counts as normal departure and rebuilding retains dead cat poses',()=>{
  const [p]=generateDream('12');
  for(const phase of ['observed','dead']) {
    const s=createState(p);s.story.catPhase=phase;s.story.previous={...p.story.cat.observation,roomId:p.story.cat.roomId};
    s.story.facts=['cat.observed'];s.story.consumed=['catSeen'];s.story.behaviorCount=1;
    die(s,p);
    assert.equal(s.story.catPhase,phase);assert.deepEqual(s.story.facts,['cat.observed']);
    assert.deepEqual(s.story.consumed,['catSeen']);assert.equal(s.story.behaviorCount,1);
    for(const key of ['cue','previous','entryDoorId','route']) assert.equal(s.story[key],null);
    assert.equal(s.story.exposure,0);assert.equal(s.story.routeFinished,false);
    stepStory(p,s.story,view(s),.1);
    assert.equal(s.story.catPhase,phase);assert.ok(!s.story.facts.includes('cat.normalLeave'));
    const scene=new THREE.Scene(),world=createWorld(scene,p);world.updateStory(s.story,s.player);
    const cats=scene.getObjectByName('story-CAT01').children;
    assert.ok(cats.every(cat=>cat.rotation.z===(phase==='dead'?Math.PI/2:0)));
    world.dispose();
  }
});

test('death supersedes an uncommitted exit and rejects duplicate or stale transactions',()=>{
  const plans=generateDream('12'),p=plans[0],s=createState(p);
  s.player={...s.player,x:p.exit.x,z:p.exit.z,standing:true};
  requestExit(s,p,view(s),boxes(p));const oldId=s.flow.transition.id;
  assert.equal(requestDeath(s),true);const id=s.flow.transition.id;
  assert.equal(requestDeath(s),false);
  assert.equal(commitTransition(s,id,p),false,'cannot commit before blackout');
  const before=structuredClone(s);stepTransition(s,5,false);assert.deepEqual(s,before);
  stepTransition(s,.6);
  assert.equal(commitTransition(s,oldId,plans[1]),false);
  assert.equal(commitTransition(s,id,plans[1]),false,'death cannot switch map');
  assert.equal(commitTransition(s,id,p),true);assert.equal(commitTransition(s,id,p),false);
  assert.equal(requestDeath(s),false);assert.equal(s.flow.deaths,1);
});

test('respawn protection starts on standing, pauses, and first death narration is consumed once',()=>{
  const [p]=generateDream('12'),s=createState(p);
  die(s,p);assert.equal(s.flow.graceRemaining,RESPAWN_GRACE);
  stepRespawnProtection(s,100);assert.equal(s.flow.graceRemaining,RESPAWN_GRACE);
  stepFlowNarration(s,p,view(s),1,boxes(p));assert.equal(s.story.cue,null,'death line waits for standing');
  s.player.standing=true;stepFlowNarration(s,p,view(s),.01,boxes(p));assert.equal(s.story.cue.key,'flow.death');
  stepRespawnProtection(s,100,false);assert.equal(s.flow.graceRemaining,RESPAWN_GRACE);
  stepRespawnProtection(s,1);assert.equal(s.flow.graceRemaining,RESPAWN_GRACE-1);assert.equal(requestDeath(s),false);
  stepRespawnProtection(s,RESPAWN_GRACE);assert.equal(s.flow.graceRemaining,0);
  die(s,p);s.player.standing=true;stepFlowNarration(s,p,view(s),1,boxes(p));
  assert.equal(s.story.cue,null);assert.equal(s.story.consumed.filter(k=>k==='flow.death').length,1);
});

test('second-layer death preserves the layer and history; restart clears failures and protection',()=>{
  const plans=generateDream('12'),s=createState(plans[0]);enterSecond(s,plans);
  const history=structuredClone(s.flow.history);die(s,plans[1]);
  assert.equal(s.layer,2);assert.equal(s.planHash,plans[1].planHash);
  assert.equal(s.flow.falseAwakenings,1);assert.deepEqual(s.flow.history,history);
  assert.equal(s.completed,false);assert.equal(s.flow.wakeReason,'death');
  s.player.standing=true;stepRespawnProtection(s,10);
  s.player={...s.player,x:plans[1].exit.x,z:plans[1].exit.z};
  requestExit(s,plans[1],view(s),boxes(plans[1]));const action=stepTransition(s,.6);commitTransition(s,action.id);
  assert.equal(s.completed,true);assert.equal(requestDeath(s),false);
  const fresh=createState(plans[0]);assert.equal(fresh.flow.deaths,0);assert.equal(fresh.flow.graceRemaining,0);
  assert.equal(fresh.flow.wakeReason,'initial');assert.deepEqual(fresh.story.consumed,[]);
});
