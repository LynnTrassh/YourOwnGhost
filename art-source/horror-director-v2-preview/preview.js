import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createWorld } from '/src/world.js';
import { generateDream } from '/src/planning/dream.js';
import { createState } from '/src/state.js';
import { movePlayer, overlaps } from '/src/collision.js';
import { wallSurfaces } from '/src/rendering/wall-surfaces.js';
import { configureInteriorFlashlight } from '/src/art/interior-lighting.js';
import { createLowLightCamera } from '/src/art/low-light-camera.js';
import { createShrineRoomFinish } from '/src/art/shrine-room-finish.js';
import { createCrimsonRoom } from '/src/art/crimson-room.js';
import { createCeilingArt } from '/src/art/ceiling-art.js';
import { createEncounterFlash } from '/src/art/encounter-flash.js';

const $=id=>document.getElementById(id),canvas=$('view'),seed='1844070019',roomId='room-8';
const views={
  entry:{position:[30,1.65,-53.5],target:[26.667,1.25,-56.667],name:'入口 · 红色在供奉空间内侧'},
  notice:{position:[30,1.65,-54],target:[26.667,1.25,-56.667],name:'发现 · 原有供奉焦点'},
  recheck:{position:[29.5,1.65,-55],target:[25,1.6,-57.5],name:'确认 · 墙面异常的上缘'},
  ceiling:{position:[29.5,1.65,-55],target:[27,3,-57],name:'抬头 · 灰泥、分格与顶角收边'},
  return:{position:[30,1.65,-54],target:[30,1.65,-51],name:'回望 · 唯一入口也是退路'},
};
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.info.autoReset=false;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1025;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111916);scene.fog=new THREE.Fog(0x111916,9,24);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.06,40);camera.rotation.order='YXZ';scene.add(camera);
const flashlight=new THREE.SpotLight(0xffe6b8,46,20,Math.PI/7,.5,1.25);configureInteriorFlashlight(flashlight);flashlight.castShadow=true;flashlight.shadow.mapSize.set(1024,1024);
flashlight.position.set(.14,-.15,-.12);flashlight.target.position.set(0,-.08,-6);camera.add(flashlight,flashlight.target);
const vhs=createLowLightCamera(renderer,scene,camera);vhs.setPreset('subtle');vhs.resize(innerWidth,innerHeight);
const encounter=createEncounterFlash();
let world,state,crimson,finishArt,finishBindings,ceilingArt,portrait,portraitScene,loaded=false,dirty=true,currentView='entry',yaw=0,pitch=0,previous=performance.now(),sequence=0,inspectFrame=false;
let baselinePlan,baselineColliders,neighborSlots,wallMesh,wallIndex;
const keys=new Set();
const pictures=new Map();
const selectedTexture=()=>pictures.get($('picture').value);
function selectView(id){
  const view=views[id];$('ceiling-room').value='';
  if(world.getColliders().some(box=>overlaps(view.position[0],view.position[2],box)))throw new Error(`观察点被占用：${id}`);
  currentView=id;camera.position.set(...view.position);camera.lookAt(...view.target);yaw=camera.rotation.y;pitch=camera.rotation.x;
  $('caption').textContent=view.name;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===id)));dirty=true;
}
function record(){return {seed,layer:2,roomId,viewRoomId:$('ceiling-room').value||roomId,planHash:world.plan.planHash,variant:$('variant').value,view:currentView,
  camera:{position:camera.position.toArray(),rotation:camera.rotation.toArray(),fov:camera.fov},exposure:renderer.toneMappingExposure,cameraDefects:vhs.inspect(),
  flashlight:flashlight.visible,flashlightProfile:{angle:flashlight.angle,intensity:flashlight.intensity,distance:flashlight.distance,penumbra:flashlight.penumbra,decay:flashlight.decay},art:crimson?.inspect(),finish:finishArt?.inspect(),ceiling:ceilingArt?.inspect(),encounter:encounter.inspect(),picture:$('picture').value,inspectFrame,models:world.artStats,
  unchanged:{plan:JSON.stringify(world.plan)===baselinePlan,colliders:JSON.stringify(world.getColliders())===baselineColliders,
    otherWallSlots:neighborSlots?.every(([i,m])=>wallMesh.material[i]===m)},
  render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},
  scope:'实际 world 静态美术预览；事件未推进；非真人试玩验收'};}
