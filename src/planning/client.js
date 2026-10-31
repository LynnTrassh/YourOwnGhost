// Keep deterministic generation/retries off the render and input thread.
const completed=new Map();
export function planDream(seed,options,{signal}={}) {
  if(signal?.aborted)return Promise.reject(new DOMException('已取消','AbortError'));
  options={themedRooms:true,...options,openingSequence:true};
  const key=JSON.stringify([String(seed),options]);
  if(completed.has(key))return Promise.resolve(structuredClone(completed.get(key)));
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
    const timer=setTimeout(()=>finish(new Error('地图布置超时，请换一个种子重试。')),15000);
    let settled=false;
    const abort=()=>finish(new DOMException('已取消','AbortError'));
    const finish=(error,plans)=>{
      if(settled)return;settled=true;
      signal?.removeEventListener('abort',abort);
      clearTimeout(timer);worker.terminate();
      if(error){reject(error);return;}
      // Worlds may annotate their plan. Never share the cached object with a run.
      completed.set(key,structuredClone(plans));
      if(completed.size>4)completed.delete(completed.keys().next().value);
      resolve(plans);
    };
    worker.onmessage=({data})=>finish(data.error?new Error(data.error):null,data.plans);
    worker.onerror=event=>finish(new Error(event.message||'地图布置失败'));
    signal?.addEventListener('abort',abort,{once:true});
    worker.postMessage({seed,options});
  });
}
