import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { inspectGlb } from './glb-contract.js';
function failure(code,message){return Object.assign(new Error(message),{code});}
export function disposeModel(root) {
  const geometries=new Set(),materials=new Set(),textures=new Set(),images=new Set();
  root.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const m of node.material?(Array.isArray(node.material)?node.material:[node.material]):[]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});
  for(const texture of textures){if(texture.source?.data)images.add(texture.source.data);texture.dispose();}
  for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
  for(const image of images)image.close?.();root.removeFromParent();
}
export async function loadGeneratedModel({url,sha256,targetHeight=1,yaw=0,maxSize=[2,3,2],signal,timeoutMs=30000,fetchImpl=fetch,loader=new GLTFLoader()}={}) {
  if(typeof url!=='string'||!url.startsWith('/')||url.startsWith('//')||!/^([a-f0-9]{64})$/.test(sha256??'')||!Number.isFinite(targetHeight)||targetHeight<=0||!Number.isFinite(yaw)||!Array.isArray(maxSize)||maxSize.length!==3||maxSize.some(x=>!Number.isFinite(x)||x<=0))throw failure('INVALID_ASSET','模型加载参数不合法。');
  const timeout=AbortSignal.timeout(timeoutMs),combined=signal?AbortSignal.any([signal,timeout]):timeout;
  let settled=false,result,abort;
  const aborted=new Promise((_,reject)=>{abort=()=>reject(failure('ABORTED','模型加载已取消或超时。'));combined.addEventListener('abort',abort,{once:true});if(combined.aborted)abort();});
  const loading=(async()=>{
    if(combined.aborted)throw failure('ABORTED','模型加载已取消。');
    const response=await fetchImpl(url,{signal:combined,credentials:'same-origin'});
    if(!response.ok)throw failure('ASSET_LOAD_FAILED','模型资源不可用。');
    if(Number(response.headers.get('content-length'))>32*1024*1024){await response.body?.cancel();throw failure('ASSET_TOO_LARGE','模型文件过大。');}
    const chunks=[];let length=0;for await(const b of response.body){length+=b.length;if(length>32*1024*1024)throw failure('ASSET_TOO_LARGE','模型文件过大。');chunks.push(b);}
    const bytes=new Uint8Array(length);let offset=0;for(const b of chunks){bytes.set(b,offset);offset+=b.length;}
    inspectGlb(bytes);
    const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
    if(actual!==sha256)throw failure('ASSET_HASH_MISMATCH','模型文件校验失败。');
    const gltf=await loader.parseAsync(bytes.buffer,'');const root=gltf.scene;
    let disposed=false;const dispose=()=>{if(disposed)return;disposed=true;for(const scene of new Set(gltf.scenes??[root]))disposeModel(scene);};
    try{
      if(combined.aborted||settled)throw failure('ABORTED','旧模型加载已取消。');
      if(gltf.animations.length||root.getObjectByProperty('isSkinnedMesh',true))throw failure('DYNAMIC_ADAPTER_REQUIRED','动态模型需要独立的动作能力验证。');
      root.rotation.y+=yaw;root.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
      if(![size.x,size.y,size.z].every(x=>Number.isFinite(x)&&x>0))throw failure('INVALID_BOUNDS','模型实际尺寸不合法。');
      root.scale.multiplyScalar(targetHeight/size.y);root.updateMatrixWorld(true);
      box.setFromObject(root);const center=box.getCenter(new THREE.Vector3());root.position.add(new THREE.Vector3(-center.x,-box.min.y,-center.z));root.updateMatrixWorld(true);
      box.setFromObject(root);box.getSize(size);
      if(size.toArray().some((x,i)=>x>maxSize[i]))throw failure('SLOT_OVERFLOW','模型超出规划槽位，不能直接放入地图。');
      root.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}for(const m of node.material?(Array.isArray(node.material)?node.material:[node.material]):[]){if('metalness'in m)m.metalness=0;if('roughness'in m)m.roughness=1;}});
      result={root,dispose,bounds:{min:box.min.toArray(),max:box.max.toArray()},verifiedCapabilities:['static-display'],sha256};return result;
    }catch(e){dispose();throw e;}
  })();
  try{return await Promise.race([loading,aborted]);}finally{settled=true;combined.removeEventListener('abort',abort);if(combined.aborted)result?.dispose();}
}
