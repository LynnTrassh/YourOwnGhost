import fs from 'node:fs';
import * as T from 'three';
import {THEMED_ASSETS} from '../../../src/art/themed-room-assets.js';
import {THEMED_ROOM_RECIPES} from '../../../src/art/themed-room-recipes.js';
import {createThemedProps,normalizeThemedModel,settleThemedSupport} from '../../../src/art/themed-room-props.js';
const cache=new Map();
function model(id){if(cache.has(id))return normalizeThemedModel(cache.get(id).clone(true),id);const b=fs.readFileSync('public'+THEMED_ASSETS[id].url),len=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+len)),bin=b.subarray(28+len),geometries=new Map();
 function attr(index){const a=g.accessors[index],v=g.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],Type={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array}[a.componentType];if(v.byteStride)throw Error('Interleaved '+id);const start=(v.byteOffset??0)+(a.byteOffset??0),bytes=bin.subarray(start,start+a.count*n*Type.BYTES_PER_ELEMENT);return new T.BufferAttribute(new Type(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),n);}
 function node(index){const n=g.nodes[index],o=new T.Group();if(n.matrix)o.applyMatrix4(new T.Matrix4().fromArray(n.matrix));else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);}if(n.mesh!==undefined)for(const [i,p]of g.meshes[n.mesh].primitives.entries()){const key=n.mesh+':'+i;let geo=geometries.get(key);if(!geo){geo=new T.BufferGeometry();geo.setAttribute('position',attr(p.attributes.POSITION));if(p.indices!==undefined)geo.setIndex(attr(p.indices));geo.computeVertexNormals();geometries.set(key,geo);}o.add(new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide})));}for(const child of n.children??[])o.add(node(child));return o;}
 const root=new T.Group();for(const i of g.scenes[g.scene??0].nodes)root.add(node(i));cache.set(id,root);return normalizeThemedModel(root.clone(true),id);
}
const reports=[];for(const recipe of THEMED_ROOM_RECIPES){const root=new T.Group(),result=await createThemedProps({root,recipe,depot:{model}});reports.push({id:recipe.id,...result});root.clear();}
fs.writeFileSync(new URL('./mesh-support-checks.json',import.meta.url),JSON.stringify({scope:'GLB geometry-only support and placement load; no material/light or gameplay acceptance',reports},null,2)+'\n');
console.log(JSON.stringify(reports.filter(r=>r.failed.length||r.skipped.length).map(r=>({id:r.id,failed:r.failed,skipped:r.skipped})),null,2));console.log('rooms',reports.length,'loaded',reports.reduce((n,r)=>n+r.instances.length,0));process.exitCode=reports.some(r=>r.failed.length||r.skipped.length)?1:0;

if(process.argv.includes('--suggest')) {
 const suggestions=[];
 for(const report of reports.filter(r=>r.skipped.length)){
  const recipe=THEMED_ROOM_RECIPES.find(r=>r.id===report.id),root=new T.Group();
  for(const p of recipe.placements){const o=model(p.assetId);o.name=p.id;o.position.set(p.x,p.y,p.z);o.rotation.y=p.yaw*Math.PI/180;root.add(o);}
  root.updateMatrixWorld(true);
  for(const skip of report.skipped){const p=recipe.placements.find(p=>p.id===skip.id),object=root.getObjectByName(p.id),support=root.getObjectByName(p.supportKey),sb=new T.Box3().setFromObject(support);let best=null;
   const offsets=[];for(let dx=-.55;dx<=.551;dx+=.05)for(let dz=-.45;dz<=.451;dz+=.05)offsets.push([dx,dz]);offsets.sort((a,b)=>Math.hypot(...a)-Math.hypot(...b));
   for(const [dx,dz]of offsets){object.position.set(p.x+dx,p.y,p.z+dz);root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(object);if(b.min.x<sb.min.x+.005||b.max.x>sb.max.x-.005||b.min.z<sb.min.z+.005||b.max.z>sb.max.z-.005)continue;
    if(recipe.placements.some(q=>q.id!==p.id&&q.supportKey===p.supportKey&&b.min.x<q.bounds.maxX+.03&&b.max.x>q.bounds.minX-.03&&b.min.z<q.bounds.maxZ+.03&&b.max.z>q.bounds.minZ-.03))continue;
    const y=settleThemedSupport(object,support,root);if(y!==null&&(p.assetId!=='theme-hotel-service-bell-v05'||y<1.3)){best={roomId:recipe.id,id:p.id,assetId:p.assetId,x:+(p.x+dx).toFixed(5),z:+(p.z+dz).toFixed(5),y};break;}
   }suggestions.push(best??{roomId:recipe.id,id:p.id,assetId:p.assetId,unresolved:true});
  }
 }
 console.log('SUPPORT SUGGESTIONS',JSON.stringify(suggestions,null,2));fs.writeFileSync('/tmp/yog-support-suggestions.json',JSON.stringify(suggestions,null,2));
}
