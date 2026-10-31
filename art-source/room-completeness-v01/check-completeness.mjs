import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {generatePlan} from '../../src/planning/generate.js';
import {completeRoomInteriors} from '../../src/planning/interiors.js';
import {validatePlan} from '../../src/planning/validate.js';

const report={seeds:20,rooms:0,ordinary:0,preserved:0,minFurniture:Infinity,maxFurniture:0,shortfalls:[]};
for(let seed=0;seed<report.seeds;seed++) {
  const plan=generatePlan(String(seed));
  const before=JSON.stringify([plan.story,plan.content,plan.threat,plan.chase]);
  completeRoomInteriors(plan);
  assert.equal(JSON.stringify([plan.story,plan.content,plan.threat,plan.chase]),before,'dressing must not change fitted events');
  assert.equal(validatePlan(plan).valid,true,`seed ${seed}: ${validatePlan(plan).errors}`);
  const once=JSON.stringify(plan);completeRoomInteriors(plan);assert.equal(JSON.stringify(plan),once,'idempotent finalization');
  for(const room of plan.rooms) {
    report.rooms++;
    if(room.id==='bedroom'||room.interior.completeness.preserved){report.preserved++;continue;}
    report.ordinary++;
    const objects=plan.obstacles.filter(b=>b.roomId===room.id);
    assert.ok(objects.length>=4,`room ${seed}/${room.id} needs functional furniture`);
    for(const a of objects)for(const b of [...plan.walls,...objects]) {
      if(a===b)continue;
      assert.ok(!(a.minX<b.maxX-1e-6&&a.maxX>b.minX+1e-6&&a.minZ<b.maxZ-1e-6&&a.maxZ>b.minZ+1e-6),`overlap ${seed}/${a.id}`);
    }
    report.minFurniture=Math.min(report.minFurniture,objects.length);report.maxFurniture=Math.max(report.maxFurniture,objects.length);
    if(room.interior.completeness.missing.length)report.shortfalls.push({seed,room:room.id,shape:room.type,...room.interior.completeness});
  }
}
writeFileSync(new URL('./reviews/planning-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
