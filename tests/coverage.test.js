import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCoverage } from '../src/planning/coverage.js';
import { generatePlan } from '../src/planning/generate.js';

test('coverage counts distinct rooms and finds an empty branch bypassing main content',()=>{
  const rooms=['bedroom','a','b','c','exit'].map(id=>({id}));
  const plan={rooms,edges:[{a:'bedroom',b:'a'},{a:'a',b:'b'},{a:'a',b:'c'},{a:'b',b:'exit'},{a:'c',b:'exit'}],
    exit:{roomId:'exit'},content:{instances:[
      {roomId:'b',role:'major',definitionId:'RI01',readiness:'greybox'},
      {roomId:'b',role:'short',definitionId:'TI02',readiness:'greybox'},
    ]},story:{cat:null},threat:null};
  const report=analyzeCoverage(plan);
  assert.equal(report.covered,1);
  assert.equal(report.total,4);
  assert.equal(report.rooms.find(r=>r.roomId==='b').role,'major');
  assert.deepEqual(report.longestGap.rooms,['a','c','exit']);
  assert.equal(report.exitPaths,2);
  assert.equal(report.deficits.coverageBelowTarget,true);
  assert.equal(report.deficits.noRest,true);
  assert.equal(report.incomplete,false);
  assert.equal(analyzeCoverage(plan,{pathBudget:1}).incomplete,true);
});

test('generated coverage is deterministic and never counts an unplaced event',()=>{
  const plan=generatePlan('42');
  assert.deepEqual(plan.coverage,analyzeCoverage(plan));
  const active=new Set(plan.content.instances.map(i=>i.definitionId));
  assert.ok(plan.coverage.rooms.every(row=>row.units.every(id=>id==='CAT01'||id==='TH01'||active.has(id))));
  assert.ok(plan.coverage.covered<=plan.coverage.total);
});
