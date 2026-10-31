import { sightClear } from '../story/spatial.js';
import { hashSeed } from '../planning/generate.js';
import { resolveThemeRule } from './theme-rules.js';
import { openingRoomIds } from '../planning/opening.js';
// These tokens enable implemented appearance adapters, not generated animation capabilities.
export const themePreferences=entities=>[...new Set(entities.map(e=>`${e.role}.static-model`))];
export function bindScriptThemes(source,models) {
  const plan=structuredClone(source),excluded=openingRoomIds(plan);
  plan.generatedThemes=[];
  for(const instance of plan.content?.instances??[]){
    const resolution=resolveThemeRule(instance.definitionId,models);
    instance.themeResolution=resolution;
    if(resolution.mode!=='background')continue;
    const role=resolution.role;
    const model=models.find(m=>m.role===role);
    if(!model||excluded.has(instance.roomId))continue;
    const {x,z}=instance.focus,y=role==='like'?1.17:0;
    // The altar and B12 swept footprint already own collision and safe routes.
    const scale=role==='like'?.9:.8;
    if(instance.definitionId==='B12'&&![instance.focus,instance.finalFocus].every(p=>sightClear(instance.observation,{...p,y:.4*scale},
      [...plan.walls,...plan.obstacles.filter(b=>b.id!==`${instance.instanceId}-figure`)])))continue;
    const slot={entityId:model.entityId,role,instanceId:instance.instanceId,definitionId:instance.definitionId,
      roomId:instance.roomId,x,y,z,scale,box:{minX:x-.3*scale,maxX:x+.3*scale,minZ:z-.3*scale,maxZ:z+.3*scale,height:y+.8*scale}};
    instance.themeBinding={entityId:model.entityId,role};
    // A rigid small object can take B12's authored single step; it receives no gait or damage.
    if(instance.definitionId==='B12'){instance.focus.y=.4*scale;instance.finalFocus.y=.4*scale;}
    if(instance.definitionId==='ME04')slot.box={minX:x-1.35,maxX:x+1.35,minZ:z-1.75,maxZ:z+1.75,height:.04};
    plan.generatedThemes.push(slot);
  }
  const {planHash,...body}=plan;plan.planHash=hashSeed(JSON.stringify(body)).toString(16).padStart(8,'0');
  return plan;
}
export function requireScriptBindings(plans,models) {
  if(models.some(m=>!plans.some(p=>p.generatedThemes.some(s=>s.entityId===m.entityId))))
    throw Object.assign(new Error('当前剧本组合没有兼容的主题场面，需要重新编排。'),{code:'WORLD_ADAPTER_UNAVAILABLE'});
  return plans;
}
