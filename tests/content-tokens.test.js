import test from 'node:test';
import assert from 'node:assert/strict';
import { contentTokensForInputs } from '../src/personalization/content-tokens.js';
import { contentEligibility } from '../src/planning/content-catalog.js';

test('only confirmed supported inputs unlock their corresponding content tokens',()=>{
  assert.deepEqual(contentTokensForInputs('none','generic'),[]);
  assert.deepEqual(contentTokensForInputs('flower','generic'),['like.flower']);
  assert.deepEqual(contentTokensForInputs('none','doll'),['fear.doll']);
  assert.deepEqual(contentTokensForInputs('cat','clown'),['like.cat']);
  assert.equal(contentEligibility('B01',{preferences:contentTokensForInputs('none','doll')}).reason,
    'PREFERENCE_UNCONFIRMED');
  assert.deepEqual(contentEligibility('IN02',{preferences:contentTokensForInputs('none','clown')}).reasons,
    ['PREFERENCE_UNCONFIRMED']);
  assert.equal(contentEligibility('IN02',{preferences:contentTokensForInputs('none','doll')}).accepted,true);
  assert.throws(()=>contentTokensForInputs('none','spider'));
});
