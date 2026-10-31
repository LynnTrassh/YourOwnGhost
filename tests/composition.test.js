import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDream } from '../src/planning/dream.js';
import { chooseLayerContent } from '../src/planning/composition.js';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan } from '../src/planning/validate.js';

test('two-layer composition is reproducible, counts unique units and reports shortages',()=>{
  const dream=generateDream('42');
  assert.deepEqual(generateDream('42'),dream);
  assert.ok(dream.every(plan=>validatePlan(plan).valid));
  assert.ok(dream.composition.budget.restByLayer.every(Boolean));
  const majors=new Set(dream.composition.selectedUnits.filter(u=>u.role==='major').map(u=>u.narrativeUnitId));
  const shorts=new Set(dream.composition.selectedUnits.filter(u=>u.role==='short').map(u=>u.narrativeUnitId));
  assert.equal(dream.composition.budget.major.count,majors.size);
  assert.equal(dream.composition.budget.short.count,shorts.size);
  assert.equal(dream.composition.budget.major.shortfall,Math.max(0,4-majors.size));
  assert.ok(dream.composition.repeatedUnits.every(id=>dream.composition.selectedUnits
    .filter(unit=>unit.narrativeUnitId===id).length>1));
  assert.deepEqual(dream.composition.layerAssignments.map(a=>a.ids),dream.map((plan,index)=>
    dream.composition.selectedUnits.filter(u=>u.layer===index+1).map(u=>u.definitionId)));
});

test('spatial candidates are assigned once when removing repeats keeps enough coverage',()=>{
  const plans=[generatePlan('12'),generatePlan('12:dream:2:0',{catEnabled:false,threatEnabled:true})];
  const choice=chooseLayerContent(plans,'12');
  const chosen=choice.selectedIds.flat().filter(id=>id!=='B25');
  assert.equal(new Set(chosen).size,chosen.length);
  assert.ok(choice.selectedIds.every(ids=>ids.includes('B25')));
  assert.ok(choice.rejections.some(r=>r.reason==='ONE_INSTANCE_PER_RUN'));
});

test('full-room composition uses map-sized budgets instead of the old six-scene cap',()=>{
  const dream=generateDream('7');
  assert.ok(dream.every(plan=>validatePlan(plan).valid&&plan.coverage.ratio===1));
  assert.ok(dream.composition.budget.short.count<=dream.composition.budget.short.max);
  assert.ok(dream.composition.budget.major.count<=dream.composition.budget.major.max);
  const selected=dream.composition.selectedUnits.filter(unit=>unit.role==='short');
  assert.equal(new Set(selected.map(unit=>unit.narrativeUnitId)).size,dream.composition.budget.short.count);
});
