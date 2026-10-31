import test from 'node:test';
import assert from 'node:assert/strict';
import {DreamLedger} from '../../server/ledger.js';
import {ModelJobs} from '../../server/model-jobs.js';
import {createDreamJobs} from '../../server/dream-jobs.js';
function setup({maxCredits=100,kind='physical-object',raw={like:'玻璃鸟',fear:'面具'}}={}){
 const ledger=new DreamLedger(),d=ledger.begin('owner',raw);
 const i=ledger.interpret('owner',d.revision,{displaySummary:{like:'玻璃鸟',fear:'面具'},entities:['like','fear'].map(role=>({entityId:role,role,subject:role==='like'?'玻璃鸟':'面具',kind,mustPreserve:[],excludedTraits:[]})),relations:[],ambiguities:[]});
 const confirmation=ledger.confirm('owner',d.revision,i.interpretationId,i.semanticHash);let submissions=0;
 const modelJobs=new ModelJobs({ledger,provider:{version:'fixture',submitText:async()=>`fixture-task-${++submissions}`,query:async()=>({status:'success',creditsConsumed:20,modelUrl:'fixture'})},store:{download:async()=>({sha256:'a'.repeat(64),assetId:'fixture'})},allowText:true,maxCredits,budgetId:'fixture',textCreditCeiling:50,pollMs:0});
 return {ledger,modelJobs,confirmation,create:createDreamJobs({ledger,modelJobs}),count:()=>submissions,async close(){await modelJobs.close();ledger.close();}};
}
test('whole theme set preflights budget before any paid submission',async()=>{
 const s=setup({maxCredits:50});try{assert.throws(()=>s.create('owner',s.confirmation),{code:'BUDGET_REQUIRED'});assert.equal(s.count(),0);}finally{await s.close();}
});
test('confirmed open subjects create stable model jobs and never report world ready',async()=>{
 const s=setup();try{const a=s.create('owner',s.confirmation),b=s.create('owner',s.confirmation);assert.deepEqual(a,b);await Promise.all(s.modelJobs.running.values());assert.equal(s.count(),2);assert.equal(a.worldReady,false);assert.equal(a.models.length,2);
 assert.throws(()=>s.create('other',s.confirmation),{code:'STALE_REVISION'});
 }finally{await s.close();}
});
test('abstract themes refuse static substitution and blank roles cost no model task',async()=>{
 const a=setup({kind:'abstract'});try{assert.throws(()=>a.create('owner',a.confirmation),{code:'THEME_ADAPTER_REQUIRED'});assert.equal(a.count(),0);}finally{await a.close();}
 const b=setup({raw:{like:'',fear:'面具'},maxCredits:50});try{const m=b.create('owner',b.confirmation);assert.deepEqual(m.defaults,['like']);assert.equal(m.models.length,1);assert.equal(m.models[0].role,'fear');}finally{await b.close();}
});
