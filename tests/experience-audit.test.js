import test from 'node:test';
import assert from 'node:assert/strict';
import {createStoryState,stepContent} from '../src/story/runtime.js';
import {validateComposition} from '../src/planning/composition.js';
import {generateDream} from '../src/planning/dream.js';
import {validatePlan} from '../src/planning/validate.js';
const view={x:0,z:0,y:1.65,yaw:0,pitch:0};
const planFor=instance=>({cellSize:5,rooms:[{id:'r'},{id:'out'}],cells:[{x:0,z:0,roomId:'r'},{x:2,z:0,roomId:'out'}],content:{instances:[{roomId:'r',instanceId:'test',...instance}],conditionalSlots:[]}});

test('mirror and monitor observation cannot accumulate across departures; mirror comparison follows mirror first',()=>{
  for(const definitionId of ['ME01','ME03']) {
    const plan=planFor({definitionId,focus:{x:0,y:1.65,z:-3},chairFocus:{x:3,y:1.65,z:0},fixture:{id:'chair'},chairSlots:[]});
    const state=createStoryState();
    stepContent(plan,state,view,.5,[]);stepContent(plan,state,{...view,x:10},.1,[]);stepContent(plan,state,view,.4,[]);
    assert.ok(!state.instances.test.mirrorSeen&&!state.instances.test.screenSeen);
    if(definitionId==='ME01'){
      stepContent(plan,state,{...view,yaw:-Math.PI/2},.9,[]);
      assert.ok(!state.instances.test.chairSeen);
    }
  }
});
test('two repeated loops need sustained observation, not unrelated glimpses',()=>{
  const plan=planFor({definitionId:'TI02',focus:{x:0,y:1.75,z:-3}}),state=createStoryState();
  stepContent(plan,state,view,2.1,[]);stepContent(plan,state,{...view,yaw:Math.PI},.1,[]);stepContent(plan,state,view,2.1,[]);
  assert.equal(state.instances.test.phase,'waiting');
  stepContent(plan,state,view,2,[]);assert.equal(state.instances.test.phase,'twoLoopsSeen');
});
test('final composition rejects cross-layer repeats and excluded photo scenes',()=>{
  const p=id=>({content:{instances:[{definitionId:id}]}});
  assert.ok(validateComposition([p('B06'),p('B06')]).includes('REPEATED_UNIT:B06'));
  assert.ok(validateComposition([p('B05'),p('ID03')]).some(e=>e.startsWith('EXCLUDED_PAIR')));
  assert.deepEqual(validateComposition([p('B25'),p('B25')]),[]);
});
test('actual exploration puzzle rejects local supplies, leaked answers and wrong starting answers',()=>{
  const plan=generateDream('audit1',{openingSequence:true,catEnabled:false,activeEncounters:true})[0];
  assert.ok(plan.activeEncounters.puzzle);assert.equal(validatePlan(plan).valid,true);
  const broken=structuredClone(plan),p=broken.activeEncounters.puzzle;
  p.fuse={...p.control,roomId:p.roomIds[0]};p.supplyRoomId=p.roomIds[0];p.initial=p.target;
  const errors=validatePlan(broken).errors;
  assert.ok(errors.includes('ACTIVE_SUPPLY_NOT_BRANCH'));assert.ok(errors.includes('ACTIVE_SUPPLY_TOO_CLOSE'));
  assert.ok(errors.includes('ACTIVE_TRIVIAL_ANSWER'));
});

test('tracking heads require an uninterrupted first look',()=>{
  const plan=planFor({definitionId:'B08',focus:{x:0,y:1.65,z:-3},observation:{x:0,z:0},arrangement:{right:{x:1,z:0}}}),state=createStoryState();
  stepContent(plan,state,view,.3,[]);stepContent(plan,state,{...view,yaw:Math.PI},.1,[]);stepContent(plan,state,view,.3,[]);
  assert.equal(state.instances.test.phase,'waiting');
  stepContent(plan,state,view,.21,[]);assert.equal(state.instances.test.phase,'observed');
});
