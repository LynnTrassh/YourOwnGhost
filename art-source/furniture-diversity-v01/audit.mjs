import {writeFileSync} from 'node:fs';
import {generateDream} from '../../src/planning/dream.js';
import {INTERIOR_ASSETS,PREFAB_ASSETS,resolveInteriorAsset} from '../../src/art/interior-catalog.js';
const results=[];
for(const seed of ['1844070019','7','19']){
 const plans=generateDream(seed,{catEnabled:false,preferences:[]});
 for(const [layer,p] of plans.entries()){
  const rooms=p.rooms.map(r=>{const obs=p.obstacles.filter(o=>o.roomId===r.id);const furniture=obs.filter(o=>resolveInteriorAsset(o));const counts={};for(const o of furniture){const id=resolveInteriorAsset(o);counts[id]=(counts[id]??0)+1}const area=r.cells.length*p.cellSize**2;const footprint=furniture.reduce((s,o)=>s+(o.maxX-o.minX)*(o.maxZ-o.minZ),0);return {id:r.id,preset:r.interior?.presetId,area,furniture:furniture.length,uniqueModels:Object.keys(counts).length,counts,furnitureFootprint:footprint,coverageRatio:footprint/area,finalDressing:r.interior?.finalDressing};});results.push({seed,layer:layer+1,hash:p.planHash,valid:p.validation.valid,rooms});
 }
}
const prefabCounts={};for(const a of Object.values(INTERIOR_ASSETS))if(a.prefabId)prefabCounts[a.prefabId]=(prefabCounts[a.prefabId]??0)+1;
writeFileSync(new URL('./audit-after.json',import.meta.url),JSON.stringify({date:'2026-10-31',note:'Physical furnishing footprint only; excludes wall decor, props on surfaces and event proxies. These ratios are not target density.',catalogCount:Object.keys(INTERIOR_ASSETS).length,prefabCounts,results},null,2)+'\n');
console.log(JSON.stringify({catalogCount:Object.keys(INTERIOR_ASSETS).length,prefabCounts,firstSeed:results.slice(0,2).map(x=>({layer:x.layer,rooms:x.rooms.map(r=>({id:r.id,preset:r.preset,area:r.area,count:r.furniture,unique:r.uniqueModels,coverage:Math.round(r.coverageRatio*1000)/10,excluded:!!r.finalDressing?.excluded}))}))},null,2));
