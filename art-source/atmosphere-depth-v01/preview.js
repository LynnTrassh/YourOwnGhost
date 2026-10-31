import * as THREE from 'three';
import {createWorld} from '/src/world.js';
import {generateDream} from '/src/planning/dream.js';
import {createState} from '/src/state.js';
import {overlaps} from '/src/collision.js';
import {configureInteriorFlashlight,setInteriorDepthLighting,inspectInteriorLighting} from '/src/art/interior-lighting.js';
import {setInteriorMaterialResponse} from '/src/art/interior-material-response.js';
import {createEdgeGrainCamera} from '/src/art/camera-edge-grain.js';
const $=id=>document.getElementById(id),canvas=$('view');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1025;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111916);scene.fog=new THREE.Fog(0x111916,9,24);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.06,40);camera.rotation.order='YXZ';scene.add(camera);
const flashlight=new THREE.SpotLight(0xffe6b8,46,20,Math.PI/7,.5,1.25);configureInteriorFlashlight(flashlight);
flashlight.position.set(.14,-.15,-.12);flashlight.target.position.set(0,-.08,-6);flashlight.castShadow=true;flashlight.shadow.mapSize.set(1024,1024);camera.add(flashlight,flashlight.target);
const effect=createEdgeGrainCamera(renderer,scene,camera);effect.resize(innerWidth,innerHeight);
const plan=generateDream('1844070019',{catEnabled:true,preferences:['like.cat','fear.doll'],threatBehaviorId:null,activeEncounters:false})[1];
const before=JSON.stringify(plan),world=createWorld(scene,plan),state=createState(plan);
state.player.standing=true;state.doors.bedroom.open=true;world.update(2,state);
const beforeCollision=JSON.stringify(world.getColliders());
let room=plan.rooms[0],yaw=0,pitch=0,drag=null,dirty=true,clock=0,ready=false,furnitureIndex=-1;
function canStand(x,z){return !world.getColliders().some(b=>overlaps(x,z,b))&&room.cells.some(([cx,cz])=>cx===Math.round(x/plan.cellSize)&&cz===Math.round(z/plan.cellSize));}
function pose(p,t){camera.position.set(...p);camera.lookAt(...t);yaw=camera.rotation.y;pitch=camera.rotation.x;dirty=true;}
function entry(){
 const points=room.cells.map(([x,z])=>[x*plan.cellSize,z*plan.cellSize]).filter(([x,z])=>canStand(x,z));
 const p=points[0];if(!p){$('status').textContent='无安全观察点';return;}
 const c=room.center.map(v=>v*plan.cellSize);pose([p[0],1.65,p[1]],[c[0]+.1,1.3,c[1]+.1]);
}
function furniture(){
 const items=plan.obstacles.filter(b=>b.roomId===room.id&&b.prefabId);
 for(let i=0;i<items.length;i++){
  const item=items[(++furnitureIndex)%items.length],x=(item.minX+item.maxX)/2,z=(item.minZ+item.maxZ)/2,n=item.wallNormal??[0,1];
  for(const distance of [2.8,2.1,3.5])for(const side of [0,1.5,-1.5]){
   const px=x-n[0]*distance+n[1]*side,pz=z-n[1]*distance-n[0]*side;
   if(canStand(px,pz)){pose([px,1.65,pz],[x,1.1,z]);return;}
  }
 }entry();
}
function update(){
 const mode=$('mode').value;
 setInteriorDepthLighting(scene,['lighting','combined'].includes(mode));
 setInteriorMaterialResponse(scene,['material','combined'].includes(mode));
 $('badge').textContent=$('mode').selectedOptions[0].textContent+' · '+room.id;
 dirty=true;lastReport=-Infinity;
}
$('mode').addEventListener('change',update);
$('flash').addEventListener('change',()=>{flashlight.visible=$('flash').checked;dirty=true;lastReport=-Infinity;});
$('motion').addEventListener('change',()=>{dirty=true;});
$('toggle').addEventListener('click',()=>{$('controls').hidden=!$('controls').hidden;$('toggle').textContent=$('controls').hidden?'展开面板':'收起面板';});
$('room').replaceChildren(...plan.rooms.map(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=`${r.id} · ${r.interior?.presetId??r.name}`;return o;}));
$('room').addEventListener('change',()=>{room=plan.rooms.find(r=>r.id===$('room').value);furnitureIndex=-1;furniture();update();});
$('entry').addEventListener('click',entry);$('furniture').addEventListener('click',furniture);
canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag[0])*.003;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag[1])*.003,-1.35,1.35);drag=[e.clientX,e.clientY];camera.rotation.set(pitch,yaw,0);dirty=true;});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
addEventListener('blur',()=>drag=null);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();effect.resize(innerWidth,innerHeight);dirty=true;});
let previous=performance.now(),lastReport=0;
renderer.setAnimationLoop(now=>{
 const dt=Math.max(0,Math.min(.05,(now-previous)/1000));previous=now;if(document.hidden)return;
 if($('motion').checked){clock+=dt;dirty=true;}if(!dirty)return;
 state.player.x=camera.position.x;state.player.z=camera.position.z;world.update(0,state);effect.render(clock);dirty=false;
 if(ready&&now-lastReport>1000){lastReport=now;$('report').textContent=JSON.stringify({seed:'1844070019',layer:2,planHash:plan.planHash,room:room.id,mode:$('mode').value,lighting:inspectInteriorLighting(scene),collidersUnchanged:JSON.stringify(world.getColliders())===beforeCollision,settings:effect.inspect(),position:camera.position.toArray(),planUnchanged:JSON.stringify(plan)===before,loaded:world.artStats.loaded,failed:world.artStats.failed.length,mainIntegrated:true},null,2);}
});
entry();update();
world.artReady.then(()=>{
 ready=true;for(const id of ['room','entry','furniture'])$(id).disabled=false;
 room=plan.rooms.find(r=>r.id==='room-1')??room;$('room').value=room.id;furniture();furniture();update();
 $('status').textContent=`${world.artStats.loaded} 模型 / ${world.artStats.failed.length} 加载失败 · 计划${JSON.stringify(plan)===before?'未修改':'发生变化'}`;
}).catch(e=>{$('status').textContent=e.message;console.error(e);});
addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);effect.dispose();world.dispose();renderer.dispose();},{once:true});
