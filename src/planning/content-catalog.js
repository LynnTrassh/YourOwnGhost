// A definition being listed never implies that it is ready to enter a run.
const ids = [
  ...Array.from({length:28},(_,i)=>`B${String(i+1).padStart(2,'0')}`),
  ...['ID','ME','IN','RI','BO','TI','AB'].flatMap(prefix=>Array.from({length:4},(_,i)=>`${prefix}0${i+1}`)),
  'CAT01',
];
const required = new Map([['CAT01','like.cat'],['B01','like.flower'],['B03','like.flower'],['RI02','like.any'],['IN02','fear.doll']]);
const conditional = new Set(['B14','B15','B16','B27','B28','IN04']);
const optional = new Set(['B02','B04','B09','B10','B12','B13','ME04','IN01','BO01','BO02','AB01']);
const flow = new Set(['B26']);
const major = new Set(['CAT01','B03','B04','B13','B17','B19','RI01','RI02','RI04','AB02']);
const rest = new Set(['B25']);
const greybox = new Set(['B01','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B18','B19','B20','B22','B25','ID02','ID03','ME01','ME02','ME03','ME04','IN01','IN02','IN03','TI02','TI03','RI01','RI02','BO01','BO02','BO03','BO04','AB01','AB02','AB04']);
const conditionalGreybox = new Set(['B27','B28','IN04']);
const previewOnly = new Set(['B13','B14','B15','B16']);
export const CONTENT_CATALOG = Object.freeze(ids.map(id=>Object.freeze({
  definitionId:id,
  sourcePolicy:required.has(id)?'required':conditional.has(id)?'conditional':flow.has(id)?'fixed':optional.has(id)?'optional':'builtin',
  preferenceRequirements:required.has(id)?[required.get(id)]:[],
  capabilities:greybox.has(id)||conditionalGreybox.has(id)||previewOnly.has(id)?['geometry','subtitle','proxy']:[],
  readiness:greybox.has(id)?'greybox':conditionalGreybox.has(id)?'conditional-greybox'
    :previewOnly.has(id)?'preview-only':id==='CAT01'?'fixed-test':id==='B26'?'existing-flow':'unimplemented',
  variants:[],
  role:rest.has(id)?'rest':flow.has(id)?'flow':major.has(id)?'major':'short',
  narrativeUnitId:['B13','B14','B15','B16'].includes(id)?'B13-B16':id,
  dependencies:id==='B27'?['B03']:id==='B28'?['B04']:['B14','B15','B16'].includes(id)?['B13']:[],
  exclusions:id==='B05'?['ID03','AB02']:id==='ID03'?['B05','AB02']:id==='AB02'?['B05','ID03']
    :id==='AB01'?['CAT01']:id==='CAT01'?['AB01']:[],
})));
const byId = new Map(CONTENT_CATALOG.map(entry=>[entry.definitionId,entry]));
export function contentEligibility(id,{preferences=[],capabilities=['geometry','subtitle','proxy'],allowGreybox=true,allowConditional=false}={}) {
  const definition=byId.get(id);
  if(!definition) return {accepted:false,reason:'UNKNOWN_DEFINITION'};
  const reasons=[];
  if(definition.readiness==='unimplemented') reasons.push('UNIMPLEMENTED');
  if(definition.readiness==='preview-only') reasons.push('PREVIEW_ONLY');
  if(definition.readiness==='fixed-test') reasons.push('FIXED_TEST_ONLY');
  if(definition.readiness==='existing-flow') reasons.push('FIXED_FLOW_ONLY');
  if(definition.readiness==='greybox'&&!allowGreybox) reasons.push('GREYBOX_DISABLED');
  if(definition.readiness==='conditional-greybox'&&!allowConditional) reasons.push('CONDITIONAL_ONLY');
  if(definition.readiness==='conditional-greybox'&&!allowGreybox) reasons.push('GREYBOX_DISABLED');
  if(definition.preferenceRequirements.some(p=>p==='like.any'
    ?!preferences.some(token=>token==='like.cat'||token==='like.flower')
    :!preferences.includes(p))) reasons.push('PREFERENCE_UNCONFIRMED');
  if(definition.capabilities.some(c=>!capabilities.includes(c))) reasons.push('CAPABILITY_MISSING');
  return {accepted:reasons.length===0,reason:reasons[0]??'GREYBOX_READY',reasons,definition};
}
export function previewEligibility(id,options) { return contentEligibility(id,options); }
