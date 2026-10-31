import { ANIMAL_PRESETS, matchAnimalPreset } from '../src/personalization/animal-presets.js';
import { fail } from '../src/personalization/contracts.js';
// Confirmation and recipe are resolved server-side; no browser-supplied prompts or prices.
export function createDreamJobs({ledger,modelJobs,animalPresets=ANIMAL_PRESETS}) {
  return (owner,{inputRevision,confirmationId})=>{
    const row=ledger.current(owner,inputRevision);
    if(!confirmationId||row.confirmation!==confirmationId)throw fail('CONFIRMATION_REQUIRED','需要有效确认。',409);
    const semantics=JSON.parse(row.result),raw=JSON.parse(row.raw);
    const defaults=['like','fear'].filter(role=>!raw[role].trim());
    const entities=semantics.entities.filter(e=>!defaults.includes(e.role));
    if(!entities.length||entities.length>4||semantics.relations.length||entities.some(e=>!['physical-object','creature','person'].includes(e.kind)))
      throw fail('THEME_ADAPTER_REQUIRED','这份描述需要更多场景、声音或动作适配，目前无法完整生成。可直接进入默认梦境。',409);
    const local=new Map(entities.map(e=>[e.entityId,matchAnimalPreset(e,animalPresets)]));
    const pending=entities.filter(e=>!local.get(e.entityId));
    if(pending.length&&(!modelJobs?.provider||!modelJobs.allowText))throw fail('BUDGET_REQUIRED','模型生成尚未启用额度，可直接进入默认梦境。',409);
    // Preflight the whole set before reserving or starting the first billable task.
    const existing=pending.length?ledger.db.prepare('SELECT * FROM model_jobs WHERE owner=? AND revision=? AND budget_id=?').all(owner,inputRevision,modelJobs.budgetId):[];
    const missing=pending.filter(e=>!existing.some(j=>{const r=JSON.parse(j.recipe);return r.type==='text'&&r.entityId===e.entityId&&r.semanticHash===semantics.semanticHash;}));
    const used=pending.length?ledger.db.prepare('SELECT COALESCE(SUM(MAX(reservation,COALESCE(credits,0))),0) total FROM model_jobs WHERE budget_id=?').get(modelJobs.budgetId).total:0;
    if(pending.length&&used+missing.length*modelJobs.textCreditCeiling>modelJobs.maxCredits)throw fail('BUDGET_REQUIRED','剩余额度不足以完成本次主题，未提交新生成。',409);
    for(const e of pending)if(`Single isolated static display model: ${e.subject}. Preserve: ${e.mustPreserve.join('; ')}. Low-poly, no pedestal, no background, no animation.`.length>1024||e.excludedTraits.join('; ').length>255)throw fail('RECIPE_TOO_LONG','主题细节过长，请精简后重新确认。',409);
    const models=entities.map(e=>({entityId:e.entityId,role:e.role,...(local.get(e.entityId)?{localPresetId:local.get(e.entityId).id}:{jobId:modelJobs.create(owner,{inputRevision,confirmationId,entityId:e.entityId}).jobId})}));
    return {inputRevision,confirmationId,semanticHash:semantics.semanticHash,defaults,models,representation:'static-display',worldReady:false};
  };
}
