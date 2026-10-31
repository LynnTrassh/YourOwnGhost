import * as THREE from 'three';
import {generateDream} from '/src/planning/dream.js';
import {createWorld} from '/src/world.js';
import {createState} from '/src/state.js';
import {createVhsEffect} from '/src/art/vhs-effect.js';
import {configureInteriorFlashlight} from '/src/art/interior-lighting.js';
import {createDetailRecipe,DETAIL_RECIPES} from '/src/art/room-detail-recipes.js';
import {createReviewViews} from './review-views.mjs';
const $=s=>document.querySelector(s),query=new URLSearchParams(location.search);
const scenarios={parlor:{seed:'2',layer:1,roomId:'room-11',recipeId:'absent-tea'},archive:{seed:'1844070019',layer:2,roomId:'room-5',recipeId:'missing-index'}};
const scenario=query.get('room') in scenarios?query.get('room'):'parlor',config=scenarios[scenario];
$('#scenario').value=scenario;$('#scenario').onchange=()=>{location.search=`?room=${$('#scenario').value}`;};
$('#toggle').onclick=()=>{document.body.classList.toggle('clean');$('#toggle').textContent=document.body.classList.contains('clean')?'显示说明':'隐藏说明';};
const renderer=new THREE.WebGLRenderer({antialias:true});document.body.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1025;
renderer.info.autoReset=false;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111916);scene.fog=new THREE.Fog(0x111916,9,24);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.06,80);scene.add(camera);
const flashlight=new THREE.SpotLight(0xffe6b8,24,17,Math.PI/7,.72,1.65);configureInteriorFlashlight(flashlight);
flashlight.position.set(.14,-.15,-.12);flashlight.target.position.set(0,-.08,-6);flashlight.castShadow=true;flashlight.shadow.mapSize.set(1024,1024);camera.add(flashlight,flashlight.target);
const effect=createVhsEffect(renderer,scene,camera);effect.setIntensity(.6);effect.resize(innerWidth,innerHeight);
const dream=generateDream(config.seed,{catEnabled:false}),replay=generateDream(config.seed,{catEnabled:false});
const plan=dream[config.layer-1],planBefore=JSON.stringify(plan),state=createState(plan);state.layer=config.layer;state.player.standing=true;state.doors.bedroom.open=true;
const stateBefore=JSON.stringify(state.story),world=createWorld(scene,plan);await world.artReady;world.update(1,state);scene.updateMatrixWorld(true);
const targets=[];scene.traverse(node=>{const d=node.userData.roomDetail;if(d?.kind==='tabletop'&&d.roomId===config.roomId&&DETAIL_RECIPES[config.recipeId].prefabs.includes(d.prefab))targets.push(node);});
targets.sort((a,b)=>a.userData.roomDetail.obstacleId.localeCompare(b.userData.roomDetail.obstacleId));
let controller,review,target;
for(const node of targets){
 const focus=node.getWorldPosition(new THREE.Vector3());focus.y+=.035;
 const candidateViews=createReviewViews({plan,roomId:config.roomId,focus,obstacleId:node.userData.roomDetail.obstacleId,colliders:world.getColliders()});
 if(!candidateViews)continue;
 const candidate=createDetailRecipe({target:node,recipeId:config.recipeId,plan});if(!candidate)continue;
 controller=candidate;review=candidateViews;target=node;break;
}
if(!controller)throw new Error('没有同时满足支撑面、事件避让与合法观察路径的候选');
const diagnostics={...config,planHash:plan.planHash,replayEqual:JSON.stringify(dream)===JSON.stringify(replay),planUnchanged:JSON.stringify(plan)===planBefore,storyUnchanged:JSON.stringify(state.story)===stateBefore,models:world.artStats,obstacleId:controller.obstacleId,...review};
$('#diagnostics').textContent=JSON.stringify(diagnostics,null,2);
$('#intent').textContent=DETAIL_RECIPES[config.recipeId].question;
const captures={};let frames=0,frameTimes=[],last=performance.now();
function updateView(){const view=review.views.find(v=>v.id===$('#view').value);camera.position.fromArray(view.position);camera.lookAt(new THREE.Vector3(...view.lookAt));state.player.x=camera.position.x;state.player.z=camera.position.z;frames=0;frameTimes=[];}
$('#view').onchange=updateView;
$('#candidate').onchange=()=>{controller.setEnabled($('#candidate').checked);frames=0;frameTimes=[];};
controller.setEnabled(true);updateView();
renderer.setAnimationLoop(()=>{
 const now=performance.now();if(frames>10)frameTimes.push(now-last);last=now;
 world.update(0,state);flashlight.visible=$('#flash').checked;effect.setFlashlight(flashlight.visible);renderer.info.reset();effect.render(0);
 if(++frames===45){
   const key=`${$('#view').value}-${controller.enabled?'B':'A'}`;
   captures[key]={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,frameMsMedian:frameTimes.sort((a,b)=>a-b)[Math.floor(frameTimes.length/2)]};
   diagnostics.performance=captures;$('#diagnostics').textContent=JSON.stringify(diagnostics,null,2);
 }
 $('#metrics').textContent=`seed ${config.seed} · 第 ${config.layer} 层 ${config.roomId} · ${plan.planHash} · ${controller.enabled?'候选 B':'原版 A'} / 模型 ${world.artStats.loaded}/${world.artStats.requested} · 失败 ${world.artStats.failed.length} / 路径 ${review.reachableSamples} 站点`;
});
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();effect.resize(innerWidth,innerHeight);});
addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);controller.dispose();world.dispose();effect.dispose();renderer.dispose();});
