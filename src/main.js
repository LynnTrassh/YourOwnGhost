import * as THREE from 'three';
import './style.css';
import { createState } from './state.js';
import { movePlayer } from './collision.js';
import { createWorld } from './world.js';
import { generateDream } from './planning/dream.js';
import { generatePlan } from './planning/generate.js';
import { canExplore, canUseExit, requestExit, requestDeath, stepRespawnProtection, stepTransition, commitTransition, cancelTransition, transitionOpacity, stepFlowNarration } from './flow.js';
import { TEMPLATE_NAMES } from './planning/templates.js';
import { stepStory } from './story/runtime.js';
import { drawMap } from './map-preview.js';
import { roomIdAt } from './story/spatial.js';
import { stepThreat } from './threat.js';
import { createVhsEffect } from './art/vhs-effect.js';
import { interpretFear, selectFear } from './personalization/fear.js';
import { interpretLike, selectLike } from './personalization/like.js';
import { contentTokensForInputs } from './personalization/content-tokens.js';
import { createPlayerNoiseTracker } from './player-noise.js';
import { HEARING_BEHAVIOR, LIGHT_AVOIDER_BEHAVIOR } from './threat-profile.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const keys = new Set();
const seed = new URLSearchParams(location.search).get('seed')?.slice(0, 80) || '42';
const previewId = new URLSearchParams(location.search).get('preview')?.slice(0, 12);
const hearingPreview=previewId==='TH02';
const avoiderPreview=previewId==='TH03';
const threatPreview=hearingPreview||avoiderPreview;
const previewLike = new URLSearchParams(location.search).get('like');
const previewFear = new URLSearchParams(location.search).get('fear');
const threatMode=new URLSearchParams(location.search).get('threat');
const threatBehaviorId=avoiderPreview||threatMode==='avoider'?LIGHT_AVOIDER_BEHAVIOR
  :hearingPreview||threatMode==='hearing'?HEARING_BEHAVIOR:null;
