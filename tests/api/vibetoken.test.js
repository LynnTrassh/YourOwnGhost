import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVibeTokenInterpreter } from '../../server/providers/vibetoken.js';
const raw={like:'蓝色玻璃鸟，不要羽毛',fear:'被遗忘'};
const result={displaySummary:raw,entities:[{entityId:'a',role:'like',subject:'玻璃鸟',kind:'physical-object',mustPreserve:['蓝色'],excludedTraits:['羽毛']},{entityId:'b',role:'fear',subject:'被遗忘',kind:'abstract',mustPreserve:[],excludedTraits:[]}],relations:[],ambiguities:[]};
test('preserves arbitrary themes and keeps credential in server request',async()=>{
 const interpret=createVibeTokenInterpreter({apiKey:'test-secret',fetchImpl:async(url,options)=>{
 assert.equal(url,'https://vibetoken.cn/v1/chat/completions');assert.equal(options.redirect,'error');
 const request=JSON.parse(options.body);assert.deepEqual(JSON.parse(request.messages[1].content),raw);assert.equal(request.max_tokens,1600);
 return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]});}});
 assert.deepEqual(await interpret(raw),result);
});
test('does not retry or expose upstream errors',async()=>{
 let calls=0;const interpret=createVibeTokenInterpreter({apiKey:'test-secret',fetchImpl:async()=>{calls++;return new Response('test-secret',{status:401});}});
 await assert.rejects(interpret(raw),e=>e.code==='INTERPRETATION_UNAVAILABLE'&&!e.message.includes('test-secret'));assert.equal(calls,1);
});
test('rejects truncated interpretation and invented verified capabilities',async()=>{
 for(const choice of [{finish_reason:'length',message:{content:JSON.stringify(result)}},{finish_reason:'stop',message:{content:JSON.stringify({...result,entities:result.entities.map(e=>({...e,verifiedCapabilities:['walk']}))})}}]){
 const interpret=createVibeTokenInterpreter({apiKey:'test-secret',fetchImpl:async()=>Response.json({choices:[choice]})});
 await assert.rejects(interpret(raw),{code:'INVALID_INTERPRETATION'});
 }
});
