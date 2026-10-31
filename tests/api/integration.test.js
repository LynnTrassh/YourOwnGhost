import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DreamLedger } from '../../server/ledger.js';
import { createDreamServer } from '../../server/app.js';
import { createDreamApi } from '../../src/personalization/api-client.js';
import { validateRaw,validateSemantics } from '../../src/personalization/contracts.js';
const raw={like:' 透明的风铃水母 ',fear:'会重复我动作的影子'};
const semantic=()=>({displaySummary:{...raw},entities:['like','fear'].map(role=>({entityId:role,role,subject:raw[role],kind:'creature',mustPreserve:[],excludedTraits:[]})),relations:[],ambiguities:[]});
function confirmed(l,owner='a') {const d=l.begin(owner,raw),i=l.interpret(owner,d.revision,semantic()),c=l.confirm(owner,d.revision,i.interpretationId,i.semanticHash);return {d,i,c};}
test('open subjects preserve original; self-declared capability and missing role are rejected',()=>{
  assert.deepEqual(validateRaw(raw),raw);assert.deepEqual(validateRaw({like:'',fear:''}),{like:'',fear:''});assert.throws(()=>validateRaw({...raw,fear:'x'.repeat(1201)}));
  const s=semantic();s.entities[0].verifiedCapabilities=['chase'];assert.throws(()=>validateSemantics(s),{code:'INVALID_ENTITY'});
  assert.throws(()=>validateSemantics({...semantic(),entities:semantic().entities.slice(1)}),{code:'MISSING_THEME'});
});
test('revision isolates stale interpretation and confirmation; hashes and ambiguities are enforced',()=>{
  const l=new DreamLedger();try{const {d,i}=confirmed(l);assert.throws(()=>l.confirm('a',d.revision,i.interpretationId,'forged'));
    l.begin('a',{...raw,like:'新的主题'});assert.throws(()=>l.interpret('a',d.revision,semantic()),{code:'STALE_REVISION'});
    assert.throws(()=>l.confirm('a',d.revision,i.interpretationId,i.semanticHash),{code:'STALE_REVISION'});
    const x=l.begin('b',raw),s=l.interpret('b',x.revision,{...semantic(),ambiguities:['请澄清']});assert.throws(()=>l.confirm('b',x.revision,s.interpretationId,s.semanticHash));
  }finally{l.close();}
});
test('durable jobs deduplicate; uncertain submission survives restart and cannot resubmit',()=>{
  const dir=mkdtempSync(join(tmpdir(),'dream-ledger-')),path=join(dir,'db');let l=new DreamLedger(path);
  try {const {d,c}=confirmed(l);const args=['a',d.revision,c.confirmationId,{subject:'new'},'fixture-v1'];
    const job=l.reserve(...args);assert.equal(l.reserve(...args).id,job.id);
    l.transition('a',job.id,'reserved','submitting');l.close();l=new DreamLedger(path);
    assert.equal(l.reserve(...args).status,'submissionUnknown');assert.throws(()=>l.transition('a',job.id,'reserved','submitting'));
    assert.throws(()=>l.job('other',job.id),{code:'NOT_FOUND'});
  }finally{l.close();rmSync(dir,{recursive:true});}
});
test('cancel blocks late publication and readiness never bypasses the missing validator',()=>{
  const l=new DreamLedger();try{const {d,c}=confirmed(l),j=l.reserve('a',d.revision,c.confirmationId,{},'fixture');
    l.transition('a',j.id,'reserved','submitting');l.transition('a',j.id,'submitting','queued');l.transition('a',j.id,'queued','validating');
    assert.throws(()=>l.transition('a',j.id,'validating','ready',{}),{code:'VALIDATOR_UNAVAILABLE'});
    l.cancel('a',d.revision);assert.throws(()=>l.transition('a',j.id,'validating','rejected'),{code:'STALE_REVISION'});
  }finally{l.close();}
});
async function serve(t,options={}){
  const ledger=new DreamLedger(),server=createDreamServer({ledger,...options});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>{await new Promise(r=>server.close(r));ledger.close();});
  let cookie='';const fetchImpl=async(path,init)=>{const response=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{...init,headers:{...init.headers,Cookie:cookie}});cookie=response.headers.get('set-cookie')?.split(';')[0]??cookie;return response;};
  return {fetchImpl,ledger};
}
test('HTTP without configured provider returns honest error, not a mock session',async t=>{
  const {fetchImpl}=await serve(t);const api=createDreamApi({fetchImpl});
  await assert.rejects(api.prepareDream(raw,{requestConfirmation:()=>assert.fail('must not confirm')}),{code:'PROVIDER_UNAVAILABLE'});
  const denied=await fetchImpl('/api/interpretations',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://foreign.example'},body:JSON.stringify({raw})});assert.equal(denied.status,403);
});
test('fixture HTTP understands then confirms, but missing generation never becomes ready',async t=>{
  let calls=0;const {fetchImpl}=await serve(t,{interpret:async input=>{calls++;assert.deepEqual(input,raw);return semantic();}});
  const api=createDreamApi({fetchImpl,prepareSession:()=>assert.fail('missing generation cannot install')});let confirmations=0;
  for(let i=0;i<2;i++)await assert.rejects(api.prepareDream(raw,{requestConfirmation:async()=>{confirmations++;return {decision:'accept'};}}),{code:'GENERATION_UNAVAILABLE'});
  assert.equal(calls,1);assert.equal(confirmations,2);
});
test('client rejects late cancelled explanation before showing confirmation',async()=>{
  let resolve;const controller=new AbortController();const api=createDreamApi({fetchImpl:()=>new Promise(r=>resolve=r)});
  const work=api.prepareDream(raw,{signal:controller.signal,requestConfirmation:()=>assert.fail('late result')});
  controller.abort();resolve({ok:true,json:async()=>({inputRevision:1})});await assert.rejects(work,{code:'ABORTED'});
});
test('client preflights world before submitting a billable manifest',async()=>{
 const events=[];const session={dispose(){events.push('dispose');}};
 const prepareSession=async()=>{events.push('install');return session;};
 prepareSession.preflight=async()=>{events.push('preflight');return ['plans'];};
 const api=createDreamApi({prepareSession,fetchImpl:async(path)=>{events.push(path);return Response.json(path.endsWith('interpretations')?{...semantic(),inputRevision:1}:{});}});
 assert.equal(await api.prepareDream(raw,{requestConfirmation:async()=>({decision:'accept'})}),session);
 assert.ok(events.indexOf('preflight')<events.indexOf('/api/dream-jobs'));assert.ok(events.indexOf('/api/dream-jobs')<events.indexOf('install'));
});
