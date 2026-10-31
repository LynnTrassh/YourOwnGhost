import * as T from 'three';
import {ROOM_THEMES,THEMED_ROOMS as BASE_ROOMS,getThemedRoom} from '/src/art/themed-room-library.js';
import {createThemedAssetDepot,createThemedRoomStage} from '/src/art/themed-room-stage.js';
import {configureInteriorFlashlight} from '/src/art/interior-lighting.js';
import {createLowLightCamera} from '/src/art/low-light-camera.js';
const $=id=>document.getElementById(id),canvas=$('view');
const productionPackage=await (await fetch('./production/layouts.json')).json();
const productionById=new Map(productionPackage.rooms.map(r=>[r.id,r]));
const THEMED_ROOMS=BASE_ROOMS.map(r=>({...r,name:productionById.get(r.id)?.name??r.name}));
function productionRecipe(id){
 const base=getThemedRoom(id),design=productionById.get(id);if(!design)throw new Error('缺少完整布局 '+id);
 if(design.missingAssets.length)throw new Error('核心资产未交付：'+design.missingAssets.join(', '));
 const originals=design.layout.placements;
 const placements=originals.map(p=>({...p,id:p.layoutId,key:p.layoutId,
  supportKey:p.supportId??(p.supportKey?originals.find(o=>o.key===p.supportKey)?.layoutId:undefined),
  autoSupport:Boolean(p.supportId),fixedSupportSlot:Boolean(p.supportId)}));
 return {...base,name:design.name,width:design.dimensions[0],depth:design.dimensions[2],height:3,placements,
  composition:design.composition,reveal:design.reveal,design,ceilingStyle:base.theme==='park'&&['park-02','park-08'].includes(id)?'stage':base.theme,
  focus:id==='park-03'?[0,1.15,-4.2]:base.focus,productionStatus:'制作布局 V2 · 实际模型候选'};
}

