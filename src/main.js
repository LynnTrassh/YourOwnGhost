import * as THREE from 'three';
import './style.css';
import { createState } from './state.js';
import { movePlayer } from './collision.js';
import { createWorld } from './world.js';
import { generateDream } from './planning/dream.js';
import { canExplore, canUseExit, requestExit, requestDeath, stepRespawnProtection, stepTransition, commitTransition, cancelTransition, transitionOpacity, stepFlowNarration } from './flow.js';
import { TEMPLATE_NAMES } from './planning/templates.js';
import { stepStory } from './story/runtime.js';
import { drawMap } from './map-preview.js';
import { roomIdAt } from './story/spatial.js';
import { stepThreat } from './threat.js';
import { createVhsEffect } from './art/vhs-effect.js';
import { interpretFear, selectFear } from './personalization/fear.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const keys = new Set();
const seed = new URLSearchParams(location.search).get('seed')?.slice(0, 80) || '42';
let plan;
let dream;
let planError;
try { dream = generateDream(seed); plan = dream[0]; } catch (error) { planError = error; }
let state = createState(plan);
let active = false;
let started = false;
let yaw = plan?.spawn.yaw ?? 0;
let pitch = 0;
let sensitivity = 1;
let cameraMotionEnabled = true;
let targetDoor = false;
let dragMode = false;
let dragging = false;
let lastPointer = null;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch {
  $('error').textContent = '无法启用 WebGL。请使用支持硬件加速的桌面浏览器重新打开。';
  $('start').disabled = true;
}
if (planError) { $('error').textContent = `地图生成失败：${planError.message}`; $('start').disabled = true; }
if (renderer && plan) init();

