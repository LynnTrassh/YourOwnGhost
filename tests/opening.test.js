import test from 'node:test';
import assert from 'node:assert/strict';
import {growTopology,roomRoute} from '../src/planning/topology.js';
import {generatePlan} from '../src/planning/generate.js';
import {validatePlan} from '../src/planning/validate.js';
import {THEME_RULES} from '../src/personalization/theme-rules.js';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('opening is bedroom, straight corridor, random third room; every later route traverses all three',()=>{
 const shapes=new Set();
 for(let seed=1;seed<=12;seed++){
   const p=growTopology(rng(seed),rng(seed+100),{openingSequence:true});
   assert.deepEqual(p.opening.roomIds,['bedroom','room-1','room-2']);
   assert.equal(p.rooms[1].type,'strip');assert.equal(p.rooms[1].rotation,0);assert.equal(p.rooms[1].cells.length,27);
   shapes.add(`${p.rooms[2].type}:${p.rooms[2].rotation}`);
   for(const r of p.rooms.slice(2))assert.deepEqual(roomRoute(p.rooms,p.edges,'bedroom',r.id).slice(0,3),p.opening.roomIds);
 }
 assert.ok(shapes.size>1,'third room must remain random');
});
test('opening content is drawn from non-generative scripts and illegal bindings are rejected',()=>{
 const p=generatePlan('12',{openingSequence:true,catEnabled:false,preferences:['like.static-model','fear.static-model']});
 assert.equal(validatePlan(p).valid,true);
 const themed=new Set(THEME_RULES.filter(r=>r.role).map(r=>r.definitionId));
 assert.ok(p.content.instances.filter(i=>p.opening.roomIds.includes(i.roomId)).every(i=>!themed.has(i.definitionId)));
 const corrupted=structuredClone(p);corrupted.generatedThemes=[{roomId:'room-2'}];
 assert.ok(validatePlan(corrupted).errors.includes('GENERATED_THEME_IN_OPENING'));
 const shortcut=structuredClone(p);shortcut.edges.push({id:'illegal',a:'room-1',b:'room-3'});
 assert.ok(validatePlan(shortcut).errors.includes('INVALID_OPENING_SEQUENCE'));
});