async function createPortrait(){
  const gltf=await new GLTFLoader().loadAsync('/art/horror-models/v01/horror-doll-porcelain-a-v01.glb');
  portraitScene=new THREE.Scene();portraitScene.background=new THREE.Color(0x070506);portraitScene.add(gltf.scene);
  portraitScene.add(new THREE.HemisphereLight(0xad8997,0x100b10,1.6));
  const key=new THREE.DirectionalLight(0xf2c5be,4);key.position.set(-.5,.8,-1);portraitScene.add(key);
  const rim=new THREE.DirectionalLight(0x8d152d,2);rim.position.set(.5,.5,.3);portraitScene.add(rim);
  const portraitCamera=new THREE.PerspectiveCamera(35,1,.01,4);portraitCamera.position.set(0,.37,-.65);portraitCamera.lookAt(0,.37,0);
  portrait=new THREE.WebGLRenderTarget(512,512);const target=renderer.getRenderTarget();
  renderer.setRenderTarget(portrait);renderer.render(portraitScene,portraitCamera);renderer.setRenderTarget(target);
  pictures.set('doll',portrait.texture);
}
async function loadPictures(){
  const response=await fetch('/art/encounter-flashes/v02/manifest.json');if(!response.ok)throw new Error('底图清单加载失败');
  const {assets}=await response.json(),loader=new THREE.TextureLoader();
  for(const asset of assets){
    const texture=await loader.loadAsync(asset.url);texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;
    pictures.set(asset.id,texture);const option=document.createElement('option');option.value=asset.id;option.textContent=asset.name;$('picture').append(option);
  }
}
async function init(){
  const plan=generateDream(seed,{catEnabled:true,preferences:['like.cat','fear.doll'],threatBehaviorId:null,activeEncounters:false})[1];
  const host=plan.rooms.find(r=>r.id===roomId),event=plan.content.instances.find(i=>i.roomId===roomId&&i.definitionId==='RI02');
  const door=plan.doors.find(d=>d.id==='door-7'),near=(a,b)=>Math.abs(a-b)<.001;
  // Other rooms may gain furniture during parallel development. Validate this
  // binding's actual geometry/event anchors instead of accepting a stale plan hash.
  if(host?.type!=='u'||host?.interior?.presetId!=='shrine'||!event||!door
    ||!near(event.focus.x,26.666667)||!near(event.focus.z,-56.666667)
    ||!near(event.observation.x,30)||!near(event.observation.z,-54)
    ||!near(door.x,30)||!near(door.z,-52.5))throw new Error('宿主空间／事件已变化，需重新核对绑定');
  world=createWorld(scene,plan);state=createState(plan);state.player.standing=true;state.doors.bedroom.open=true;
  world.update(2,state);await world.artReady;
  const root=world.solids[0].parent;
  const ceilingRooms=plan.rooms.map(room=>({id:room.id,theme:room.interior?.presetId??'bedroom',bindings:plan.cells.filter(c=>c.roomId===room.id).map(c=>{
    const x=c.x*plan.cellSize,z=c.z*plan.cellSize;
    const mesh=root.children.find(n=>n.isMesh&&Math.abs(n.position.y-3.05)<.001&&Math.abs(n.position.x-x)<.001&&Math.abs(n.position.z-z)<.001&&Math.abs(n.scale.y-.1)<.001);
    if(!mesh)throw new Error(`顶面绑定缺失 ${room.id} ${x},${z}`);return {mesh,x,z};
  })})).filter(r=>r.bindings.length);
  for(const r of ceilingRooms){const option=document.createElement('option');option.value=r.id;option.textContent=`${r.theme} · ${r.id}`;$('ceiling-room').append(option);}
  ceilingArt=createCeilingArt({parent:root,rooms:ceilingRooms});ceilingArt.setEnabled(true);
  wallMesh=world.solids[0];wallIndex=[...new Set(wallSurfaces(plan.walls).map(f=>f.roomId))].indexOf(roomId);
  if(wallIndex<0||!Array.isArray(wallMesh.material))throw new Error('无法确认房间墙材质');
  neighborSlots=wallMesh.material.map((m,i)=>[i,m]).filter(([i])=>i!==wallIndex);
  const fixtures=[];scene.traverse(n=>{if((n.userData.fixtureLight||n.userData.fixtureAccent)&&n.userData.roomId===roomId)fixtures.push(n);});
  const source=[25,1,-57.5],entry=new THREE.Vector3(30,1.65,-52.5);
  scene.updateMatrixWorld(true);
  const nearest=[...fixtures].sort((a,b)=>a.getWorldPosition(new THREE.Vector3()).distanceTo(entry)-b.getWorldPosition(new THREE.Vector3()).distanceTo(entry))[0];
  const focus=new THREE.Vector3(26.667,1.2,-56.667);
  const lights=fixtures.map(light=>({light,role:light.parent===nearest?.parent?'exit':'focus',weight:light.parent===nearest?.parent?1:THREE.MathUtils.clamp(1-light.getWorldPosition(new THREE.Vector3()).distanceTo(focus)*.085,.4,1)}));
  crimson=createCrimsonRoom({roomId,wallBindings:[{mesh:wallMesh,materialIndices:[wallIndex]}],lights,source,radius:6});
  finishBindings=[{mesh:wallMesh,index:wallIndex,role:'wall'}];
  for(const c of plan.cells.filter(c=>c.roomId===roomId)){
    const x=c.x*plan.cellSize,z=c.z*plan.cellSize;
    const floor=root.children.find(n=>n.isMesh&&Math.abs(n.position.y+.06)<.001&&Math.abs(n.position.x-x)<.001&&Math.abs(n.position.z-z)<.001);
    if(!floor)throw new Error('地面绑定缺失');finishBindings.push({mesh:floor,role:'floor'});
  }
  finishBindings.push(...ceilingRooms.find(r=>r.id===roomId).bindings.map(b=>({mesh:b.mesh,role:'ceiling'})));
  finishArt=createShrineRoomFinish({bindings:finishBindings});finishArt.setEnabled(true);crimson.setFinish(true);
  for(const id of Object.keys(views))selectView(id);selectView('entry');
  state.player.x=camera.position.x;state.player.z=camera.position.z;world.update(0,state);
  baselinePlan=JSON.stringify(plan);baselineColliders=JSON.stringify(world.getColliders());
  await createPortrait();await loadPictures();$('picture').value='ghost-bone';loaded=true;dirty=true;
  document.querySelectorAll('button,select,input').forEach(b=>b.disabled=false);
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>selectView(b.dataset.view));
$('panel-toggle').onclick=()=>{const panel=$('controls');panel.hidden=!panel.hidden;$('panel-toggle').textContent=panel.hidden?'展开面板':'收起面板';};
$('ceiling-room').onchange=()=>{
  const id=$('ceiling-room').value;if(!id){selectView('ceiling');return;}
  const cell=world.plan.cells.filter(c=>c.roomId===id).find(c=>!world.getColliders().some(b=>overlaps(c.x*world.plan.cellSize,c.z*world.plan.cellSize,b)));
  if(!cell){$('status').textContent='未找到安全观察点';return;}
  const x=cell.x*world.plan.cellSize,z=cell.z*world.plan.cellSize;camera.position.set(x,1.65,z);camera.lookAt(x-1,3,z-1.5);yaw=camera.rotation.y;pitch=camera.rotation.x;currentView=`ceiling-${id}`;$('caption').textContent=`${id} · 顶面材质与收边`;dirty=true;
};
$('camera-enabled').onchange=()=>{vhs.setEnabled($('camera-enabled').checked);dirty=true;};
$('camera-preset').onchange=()=>{vhs.setPreset($('camera-preset').value);dirty=true;};
$('camera-grain').oninput=()=>{vhs.setGrain(Number($('camera-grain').value));dirty=true;};
$('signal-motion').onchange=()=>{vhs.setMotion($('signal-motion').checked);dirty=true;};
$('signal-preview').onclick=()=>{const p=new THREE.Vector3(26.667,1.25,-56.667).project(camera);if(Math.abs(p.x)>1||Math.abs(p.y)>1||p.z>1){$('status').textContent='焦点不在视野内；不触发故障';return;}vhs.triggerSignal({id:'focus-preview',region:[(p.x+1)/2,(p.y+1)/2,.18,.28],duration:1.2,strength:.6});dirty=true;};
$('signal-cancel').onclick=()=>{vhs.cancelSignal();dirty=true;};
$('vhs-motion').onchange=()=>{dirty=true;};
$('finish').onchange=()=>{finishArt.setEnabled($('finish').checked);crimson.setFinish($('finish').checked);dirty=true;};
$('ceiling').onchange=()=>{finishArt.dispose();ceilingArt.setEnabled($('ceiling').checked);finishArt=createShrineRoomFinish({bindings:finishBindings});finishArt.setEnabled($('finish').checked);dirty=true;};
$('variant').onchange=()=>{crimson.setVariant($('variant').value);dirty=true;};
$('flashlight').onchange=()=>{flashlight.visible=$('flashlight').checked;state.player.flashlight=flashlight.visible;dirty=true;};
$('mode').onchange=()=>{inspectFrame=false;encounter.setMode($('mode').value);dirty=true;};
$('trigger').onclick=()=>{if(inspectFrame)encounter.cancel();inspectFrame=false;encounter.setMode($('mode').value);encounter.trigger({texture:selectedTexture(),id:`preview-${++sequence}`});dirty=true;};
$('cancel').onclick=()=>{inspectFrame=false;encounter.cancel();dirty=true;};
$('frame').onclick=()=>{encounter.setMode('full');$('mode').value='full';encounter.trigger({texture:selectedTexture(),id:`inspection-${++sequence}`});encounter.update(.14);inspectFrame=true;dirty=true;};
$('picture').onchange=()=>{if(inspectFrame)$('frame').onclick();else{encounter.cancel();dirty=true;}};
$('export').onclick=async()=>{
  render();const name=`crimson-${currentView}-${$('variant').value}-${$('picture').value}-${ceilingArt.inspect().enabled?'ceiling-on':'ceiling-off'}-${$('finish').checked?'finish-v2':'finish-off'}`;
  $('image-download').download=name+'.png';$('image-download').href=canvas.toDataURL('image/png');
  $('record-download').download=name+'.json';$('record-download').href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(record(),null,2));
  $('exports').hidden=false;
  try{
    const response=await fetch('http://127.0.0.1:4197/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,png:$('image-download').href,record:record()})});
    if(response.ok){const {saved}=await response.json();$('status').textContent=`评审画面已保存：${saved}`;}
  }catch{/* Download links remain available without the optional local recorder. */}
};
let drag;
canvas.onpointerdown=e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);canvas.focus();};
canvas.onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-drag[0])*.003;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag[1])*.003,-1.35,1.35);camera.rotation.set(pitch,yaw,0);drag=[e.clientX,e.clientY];dirty=true;};
canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
canvas.onkeydown=e=>{if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){keys.add(e.code);e.preventDefault();}};
addEventListener('keyup',e=>keys.delete(e.code));canvas.onblur=()=>keys.clear();
addEventListener('blur',()=>{keys.clear();drag=null;});
document.addEventListener('visibilitychange',()=>{encounter.cancel();vhs.cancelSignal();keys.clear();previous=performance.now();dirty=true;});
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();vhs.resize(innerWidth,innerHeight);dirty=true;});
function render(){
  state.player.x=camera.position.x;state.player.z=camera.position.z;world.update(0,state);renderer.info.reset();vhs.render($('vhs-motion').checked||vhs.inspect().signal.active?performance.now()/1000:0);encounter.render(renderer);
  if(loaded){const data=record();$('diagnostics').textContent=JSON.stringify(data,null,2);
    $('status').textContent=`${world.artStats.loaded} 模型 · ${world.artStats.failed.length} 失败 · ${renderer.info.render.calls} 绘制 · 规划/碰撞/邻墙 ${Object.values(data.unchanged).every(Boolean)?'未变':'需检查'}`;}
  dirty=false;
}
renderer.setAnimationLoop(now=>{
  const elapsed=Math.max(0,(now-previous)/1000);previous=now;if(document.hidden||!world)return;
  const signalWasActive=vhs.inspect().signal.active;vhs.update(elapsed);if(signalWasActive)dirty=true;
  const wasActive=encounter.inspect().active;if(!inspectFrame)encounter.update(elapsed);if(wasActive&&!inspectFrame)dirty=true;
  if(loaded&&keys.size){
    const f=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),s=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
    const scale=1.5*Math.min(elapsed,.04)/Math.max(1,Math.hypot(f,s)),player={x:camera.position.x,z:camera.position.z};
    movePlayer(player,(s*Math.cos(yaw)-f*Math.sin(yaw))*scale,(-f*Math.cos(yaw)-s*Math.sin(yaw))*scale,world.getColliders());camera.position.set(player.x,1.65,player.z);dirty=true;
  }
  if($('vhs-motion').checked)dirty=true;
  if(dirty||!loaded)render();
});
addEventListener('pagehide',()=>{
  renderer.setAnimationLoop(null);finishArt?.dispose();crimson?.dispose();ceilingArt?.dispose();encounter.dispose();portrait?.dispose();
  for(const [id,texture] of pictures)if(id!=='doll')texture.dispose();pictures.clear();
  const geometries=new Set(),materials=new Set(),textures=new Set();portraitScene?.traverse(n=>{
    if(n.geometry)geometries.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[])materials.add(m);
  });
  for(const m of materials){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}
  for(const g of geometries)g.dispose();for(const t of textures)t.dispose();
  world?.dispose();flashlight.dispose();vhs.dispose();renderer.dispose();
},{once:true});
init().catch(error=>{$('status').textContent=error.message;console.error(error);renderer.setAnimationLoop(null);});
