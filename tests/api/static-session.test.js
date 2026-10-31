import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {generatePlan} from '../../src/planning/generate.js';
import {validatePlan} from '../../src/planning/validate.js';
import {fitStaticThemes,createStaticSessionPreparer,isStaticSession} from '../../src/personalization/static-session.js';
import {createGeneratedDisplay} from '../../src/rendering/generated-display.js';
import {THEME_RULES,resolveThemeRule} from '../../src/personalization/theme-rules.js';
import {CONTENT_CATALOG} from '../../src/planning/content-catalog.js';
import {bindScriptThemes,requireScriptBindings} from '../../src/personalization/script-bindings.js';
import {randomRunSeed} from '../../src/personalization/run-seed.js';
const source=generatePlan('42',{catEnabled:false});
const model={entityId:'unfamiliar',role:'like',bounds:{min:[-.2,0,-.2],max:[.2,.8,.2]}};
test('generated theme avoids opening and doors, preserves source, and retains validated routes',()=>{
 const before=source.obstacles.length,p=fitStaticThemes(source,[model]);assert.equal(source.obstacles.length,before);assert.equal(p.obstacles.length,before+1);assert.equal(validatePlan(p).valid,true);
 const slot=p.generatedThemes[0];assert.notEqual(slot.roomId,'bedroom');assert.ok(!p.edges.some(e=>(e.a==='bedroom'&&e.b===slot.roomId)||(e.b==='bedroom'&&e.a===slot.roomId)));assert.ok(p.doors.every(d=>Math.hypot(d.x-slot.x,d.z-slot.z)>=2.4));
 assert.throws(()=>fitStaticThemes(source,[{...model,bounds:{min:[-50,0,-50],max:[50,2,50]}}]),{code:'WORLD_ADAPTER_UNAVAILABLE'});
});
test('local session is branded only after asset load and placement; disposal revokes it',async()=>{
 let released=0;const prepare=createStaticSessionPreparer({planDream:async()=>[source,source],modelClient:{prepare:async()=>({...model,root:new THREE.Group(),dispose(){released++;}})}});
 const s=await prepare({representation:'static-display',models:[{entityId:'unfamiliar',role:'like',jobId:'fixture'}],defaults:[],semanticHash:'fixture',inputRevision:1});assert.equal(isStaticSession({kind:'generated-static'}),false);assert.equal(isStaticSession(s),true);assert.equal(s.plans.length,2);s.dispose();assert.equal(isStaticSession(s),false);assert.equal(released,1);
});
test('cancelled late asset is released and cannot become a session',async()=>{
 const c=new AbortController();let finish,released=0;
 const prepare=createStaticSessionPreparer({planDream:async()=>assert.fail('cancelled asset cannot plan'),modelClient:{prepare:()=>new Promise(r=>finish=r)}});
 const work=prepare({representation:'static-display',models:[{entityId:'x',role:'fear'}],defaults:[]},{signal:c.signal});
 c.abort();finish({...model,root:new THREE.Group(),dispose(){released++;}});await assert.rejects(work);assert.equal(released,1);
});
test('oversized footprint automatically shrinks while retaining the same entity and collision scale',()=>{
 const large={...model,bounds:{min:[-.6,0,-.6],max:[.6,1.6,.6]}};
 const p=fitStaticThemes(source,[large]);const slot=p.generatedThemes[0];
 assert.ok(slot.scale<1&&slot.scale>0);assert.equal(slot.entityId,large.entityId);assert.equal(slot.role,large.role);
 assert.ok(Math.abs(slot.box.maxX-slot.box.minX-1.2*slot.scale)<1e-8);assert.equal(slot.box.height,1.6*slot.scale);assert.equal(validatePlan(p).valid,true);
});
test('background entry reserves routes before assets arrive; late results preserve topology and release on exit',async()=>{
 let finish,released=0;
 const prepare=createStaticSessionPreparer({background:true,planDream:async()=>[source,source],modelClient:{prepare:()=>new Promise(r=>finish=r)}});
 const s=await prepare({representation:'static-display',models:[{entityId:'x',role:'fear'}],defaults:[]});
 assert.ok(isStaticSession(s));assert.equal(s.models[0].status,'generating');assert.ok(s.models[0].root.children.length);
 const topology=JSON.stringify(s.plans);
 finish({...model,root:new THREE.Group(),dispose(){released++;}});await s.completion;
 assert.equal(s.models[0].status,'ready');assert.equal(JSON.stringify(s.plans),topology);assert.ok(s.plans.every(p=>validatePlan(p).valid));
 s.dispose();s.dispose();assert.equal(released,1);
});
test('a failed background model retains preset while other models finish; disposed session rejects late assets',async()=>{
 let finish,released=0;const c=new AbortController();
 const prepare=createStaticSessionPreparer({background:true,planDream:async()=>[source,source],modelClient:{prepare:async item=>{
   if(item.role==='fear')throw new Error('fixture failure');return new Promise(r=>finish=r);
 }}});
 const s=await prepare({representation:'static-display',models:[{entityId:'a',role:'like'},{entityId:'b',role:'fear'}],defaults:[]},{signal:c.signal});
 await Promise.resolve();assert.equal(s.models[1].status,'preset');assert.ok(isStaticSession(s));
 c.abort();finish({...model,root:new THREE.Group(),dispose(){released++;}});await s.completion;
 assert.equal(isStaticSession(s),false);assert.equal(released,1);assert.equal(s.models[0].generated,undefined);
});
test('live replacement waits for wall occlusion and distance, never changes collisions, and uses ready assets on replay',()=>{
 const slot={entityId:'x',role:'fear',roomId:'theme',x:0,z:0,scale:1,box:{minX:-.3,maxX:.3,minZ:-.3,maxZ:.3,height:.8}};
 const p={cells:[{x:0,z:0,roomId:'theme'}],generatedThemes:[slot],obstacles:[slot.box]};
 const root=new THREE.Group(),preset=new THREE.Group(),real=new THREE.Group();preset.name='preset';real.name='real';
 const h={entityId:'x',root:preset},display=createGeneratedDisplay(root,p,[h]);h.generated={root:real};
 const before=JSON.stringify(p);display.update({x:0,z:0},[]);assert.equal(root.children[0].children[0].name,'preset');
 display.update({x:0,z:5},[]);assert.equal(root.children[0].children[0].name,'preset');
 display.update({x:0,z:5},[{minX:-2,maxX:2,minZ:2,maxZ:2.2,height:3}]);assert.equal(root.children[0].children[0].name,'real');assert.equal(JSON.stringify(p),before);
 display.clear();assert.equal(root.children.length,0);
 const replay=createGeneratedDisplay(root,p,[h]);assert.equal(root.children[0].children[0].name,'real');replay.clear();
});
test('every catalog script has an explicit binding policy; missing action capabilities retain authored presets',()=>{
 assert.equal(THEME_RULES.length,CONTENT_CATALOG.length);assert.equal(new Set(THEME_RULES.map(r=>r.definitionId)).size,57);
 const entities=[{entityId:'l',role:'like'},{entityId:'f',role:'fear'}];
 assert.equal(resolveThemeRule('RI02',entities).mode,'background');
 assert.equal(resolveThemeRule('ME04',entities).mode,'background');
 assert.equal(resolveThemeRule('B04',entities).mode,'preset');
 assert.ok(resolveThemeRule('B04',entities).missing.includes('torn-variant'));
 assert.equal(resolveThemeRule('B25',entities).mode,'builtin');assert.equal(resolveThemeRule('B02',entities).mode,'excluded');
});
test('script binding uses authored instances, excludes every bedroom neighbor and never adds obstacles',()=>{
 const entities=[{entityId:'l',role:'like'}];
 const p={...source,edges:[{a:'bedroom',b:'near'},{a:'near',b:'later'}],content:{instances:[
   {instanceId:'near-offering',definitionId:'RI02',roomId:'near',focus:{x:1,z:1}},
   {instanceId:'later-offering',definitionId:'RI02',roomId:'later',focus:{x:5,z:5}},
   {instanceId:'rest',definitionId:'B25',roomId:'quiet',focus:{x:10,z:10}},
 ]}};
 const bound=bindScriptThemes(p,entities);assert.equal(bound.generatedThemes.length,1);assert.equal(bound.generatedThemes[0].instanceId,'later-offering');
 assert.deepEqual(bound.obstacles,p.obstacles);assert.deepEqual(bound.doors,p.doors);assert.equal(bound.content.instances[2].themeResolution.mode,'builtin');
 assert.throws(()=>requireScriptBindings([bound],[{entityId:'missing',role:'fear'}]));
});
test('observed preset is locked across revisits and death, while a new run can bind a finished model',()=>{
 const slot={entityId:'x',instanceId:'scene',definitionId:'RI02',role:'like',roomId:'theme',x:0,z:0,scale:1,box:{minX:-.3,maxX:.3,minZ:-.3,maxZ:.3,height:.8}};
 const p={seed:'fixture',cells:[{x:0,z:0,roomId:'theme'},{x:0,z:1,roomId:'later'}],generatedThemes:[slot]};
 const build=()=>{const r=new THREE.Group(),mount=new THREE.Group(),preset=new THREE.Group();mount.name='story-scene-liked';preset.name='preset';mount.add(preset);r.add(mount);return r;};
 const h={entityId:'x',root:new THREE.Group()},r=build(),display=createGeneratedDisplay(r,p,[h]);
 display.update({x:0,z:0},[]);h.generated={root:new THREE.Group()};h.generated.root.name='real';
 const wall=[{minX:-2,maxX:2,minZ:2,maxZ:2.2,height:3}];display.update({x:0,z:5},wall);
 assert.equal(display.variants.scene,'preset');const death=createGeneratedDisplay(build(),p,[h]);assert.equal(death.variants.scene,'preset');
 h.choices.clear();const replay=createGeneratedDisplay(build(),p,[h]);replay.update({x:0,z:5},wall);assert.equal(replay.variants.scene,'generated');
});
test('new-run seeds use fresh randomness; replanning reuses models without another generation',async()=>{
 let n=0,assets=0;const random={getRandomValues(array){array.fill(++n);return array;}};
 const first=randomRunSeed(random),second=randomRunSeed(random);assert.notEqual(first,second);assert.equal(first.length,32);
 const prepare=createStaticSessionPreparer({background:true,seedFactory:()=>first,planDream:async seed=>[{...source,seed},{...source,seed}],modelClient:{prepare:async()=>{assets++;return {...model,root:new THREE.Group(),dispose(){}};}}});
 const interpretation={entities:[{...model,kind:'physical-object'}],relations:[],semanticHash:'same-subject'};
 const preflight=await prepare.preflight(interpretation,{raw:{like:'x',fear:''}});
 const s=await prepare({representation:'static-display',models:[{entityId:model.entityId,role:'like'}],defaults:['fear'],semanticHash:'same-subject'},{preflight});await s.completion;
 assert.equal(s.runSeed,first);const next=await s.replan(second);assert.equal(next[0].seed,second);assert.equal(s.plans[0].seed,first);assert.equal(assets,1);s.dispose();
});
