import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateDream} from '../src/planning/dream.js';
import {generatePlan} from '../src/planning/generate.js';
import {populateThemedRooms} from '../src/planning/themed-rooms.js';
import {validatePlan} from '../src/planning/validate.js';
import {THEMED_ROOM_RECIPES} from '../src/art/themed-room-recipes.js';
import {THEMED_ASSETS} from '../src/art/themed-room-assets.js';
import {Group} from 'three';
import {createThemedRoomLighting} from '../src/art/themed-room-lighting.js';

test('48 production layouts resolve reviewed models and valid support links',()=>{
 assert.equal(THEMED_ROOM_RECIPES.length,48);
 const rejected=JSON.parse(fs.readFileSync('art-source/theme-delivery-v02/manifest.json')).excluded;
 for(const theme of ['hospital','park','office','home','hotel','ritual'])assert.equal(THEMED_ROOM_RECIPES.filter(r=>r.theme===theme).length,8);
 for(const r of THEMED_ROOM_RECIPES){
  const ids=new Set(r.placements.map(p=>p.id));assert.equal(ids.size,r.placements.length);
  for(const p of r.placements){assert.ok(!rejected[p.assetId],p.assetId);assert.ok(fs.existsSync('public'+THEMED_ASSETS[p.assetId].url),p.assetId);if(p.supportKey)assert.ok(ids.has(p.supportKey));assert.ok(!p.assetId.startsWith('architecture-'),'formal portals stay world-owned');}
  const root=new Group(),owned=new Set(),light=createThemedRoomLighting({root,recipe:r,owned,ambient:false});assert.equal(light.inspect().ambient,0);for(const item of owned)item.dispose();
 }
});

test('formal themed pass preserves topology, events and protected rooms, deterministically',()=>{
 const options={openingSequence:true,activeEncounters:true};
 for(const seed of ['42','12','1844070019']){
  const before=generateDream(seed,{...options,themedRooms:false}),after=generateDream(seed,{...options,themedRooms:true});
  assert.deepEqual(after,generateDream(seed,{...options,themedRooms:true}));
  for(let i=0;i<after.length;i++){
   const a=after[i],b=before[i];for(const key of ['cells','doors','walls','edges','story','content','activeEncounters','threat','chase','spawn','exit'])assert.deepEqual(a[key],b[key],`${seed}:${key}`);
   assert.ok(validatePlan(a).valid,seed);
   for(const r of a.themedRooms.skipped.filter(r=>r.reason==='protected-scene'))assert.deepEqual(a.obstacles.filter(o=>o.roomId===r.roomId),b.obstacles.filter(o=>o.roomId===r.roomId));
   const text=JSON.stringify(a);populateThemedRooms(a);assert.equal(JSON.stringify(a),text,'idempotent');
  }
  assert.ok(after.some(p=>p.themedRooms.placed.length),seed+' should actually draw from pool');
 }
});

test('every registered layout can fit a real generated map without changing its shell',()=>{
 const source=generatePlan('42',{catEnabled:false,contentIds:[]});
 for(const recipe of THEMED_ROOM_RECIPES){const plan=structuredClone(source),before=JSON.stringify(plan.cells);const r=populateThemedRooms(plan,{recipeId:recipe.id});
  assert.ok(r.placed.some(p=>p.recipeId===recipe.id),recipe.id+' must be selectable, not a dead registration');assert.ok(validatePlan(plan).valid);assert.equal(JSON.stringify(plan.cells),before);
 }
});

test('no eligible space leaves every original obstacle untouched',()=>{
 const plan=generatePlan('42',{catEnabled:false,contentIds:[]});for(const room of plan.rooms)room.interior.finalDressing={excluded:true};
 const before=structuredClone(plan.obstacles);assert.equal(populateThemedRooms(plan).placed.length,0);assert.deepEqual(plan.obstacles,before);
});
