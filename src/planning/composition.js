import { CONTENT_CATALOG } from './content-catalog.js';
import { hashSeed } from './generate.js';

const definitions=new Map(CONTENT_CATALOG.map(entry=>[entry.definitionId,entry]));
const countFixed=plan=>Number(!!plan.story?.cat)+Number(!!plan.threat);

// Choose from spatially fitted candidates, then regenerate only the chosen scenes.
// This is a bounded selection: a shortage is reported, never filled by duplication.
export function chooseLayerContent(plans,seed) {
  const selected=[new Set(),new Set()],counts=[{major:countFixed(plans[0]),short:0,rest:0},{major:countFixed(plans[1]),short:0,rest:0}];
  const candidates=new Map(),rejections=[];
  plans.forEach((plan,layer)=>{
    for(const row of plan.content.report) if(!row.accepted)
      rejections.push({id:row.id,layer:layer+1,reason:row.reason});
    for(const instance of plan.content.instances) {
      if(instance.definitionId==='B25') {selected[layer].add(instance.definitionId);continue;}
      const rows=candidates.get(instance.definitionId)??[];
      rows.push({layer,instance});candidates.set(instance.definitionId,rows);
    }
  });
  if(plans.some(plan=>plan.story?.cat) && candidates.has('AB01')) {
    candidates.delete('AB01');rejections.push({id:'AB01',reason:'MUTUALLY_EXCLUSIVE_CAT01'});
  }
  const photoIds=['AB02','B05','ID03'].filter(id=>candidates.has(id));
  if(photoIds.length>1) {
    const ordinary=hashSeed(`${seed}:photo-choice`)%2===0?'AB02':'B05';
    const preferred=photoIds.includes('ID03')&&hashSeed(`${seed}:id03-choice`)%3===0
      ?'ID03':photoIds.includes(ordinary)?ordinary:photoIds[0];
    for(const id of photoIds)if(id!==preferred) {
      candidates.delete(id);rejections.push({id,reason:'MUTUALLY_EXCLUSIVE'});
    }
  }
  const ordered=[...candidates].sort(([a,rowsA],[b,rowsB])=>{
    const roleA=rowsA[0].instance.role,roleB=rowsB[0].instance.role;
    return (roleA==='major'?0:1)-(roleB==='major'?0:1)||rowsA.length-rowsB.length||a.localeCompare(b);
  });
  for(const [id,rows] of ordered) {
    const definition=definitions.get(id),role=rows[0].instance.role;
    if(definition.dependencies.some(dependency=>!candidates.has(dependency))) {
      rejections.push({id,reason:'DEPENDENCY_UNAVAILABLE'});continue;
    }
    if(definition.exclusions.some(exclusion=>selected.some(set=>set.has(exclusion)))) {
      rejections.push({id,reason:'MUTUALLY_EXCLUSIVE'});continue;
    }
    const limit=role==='major'?Math.ceil(plans.reduce((n,p)=>n+p.rooms.length-1,0)*.4):plans.reduce((n,p)=>n+p.rooms.length-1,0);
    const options=rows.filter(({layer})=>counts[0][role]+counts[1][role]<limit)
      .sort((a,b)=>(['B03','B04'].includes(id)&&rows.some(row=>row.layer===0)?a.layer-b.layer:0)
        ||counts[a.layer][role]-counts[b.layer][role]
        ||plans[a.layer].coverage.ratio-plans[b.layer].coverage.ratio
        ||(hashSeed(`${seed}:${id}:${a.layer}`)%2)-(hashSeed(`${seed}:${id}:${b.layer}`)%2));
    if(!options.length) {rejections.push({id,reason:'ROLE_BUDGET_FULL'});continue;}
    selected[options[0].layer].add(id);counts[options[0].layer][role]++;
    for(const alternate of rows) if(alternate.layer!==options[0].layer)
      rejections.push({id,layer:alternate.layer+1,reason:'ONE_INSTANCE_PER_RUN'});
  }
  return {selectedIds:selected.map(set=>[...set]),rejections};
}

