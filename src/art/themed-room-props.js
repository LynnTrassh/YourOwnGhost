import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {THEMED_ASSETS} from './themed-room-assets.js';
import {prepareInteriorMaterialResponse} from './interior-material-response.js';

export function createThemedModelDepot(){
 const loader=new GLTFLoader(),cache=new Map(),owned=new Set(),queue=[];let disposed=false,active=0;
 function release(){for(const v of owned){v.dispose();if(v.isTexture)v.image?.close?.();}owned.clear();}
 function pump(){while(!disposed&&active<3&&queue.length){const {id,resolve,reject}=queue.shift();active++;
  loader.loadAsync(THEMED_ASSETS[id].url).then(gltf=>{
   prepareInteriorMaterialResponse(gltf.scene,id,THEMED_ASSETS[id].url);
   gltf.scene.traverse(n=>{if(n.isMesh){n.castShadow=n.receiveShadow=true;owned.add(n.geometry);for(const m of [n.material].flat()){owned.add(m);for(const v of Object.values(m))if(v?.isTexture)owned.add(v);}}});
   if(disposed){release();reject(Error('Themed depot disposed'));}else resolve(gltf.scene);
  },reject).finally(()=>{active--;pump();});}}
 return {async model(id){
  if(disposed)throw Error('Themed depot disposed');const a=THEMED_ASSETS[id];if(!a)throw Error('Unknown themed asset '+id);
  if(!cache.has(id))cache.set(id,new Promise((resolve,reject)=>{queue.push({id,resolve,reject});pump();}));
  const original=await cache.get(id);if(disposed)throw Error('Themed depot disposed');
  return normalizeThemedModel(original.clone(true),id);
 },dispose(){disposed=true;for(const p of queue.splice(0))p.reject(Error('Themed depot disposed'));release();cache.clear();}};
}

export function normalizeThemedModel(model,id){
 const a=THEMED_ASSETS[id];if(id==='furniture-medical-file-cabinet')model.rotation.y+=Math.PI;
 const b=new T.Box3().setFromObject(model),s=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());
 const scale=Math.min(a.width/s.x,a.height/s.y,a.depth/s.z);
 model.scale.multiplyScalar(scale);model.position.set(-c.x*scale,-b.min.y*scale,-c.z*scale);
 const group=new T.Group();group.add(model);group.userData.assetId=id;
 if(id.startsWith('lighting-'))group.traverse(n=>{if(n.isMesh)n.castShadow=false;});
 return group;
}

// Five samples cover the actual bottom contact, not the wider silhouette of a
// statue/bowl. Authored X/Z never changes while loading; only vertical contact.
export function settleThemedSupport(object,support,root){
 root.updateWorldMatrix(true,true);
 const world=new T.Box3().setFromObject(object),base=world.min.y;
 const bottom=new T.Box3(),v=new T.Vector3();
 object.traverse(n=>{if(!n.isMesh)return;const p=n.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(n.matrixWorld);if(v.y<=base+.025)bottom.expandByPoint(v);}});
 if(bottom.isEmpty())return null;
 const c=bottom.getCenter(new T.Vector3()),size=bottom.getSize(new T.Vector3()),supportBounds=new T.Box3().setFromObject(support);
 const ray=new T.Raycaster(),heights=[];
 for(const [dx,dz]of [[0,0],[-.4,0],[.4,0],[0,-.4],[0,.4]]){
  ray.set(new T.Vector3(c.x+dx*size.x,supportBounds.max.y+.15,c.z+dz*size.z),new T.Vector3(0,-1,0));ray.far=supportBounds.max.y-supportBounds.min.y+.2;
  const hit=ray.intersectObject(support,true).find(h=>h.face&&h.face.normal.clone().applyNormalMatrix(new T.Matrix3().getNormalMatrix(h.object.matrixWorld)).y>.8);
  if(!hit||hit.point.y<supportBounds.min.y+(supportBounds.max.y-supportBounds.min.y)*.48)return null;
  heights.push(hit.point.y);
 }
 if(Math.max(...heights)-Math.min(...heights)>.025)return null;
 return object.position.y+Math.max(...heights)-base+.002;
}

export async function createThemedProps({root,recipe,depot,isDisposed=()=>false}){
 const instances=[],failed=[],skipped=[],objects=new Map();
 // Dependencies are ordered in the exported layout: support before its contents.
 for(const item of recipe.placements){
  if(isDisposed())break;
  let object;try{object=await depot.model(item.assetId);}catch(e){failed.push({id:item.id,assetId:item.assetId,message:e.message});continue;}
  if(isDisposed())break;
  object.name=item.id;object.position.set(item.x,item.y,item.z);object.rotation.y=item.yaw*Math.PI/180;
  root.add(object);root.updateWorldMatrix(true,true);
  if(item.supportKey){const support=objects.get(item.supportKey),y=support&&settleThemedSupport(object,support,root);
   if(!Number.isFinite(y)){object.removeFromParent();skipped.push({id:item.id,assetId:item.assetId,reason:'no-real-support'});continue;}object.position.y=y;
  }
  objects.set(item.id,object);instances.push({id:item.id,assetId:item.assetId,y:object.position.y});
 }
 return {instances,failed,skipped};
}
