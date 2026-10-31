import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,mkdtempSync,rmSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createTripoProvider } from '../../server/providers/tripo.js';
import { inspectGlb } from '../../src/assets/glb-contract.js';
import { AssetStore } from '../../server/assets/store.js';
import { DreamLedger } from '../../server/ledger.js';
import { ModelJobs } from '../../server/model-jobs.js';
const model=readFileSync(new URL('../../public/art/generated/watcher-cat-v2.glb',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const reply=(data,status=200)=>new Response(JSON.stringify({code:0,data}),{status,headers:{'Content-Type':'application/json'}});
test('Tripo API uses pinned region and redacts provider errors; no automatic billable retry',async()=>{
  let calls=0;const p=createTripoProvider({apiKey:'secret-fixture',region:'ov',fetchImpl:async(url,options)=>{calls++;assert.ok(url.startsWith('https://openapi.tripo3d.ai/v3/'));assert.equal(options.redirect,'error');throw new Error('secret-fixture');}});
  await assert.rejects(p.submitImage({fileToken:'approved-token'}),e=>e.code==='TRIPO_SUBMISSION_UNKNOWN'&&!e.message.includes('secret-fixture'));assert.equal(calls,1);
  const q=createTripoProvider({apiKey:'fixture',region:'cn',fetchImpl:async()=>reply({task_id:'different-task',status:'success'})});await assert.rejects(q.query('expected-task'),{code:'TRIPO_TASK_MISMATCH'});
});
test('real local GLB validates while corrupted and over-budget files fail',()=>{
  const report=inspectGlb(model);assert.equal(report.triangles,5912);assert.equal(report.hasSkin,false);assert.equal(report.texturePixels,2048*2048);
  assert.throws(()=>inspectGlb(model.subarray(0,100)),{code:'INVALID_GLB'});assert.throws(()=>inspectGlb(model,{maxTriangles:100}),{code:'INVALID_GLB'});
  const corrupt=Buffer.from(model);corrupt.writeUInt32LE(99999999,12);assert.throws(()=>inspectGlb(corrupt),{code:'INVALID_GLB'});
});
test('asset store is content-addressed; private hosts and redirects cannot be used',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'tripo-assets-'));try{let calls=0;const store=new AssetStore(dir,{downloadHosts:['cdn.tripo3d.ai'],fetchImpl:async(_url,o)=>{calls++;assert.equal(o.headers,undefined);assert.equal(o.redirect,'error');return new Response(model);}});
    await assert.rejects(store.download('http://127.0.0.1/private'),{code:'DOWNLOAD_HOST_UNAPPROVED'});assert.equal(calls,0);
    const a=await store.download('https://cdn.tripo3d.ai/model.glb');assert.equal(a.sha256,hash(model));assert.deepEqual(a.verifiedCapabilities,[]);assert.deepEqual(await store.read(a.assetId),model);
  }finally{rmSync(dir,{recursive:true});}
});
function setup(overrides={}){
  const dir=mkdtempSync(join(tmpdir(),'tripo-jobs-')),imagePath=join(dir,'approved.png');writeFileSync(imagePath,'approved fixture');
  const ledger=new DreamLedger(join(dir,'db'));const raw={like:'玻璃海马',fear:'镜中的陌生人'},d=ledger.begin('owner',raw);
  const i=ledger.interpret('owner',d.revision,{displaySummary:raw,entities:['like','fear'].map(role=>({role,entityId:role,subject:raw[role],kind:'physical-object',mustPreserve:[],excludedTraits:[]})),relations:[],ambiguities:[]});
  const c=ledger.confirm('owner',d.revision,i.interpretationId,i.semanticHash);let submits=0,queries=0;
  const provider={version:'test-v3',uploadImage:async()=> 'file_token',submitImage:async()=>{submits++;return 'fixture-task';},query:async()=>{queries++;return {taskId:'fixture-task',status:'success',modelUrl:'https://cdn.tripo3d.ai/model.glb',creditsConsumed:40};},...overrides};
  const approval={approvedAt:'test-only',imagePath,imageSha256:hash(readFileSync(imagePath)),semanticHash:i.semanticHash,creditCeiling:50};
  const store={download:async()=>({assetId:'test-asset',sha256:hash(model),verifiedCapabilities:[]}),read:async()=>model};
  const options={ledger,provider,store,approvals:{test:approval},budgetId:'test-budget',maxCredits:50,pollMs:0};const jobs=new ModelJobs(options);
  return {dir,ledger,jobs,options,request:{...c,recipeId:'test'},counts:()=>({submits,queries}),cleanup:async()=>{await jobs.close();ledger.close();rmSync(dir,{recursive:true});}};
}
test('confirmed approval gates paid work; duplicates share one durable supplier task and cost',async()=>{
  const s=setup();try{
    assert.throws(()=>s.jobs.create('owner',{...s.request,recipeId:'forged'}),{code:'IMAGE_APPROVAL_REQUIRED'});
    const a=s.jobs.create('owner',s.request),b=s.jobs.create('owner',s.request);assert.equal(a.jobId,b.jobId);
    await s.jobs.running.get(a.jobId);const row=s.jobs.get('owner',a.jobId);assert.equal(row.status,'assetValidated');assert.equal(row.credits,40);assert.equal(s.counts().submits,1);assert.equal(s.jobs.snapshot(row).worldReady,false);
    assert.throws(()=>s.jobs.get('someone-else',a.jobId),{code:'NOT_FOUND'});
    assert.deepEqual(await s.jobs.asset('owner',a.jobId),model);
    s.jobs.cancel('owner',a.jobId);await assert.rejects(s.jobs.asset('owner',a.jobId),{code:'STALE_REVISION'});
  }finally{await s.cleanup();}
});
test('unknown submission persists and retry never resubmits',async()=>{
  let submits=0;const s=setup({submitImage:async()=>{submits++;throw Object.assign(new Error('unknown'),{code:'TRIPO_SUBMISSION_UNKNOWN'});}});
  try{const a=s.jobs.create('owner',s.request);await s.jobs.running.get(a.jobId);assert.equal(s.jobs.get('owner',a.jobId).status,'submissionUnknown');await s.jobs.run('owner',a.jobId);assert.equal(submits,1);
    const restarted=new ModelJobs(s.options);await restarted.run('owner',a.jobId);assert.equal(submits,1);await restarted.close();
  }finally{await s.cleanup();}
});
test('zero budget and replaced approval image prevent supplier submission',async()=>{
  const s=setup();try{s.jobs.maxCredits=0;assert.throws(()=>s.jobs.create('owner',s.request),{code:'BUDGET_REQUIRED'});s.jobs.maxCredits=50;writeFileSync(s.options.approvals.test.imagePath,'changed');const a=s.jobs.create('owner',s.request);await s.jobs.running.get(a.jobId);assert.equal(s.jobs.get('owner',a.jobId).error,'IMAGE_HASH_MISMATCH');assert.equal(s.counts().submits,0);}finally{await s.cleanup();}
});
test('late success after cancellation records cost but cannot publish asset',async()=>{
  let finish,queryStarted;const started=new Promise(r=>queryStarted=r);const s=setup({query:()=>{queryStarted();return new Promise(r=>finish=r);}});
  try{const a=s.jobs.create('owner',s.request);await started;s.jobs.cancel('owner',a.jobId);finish({status:'success',creditsConsumed:40});await s.jobs.running.get(a.jobId);const row=s.jobs.get('owner',a.jobId);assert.equal(row.status,'cancelled');assert.equal(row.credits,40);assert.equal(row.asset,null);}finally{await s.cleanup();}
});

