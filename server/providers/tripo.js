import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fail } from '../../src/personalization/contracts.js';

// Server-only. Never export credentials in health responses, exceptions or logs.
export function readTripoCredentials({env=process.env,home=homedir()}={}) {
  let profile={};
  if(env.DREAM_TRIPO_USE_CLI==='1') {
    try {
      const config=JSON.parse(readFileSync(join(home,'.tripo','config.json'),'utf8'));
      profile=config.profiles?.[env.TRIPO_PROFILE??config.active_profile??'default']??config;
    } catch { /* Missing local credentials are reported as unavailable below. */ }
  }
  const apiKey=env.TRIPO_API_KEY??profile.api_key;
  const region=env.TRIPO_REGION??profile.region;
  if(!apiKey)return null;
  if(!['ov','cn'].includes(region))throw fail('TRIPO_REGION_REQUIRED','请配置与 Tripo 账号一致的地区。',503);
  return {apiKey,region};
}
export function createTripoProvider({apiKey,region,fetchImpl=fetch,timeoutMs=30000}) {
  if(!apiKey || !['ov','cn'].includes(region))throw fail('TRIPO_UNAVAILABLE','Tripo 尚未配置。',503);
  const base=region==='ov'?'https://openapi.tripo3d.ai/v3':'https://openapi.tripo3d.com/v3';
  async function request(path,{method='GET',body,signal}={}) {
    let response;
    try {
      response=await fetchImpl(base+path,{method,redirect:'error',headers:{Authorization:`Bearer ${apiKey}`,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs)});
    } catch {throw fail(method==='GET'?'TRIPO_QUERY_UNAVAILABLE':'TRIPO_SUBMISSION_UNKNOWN',method==='GET'?'Tripo 查询暂不可用，请恢复原任务。':'Tripo 提交结果未知，请勿重复生成。',502);}
    let value;try{value=await response.json();}catch{throw fail(method==='GET'?'TRIPO_INVALID_RESPONSE':'TRIPO_SUBMISSION_UNKNOWN','Tripo 响应异常，请查询原任务。',502);}
    if(!response.ok || value.code!==0){
      // Never echo provider error text: it may include credentials or signed URLs.
      const uncertain=method!=='GET'&&(response.status>=500||response.status===408);
      throw fail(uncertain?'TRIPO_SUBMISSION_UNKNOWN':'TRIPO_REJECTED',uncertain?'Tripo 提交结果未知，请勿重复生成。':`Tripo 请求未成功（HTTP ${response.status}）。`,502);
    }
    return value.data;
  }
  return {
    version:`tripo-v3:${region}`,
    async balance(options){const d=await request('/account/balance',options);return {balance:d.balance,frozen:d.frozen};},
    async query(taskId,{signal}={}) {
      if(typeof taskId!=='string'||! /^[a-zA-Z0-9_-]{8,128}$/.test(taskId))throw fail('INVALID_TASK_ID','任务编号不合法。');
      const d=await request(`/tasks/${encodeURIComponent(taskId)}`,{signal});
      if(d.task_id!==taskId)throw fail('TRIPO_TASK_MISMATCH','Tripo 返回了不匹配的任务。',502);
      return {taskId,status:d.status,progress:d.progress,modelUrl:d.status==='success'?d.output?.model_url:undefined,creditsConsumed:d.credits_consumed??null};
    },
    async uploadImage(bytes,{signal}={}) {
      if(!Buffer.isBuffer(bytes)||bytes.length>20*1024*1024)throw fail('INVALID_IMAGE','图片大小不合法。');
      const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
      const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
      if(!png&&!jpeg)throw fail('INVALID_IMAGE','仅支持 PNG 或 JPEG 确认图。');
      const form=new FormData();form.append('file',new Blob([bytes],{type:png?'image/png':'image/jpeg'}),png?'approved.png':'approved.jpg');
      const d=await request('/files',{method:'POST',body:form,signal});
      if(typeof d.file_token!=='string')throw fail('TRIPO_INVALID_RESPONSE','上传未返回文件标识。',502);
      return d.file_token;
    },
    async submitText({prompt,negativePrompt='',model='P1-20260311',faceLimit=6000},{signal}={}) {
      if(typeof prompt!=='string'||!prompt.trim()||prompt.length>1024||negativePrompt.length>255||model!=='P1-20260311'||!Number.isInteger(faceLimit)||faceLimit<50||faceLimit>20000)throw fail('INVALID_RECIPE','模型生成配方不合法。');
      const d=await request('/generation/text-to-model',{method:'POST',body:{prompt,negative_prompt:negativePrompt,model,face_limit:faceLimit,texture:true,pbr:false,texture_quality:'standard'},signal});
      if(typeof d.task_id!=='string'||!d.task_id)throw fail('TRIPO_SUBMISSION_UNKNOWN','提交没有返回任务编号，请勿重复生成。',502);
      return d.task_id;
    },
    async submitImage({fileToken,model='P1-20260311',faceLimit=6000},{signal}={}) {
      if(typeof fileToken!=='string'||!fileToken || model!=='P1-20260311'||!Number.isInteger(faceLimit)||faceLimit<50||faceLimit>20000)throw fail('INVALID_RECIPE','模型生成配方不合法。');
      const d=await request('/generation/image-to-model',{method:'POST',body:{input:fileToken,model,face_limit:faceLimit,texture:true,pbr:false,texture_quality:'standard'},signal});
      if(typeof d.task_id!=='string'||!d.task_id)throw fail('TRIPO_SUBMISSION_UNKNOWN','提交没有返回任务编号，请勿重复生成。',502);
      return d.task_id;
    }
  };
}
