import { GAZE_BEHAVIOR } from '../threat-profile.js';

const presets=Object.freeze({
  generic:Object.freeze({label:'通用占位',appearanceId:'generic-proxy'}),
  doll:Object.freeze({label:'人偶',appearanceId:'doll-proxy'}),
  clown:Object.freeze({label:'小丑',appearanceId:'clown-proxy'}),
});
const aliases=new Map([['人偶','doll'],['玩偶','doll'],['娃娃','doll'],['木偶','doll'],['doll','doll'],['小丑','clown'],['clown','clown']]);

export function selectFear(id='generic') {
  if(!Object.hasOwn(presets,id)) throw new Error('未知恐惧预设');
  return {version:1,source:'local-preset',id,label:presets[id].label,appearanceId:presets[id].appearanceId,behaviorId:GAZE_BEHAVIOR};
}

// A deliberately narrow local dictionary. Compound, negative and unknown descriptions stay unresolved.
export function interpretFear(raw) {
  if(typeof raw!=='string' || raw.length>80) return {status:'unsupported',message:'请用 80 字以内描述一种害怕的事物。'};
  const text=raw.normalize('NFKC').trim().toLowerCase();
  if(!text) return {status:'empty',message:'填写一种害怕的事物，或选择下面的试玩外观。'};
  const subject=text.replace(/^(?:我)?(?:最|很|有点)?(?:害怕|怕|恐惧)\s*/u,'').replace(/[。！!]+$/u,'').trim();
  const id=aliases.get(subject);
  return id ? {status:'matched',selection:selectFear(id)}
    : {status:'unsupported',message:'暂不能准确对应这个输入。可修改为人偶或小丑，或主动选择通用占位试玩。'};
}

export function appearanceFor(id) {
  const entry=Object.entries(presets).find(([,preset])=>preset.appearanceId===id);
  if(!entry) throw new Error('未登记的威胁外观');
  return selectFear(entry[0]);
}
