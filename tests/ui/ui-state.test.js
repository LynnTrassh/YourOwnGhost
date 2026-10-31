import test from 'node:test';
import assert from 'node:assert/strict';
import { stickVector,createControlState } from '../../src/input/control-state.js';
import { defaults,loadSettings,normalizeSettings,saveSettings,resolveMode } from '../../src/ui/settings.js';
import { createGeneration } from '../../src/ui/generation.js';

// All successful providers in this unit file are explicit test fixtures.
const fixture=raw=>({interpretationId:'test-1',inputRevision:1,semanticHash:'test-hash',displaySummary:{...raw},ambiguities:[]});
function confirmed(options) {
 const prepare=options.prepare;
 return createGeneration({...options,confirm:async()=>({decision:'accept'}),prepare:prepare?async(raw,ctx)=>{await ctx.requestConfirmation(fixture(raw));return prepare(raw,ctx);}:undefined});
}
const flush=()=>new Promise(setImmediate);

test('analog strength survives diagonal normalization and dead zone',()=>{
 assert.deepEqual(stickVector(2,2),{x:0,y:0});
 const state=createControlState();state.claim(1,'move');state.update(1,stickVector(24,0));
 const slow=state.sample(.016);assert.ok(slow.right>0&&slow.right<.5);
 state.keys.add('KeyW');state.keys.add('KeyD');const diagonal=state.sample(.016);assert.ok(Math.hypot(diagonal.right,diagonal.forward)<=1.000001);
});
test('two fingers are independent, additional touch cannot steal a stick, pause clears all',()=>{
 const s=createControlState();assert.ok(s.claim(1,'move'));assert.ok(s.claim(2,'look'));assert.equal(s.claim(3,'move'),false);
 s.update(1,{x:1,y:0});s.update(2,{x:1,y:0});s.release(2);
 assert.equal(s.sample(.016).right,1);assert.equal(s.sample(.016).yaw,0);
 s.look(20,30);s.keys.add('KeyW');s.clear();assert.deepEqual(s.sample(.016),{right:0,forward:0,yaw:0,pitch:0});
});
test('look rate is time based and mouse delta is consumed once',()=>{
 const s=createControlState();s.claim(1,'look');s.update(1,{x:1,y:0});const half=s.sample(.01).yaw;assert.equal(s.sample(.02).yaw,half*2);
 s.clear();s.look(100,0);assert.equal(s.sample(.01).yaw,-.2);assert.equal(s.sample(.01).yaw,0);
});
test('settings tolerate blocked/corrupt storage and invalid values',()=>{
 assert.deepEqual(loadSettings({getItem(){throw Error();}}),defaults);
 assert.deepEqual(loadSettings({getItem(){return 'broken';}}),defaults);
 assert.equal(saveSettings({setItem(){throw Error();}},defaults),false);
 assert.equal(normalizeSettings({mode:'other',touchSensitivity:999,vhs:NaN}).mode,'auto');
 assert.equal(normalizeSettings({touchSensitivity:999}).touchSensitivity,2);
 assert.equal(resolveMode({...defaults,mode:'keyboard'},true),'keyboard');
 assert.equal(resolveMode(defaults,true),'touch');
});
test('arbitrary text reaches provider unchanged; only provider completion unlocks entry',async()=>{
 const changes=[],input={like:'雨天的旧书店与发光水母\n  保留空格',fear:'没有脸的人模仿我 <script>'};let seen;
 const gen=confirmed({prepare:async(raw,{onProgress})=>{seen=raw;onProgress('generating');return {runId:'one'};},onChange:s=>changes.push(s)});
 await gen.run(input);assert.deepEqual(seen,input);assert.equal(changes.at(-1).status,'ready');assert.equal(changes.at(-1).session.runId,'one');
});
test('cancelled or superseded generation cannot overwrite newer result',async()=>{
 const pending=[],changes=[];
 const gen=confirmed({prepare:(_,ctx)=>new Promise(resolve=>pending.push({resolve,ctx})),onChange:s=>changes.push(s)});
 const a=gen.run({like:'a',fear:'a'});await flush();gen.cancel();const b=gen.run({like:'b',fear:'b'});await flush();
 pending[1].resolve({id:'b'});await b;pending[0].ctx.onProgress('preparing');pending[0].resolve({id:'a'});await a;
 assert.equal(pending[0].ctx.signal.aborted,true);assert.equal(changes.at(-1).session.id,'b');
});
test('missing provider fails honestly and does not report ready',async()=>{
 const changes=[];const gen=confirmed({onChange:s=>changes.push(s)});await gen.run({like:'anything',fear:'anything'});
 assert.equal(changes.at(-1).status,'error');assert.match(changes.at(-1).message,/尚未连接/);assert.equal(changes.some(s=>s.status==='ready'),false);
});
test('handoff detaches provider signal so UI disposal does not abort gameplay jobs',async()=>{
 let signal;const gen=confirmed({prepare:async(_,context)=>{signal=context.signal;return {openingReady:true};},onChange(){}});
 await gen.run({like:'water',fear:'echo'});gen.handoff();gen.cancel();assert.equal(signal.aborted,false);
});
test('late provider progress cannot turn an entry-ready session back into loading',async()=>{
 let progress;const changes=[];
 const gen=confirmed({prepare:async(_,ctx)=>{progress=ctx.onProgress;return {id:'opening'};},onChange:s=>changes.push(s)});
 await gen.run({like:'cloud',fear:'silence'});progress('generating');assert.equal(changes.at(-1).status,'ready');
});