export function summarizeComposition(plans,selection) {
  const selectedUnits=[],rejections=selection.rejections.filter(row=>row.reason!=='ONE_INSTANCE_PER_RUN'
    ||!plans[row.layer-1].content.instances.some(instance=>instance.definitionId===row.id));
  plans.forEach((plan,index)=>{
    const layer=index+1;
    for(const instance of plan.content.instances) {
      const definition=definitions.get(instance.definitionId);
      selectedUnits.push({definitionId:instance.definitionId,narrativeUnitId:definition.narrativeUnitId,
        layer,roomId:instance.roomId,role:definition.roomClass==='echo'?'echo':instance.role,sourcePolicy:definition.sourcePolicy});
    }
    if(plan.story?.cat) selectedUnits.push({definitionId:'CAT01',narrativeUnitId:'CAT01',layer,
      roomId:plan.story.cat.roomId,role:'major',sourcePolicy:'fixed-test'});
    if(plan.threat) selectedUnits.push({definitionId:plan.chase?'B13-B16':plan.threat.behaviorId==='hearing-investigator'?'TH02'
      :plan.threat.behaviorId==='light-avoider'?'TH03':'TH01',
      narrativeUnitId:plan.chase?'B13-B16':plan.threat.behaviorId==='hearing-investigator'?'TH02'
        :plan.threat.behaviorId==='light-avoider'?'TH03':'TH01',layer,
      roomId:plan.threat.roomId,role:'major',sourcePolicy:'builtin-threat'});
    for(const [kind,id] of [['puzzle','AP01'],['scare','AS01']]) {
      const group=plan.activeEncounters?.[kind];
      if(group)selectedUnits.push({definitionId:id,narrativeUnitId:id,layer,roomId:group.roomIds[0],
        roomIds:group.roomIds,role:'short',sourcePolicy:'authored-active-group'});
    }
    for(const row of plan.content.report) if(!row.accepted&&row.reason!=='COMPOSITION_NOT_SELECTED')
      rejections.push({id:row.id,layer,reason:row.reason});
  });
  const major=new Set(selectedUnits.filter(unit=>unit.role==='major').map(unit=>unit.narrativeUnitId)).size;
  const short=new Set(selectedUnits.filter(unit=>unit.role==='short').map(unit=>unit.narrativeUnitId)).size;
  const repeatedUnits=[...new Set(selectedUnits.map(unit=>unit.narrativeUnitId))]
    .filter(id=>id!=='B25'&&selectedUnits.filter(unit=>unit.narrativeUnitId===id).length>1);
  const rests=plans.map(plan=>plan.content.instances.some(instance=>instance.role==='rest'));
  return {selectedUnits,layerAssignments:plans.map((plan,index)=>({layer:index+1,
      ids:selectedUnits.filter(unit=>unit.layer===index+1).map(unit=>unit.definitionId)})),
    repeatedUnits,dependencies:selectedUnits.flatMap(unit=>(definitions.get(unit.definitionId)?.dependencies??[])
      .map(requires=>({id:unit.definitionId,requires}))),
    conditionalSlots:(plans[1].content.conditionalSlots??[]).map(slot=>({id:slot.id,layer:2,
      sourceInstanceId:slot.sourceInstanceId,roomId:slot.roomId,
      sourcePlanned:plans[0].content.instances.some(instance=>instance.instanceId===slot.sourceInstanceId)})),rejections,
    budget:{major:{count:major,min:4,max:Math.ceil(plans.reduce((n,p)=>n+p.rooms.length-1,0)*.4),shortfall:Math.max(0,4-major)},
      short:{count:short,min:4,max:plans.reduce((n,p)=>n+p.rooms.length-1,0),shortfall:Math.max(0,4-short)},restByLayer:rests},
    selectionReason:'FULL_ROOM_INTENSITY_RHYTHM'};
}

// Final completion must not undo the exclusions/uniqueness of the selector.
export function validateComposition(plans) {
  const ids=plans.flatMap(plan=>plan.content.instances.map(i=>i.definitionId));
  const errors=[];
  for(const id of new Set(ids)) {
    if(id!=='B25'&&ids.filter(value=>value===id).length>1)errors.push(`REPEATED_UNIT:${id}`);
    for(const other of definitions.get(id)?.exclusions??[])
      if(ids.includes(other))errors.push(`EXCLUDED_PAIR:${id}:${other}`);
  }
  if(plans.some(plan=>plan.story?.cat)&&ids.includes('AB01'))errors.push('CAT_GROUP_CONFLICT:AB01');
  return [...new Set(errors)];
}
