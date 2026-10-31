import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeneration } from '../../src/ui/generation.js';
import { startSession } from '../../src/ui/start-session.js';
const flush=()=>new Promise(setImmediate);
const raw={like:'我喜欢红色吉他和雨声',fear:'深海里看不清的东西'};
const interpretation=(id='one')=>({interpretationId:id,inputRevision:1,semanticHash:`test:${id}`,displaySummary:{like:'红色电吉他，伴随雨声',fear:'深海中的模糊巨大存在'},ambiguities:[]});

test('provider receives explicit acceptance, raw submission alone cannot produce ready',async()=>{
 const states=[];let accept,seen,charged=false;
 const gen=createGeneration({onChange:s=>states.push(s),confirm:value=>{seen=value;return new Promise(r=>accept=r);},prepare:async(input,ctx)=>{
   assert.deepEqual(input,raw);const result=await ctx.requestConfirmation(interpretation());assert.deepEqual(result,{decision:'accept'});charged=true;return {id:'session'};
 }});
 const work=gen.run(raw);await flush();assert.equal(charged,false);assert.equal(states.some(s=>s.status==='ready'),false);
 assert.equal(seen.displaySummary.fear,'深海中的模糊巨大存在');accept({decision:'accept'});await work;
 assert.equal(charged,true);assert.equal(states.at(-1).status,'ready');
});
test('return to editing cancels pending confirmation immediately even if UI promise stays pending',async()=>{
 let outcome;const states=[];
 const gen=createGeneration({onChange:s=>states.push(s),confirm:()=>new Promise(()=>{}),prepare:async(_,ctx)=>{try{await ctx.requestConfirmation(interpretation());}catch(e){outcome=e.code;throw e;}return {};}});
 const work=gen.run(raw);await flush();gen.cancel();await work;assert.equal(outcome,'ABORTED');assert.equal(states.some(s=>s.status==='ready'),false);
});
test('late accept and progress after cancellation cannot revive a newer run',async()=>{
 const states=[],answers=[],contexts=[];
 const gen=createGeneration({onChange:s=>states.push(s),confirm:()=>new Promise(resolve=>answers.push(resolve)),prepare:async(_,ctx)=>{contexts.push(ctx);await ctx.requestConfirmation(interpretation(String(contexts.length)));return {id:contexts.length};}});
 const old=gen.run(raw);await flush();gen.cancel();const next=gen.run(raw);await flush();
 answers[0]({decision:'accept'});contexts[0].onProgress('preparing');await old;assert.equal(states.some(s=>s.status==='ready'),false);
 answers[1]({decision:'accept'});await next;assert.equal(states.at(-1).session.id,2);
});
test('same pending explanation is coalesced; repeated accepted explanation needs no second UI prompt',async()=>{
 let prompts=0,accept;const gen=createGeneration({onChange(){},confirm:()=>{prompts++;return new Promise(r=>accept=r);},prepare:async(_,ctx)=>{
  const one=ctx.requestConfirmation(interpretation()),two=ctx.requestConfirmation(interpretation());assert.equal(one,two);
  await one;await two;assert.deepEqual(await ctx.requestConfirmation(interpretation()),{decision:'accept'});return {};
 }});const run=gen.run(raw);await flush();accept({decision:'accept'});await run;assert.equal(prompts,1);
});
test('unresolved ambiguities cannot be accepted even by a broken confirmation renderer',async()=>{
 const states=[];const gen=createGeneration({onChange:s=>states.push(s),confirm:async()=>({decision:'accept'}),prepare:async(_,ctx)=>{
 await ctx.requestConfirmation({...interpretation(),ambiguities:['雨声是环境还是主体？']});return {};
 }});await gen.run(raw);assert.equal(states.at(-1).code,'AMBIGUITY_UNRESOLVED');
});
test('production provider skipping confirmation fails explicitly',async()=>{
 const states=[];const gen=createGeneration({onChange:s=>states.push(s),confirm:async()=>({decision:'accept'}),prepare:async()=>({id:'unconfirmed'})});
 await gen.run(raw);assert.equal(states.at(-1).code,'CONFIRMATION_REQUIRED');
});
test('missing confirmation renderer cannot be treated as acceptance',async()=>{
 const states=[];const gen=createGeneration({onChange:s=>states.push(s),prepare:async(_,ctx)=>{await ctx.requestConfirmation(interpretation());return {};}});
 await gen.run(raw);assert.equal(states.at(-1).code,'CONFIRMATION_REQUIRED');
});
test('provider that forgets to await confirmation fails and aborts pending prompt',async()=>{
 let aborted=false;const states=[];const gen=createGeneration({onChange:s=>states.push(s),confirm:(_,ctx)=>{ctx.signal.addEventListener('abort',()=>{aborted=true;});return new Promise(()=>{});},prepare:async(_,ctx)=>{ctx.requestConfirmation(interpretation());await flush();return {};}});
 await gen.run(raw);assert.equal(states.at(-1).code,'CONFIRMATION_REQUIRED');assert.equal(aborted,true);
});
test('different simultaneous explanations are rejected and cannot replace displayed content',async()=>{
 let accept;const gen=createGeneration({onChange(){},confirm:()=>new Promise(r=>accept=r),prepare:async(_,ctx)=>{
 const first=ctx.requestConfirmation(interpretation());await assert.rejects(ctx.requestConfirmation(interpretation('two')),{code:'CONFIRMATION_IN_PROGRESS'});await first;return {};
 }});const run=gen.run(raw);await flush();accept({decision:'accept'});await run;
});
test('malformed explanation does not open a confirmation screen',async()=>{
 let shown=false;const states=[];const gen=createGeneration({onChange:s=>states.push(s),confirm:async()=>{shown=true;return {decision:'accept'};},prepare:async(_,ctx)=>{await ctx.requestConfirmation({});return {};}});
 await gen.run(raw);assert.equal(shown,false);assert.equal(states.at(-1).code,'INVALID_INTERPRETATION');
});
test('missing start adapter fails and a real adapter receives unchanged session',async()=>{
 assert.throws(()=>startSession({},{}),{code:'START_UNAVAILABLE'});const session={opaque:'value'};let seen;
 await startSession({start:s=>{seen=s;}},session);assert.equal(seen,session);
});
