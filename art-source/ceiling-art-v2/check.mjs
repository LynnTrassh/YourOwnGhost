import * as T from 'three';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCeilingArt} from '../../src/art/ceiling-art.js';
const results=[];
function fixture(theme='shrine'){
 const root=new T.Group(),original=new T.MeshStandardMaterial(),geometry=new T.BoxGeometry(1,1,1),bindings=[];
 for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++){
  const mesh=new T.Mesh(geometry,original);mesh.scale.set(5/3,.1,5/3);mesh.position.set(x*5/3,3.05,z*5/3);root.add(mesh);bindings.push({mesh,x:x*5/3,z:z*5/3});
 }
 return {root,original,bindings,rooms:[{id:'sample',theme,bindings}]};
}
const a=fixture(),art=createCeilingArt({parent:a.root,rooms:a.rooms});
assert(a.bindings.every(b=>b.mesh.material===a.original));art.setEnabled(true);assert(a.bindings.every(b=>b.mesh.material!==a.original));
const group=a.root.getObjectByName('ceiling-art-v2');assert.equal(group.children.length,1);assert(group.children[0].boundingBox.min.y>=2.9399);assert(group.children[0].boundingBox.max.y<=3.0001);
art.setEnabled(false);assert(a.bindings.every(b=>b.mesh.material===a.original));art.setEnabled(true);
const later=new T.MeshStandardMaterial();a.bindings[0].mesh.material=later;art.dispose();art.dispose();assert.equal(a.bindings[0].mesh.material,later);assert(a.bindings.slice(1).every(b=>b.mesh.material===a.original));assert.equal(a.root.children.length,9);
results.push({check:'默认关闭、切换、净高、材质所有权与重复释放',pass:true});
const b=fixture();b.bindings[5].mesh.position.y=2.9;assert.throws(()=>createCeilingArt({parent:b.root,rooms:b.rooms}));assert.equal(b.root.children.length,9);assert(b.bindings.every(x=>x.mesh.material===b.original));
results.push({check:'错误绑定先整体校验、失败不污染场景',pass:true});
for(const theme of ['bedroom','nursery','parlor','shrine','archive','clinic']){
 const f=fixture(theme),v=createCeilingArt({parent:f.root,rooms:f.rooms});v.setEnabled(true);
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};f.bindings[0].mesh.material.onBeforeCompile(shader);assert(shader.vertexShader.includes('modelMatrix'));assert(shader.fragmentShader.includes('ceilingDamp'));v.dispose();
}
results.push({check:'六类主题及 shader 注入合同',pass:true});
const report={date:'2026-10-31',results};fs.writeFileSync(new URL('./check-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
