import test from 'node:test';
import assert from 'node:assert/strict';
import {createDreamJobs} from '../../server/dream-jobs.js';
const cat={id:'cat-tabby',species:'cat',status:'ready',url:'/art/animals-v01/cat-tabby.glb',sha256:'a'.repeat(64)};
function setup(subjects,enabled=true){
 const entities=subjects.map((subject,i)=>({entityId:String(i),role:i?'fear':'like',subject,kind:'creature',mustPreserve:[],excludedTraits:[]}));
 const calls=[];
 const ledger={current(){return {confirmation:'confirmed',result:JSON.stringify({entities,relations:[],semanticHash:'hash'}),raw:JSON.stringify({like:subjects[0],fear:subjects[1]??''})};},db:{prepare(){return {all:()=>[],get:()=>({total:0})};}}};
 const modelJobs=enabled?{provider:{},allowText:true,budgetId:'test',textCreditCeiling:50,maxCredits:50,create(_owner,item){calls.push(item.entityId);return {jobId:'job'};}}:null;
 return {calls,create:()=>createDreamJobs({ledger,modelJobs,animalPresets:[cat]})('owner',{inputRevision:1,confirmationId:'confirmed'})};
}
test('all local works with provider disabled and creates zero paid jobs',()=>{
 const s=setup(['猫','小猫'],false),m=s.create();assert.deepEqual(m.models.map(x=>x.localPresetId),['cat-tabby','cat-tabby']);assert.deepEqual(s.calls,[]);
});
test('mixed manifest spends only for unmatched subject and retains job id',()=>{
 const s=setup(['猫','狗']),m=s.create();assert.equal(m.models[0].localPresetId,'cat-tabby');assert.equal(m.models[1].jobId,'job');assert.deepEqual(s.calls,['1']);
});
test('specific appearance is not replaced with generic local animal',()=>{
 const s=setup(['黑猫']),m=s.create();assert.equal(m.models[0].localPresetId,undefined);assert.deepEqual(s.calls,['0']);
});
