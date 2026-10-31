import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createStaticSessionPreparer,isStaticSession} from '../../src/personalization/static-session.js';
import {generatePlan} from '../../src/planning/generate.js';
const source=generatePlan('42',{catEnabled:false});
const manifest={representation:'static-display',models:[{entityId:'cat',role:'like',localPresetId:'cat-tabby'}],defaults:[],semanticHash:'test'};
test('background local load bypasses remote client and disposes loaded asset',async()=>{
 let disposed=0;
 const prepare=createStaticSessionPreparer({background:true,planDream:async()=>[source],presetById:()=>({url:'/art/animals-v01/cat.glb',sha256:'a'.repeat(64)}),modelClient:{prepare:()=>assert.fail('no paid job')},localModelLoader:async()=>({root:new THREE.Group(),bounds:{min:[-.2,0,-.2],max:[.2,.4,.2]},dispose(){disposed++;}})});
 const s=await prepare(manifest);await s.completion;assert.ok(isStaticSession(s));assert.equal(s.models[0].status,'ready');s.dispose();assert.equal(disposed,1);
});
test('failed local animal retains playable preset and never silently submits paid replacement',async()=>{
 const prepare=createStaticSessionPreparer({background:true,planDream:async()=>[source],presetById:()=>({}),modelClient:{prepare:()=>assert.fail('no paid retry')},localModelLoader:async()=>{throw new Error('missing GLB');}});
 const s=await prepare(manifest);await s.completion;assert.ok(isStaticSession(s));assert.equal(s.models[0].status,'preset');s.dispose();
});
