import test from 'node:test';
import assert from 'node:assert/strict';
import { wallSurfaces, unionPatches } from '../src/rendering/wall-surfaces.js';
import { generatePlan } from '../src/planning/generate.js';

test('overlapping wall boxes produce only the union boundary and one cap layer',()=>{
  const boxes=[{minX:0,maxX:2,minZ:0,maxZ:1},{minX:1,maxX:3,minZ:0,maxZ:1},{minX:1,maxX:2,minZ:0,maxZ:3}];
  const faces=wallSurfaces(boxes);
  assert.equal(faces.reduce((n,f)=>n+f.end-f.start,0),12,'T-shaped footprint perimeter');
  for(let i=0;i<faces.length;i++) for(let j=0;j<i;j++) {
    const a=faces[i],b=faces[j];
    if(a.axis===b.axis && a.plane===b.plane) assert.ok(Math.min(a.end,b.end)<=Math.max(a.start,b.start));
  }
  const patches=unionPatches(boxes);
  assert.equal(patches.reduce((n,p)=>n+(p.maxX-p.minX)*(p.maxZ-p.minZ),0),5);
  for(let i=0;i<patches.length;i++) for(let j=0;j<i;j++) {
    const a=patches[i],b=patches[j];
    assert.ok(Math.min(a.maxX,b.maxX)<=Math.max(a.minX,b.minX) || Math.min(a.maxZ,b.maxZ)<=Math.max(a.minZ,b.minZ));
  }
});

test('exposed wall surfaces retain door gaps and inner corners of generated rooms',()=>{
  const p=generatePlan('42'),faces=wallSurfaces(p.walls);
  for(const door of p.doors) {
    const axis=door.axis==='x'?'X':'Z',normal=door[door.axis],tangent=door[door.axis==='x'?'z':'x'];
    assert.ok(!faces.some(f=>f.axis===axis && Math.abs(f.plane-normal)<.1 && f.start<tangent && f.end>tangent));
  }
  for(const f of faces) {
    const t=(f.start+f.end)/2,point=delta=>f.axis==='X'?{x:f.plane+delta*f.sign,z:t}:{x:t,z:f.plane+delta*f.sign};
    const inside=p=>planBoxes.some(b=>p.x>b.minX && p.x<b.maxX && p.z>b.minZ && p.z<b.maxZ);
    const planBoxes=p.walls;
    assert.ok(inside(point(-.0001)),'face has solid backing');
    assert.ok(!inside(point(.0001)),'face is not buried');
  }
});