function init() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111916);
  scene.fog = new THREE.Fog(0x111916, 9, 24);
  const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .06, 40);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  let world = createWorld(scene, plan,{threatAppearanceId:state.fear.appearanceId});
  let editingFear=true,fearConfirmed=false,draftFear=null,graphicsReady=true;
  const vhs = createVhsEffect(renderer, scene, camera);
  vhs.setIntensity($('vhs-intensity').value);
  vhs.setFlashlight(state.player.flashlight);
  function updatePlanStatus() {
    $('seed').value = seed;
    const bedroom = plan.rooms.find(r => r.id === 'bedroom');
    const sizeX = (Math.max(...bedroom.cells.map(c => c[0])) - Math.min(...bedroom.cells.map(c => c[0])) + 1) * plan.cellSize;
    const sizeZ = (Math.max(...bedroom.cells.map(c => c[1])) - Math.min(...bedroom.cells.map(c => c[1])) + 1) * plan.cellSize;
    $('plan-status').textContent = `种子 ${seed} · 第 ${state.layer} 层 · ${plan.rooms.length} 个房间 · ${plan.opportunities.cycles.length} 个环路 / ${plan.opportunities.forks.length} 个分叉 · ${plan.planHash}${plan.validation.fallback ? ' · 保底布局' : ' · 校验通过'} · 猫场景 ${state.layer===2?'本层未启用':plan.story.cat?'可用':'不适配'} / 左右建议 ${plan.story.routes.length} 处 · 凝视型威胁 ${plan.threat?'已适配':state.layer===1?'本层未安排':'空间不适配'} · 起始${TEMPLATE_NAMES[bedroom.type]} ${sizeX}×${sizeZ}米`;
  }
  updatePlanStatus();
  function updateFearForm() {
    $('fear-form').hidden=!editingFear;
    $('fear-summary').hidden=editingFear;
    $('fear-summary').textContent=`本局恐惧外观：${state.fear.label}（简模）`;
    $('cancel-fear').hidden=!editingFear || !started;
    $('change-fear').hidden=editingFear || !started;
    $('restart').hidden=editingFear || !started;
    $('start').disabled=!graphicsReady || (editingFear && !draftFear);
    $('start').textContent=editingFear ? (started?'确认并重新开始':'确认并进入梦境') : (started?'继续探索':'进入梦境');
    if(editingFear) $('drag-mode').hidden=true;
    if(draftFear) $('fear-result').textContent=`${draftFear.id==='generic'?'主动选择':'本次理解'}：${draftFear.label}。将使用对应简模；它可能在第二层出现。`;
  }
  function readFear() {
    const result=interpretFear($('fear-input').value);draftFear=result.selection??null;
    $('fear-result').textContent=result.message??'';updateFearForm();
  }
  $('fear-input').addEventListener('input',readFear);
  for(const [id,label] of [['doll','人偶'],['clown','小丑']]) $('fear-'+id).addEventListener('click',()=>{$('fear-input').value=label;readFear();});
  $('fear-generic').addEventListener('click',()=>{$('fear-input').value='';draftFear=selectFear();updateFearForm();});
  $('change-fear').addEventListener('click',()=>{editingFear=true;draftFear=selectFear(state.fear.id);$('fear-input').value=state.fear.id==='generic'?'':state.fear.label;updateFearForm();});
  $('cancel-fear').addEventListener('click',()=>{editingFear=false;draftFear=null;updateFearForm();});
  readFear();
  const flashlight = new THREE.SpotLight(0xffe6b8, 24, 15, Math.PI / 7, .82, 1.5);
  flashlight.position.set(.14, -.15, -.12);
  flashlight.target.position.set(0, -.08, -6);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(1024, 1024);
  flashlight.shadow.bias = -.0003;
  camera.add(flashlight, flashlight.target);
  const ray = new THREE.Raycaster(); ray.far = 2.25;

  function pause() {
    active = false; dragging = false; lastPointer = null; keys.clear();
    $('menu').hidden = false;
    $('crosshair').hidden = true;
    $('prompt').hidden = true;
    $('hint').hidden = true; $('subtitle').hidden = true;
    if (state.completed && !state.flow.transition) {
      $('menu').hidden = true; $('ending').hidden = false;
    } else if (started) {
      $('title').textContent = '梦境暂停';
      $('description').textContent = '房间会在这里等你。';
      $('start').innerHTML = '继续探索 <span>↗</span>';
      $('restart').hidden = false;
    }
    updateFearForm();
  }
  function activate() {
    if (!graphicsReady || editingFear || !fearConfirmed || (state.completed && !state.flow.transition)) return;
    active = true; started = true; keys.clear();
    updateFearForm();
    $('map-panel').hidden = true;
    $('menu').hidden = true; $('crosshair').hidden = false; $('hint').hidden = false;
    $('hint').textContent = dragMode ? 'WASD 移动 · 按住鼠标拖动环顾 · F 手电 · Esc 暂停' : 'WASD 移动 · 鼠标环顾 · F 手电 · Esc 暂停';
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }
  function lockFailed() {
    pause();
    $('error').textContent = '当前浏览器无法锁定鼠标，可以使用拖动视角模式。';
    $('drag-mode').hidden = false;
  }
  async function enter() {
    if (!graphicsReady || (state.completed && !state.flow.transition)) return;
    $('error').textContent = '';
    if (dragMode) { activate(); return; }
    try {
      await canvas.requestPointerLock();
    } catch {
      lockFailed();
    }
  }
  $('start').addEventListener('click',()=>{
    if(editingFear) {
      if(!draftFear) return;
      restartRun(draftFear.id);return;
    }
    enter();
  });
  $('drag-mode').addEventListener('click', () => { dragMode = true; $('error').textContent = ''; activate(); });
  function restartRun(fearId=state.fear.id) {
    const nextState=createState(dream[0],fearId);
    const nextWorld=createWorld(scene,dream[0],{threatAppearanceId:nextState.fear.appearanceId});world.dispose();world=nextWorld;plan=dream[0];
    state=nextState;yaw=plan.spawn.yaw;pitch=0;targetDoor=false;keys.clear();
    editingFear=false;fearConfirmed=true;draftFear=null;updateFearForm();
    vhs.setFlashlight(state.player.flashlight);
    $('ending').hidden=true;$('ending-line').textContent='';$('fade').style.opacity='0';updatePlanStatus();enter();
  }
  $('restart').addEventListener('click',()=>restartRun());
  $('ending-replay').addEventListener('click',()=>restartRun());
  $('ending-new').addEventListener('click',()=>{
    const url=new URL(location.href);url.searchParams.set('seed',String(crypto.getRandomValues(new Uint32Array(1))[0]));location.assign(url);
  });
  $('apply-seed').addEventListener('click', () => {
    const next = $('seed').value.trim().slice(0, 80) || '42';
    const url = new URL(location.href); url.searchParams.set('seed', next); location.assign(url);
  });
  $('new-seed').addEventListener('click', () => {
    const url = new URL(location.href); url.searchParams.set('seed', String(crypto.getRandomValues(new Uint32Array(1))[0])); location.assign(url);
  });
  $('show-map').addEventListener('click', () => {
    $('death-status').textContent=`第 ${state.layer} 层 · 普通死亡 ${state.flow.deaths} 次 · 起身保护剩余 ${state.flow.graceRemaining.toFixed(1)} 秒 · 凝视型威胁 ${state.threat?.phase??'无'} · 外观 ${state.fear.label}${state.threat?.phase==='demo'?' · 示范中：转开或关灯让它挪动，再用手电照住':''}`;
    $('debug-death').disabled=!started || !state.player.standing || !canExplore(state) || state.flow.graceRemaining>0;
    drawMap($('map-canvas'), plan, state.player); $('map-panel').hidden = false;
  });
  $('debug-death').addEventListener('click', () => {
    if(requestDeath(state)) {
      keys.clear();dragging=false;lastPointer=null;targetDoor=false;
      $('map-panel').hidden=true;enter();
    }
  });
  $('close-map').addEventListener('click', () => { $('map-panel').hidden = true; });
  $('sensitivity').addEventListener('input', event => { sensitivity = Number(event.target.value); });
  $('vhs-intensity').addEventListener('input', event => vhs.setIntensity(event.target.value));
  $('camera-motion').addEventListener('change', event => { cameraMotionEnabled = event.target.checked; });
  window.addEventListener('pagehide',pause);
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      activate();
    } else pause();
  });
  document.addEventListener('pointerlockerror', lockFailed);
  window.addEventListener('blur', () => { document.exitPointerLock(); pause(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { document.exitPointerLock(); pause(); }
  });
  canvas.addEventListener('pointerdown', event => {
    if (!active || !canExplore(state) || !dragMode || event.button !== 0) return;
    dragging = true; lastPointer = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', () => { dragging = false; lastPointer = null; });
  canvas.addEventListener('pointercancel', () => { dragging = false; lastPointer = null; });
  document.addEventListener('mousemove', event => {
    if (!active || !canExplore(state) || (dragMode && !dragging)) return;
    const dx = dragMode ? event.clientX - lastPointer.x : event.movementX;
    const dy = dragMode ? event.clientY - lastPointer.y : event.movementY;
    if (dragMode) lastPointer = { x: event.clientX, y: event.clientY };
    yaw -= dx * .002 * sensitivity;
    pitch = THREE.MathUtils.clamp(pitch - dy * .002 * sensitivity, -1.35, 1.35);
  });
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.code === 'Escape') { document.exitPointerLock(); pause(); return; }
    if (!canExplore(state)) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyF', 'Space'].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    if (event.repeat) return;
    if (event.code === 'KeyF') {
      state.player.flashlight = !state.player.flashlight;
      vhs.setFlashlight(state.player.flashlight);
    }
    if (event.code === 'KeyE') {
      if (!state.player.standing) { state.player.standing = true; state.flow.phase='exploring'; }
      else if (targetDoor) state.doors.bedroom.open = true;
      else if (requestExit(state,plan,currentView(),world.getColliders())) {keys.clear();dragging=false;lastPointer=null;targetDoor=false;}
    }
  });
  document.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    vhs.resize(innerWidth, innerHeight);
  });
  canvas.addEventListener('webglcontextlost', event => {
    graphicsReady=false;
    event.preventDefault(); document.exitPointerLock(); pause();
    $('error').textContent = '图形上下文已丢失，请刷新页面重新开始。';
    $('start').disabled = true; $('restart').disabled = true;
  });
  function currentView() {
    const halfV=THREE.MathUtils.degToRad(camera.fov/2);
    return {...state.player,y:state.player.standing?1.65:1.08,yaw,pitch,halfV,halfH:Math.atan(Math.tan(halfV)*camera.aspect)};
  }
  function advanceFlow(dt) {
    const action=stepTransition(state,dt,active);
    if(!action) return;
    if(action.kind==='layer' || action.kind==='death') {
      const nextPlan=action.kind==='death' ? plan : dream[1];
      let nextWorld;
      try {
        nextWorld=createWorld(scene,nextPlan,{threatAppearanceId:state.fear.appearanceId});
        if(!commitTransition(state,action.id,nextPlan)) {nextWorld.dispose();throw new Error('切层状态不匹配');}
        world.dispose();world=nextWorld;plan=nextPlan;yaw=plan.spawn.yaw;pitch=0;targetDoor=false;
        keys.clear();dragging=false;lastPointer=null;walkSway=0;
        world.updateStory(state.story,state.player);world.updateThreat(state.threat,state.player);vhs.setFlashlight(state.player.flashlight);updatePlanStatus();
      } catch(error) {
        cancelTransition(state);pause();$('error').textContent=`切换失败，可继续当前地图：${error.message}`;
      }
    } else if(action.kind==='ending') {
      commitTransition(state,action.id);
      $('ending-new').disabled=true;$('ending-replay').disabled=true;
      $('ending').hidden=false;
    } else if(state.completed) {
      if(!state.story.consumed.includes('flow.ending')) state.story.consumed.push('flow.ending');
      $('ending-line').textContent='好吧。这次就送到这里。';
      $('ending-new').disabled=false;$('ending-replay').disabled=false;
      document.exitPointerLock();pause();
    }
  }
  let previous = performance.now();
  let walkSway = 0;
  renderer.setAnimationLoop(time => {
    const dt = Math.min(Math.max((time - previous) / 1000, 0), .05); previous = time;
    advanceFlow(dt);
    stepRespawnProtection(state,dt,active);
    const exploring=active && canExplore(state);
    if (exploring) {
      world.update(dt, state);
      if (state.player.standing) {
        let forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
        let right = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
        const length = Math.hypot(forward, right) || 1;
        forward /= length; right /= length;
        movePlayer(state.player, (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * 2.4 * dt,
          (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * 2.4 * dt, world.getColliders());
      }
    }
    const motionScale = cameraMotionEnabled ? 1 : 0;
    const moving = motionScale && active && state.player.standing
      && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].some(code => keys.has(code));
    walkSway = THREE.MathUtils.damp(walkSway, moving ? 1 : 0, 4.5, dt);
    const seconds = time / 1000;
    const step = Math.sin(seconds * 8.5);
    const breathing = active && cameraMotionEnabled ? Math.sin(seconds * 0.72) : 0;
    camera.position.set(
      state.player.x + Math.sin(seconds * 0.38) * 0.004 * motionScale + step * 0.002 * walkSway,
      (state.player.standing ? 1.65 : 1.08) + breathing * 0.005 + Math.abs(step) * 0.002 * walkSway * motionScale,
      state.player.z + Math.cos(seconds * 0.31) * 0.004 * motionScale,
    );
    camera.rotation.set(
      pitch + breathing * 0.0015 + step * 0.0008 * walkSway * motionScale,
      yaw + Math.sin(seconds * 0.34) * 0.002 * motionScale,
      0,
    );
    camera.updateMatrixWorld(); scene.updateMatrixWorld();
    flashlight.visible = state.player.flashlight;
    if (exploring) {
      ray.setFromCamera(new THREE.Vector2(), camera);
      const hit = ray.intersectObjects([...world.solids, ...world.doorMeshes.filter(d => d.visible)], false)[0];
      targetDoor = state.player.standing && !state.doors.bedroom.open && hit?.object === world.door;
      $('prompt').textContent = !state.player.standing ? 'E  起身' : targetDoor ? 'E  开门' : canUseExit(state,plan,currentView(),world.getColliders()) ? 'E  离开这里' : '';
      $('prompt').hidden = !($('prompt').textContent);
    }
    if(exploring) {
      const view=currentView(),boxes=world.getColliders();
      const origin=flashlight.getWorldPosition(new THREE.Vector3());
      const direction=flashlight.target.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
      const beam={enabled:state.player.flashlight,origin,direction,angle:flashlight.angle,distance:flashlight.distance};
      const lethal=stepThreat(plan,state,view,beam,dt,{boxes});
      if(lethal && requestDeath(state)) {keys.clear();dragging=false;lastPointer=null;targetDoor=false;}
      const encounter=state.threat && ['demo','pursuing'].includes(state.threat.phase)
        && state.threat.seesPlayer
        && roomIdAt(plan,state.player)!=='bedroom';
      if(canExplore(state)) {
        if(encounter) {
          if(state.story.cue?.kind!=='statueDemo') state.story.cue=null;
          state.story.route=null;state.story.routeFinished=false;
        } else stepFlowNarration(state,plan,view,dt,boxes);
        stepStory(plan,state.story,view,dt,{boxes,suppressRoutes:Boolean(encounter)});
        world.updateStory(state.story,state.player);
      }
      world.updateThreat(state.threat,state.player);
    }
    $('fade').style.opacity=String(transitionOpacity(state));
    $('crosshair').hidden=!exploring;$('hint').hidden=!exploring;
    if(!exploring) $('prompt').hidden=true;
    $('subtitle').textContent=state.story.cue?.text??'';
    $('subtitle').hidden=!exploring || !state.story.cue;
    $('location').textContent = world.roomAt(state.player.x, state.player.z);
    vhs.render(time / 1000);
  });
  vhs.resize(innerWidth, innerHeight);
}
