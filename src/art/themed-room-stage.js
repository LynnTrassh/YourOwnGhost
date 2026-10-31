import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {THEMED_ASSETS as INTERIOR_ASSETS} from './themed-room-assets.js';
import {createThemedProps} from './themed-room-props.js';
import {createThemedRoomLighting} from './themed-room-lighting.js';
import {ROOM_LOOKS} from './interior-surfaces.js';
import {ROOM_THEMES,getRoomColliders} from './themed-room-library.js';

// Standalone art stage and loader. Caller owns gameplay, collision adoption and event bindings.
// Cached GLBs retain their authored textures; clones share geometry/materials until depot disposal.
export function createThemedAssetDepot() {
 const cache=new Map(),loader=new GLTFLoader(),resources=new Set(),assetResources=new Map();let disposed=false;
 return {
  async model(id){
   const asset=INTERIOR_ASSETS[id];
   if(!asset||asset.url.includes('/room-props/v01/'))throw new Error(`Unapproved room asset: ${id}`);
   if(disposed)throw new Error('Asset depot disposed');
   if(!cache.has(id))cache.set(id,loader.loadAsync(asset.url).then(gltf=>{
    const local=new Set();assetResources.set(id,local);
    gltf.scene.traverse(n=>{if(n.isMesh){n.castShadow=n.receiveShadow=true;resources.add(n.geometry);local.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material]){resources.add(m);local.add(m);for(const v of Object.values(m))if(v?.isTexture){resources.add(v);local.add(v);}}}});
    if(disposed){for(const r of resources)r.dispose();throw new Error('Asset depot disposed during load');}
    return gltf.scene;
   }).catch(e=>{cache.delete(id);throw e;}));
   const original=await cache.get(id),clone=original.clone(true);
   // This source's drawer fronts face -Z, unlike the other retained cabinets.
   if(id==='furniture-medical-file-cabinet')clone.rotation.y+=Math.PI;
   if(id.startsWith('lighting-'))clone.traverse(n=>{if(n.isMesh)n.castShadow=false;});
   const bounds=new T.Box3().setFromObject(clone),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
   const scale=Math.min(asset.width/size.x,asset.height/size.y,asset.depth/size.z);
   clone.scale.multiplyScalar(scale);clone.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
   const wrapper=new T.Group();wrapper.add(clone);return wrapper;
  },
  retainOnly(ids){const keep=new Set(ids);for(const [id,set]of assetResources){if(keep.has(id))continue;for(const value of set){value.dispose();resources.delete(value);}assetResources.delete(id);cache.delete(id);}},
  inspect(){return {cachedModels:cache.size};},
  dispose(){disposed=true;for(const r of resources)r.dispose();resources.clear();cache.clear();},
 };
}
export async function createThemedRoomStage({recipe,depot}) {
 const root=new T.Group();root.name=recipe.id;
 const owned=new Set(),look=ROOM_LOOKS[recipe.look],theme=ROOM_THEMES.find(t=>t.id===recipe.theme),w=recipe.width,d=recipe.depth;
 const textureLoader=new T.TextureLoader();
 function mat(color,extra={}){const m=new T.MeshStandardMaterial({color,roughness:.92,...extra});owned.add(m);return m;}
 async function surface(id,color,repeat){const map=await textureLoader.loadAsync(`/art/room-presets/v03/textures/${id}.jpg`);owned.add(map);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(...repeat);map.anisotropy=4;return mat(color,{map});}
 function box(size,pos,material){const g=new T.BoxGeometry(...size);owned.add(g);const m=new T.Mesh(g,material);m.position.set(...pos);m.castShadow=m.receiveShadow=true;root.add(m);return m;}
 try {
  const [wallEnd,wallSide,floor,wood]=await Promise.all([
   surface(look.wall,0xb3ada0,[w/2,1.5]),surface(look.wall,0xb3ada0,[d/2,1.5]),surface(look.floor,0x9e9787,[w/2,d/2]),surface('floor-walnut-planks',0x554b3a,[w/2,.6]),
  ]);
  // Physical ceiling and framing remain present when camera looks up; no painted-on sky.
  const data=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,v=165+Math.round(12*Math.sin(x*.41+y*.37)*Math.cos(y*.23));data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}
  const grain=new T.DataTexture(data,64,64);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(w,d);grain.needsUpdate=true;owned.add(grain);
  const ceiling=mat(recipe.theme==='hospital'?0x6b786e:0x777064,{bumpMap:grain,bumpScale:.008});
  const trim=mat(recipe.theme==='hospital'?0x3d534c:0x30261f);
  box([w+.2,.14,d+.2],[0,-.07,0],floor);box([w+.2,.12,d+.2],[0,3.06,0],ceiling);
  box([w+.2,3,.16],[0,1.5,-d/2-.08],wallEnd);
  for(const sign of [-1,1]){
   box([.16,3,d],[sign*(w/2+.08),1.5,0],wallSide);
   box([.028,.7,d],[sign*(w/2-.014),.48,0],recipe.theme==='hospital'?wallSide:wood);
   for(const [y,h] of [[.08,.16],[.86,.045],[2.91,.09]])box([.05,h,d],[sign*(w/2-.025),y,0],trim);
   box([(w-1.65)/2,3,.16],[sign*(w/4+.4125),1.5,d/2+.08],wallEnd);
  }
  box([1.65,.6,.16],[0,2.7,d/2+.08],wallEnd);
  box([w,.7,.028],[0,.48,-d/2+.014],recipe.theme==='hospital'?wallEnd:wood);
  for(const [y,h] of [[.08,.16],[.86,.045],[2.91,.09]])box([w,h,.05],[0,y,-d/2+.025],trim);
  if(d>5)for(const z of [-2.5,2.5])box([w,.09,.07],[0,2.955,z],trim);
  if(recipe.ceilingStyle==='stage'){for(const z of [-4.5,-1.1,2.5])box([w,.16,.16],[0,2.92,z],trim);}
  if(['hospital','office'].includes(recipe.ceilingStyle)){
   const rail=mat(recipe.ceilingStyle==='hospital'?0x4b5b51:0x65685d);
   for(let x=-w/2+1.25;x<w/2;x+=1.25)box([.025,.018,d],[x,2.991,0],rail);
   for(let z=-d/2+1.25;z<d/2;z+=1.25)box([w,.018,.025],[0,2.991,z],rail);
  }
  if(recipe.ceilingStyle==='ritual')for(let z=-d/2+1;z<d/2;z+=2)box([w,.12,.14],[0,2.94,z],wood);
  if(recipe.ceilingStyle==='park')for(let z=-d/2+1;z<d/2;z+=2.5)box([w,.10,.12],[0,2.95,z],trim);

  const result=await createThemedProps({root,recipe,depot});
  if(result.failed.length)throw new Error('Themed model load failed: '+result.failed.map(f=>f.assetId).join(', '));
  const instances=result.instances,skipped=result.skipped;
  const lighting=createThemedRoomLighting({root,recipe,owned});
  const colliders=getRoomColliders(recipe);
  return {root,colliders,recipe,inspect(){return {id:recipe.id,models:instances.length,failed:0,skippedDressing:skipped,ceiling:3,dimensions:[w,3,d],instances,lighting:lighting.inspect()};},dispose(){root.removeFromParent();for(const r of owned)r.dispose();root.clear();}};
 }catch(error){for(const r of owned)r.dispose();root.clear();throw error;}
}
