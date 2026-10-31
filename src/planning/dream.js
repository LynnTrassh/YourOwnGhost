import { generatePlan, hashSeed } from './generate.js';
import { chooseLayerContent, summarizeComposition } from './composition.js';
import { analyzeCoverage } from './coverage.js';
import { fitBedroomTrace, fitTraceFollow } from './trace-fit.js';
import { validatePlan } from './validate.js';

export function generateDream(seed,{catEnabled=true,preferences=[],threatBehaviorId=null}={}) {
  const first=generatePlan(seed,{catEnabled,preferences});
  const conditionalSlots=['B03','B04'].flatMap(definitionId=>{
    const source=first.content.instances.find(instance=>instance.definitionId===definitionId);
    if(!source)return [];
    const id=definitionId==='B03'?'B27':'B28';
    return [{id,definitionId:id,sourceInstanceId:source.instanceId,
      roomId:'bedroom',focus:{x:-.45,y:.65,z:1.2}}];
  });
  const geometry=p=>JSON.stringify([p.cells,p.doors]);
  for(let attempt=0;attempt<8;attempt++) {
    const second=generatePlan(`${seed}:dream:2:${attempt}`,{catEnabled:false,threatEnabled:true,
      threatBehaviorId,conditionalSlots,preferences});
    if(geometry(first)!==geometry(second)) {
      const selection=chooseLayerContent([first,second],seed);
      const fitted=[generatePlan(seed,{catEnabled,contentIds:selection.selectedIds[0],preferences}),
        generatePlan(`${seed}:dream:2:${attempt}`,{catEnabled:false,threatEnabled:true,
          threatBehaviorId,contentIds:selection.selectedIds[1],conditionalSlots,preferences})];
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
      const shorts=new Set(plans.flatMap(plan=>plan.content.instances
        .filter(instance=>instance.role==='short').map(instance=>instance.definitionId)));
      if(shorts.size<6) {
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
      for(const plan of plans) {
        const {planHash,...withoutHash}=plan;
        plan.planHash=hashSeed(JSON.stringify(withoutHash)).toString(16).padStart(8,'0');
      }
      return Object.assign(plans,{composition:summarizeComposition(plans,selection)});
    }
  }
  throw new Error('第二层未找到不同的合法布局');
}
