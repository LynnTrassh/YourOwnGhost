import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generateDream } from '../src/planning/dream.js';
import { createState } from '../src/state.js';
import { createWorld } from '../src/world.js';
import { movePlayer } from '../src/collision.js';
import { pathThroughTiles } from '../src/planning/validate.js';
import { canExplore, requestExit, stepTransition, commitTransition, cancelTransition, transitionOpacity, stepFlowNarration } from '../src/flow.js';
import { stepStory } from '../src/story/runtime.js';

const view=s=>({...s.player,y:s.player.standing?1.65:1.08,yaw:0,pitch:0});
const boxes=p=>[...p.walls,...p.obstacles];
function atExit(s,p) {s.player={...s.player,x:p.exit.x,z:p.exit.z,standing:true};}
test('two deterministic layers change the space outside the same bedroom without repeating CAT01',()=>{
  const bedroom=p=>[p.rooms[0],p.obstacles.filter(b=>b.roomId==='bedroom'),p.walls.filter(b=>b.roomId==='bedroom'),p.doors[0],p.spawn];
  for(let seed=0;seed<20;seed++) {
    const [a,b]=generateDream(String(seed));
    assert.deepEqual(bedroom(a),bedroom(b));
    assert.notDeepEqual([a.cells,a.doors],[b.cells,b.doors]);
    assert.equal(b.story.cat,null);assert.equal(b.reserved.cat,null);
    assert.ok(a.validation.valid && b.validation.valid);
  }
  assert.deepEqual(generateDream('12'),generateDream('12'));
});
test('collision routes lead through one false awakening to a terminal second exit',()=>{
  const plans=generateDream('12'),s=createState(plans[0]),scene=new THREE.Scene();
  for(const p of plans) {
    const world=createWorld(scene,p);
    s.player.standing=true;s.doors.bedroom.open=true;world.update(2,s);
    const route=pathThroughTiles(world.getTopology(),s.player,p.exit);
    assert.ok(route);
    for(const target of route)for(let frame=0;Math.hypot(target.x-s.player.x,target.z-s.player.z)>.001;frame++) {
      assert.ok(frame<100,'open doors and keep making progress');
      for(const door of p.doors)if(!s.doors[door.id]?.open&&Math.hypot(door.x-s.player.x,door.z-s.player.z)<2.2){world.toggleDoor(door.id,s);world.update(1,s);}
      world.update(.05,s);
      const dx=target.x-s.player.x,dz=target.z-s.player.z,d=Math.hypot(dx,dz),step=Math.min(.12,d);
      movePlayer(s.player,dx/d*step,dz/d*step,world.getColliders());
    }
    assert.ok(Math.hypot(s.player.x-p.exit.x,s.player.z-p.exit.z)<.001);
    assert.equal(requestExit(s,p,view(s),world.getColliders()),true);
    assert.equal(requestExit(s,p,view(s),world.getColliders()),false);
    const action=stepTransition(s,.6);
    assert.equal(commitTransition(s,action.id,plans[1]),true);
    assert.equal(commitTransition(s,action.id,plans[1]),false);
    stepTransition(s,.61);world.dispose();assert.equal(scene.children.length,0);
  }
  assert.equal(s.layer,2);assert.equal(s.flow.falseAwakenings,1);assert.equal(s.flow.history.length,2);
  assert.equal(s.flow.phase,'ending');assert.equal(s.completed,true);assert.equal(canExplore(s),false);
  assert.equal(requestExit(s,plans[1],view(s),boxes(plans[1])),false);
});
test('transition freezes on pause, rejects stale commits, and archives facts without leaking cat state',()=>{
  const [a,b]=generateDream('12'),s=createState(a);
  s.story.catPhase='dead';s.story.facts.push('cat.observed','cat.normalLeave');
  s.story.consumed.push('catSeen','suggest','right');s.story.behaviorCount=1;
  s.story.cue={kind:'right',text:'old',roomId:a.exit.roomId,remaining:2};
  atExit(s,a);requestExit(s,a,view(s),boxes(a));assert.equal(s.story.cue,null);
  stepTransition(s,.3);assert.equal(transitionOpacity(s),.5);
  const paused=structuredClone(s);stepTransition(s,100,false);assert.deepEqual(s,paused);
  assert.equal(commitTransition(s,s.flow.transition.id,b),false,'cannot commit before black');
  const action=stepTransition(s,.3);
  assert.equal(commitTransition(s,action.id+1,b),false);
  assert.equal(commitTransition(s,action.id,b),true);
  assert.equal(s.story.catPhase,'unobserved');assert.deepEqual(s.story.facts,[]);
  assert.equal(s.flow.history[0].story.catPhase,'dead');
  assert.equal(s.flow.history[0].story.facts.length,2);
  assert.deepEqual(s.story.consumed,['catSeen','suggest','right']);assert.equal(s.story.behaviorCount,1);
  assert.equal(s.player.standing,false);assert.equal(s.doors.bedroom.open,false);
  const after=structuredClone(s);stepTransition(s,100,false);assert.deepEqual(s,after);
  stepTransition(s,.61);assert.equal(transitionOpacity(s),0);
  const fresh=createState(a);assert.equal(fresh.layer,1);assert.deepEqual(fresh.flow.history,[]);assert.deepEqual(fresh.story.consumed,[]);
});
test('exit interactions require the real room, proximity and clear sight; failed transition can retry',()=>{
  const [p,next]=generateDream('12'),s=createState(p);
  assert.equal(requestExit(s,p,view(s),boxes(p)),false);
  atExit(s,p);
  assert.equal(requestExit(s,p,view(s),[{minX:p.exit.x-.1,maxX:p.exit.x+.1,minZ:p.exit.z-.1,maxZ:p.exit.z+.1,height:1}]),false);
  assert.equal(requestExit(s,p,view(s),boxes(p)),true);const id=s.flow.transition.id;
  stepTransition(s,.6);assert.equal(commitTransition(s,id,{validation:{valid:false}}),false);
  assert.equal(cancelTransition(s),true);assert.equal(s.layer,1);assert.equal(canExplore(s),true);
  requestExit(s,p,view(s),boxes(p));stepTransition(s,.6);
  assert.equal(commitTransition(s,id,next),false);assert.equal(commitTransition(s,s.flow.transition.id,next),true);
});
test('flow subtitles require visible context, share the cue slot, and do not repeat after restart of observation',()=>{
  const [p,next]=generateDream('12'),s=createState(p);
  stepFlowNarration(s,p,{...view(s),yaw:Math.PI},1,boxes(p));assert.equal(s.story.cue,null);
  stepFlowNarration(s,p,view(s),.51,boxes(p));assert.equal(s.story.cue.key,'flow.wake');
  stepStory(p,s.story,view(s),5);stepFlowNarration(s,p,view(s),1,boxes(p));assert.equal(s.story.cue,null);
  atExit(s,p);requestExit(s,p,view(s),boxes(p));const action=stepTransition(s,.6);commitTransition(s,action.id,next);stepTransition(s,.61);
  stepFlowNarration(s,next,view(s),.51,boxes(next));assert.equal(s.story.cue.key,'flow.falseWake');
  assert.equal(s.story.consumed.filter(k=>k==='flow.wake').length,1);
});
