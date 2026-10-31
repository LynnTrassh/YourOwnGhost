import test from 'node:test';
import assert from 'node:assert/strict';
import { planDream } from '../src/planning/client.js';

test('completed default maps are reused without sharing mutable run state',async()=>{
  const previous=globalThis.Worker;let calls=0;
  globalThis.Worker=class {
    postMessage({seed,options}){calls++;queueMicrotask(()=>this.onmessage({data:{plans:[{seed,options,mutable:0}]}}));}
    terminate(){}
  };
  try {
    const options={catEnabled:true,preferences:['like.cat'],activeEncounters:true};
    const first=await planDream('cache-test',options);first[0].mutable=9;
    const second=await planDream('cache-test',options);
    assert.equal(calls,1);assert.equal(second[0].mutable,0);
    second[0].options.preferences.push('mutated');
    assert.deepEqual((await planDream('cache-test',options))[0].options.preferences,['like.cat']);
    await planDream('cache-test',{...options,catEnabled:false});assert.equal(calls,2);
  } finally {if(previous===undefined)delete globalThis.Worker;else globalThis.Worker=previous;}
});
