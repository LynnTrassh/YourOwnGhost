import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { generateDream } from '../src/planning/dream.js';
import { fitStatue } from '../src/planning/statue-fit.js';
import { pathThroughTiles } from '../src/planning/validate.js';
import { createState } from '../src/state.js';
import { createWorld } from '../src/world.js';
import { overlaps } from '../src/collision.js';
import { stepThreat, statueIlluminated, STATUE_RULES } from '../src/threat.js';
import { roomIdAt, sightClear } from '../src/story/spatial.js';
import { createSoundDirector } from '../src/audio/director.js';
import { stepStory } from '../src/story/runtime.js';
import { requestDeath, stepTransition, commitTransition, stepRespawnProtection } from '../src/flow.js';

const boxes=p=>[...p.walls,...p.obstacles];
function setup() {
  const p=generateDream('12')[1],s=createState(p);assert.ok(p.threat);
  s.layer=2;s.player={...p.threat.observation,standing:true,flashlight:true};return {p,s};
}
function aim(s,lit=true) {
  const dx=s.threat.x-s.player.x,dz=s.threat.z-s.player.z,dy=1.3-1.65,length=Math.hypot(dx,dy,dz);
  return {v:{...s.player,y:1.65,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))},
    beam:{enabled:lit,origin:{...s.player,y:1.65},direction:{x:dx/length,y:dy/length,z:dz/length},angle:Math.PI/7,distance:15}};
}
function tick(p,s,lit=true,n=1,options={}) {
  let hit=false;
  for(let i=0;i<n;i++) {const {v,beam}=aim(s,lit);hit=stepThreat(p,s,v,beam,.05,options)||hit;stepStory(p,s.story,v,.05,{active:options.active??true,suppressRoutes:true});}
  return hit;
}
function finishDemo(p,s) {
  tick(p,s,false,30);assert.ok(s.threat.demoMoved>=.3);
  tick(p,s,true,14);assert.equal(s.threat.demoStarted,true);
  tick(p,s,true,82);assert.equal(s.threat.demoComplete,true);
}

test('statue fitting reads existing geometry and requires visible safe spacing and a multi-room escape',()=>{
  let fitted=0;
  for(let seed=0;seed<20;seed++) {
    const p=generatePlan(String(seed),{catEnabled:false,threatEnabled:true});
    const plain=generatePlan(String(seed),{catEnabled:false});
    for(const key of ['cells','doors','walls']) assert.deepEqual(p[key],plain[key]);
    const shape=rooms=>rooms.map(({interior,...room})=>room);
    assert.deepEqual(shape(p.rooms),shape(plain.rooms));
    if(!p.threat) continue;
    assert.ok(!p.content.instances.some(instance=>instance.roomId===p.threat.roomId));
    fitted++;assert.ok(p.threat.roomRoute.length>=3);
    assert.ok(Math.hypot(p.threat.spawn.x-p.threat.observation.x,p.threat.spawn.z-p.threat.observation.z)>=6);
    assert.ok(pathThroughTiles(p,p.threat.observation,p.exit,['bedroom']));
    assert.ok(!boxes(p).some(b=>overlaps(p.threat.spawn.x,p.threat.spawn.z,b)));
    const geometry=structuredClone({rooms:p.rooms,cells:p.cells,doors:p.doors,walls:p.walls,obstacles:p.obstacles});
    const refit=fitStatue(p);
    assert.ok(refit);
    for(const key of ['id','roomId','spawn','observation','entryDoorId','escapeRoomId','roomRoute'])
      assert.deepEqual(refit[key],p.threat[key]);
    assert.ok(pathThroughTiles(p,p.threat.observation,p.exit,['bedroom']));
    assert.deepEqual({rooms:p.rooms,cells:p.cells,doors:p.doors,walls:p.walls,obstacles:p.obstacles},geometry);
  }
  assert.ok(fitted>0);
  const {p}=setup();p.opportunities.exitRoute=['bedroom',p.exit.roomId];assert.equal(fitStatue(p),null);
  assert.equal(generateDream('12')[0].threat,null);
});

