import * as THREE from 'three';
import {createCableRoom} from '/src/art/cable-room.js';
import {createWorld} from '/src/world.js';
import {generateDream} from '/src/planning/dream.js';
import {contentTokensForInputs} from '/src/personalization/content-tokens.js';
import {createState} from '/src/state.js';
import {overlaps,movePlayer} from '/src/collision.js';
import {configureInteriorFlashlight} from '/src/art/interior-lighting.js';
import {createVhsEffect} from '/src/art/vhs-effect.js';
import {ROOM_COMPLETENESS_PRESETS} from '/src/art/room-completeness.js';
const $=id=>document.getElementById(id),canvas=$('view'),seed='1844070019';
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1025;renderer.info.autoReset=false;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111916);scene.fog=new THREE.Fog(0x111916,9,24);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.06,40);camera.rotation.order='YXZ';scene.add(camera);
const flashlight=new THREE.SpotLight(0xffe6b8,46,20,Math.PI/7,.5,1.25);configureInteriorFlashlight(flashlight);flashlight.position.set(.14,-.15,-.12);flashlight.target.position.set(0,-.08,-6);flashlight.castShadow=true;flashlight.shadow.mapSize.set(1024,1024);camera.add(flashlight,flashlight.target);
const vhs=createVhsEffect(renderer,scene,camera);vhs.setIntensity(.62);vhs.setFlashlight(true);vhs.resize(innerWidth,innerHeight);
const dream=generateDream(seed,{catEnabled:false,preferences:contentTokensForInputs('none','generic'),threatBehaviorId:null});
const baseline=await (await fetch('./baseline/dream-1844070019.json')).json();
let cableController=null;
let world,state,group,stats,room,detailIndex=-1,furnitureIndex=-1,yaw=0,pitch=0,dirty=true,loading=false,sequence=0;
const keys=new Set();
function canStand(x,z){return !world.getColliders().some(b=>overlaps(x,z,b))&&room.cells.some(([cx,cz])=>cx===Math.round(x/world.plan.cellSize)&&cz===Math.round(z/world.plan.cellSize));}
function pose(position,target){camera.position.set(...position);camera.lookAt(...target);yaw=camera.rotation.y;pitch=camera.rotation.x;dirty=true;}
function entry(){
  const cells=new Set(room.cells.map(c=>c.join(','))),door=world.plan.doors.find(d=>d.cells.some(c=>cells.has(c.join(','))));
  const ordered=room.cells.map(([x,z])=>[x*world.plan.cellSize,z*world.plan.cellSize]).filter(([x,z])=>canStand(x,z));
  ordered.sort((a,b)=>Math.hypot(a[0]-(door?.x??0),a[1]-(door?.z??0))-Math.hypot(b[0]-(door?.x??0),b[1]-(door?.z??0)));
  const p=ordered[0];if(!p){$('status').textContent='当前房间无安全观察点';return;}
  const c=room.center.map(n=>n*world.plan.cellSize),dx=door?p[0]-door.x:c[0]-p[0],dz=door?p[1]-door.z:c[1]-p[1],length=Math.max(.01,Math.hypot(dx,dz));
  pose([p[0],1.65,p[1]],[p[0]+dx/length*4,1.45,p[1]+dz/length*4]);
}
function detail(){
  const items=stats.rooms.find(r=>r.roomId===room.id)?.placements??[];
  for(let i=0;i<items.length;i++){
    detailIndex=(detailIndex+1)%items.length;const item=items[detailIndex],p=item.position,n=item.normal;
    for(const distance of [2.1,1.65,1.25]){
      const x=p[0]+n[0]*distance,z=p[2]+n[1]*distance;
      if(canStand(x,z)){pose([x,1.65,z],[p[0],p[1]+.55,p[2]]);return;}
    }
  }
  entry();
}
function selectRoom(){cableController?.dispose();room=world.plan.rooms.find(r=>r.id===$('room').value);detailIndex=-1;furnitureIndex=-1;cableController=createCableRoom({plan:world.plan,root:scene,roomId:room.id});cableController.setEnabled($('cables').checked);entry();$('caption').textContent=`${room.name} · ${ROOM_COMPLETENESS_PRESETS[room.interior?.presetId]?.name??room.interior?.presetId}`;}
function furniture(){
  const items=world.plan.obstacles.filter(b=>b.roomId===room.id&&b.compositionGroup&&b.compositionRole==='primary');
  const item=items.length?items[(++furnitureIndex)%items.length]:world.plan.obstacles.find(b=>b.roomId===room.id&&b.prefabId);
  if(!item){entry();return;}
  const x=(item.minX+item.maxX)/2,z=(item.minZ+item.maxZ)/2,n=item.wallNormal??[0,1];
  for(const distance of [3.5,2.8,2.1])for(const side of [0,1.5,-1.5]){
    const px=x-n[0]*distance+n[1]*side,pz=z-n[1]*distance-n[0]*side;
    if(canStand(px,pz)){pose([px,1.65,pz],[x,.9,z]);return;}
  }entry();
}
$('reverse').addEventListener('click',()=>{entry();const doorPosition=camera.position.clone();furniture();camera.lookAt(doorPosition);yaw=camera.rotation.y;pitch=camera.rotation.x;dirty=true;});
$('middle').addEventListener('click',()=>{const target=camera.position.clone();const c=room.cells.map(([x,z])=>[x*world.plan.cellSize,z*world.plan.cellSize]).filter(([x,z])=>canStand(x,z)).sort((a,b)=>Math.hypot(a[0]-room.center[0]*world.plan.cellSize,a[1]-room.center[1]*world.plan.cellSize)-Math.hypot(b[0]-room.center[0]*world.plan.cellSize,b[1]-room.center[1]*world.plan.cellSize))[0];if(c)pose([c[0],1.65,c[1]],[target.x,1.4,target.z]);});
$('furniture').addEventListener('click',furniture);
async function load(){
  const token=++sequence,previousRoom=room?.id,previousPose={position:camera.position.clone(),quaternion:camera.quaternion.clone()};loading=true;group=null;stats=null;cableController?.dispose();world?.dispose();
  const plan=($('mode').value==='baseline'?baseline:dream)[Number($('layer').value)];world=createWorld(scene,plan);state=createState(plan);state.player.standing=true;state.doors.bedroom.open=true;world.update(2,state);
  scene.traverse(n=>{if(n.userData.roomCompleteness){group=n;stats=n.userData.roomCompleteness;}});
  $('room').replaceChildren(...plan.rooms.map(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=`${r.id} · ${ROOM_COMPLETENESS_PRESETS[r.interior?.presetId]?.name??r.interior?.presetId}`;return o;}));
  $('dressing').checked=true;if(previousRoom&&plan.rooms.some(r=>r.id===previousRoom))$('room').value=previousRoom;selectRoom();if(previousRoom===room.id&&canStand(previousPose.position.x,previousPose.position.z)){camera.position.copy(previousPose.position);camera.quaternion.copy(previousPose.quaternion);yaw=camera.rotation.y;pitch=camera.rotation.x;}$('status').textContent='加载全层模型…';
  await world.artReady;if(token!==sequence)return;loading=false;dirty=true;
  $('report').textContent=JSON.stringify({seed,layer:Number($('layer').value)+1,planHash:plan.planHash,models:world.artStats,props:plan.obstacles.filter(o=>o.prefabId?.startsWith('prop-')||o.variantId).map(o=>({roomId:o.roomId,id:o.prefabId,variantId:o.variantId})),...stats},null,2);
}
$('mode').addEventListener('change',()=>load());$('cables').addEventListener('change',()=>{cableController?.setEnabled($('cables').checked);dirty=true;});
$('layer').addEventListener('change',()=>load().catch(error=>{$('status').textContent=error.message;console.error(error);}));$('room').addEventListener('change',selectRoom);$('entry').addEventListener('click',entry);$('detail').addEventListener('click',detail);
$('dressing').addEventListener('change',()=>{if(group)group.visible=$('dressing').checked;dirty=true;});$('flash').addEventListener('change',()=>{flashlight.visible=$('flash').checked;vhs.setFlashlight(flashlight.visible);dirty=true;});
let drag=null;canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);canvas.focus();});canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag[0])*.003;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag[1])*.003,-1.35,1.35);drag=[e.clientX,e.clientY];camera.rotation.set(pitch,yaw,0);dirty=true;});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
canvas.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){keys.add(e.code);e.preventDefault();}});addEventListener('keyup',e=>keys.delete(e.code));canvas.addEventListener('blur',()=>keys.clear());addEventListener('blur',()=>{keys.clear();drag=null;});
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();vhs.resize(innerWidth,innerHeight);dirty=true;});
let previous=performance.now();renderer.setAnimationLoop(now=>{
  const dt=Math.min(.04,(now-previous)/1000);previous=now;if(document.hidden||!world)return;
  if(keys.size&&!loading){const f=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),s=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),speed=1.5*dt/Math.max(1,Math.hypot(f,s)),p={x:camera.position.x,z:camera.position.z};movePlayer(p,(s*Math.cos(yaw)-f*Math.sin(yaw))*speed,(-f*Math.cos(yaw)-s*Math.sin(yaw))*speed,world.getColliders());camera.position.set(p.x,1.65,p.z);dirty=true;}
  if(!dirty&&!loading)return;state.player.x=camera.position.x;state.player.z=camera.position.z;world.update(0,state);renderer.info.reset();vhs.render(0);dirty=false;canvas.dataset.pose=JSON.stringify({layer:Number($('layer').value)+1,roomId:room.id,position:camera.position.toArray(),yaw,pitch,fov:camera.fov});
  if(!loading){const r=stats.rooms.find(r=>r.roomId===room.id);$('status').textContent=`全层 ${stats.clusters} 组 / ${stats.draws} 批次 · 本房 ${r.floorFurniture} 件家具 / ${r.floorPlan?.groups?.length??0} 个新增功能组 / ${r.placed} 组墙面陈设 · ${world.artStats.loaded} 模型 / ${world.artStats.failed.length} 失败 · 电线${cableController?.stats.enabled?"已开启":"预览关闭"}：${cableController?.stats.enabled?cableController.stats.strands:0} 束${r.needsFloorPlan?' · 大件家具占位待补':''}${r.reason?' · '+r.reason:''}`;}
});
addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);cableController?.dispose();world?.dispose();vhs.dispose();renderer.dispose();},{once:true});
load().catch(error=>{$('status').textContent=error.message;console.error(error);});
