import { loadGeneratedModel } from './generated-model.js';
const error=(code,message)=>Object.assign(new Error(message),{code});
export function createModelJobClient({fetchImpl=fetch,load=loadGeneratedModel,pollMs=2000,deadlineMs=300000}={}) {
  async function request(path,body,signal){
    const response=await fetchImpl(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal});
    let value;try{value=await response.json();}catch{throw error('MODEL_SERVICE_UNAVAILABLE','模型服务返回异常。');}
    if(!response.ok)throw error(value.code??'MODEL_SERVICE_UNAVAILABLE',value.message??'模型服务不可用。');return value;
  }
  return {
    async prepare({inputRevision,confirmationId,recipeId,jobId:existingJobId},{signal,onProgress=()=>{},...placement}={}) {
      const deadline=AbortSignal.timeout(deadlineMs),combined=signal?AbortSignal.any([signal,deadline]):deadline;
      let jobId,handle;const cancel=()=>{if(jobId)request(`/api/model-jobs/${jobId}/cancel`,{},AbortSignal.timeout(5000)).catch(()=>{});};
      combined.addEventListener('abort',cancel,{once:true});
      try {
        if(existingJobId&&!/^[a-f0-9-]{36}$/.test(existingJobId))throw error('INVALID_MODEL_JOB','模型任务编号无效。');
        let job=existingJobId?await request(`/api/model-jobs/${existingJobId}`,undefined,combined):await request('/api/model-jobs',{inputRevision,confirmationId,recipeId},combined);
        if(typeof job.jobId!=='string'||!/^[a-f0-9-]{36}$/.test(job.jobId))throw error('INVALID_MODEL_JOB','模型任务编号无效。');jobId=job.jobId;
        while(true){
          if(combined.aborted)throw error('ABORTED','模型准备已取消或超时。');
          if(job.inputRevision!==inputRevision||job.deliveryCancelled)throw error('STALE_REVISION','模型属于过期描述。');
          onProgress({stage:job.status,jobId});
          if(job.status==='assetValidated'){
            handle=await load({...placement,url:`/api/model-jobs/${jobId}/asset`,sha256:job.asset?.sha256,signal:combined,fetchImpl});
            if(combined.aborted){handle.dispose();throw error('ABORTED','模型准备已取消。');}
            return {...handle,jobId,inputRevision,worldReady:false};
          }
          if(['failed','cancelled','submissionUnknown','waiting'].includes(job.status))throw error(job.errorCode??'MODEL_JOB_WAITING',job.status==='submissionUnknown'?'模型提交结果未知，请恢复原任务。':'模型尚未准备好，可稍后恢复原任务。');
          await new Promise((resolve,reject)=>{
            const abort=()=>{clearTimeout(timer);reject(error('ABORTED','模型准备已取消。'));};
            const timer=setTimeout(()=>{combined.removeEventListener('abort',abort);resolve();},pollMs);
            combined.addEventListener('abort',abort,{once:true});if(combined.aborted)abort();
          });
          job=await request(`/api/model-jobs/${jobId}`,undefined,combined);
        }
      } finally {combined.removeEventListener('abort',cancel);if(combined.aborted){cancel();handle?.dispose();}}
    },
    resume(jobId,{signal}={}){
      if(!/^[a-f0-9-]{36}$/.test(jobId))throw error('INVALID_MODEL_JOB','模型任务编号无效。');
      return request(`/api/model-jobs/${jobId}/resume`,{},signal);
    }
  };
}
