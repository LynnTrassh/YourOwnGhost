import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { fail } from '../src/personalization/contracts.js';
import { DreamLedger } from './ledger.js';
export function createDreamServer({ledger=new DreamLedger(),interpret=null,modelJobs=null,dreamJobs=null,allowedOrigins=['http://127.0.0.1:4190','http://localhost:4190']}={}) {
  const inflight=new Map();
  return createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
    try {
      if(req.headers.origin && !allowedOrigins.includes(req.headers.origin))throw fail('ORIGIN_DENIED','请求来源不允许。',403);
      if(req.method==='GET' && req.url==='/api/health') {res.end(JSON.stringify({interpretationAvailable:Boolean(interpret),generationAvailable:Boolean(dreamJobs&&modelJobs?.allowText),modelGenerationAvailable:Boolean(modelJobs?.provider),worldInstallationAvailable:false}));return;}
      if(!['GET','POST'].includes(req.method) || !req.url.startsWith('/api/'))throw fail('NOT_FOUND','接口不存在。',404);
      if(req.method==='POST'&&!req.headers['content-type']?.startsWith('application/json'))throw fail('INVALID_CONTENT_TYPE','需要 JSON 请求。',415);
      let body='',bytes=0;
      for await (const part of req){bytes+=part.length;if(bytes>32768)throw fail('TOO_LARGE','请求过大。',413);body+=part;}
      let data;try{data=req.method==='POST'?JSON.parse(body):{};}catch{throw fail('INVALID_JSON','请求格式不正确。');}
      const match=/(?:^|;\s*)yog_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie??'');
      const owner=match?.[1]??randomBytes(32).toString('hex');
      if(!match)res.setHeader('Set-Cookie',`yog_session=${owner}; HttpOnly; SameSite=Strict; Path=/api`);
      let result;
      const assetMatch=/^\/api\/model-jobs\/([a-f0-9-]+)(?:\/(asset|resume|cancel))?$/.exec(req.url);
      if(assetMatch && modelJobs) {
        const [,id,action]=assetMatch;
        if(req.method==='GET'&&action==='asset'){
          const bytes=await modelJobs.asset(owner,id);res.setHeader('Content-Type','model/gltf-binary');res.setHeader('Content-Length',bytes.length);res.end(bytes);return;
        }
        if(req.method==='POST'&&action==='resume')modelJobs.run(owner,id);
        else if(req.method==='POST'&&action==='cancel')modelJobs.cancel(owner,id);
        else if(req.method!=='GET'||action)throw fail('NOT_FOUND','接口不存在。',404);
        result=modelJobs.snapshot(modelJobs.get(owner,id));
      } else if(req.url==='/api/model-jobs'&&req.method==='POST') {
        if(!modelJobs)throw fail('TRIPO_UNAVAILABLE','模型生成服务未配置。',503);
        result=modelJobs.create(owner,data);
      } else if(req.method!=='POST')throw fail('NOT_FOUND','接口不存在。',404);
      else if(req.url==='/api/interpretations') {
        if(!interpret)throw fail('PROVIDER_UNAVAILABLE','梦境生成服务尚未配置，你的描述已保留。',503);
        const draft=ledger.begin(owner,data.raw), key=`${owner}:${draft.revision}`;
        if(!draft.result && !inflight.has(key)){
          const work=Promise.resolve().then(()=>interpret(draft.raw)).then(value=>ledger.interpret(owner,draft.revision,value)).finally(()=>inflight.delete(key));
          inflight.set(key,work);
        }
        result=draft.result??await inflight.get(key);
      } else if(req.url==='/api/confirmations')result=ledger.confirm(owner,data.inputRevision,data.interpretationId,data.semanticHash);
      else if(req.url==='/api/cancel') {ledger.cancel(owner,data.inputRevision);modelJobs?.cancelRevision(owner,data.inputRevision);result={deliveryCancelled:true,providerCancellationConfirmed:false};}
      else if(req.url==='/api/dream-jobs') {
        const row=ledger.current(owner,data.inputRevision);
        if(!data.confirmationId || row.confirmation!==data.confirmationId)throw fail('CONFIRMATION_REQUIRED','需要有效确认。',409);
        if(!dreamJobs)throw fail('GENERATION_UNAVAILABLE','理解已确认，生成与世界适配服务尚未配置。',503);
        result=dreamJobs(owner,data);
      } else throw fail('NOT_FOUND','接口不存在。',404);
      res.end(JSON.stringify(result));
    } catch(error) {res.statusCode=error.status??500;res.end(JSON.stringify({code:error.code??'INTERNAL_ERROR',message:error.code?error.message:'服务暂时不可用，请稍后重试。'}));}
  });
}
