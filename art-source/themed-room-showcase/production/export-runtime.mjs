import fs from 'node:fs';
import {THEMED_ROOMS} from '../../../src/art/themed-room-library.js';
import {THEMED_ASSETS} from '../../../src/art/themed-room-assets.js';
const pack=JSON.parse(fs.readFileSync(new URL('./layouts.json',import.meta.url)));
const excluded=JSON.parse(fs.readFileSync('art-source/theme-delivery-v02/manifest.json')).excluded;
const recipes=pack.rooms.map(room=>{
 const base=THEMED_ROOMS.find(r=>r.id===room.id),all=room.layout.placements;
 // Real map owns portals, windows and wall dressing. Never copy a preview door.
 const placements=all.filter(p=>!p.assetId.startsWith('architecture-')&&!p.assetId.startsWith('fixture-')).map(p=>{
  if(!THEMED_ASSETS[p.assetId]||excluded[p.assetId])throw Error('Unavailable '+p.assetId);
  return {id:p.layoutId,key:p.layoutId,assetId:p.assetId,x:p.x,y:p.y,z:p.z,yaw:p.yaw,group:p.group,
   ...(p.wallMounted?{wallMounted:true}:{}),
   ...(p.supportId||p.supportKey?{supportKey:p.supportId??all.find(a=>a.key===p.supportKey).layoutId}:{}),bounds:p.bounds};
 });
 return {id:room.id,name:room.name,theme:room.theme,look:base.look,width:room.dimensions[0],depth:room.dimensions[2],height:3,
 key:base.key,keyColor:base.keyColor,focus:base.focus,intensity:room.intensity,placements,
 design:{hero:room.hero,composition:room.composition,reveal:room.reveal,lighting:room.lighting,ceiling:room.ceiling}};
});
fs.writeFileSync('src/art/themed-room-recipes.js','// Generated from production/layouts.json by export-runtime.mjs. Metres, no runtime randomness.\nexport const THEMED_ROOM_RECIPES = '+JSON.stringify(recipes,null,2)+';\n');
console.log(recipes.length+' runtime recipes; '+new Set(recipes.flatMap(r=>r.placements.map(p=>p.assetId))).size+' real assets');
