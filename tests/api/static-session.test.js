import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {generatePlan} from '../../src/planning/generate.js';
import {validatePlan} from '../../src/planning/validate.js';
import {fitStaticThemes,createStaticSessionPreparer,isStaticSession} from '../../src/personalization/static-session.js';
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
