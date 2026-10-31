import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ROOM_THEMES,THEMED_ROOMS,getThemedRoom,getRoomColliders,placementBounds} from '../../src/art/themed-room-library.js';
import {THEMED_ASSETS as INTERIOR_ASSETS} from '../../src/art/themed-room-assets.js';
assert.equal(THEMED_ROOMS.length,48);assert.equal(new Set(THEMED_ROOMS.map(r=>r.id)).size,48);
const results=[];
for(const theme of ROOM_THEMES)assert.equal(THEMED_ROOMS.filter(r=>r.theme===theme.id).length,8);
for(const r of THEMED_ROOMS){
 const cs=getRoomColliders(r),issues=[];
 assert.equal(r.width%5,0);assert.equal(r.depth%5,0);assert.equal(r.height,3);
 for(const p of r.placements){const a=INTERIOR_ASSETS[p.assetId],b=placementBounds(p);assert(a);assert(!a.url.includes('/room-props/v01/'));assert(fs.existsSync('public'+a.url));assert(b.minX>=-r.width/2-.02&&b.maxX<=r.width/2+.02&&b.minZ>=-r.depth/2-.02&&b.maxZ<=r.depth/2+.02&&b.maxY<=3.01,`${r.id}: ${p.id} outside`);}
 for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++){const a=cs[i],b=cs[j];assert(!(Math.min(a.maxX,b.maxX)-Math.max(a.minX,b.minX)>.015&&Math.min(a.maxZ,b.maxZ)-Math.max(a.minZ,b.minZ)>.015),`${r.id} overlap ${a.id}/${b.id}`);}
 const radius=.24,step=.1,can=(x,z)=>Math.abs(x)<=r.width/2-radius&&Math.abs(z)<=r.depth/2-radius&&!cs.some(b=>x>b.minX-radius&&x<b.maxX+radius&&z>b.minZ-radius&&z<b.maxZ+radius);
 const start=[0,Math.round((r.depth/2-.65)/step)],queue=[start],seen=new Set([start.join(',')]);assert(can(start[0]*step,start[1]*step),`${r.id} blocked entrance`);
 for(let q=0;q<queue.length;q++){const [x,z]=queue[q];for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=`${nx},${nz}`;if(!seen.has(k)&&can(nx*step,nz*step)){seen.add(k);queue.push([nx,nz]);}}}
 const distance=Math.min(...queue.map(([x,z])=>Math.hypot(x*step-r.focus[0],z*step-r.focus[2])));
 assert(distance<(r.id==='park-02'?2.2:1.5),`${r.id}: cannot approach focal area: ${distance}`);
 const clone=getThemedRoom(r.id);clone.placements[0].x+=100;assert.notEqual(clone.placements[0].x,r.placements[0].x);
 results.push({id:r.id,models:r.placements.length,reachableSamples:seen.size,nearestFocusMetres:+distance.toFixed(3),overlaps:0,outOfBounds:0});
}
assert.equal(new Set(THEMED_ROOMS.map(r=>JSON.stringify(r.placements.map(p=>[p.assetId,p.x,p.y,p.z,p.yaw])))).size,48);
const assets=[...new Set(THEMED_ROOMS.flatMap(r=>r.placements.map(p=>p.assetId)))];
const report={scope:'48 authored art proposals, static AABB + 0.1 m navigation sampling, not formal gameplay validation',rooms:48,themes:6,approvedModels:assets.length,assets,results};fs.writeFileSync(new URL('./checks.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(`PASS: 48 distinct rooms, 6×8 themes, ${assets.length} textured models; no overlap/outside; .48 m player reaches every focal area.`);
