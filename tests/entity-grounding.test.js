import test from 'node:test';
import assert from 'node:assert/strict';
import {groundEntities} from '../src/personalization/entity-grounding.js';
import {validateSemantics} from '../src/personalization/contracts.js';
const entity=(role,kind,subject)=>({entityId:role+subject,role,kind,subject,mustPreserve:[],excludedTraits:[]});
test('extracts existing concrete subject and translates abstract theme into disclosed physical symbol',()=>{
  const raw={like:'音乐和面包',fear:'被遗忘'};
  const value={displaySummary:raw,entities:[entity('like','sound','音乐'),entity('like','physical-object','面包'),entity('fear','abstract','被遗忘')],relations:[],ambiguities:[]};
  const result=validateSemantics(groundEntities(value,raw));
  assert.equal(result.entities[0].subject,'面包');
  assert.equal(result.entities[1].kind,'physical-object');
  assert.equal(result.mappingNotes.find(n=>n.role==='fear').symbolic,true);
  assert.equal(result.mappingNotes.find(n=>n.role==='fear').original,'被遗忘');
  assert.deepEqual(groundEntities(result,raw),result);
});
test('preserves language-model symbolic choice, empty defaults, and discards unsupported choreography',()=>{
  const raw={like:'',fear:'失去方向'};
  const value={displaySummary:{like:'默认预设：猫',fear:'指南针'},entities:[entity('like','creature','猫'),entity('fear','physical-object','破旧指南针')],relations:[],ambiguities:['方向是什么意思'],mappingNotes:[{role:'fear',symbolic:true,original:raw.fear,subject:'破旧指南针'}]};
  const result=groundEntities(value,raw);
  assert.equal(result.entities[1].subject,'破旧指南针');assert.equal(result.mappingNotes[0].symbolic,true);
  assert.equal(result.displaySummary.like,'默认预设：猫');assert.deepEqual(result.ambiguities,[]);
});
