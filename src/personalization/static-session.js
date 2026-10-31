import { CELL_SIZE } from '../planning/templates.js';
import { validatePlan, pathThroughTiles } from '../planning/validate.js';
import { createModelJobClient } from '../assets/model-job-client.js';
const sessions=new WeakSet();
const fail=message=>Object.assign(new Error(message),{code:'WORLD_ADAPTER_UNAVAILABLE'});
const intersects=(a,b,gap=0)=>a.minX<b.maxX+gap&&a.maxX>b.minX-gap&&a.minZ<b.maxZ+gap&&a.maxZ>b.minZ-gap;
export function fitStaticThemes(source,models) {
  const plan=structuredClone(source),excluded=new Set(['bedroom']);
  for(const edge of plan.edges)if(edge.a==='bedroom'||edge.b==='bedroom')excluded.add(edge.a==='bedroom'?edge.b:edge.a);
  // Avoid choreography and moving doors; generated props do not replace scripted actors.
  for(const id of Object.values(plan.chase?.stages??{}))excluded.add(id);
  for(const id of [plan.threat?.roomId,...(plan.activeEncounters?.puzzle?.roomIds??[]),plan.activeEncounters?.puzzle?.supplyRoomId,...(plan.activeEncounters?.scare?.roomIds??[])])if(id)excluded.add(id);
  plan.generatedThemes=[];
  const used=new Set();
  for(const model of models){
    let found;
    for(const tile of plan.cells){
      if(excluded.has(tile.roomId)||used.has(tile.roomId))continue;
      const near=plan.cells.filter(t=>t.roomId===tile.roomId);
      for(const [dx,dz] of [[.6,.6],[-.6,.6],[.6,-.6],[-.6,-.6]]){
        const x=tile.x*CELL_SIZE+dx,z=tile.z*CELL_SIZE+dz;
        const box={kind:'generated-theme',roomId:tile.roomId,minX:x+model.bounds.min[0],maxX:x+model.bounds.max[0],minZ:z+model.bounds.min[2],maxZ:z+model.bounds.max[2],height:model.bounds.max[1]};
        if(![[box.minX,box.minZ],[box.minX,box.maxZ],[box.maxX,box.minZ],[box.maxX,box.maxZ]].every(([cx,cz])=>near.some(t=>Math.abs(cx-t.x*CELL_SIZE)<CELL_SIZE/2-.01&&Math.abs(cz-t.z*CELL_SIZE)<CELL_SIZE/2-.01)))continue;
        if([...plan.walls,...plan.obstacles].some(b=>intersects(box,b,.15)))continue;
        if(plan.doors.some(d=>Math.hypot(d.x-x,d.z-z)<2.4))continue;
        if((plan.content?.instances??[]).some(i=>i.roomId===tile.roomId&&i.focus&&Math.hypot(i.focus.x-x,i.focus.z-z)<2))continue;
        const candidate={...plan,obstacles:[...plan.obstacles,box]};
        if(!pathThroughTiles(candidate,plan.spawn,{x:tile.x*CELL_SIZE,z:tile.z*CELL_SIZE}))continue;
        if(!validatePlan(candidate).valid)continue;
        plan.obstacles.push(box);found={entityId:model.entityId,role:model.role,roomId:tile.roomId,x,z,box};break;
      }
      if(found)break;
    }
    if(!found)throw fail('找不到不影响通行和剧情的主题位置，请使用默认梦境。');
    used.add(found.roomId);plan.generatedThemes.push(found);
  }
  if(!validatePlan(plan).valid)throw fail('主题布局未通过通行校验。');
  return plan;
}
export function isStaticSession(value){return Boolean(value&&sessions.has(value)&&!value.disposed);}
export function createStaticSessionPreparer({planDream,modelClient=createModelJobClient()}) {
  const prepare=async (manifest,{signal,onProgress=()=>{},preflight}={})=>{
    if(manifest?.representation!=='static-display'||!Array.isArray(manifest.models)||manifest.models.length<1||manifest.models.length>4)throw fail('模型清单不完整。');
    const handles=[];let session;
    let released=false;
    const release=()=>{if(released)return;released=true;for(const h of handles)h.dispose();if(session)session.disposed=true;};
    signal?.addEventListener('abort',release,{once:true});
    try{
      for(const item of manifest.models){
        const h=await modelClient.prepare({...item,inputRevision:manifest.inputRevision},{signal,targetHeight:.8,maxSize:[10,1,10]});
        if(signal?.aborted){h.dispose();throw fail('准备已取消。');}
        handles.push(h);
        const dimensions=h.bounds.max.map((v,i)=>v-h.bounds.min[i]);
        const scale=Math.min(1,.6/dimensions[0],.8/dimensions[1],.6/dimensions[2]);
        h.root.scale.multiplyScalar(scale);h.root.position.multiplyScalar(scale);
        h.bounds={min:h.bounds.min.map(v=>v*scale),max:h.bounds.max.map(v=>v*scale)};
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
    const models=interpretation.entities.filter(e=>raw[e.role].trim());
    if(!models.length||models.length>4||interpretation.relations.length||models.some(e=>!['physical-object','creature','person'].includes(e.kind)))throw fail('这份描述还需要场景、声音或动作适配，可直接进入默认梦境。');
    const plans=await planDream(interpretation.semanticHash,{catEnabled:!raw.like.trim(),activeEncounters:true});
    if(signal?.aborted)throw fail('准备已取消。');
    // Reserve the maximum model envelope before any billable generation request.
    for(const plan of plans)fitStaticThemes(plan,models.map(e=>({...e,bounds:{min:[-.3,0,-.3],max:[.3,.8,.3]}})));
    return plans;
  };
  return prepare;
}
