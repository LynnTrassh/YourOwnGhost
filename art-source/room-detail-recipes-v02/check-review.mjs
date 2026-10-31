import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generateDream} from '../../src/planning/dream.js';
import {overlaps,movePlayer} from '../../src/collision.js';
const results=[];
for(const name of ['parlor','archive']) {
 const d=JSON.parse(fs.readFileSync(new URL(`./${name}-review.json`,import.meta.url),'utf8'));
 const plan=generateDream(d.seed,{catEnabled:false})[d.layer-1],colliders=[...plan.walls,...plan.obstacles];
 assert.equal(plan.planHash,d.planHash);assert(d.replayEqual&&d.planUnchanged&&d.storyUnchanged);assert.equal(d.models.failed.length,0);
 const room=plan.rooms.find(r=>r.id===d.roomId),cells=new Set(room.cells.map(c=>c.join(',')));
 assert(![...plan.content.instances,...plan.content.conditionalSlots].some(i=>i.roomId===room.id||i.supportRoomId===room.id));
 let routeEdges=0;
 for(const path of Object.values(d.routes))for(let i=0;i<path.length;i++) {
   const p=path[i];assert(!colliders.some(b=>overlaps(p.x,p.z,b)));
   if(!i)continue;const moving={...path[i-1]};movePlayer(moving,p.x-moving.x,p.z-moving.z,colliders);
   assert(Math.hypot(moving.x-p.x,moving.z-p.z)<.001);routeEdges++;
 }
 const views=d.views.map(v=>{
   assert.equal(v.position[1],1.65);const [x,,z]=v.position;
   assert(cells.has(`${Math.round(x/plan.cellSize)},${Math.round(z/plan.cellSize)}`));
   assert(!colliders.some(b=>overlaps(x,z,b)));
   const dx=v.lookAt[0]-x,dz=v.lookAt[2]-z,dy=v.lookAt[1]-1.65;
   const pitch=Math.atan2(dy,Math.hypot(dx,dz));assert(Math.abs(pitch)<=1.35);
   return {id:v.id,position:v.position,pitch,yaw:Math.atan2(-dx,-dz)};
 });
 const doors=plan.doors.filter(door=>door.cells.some(c=>cells.has(c.join(',')))).map(door=>{
   const [a,b]=door.cells,from={x:a[0]*plan.cellSize,z:a[1]*plan.cellSize},to={x:b[0]*plan.cellSize,z:b[1]*plan.cellSize};
   movePlayer(from,to.x-from.x,to.z-from.z,colliders);
   const clear=Math.hypot(from.x-to.x,from.z-to.z)<.001;assert(clear,`${door.id} aperture blocked`);return {id:door.id,clear};
 });
 results.push({name,seed:d.seed,planHash:plan.planHash,roomId:room.id,routeEdges,doors,views,performance:d.performance});
}
fs.writeFileSync(new URL('./route-audit.json',import.meta.url),JSON.stringify({results,note:'静态碰撞与未激活剧情状态检查，不代表真人试玩或完整事件触发验收'},null,2));
console.log(JSON.stringify(results.map(r=>({name:r.name,hash:r.planHash,routeEdges:r.routeEdges,doors:r.doors.length,views:r.views.length,status:'passed'}))));
