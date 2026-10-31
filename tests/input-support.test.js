import test from 'node:test';
import assert from 'node:assert/strict';
import {inputSupportIssue} from '../src/personalization/input-support.js';
const entity=(role,kind='physical-object')=>({role,kind,subject:'面具',mustPreserve:['白色'],excludedTraits:[]});
test('static input gate accepts one subject each and ignores blank default roles',()=>{
  assert.equal(inputSupportIssue({entities:[entity('like'),entity('fear')],relations:[]},{like:'鸟',fear:'面具'}),'');
  assert.equal(inputSupportIssue({entities:[entity('like','sound'),entity('fear')],relations:[]},{like:'',fear:'面具'}),'');
});
test('static input gate rejects audio, motion relations, multiple subjects and oversized recipes before confirmation',()=>{
  for(const value of [
    {entities:[entity('like','sound')],relations:[]},
    {entities:[entity('like')],relations:[{type:'part-of'}]},
    {entities:[entity('like'),entity('like')],relations:[]},
    {entities:[{...entity('like'),subject:'a'.repeat(1025)}],relations:[]}
  ])assert.ok(inputSupportIssue(value,{like:'描述',fear:''}));
});
