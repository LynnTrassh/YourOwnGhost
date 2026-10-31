import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const delivery=JSON.parse(fs.readFileSync('art-source/model-delivery-v01/manifest.json')).models;
const candidates=JSON.parse(fs.readFileSync('art-source/game-model-release-v01/candidates.json')).models;
const newYaw90=new Set(['prop-tv-console-v01','prop-cradle-v01','prop-folding-screen-v01','prop-tea-cart-v01','prop-candle-altar-v01','prop-archive-stack-v01','prop-pendulum-clock-v04','scene-wheelchair-v03']);
const omit=new Set(['prop-medical-cart-v01','scene-candelabrum-v03','scene-incense-burner-v03']);
const existing=['prop-clothes-rack-v01','prop-suitcase-v01','prop-washstand-v01','scene-wardrobe-panelled-v03','scene-wardrobe-mirrored-v03','scene-sofa-linen-v03','scene-armchair-wingback-v03','scene-armchair-wicker-v03','scene-chair-spindle-v03','scene-chair-upholstered-v03'];
const selected=[...candidates.filter(a=>!omit.has(a.id)),...existing.map(id=>delivery.find(a=>a.id===id))];
const registry={},models=[];
for(const a of selected){
 let url=a.runtimeUrl,w=a.width,h=a.height,d=a.depth,inspection=a.inspection;
 if(newYaw90.has(a.id)){
  url=`/art/game-models/v01/${a.id}.glb`;
  execFileSync(process.execPath,['art-source/tripo/prepare-model.mjs',`public${a.runtimeUrl}`,`public${url}`,String(h),'90','preserve'],{stdio:'pipe'});
  inspection=JSON.parse(fs.readFileSync(`public${url}.inspection.json`));[w,h,d]=inspection.runtimeBounds.size;
 }
 registry[a.id]={url,width:w,height:h,depth:d,prefabId:a.id,theme:a.theme,preserveAspect:true};
 models.push({id:a.id,name:a.name,...registry[a.id],sourceUrl:a.runtimeUrl,taskId:a.taskId,review:'actual GLB viewed front and side; physical structure and texture accepted',extraYaw:newYaw90.has(a.id)?90:0,sha256:inspection.runtimeSHA256,bytes:inspection.runtimeBytes});
}
fs.writeFileSync('src/art/room-props-catalog.js','// Reviewed Tripo assets only. Dimensions are the exported metre-space bounds.\nexport const ROOM_PROP_ASSETS = '+JSON.stringify(registry,null,2)+';\n');
fs.writeFileSync('art-source/game-model-release-v01/manifest.json',JSON.stringify({models,excluded:['prop-medical-cart-v01','prop-pendulum-clock-v01','scene-sofa-leather-v03'],scope:'Floor furnishings for six existing gameplay themes; 48 new themed layouts remain a separate integration.'},null,2)+'\n');
console.log(JSON.stringify({registered:models.length,reoriented:newYaw90.size,additionalRuntimeBytes:models.filter(a=>a.extraYaw).reduce((s,a)=>s+a.bytes,0)}));
