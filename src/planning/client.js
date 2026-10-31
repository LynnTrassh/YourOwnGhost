// Keep deterministic generation/retries off the render and input thread.
const completed=new Map();
export function planDream(seed,options) {
  const key=JSON.stringify([String(seed),options]);
  if(completed.has(key))return Promise.resolve(structuredClone(completed.get(key)));
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
    const timer=setTimeout(()=>finish(new Error('地图布置超时，请换一个种子重试。')),120000);
    const finish=(error,plans)=>{
      clearTimeout(timer);worker.terminate();
      if(error){reject(error);return;}
      // Worlds may annotate their plan. Never share the cached object with a run.
      completed.set(key,structuredClone(plans));
      if(completed.size>4)completed.delete(completed.keys().next().value);
      resolve(plans);
    };
    worker.onmessage=({data})=>finish(data.error?new Error(data.error):null,data.plans);
    worker.onerror=event=>finish(new Error(event.message||'地图布置失败'));
    worker.postMessage({seed,options});
  });
}
