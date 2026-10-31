// Open subjects are data; executable capabilities are assigned only by validators.
export const fail = (code, message, status = 400) => Object.assign(new Error(message), { code, status });
export function validateRaw(raw) {
  if (!raw || !['like','fear'].every(k => typeof raw[k] === 'string' && raw[k].length <= 1200))
    throw fail('INVALID_INPUT', '喜欢和害怕的描述每项不得超过 1200 字符。');
  return { like: raw.like, fear: raw.fear };
}
export function validateSemantics(value) {
  const kinds = ['physical-object','creature','person','environment','abstract','sound'];
  if (!value || !['like','fear'].every(k => typeof value.displaySummary?.[k] === 'string' && value.displaySummary[k].trim())
    || !Array.isArray(value.entities) || value.entities.length > 32 || !Array.isArray(value.ambiguities)
    || !Array.isArray(value.relations)) throw fail('INVALID_INTERPRETATION','服务返回的理解不完整。');
  const ids = new Set();
  for (const e of value.entities) {
    if (!e || typeof e.entityId !== 'string' || !e.entityId || ids.has(e.entityId) || !['like','fear'].includes(e.role)
      || typeof e.subject !== 'string' || !e.subject.trim() || !kinds.includes(e.kind)
      || !['mustPreserve','excludedTraits'].every(k => Array.isArray(e[k]) && e[k].every(x=>typeof x==='string'))
      || 'verifiedCapabilities' in e) throw fail('INVALID_ENTITY','主题实体或能力声明不合法。');
    ids.add(e.entityId);
  }
  if (!['like','fear'].every(role => value.entities.some(e=>e.role===role))) throw fail('MISSING_THEME','理解遗漏了输入主题。');
  for (const r of value.relations) if (!r || !ids.has(r.from) || !ids.has(r.to) || !['part-of','near','imitates','avoids','contrasts'].includes(r.type))
    throw fail('INVALID_RELATION','主题关系不合法。');
  if(value.mappingNotes!==undefined && (!Array.isArray(value.mappingNotes)||value.mappingNotes.some(n=>!['like','fear'].includes(n.role)||typeof n.symbolic!=='boolean'||typeof n.subject!=='string'||typeof n.original!=='string')))throw fail('INVALID_INTERPRETATION','实体映射信息不完整。');
  return structuredClone({...(value.mappingNotes?{mappingNotes:value.mappingNotes}:{}),...(value.groundingVersion===1?{groundingVersion:1}:{}),displaySummary:value.displaySummary,entities:value.entities,relations:value.relations,ambiguities:value.ambiguities});
}
