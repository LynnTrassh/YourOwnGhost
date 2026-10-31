import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {generateDream} from '../../src/planning/dream.js';
import {completeFinalRoomInteriors} from '../../src/planning/interiors.js';
import {validatePlan} from '../../src/planning/validate.js';
import {PREFAB_ASSETS} from '../../src/art/interior-catalog.js';
const audit=[];
for(const [seed,preferences] of [['1844070019',[]],['7',['fear.doll']],['19',['like.flower']]]) {
  const plans=generateDream(seed,{catEnabled:false,preferences});
  for(const [layer,plan] of plans.entries()) {
    const integrated=JSON.stringify(plan);
    const added=new Set(plan.obstacles.filter(b=>b.compositionGroup).map(b=>b.id));
    plan.obstacles=plan.obstacles.filter(b=>!added.has(b.id));
    for(const room of plan.rooms) {
      room.interior.obstacleIds=room.interior.obstacleIds.filter(id=>!added.has(id));
      delete room.interior.finalDressing;
    }
    const before=JSON.stringify([plan.story,plan.content,plan.threat,plan.chase]);
    const rooms=completeFinalRoomInteriors(plan);
    assert.equal(JSON.stringify(plan),integrated,'final dream integration must match the independently repeated pass');
    assert.equal(JSON.stringify([plan.story,plan.content,plan.threat,plan.chase]),before,'must preserve all authored events');
    const validation=validatePlan(plan);assert.equal(validation.valid,true,validation.errors.join(','));
    for(const b of plan.obstacles.filter(b=>b.compositionGroup)) {
      assert.ok(PREFAB_ASSETS[b.prefabId],`missing asset mapping ${b.prefabId}`);
      for(const a of [...plan.obstacles,...plan.walls])if(a!==b)assert.ok(
        !(a.minX<b.maxX-1e-6&&a.maxX>b.minX+1e-6&&a.minZ<b.maxZ-1e-6&&a.maxZ>b.minZ+1e-6),`overlap ${a.id} / ${b.id}`);
    }
    const once=JSON.stringify(plan);completeFinalRoomInteriors(plan);assert.equal(JSON.stringify(plan),once,'idempotent final dressing');
    audit.push({seed,preferences,layer:layer+1,validation:'pass',eventsUnchanged:true,rooms});
  }
}
writeFileSync(new URL('./audit.json',import.meta.url),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify(audit.map(a=>({seed:a.seed,layer:a.layer,rooms:a.rooms.length,added:a.rooms.reduce((n,r)=>n+r.placed-r.before,0),shortfalls:a.rooms.filter(r=>r.shortfall&&!r.excluded).map(r=>({room:r.roomId,placed:r.placed,target:r.target}))})),null,2));