test('stopping requires both view and flashlight cone, range and unblocked light',()=>{
  const {s}=setup(),{v,beam}=aim(s),target={...s.threat,y:1.3};
  assert.equal(statueIlluminated(v,target,beam,[]),true);
  assert.equal(statueIlluminated(v,target,{...beam,enabled:false},[]),false);
  assert.equal(statueIlluminated(v,target,{...beam,direction:{x:1,y:0,z:0}},[]),false);
  assert.equal(statueIlluminated(v,target,{...beam,distance:1},[]),false);
  assert.equal(statueIlluminated({...v,yaw:v.yaw+Math.PI},target,beam,[]),false);
  const x=(v.x+target.x)/2,z=(v.z+target.z)/2;
  assert.equal(statueIlluminated(v,target,beam,[{minX:x-1,maxX:x+1,minZ:z-1,maxZ:z+1,height:3}]),false);
});

test('safe demonstration requires observed stop after movement and a completed presentation barrier',()=>{
  const {p,s}=setup();
  assert.equal(tick(p,s,true,30),false);assert.equal(s.threat.demoStarted,false,'a still statue alone is not a demonstration');
  assert.equal(tick(p,s,false,30),false);assert.ok(s.threat.demoMoved<=STATUE_RULES.demoTravel+1e-6);
  tick(p,s,true,14);assert.equal(s.threat.demoStarted,true);assert.equal(s.story.cue.kind,'statueDemo');
  const remaining=s.threat.barrierRemaining,at={...s.player};
  s.player={...s.player,...p.spawn};tick(p,s,true,100);assert.equal(s.threat.barrierRemaining,remaining);
  s.player=at;const paused=structuredClone(s);tick(p,s,true,100,{active:false});assert.deepEqual(s,paused);
  assert.equal(tick(p,s,true,82),false);assert.equal(s.threat.phase,'pursuing');
  assert.equal(s.story.consumed.filter(k=>k==='statue.demo').length,1);
});

test('a clear observation entrance can start safe movement offscreen without forcing the view or completing the demo',()=>{
  const {p,s}=setup(),{v,beam}=aim(s);
  const away={...v,yaw:v.yaw+Math.PI},dark={...beam,enabled:false};
  for(let i=0;i<40;i++) assert.equal(stepThreat(p,s,away,dark,.05),false);
  assert.equal(s.threat.phase,'demo');assert.ok(s.threat.demoMoved>=.3);
  assert.ok(s.threat.demoMoved<=STATUE_RULES.demoTravel+1e-6);assert.equal(s.threat.demoComplete,false);
  const blocked=setup(),mid={x:(v.x+s.threat.x)/2,z:(v.z+s.threat.z)/2};
  stepThreat(blocked.p,blocked.s,away,dark,.05,{boxes:[{minX:mid.x-1,maxX:mid.x+1,minZ:mid.z-1,maxZ:mid.z+1,height:3}]});
  assert.equal(blocked.s.threat.phase,'dormant');
});

