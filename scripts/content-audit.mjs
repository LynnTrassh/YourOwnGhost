import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { generateDream } from '../src/planning/dream.js';
import { validatePlan } from '../src/planning/validate.js';
import { selectLike } from '../src/personalization/like.js';
import { contentTokensForInputs } from '../src/personalization/content-tokens.js';

const prefix=process.argv[2]??'audit';
const count=Number(process.argv[3]??100);
const output=process.argv[4]??null;
const likeId=process.argv[5]??null;
const fearId=process.argv[6]??'generic';
if(!Number.isInteger(count)||count<1||count>1000||!/^[a-zA-Z0-9_-]+$/.test(prefix))
  throw new Error('Usage: node scripts/content-audit.mjs [safe-prefix] [count:1..1000] [output.json] [like:cat|flower|none] [fear:generic|doll|clown]');
if(likeId&&!['cat','flower','none'].includes(likeId))throw new Error('Unknown like mode');
if(!['generic','doll','clown'].includes(fearId))throw new Error('Unknown fear mode');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const rejections={},compositionRejections={},rows=[];
for(let index=0;index<count;index++) {
  const seed=`${prefix}-${String(index).padStart(3,'0')}`;
  try {
    const like=likeId?selectLike(likeId):null;
    const dream=generateDream(seed,like?{catEnabled:like.id==='cat',
      preferences:contentTokensForInputs(like.id,fearId)}:undefined);
    for(const item of dream.composition.rejections)
      compositionRejections[item.reason]=(compositionRejections[item.reason]??0)+1;
    const layers=dream.map((plan,layer)=>{
      const validation=validatePlan(plan);
      for(const item of plan.content.report) if(!item.accepted && item.reason!=='COMPOSITION_NOT_SELECTED')
        rejections[item.reason]=(rejections[item.reason]??0)+1;
      return {layer:layer+1,valid:validation.valid,errors:validation.errors,
        fallback:plan.validation.fallback,rooms:plan.coverage.total,
        coverage:{covered:plan.coverage.covered,total:plan.coverage.total,
          ratio:+plan.coverage.ratio.toFixed(3),longestGap:plan.coverage.longestGap.length,
          incomplete:plan.coverage.incomplete,deficits:plan.coverage.deficits},
        selected:plan.content.instances.map(item=>item.definitionId),
        rejected:plan.content.report.filter(item=>!item.accepted&&item.reason!=='COMPOSITION_NOT_SELECTED')
          .map(item=>({id:item.id,reason:item.reason})),
        cat:!!plan.story.cat,threat:!!plan.threat};
    });
    rows.push({seed,layers,budget:dream.composition.budget,
      repeatedUnits:dream.composition.repeatedUnits,
      conditionalSlots:dream.composition.conditionalSlots,
      compositionRejections:dream.composition.rejections});
  } catch(error) {rows.push({seed,error:String(error)});}
}
const layers=rows.flatMap(row=>row.layers??[]);
const selectedCounts={};
for(const layer of layers)for(const id of layer.selected)
  selectedCounts[id]=(selectedCounts[id]??0)+1;
const summary={seeds:count,generationFailures:rows.filter(row=>row.error).length,
  invalidLayers:layers.filter(layer=>!layer.valid).length,
  fallbackLayers:layers.filter(layer=>layer.fallback).length,
  belowCoverage:layers.filter(layer=>layer.coverage.deficits.coverageBelowTarget).length,
  longGaps:layers.filter(layer=>layer.coverage.deficits.longGap).length,
  noRest:layers.filter(layer=>layer.coverage.deficits.noRest).length,
  incompletePathSearch:layers.filter(layer=>layer.coverage.incomplete).length,
  noSecondThreat:rows.filter(row=>row.layers&&!row.layers[1].threat).length,
  photoGroupViolations:rows.filter(row=>new Set((row.layers??[]).flatMap(layer=>layer.selected)
    .filter(id=>['AB02','B05','ID03'].includes(id))).size>1).length,
  catGroupViolations:rows.filter(row=>row.layers?.some(layer=>layer.cat)
    &&row.layers.some(layer=>layer.selected.includes('AB01'))).length,
  conditionalSourceMismatches:rows.filter(row=>row.conditionalSlots?.some(slot=>!slot.sourcePlanned)).length,
  majorShortfalls:rows.filter(row=>row.budget?.major.shortfall>0).length,
  shortShortfalls:rows.filter(row=>row.budget?.short.shortfall>0).length,
  repeatedUnits:rows.filter(row=>row.repeatedUnits?.length).length,
  selectedCounts:Object.fromEntries(Object.entries(selectedCounts).sort(([a],[b])=>a.localeCompare(b))),
  rejectionReasons:Object.fromEntries(Object.entries(rejections).sort((a,b)=>b[1]-a[1])),
  compositionRejectionReasons:Object.fromEntries(Object.entries(compositionRejections).sort((a,b)=>b[1]-a[1]))};
const report={schemaVersion:1,baseCommit:git('rev-parse','--short','HEAD'),
  workingTreeDirty:!!git('status','--porcelain'),prefix,count,inputMode:likeId??'default-demo',fearMode:fearId,summary,rows};
const body=JSON.stringify(report,null,2)+'\n';
if(output) {mkdirSync(dirname(output),{recursive:true});writeFileSync(output,body);}
else process.stdout.write(body);
