import { generatePlan, hashSeed } from './generate.js';
import { chooseLayerContent, summarizeComposition } from './composition.js';
import { analyzeCoverage } from './coverage.js';
import { fitBedroomTrace, fitTraceFollow } from './trace-fit.js';
import { validatePlan } from './validate.js';
import { completeRoomContent } from './room-rhythm.js';
import { completeFinalRoomInteriors } from './interiors.js';
import { fitActiveEncounters } from './active-fit.js';

export function generateDream(seed,options={}) {
  const attempts=[];
  for(let attempt=0;attempt<8;attempt++) {
    const compositionSeed=attempt?`${seed}:rhythm:${attempt}`:String(seed);
    try {
      const plans=composeDream(compositionSeed,options);
      plans.composition.rhythmGeneration={requestedSeed:String(seed),compositionSeed,attempt,rejections:attempts};
      return plans;
    } catch(error) {
      if(!/内容编排校验失败|安静房缺少真实可见构图|追逐空间未能|主动玩法未能/.test(error.message))throw error;
      attempts.push({compositionSeed,reason:error.message});
    }
  }
  throw new Error(`无法生成完整内容与合格节奏：${attempts.map(a=>a.reason).join('；')}`);
}

function composeDream(seed,{catEnabled=true,preferences=[],threatBehaviorId=null,activeEncounters=false}={}) {
  const first=generatePlan(seed,{catEnabled,preferences,threatEnabled:activeEncounters,rhythmEnabled:true});
  const conditionalSlots=['B03','B04'].flatMap(definitionId=>{
    const source=first.content.instances.find(instance=>instance.definitionId===definitionId);
    if(!source)return [];
    const id=definitionId==='B03'?'B27':'B28';
    return [{id,definitionId:id,sourceInstanceId:source.instanceId,
      roomId:'bedroom',focus:{x:-.45,y:.65,z:1.2}}];
  });
  const geometry=p=>JSON.stringify([p.cells,p.doors]);
  for(let attempt=0;attempt<8;attempt++) {
    const second=generatePlan(`${seed}:dream:2:${attempt}`,{catEnabled:false,threatEnabled:!activeEncounters||Boolean(threatBehaviorId),chaseEnabled:activeEncounters&&!threatBehaviorId,
      threatBehaviorId,conditionalSlots,preferences,rhythmEnabled:true});
    if(geometry(first)!==geometry(second)) {
      const selection=chooseLayerContent([first,second],seed);
      const fitted=[generatePlan(seed,{catEnabled,contentIds:selection.selectedIds[0],preferences,threatEnabled:activeEncounters,rhythmEnabled:true}),
        generatePlan(`${seed}:dream:2:${attempt}`,{catEnabled:false,threatEnabled:!activeEncounters||Boolean(threatBehaviorId),chaseEnabled:activeEncounters&&!threatBehaviorId,
          threatBehaviorId,contentIds:selection.selectedIds[1],conditionalSlots,preferences,rhythmEnabled:true})];
      const plans=[first,second].map((raw,index)=>{
        if(geometry(raw)!==geometry(fitted[index])) {
          selection.rejections.push({layer:index+1,reason:'LAYOUT_CHANGED_ON_REFIT'});
          return raw;
        }
        const selected=new Set(selection.selectedIds[index]);
        const excludedHard=raw.content.instances.some(instance=>
          ['AB01','AB02','B05','ID03','B01','B03','B18'].includes(instance.definitionId)
          &&!selected.has(instance.definitionId));
        if(excludedHard)return fitted[index];
        if(fitted[index].coverage.ratio<.6 && fitted[index].coverage.covered<raw.coverage.covered) {
          selection.rejections.push({layer:index+1,reason:'COVERAGE_REGRESSION_ON_REFIT'});
        }
        return fitted[index];
      });
      plans[1].content.conditionalSlots=conditionalSlots.flatMap(slot=>{
        const sourceId=slot.id==='B27'?'B03':'B04';
        const finalSource=plans[0].content.instances.find(instance=>instance.definitionId===sourceId);
        return finalSource?[{...slot,sourceInstanceId:finalSource.instanceId,focus:{...slot.focus}}]:[];
      });
      // Source-bound echoes do not consume the short-event budget.
      {
        const trace=fitTraceFollow(plans[0]);
        const bedroom=trace&&fitBedroomTrace(plans[1],trace);
        if(bedroom) {
          plans[1].content.conditionalSlots.push(bedroom);
          if(validatePlan(plans[1]).valid) {
            plans[0].content.instances.push(trace);
            plans[0].content.report.push({id:'IN04',accepted:true,roomId:trace.roomId,
              supportRoomId:trace.supportRoomId,reason:'SOURCE_BOUND_CONDITIONAL'});
            plans[0].coverage=analyzeCoverage(plans[0]);
          } else plans[1].content.conditionalSlots.pop();
        }
      }
      completeRoomContent(plans,seed);
      // Refit can add a source scene; derive its echo from the FINAL first layer.
      plans[1].content.conditionalSlots=[
        ...plans[1].content.conditionalSlots.filter(slot=>!['B27','B28'].includes(slot.id)),
        ...['B03','B04'].flatMap(definitionId=>{
          const source=plans[0].content.instances.find(i=>i.definitionId===definitionId);
          if(!source)return [];
          const id=definitionId==='B03'?'B27':'B28';
          return [{id,definitionId:id,sourceInstanceId:source.instanceId,roomId:'bedroom',focus:{x:-.45,y:.65,z:1.2}}];
        }),
      ];
      // Fit interactive encounters against the final furniture footprint, so
      // late dressing cannot cover the fuse, control, or corridor sightline.
      for(const plan of plans)completeFinalRoomInteriors(plan);
      if(activeEncounters) {
        plans[0].activeEncounters=fitActiveEncounters(plans[0]);
        if(!plans[0].threat||!plans[0].activeEncounters.puzzle||!plans[0].activeEncounters.scare)
          throw new Error('主动玩法未能完整落位');
      }
      for(const plan of plans) {
        plan.coverage=analyzeCoverage(plan);
        const validation=validatePlan(plan);
        if(!validation.valid)throw new Error(`内容编排校验失败：${validation.errors.join('、')}`);
        const {planHash,...withoutHash}=plan;
        plan.planHash=hashSeed(JSON.stringify(withoutHash)).toString(16).padStart(8,'0');
      }
      return Object.assign(plans,{composition:summarizeComposition(plans,selection)});
    }
  }
  throw new Error('第二层未找到不同的合法布局');
}
