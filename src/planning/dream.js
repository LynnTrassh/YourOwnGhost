import { generatePlan } from './generate.js';

export function generateDream(seed) {
  const first=generatePlan(seed);
  const geometry=p=>JSON.stringify([p.cells,p.doors]);
  for(let attempt=0;attempt<8;attempt++) {
    const second=generatePlan(`${seed}:dream:2:${attempt}`,{catEnabled:false});
    if(geometry(first)!==geometry(second)) return [first,second];
  }
  throw new Error('第二层未找到不同的合法布局');
}
