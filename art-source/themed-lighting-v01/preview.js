import * as T from 'three';
import {getThemedRoom,ROOM_THEMES} from '/src/art/themed-room-library.js';
import {createThemedAssetDepot,createThemedRoomStage} from '/src/art/themed-room-stage.js';
import {createThemedRoomLighting} from '/src/art/themed-room-lighting.js';
import {configureInteriorFlashlight} from '/src/art/interior-lighting.js';
import {createLowLightCamera} from '/src/art/low-light-camera.js';
const $=id=>document.getElementById(id),canvas=$('view');
const pkg=await(await fetch('/art-source/themed-room-showcase/production/layouts.json',{cache:'no-store'})).json();
for(const r of pkg.rooms)$('room').add(new Option(`${r.id} · ${r.name}`,r.id));
const renderer=new T.WebGLRenderer({canvas,antialias:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1025;
const scene=new T.Scene();scene.background=new T.Color(0x090d0b);scene.fog=new T.FogExp2(0x131512,.023);
const camera=new T.PerspectiveCamera(72,innerWidth/innerHeight,.04,45);camera.rotation.order='YXZ';scene.add(camera);
const flash=new T.SpotLight(0xffe6b8,46,20,Math.PI/7,.5,1.25);configureInteriorFlashlight(flash);flash.castShadow=true;flash.shadow.mapSize.set(1024,1024);flash.position.set(.14,-.15,-.12);flash.target.position.set(0,-.08,-6);camera.add(flash,flash.target);
const effect=createLowLightCamera(renderer,scene,camera);effect.resize(innerWidth,innerHeight);effect.setPreset('subtle');
const depot=createThemedAssetDepot();let stage,controller,legacy,localOwned=new Set(),before,dirty=true,loading=false,token=0,drag;
function makeRecipe(design){
 const base=getThemedRoom(design.id),ps=design.layout.placements;
 return {...base,name:design.name,width:design.dimensions[0],depth:design.dimensions[2],height:3,design,composition:design.composition,reveal:design.reveal,
  focus:design.id==='park-03'?[0,1.15,-4.2]:base.focus,ceilingStyle:base.theme==='park'&&['park-02','park-08'].includes(base.id)?'stage':base.theme,
  placements:ps.map(p=>({...p,id:p.layoutId,key:p.layoutId,supportKey:p.supportId??(p.supportKey?ps.find(o=>o.key===p.supportKey)?.layoutId:undefined),autoSupport:Boolean(p.supportId),fixedSupportSlot:Boolean(p.supportId)}))};
}
function oldLights(recipe){
 const g=new T.Group(),theme=ROOM_THEMES.find(t=>t.id===recipe.theme),d=recipe.depth;
 const key=new T.PointLight(recipe.keyColor??theme.color,18,Math.max(8,d),1.8);key.position.set(...recipe.key);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.near=.08;key.shadow.bias=-.0002;key.shadow.normalBias=.025;
 const fill=new T.PointLight(theme.accent,2.4,8,2);fill.position.set(1.8,1.8,d/2-1);
 const bounce=new T.PointLight(0xcac9b7,4,Math.max(8,d),2);bounce.position.set(0,2.65,d/2-1);
 const ambient=new T.HemisphereLight(0x9ca8a8,0x574b3c,.5);for(const l of [key,fill,bounce,ambient]){g.add(l);localOwned.add(l);}stage.root.add(g);return g;
}
function render(){if(!stage||loading)return;renderer.info.reset();effect.render(0);const report={id:stage.recipe.id,mode:$('mode').value,flashlight:flash.visible,lighting:controller.inspect(),layoutUnchanged:JSON.stringify(stage.recipe)===before,colliders:stage.colliders.length,models:stage.inspect().models,skipped:stage.inspect().skippedDressing,position:camera.position.toArray(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};$('report').textContent=JSON.stringify(report,null,2);dirty=false;}
function mode(){if(!stage)return;controller.setEnabled($('mode').value==='new');legacy.visible=$('mode').value==='old';$('intent').textContent=controller.inspect().intent;$('badge').textContent=stage.recipe.name+' · '+$('mode').selectedOptions[0].textContent;dirty=true;}
function entry(){if(!stage)return;camera.position.set(0,1.65,stage.recipe.depth/2-.65);camera.lookAt(...stage.recipe.focus);dirty=true;}
function near(){if(!stage)return;const r=stage.recipe,f=new T.Vector3(...r.focus);for(const z of [f.z+2.5,f.z+3.2,f.z+4])for(const x of [f.x,0,-1,1])if(Math.abs(x)<r.width/2-.3&&Math.abs(z)<r.depth/2-.3&&!stage.colliders.some(b=>x>b.minX-.25&&x<b.maxX+.25&&z>b.minZ-.25&&z<b.maxZ+.25)){camera.position.set(x,1.65,z);camera.lookAt(f);dirty=true;return;}entry();}
async function load(){const seq=++token;loading=true;$('status').textContent='加载最新制作布局…';try{const design=pkg.rooms.find(r=>r.id===$('room').value),recipe=makeRecipe(design),next=await createThemedRoomStage({recipe,depot});if(seq!==token){next.dispose();return;}for(const o of localOwned)o.dispose();localOwned=new Set();stage?.dispose();stage=next;scene.add(stage.root);depot.retainOnly(recipe.placements.map(p=>p.assetId));before=JSON.stringify(recipe);
 controller=stage.root.userData.themedRoomLighting;
 if(!controller){for(const n of stage.root.children)if(n.isLight)n.visible=false;controller=createThemedRoomLighting({root:stage.root,recipe,owned:localOwned});}
 legacy=oldLights(recipe);entry();mode();history.replaceState(null,'','#'+recipe.id);$('status').textContent=`${stage.inspect().models} 个模型 · ${stage.inspect().skippedDressing.length} 件台面待适配 · 灯光检查用，非正式验收`;
 }catch(e){$('status').textContent=`加载失败：${e.message}`;console.error(e);}finally{loading=false;dirty=true;}}
$('room').onchange=load;$('mode').onchange=mode;$('flash').onchange=()=>{flash.visible=$('flash').checked;dirty=true;};$('entry').onclick=entry;$('focus').onclick=near;
$('hide').onclick=()=>{$('panel').hidden=!$('panel').hidden;$('hide').textContent=$('panel').hidden?'展开面板':'收起面板';};
canvas.onpointerdown=e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(!drag)return;camera.rotation.y-=(e.clientX-drag[0])*.0025;camera.rotation.x=T.MathUtils.clamp(camera.rotation.x-(e.clientY-drag[1])*.0025,-1.35,1.35);drag=[e.clientX,e.clientY];dirty=true;};for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>drag=null);
renderer.setAnimationLoop(()=>{if(dirty&&!document.hidden)render();});addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();effect.resize(innerWidth,innerHeight);dirty=true;});
addEventListener('pagehide',()=>{token++;renderer.setAnimationLoop(null);for(const o of localOwned)o.dispose();stage?.dispose();depot.dispose();flash.dispose();effect.dispose();renderer.dispose();},{once:true});
$('room').value=pkg.rooms.some(r=>r.id===location.hash.slice(1))?location.hash.slice(1):'hospital-04';load();