test('HTTP model job lifecycle enforces private ownership and serves validated GLB bytes',async()=>{
  const {createDreamServer}=await import('../../server/app.js');
  const s=setup();const owner='a'.repeat(64);
  // Transfer this test-only fixture into the anonymous session used by HTTP.
  s.ledger.db.prepare('UPDATE clients SET id=? WHERE id=?').run(owner,'owner');
  s.ledger.db.prepare('UPDATE drafts SET owner=? WHERE owner=?').run(owner,'owner');
  const server=createDreamServer({ledger:s.ledger,modelJobs:s.jobs});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const req=(path,body,cookie=owner)=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Cookie:`yog_session=${cookie}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  try{
    const first=await req('/api/model-jobs',s.request);assert.equal(first.status,200);const job=await first.json();await s.jobs.running.get(job.jobId);
    const snapshot=await (await req(`/api/model-jobs/${job.jobId}`)).json();assert.equal(snapshot.status,'assetValidated');assert.equal(snapshot.worldReady,false);
    assert.equal((await req(`/api/model-jobs/${job.jobId}`,undefined,'b'.repeat(64))).status,404);
    const asset=await req(`/api/model-jobs/${job.jobId}/asset`);assert.equal(asset.headers.get('content-type'),'model/gltf-binary');assert.deepEqual(Buffer.from(await asset.arrayBuffer()),model);
    const cancel=await req(`/api/model-jobs/${job.jobId}/cancel`,{});assert.equal((await cancel.json()).deliveryCancelled,true);
    assert.equal((await req(`/api/model-jobs/${job.jobId}/asset`)).status,409);
  }finally{await new Promise(resolve=>server.close(resolve));await s.cleanup();}
});

test('query failures resume the same task; retry does not generate again',async()=>{
  let queries=0;const s=setup({query:async()=>{queries++;if(queries===1)throw Object.assign(new Error('network'),{code:'TRIPO_QUERY_UNAVAILABLE'});return {status:'success',modelUrl:'https://cdn.tripo3d.ai/model.glb',creditsConsumed:40};}});
  try{const j=s.jobs.create('owner',s.request);await s.jobs.running.get(j.jobId);assert.equal(s.jobs.get('owner',j.jobId).status,'waiting');await s.jobs.run('owner',j.jobId);assert.equal(s.jobs.get('owner',j.jobId).status,'assetValidated');assert.equal(s.counts().submits,1);assert.equal(queries,2);}finally{await s.cleanup();}
});
test('budget reservation includes outstanding jobs before any upload completes',async()=>{
  const s=setup();try{s.jobs.approvals.another={...s.jobs.approvals.test};const j=s.jobs.create('owner',s.request);assert.throws(()=>s.jobs.create('owner',{...s.request,recipeId:'another'}),{code:'BUDGET_REQUIRED'});await s.jobs.running.get(j.jobId);assert.equal(s.counts().submits,1);}finally{await s.cleanup();}
});
