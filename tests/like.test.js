import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretLike, selectLike } from '../src/personalization/like.js';
import { generateDream } from '../src/planning/dream.js';
import { validatePlan } from '../src/planning/validate.js';
import { createState } from '../src/state.js';

test('local like input accepts one confirmed identity and rejects unknown or compound claims',()=>{
  assert.equal(interpretLike('我喜欢猫').selection.id,'cat');
  assert.equal(interpretLike('我喜欢 猫').selection.id,'cat');
  assert.equal(interpretLike('鲜花').selection.id,'flower');
  for(const raw of ['','我不喜欢猫','喜欢猫和花','喜欢音乐','喜欢人偶'])
    assert.equal(interpretLike(raw).selection,undefined);
  assert.deepEqual(selectLike('none').tokens,[]);
  assert.deepEqual(selectLike('cat').tokens,['like.cat']);
  assert.deepEqual(selectLike('flower').tokens,['like.flower']);
  assert.throws(()=>selectLike('spider'));
});

test('confirmed cat input gates the cat scene while skipped input keeps two legal layers',()=>{
  const matched=generateDream('12',{catEnabled:true});
  const skipped=generateDream('12',{catEnabled:false});
  assert.ok(matched[0].story.cat);
  assert.equal(skipped[0].story.cat,null);
  assert.ok(matched.every(plan=>validatePlan(plan).valid));
  assert.ok(skipped.every(plan=>validatePlan(plan).valid));
  const state=createState(matched[0],'doll','cat',1);
  assert.equal(state.input.confirmed,true);
  assert.equal(state.input.version,1);
  assert.deepEqual(state.like.tokens,['like.cat']);
  const unresolved=createState(skipped[0]);
  assert.equal(unresolved.input.confirmed,false);
});
