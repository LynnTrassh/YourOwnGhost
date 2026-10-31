import { animalPresetById } from './animal-presets.js';
import { loadGeneratedModel } from '../assets/generated-model.js';
import { inputSupportIssue } from './input-support.js';
import { overlaps } from '../collision.js';
import { CELL_SIZE } from '../planning/templates.js';
import { validatePlan, pathThroughTiles } from '../planning/validate.js';
import { createModelJobClient } from '../assets/model-job-client.js';
import { Box3, Vector3 } from 'three';
import { createThreatProxy } from '../rendering/threat-proxy.js';
import { bindScriptThemes, requireScriptBindings, themePreferences } from './script-bindings.js';
import { openingRoomIds } from '../planning/opening.js';
const sessions=new WeakSet();
const fail=message=>Object.assign(new Error(message),{code:'WORLD_ADAPTER_UNAVAILABLE'});
const intersects=(a,b,gap=0)=>a.minX<b.maxX+gap&&a.maxX>b.minX-gap&&a.minZ<b.maxZ+gap&&a.maxZ>b.minZ-gap;
export function fitStaticThemes(source,models) {
  const plan=structuredClone(source),excluded=openingRoomIds(plan);
  // Avoid choreography and moving doors; generated props do not replace scripted actors.
  for(const id of Object.values(plan.chase?.stages??{}))excluded.add(id);
  for(const id of [plan.threat?.roomId])if(id)excluded.add(id);
  const reservedPoints=[plan.activeEncounters?.puzzle?.control,plan.activeEncounters?.puzzle?.clue,plan.activeEncounters?.puzzle?.fuse,plan.activeEncounters?.scare?.target,plan.activeEncounters?.scare?.trigger].filter(Boolean);
  plan.generatedThemes=[];
  for(const model of models){
    let found;
    for(const scale of [1,.75,.5,.33,.2]){
    for(const tile of plan.cells){
      if(excluded.has(tile.roomId))continue;
      const near=plan.cells.filter(t=>t.roomId===tile.roomId);
      for(const [dx,dz] of [[.6,.6],[-.6,.6],[.6,-.6],[-.6,-.6]]){
        const x=tile.x*CELL_SIZE+dx,z=tile.z*CELL_SIZE+dz;
        const box={kind:'generated-theme',roomId:tile.roomId,minX:x+model.bounds.min[0]*scale,maxX:x+model.bounds.max[0]*scale,minZ:z+model.bounds.min[2]*scale,maxZ:z+model.bounds.max[2]*scale,height:model.bounds.max[1]*scale};
        if(![[box.minX,box.minZ],[box.minX,box.maxZ],[box.maxX,box.minZ],[box.maxX,box.maxZ]].every(([cx,cz])=>near.some(t=>Math.abs(cx-t.x*CELL_SIZE)<CELL_SIZE/2-.01&&Math.abs(cz-t.z*CELL_SIZE)<CELL_SIZE/2-.01)))continue;
        if([...plan.walls,...plan.obstacles].some(b=>intersects(box,b,.15)))continue;
        if(reservedPoints.some(p=>Math.hypot(p.x-x,p.z-z)<2))continue;
        if(plan.doors.some(d=>Math.hypot(d.x-x,d.z-z)<2.4))continue;
        if((plan.content?.instances??[]).some(i=>i.roomId===tile.roomId&&i.focus&&Math.hypot(i.focus.x-x,i.focus.z-z)<2))continue;
        if(overlaps(tile.x*CELL_SIZE,tile.z*CELL_SIZE,box))continue;
        const candidate={...plan,obstacles:[...plan.obstacles,box]};
        if(!pathThroughTiles(candidate,plan.spawn,{x:tile.x*CELL_SIZE,z:tile.z*CELL_SIZE}))continue;
        if(!validatePlan(candidate).valid)continue;
        plan.obstacles.push(box);found={entityId:model.entityId,role:model.role,roomId:tile.roomId,x,z,scale,box};break;
      }
      if(found)break;
    }
    if(found)break;
    }
    if(!found)throw fail('当前布局没有可放置的位置，需要重新布置。');
    plan.generatedThemes.push(found);
  }
  if(!validatePlan(plan).valid)throw fail('主题布局未通过通行校验。');
  return plan;
}
export function isStaticSession(value){return Boolean(value&&sessions.has(value)&&!value.disposed);}
function normalizeModel(h) {
  const dimensions=h.bounds.max.map((v,i)=>v-h.bounds.min[i]);
  const scale=Math.min(1,.6/dimensions[0],.8/dimensions[1],.6/dimensions[2]);
  h.root.scale.multiplyScalar(scale);h.root.position.multiplyScalar(scale);
  h.bounds={min:h.bounds.min.map(v=>v*scale),max:h.bounds.max.map(v=>v*scale)};
  return h;
}
function presetModel(item) {
  const resources=new Set(),root=createThreatProxy('generic-proxy',resources);
  const box=new Box3().setFromObject(root),center=box.getCenter(new Vector3());
  root.position.set(-center.x,-box.min.y,-center.z);
  const bounds={min:[box.min.x-center.x,0,box.min.z-center.z],max:[box.max.x-center.x,box.max.y-box.min.y,box.max.z-center.z]};
  return {...normalizeModel({root,bounds}),...item,status:'generating',dispose(){for(const r of resources)r.dispose();}};
}
export function createStaticSessionPreparer({planDream,modelClient=createModelJobClient(),background=false,scriptBound=false,seedFactory=null,localModelLoader=loadGeneratedModel,presetById=animalPresetById}) {
  const prepareModel=(item,options)=>{
    if(!item.localPresetId)return modelClient.prepare(item,options);
    const asset=presetById(item.localPresetId);
    if(!asset)throw fail('本地动物资源尚未就绪。');
    return localModelLoader({...options,url:asset.url,sha256:asset.sha256,targetHeight:asset.height??.8,yaw:asset.yaw??0});
  };
  const prepare=async (manifest,{signal,onProgress=()=>{},preflight}={})=>{
    if(manifest?.representation!=='static-display'||!Array.isArray(manifest.models)||manifest.models.length<1||manifest.models.length>4)throw fail('模型清单不完整。');
    if(background){
      const plans=preflight??await planDream(manifest.semanticHash,{catEnabled:manifest.defaults.includes('like'),activeEncounters:true});
      if(signal?.aborted)throw fail('准备已取消。');
      // Reserve the full envelope now. Background completion never changes topology.
      const fitted=scriptBound?requireScriptBindings(plans.map(p=>bindScriptThemes(p,manifest.models)),manifest.models)
        :plans.map(p=>fitStaticThemes(p,manifest.models.map(m=>({...m,bounds:{min:[-.3,0,-.3],max:[.3,.8,.3]}}))));
      const models=manifest.models.map(presetModel),controller=new AbortController();
      const session={kind:'generated-static',manifest,models,plans:fitted,runSeed:preflight?.runSeed??manifest.semanticHash,background:true,disposed:false,
        async replan(runSeed){
          const fresh=await planDream(runSeed,{catEnabled:manifest.defaults.includes('like'),activeEncounters:true,...(scriptBound?{preferences:themePreferences(models)}:{})});
          if(session.disposed)throw fail('本局已结束。');
          return scriptBound?requireScriptBindings(fresh.map(p=>bindScriptThemes(p,models)),models)
            :fresh.map(p=>fitStaticThemes(p,models));
        },dispose(){
        if(session.disposed)return;session.disposed=true;controller.abort();signal?.removeEventListener('abort',session.dispose);
        for(const m of models){m.dispose();m.generated?.dispose();}
      }};
      signal?.addEventListener('abort',session.dispose,{once:true});
      sessions.add(session);
      session.completion=Promise.all(models.map(async m=>{
        try{
          const h=await prepareModel({...m,inputRevision:manifest.inputRevision},{signal:controller.signal,targetHeight:.8,maxSize:[10,1,10]});
          if(session.disposed){h.dispose();return;}
          m.generated=normalizeModel(h);m.status='ready';
        }catch(error){m.status='preset';m.errorCode=error.code??'MODEL_SERVICE_UNAVAILABLE';}
      }));
      return session;
    }
    const handles=[];let session;
    let released=false;
    const release=()=>{if(released)return;released=true;for(const h of handles)h.dispose();if(session)session.disposed=true;};
    signal?.addEventListener('abort',release,{once:true});
    try{
      for(const item of manifest.models){
        const h=await prepareModel({...item,inputRevision:manifest.inputRevision},{signal,targetHeight:.8,maxSize:[10,1,10]});
        if(signal?.aborted){h.dispose();throw fail('准备已取消。');}
        handles.push(h);
        normalizeModel(h);
        h.entityId=item.entityId;h.role=item.role;
      }
      onProgress('preparing');
      const plans=preflight??await planDream(manifest.semanticHash,{catEnabled:manifest.defaults.includes('like'),activeEncounters:true});
      if(signal?.aborted)throw fail('准备已取消。');
      const fitted=plans.map(p=>fitStaticThemes(p,handles));
      session={kind:'generated-static',manifest,models:handles,plans:fitted,disposed:false,dispose:release};
      sessions.add(session);return session;
    }catch(error){release();throw error;}
    finally{signal?.removeEventListener('abort',release);}
  };
  prepare.preflight=async(interpretation,{raw,signal}={})=>{
    const issue=scriptBound&&inputSupportIssue(interpretation,raw);
    if(issue)throw fail(issue);
    const models=interpretation.entities.filter(e=>raw[e.role].trim());
    if(!models.length||models.length>4||interpretation.relations.length||models.some(e=>!['physical-object','creature','person'].includes(e.kind)))throw fail('这份描述还需要场景、声音或动作适配，可直接进入默认梦境。');
    if(scriptBound&&['like','fear'].some(role=>models.filter(m=>m.role===role).length>1))throw fail('复合主题需要更多剧本绑定，目前每个角色支持一个主体。');
    // Re-layout with the SAME confirmed themes if a particular floor plan has no safe slot.
    const runSeed=seedFactory?.()??interpretation.semanticHash;
    for(const layoutSeed of [runSeed,`${runSeed}:fit:1`,`${runSeed}:fit:2`]){
      const plans=await planDream(layoutSeed,{catEnabled:!raw.like.trim(),activeEncounters:true,...(scriptBound?{preferences:themePreferences(models)}:{})},{signal});
      if(signal?.aborted)throw fail('准备已取消。');
      try{
        if(scriptBound){requireScriptBindings(plans.map(p=>bindScriptThemes(p,models)),models);return Object.assign(plans,{runSeed:layoutSeed});}
        for(const plan of plans)fitStaticThemes(plan,models.map(e=>({...e,bounds:{min:[-.3,0,-.3],max:[.3,.8,.3]}})));
        return Object.assign(plans,{runSeed:layoutSeed});
      }catch(error){if(error.code!=='WORLD_ADAPTER_UNAVAILABLE')throw error;}
    }
    throw fail('正在寻找可容纳主题的布局，请稍后再次准备；已确认主题不会替换为预设。');
  };
  return prepare;
}
