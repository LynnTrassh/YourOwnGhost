import { Group, Box3, Vector3, EventDispatcher } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { disposeModel } from '../assets/generated-model.js';
const loaders=new WeakMap();
// Each world owns its cache and cleanup, including downloads finishing after disposal.
export function createProductionAssetLoader(resources) {
  if(loaders.has(resources))return loaders.get(resources);
  const loader=new GLTFLoader(),cache=new Map();let disposed=false;
  const lifecycle=new EventDispatcher();
  lifecycle.dispose=()=>{if(disposed)return;disposed=true;for(const entry of cache.values())entry.then(g=>disposeModel(g.scene)).catch(()=>{});lifecycle.dispatchEvent({type:'dispose'});};
  resources.add(lifecycle);
  const api={async attach({url,parent,width,height,depth,yaw=0,position=[0,0,0],fallback=[],tint=null}) {
    try {
      if(disposed)return null;
      if(!cache.has(url))cache.set(url,loader.loadAsync(url));
      const gltf=await cache.get(url);if(disposed)return null;
      const visual=gltf.scene.clone(true),pivot=new Group();
      if(tint!==null)visual.traverse(n=>{if(!n.isMesh)return;const paint=m=>{const copy=m.clone();copy.color.multiplyScalar(tint);resources.add(copy);return copy;};n.material=Array.isArray(n.material)?n.material.map(paint):paint(n.material);});pivot.add(visual);visual.rotation.y=yaw;
      visual.updateMatrixWorld(true);const b=new Box3().setFromObject(visual),s=b.getSize(new Vector3());
      const scale=Math.min(width/s.x,height/s.y,depth/s.z);
      if(!Number.isFinite(scale)||scale<=0)return null;
      visual.scale.multiplyScalar(scale);visual.updateMatrixWorld(true);b.setFromObject(visual);
      const center=b.getCenter(new Vector3());visual.position.add(new Vector3(-center.x,-b.min.y,-center.z));
      pivot.position.set(...position);parent.add(pivot);for(const object of fallback)object.visible=false;
      return pivot;
    }catch{return null;}
  }};
  loaders.set(resources,api);return api;
}
