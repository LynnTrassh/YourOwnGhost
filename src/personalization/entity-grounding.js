// This is a visual representation, never a claim that a model can perform the input.
const physical=new Set(['physical-object','creature','person']);
export function groundEntities(value,raw) {
  const entities=[],mappingNotes=[];
  for(const role of ['like','fear']) {
    const source=value.entities.filter(e=>e.role===role),concrete=source.find(e=>physical.has(e.kind));
    if(!raw[role]?.trim()){entities.push(source[0]);continue;}
    let selected=concrete;
    if(!selected){
      const text=raw[role];
      const subject=/音乐|歌|声音|唱片/.test(text)?'一张黑色唱片'
        :/镜|倒影/.test(text)?'一面镜子'
        :/孤独|遗忘|寂寞/.test(text)?'一只落单的人偶'
        :/时间|过去|未来/.test(text)?'一只旧钟表'
        :/黑暗|夜/.test(text)?'一盏熄灭的灯'
        :/海|水|溺/.test(text)?'一只贝壳'
        :`一张写着“${text.slice(0,60)}”的纸条`;
      selected={entityId:`${role}-symbol`,role,subject,kind:'physical-object',mustPreserve:[],excludedTraits:[]};
    }
    const note=value.mappingNotes?.find(n=>n.role===role);
    if(!concrete||note||source.length>1||value.relations.length)
      mappingNotes.push({role,symbolic:!concrete||Boolean(note?.symbolic),original:raw[role],subject:selected.subject});
    entities.push({...selected,mustPreserve:selected.mustPreserve.slice(0,8).map(t=>t.slice(0,60)),excludedTraits:selected.excludedTraits.slice(0,4).map(t=>t.slice(0,50)),subject:selected.subject.slice(0,220)});
  }
  return {...value,entities,relations:[],ambiguities:[],mappingNotes,groundingVersion:1,
    displaySummary:Object.fromEntries(['like','fear'].map(role=>[role,raw[role]?.trim()?`本次呈现：${entities.find(e=>e.role===role).subject}（外观；行为由剧本安排）`:value.displaySummary[role]]))};
}
