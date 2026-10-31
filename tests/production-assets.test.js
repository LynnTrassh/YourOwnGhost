import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectGlb} from '../src/assets/glb-contract.js';
import {ANIMAL_PRESETS,matchAnimalPreset} from '../src/personalization/animal-presets.js';
test('published animal presets are embedded GLBs with current hashes',()=>{
 for(const asset of ANIMAL_PRESETS){const bytes=readFileSync(new URL('../public'+asset.url,import.meta.url));inspectGlb(bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);}
});
test('actual interpreter anatomy traits still match cat and dog without ignoring color',()=>{
 for(const [subject,traits,id] of [['猫',['毛','耳','须','尾'],'cat-tabby'],['狗',['毛','耳','口鼻','尾'],'dog-brown']]){
  const entity={subject,kind:'creature',mustPreserve:traits,excludedTraits:[]};assert.equal(matchAnimalPreset(entity)?.id,id);
  assert.equal(matchAnimalPreset({...entity,mustPreserve:[...traits,'粉红色']}),null);
  assert.equal(matchAnimalPreset({...entity,mustPreserve:[subject+'的基本外观特征']})?.id,id);
  assert.equal(matchAnimalPreset({...entity,mustPreserve:[subject+'的黑色外观特征']}),null);
 }
});
test('fixed gameplay models conform to intake and threat remains inside body envelope',()=>{
 for(const id of ['control-cabinet','ceramic-fuse','watcher-effigy','dry-flower-vase'])inspectGlb(readFileSync(new URL(`../public/art/gameplay-production-v01/${id}.glb`,import.meta.url)));
 const d=JSON.parse(readFileSync(new URL('../public/art/gameplay-production-v01/watcher-effigy.glb.inspection.json',import.meta.url)));
 assert.ok(d.runtimeBounds.size[0]<=.480001);assert.ok(d.runtimeBounds.size[2]<=.480001);assert.ok(Math.abs(d.runtimeBounds.size[1]-1.68)<1e-6);
});