const previewSelection=previewId&&['none','cat','flower'].includes(previewLike)?selectLike(previewLike):null;
const previewFearId=previewId&&['generic','doll','clown'].includes(previewFear)?previewFear:'generic';
let plan;
let dream;
let planError;
try {
  dream = generateDream(seed,previewSelection?{catEnabled:previewSelection.id==='cat',
    preferences:contentTokensForInputs(previewSelection.id,previewFearId),threatBehaviorId}
    :{threatBehaviorId});
  plan = threatPreview?dream[1]:dream[0];
} catch (error) { planError = error; }
let state = createState(plan);
if(threatPreview&&plan?.threat) {
  state.layer=2;state.flow.falseAwakenings=1;
  state.player={...plan.threat.observation,standing:true,flashlight:true};
}
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
if (renderer && plan) {
  if(previewId&&!threatPreview) {
    const conditional=['B27','B28'].includes(previewId);
    const fitted=dream.find(layer=>layer.content.instances.some(instance=>instance.definitionId===previewId));
    const inspection=conditional?dream[1]:fitted??generatePlan(seed,{catEnabled:previewSelection?.id==='cat',
      contentIds:[previewId],preferences:contentTokensForInputs(previewSelection?.id??'none',previewFearId)});
    import('./preview.js').then(({startPreview})=>startPreview({renderer,plan:inspection,id:previewId,runSeed:seed}));
  }
  else init();
}

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
  const playerNoise=createPlayerNoiseTracker();
  playerNoise.reset(state.player);
  if(threatPreview&&plan.threat) {
    yaw=Math.atan2(plan.threat.spawn.x-state.player.x,plan.threat.spawn.z-state.player.z)+Math.PI;
    $('title').textContent=hearingPreview?'TH02 听声者灰盒预览':'TH03 避光者灰盒预览';
    $('description').textContent=hearingPreview
      ?'从合法观察位开始；走几步，看它调查最后的脚步位置。'
      :'从合法观察位开始；先照见它后退，再关灯观察靠近。';
  }
  let previewWalk=0,previewWalkDirection=null,previewStatus=null;
  if(threatPreview) {
    if(hearingPreview) {
    const walkButton=document.createElement('button');
    walkButton.textContent='预览：横走几步';
    walkButton.style.cssText='position:fixed;right:22px;bottom:65px;width:auto;max-width:240px;z-index:9;padding:9px 13px;background:#253e35;color:#e1e7d8;border:1px solid #789283';
    walkButton.addEventListener('click',()=>{
      if(!active||!plan.threat)return;
      const dx=plan.threat.spawn.x-state.player.x,dz=plan.threat.spawn.z-state.player.z;
      const distance=Math.hypot(dx,dz)||1;
      const directions=[{x:-dz/distance,z:dx/distance},{x:dz/distance,z:-dx/distance}];
      previewWalkDirection=directions.find(direction=>{
        const probe={x:state.player.x,z:state.player.z};
        movePlayer(probe,direction.x*1.5,direction.z*1.5,world.getColliders());
        return Math.hypot(probe.x-state.player.x,probe.z-state.player.z)>1.1
          &&roomIdAt(plan,probe)===plan.threat.roomId;
      })??null;
      previewWalk=previewWalkDirection ? .65 : 0;
    });
    document.body.append(walkButton);
    } else {
      const lightButton=document.createElement('button');
      lightButton.textContent='预览：关闭手电';
      lightButton.style.cssText='position:fixed;right:22px;bottom:65px;width:auto;max-width:240px;z-index:9;padding:9px 13px;background:#253e35;color:#e1e7d8;border:1px solid #789283';
      lightButton.addEventListener('click',()=>{
        if(!active)return;
        state.player.flashlight=!state.player.flashlight;
        vhs.setFlashlight(state.player.flashlight);
        lightButton.textContent=state.player.flashlight?'预览：关闭手电':'预览：打开手电';
      });
      document.body.append(lightButton);
    }
    previewStatus=document.createElement('div');
    previewStatus.style.cssText='position:fixed;right:22px;top:55px;z-index:9;padding:9px 13px;background:#101917d8;color:#e1e7d8;font:13px sans-serif';
    document.body.append(previewStatus);
  }
  let editingFear=true,fearConfirmed=false,draftFear=null,draftLike=null,graphicsReady=true;
  const vhs = createVhsEffect(renderer, scene, camera);
  vhs.setIntensity($('vhs-intensity').value);
  vhs.setFlashlight(state.player.flashlight);
  function updatePlanStatus() {
    $('seed').value = seed;
    const bedroom = plan.rooms.find(r => r.id === 'bedroom');
    const sizeX = (Math.max(...bedroom.cells.map(c => c[0])) - Math.min(...bedroom.cells.map(c => c[0])) + 1) * plan.cellSize;
    const sizeZ = (Math.max(...bedroom.cells.map(c => c[1])) - Math.min(...bedroom.cells.map(c => c[1])) + 1) * plan.cellSize;
    const content=(plan.content?.report??[]).map(r=>`${r.id}${r.accepted?'→'+r.roomId:'拒绝:'+r.reason}`).join(' / ');
    const threatLabel=threatBehaviorId===HEARING_BEHAVIOR?'听声者灰盒'
      :threatBehaviorId===LIGHT_AVOIDER_BEHAVIOR?'避光者灰盒':'凝视型威胁';
    $('plan-status').textContent = `种子 ${seed}${state.input.confirmed?'':' · 待输入确认（以下为预览）'} · 第 ${state.layer} 层 · ${plan.rooms.length} 个房间 · ${plan.opportunities.cycles.length} 个环路 / ${plan.opportunities.forks.length} 个分叉 · ${plan.planHash}${plan.validation.fallback ? ' · 保底布局' : ' · 校验通过'} · 猫场景 ${!state.input.confirmed?'待输入确认':state.layer===2?'本层未启用':plan.story.cat?'可用':state.like.id==='cat'?'空间不适配':'未选择猫'} / 左右建议 ${plan.story.routes.length} 处 · ${threatLabel} ${plan.threat?'已适配':state.layer===1?'本层未安排':'空间不适配'} · 自带灰盒 ${content} · 起始${TEMPLATE_NAMES[bedroom.type]} ${sizeX}×${sizeZ}米`;
    const composition=dream.composition;
    if(composition) $('plan-status').textContent+=` · 整局独立单元 主要 ${composition.budget.major.count}/4、短场面 ${composition.budget.short.count}/4${composition.repeatedUnits.length?' · 跨层重复 '+composition.repeatedUnits.join('、'):''}`;
    const coverage=plan.coverage;
    const names={start:'起点',connector:'连接',rest:'喘息',short:'短场面',major:'主要',danger:'危险'};
    $('coverage-report').textContent=`本层内容覆盖 ${coverage.covered}/${coverage.total}（${Math.round(coverage.ratio*100)}%）· 最长连续空白 ${coverage.longestGap.length} 间${coverage.longestGap.rooms.length?'：'+coverage.longestGap.rooms.join(' → '):''} · 房间角色：${coverage.rooms.map(row=>`${row.roomId} ${names[row.role]}${row.units.length?'['+row.units.join('+')+']':''}`).join(' / ')}${coverage.incomplete?' · 路径检查达到预算，结果未完成':''}`;
    $('preview-links').replaceChildren(...['B01','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B18','B19','B20','B22','B25','ID02','ID03','ME01','ME02','ME03','ME04','IN01','IN02','IN03','IN04','TI02','TI03','RI01','RI02','BO01','BO02','BO03','BO04','AB01','AB02','AB04','B27','B28','TH02','TH03'].map(id=>{
      const link=document.createElement('a');link.textContent=`${id} 独立预览`;
      link.href=`/?seed=${encodeURIComponent(plan.seed)}&preview=${id}&like=${encodeURIComponent(state.like.id)}&fear=${encodeURIComponent(state.fear.id)}`;
      link.target='_blank';link.rel='noopener';
      link.style.cssText='display:inline-block;margin:10px 16px 0 0;color:#b4d8b3;font-size:12px';
      return link;
    }));
  }
  updatePlanStatus();
  function updateFearForm() {
    $('fear-form').hidden=!editingFear;
    $('fear-summary').hidden=editingFear;
    $('fear-summary').textContent=`本局喜欢：${state.like.label} · 恐惧外观：${state.fear.label}（简模） · 输入版本 ${state.input.version}`;
    $('cancel-fear').hidden=!editingFear || !state.input.confirmed;
    $('change-fear').hidden=editingFear || !state.input.confirmed;
    $('restart').hidden=editingFear || !started;
    $('start').disabled=!graphicsReady || (editingFear && (!draftFear||!draftLike));
    $('start').textContent=editingFear ? (started?'确认并重新开始':'确认并进入梦境') : (started?'继续探索':'进入梦境');
    if(editingFear) $('drag-mode').hidden=true;
    if(draftFear) $('fear-result').textContent=`${draftFear.id==='generic'?'主动选择':'本次理解'}：${draftFear.label}。将使用对应简模；它可能在第二层出现。`;
  }
  function readFear() {
    const result=interpretFear($('fear-input').value);draftFear=result.selection??null;
    $('fear-result').textContent=result.message??'';updateFearForm();
  }
  function readLike() {
    const result=interpretLike($('like-input').value);draftLike=result.selection??null;
    $('like-result').textContent=result.selection
      ?`本次理解：${result.selection.label}。将按已实现的内容资格安排。`
      :result.message??'';
    updateFearForm();
  }
  $('like-input').addEventListener('input',readLike);
  for(const [id,label] of [['cat','猫'],['flower','花']])
    $('like-'+id).addEventListener('click',()=>{$('like-input').value=label;readLike();});
  $('like-skip').addEventListener('click',()=>{$('like-input').value='';draftLike=selectLike();
    $('like-result').textContent='主动跳过喜欢输入；本局不启用输入相关场面。';updateFearForm();});
  $('fear-input').addEventListener('input',readFear);
  for(const [id,label] of [['doll','人偶'],['clown','小丑']]) $('fear-'+id).addEventListener('click',()=>{$('fear-input').value=label;readFear();});
  $('fear-generic').addEventListener('click',()=>{$('fear-input').value='';draftFear=selectFear();updateFearForm();});
  $('change-fear').addEventListener('click',()=>{editingFear=true;draftFear=selectFear(state.fear.id);
    draftLike=selectLike(state.like.id);$('fear-input').value=state.fear.id==='generic'?'':state.fear.label;
    $('like-input').value=state.like.id==='none'?'':state.like.label;updateFearForm();});
  $('cancel-fear').addEventListener('click',()=>{editingFear=false;draftFear=null;draftLike=null;updateFearForm();});
  readFear();readLike();
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
      if(!draftFear||!draftLike) return;
      restartRun(draftFear.id,draftLike.id);return;
    }
    enter();
  });
  $('drag-mode').addEventListener('click', () => { dragMode = true; $('error').textContent = ''; activate(); });
  function restartRun(fearId=state.fear.id,likeId=state.like.id) {
    const changed=state.input.confirmed&&(state.input.fearId!==fearId||state.input.likeId!==likeId);
    const version=state.input.confirmed?state.input.version+Number(changed):1;
    const nextDream=generateDream(seed,{catEnabled:likeId==='cat',
      preferences:contentTokensForInputs(likeId,fearId),threatBehaviorId});
    const nextPlan=threatPreview?nextDream[1]:nextDream[0];
    const nextState=createState(nextPlan,fearId,likeId,version,state.input);
    if(threatPreview&&nextPlan.threat) {
      nextState.layer=2;nextState.flow.falseAwakenings=1;
      nextState.player={...nextPlan.threat.observation,standing:true,flashlight:true};
    }
    const nextWorld=createWorld(scene,nextPlan,{threatAppearanceId:nextState.fear.appearanceId});
    world.dispose();world=nextWorld;dream=nextDream;plan=nextPlan;
    state=nextState;yaw=plan.spawn.yaw;pitch=0;targetDoor=false;keys.clear();
    if(threatPreview&&plan.threat)
      yaw=Math.atan2(plan.threat.spawn.x-state.player.x,plan.threat.spawn.z-state.player.z)+Math.PI;
    previewWalk=0;previewWalkDirection=null;
    playerNoise.reset(state.player);
    editingFear=false;fearConfirmed=true;draftFear=null;draftLike=null;updateFearForm();
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
    const threatLabel=threatBehaviorId===HEARING_BEHAVIOR?'听声者灰盒'
      :threatBehaviorId===LIGHT_AVOIDER_BEHAVIOR?'避光者灰盒':'凝视型威胁';
    const demoHint=threatBehaviorId===HEARING_BEHAVIOR?'移动发出脚步，观察它追查声源'
      :threatBehaviorId===LIGHT_AVOIDER_BEHAVIOR?'用手电照见它后退，再关灯观察靠近'
        :'转开或关灯让它挪动，再用手电照住';
    $('death-status').textContent=`第 ${state.layer} 层 · 普通死亡 ${state.flow.deaths} 次 · 起身保护剩余 ${state.flow.graceRemaining.toFixed(1)} 秒 · ${threatLabel} ${state.threat?.phase??'无'} · 外观 ${state.fear.label}${state.threat?.phase==='demo'?' · 示范中：'+demoHint:''}`;
    $('debug-death').disabled=!started || !state.player.standing || !canExplore(state) || state.flow.graceRemaining>0;
    drawMap($('map-canvas'), world.getTopology(), state.player); $('map-panel').hidden = false;
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
        playerNoise.reset(state.player);
        previewWalk=0;previewWalkDirection=null;
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
        if(previewWalk>0&&previewWalkDirection) {
          movePlayer(state.player,previewWalkDirection.x*2.4*dt,
            previewWalkDirection.z*2.4*dt,world.getColliders());
          previewWalk=Math.max(0,previewWalk-dt);
        }
      }
    }
    const noiseEvents=playerNoise.step(world.getTopology(),state.player,dt,
      {active:exploring,standing:state.player.standing});
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
      const lethal=stepThreat(world.getTopology(),state,view,beam,dt,{boxes,noiseEvents});
      if(lethal && requestDeath(state)) {keys.clear();dragging=false;lastPointer=null;targetDoor=false;}
      const encounter=state.threat && ['demo','pursuing'].includes(state.threat.phase)
        && (state.threat.seesPlayer||state.threat.sensesPlayer)
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
    if(previewStatus)previewStatus.textContent=hearingPreview
      ?`TH02 隔离预览 · ${state.threat?.phase??'无'} · 调查 ${state.threat?.memory?.phase??'无'} · 声源 ${state.threat?.memory?.lastSound?.eventId??'无'} · 安全示范 ${state.threat?.demoComplete?'已结束':state.threat?.demoStarted?'进行中':'未触发'}`
      :`TH03 隔离预览 · ${state.threat?.phase??'无'} · 手电 ${state.player.flashlight?'开':'关'} · 照见 ${state.threat?.lit?'是':'否'} · 后退 ${state.threat?.demoMoved?.toFixed(2)??'0'} 米 · 安全示范 ${state.threat?.demoComplete?'已结束':state.threat?.demoStarted?'进行中':'未触发'}`;
    $('fade').style.opacity=String(transitionOpacity(state));
    $('crosshair').hidden=!exploring;$('hint').hidden=!exploring;
    if(!exploring) $('prompt').hidden=true;
    $('subtitle').textContent=state.story.cue?.text??'';
    $('subtitle').hidden=!exploring || !state.story.cue;
    $('location').textContent = world.roomAt(state.player.x, state.player.z);
    world.renderScreens(renderer);
    vhs.render(time / 1000);
  });
  vhs.resize(innerWidth, innerHeight);
}
