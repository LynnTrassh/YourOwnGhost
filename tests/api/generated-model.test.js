import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadGeneratedModel } from '../../src/assets/generated-model.js';
import { createModelJobClient } from '../../src/assets/model-job-client.js';
const bytes=readFileSync(new URL('../../public/art/generated/watcher-cat-v2.glb',import.meta.url));
const sha256=createHash('sha256').update(bytes).digest('hex');
function fixture(){const root=new THREE.Group(),geometry=new THREE.BoxGeometry(1,2,1),material=new THREE.MeshStandardMaterial();root.add(new THREE.Mesh(geometry,material));let disposed=0;geometry.addEventListener('dispose',()=>disposed++);return {root,geometry,material,disposed:()=>disposed,gltf:{scene:root,scenes:[root],animations:[]}};}
const fetchImpl=async()=>new Response(bytes);
test('loader verifies hash before parsing and rejects external URLs',async()=>{
  let parsed=false;await assert.rejects(loadGeneratedModel({url:'/asset.glb',sha256:'0'.repeat(64),fetchImpl,loader:{parseAsync:async()=>{parsed=true;}}}),{code:'ASSET_HASH_MISMATCH'});assert.equal(parsed,false);
  await assert.rejects(loadGeneratedModel({url:'https://elsewhere/a.glb',sha256}),{code:'INVALID_ASSET'});
});
test('static load normalizes actual bounds, checks slot envelope, and releases once',async()=>{
  const f=fixture();const model=await loadGeneratedModel({url:'/asset.glb',sha256,fetchImpl,targetHeight:1,loader:{parseAsync:async()=>f.gltf}});
  assert.deepEqual(model.bounds,{min:[-.25,0,-.25],max:[.25,1,.25]});assert.deepEqual(model.verifiedCapabilities,['static-display']);model.dispose();model.dispose();assert.equal(f.disposed(),1);
  const big=fixture();await assert.rejects(loadGeneratedModel({url:'/asset.glb',sha256,fetchImpl,targetHeight:4,maxSize:[1,2,1],loader:{parseAsync:async()=>big.gltf}}),{code:'SLOT_OVERFLOW'});assert.equal(big.disposed(),1);
});
test('cancelled in-flight decoding rejects immediately and disposes a late scene',async()=>{
  const f=fixture(),controller=new AbortController();let deliver,start;const entered=new Promise(r=>start=r);
  const loading=loadGeneratedModel({url:'/asset.glb',sha256,fetchImpl,signal:controller.signal,loader:{parseAsync:()=>{start();return new Promise(r=>deliver=r);}}});
  await entered;controller.abort();await assert.rejects(loading,{code:'ABORTED'});deliver(f.gltf);await new Promise(r=>setTimeout(r,0));assert.equal(f.disposed(),1);
});
test('animated assets cannot claim static or chase readiness',async()=>{
  const f=fixture();f.gltf.animations=[{}];await assert.rejects(loadGeneratedModel({url:'/asset.glb',sha256,fetchImpl,loader:{parseAsync:async()=>f.gltf}}),{code:'DYNAMIC_ADAPTER_REQUIRED'});assert.equal(f.disposed(),1);
});
test('model client passes validated bytes to loader but never declares world readiness',async()=>{
  const id='12345678-1234-1234-1234-123456789abc';let count=0,loaded;
  const client=createModelJobClient({pollMs:0,fetchImpl:async(path)=>{count++;return new Response(JSON.stringify({jobId:id,inputRevision:2,status:count===1?'running':'assetValidated',asset:{sha256}}));},load:async options=>{loaded=options;return {root:{},dispose(){},verifiedCapabilities:['static-display']};}});
  const result=await client.prepare({inputRevision:2,confirmationId:'confirmed',recipeId:'approved'},{targetHeight:1});assert.equal(result.worldReady,false);assert.equal(loaded.url,`/api/model-jobs/${id}/asset`);assert.equal(loaded.sha256,sha256);assert.equal(loaded.targetHeight,1);
});
