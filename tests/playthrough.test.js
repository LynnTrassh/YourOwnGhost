import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generateDream } from '../src/planning/dream.js';
import { pathThroughTiles } from '../src/planning/validate.js';
import { createState } from '../src/state.js';
import { createWorld } from '../src/world.js';
import { movePlayer } from '../src/collision.js';
import { stepStory } from '../src/story/runtime.js';
import { stepThreat } from '../src/threat.js';
import { requestDeath,requestExit,stepRespawnProtection,stepTransition,commitTransition,canExplore } from '../src/flow.js';
import { createSoundDirector } from '../src/audio/director.js';

test('continuous seed 12 route: cat revisit, false awakening, demonstration, real contact death, recovery and final escape',()=>{
  const plans=generateDream('12'),scene=new THREE.Scene(),sound=createSoundDirector();
  let p=plans[0],s=createState(p),world=createWorld(scene,p),yaw=0,pitch=0;
  const cues=[];
  const view=()=>({...s.player,y:1.65,yaw,pitch});
  const aim=target=>{const dx=target.x-s.player.x,dz=target.z-s.player.z;yaw=Math.atan2(-dx,-dz);pitch=Math.atan2((target.y??1.3)-1.65,Math.hypot(dx,dz));};
  function tick() {
    const dt=.05;
    stepRespawnProtection(s,dt);
    if(canExplore(s)) {
      world.update(dt,s);
      const direction={x:-Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)};
      if(stepThreat(p,s,view(),{enabled:s.player.flashlight,origin:view(),direction,angle:Math.PI/7,distance:15},dt,{boxes:world.getColliders()})) requestDeath(s);
      if(canExplore(s)) stepStory(p,s.story,view(),dt,{boxes:world.getColliders(),suppressRoutes:Boolean(s.threat && s.threat.phase!=='dormant')});
      world.updateThreat(s.threat,s.player);world.updateStory(s.story,s.player);
    }
    const f=sound.step(p,s,view(),dt,{boxes:world.getColliders()});cues.push(...f.events.map(e=>e.kind));
  }
  function walk(target,{watchStatue=false}={}) {
    const route=pathThroughTiles(p,s.player,target);assert.ok(route,'route must use existing walkable cells');
    for(const point of [...route,target]) {
      for(let frame=0;Math.hypot(point.x-s.player.x,point.z-s.player.z)>.005;frame++) {
        assert.ok(frame<100,'collision route must make progress');assert.ok(canExplore(s),'unexpected death on escape route');
        aim(watchStatue?s.threat:{...point,y:1.65});
        const dx=point.x-s.player.x,dz=point.z-s.player.z,d=Math.hypot(dx,dz),step=Math.min(.12,d);
        movePlayer(s.player,dx/d*step,dz/d*step,world.getColliders());tick();
      }
    }
  }
  function standAndOpen() {
    s.player.standing=true;tick();
    walk({x:0,z:-5.5});s.doors.bedroom.open=true;
    for(let i=0;i<20;i++) tick();
  }
  function transition() {
    const action=stepTransition(s,.6);assert.ok(action);
    const next=action.kind==='layer'?plans[1]:p;
    assert.equal(commitTransition(s,action.id,next),true);
    world.dispose();p=next;world=createWorld(scene,p);sound.reset();stepTransition(s,.61);
  }
  standAndOpen();
  const cat=p.story.cat;walk(cat.observation);aim({...cat.focus,y:.55});
  for(let i=0;i<100;i++) tick();
  assert.equal(s.story.catPhase,'observed');assert.ok(cues.includes('cat'));
  walk(p.spawn);assert.equal(s.story.catPhase,'dead');
  walk(cat.observation);aim({...cat.focus,y:.2});for(let i=0;i<30;i++) tick();
  assert.equal(s.story.deadSeen,true);
  walk(p.exit);assert.equal(requestExit(s,p,view(),world.getColliders()),true);transition();
  assert.equal(s.layer,2);assert.equal(s.flow.falseAwakenings,1);assert.equal(p.story.cat,null);
  standAndOpen();walk(p.threat.observation);
  s.player.flashlight=false;for(let i=0;i<30;i++) tick();
  s.player.flashlight=true;aim(s.threat);for(let i=0;i<100;i++) tick();
  assert.equal(s.threat.demoComplete,true);
  const planHash=s.planHash;s.player.flashlight=false;
  for(let i=0;i<400 && !s.flow.transition;i++) tick();
  assert.equal(s.flow.transition?.kind,'death');transition();
  assert.equal(s.planHash,planHash);assert.equal(s.flow.deaths,1);assert.equal(s.flow.falseAwakenings,1);
  assert.equal(s.threat.demoComplete,true);assert.equal(s.player.standing,false);
  standAndOpen();walk(p.threat.observation,{watchStatue:true});
  walk(p.exit,{watchStatue:true});assert.equal(s.threat.phase,'escaped');
  assert.equal(scene.getObjectByName('exit-light').intensity,15);
  assert.equal(requestExit(s,p,view(),world.getColliders()),true);
  const end=stepTransition(s,.6);assert.equal(commitTransition(s,end.id),true);stepTransition(s,.61);
  assert.equal(s.completed,true);assert.equal(s.flow.falseAwakenings,1);
  assert.equal(s.story.consumed.filter(k=>k==='statue.demo').length,1);
  assert.ok(cues.includes('step') && cues.includes('door') && cues.includes('death') && cues.includes('relief'));
  world.dispose();assert.equal(scene.children.length,0);
});