const renderer=new T.WebGLRenderer({canvas,antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1025;
const scene=new T.Scene();scene.background=new T.Color(0x090d0b);scene.fog=new T.FogExp2(0x131512,.023);
const camera=new T.PerspectiveCamera(72,innerWidth/innerHeight,.04,45);scene.add(camera);camera.rotation.order='YXZ';
const flashlight=new T.SpotLight(0xffe6b8,46,20,Math.PI/7,.5,1.25);configureInteriorFlashlight(flashlight);flashlight.castShadow=true;flashlight.shadow.mapSize.set(1024,1024);flashlight.position.set(.14,-.15,-.12);flashlight.target.position.set(0,-.08,-6);camera.add(flashlight,flashlight.target);
const effect=createLowLightCamera(renderer,scene,camera);effect.resize(innerWidth,innerHeight);effect.setPreset('subtle');
const depot=createThemedAssetDepot();let stage=null,current=0,generation=0,busy=false,auditing=false,disposed=false,touring=false,sequence=false,elapsed=0,previous=performance.now(),time=0,yaw=0,pitch=0,baseYaw=0,basePitch=0;const keys=new Set();
for(const t of ROOM_THEMES)$('theme').add(new Option(t.name,t.id));
function syncMenu(){const r=THEMED_ROOMS[current];$('theme').value=r.theme;$('room').replaceChildren(...THEMED_ROOMS.filter(v=>v.theme===r.theme).map(v=>new Option(v.id.slice(-2)+' · '+v.name,v.id)));$('room').value=r.id;}
function setLook(){camera.rotation.set(pitch,yaw,0);}
function entrance(){if(!stage)return;camera.position.set(0,1.65,stage.recipe.depth/2-.65);camera.lookAt(...stage.recipe.focus);yaw=camera.rotation.y;pitch=camera.rotation.x;baseYaw=yaw;basePitch=pitch;elapsed=0;}
function status(){if(!stage)return;$('status').textContent=`${current+1}/48 · ${stage.inspect().models} 个带贴图模型 · ${stage.recipe.width}×${stage.recipe.depth}米 · 天花3米 · ${stage.inspect().skippedDressing.length?'有'+stage.inspect().skippedDressing.length+'件台面摆件待适配':'模型全部落位'} · 已注册正式候选池 · 当前页为独立布景检查`;}
async function choose(index){
 const token=++generation;busy=true;current=(index+48)%48;syncMenu();history.replaceState(null,'','#'+THEMED_ROOMS[current].id);effect.cancelSignal();$('loading').hidden=false;const recipe=productionRecipe(THEMED_ROOMS[current].id);
 try {const next=await createThemedRoomStage({recipe,depot});if(token!==generation||disposed){next.dispose();return;}stage?.dispose();stage=next;depot.retainOnly(recipe.placements.map(p=>p.assetId));scene.add(stage.root);entrance();$('composition').textContent=recipe.composition;$('reveal').textContent='发现过程：'+recipe.reveal;$('name').textContent=recipe.name;$('code').textContent=`${ROOM_THEMES.find(t=>t.id===recipe.theme).name} / ${recipe.id.slice(-2)} · ${recipe.width}×${recipe.depth}m`;renderer.compile(scene,camera);renderer.info.reset();effect.render(time);status();canvas.dataset.loaded=recipe.id;canvas.dataset.report=JSON.stringify(stage.inspect());
 }catch(e){$('status').textContent=`加载失败：${e.message}`;console.error(e);throw e;}finally{if(token===generation){busy=false;$('loading').hidden=true;}}
}
function canStand(x,z){if(!stage)return false;const r=.24,{width,depth}=stage.recipe;if(Math.abs(x)>width/2-r||Math.abs(z)>depth/2-r)return false;return !stage.colliders.some(b=>x>b.minX-r&&x<b.maxX+r&&z>b.minZ-r&&z<b.maxZ+r);}
function move(dx,dz){const max=Math.max(Math.abs(dx),Math.abs(dz)),steps=Math.max(1,Math.ceil(max/.08));for(let i=0;i<steps;i++){if(canStand(camera.position.x+dx/steps,camera.position.z))camera.position.x+=dx/steps;if(canStand(camera.position.x,camera.position.z+dz/steps))camera.position.z+=dz/steps;}}
function clean(){document.body.classList.toggle('clean');}
function stopTour(){touring=false;sequence=false;$('tour').textContent='慢速观景';$('sequence').textContent='连续展映 48 间';}
function switchRoom(index){if(auditing)return;stopTour();choose(index).catch(()=>{});}
$('theme').onchange=()=>switchRoom(THEMED_ROOMS.findIndex(r=>r.theme===$('theme').value));$('room').onchange=()=>switchRoom(THEMED_ROOMS.findIndex(r=>r.id===$('room').value));$('prev').onclick=()=>switchRoom(current-1);$('next').onclick=()=>switchRoom(current+1);
$('entry').onclick=()=>{stopTour();entrance();};$('ceiling').onclick=()=>{stopTour();entrance();pitch=.85;setLook();};$('hide').onclick=$('corner').onclick=clean;
$('tour').onclick=()=>{touring=!touring;sequence=false;entrance();$('tour').textContent=touring?'停止观景':'慢速观景';};$('sequence').onclick=()=>{sequence=!sequence;touring=sequence;entrance();$('sequence').textContent=sequence?'停止展映':'连续展映 48 间';};
$('flash').onchange=()=>flashlight.visible=$('flash').checked;$('camera').onchange=()=>effect.setPreset($('camera').value);
$('walk').onclick=()=>{stopTour();canvas.requestPointerLock?.();};
$('signal').onclick=()=>{if(!stage)return;const p=new T.Vector3(...stage.recipe.focus).project(camera),x=(p.x+1)/2,y=(p.y+1)/2;if(x<0||x>1||y<0||y>1||p.z>1){$('status').textContent='焦点在画面外，请先看向异常。';return;}effect.triggerSignal({id:stage.recipe.id,region:[x,y,.2,.3],duration:1,strength:.55});};
let dragging=false,last=[0,0];canvas.onpointerdown=e=>{dragging=true;last=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);stopTour();};canvas.onpointerup=()=>dragging=false;canvas.onpointercancel=()=>dragging=false;
addEventListener('pointermove',e=>{if(document.pointerLockElement!==canvas&&!dragging)return;const dx=document.pointerLockElement===canvas?e.movementX:e.clientX-last[0],dy=document.pointerLockElement===canvas?e.movementY:e.clientY-last[1];last=[e.clientX,e.clientY];yaw-=dx*.0025;pitch=Math.max(-1.35,Math.min(1.35,pitch-dy*.0025));setLook();});
addEventListener('keydown',e=>{if(['SELECT','INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;const k=e.key.toLowerCase();keys.add(k);if(e.repeat)return;if(k==='h')clean();if(k==='f'){flashlight.visible=!flashlight.visible;$('flash').checked=flashlight.visible;}if(k==='q')switchRoom(current-1);if(k==='e')switchRoom(current+1);if(k===' '){e.preventDefault();stopTour();}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
function record(){return {scope:'六主题艺术布局预览；非正式地图接入或真人验收',...stage.inspect(),recipe:stage.recipe,camera:camera.position.toArray(),flashlight:{angle:flashlight.angle,intensity:flashlight.intensity,penumbra:flashlight.penumbra,enabled:flashlight.visible},effect:effect.inspect(),renderer:{drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,viewport:[innerWidth,innerHeight],pixelRatio:renderer.getPixelRatio()},cache:depot.inspect()};}
async function capture(){renderer.info.reset();effect.render(time);const response=await fetch('http://127.0.0.1:4198/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'production-'+stage.recipe.id,png:canvas.toDataURL('image/png'),record:record()})});if(!response.ok)throw new Error('录屏检查器未响应');return (await response.json()).saved;}
$('capture').onclick=async()=>{try{$('status').textContent='已保存 '+await capture();}catch(e){$('status').textContent='请先启动 art-source/themed-room-showcase/capture-server.mjs';}};
$('audit').onclick=async()=>{if(auditing)return;auditing=true;stopTour();const start=current;document.querySelectorAll('button,select,input').forEach(n=>n.disabled=true);let done=0;try{for(let i=0;i<48;i++){await choose(i);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);await capture();done++;$('status').textContent=`已核验记录 ${done}/48`;}}catch(e){$('status').textContent=`记录中断 ${done}/48：${e.message}`;console.error(e);}finally{await choose(start);document.querySelectorAll('button,select,input').forEach(n=>n.disabled=false);auditing=false;$('status').textContent=`已核验记录 ${done}/48 间，检查结果在 captures/。`;}};
renderer.setAnimationLoop(now=>{const dt=Math.min(.05,Math.max(0,(now-previous)/1000));previous=now;if(!stage||busy||document.hidden||disposed)return;time+=dt;elapsed+=dt;if(touring&&!auditing){yaw=baseYaw+Math.sin(elapsed*.22)*.22;pitch=basePitch+Math.sin(elapsed*.17)*.035;setLook();if(sequence&&elapsed>14)choose(current+1).catch(()=>stopTour());}else if(keys.size){const speed=(keys.has('shift')?2.3:1.35)*dt,forward=(keys.has('w')?1:0)-(keys.has('s')?1:0),side=(keys.has('d')?1:0)-(keys.has('a')?1:0),norm=Math.hypot(forward,side)||1;move((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed/norm,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed/norm);}effect.update(dt);renderer.info.reset();effect.render(time);if($('data').parentElement.open)$('data').textContent=JSON.stringify({id:stage.recipe.id,models:stage.inspect().models,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,camera:camera.position.toArray().map(v=>+v.toFixed(2))},null,2);});
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();effect.resize(innerWidth,innerHeight);});document.addEventListener('visibilitychange',()=>{keys.clear();effect.cancelSignal();previous=performance.now();});
addEventListener('pagehide',()=>{disposed=true;generation++;renderer.setAnimationLoop(null);stage?.dispose();depot.dispose();effect.dispose();flashlight.dispose();renderer.dispose();},{once:true});
choose(Math.max(0,THEMED_ROOMS.findIndex(r=>r.id===location.hash.slice(1)))).catch(()=>{});
