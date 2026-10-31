import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {generateDream} from '../src/planning/dream.js';
import {completeFinalRoomInteriors} from '../src/planning/interiors.js';
import {validatePlan} from '../src/planning/validate.js';
import {INTERIOR_ASSETS,resolveInteriorAsset} from '../src/art/interior-catalog.js';
import {Group} from 'three';

const json=v=>JSON.parse(JSON.stringify(v));
const seed='1844070019',options={catEnabled:false,preferences:[]};
let cached;
const dream=()=>cached??=generateDream(seed,options);
test('furnishing expansion preserves authored content, old obstacles and locked rooms',()=>{
 const baseline=JSON.parse(readFileSync(new URL('../art-source/game-model-release-v01/baseline.json',import.meta.url)));
 for(const [i,p] of dream().entries()){
  const old=baseline[i];assert.deepEqual(p.cells,old.cells);assert.deepEqual(p.doors,old.doors);assert.deepEqual(json(p.story),old.story);assert.deepEqual(json(p.content),old.content);
  for(const o of old.obstacles.filter(o=>!o.compositionGroup))assert.deepEqual(json(p.obstacles.find(b=>b.id===o.id)),o);
  for(const r of p.rooms.filter(r=>r.interior.finalDressing.excluded)){
   const original=old.rooms.find(o=>o.id===r.id);
   if(original.interior.finalDressing.excluded)assert.deepEqual(json(p.obstacles.filter(b=>b.roomId===r.id)),old.obstacles.filter(b=>b.roomId===r.id));
   else assert.ok(!p.obstacles.some(b=>b.roomId===r.id&&b.compositionGroup),'threat rooms must not gain dressing');
  }
  assert.ok(validatePlan(p).valid);
  const saved=JSON.stringify(p);completeFinalRoomInteriors(p);assert.equal(JSON.stringify(p),saved);
 }
});
test('bed styles and real themed furnishings resolve deterministically without shrinking tall beds',()=>{
 const styles=new Set(),props=new Set();for(const p of dream())for(const o of p.obstacles){
  if(o.variantId){styles.add(o.variantId);const a=INTERIOR_ASSETS[resolveInteriorAsset(o)];assert.ok(o.height>=a.height);assert.equal(o.prefabId,'bed');}
  if(o.prefabId?.startsWith('prop-')){props.add(o.prefabId);assert.equal(resolveInteriorAsset(o),o.prefabId);}
 }
 assert.equal(styles.size,3);assert.ok(props.size>=8,'reviewed themed models must appear in the gameplay plan');
 assert.deepEqual(dream(),generateDream(seed,options));
 const parlor=dream()[0].rooms.find(r=>r.id==='room-5');assert.ok(parlor.interior.finalDressing.groups.length>=4);
});
test('registered assets exist and contain no rejected local drafts',()=>{
 for(const a of Object.values(INTERIOR_ASSETS)){assert.ok(existsSync(`public${a.url}`),a.url);assert.ok(!a.url.includes('/room-props/v01/'));}
 for(const id of ['prop-medical-cart-v01','prop-pendulum-clock-v01','scene-sofa-leather-v03'])assert.ok(!INTERIOR_ASSETS[id]);
 for(const p of dream())for(const o of p.obstacles.filter(o=>o.compositionGroup))assert.ok(resolveInteriorAsset(o),o.prefabId);
});

test('authored writing desk keeps its existing clutter without a second paper cluster',async()=>{
 const {createRoomDetailDressing}=await import('../src/art/room-detail-dressing.js');
 const root=new Group(),anchor=new Group(),resources=new Set();root.add(anchor);
 const dressing=createRoomDetailDressing({plan:{rooms:[{id:'archive',interior:{presetId:'archive'}}]},root,resources});
 dressing.furnish({id:'furniture-writing-desk',anchor,width:1.3,depth:.65,height:.82,obstacle:{id:'desk',roomId:'archive',prefabId:'writing-desk',height:1.1}});
 assert.equal(dressing.stats.furnished,1);assert.equal(dressing.stats.clusters,0);
 for(const r of resources)r.dispose();assert.equal(anchor.children.length,0);
});

test('desk surface repair preserves real GLB triangles, UVs, bounds and shared ownership',async()=>{
 const {BufferGeometry,BufferAttribute,Mesh,MeshStandardMaterial,Texture}=await import('three');
 const {createModelSurfaceRepair}=await import('../src/art/model-surface-repair.js');
 const data=readFileSync('public/art/room-presets/v03/models/furniture-writing-desk.glb');
 const length=data.readUInt32LE(12),gltf=JSON.parse(data.subarray(20,20+length)),binary=data.subarray(28+length);
 const primitive=gltf.meshes[0].primitives[0],geometry=new BufferGeometry();
 function attribute(index){const a=gltf.accessors[index],v=gltf.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3}[a.type],Type={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType];const bytes=binary.subarray((v.byteOffset??0)+(a.byteOffset??0),(v.byteOffset??0)+(a.byteOffset??0)+a.count*size*Type.BYTES_PER_ELEMENT);return new BufferAttribute(new Type(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),size);}
 geometry.setAttribute('position',attribute(primitive.attributes.POSITION));geometry.setAttribute('normal',attribute(primitive.attributes.NORMAL));geometry.setAttribute('uv',attribute(primitive.attributes.TEXCOORD_0));geometry.setIndex(attribute(primitive.indices));geometry.computeBoundingBox();
 const texture=new Texture(),material=new MeshStandardMaterial({map:texture}),one=new Mesh(geometry,material),two=new Mesh(geometry,material),resources=new Set(),repair=createModelSurfaceRepair(resources);
 repair('furniture-writing-desk',one);repair('furniture-writing-desk',two);repair('furniture-writing-desk',one);
 assert.equal(one.geometry,two.geometry);assert.equal(one.material,material);assert.equal(one.material.map,texture);assert.equal(material.flatShading,false);assert.equal(resources.size,1);
 assert.deepEqual(one.geometry.boundingBox,geometry.boundingBox);assert.equal(one.geometry.index.count,geometry.index.count);assert.deepEqual(one.geometry.index.array,geometry.index.array);assert.notDeepEqual(one.geometry.attributes.normal.array,geometry.attributes.normal.array);assert.ok(one.geometry.attributes.normal.array.every(Number.isFinite));
 assert.deepEqual(one.geometry.attributes.position.array,geometry.attributes.position.array);assert.deepEqual(one.geometry.attributes.uv.array,geometry.attributes.uv.array);
 for(const resource of resources)resource.dispose();geometry.dispose();material.dispose();texture.dispose();
});
