import { CONTENT_CATALOG } from '../planning/content-catalog.js';

// Full script catalog policy. Scene mechanics remain authored; a GLB does not
// supply a voice, a torn variant, a skeleton, or permission to replace an actor.
const linked={
  CAT01:['like',['cat-shape','gaze','dead-pose']],
  B01:['like',['flower-shape']],B02:['like',['music-box','audio']],
  B03:['like',['flower-shape','wilt-variant']],B04:['like',['doll-shape','torn-variant']],
  B09:['fear',['spider-shape','ceiling-locomotion']],B10:['fear',['aquatic-silhouette']],
  B12:['fear',['static-display']],
  B13:['fear',['threat-body','locomotion']],B14:['fear',['threat-body','locomotion']],
  B15:['fear',['threat-body','locomotion']],B16:['fear',['threat-body','locomotion']],
  B27:['like',['flower-shape','wilt-variant']],B28:['like',['doll-shape','torn-variant']],
  ME04:['fear',['static-display']],IN01:['fear',['surface-spread']],
  IN02:['fear',['drawer-overflow']],IN04:['like',['source-trace']],
  RI02:['like',['static-display']],BO01:['fear',['eye-part','gaze']],
  BO02:['fear',['segmented-body']],AB01:['like',['cat-shape','group-disappear']],
};
export const THEME_RULES=Object.freeze(CONTENT_CATALOG.map(d=>{
  const [role,requires]=linked[d.definitionId]??[];
  return Object.freeze({definitionId:d.definitionId,role:role??null,requires:requires??[],
    adapter:['RI02','B12','ME04'].includes(d.definitionId)?d.definitionId:null,
    fallback:d.readiness==='unimplemented'||d.readiness==='preview-only'?'excluded':'authored-preset'});
}));
export function resolveThemeRule(definitionId,entities,capabilities=['static-display']) {
  const rule=THEME_RULES.find(r=>r.definitionId===definitionId);
  if(!rule)return {mode:'excluded',reason:'UNKNOWN_SCRIPT'};
  if(!rule.role)return {mode:rule.fallback==='excluded'?'excluded':'builtin',reason:'AUTHORED_CONTENT'};
  const entity=entities.find(e=>e.role===rule.role);
  if(!entity)return {mode:rule.fallback==='excluded'?'excluded':'builtin',reason:'NO_CONFIRMED_THEME'};
  const missing=rule.requires.filter(c=>!capabilities.includes(c));
  if(rule.fallback==='excluded'||missing.length||!rule.adapter)
    return {mode:rule.fallback==='excluded'?'excluded':'preset',entityId:entity.entityId,role:rule.role,reason:'AUTHORED_CAPABILITY_REQUIRED',missing};
  return {mode:'background',entityId:entity.entityId,role:rule.role,adapter:rule.adapter};
}