test('pursuit stops under light, crosses an unobstructed doorway and reaches off-center contact',()=>{
  const {p,s}=setup();finishDemo(p,s);
  const frozen={x:s.threat.x,z:s.threat.z};tick(p,s,true,40);
  assert.deepEqual({x:s.threat.x,z:s.threat.z},frozen);
  const next=p.rooms.find(r=>r.id===p.threat.roomRoute[1]);
  const edge=p.edges.find(e=>[e.a,e.b].includes(p.threat.roomId) && [e.a,e.b].includes(next.id));
  const door=p.doors.find(d=>d.edgeId===edge.id),axis=door.axis,other=axis==='x'?'z':'x';
  const cell=door.cells.find(([x,z])=>next.cells.some(c=>c[0]===x && c[1]===z));
  const sign=Math.sign(cell[axis==='x'?0:1]*p.cellSize-door[axis]);
  Object.assign(s.threat,{x:door.x,z:door.z,[axis]:door[axis]-sign*1.4,path:[],pathTarget:null});
  Object.assign(s.player,{x:door.x,z:door.z,[axis]:door[axis]+sign*1.4,[other]:door[other]+.25});
  let hit=false,crossed=false;
  for(let i=0;i<1800 && !hit;i++) {
    hit=tick(p,s,false);crossed ||= roomIdAt(p,s.threat)===next.id;
    assert.ok(!boxes(p).some(b=>overlaps(s.threat.x,s.threat.z,b)),'moving statue cannot penetrate a wall or furniture');
  }
  assert.ok(crossed);assert.ok(hit,'continuous pursuit reaches player in adjoining room');
  assert.equal(requestDeath(s),true);const action=stepTransition(s,.6);assert.equal(commitTransition(s,action.id,p),true);
  assert.deepEqual({x:s.threat.x,z:s.threat.z},p.threat.spawn);
  assert.equal(s.threat.demoComplete,true);assert.equal(s.threat.phase,'dormant');
  assert.equal(s.layer,2);assert.equal(s.flow.falseAwakenings,0);
  assert.equal(s.story.consumed.filter(k=>k==='statue.demo').length,1);
});

test('actual room occlusion cancels pursuit and scraping; reappearing resumes without replaying the demonstration',()=>{
  const {p,s}=setup();finishDemo(p,s);
  const sound=createSoundDirector(),start={x:s.threat.x,z:s.threat.z};
  sound.step(p,s,aim(s).v,.05);tick(p,s,false);
  assert.ok(sound.step(p,s,aim(s).v,.05).scrape);
  const target=p.cells.map(c=>({x:c.x*p.cellSize,z:c.z*p.cellSize,roomId:c.roomId}))
    .find(c=>c.roomId!=='bedroom' && c.roomId!==p.exit.roomId
      && !boxes(p).some(b=>overlaps(c.x,c.z,b))
      && !sightClear({...s.threat,y:1.54},{...c,y:1.65},boxes(p))
      && pathThroughTiles(p,s.threat,c,['bedroom',p.exit.roomId]));
  assert.ok(target,'generated space must offer an occluded but reachable hiding position');
  Object.assign(s.player,{x:target.x,z:target.z});
  const stopped={x:s.threat.x,z:s.threat.z},demo=s.threat.demoComplete;
  assert.equal(tick(p,s,false,100),false);assert.equal(s.threat.seesPlayer,false);
  assert.deepEqual({x:s.threat.x,z:s.threat.z},stopped);
  assert.deepEqual(s.threat.path,[]);assert.equal(s.threat.pathTarget,null);
  assert.equal(sound.step(p,s,aim(s).v,.05).scrape,null);
  Object.assign(s.player,p.threat.observation);
  tick(p,s,false);assert.equal(s.threat.seesPlayer,true);
  assert.notDeepEqual({x:s.threat.x,z:s.threat.z},stopped);
  assert.notDeepEqual(stopped,start);assert.equal(s.threat.demoComplete,demo);
  assert.equal(s.story.consumed.filter(k=>k==='statue.demo').length,1);
});

test('turning the camera away does not break statue sight; high furniture blocks it but low furniture does not',()=>{
  const {p,s}=setup();finishDemo(p,s);
  const {v,beam}=aim(s),away={...v,yaw:v.yaw+Math.PI};
  const before={x:s.threat.x,z:s.threat.z};
  stepThreat(p,s,away,{...beam,enabled:false},.05);assert.equal(s.threat.seesPlayer,true);
  assert.notDeepEqual({x:s.threat.x,z:s.threat.z},before);
  const x=(s.threat.x+s.player.x)/2,z=(s.threat.z+s.player.z)/2;
  const obstacle={minX:x-.3,maxX:x+.3,minZ:z-.3,maxZ:z+.3,height:2.2};
  const blocked={x:s.threat.x,z:s.threat.z};
  tick(p,s,false,20,{boxes:[...boxes(p),obstacle]});
  assert.equal(s.threat.seesPlayer,false);assert.deepEqual({x:s.threat.x,z:s.threat.z},blocked);
  tick(p,s,false,1,{boxes:[...boxes(p),{...obstacle,height:.8}]});assert.equal(s.threat.seesPlayer,true);
});

