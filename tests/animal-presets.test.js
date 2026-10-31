import test from 'node:test';
import assert from 'node:assert/strict';
import {matchAnimalPreset,ANIMAL_PRESETS} from '../src/personalization/animal-presets.js';
const cat={id:'cat-tabby',species:'cat',status:'ready',url:'/art/animals-v01/cat-tabby.glb',sha256:'a'.repeat(64),supportedTraits:[]};
const entity=subject=>({subject,kind:'creature',role:'fear',mustPreserve:[],excludedTraits:[]});
test('generic animal aliases use verified local model for either role',()=>{
 for(const subject of ['猫','小猫','Cat','一只猫。']) assert.equal(matchAnimalPreset(entity(subject),[cat]),cat);
 assert.equal(matchAnimalPreset({...entity('猫'),role:'like'},[cat]),cat);
});
test('compound entities, unknown variants, and constraints never silently lose semantics',()=>{
 for(const subject of ['猫耳女孩','熊猫','猫和狗','黑猫','长着人脸的猫','catfish'])assert.equal(matchAnimalPreset(entity(subject),[cat]),null);
 assert.equal(matchAnimalPreset({...entity('猫'),mustPreserve:['黑色']},[cat]),null);
 assert.equal(matchAnimalPreset({...entity('猫'),excludedTraits:['条纹']},[cat]),null);
 assert.equal(matchAnimalPreset({...entity('猫'),kind:'person'},[cat]),null);
});
test('missing, unreviewed, and invalid assets never skip generation',()=>{
 assert.equal(matchAnimalPreset(entity('猫'),[]),null);
 for(const patch of [{status:'concept'},{sha256:''},{url:'https://example.com/cat.glb'}])assert.equal(matchAnimalPreset(entity('猫'),[{...cat,...patch}]),null);
});
