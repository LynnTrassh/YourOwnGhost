// The current world adapters accept one static subject per nonblank role.
export function inputSupportIssue(interpretation,raw) {
  if(!Array.isArray(interpretation.entities))return '';
  const entities=interpretation.entities.filter(e=>raw[e.role]?.trim());
  if(interpretation.relations?.length||entities.some(e=>!['physical-object','creature','person'].includes(e.kind)))
    return '请每栏只描述一个具体物件或生物的外观。暂不支持声音、动作、场景和多个事物的关系；例如把“唱片里的音乐”改为“一张黑色唱片”。';
  if(['like','fear'].some(role=>entities.filter(e=>e.role===role).length>1))
    return '每栏只支持一个主体，请从多个事物中选择一个；可以保留它的颜色、材质和外形描述。';
  if(entities.some(e=>`Single isolated static display model: ${e.subject}. Preserve: ${e.mustPreserve.join('; ')}. Low-poly, no pedestal, no background, no animation.`.length>1024||e.excludedTraits.join('; ').length>255))
    return '外观细节过长，请只保留主体、颜色、材质和最重要的特征。';
  return '';
}