test('illuminated statue turns to follow a moving player without translating; occlusion freezes facing',()=>{
  const {p,s}=setup();finishDemo(p,s);
  const scene=new THREE.Scene(),world=createWorld(scene,p),mesh=scene.getObjectByName('threat-statue');
  world.updateThreat(s.threat,s.player);const initial=mesh.rotation.y,position=mesh.position.clone();
  s.player.x+=.6;tick(p,s,true);world.updateThreat(s.threat,s.player);
  assert.equal(s.threat.lit,true);assert.equal(s.threat.seesPlayer,true);
  assert.ok(mesh.position.equals(position));assert.notEqual(mesh.rotation.y,initial);
  assert.equal(mesh.rotation.y,Math.atan2(s.player.x-s.threat.x,s.player.z-s.threat.z));
  const facing=mesh.rotation.y,x=(s.player.x+s.threat.x)/2,z=(s.player.z+s.threat.z)/2;
  s.player.x+=.2;tick(p,s,true,1,{boxes:[...boxes(p),{minX:x-1,maxX:x+1,minZ:z-1,maxZ:z+1,height:3}]});
  world.updateThreat(s.threat,s.player);assert.equal(s.threat.seesPlayer,false);assert.equal(mesh.rotation.y,facing);
  world.dispose();
});

test('contact is harmless during demonstration or grace, and escape ends pursuit without despawning',()=>{
  const {p,s}=setup();tick(p,s,false);s.player={...s.player,x:s.threat.x,z:s.threat.z};
  assert.equal(tick(p,s,false,20),false);
  s.threat.demoComplete=true;s.threat.phase='pursuing';s.flow.graceRemaining=3;
  assert.equal(tick(p,s,false,20),false);assert.equal(requestDeath(s),false);
  stepRespawnProtection(s,3);assert.equal(tick(p,s,false),true);
  s.player={...s.player,x:p.exit.x,z:p.exit.z};assert.equal(tick(p,s,false),false);assert.equal(s.threat.phase,'escaped');
  const position={x:s.threat.x,z:s.threat.z};tick(p,s,false,10);
  assert.deepEqual({x:s.threat.x,z:s.threat.z},position);assert.equal(s.story.facts.filter(f=>f==='statue.escaped').length,1);
  const scene=new THREE.Scene(),world=createWorld(scene,p);world.updateThreat(s.threat,s.player);
  assert.ok(scene.getObjectByName('threat-statue').visible);world.dispose();assert.equal(scene.children.length,0);
});

test('paused or transitional frames cannot advance pursuit or deal damage',()=>{
  const {p,s}=setup();finishDemo(p,s);const before=structuredClone(s.threat);
  tick(p,s,false,100,{active:false});assert.deepEqual(s.threat,before);
  requestDeath(s);assert.equal(tick(p,s,false,100),false);assert.deepEqual(s.threat,before);
});

test('interrupted demonstration resumes its remaining window after death without replaying the line',()=>{
  const {p,s}=setup();tick(p,s,false,30);tick(p,s,true,14);tick(p,s,true,20);
  const remaining=s.threat.barrierRemaining;assert.ok(remaining>0 && remaining<4);
  assert.equal(requestDeath(s),true);const action=stepTransition(s,.6);commitTransition(s,action.id,p);stepTransition(s,.6);
  assert.equal(s.threat.demoStarted,true);assert.equal(s.threat.demoComplete,false);
  assert.equal(s.threat.barrierRemaining,remaining);
  s.player={...s.player,...p.threat.observation,standing:true};stepRespawnProtection(s,3);
  tick(p,s,true,Math.ceil(remaining/.05)+2);
  assert.equal(s.threat.demoComplete,true);assert.equal(s.story.cue,null);
  assert.equal(s.story.consumed.filter(k=>k==='statue.demo').length,1);
});
