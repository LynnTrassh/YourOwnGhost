import fs from 'node:fs';
import assert from 'node:assert/strict';
const path=new URL('./layouts.json',import.meta.url),pack=JSON.parse(fs.readFileSync(path)),issues=[],reports=[];
assert.equal(pack.rooms.length,48);
assert.equal(new Set(pack.rooms.map(r=>r.id)).size,48);
for(const theme of ['hospital','park','office','home','hotel','ritual'])assert.equal(pack.rooms.filter(r=>r.theme===theme).length,8);
for(const r of pack.rooms){
 const all=r.layout.placements,[w,h,d]=r.dimensions,physical=all.filter(p=>!p.supportId&&!p.supportKey&&!p.wallMounted&&p.y<1.7&&!/^(architecture-|fixture-|lighting-)/.test(p.assetId));
 for(const p of all){const b=p.bounds;if(b.minX< -w/2-.03||b.maxX>w/2+.03||b.minZ< -d/2-.03||b.maxZ>d/2+.03||b.maxY>3.02)issues.push([r.id,'outside',p.layoutId,p.assetId]);
  if(p.supportId){const s=all.find(v=>v.layoutId===p.supportId);assert(s);const b=p.bounds,a=s.bounds;if(b.minX<a.minX-.01||b.maxX>a.maxX+.01||b.minZ<a.minZ-.01||b.maxZ>a.maxZ+.01)issues.push([r.id,'unsupported',p.assetId,s.assetId]);}
 }
 for(let i=0;i<physical.length;i++)for(let j=i+1;j<physical.length;j++){const a=physical[i],b=physical[j],x=a.bounds,z=b.bounds;if(Math.min(x.maxX,z.maxX)-Math.max(x.minX,z.minX)>.015&&Math.min(x.maxZ,z.maxZ)-Math.max(x.minZ,z.minZ)>.015)issues.push([r.id,'overlap',a.assetId,b.assetId]);}
 const radius=.3,step=.1,can=(x,z)=>Math.abs(x)<=w/2-radius&&Math.abs(z)<=d/2-radius&&!physical.some(p=>{const b=p.bounds;return x>b.minX-radius&&x<b.maxX+radius&&z>b.minZ-radius&&z<b.maxZ+radius;});
 const start=[0,Math.round((d/2-.65)/step)],queue=[start],seen=new Set([start.join(',')]);
 if(!can(start[0]*step,start[1]*step))issues.push([r.id,'blocked-entry']);
 for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,key=nx+','+nz;if(!seen.has(key)&&can(nx*step,nz*step)){seen.add(key);queue.push([nx,nz]);}}}
 const target=physical.find(p=>p.source==='authored-functional-anchor')??physical[0],b=target?.bounds;
 const near=b?Math.min(...queue.map(([x,z])=>Math.hypot(Math.max(b.minX-x*step,0,x*step-b.maxX),Math.max(b.minZ-z*step,0,z*step-b.maxZ)))):0;
 if(near>1.1)issues.push([r.id,'inaccessible-primary',target.assetId,near]);
 assert.equal(r.unplacedRequired.length,0,r.id+' missing core');
 assert.equal(r.tabletopCapacityIssues?.length??0,0,r.id+' tabletop too small');
 const approaches=queue.map(([x,z])=>[x*step,z*step]);
 r.layout.viewpoints={entry:[0,1.65,d/2-.65],approach:approaches.sort((a,c)=>Math.hypot(a[0]-(target?.x??0),a[1]-(target?.z??0))-Math.hypot(c[0]-(target?.x??0),c[1]-(target?.z??0)))[0],note:'位置为静态平面通行采样，正式导航和镜头遮挡另验'};
 reports.push({id:r.id,items:all.length,reachableSamples:seen.size,nearestPrimary:+near.toFixed(3),missingCoreBindings:0,dimensions:r.dimensions});
}
const out={scope:'48间制作布局：真实/预留包围盒与0.6米玩家静态采样；不是模型外观或正式玩法验收',issues,reports};fs.writeFileSync(new URL('./layout-checks.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
if(!issues.length)fs.writeFileSync(path,JSON.stringify(pack,null,2)+'\n');
console.log(JSON.stringify(issues));console.log(`${reports.length} room layouts checked; ${issues.length} issues`);process.exitCode=issues.length?1:0;
