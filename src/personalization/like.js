const presets=Object.freeze({
  none:Object.freeze({label:'跳过喜欢输入',tokens:[]}),
  cat:Object.freeze({label:'猫',tokens:['like.cat']}),
  flower:Object.freeze({label:'花',tokens:['like.flower']}),
});
const aliases=new Map([['猫','cat'],['猫咪','cat'],['小猫','cat'],['cat','cat'],
  ['花','flower'],['鲜花','flower'],['花朵','flower'],['flower','flower']]);

export function selectLike(id='none') {
  if(!Object.hasOwn(presets,id))throw new Error('未知喜欢预设');
  const preset=presets[id];
  return {version:1,source:'local-preset',id,label:preset.label,tokens:[...preset.tokens]};
}

export function interpretLike(raw) {
  if(typeof raw!=='string'||raw.length>80)return {status:'unsupported',message:'请用 80 字以内描述一种喜欢的事物。'};
  const text=raw.normalize('NFKC').trim().toLowerCase();
  if(!text)return {status:'empty',message:'填写一种喜欢的事物，或主动选择跳过。'};
  const subject=text.replace(/^(?:我)?(?:最|很|特别)?(?:喜欢|喜爱)\s*/u,'')
    .replace(/[。！!]+$/u,'').trim();
  const id=aliases.get(subject);
  return id?{status:'matched',selection:selectLike(id)}
    :{status:'unsupported',message:'暂不能准确对应这个输入。可改选猫或花，或主动跳过喜欢输入。'};
}
