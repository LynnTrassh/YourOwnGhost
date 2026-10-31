import { createHash,randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fail } from '../src/personalization/contracts.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// Trusted approvals are operator configuration, NEVER fields supplied by the browser or LLM.
export class ModelJobs {
  constructor({ledger,provider,store,approvals={},budgetId='unapproved',maxCredits=0,allowText=false,textCreditCeiling=50,pollMs=2000,pollDeadlineMs=300000}) {
    Object.assign(this,{ledger,provider,store,approvals,budgetId,maxCredits,allowText,textCreditCeiling,pollMs,pollDeadlineMs});this.running=new Map();this.stopping=false;
    ledger.db.exec(`CREATE TABLE IF NOT EXISTS model_jobs(id TEXT PRIMARY KEY,owner TEXT,revision INTEGER,job_key TEXT UNIQUE,recipe TEXT,budget_id TEXT,reservation REAL,status TEXT,task_id TEXT,credits REAL,asset TEXT,error TEXT,cancelled INTEGER DEFAULT 0);`);
    ledger.db.exec("UPDATE model_jobs SET status='submissionUnknown',error='TRIPO_SUBMISSION_UNKNOWN' WHERE status='submitting'; UPDATE model_jobs SET status='reserved' WHERE status='uploading'");
  }
  get(owner,id){const row=this.ledger.db.prepare('SELECT * FROM model_jobs WHERE owner=? AND id=?').get(owner,id);if(!row)throw fail('NOT_FOUND','模型任务不存在。',404);return row;}
  snapshot(row){return {jobId:row.id,inputRevision:row.revision,status:row.status,taskId:row.task_id,creditsConsumed:row.credits,reservedCredits:row.reservation,deliveryCancelled:Boolean(row.cancelled),errorCode:row.error,asset:row.asset?JSON.parse(row.asset):null,worldReady:false};}
  set(id,patch){const keys=Object.keys(patch);if(keys.some(k=>!['status','task_id','credits','asset','error','cancelled'].includes(k)))throw new Error('Invalid job patch');this.ledger.db.prepare(`UPDATE model_jobs SET ${keys.map(k=>`${k}=?`).join(',')} WHERE id=?`).run(...Object.values(patch),id);}
  create(owner,{inputRevision,confirmationId,recipeId,entityId}) {
    if(!this.provider)throw fail('TRIPO_UNAVAILABLE','Tripo 尚未配置。',503);
    const row=this.ledger.current(owner,inputRevision);
    if(!confirmationId||row.confirmation!==confirmationId)throw fail('CONFIRMATION_REQUIRED','请确认当前理解。',409);
    const semantic=row.result&&JSON.parse(row.result);
    let approval,recipe;
    if(entityId){
      if(!this.allowText)throw fail('BUDGET_REQUIRED','本机尚未启用文字生成模型额度。',409);
      const entity=semantic?.entities.find(e=>e.entityId===entityId);
      if(!entity||!['physical-object','creature','person'].includes(entity.kind))throw fail('UNSUPPORTED_THEME','此主题还需要声音、场景或动作适配，不能用静态模型代替。',409);
      const prompt=`Single isolated static display model: ${entity.subject}. Preserve: ${entity.mustPreserve.join('; ')}. Low-poly, no pedestal, no background, no animation.`;
      const negativePrompt=entity.excludedTraits.join('; ');
      if(prompt.length>1024||negativePrompt.length>255)throw fail('RECIPE_TOO_LONG','主题细节超过模型接口容量，请精简后重新确认。',409);
      approval={creditCeiling:this.textCreditCeiling};
      recipe={type:'text',entityId,role:entity.role,prompt,negativePrompt,model:'P1-20260311',faceLimit:6000,semanticHash:semantic.semanticHash};
    }else{
      approval=this.approvals[recipeId];
      if(!approval?.approvedAt||approval.semanticHash!==semantic?.semanticHash||!approval.imagePath||!/^[a-f0-9]{64}$/.test(approval.imageSha256??'')||!Number.isFinite(approval.creditCeiling)||approval.creditCeiling<=0)throw fail('IMAGE_APPROVAL_REQUIRED','需要与当前主题一致的已确认图片和费用额度。',409);
      recipe={recipeId,imagePath:approval.imagePath,imageSha256:approval.imageSha256,model:'P1-20260311',faceLimit:approval.faceLimit??6000,semanticHash:semantic.semanticHash,approvedAt:approval.approvedAt};
    }
    if(!Number.isFinite(approval.creditCeiling)||approval.creditCeiling<=0)throw fail('BUDGET_REQUIRED','模型生成费用预留无效。',409);
    const key=hash(JSON.stringify([owner,confirmationId,recipe,this.provider.version]));
    const job=this.ledger.transaction(()=>{
      const old=this.ledger.db.prepare('SELECT * FROM model_jobs WHERE job_key=?').get(key);if(old)return old;
      const used=this.ledger.db.prepare('SELECT COALESCE(SUM(MAX(reservation,COALESCE(credits,0))),0) total FROM model_jobs WHERE budget_id=?').get(this.budgetId).total;
      if(!Number.isFinite(this.maxCredits)||this.maxCredits<=0||used+approval.creditCeiling>this.maxCredits)throw fail('BUDGET_REQUIRED','生成积分额度未授权或已用完。',409);
      const id=randomUUID();this.ledger.db.prepare('INSERT INTO model_jobs(id,owner,revision,job_key,recipe,budget_id,reservation,status) VALUES (?,?,?,?,?,?,?,?)').run(id,owner,inputRevision,key,JSON.stringify(recipe),this.budgetId,approval.creditCeiling,'reserved');return this.get(owner,id);
    });
    this.run(owner,job.id);return this.snapshot(job);
  }
  cancel(owner,id){const row=this.get(owner,id);this.set(id,{cancelled:1,...(['reserved','uploading'].includes(row.status)?{status:'cancelled'}:{})});return this.snapshot(this.get(owner,id));}
  cancelRevision(owner,revision){for(const row of this.ledger.db.prepare('SELECT id FROM model_jobs WHERE owner=? AND revision=?').all(owner,revision))this.cancel(owner,row.id);}
  current(row){if(row.cancelled)throw fail('STALE_REVISION','模型任务已取消交付。',409);return this.ledger.current(row.owner,row.revision);}
  run(owner,id){
    if(this.stopping||this.running.has(id))return this.running.get(id);
    const job=this.get(owner,id);
    if(['assetValidated','submissionUnknown','failed','cancelled'].includes(job.status))return Promise.resolve();
    const work=this.execute(owner,id).catch(e=>{
      const row=this.get(owner,id);
      this.set(id,{status:row.task_id?'waiting':e.code==='TRIPO_SUBMISSION_UNKNOWN'?'submissionUnknown':e.code==='STALE_REVISION'?'cancelled':'failed',error:e.code??'MODEL_JOB_FAILED'});
    }).finally(()=>this.running.delete(id));this.running.set(id,work);return work;
  }
  async execute(owner,id){
    let row=this.get(owner,id);
    if(!row.task_id){
      this.current(row);const recipe=JSON.parse(row.recipe);
      const approval=this.approvals[recipe.recipeId];
      const committed=this.ledger.db.prepare('SELECT COALESCE(SUM(MAX(reservation,COALESCE(credits,0))),0) total FROM model_jobs WHERE budget_id=?').get(row.budget_id).total;
      if(committed>this.maxCredits)throw fail('BUDGET_REQUIRED','已记录费用超出当前额度，停止新提交。',409);
      if(row.budget_id!==this.budgetId||this.maxCredits<=0)throw fail('BUDGET_REQUIRED','当前生成授权不再有效。',409);
      let taskId;
      if(recipe.type==='text'){
        if(!this.allowText)throw fail('BUDGET_REQUIRED','文字生成授权已关闭。',409);
        this.current(this.get(owner,id));if(this.stopping)return;
        this.set(id,{status:'submitting',error:null});
        taskId=await this.provider.submitText(recipe);
      }else{
        if(!approval||approval.approvedAt!==recipe.approvedAt||approval.imageSha256!==recipe.imageSha256||approval.semanticHash!==recipe.semanticHash)throw fail('BUDGET_REQUIRED','当前生成授权不再有效。',409);
        const image=await readFile(recipe.imagePath);
        if(hash(image)!==recipe.imageSha256)throw fail('IMAGE_HASH_MISMATCH','确认图片已改变，请重新确认。',409);
        this.current(this.get(owner,id));this.set(id,{status:'uploading',error:null});
        const token=await this.provider.uploadImage(image);
        this.current(this.get(owner,id));if(this.stopping)return;
        this.set(id,{status:'submitting'});
        taskId=await this.provider.submitImage({fileToken:token,model:recipe.model,faceLimit:recipe.faceLimit});
      }
      this.set(id,{task_id:taskId,status:'queued'});
    }
    const deadline=Date.now()+this.pollDeadlineMs;
    while(!this.stopping&&Date.now()<deadline){
      row=this.get(owner,id);const task=await this.provider.query(row.task_id);
      const cost=task.creditsConsumed;
      if(cost!==null&&Number.isFinite(cost)&&cost>=0)this.set(id,{credits:cost});
      if(['failed','cancelled','banned','expired'].includes(task.status)){this.set(id,{status:task.status==='cancelled'?'cancelled':'failed',error:`TRIPO_TASK_${task.status.toUpperCase()}`});return;}
      if(task.status==='success'){
        // A cancelled or replaced run still records supplier cost, but receives no asset publication.
        try{this.current(this.get(owner,id));}catch{this.set(id,{status:'cancelled',cancelled:1});return;}
        this.set(id,{status:'downloading'});
        const asset=await this.store.download(task.modelUrl);
        try{this.current(this.get(owner,id));}catch{this.set(id,{status:'cancelled',cancelled:1});return;}
        this.set(id,{status:'assetValidated',asset:JSON.stringify(asset),error:null});return;
      }
      this.set(id,{status:['queued','running'].includes(task.status)?task.status:'waiting'});
      await pause(this.pollMs);
    }
    this.set(id,{status:'waiting'});
  }
  recover(){for(const row of this.ledger.db.prepare("SELECT * FROM model_jobs WHERE status IN ('reserved','queued','running','waiting','downloading')").all())this.run(row.owner,row.id);}
  async asset(owner,jobId){const row=this.get(owner,jobId);this.current(row);if(row.status!=='assetValidated'||!row.asset)throw fail('ASSET_NOT_READY','模型资源尚未校验完成。',409);return this.store.read(JSON.parse(row.asset).assetId);}
  async close(){this.stopping=true;await Promise.allSettled(this.running.values());}
}
