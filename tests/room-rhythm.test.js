import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDream } from '../src/planning/dream.js';
import { validatePlan } from '../src/planning/validate.js';
import { CONTENT_CATALOG } from '../src/planning/content-catalog.js';
import { analyzeCoverage } from '../src/planning/coverage.js';

test('all 57 scenes have the approved intensity classification without inventing readiness',()=>{
  assert.equal(CONTENT_CATALOG.length,57);
  const ids=kind=>CONTENT_CATALOG.filter(d=>d.roomClass===kind).map(d=>d.definitionId).sort();
  assert.deepEqual(ids('quiet'),['B25','B01','B07','ID03','ME03','BO04','AB03','B18'].sort());
  assert.deepEqual(ids('danger'),['B13','B14','B15','B16']);
  assert.deepEqual(ids('echo'),['B27','B28','IN04']);
  assert.deepEqual(ids('flow'),['B26']);
  assert.equal(CONTENT_CATALOG.filter(d=>d.readiness==='unimplemented').length,12);
});

test('normal dreams bind every room, preserve input eligibility and check all exit routes',()=>{
  for(const [seed,like,fear] of [['12','none','generic'],['42','cat','generic'],['7','flower','doll'],
    ['71','none','generic'],['1844070019','none','generic'],['16','flower','generic']]) {
    const preferences=[...(like==='none'?[]:[`like.${like}`]),...(fear==='doll'?['fear.doll']:[])];
    const dream=generateDream(seed,{catEnabled:like==='cat',preferences});
    for(const plan of dream) {
      assert.equal(plan.coverage.ratio,1,seed);
      assert.equal(plan.coverage.incomplete,false,seed);
      assert.ok(Object.values(plan.coverage.deficits).every(v=>!v),JSON.stringify(plan.coverage));
      assert.equal(validatePlan(plan).valid,true,seed);
      assert.ok(plan.coverage.rhythm.minExitEvents>=2);
      for(const instance of plan.content.instances) {
        const definition=CONTENT_CATALOG.find(d=>d.definitionId===instance.definitionId);
        assert.notEqual(definition.readiness,'unimplemented');
        assert.notEqual(definition.readiness,'preview-only');
        if(instance.definitionId==='B25') {
          assert.ok(instance.quietVariant&&instance.quietLabel);
          assert.ok(plan.obstacles.some(o=>o.id===instance.fixture.id));
        }
        if(['B01','B03'].includes(instance.definitionId))assert.equal(like,'flower');
        if(instance.definitionId==='IN02')assert.equal(fear,'doll');
      }
    }
  }
});

test('full-room validation rejects a removed scene and label-only quiet room',()=>{
  const plan=generateDream('12',{catEnabled:false})[0];
  const broken=structuredClone(plan);
  const removed=broken.content.instances.find(i=>i.role==='short');
  assert.ok(removed);
  broken.content.instances=broken.content.instances.filter(i=>i.instanceId!==removed.instanceId);
  assert.ok(validatePlan(broken).errors.includes('ROOM_RHYTHM:coverageBelowTarget'));
  const quiet=plan.content.instances.find(i=>i.definitionId==='B25');
  delete quiet.fixture;
  assert.ok(validatePlan(plan).errors.includes(`EMPTY_QUIET_LABEL:${quiet.roomId}`));
});

test('quiet-only exit, consecutive strong rooms and unbound echoes are diagnosed',()=>{
  const plan={rooms:['bedroom','a','b','c'].map(id=>({id})),edges:[{a:'bedroom',b:'a'},{a:'a',b:'b'},{a:'b',b:'c'}],
    exit:{roomId:'c'},content:{instances:['a','b','c'].map((roomId,index)=>({roomId,definitionId:`quiet-${index}`,role:'rest'}))}};
  let report=analyzeCoverage(plan);
  assert.equal(report.deficits.quietRun,true);
  assert.equal(report.deficits.exitWithoutEvents,true);
  for(const instance of plan.content.instances)instance.role='major';
  assert.equal(analyzeCoverage(plan).deficits.strongRun,true);
  plan.content.instances=[{definitionId:'IN04',roomId:'a',supportRoomId:'b',role:'short'}];
  assert.equal(analyzeCoverage(plan).covered,0);
});
