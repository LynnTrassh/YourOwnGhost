import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDream } from '../src/planning/dream.js';
import { createState } from '../src/state.js';
import { createSoundDirector, spatialMix } from '../src/audio/director.js';
import { createAudioOutput } from '../src/audio/output.js';
import { requestDeath } from '../src/flow.js';

const plans=generateDream('12');
function setup(p=plans[0]) {
  const s=createState(p),d=createSoundDirector();s.player.standing=true;
  const tick=(options={})=>d.step(p,s,{...s.player,y:1.65,yaw:0},.05,options);
  tick();return {p,s,d,tick};
}
test('footsteps track real displacement, never held input at a wall, pause, or teleport',()=>{
  const {s,tick}=setup();
  for(let i=0;i<50;i++) assert.deepEqual(tick().events,[]);
  let steps=0;
  for(let i=0;i<20;i++) {s.player.x+=.12;steps+=tick().events.filter(e=>e.kind==='step').length;}
  assert.equal(steps,2);
  s.player.x+=40;assert.deepEqual(tick().events,[]);
  for(let i=0;i<20;i++) {s.player.x+=.12;assert.deepEqual(tick({active:false}).events,[]);}
  assert.deepEqual(tick().events,[]);
});
test('door, switch and death are single actual state edges; reset cannot replay them',()=>{
  const {s,d,tick}=setup();
  s.doors.bedroom.open=true;s.player.flashlight=false;
  assert.deepEqual(tick().events.map(e=>e.kind),['door','switch']);assert.deepEqual(tick().events,[]);
  requestDeath(s);assert.deepEqual(tick().events.map(e=>e.kind),['death']);assert.deepEqual(tick().events,[]);
  d.reset();assert.deepEqual(tick().events,[]);
});
test('stone scrape follows motion, stops under illumination and escape, and cannot follow a teleport',()=>{
  const {p,s,d,tick}=setup(plans[1]);
  Object.assign(s.player,p.threat.observation);Object.assign(s.threat,{phase:'demo',lit:false});d.reset();tick();
  assert.equal(tick().scrape,null);
  s.threat.x+=.03;assert.ok(tick().scrape);
  s.threat.x+=.03;s.threat.lit=true;assert.equal(tick().scrape,null);
  s.threat.phase='escaped';s.threat.lit=false;s.threat.x+=.03;
  assert.deepEqual(tick().events.map(e=>e.kind),['relief']);assert.deepEqual(tick().events,[]);
  d.reset();assert.equal(tick().scrape,null);
});
test('cat sounds need a live fitted instance and stop at death, pause, transitions and absent layers',()=>{
  const {p,s,tick}=setup();assert.ok(p.story.cat);
  Object.assign(s.player,p.story.cat.slots[0]);
  let called=false;
  for(let i=0;i<200;i++) called ||= tick().events.some(e=>e.kind==='cat');
  assert.ok(called);
  s.story.catPhase='dead';
  for(let i=0;i<200;i++) {const f=tick();assert.equal(f.catAlive,false);assert.ok(!f.events.some(e=>e.kind==='cat'));}
  assert.equal(tick({active:false}).catAlive,false);
  assert.equal(setup(plans[1]).tick().catAlive,false);
  s.story.catPhase='unobserved';requestDeath(s);assert.equal(tick().catAlive,false);
});
test('spatial mix pans with listener direction, attenuates by distance and muffles occlusion',()=>{
  const view={x:0,y:1.65,z:0,yaw:0},source={x:3,y:.5,z:0};
  assert.equal(spatialMix(view,source).pan,1);
  assert.equal(spatialMix({...view,yaw:Math.PI},source).pan,-1);
  assert.equal(spatialMix(view,{x:15,z:0}).gain,0);
  const wall=[{minX:1,maxX:2,minZ:-1,maxZ:1,height:3}];
  assert.ok(spatialMix(view,source,wall).gain<spatialMix(view,source).gain);
  assert.equal(spatialMix(view,source,wall).cutoff,550);
});

// A lifecycle fake: enforce start/stop ordering and check that disconnected voices do not leak.
function fakeContext() {
  const sources=[];
  const parameter=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node=()=>({connect(){},disconnect(){this.disconnected=true;},gain:parameter(),pan:parameter(),frequency:parameter()});
  const source=()=>{const n={...node(),start(){this.started=true;},stop(){assert.ok(this.started,'start must precede stop');this.stopped=true;}};sources.push(n);return n;};
  return {currentTime:0,sampleRate:8,state:'suspended',destination:node(),sources,
    createGain:node,createBiquadFilter:node,createStereoPanner:node,createBufferSource:source,createOscillator:source,
    createBuffer:()=>({getChannelData:()=>new Float32Array(8)}),
    async resume(){this.state='running';},async close(){this.state='closed';}};
}
test('audio unlock, mute, pause, death, cat silence, reset and disposal release voices',async()=>{
  const c=fakeContext(),out=createAudioOutput({createContext:()=>c});
  const frame={events:[{kind:'cat',gain:.5}],scrape:{gain:.8,pan:.5,cutoff:4200},catAlive:true};
  out.sync(frame);assert.equal(out.status().voices,0);
  out.setActive(true);assert.equal(await out.resume(),true);out.sync(frame);assert.equal(out.status().voices,2);
  out.sync({events:[],scrape:null,catAlive:false});assert.equal(out.status().voices,0);
  assert.ok(c.sources.every(s=>s.stopped && s.disconnected));
  out.sync(frame);out.setVolume(0);assert.equal(out.status().voices,0);out.sync(frame);assert.equal(out.status().voices,0);
  out.setVolume(.5);out.sync(frame);out.setActive(false);assert.equal(out.status().voices,0);
  out.setActive(true);out.sync(frame);out.sync({events:[{kind:'death'}],scrape:null,catAlive:false});assert.equal(out.status().voices,1);
  out.reset();assert.equal(out.status().voices,0);out.sync(frame);out.dispose();
  assert.equal(out.status().voices,0);assert.equal(c.state,'closed');assert.equal(await out.resume(),false);
});
test('failed or late audio unlock cannot start sounds after pause or block play',async()=>{
  const failed=createAudioOutput({createContext:()=>{throw Error('unsupported');}});
  assert.equal(await failed.resume(),false);failed.sync({events:[{kind:'step'}]});assert.equal(failed.status().voices,0);
  const c=fakeContext();let resolve;
  c.resume=()=>new Promise(done=>{resolve=()=>{c.state='running';done();};});
  const out=createAudioOutput({createContext:()=>c});out.setActive(true);const pending=out.resume();out.setActive(false);
  resolve();await pending;out.sync({events:[{kind:'step'}]});assert.equal(out.status().voices,0);out.dispose();
});
