import { fail, validateRaw } from './contracts.js';
// Same-origin only: credentials and provider URLs never enter the browser bundle.
export function createDreamApi({fetchImpl=fetch,timeoutMs=30000,prepareSession=null}={}) {
  let sequence=0;
  async function post(path,body,signal) {
    const timeout=AbortSignal.timeout(timeoutMs);
    let response;
    try { response=await fetchImpl(`/api/${path}`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:signal?AbortSignal.any([signal,timeout]):timeout}); }
    catch(error) {if(signal?.aborted)throw fail('ABORTED','本次准备已取消。');throw fail('SERVICE_UNAVAILABLE','生成服务连接失败或超时，请稍后重试。');}
    let value;try{value=await response.json();}catch{throw fail('SERVICE_UNAVAILABLE','生成服务尚未连接或返回异常。');}
    if(!response.ok)throw fail(value.code??'SERVICE_ERROR',value.message??'生成服务暂时不可用。');
    return value;
  }
  return {
    async prepareDream(input,{signal,onProgress=()=>{},requestConfirmation}={}) {
      const raw=validateRaw(input),id=++sequence;
      if(typeof requestConfirmation!=='function')throw fail('CONFIRMATION_REQUIRED','需要先确认理解。');
      const current=()=>{if(signal?.aborted || id!==sequence)throw fail('ABORTED','本次准备已取消。');};
      current();onProgress('understanding');
      const interpretation=await post('interpretations',{raw},signal);current();
      const cancel=()=>{post('cancel',{inputRevision:interpretation.inputRevision}).catch(()=>{});};
      signal?.addEventListener('abort',cancel,{once:true});
      try {
        const answer=await requestConfirmation(interpretation);current();
        if(answer?.decision!=='accept')throw fail('CONFIRMATION_REQUIRED','请确认理解后继续。');
        const confirmation=await post('confirmations',interpretation,signal);current();
        onProgress('generating');
        if(!prepareSession)throw fail('WORLD_ADAPTER_UNAVAILABLE','世界安装服务尚未配置。');
        const preflight=await prepareSession.preflight?.(interpretation,{raw,signal});current();
        const manifest=await post('dream-jobs',confirmation,signal);current();
        const session=await prepareSession(manifest,{signal,onProgress,preflight});
        try{current();return session;}catch(error){session?.dispose?.();throw error;}
      } finally {signal?.removeEventListener('abort',cancel);}
    }
  };
}
