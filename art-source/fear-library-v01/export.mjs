import {readFileSync, writeFileSync, mkdirSync, copyFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {Box3, Matrix4, Vector3} from 'three';
const pack='art-source/fear-library-v01', dest='public/art/fear-library/v01';
const specs=JSON.parse(readFileSync(`${pack}/export-settings.json`,'utf8'));
const manifest=JSON.parse(readFileSync(`${pack}/manifest.json`,'utf8'));
mkdirSync(dest,{recursive:true});mkdirSync(`${pack}/reviews`,{recursive:true});
const models=[],checks=[];
function read(path){const b=readFileSync(path);if(b.readUInt32LE(0)!==0x46546c67||b.readUInt32LE(4)!==2||b.readUInt32LE(8)!==b.length)throw Error('Invalid GLB');const n=b.readUInt32LE(12);return {g:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};}
function access(data,index){const a=data.g.accessors[index],v=data.g.bufferViews[a.bufferView];if(a.sparse)throw Error('Sparse accessor unsupported');const types={5121:[1,'readUInt8'],5123:[2,'readUInt16LE'],5125:[4,'readUInt32LE'],5126:[4,'readFloatLE']};const [bytes,method]=types[a.componentType]??[];const n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];if(!bytes||!n)throw Error('Accessor unsupported');const rows=[];for(let i=0;i<a.count;i++){const off=(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??bytes*n);const row=Array.from({length:n},(_,j)=>data.bin[method](off+j*bytes));if(!row.every(Number.isFinite))throw Error('Nonfinite accessor');rows.push(row);}return rows;}
for(const spec of specs){
 const asset=manifest.assets.find(x=>x.id===spec.id),source=`${pack}/output/${spec.id}/model.glb`,target=`${dest}/${spec.id}.glb`,raw=read(source);
 if(raw.g.nodes.length!==1||['matrix','scale','translation','rotation'].some(k=>raw.g.nodes[0][k]))throw Error('Unexpected source transforms');
 const bounds=new Box3();for(const p of raw.g.meshes[0].primitives)for(const v of access(raw,p.attributes.POSITION))bounds.expandByPoint(new Vector3(...v));
 const rotation=new Matrix4().makeRotationY(spec.yaw*Math.PI/180),rotated=new Box3();for(const p of raw.g.meshes[0].primitives)for(const v of access(raw,p.attributes.POSITION))rotated.expandByPoint(new Vector3(...v).applyMatrix4(rotation));
 const size=rotated.getSize(new Vector3()),scale=spec.axis==='horizontalMax'?spec.metres/Math.max(size.x,size.z):spec.metres/size[spec.axis];
 const height=bounds.getSize(new Vector3()).y*scale;
 const prep=spawnSync('node',['art-source/tripo/prepare-model.mjs',source,target,String(height),String(spec.yaw),'matte'],{encoding:'utf8'});if(prep.status)throw Error(prep.stderr);
 const data=read(target),matrix=new Matrix4().fromArray(data.g.nodes.at(-1).matrix),world=new Box3();let vertices=0,triangles=0,degenerate=0;
 for(const primitive of data.g.meshes[0].primitives){
  const positions=access(data,primitive.attributes.POSITION);vertices+=positions.length;
  if(primitive.attributes.TEXCOORD_0!==undefined)access(data,primitive.attributes.TEXCOORD_0);
  if(primitive.attributes.NORMAL!==undefined)access(data,primitive.attributes.NORMAL);
  const points=positions.map(p=>new Vector3(...p).applyMatrix4(matrix));points.forEach(p=>world.expandByPoint(p));
  const indices=primitive.indices!==undefined?access(data,primitive.indices).flat():positions.map((_,i)=>i);
  if(indices.length%3||indices.some(i=>!Number.isInteger(i)||i<0||i>=positions.length))throw Error('Invalid indices');
  for(let i=0;i<indices.length;i+=3){triangles++;const [a,b,c]=indices.slice(i,i+3).map(j=>points[j]);if(new Vector3().subVectors(b,a).cross(new Vector3().subVectors(c,a)).lengthSq()<1e-20)degenerate++;}
 }
 const report=JSON.parse(readFileSync(`${target}.inspection.json`,'utf8'));
 report.runtimeBounds={min:world.min.toArray(),max:world.max.toArray(),size:world.getSize(new Vector3()).toArray()};report.pivot='bottom-centre';report.forward='-Z';report.orientationStatus='pending-visual-review';report.target=spec;report.finiteVerticesChecked=vertices;report.degenerateTriangles=degenerate;
 if(spec.id.includes('spider'))report.ceilingMount={contactPlane:'local Y=0, feet down in source',placement:'Parent rotation Z=180deg makes dorsal side face downward, local -Z front unchanged. Put parent origin at ceiling plane. Verify all feet contacts visually; not an animated rig.'};
 writeFileSync(`${target}.inspection.json`,JSON.stringify(report,null,2)+'\n');
 const task=JSON.parse(readFileSync(`${pack}/output/${spec.id}/task.json`,'utf8'));
 models.push({id:spec.id,name:asset.name,runtimeUrl:`/art/fear-library/v01/${spec.id}.glb`,taskId:task.task_id,creditsConsumed:task.credits_consumed,inspection:report,status:'exported-awaiting-visual-review',runtimeIntegrated:false});
 checks.push({id:spec.id,vertices,triangles,degenerate,validIndices:true,finiteAttributes:true});
}
const web='corner-cobweb-a-v01.png';copyFileSync(`${pack}/concepts/${web}`,`${dest}/${web}`);
writeFileSync(`${dest}/manifest.json`,JSON.stringify({version:1,models,textures:[{id:'corner-cobweb-a-v01',runtimeUrl:`/art/fear-library/v01/${web}`,bytes:readFileSync(`${dest}/${web}`).length,sha256:createHash('sha256').update(readFileSync(`${dest}/${web}`)).digest('hex'),colorSpace:'sRGB',alpha:'straight RGBA; holes transparent',placementSizeMetres:[.8,1.2],status:'exported-awaiting-in-engine-material-review',runtimeIntegrated:false}],creditsConsumed:models.reduce((s,m)=>s+m.creditsConsumed,0)},null,2)+'\n');
writeFileSync(`${pack}/reviews/geometry-check.json`,JSON.stringify(checks,null,2)+'\n');
console.log(JSON.stringify(models.map(m=>({id:m.id,bounds:m.inspection.runtimeBounds.size,triangles:m.inspection.triangles,bytes:m.inspection.runtimeBytes}))));
