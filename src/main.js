import { attachRuntime,bootUI,backgroundMusic as music } from './bootstrap.js';
import { createStaticSessionPreparer,isStaticSession } from './personalization/static-session.js';
import * as THREE from 'three';
import './style.css';
import { createGameUI } from './ui/shell.js';
import { createDreamApi } from './personalization/api-client.js';
import './ui/runtime.css';
import { createState } from './state.js';
import { movePlayer,overlaps } from './collision.js';
import { createWorld,createWorldAsync } from './world.js';
import { planDream } from './planning/client.js';
import { randomRunSeed } from './personalization/run-seed.js';
import { generatePlan } from './planning/generate.js';
import { canExplore, canUseExit, requestExit, requestDeath, stepRespawnProtection, stepTransition, commitTransition, cancelTransition, transitionOpacity, stepFlowNarration } from './flow.js';
import { TEMPLATE_NAMES } from './planning/templates.js';
import { stepStory } from './story/runtime.js';
import { drawMap } from './map-preview.js';
import { roomIdAt,sightClear } from './story/spatial.js';
import { stepThreat } from './threat.js';
import { createVhsEffect } from './art/vhs-effect.js';
import { configureInteriorFlashlight } from './art/interior-lighting.js';
import { interpretFear, selectFear } from './personalization/fear.js';
import { interpretLike, selectLike } from './personalization/like.js';
import { contentTokensForInputs } from './personalization/content-tokens.js';
import { createPlayerNoiseTracker } from './player-noise.js';
import { HEARING_BEHAVIOR, LIGHT_AVOIDER_BEHAVIOR } from './threat-profile.js';
import { activeState, activeInteraction, interactActive, stepActive } from './active-encounters.js';
import { closeChaseDoor } from './chase.js';
import { targetsDoor } from './door-interaction.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const keys = new Set();
const query = new URLSearchParams(location.search);
const legacyUI = query.has('preview') || query.get('debug') === '1';
const playtest = !legacyUI && query.get('playtest') === '1';
document.body.classList.toggle('modern-ui', !legacyUI);
$('legacy-ui').inert = !legacyUI;
let ui;
let seed = legacyUI ? query.get('seed')?.slice(0,80)||'42' : randomRunSeed();
const previewId = new URLSearchParams(location.search).get('preview')?.slice(0, 12);
const hearingPreview=previewId==='TH02';
const avoiderPreview=previewId==='TH03';
const chasePreview=previewId==='CHASE';
const bypassPreview=previewId==='M03';
const threatPreview=hearingPreview||avoiderPreview||chasePreview||bypassPreview;
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
const loadingNotice=document.createElement('div');
loadingNotice.setAttribute('role','status');loadingNotice.textContent='正在布置房间…';
loadingNotice.style.cssText='position:fixed;inset:0;display:grid;place-items:center;background:#111916;color:#e5e5d5;z-index:999;font:16px sans-serif';
if(legacyUI)document.body.append(loadingNotice);
try {
  if(!legacyUI) {
    // The title only needs a backdrop; the player's actual seed and scripts
    // are prepared after their input, not twice before they can even start.
    plan=generatePlan(seed,{openingSequence:true,catEnabled:false,contentIds:[]});
    dream=[plan,plan];
  } else if(chasePreview||bypassPreview) {
    plan=chasePreview?generatePlan(seed,{chaseEnabled:true,catEnabled:false,contentIds:[]})
      :generatePlan(seed,{threatEnabled:true,contentIds:[]});
    if(bypassPreview&&!plan.threat?.bypass)throw new Error('该种子没有可用的无追逐旁路，请使用种子 71');
    dream=[plan,plan];
  } else {
    dream = await planDream(seed,previewSelection?{catEnabled:previewSelection.id==='cat',
      preferences:contentTokensForInputs(previewSelection.id,previewFearId),threatBehaviorId,activeEncounters:!previewId}
      :{catEnabled:true,preferences:contentTokensForInputs('cat','generic'),threatBehaviorId,activeEncounters:!previewId});
    plan = threatPreview?dream[1]:dream[0];
  }
} catch (error) { planError = error; } finally { loadingNotice.remove(); }
const inspection=query.get('debug')==='1'?query.get('encounter'):null;
function inspectEncounter(plan,state) {
  if(inspection==='door'&&plan) {
    const door=plan.doors.find(d=>d.id==='bedroom');
    const cell=door.cells.find(([x,z])=>plan.cells.find(c=>c.x===x&&c.z===z)?.roomId==='bedroom');
    state.player={x:door.x+Math.sign(cell[0]*plan.cellSize-door.x)*1.8,
      z:door.z+Math.sign(cell[1]*plan.cellSize-door.z)*1.8,standing:true,flashlight:true};
    return Math.atan2(-(door.x-state.player.x),-(door.z-state.player.z));
  }
  const point=inspection==='fuse'?plan?.activeEncounters?.puzzle?.fuse:inspection==='lever'?plan?.activeEncounters?.puzzle?.control:inspection==='corridor'?plan?.activeEncounters?.scare?.trigger:null;
  if(!point)return null;
  const target=inspection==='fuse'?plan.activeEncounters.puzzle.fuse:inspection==='lever'?plan.activeEncounters.puzzle.control:plan.activeEncounters.scare.target;
  state.player={x:point.x-.9,z:point.z,standing:true,flashlight:true};
  state.doors.bedroom.open=true;
  if(inspection==='corridor')activeState(plan,state).scareArmed=true;
  return Math.atan2(-(target.x-state.player.x),-(target.z-state.player.z));
}
let state = createState(plan);
const inspectionYaw=inspectEncounter(plan,state);
if(threatPreview&&plan?.threat) {
  state.layer=2;state.flow.falseAwakenings=1;
  state.player={...(bypassPreview?plan.threat.bypass.observation:plan.threat.observation),standing:true,flashlight:true};
}
let active = false;
let started = false;
let yaw = inspectionYaw ?? plan?.spawn.yaw ?? 0;
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
} else if (!legacyUI) {
  const message = $('error').textContent || '无法准备场景，请刷新重试。';
  ui = bootUI??createGameUI({surface:canvas,adapter:{}});
  attachRuntime({prepareDream:async()=>{throw new Error(message);},start(){throw new Error(message);}});
  ui.reportError(message);
}

function init() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1025;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111916);
  scene.fog = new THREE.Fog(0x111916, 9, 24);
  const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .06, 40);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  let world = legacyUI?createWorld(scene, plan,{threatAppearanceId:state.fear.appearanceId}):{dispose(){},clearGenerated(){},updateStory(){}};
  const playerNoise=createPlayerNoiseTracker();
  playerNoise.reset(state.player);
  if(threatPreview&&plan.threat) {
    yaw=Math.atan2(plan.threat.spawn.x-state.player.x,plan.threat.spawn.z-state.player.z)+Math.PI;
    $('title').textContent=chasePreview?'B13–B16 连续追逐灰盒预览'
      :bypassPreview?'M03 绕开威胁灰盒预览'
      :hearingPreview?'TH02 听声者灰盒预览':'TH03 避光者灰盒预览';
    $('description').textContent=chasePreview
      ?'从侧门前开始，沿出口路线经过四段房间；在第二段靠近来门时按 E 关门，第四段进入侧室躲避。'
      :bypassPreview?'先看清门后的威胁，再从本房间的另一扇门走旁路到出口；不要进入威胁房。'
      :hearingPreview
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
    } else if(avoiderPreview) {
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
  let editingFear=true,fearConfirmed=false,draftFear=null,draftLike=null,graphicsReady=true,generating=false;
  const vhs = createVhsEffect(renderer, scene, camera);
  vhs.setIntensity($('vhs-intensity').value);
  vhs.setFlashlight(state.player.flashlight);
  function updatePlanStatus() {
    $('seed').value = seed;
    const bedroom = plan.rooms.find(r => r.id === 'bedroom');
    const sizeX = (Math.max(...bedroom.cells.map(c => c[0])) - Math.min(...bedroom.cells.map(c => c[0])) + 1) * plan.cellSize;
    const sizeZ = (Math.max(...bedroom.cells.map(c => c[1])) - Math.min(...bedroom.cells.map(c => c[1])) + 1) * plan.cellSize;
    const content=chasePreview?'B13–B16 联合预览（尚未进入正常随机内容池）'
      :bypassPreview?'M03 安全绕行预览'
      :(plan.content?.report??[]).map(r=>`${r.id}${r.accepted?'→'+r.roomId:'拒绝:'+r.reason}`).join(' / ');
    const threatLabel=chasePreview?'连续追逐灰盒'
      :bypassPreview?'凝视型威胁与安全旁路'
      :threatBehaviorId===HEARING_BEHAVIOR?'听声者灰盒'
      :threatBehaviorId===LIGHT_AVOIDER_BEHAVIOR?'避光者灰盒':'凝视型威胁';
    $('plan-status').textContent = `种子 ${seed}${state.input.confirmed?'':' · 待输入确认（以下为预览）'} · 第 ${state.layer} 层 · ${plan.rooms.length} 个房间 · ${plan.opportunities.cycles.length} 个环路 / ${plan.opportunities.forks.length} 个分叉 · ${plan.planHash}${plan.validation.fallback ? ' · 保底布局' : ' · 校验通过'} · 猫场景 ${!state.input.confirmed?'待输入确认':state.layer===2?'本层未启用':plan.story.cat?'可用':state.like.id==='cat'?'空间不适配':'未选择猫'} / 左右建议 ${plan.story.routes.length} 处 · ${threatLabel} ${plan.threat?'已适配':state.layer===1?'本层未安排':'空间不适配'} · 自带灰盒 ${content} · 起始${TEMPLATE_NAMES[bedroom.type]} ${sizeX}×${sizeZ}米`;
    const composition=dream.composition;
    if(composition) $('plan-status').textContent+=` · 整局独立单元 重点 ${composition.budget.major.count}、短事件 ${composition.budget.short.count}${composition.repeatedUnits.length?' · 跨层重复 '+composition.repeatedUnits.join('、'):''}`;
    const coverage=plan.coverage;
    const names={start:'起点',connector:'未分配',rest:'安静／轻微异常',short:'短事件',major:'重点事件',danger:'危险'};
    $('coverage-report').textContent=`本层房间绑定 ${coverage.covered}/${coverage.total}（${Math.round(coverage.ratio*100)}%）· 最长连续空白 ${coverage.longestGap.length} 间${coverage.longestGap.rooms.length?'：'+coverage.longestGap.rooms.join(' → '):''} · 安静房 ${coverage.rhythm.quietCount} · 最长连续安静 ${coverage.rhythm.longestQuiet} / 高强度 ${coverage.rhythm.longestStrong} · 出口路线至少 ${coverage.rhythm.minExitEvents} 个事件 · 房间角色：${coverage.rooms.map(row=>`${row.roomId} ${names[row.role]}${row.units.length?'['+row.units.join('+')+']':''}`).join(' / ')}${coverage.incomplete?' · 路径检查达到预算，结果未完成':''}`;
    $('preview-links').replaceChildren(...['B01','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B18','B19','B20','B22','B25','ID02','ID03','ME01','ME02','ME03','ME04','IN01','IN02','IN03','IN04','TI02','TI03','RI01','RI02','BO01','BO02','BO03','BO04','AB01','AB02','AB04','B27','B28','TH02','TH03','CHASE','M03'].map(id=>{
      const link=document.createElement('a');link.textContent=`${id} 独立预览`;
      link.href=`/?seed=${encodeURIComponent(id==='M03'?'71':plan.seed)}&preview=${id}&like=${encodeURIComponent(state.like.id)}&fear=${encodeURIComponent(state.fear.id)}`;
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
    $('start').disabled=generating || !graphicsReady || (editingFear && (!draftFear||!draftLike));
    $('start').textContent=generating?'正在布置房间…':editingFear ? (started?'确认并重新开始':'确认并进入梦境') : (started?'继续探索':'进入梦境');
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
  $('like-skip').addEventListener('click',()=>{$('like-input').value='';draftLike=selectLike('cat');
    $('like-result').textContent='使用默认猫主题预设；不是对空输入的在线理解。';updateFearForm();});
  $('fear-input').addEventListener('input',readFear);
  for(const [id,label] of [['doll','人偶'],['clown','小丑']]) $('fear-'+id).addEventListener('click',()=>{$('fear-input').value=label;readFear();});
  $('fear-generic').addEventListener('click',()=>{$('fear-input').value='';draftFear=selectFear();updateFearForm();});
  $('change-fear').addEventListener('click',()=>{editingFear=true;draftFear=selectFear(state.fear.id);
    draftLike=selectLike(state.like.id);$('fear-input').value=state.fear.id==='generic'?'':state.fear.label;
    $('like-input').value=state.like.id==='none'?'':state.like.label;updateFearForm();});
  $('cancel-fear').addEventListener('click',()=>{editingFear=false;draftFear=null;draftLike=null;updateFearForm();});
  readFear();readLike();
  // Keep a broad illuminated core and a shorter soft edge, including up close.
  const flashlight = new THREE.SpotLight(0xffe6b8, 46, 20, Math.PI / 7, .5, 1.25);
  flashlight.position.set(.14, -.15, -.12);
  flashlight.target.position.set(0, -.08, -6);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(1024, 1024);
  flashlight.shadow.bias = -.0003;
  configureInteriorFlashlight(flashlight);
  camera.add(flashlight, flashlight.target);
  const ray = new THREE.Raycaster(); ray.far = 2.25;

  function pause() {
    void music.setPlaying(false);
    active = false; dragging = false; lastPointer = null; keys.clear();
    if (!legacyUI) { ui?.pause(); return; }
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
    void music.setPlaying(true);
    if (!legacyUI) return;
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
  let runtimeRevision = 0,personalizedSession=null;
  async function restartRun(fearId=state.fear.id,likeId=state.like.id,nextSession=personalizedSession,runSeed=nextSession?.runSeed??seed,preparedPlans=null) {
    const revision = runtimeRevision;
    if(generating)return;
    music.reset();
    generating=true;updateFearForm();
    // Paint feedback before the synchronous topology/content validation work.
    await new Promise(resolve=>setTimeout(resolve,32));
    try {
    if (!legacyUI && revision !== runtimeRevision) throw new Error('本次启动已取消。');
    const changed=state.input.confirmed&&(state.input.fearId!==fearId||state.input.likeId!==likeId);
    const version=state.input.confirmed?state.input.version+Number(changed):1;
    const nextDream=isStaticSession(nextSession)?preparedPlans??nextSession.plans:chasePreview||bypassPreview ? (()=>{
      const fitted=chasePreview?generatePlan(seed,{chaseEnabled:true,catEnabled:false,contentIds:[]})
        :generatePlan(seed,{threatEnabled:true,contentIds:[]});
      return [fitted,fitted];
    })() : await planDream(runSeed,{catEnabled:likeId==='cat',
      preferences:contentTokensForInputs(likeId,fearId),threatBehaviorId,activeEncounters:!previewId}).catch(error=>{
      if(legacyUI)throw error;
      return [0,1].map(layer=>generatePlan(`${runSeed}:preset:${layer}`,{openingSequence:true,catEnabled:false}));
    });
    const nextPlan=threatPreview?nextDream[1]:nextDream[0];
    const nextState=createState(nextPlan,fearId,likeId,version,state.input);
    if(threatPreview&&nextPlan.threat) {
      nextState.layer=2;nextState.flow.falseAwakenings=1;
      nextState.player={...(bypassPreview?nextPlan.threat.bypass.observation:nextPlan.threat.observation),standing:true,flashlight:true};
    }
    const nextWorld=await createWorldAsync(scene,nextPlan,{threatAppearanceId:nextState.fear.appearanceId,generatedModels:nextSession?.models??[]});
    // Keep the UI responsive while models decode and shaders compile, before
    // giving control to the player. Missing art already retains its preset.
    await Promise.race([nextWorld.artReady,new Promise(resolve=>setTimeout(resolve,5000))]);
    camera.position.set(nextState.player.x,1.08,nextState.player.z);
    camera.rotation.set(0,nextPlan.spawn.yaw,0);
    const textures=new Set();
    scene.traverse(node=>{for(const mat of [node.material].flat().filter(Boolean))
      for(const value of Object.values(mat))if(value?.isTexture&&value.image)textures.add(value);});
    let uploadStart=performance.now();
    for(const texture of textures){
      renderer.initTexture(texture);
      if(performance.now()-uploadStart>8){await new Promise(resolve=>setTimeout(resolve,0));uploadStart=performance.now();}
    }
    await renderer.compileAsync(scene,camera).catch(()=>{});
    await new Promise(resolve=>requestAnimationFrame(resolve));
    if (!legacyUI && revision !== runtimeRevision) { nextWorld.dispose(); throw new Error('本次启动已取消。'); }
    world.dispose();if(personalizedSession!==nextSession)personalizedSession?.dispose();personalizedSession=nextSession;world=nextWorld;dream=nextDream;plan=nextPlan;
    seed=runSeed;if(isStaticSession(nextSession)){nextSession.plans=nextDream;nextSession.runSeed=runSeed;}
    state=nextState;yaw=inspectEncounter(plan,state)??plan.spawn.yaw;pitch=inspection==='lever'?-.35:0;targetDoor=false;keys.clear();
    if(threatPreview&&plan.threat)
      yaw=Math.atan2(plan.threat.spawn.x-state.player.x,plan.threat.spawn.z-state.player.z)+Math.PI;
    previewWalk=0;previewWalkDirection=null;
    playerNoise.reset(state.player);
    editingFear=false;fearConfirmed=true;draftFear=null;draftLike=null;updateFearForm();
    vhs.setFlashlight(state.player.flashlight);
    $('ending').hidden=true;$('ending-line').textContent='';$('fade').style.opacity='0';updatePlanStatus();if (legacyUI) enter();
    } catch(error) {
      if (!legacyUI) throw error;
      pause();$('error').textContent=`房间布置失败，请重试或更换种子：${error.message}`;
    } finally {generating=false;updateFearForm();}
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
    const threatLabel=chasePreview?'连续追逐灰盒'
      :threatBehaviorId===HEARING_BEHAVIOR?'听声者灰盒'
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
  if (legacyUI) {
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
    if (event.code === 'KeyF') handleAction('flashlight');
    if (event.code === 'KeyE') handleAction('interact');
  });
  document.addEventListener('keyup', event => keys.delete(event.code));
  }
  function handleAction(name) {
    if (!active || !graphicsReady || !canExplore(state)) return;
    if (name === 'flashlight') {
      state.player.flashlight = !state.player.flashlight;
      vhs.setFlashlight(state.player.flashlight);
    }
    if (name === 'interact') {
      if (!state.player.standing) { state.player.standing = true; state.flow.phase='exploring'; }
      else if (targetDoor) {
        if(targetDoor===plan.chase?.retreatDoorId&&state.doors[targetDoor]?.open)closeChaseDoor(plan,state);
        world.toggleDoor(targetDoor,state);
      }
      else if(interactActive(plan,state,currentView(),world.getColliders()))world.update(0,state);
      else if (requestExit(state,plan,currentView(),world.getColliders())) {keys.clear();dragging=false;lastPointer=null;targetDoor=false;ui?.clearInput();}
    }
  }
  if (!legacyUI) {
    const entrySeeds=new WeakMap();
    ui = attachRuntime({
      prepareDream: createDreamApi({prepareSession:createStaticSessionPreparer({planDream,background:true,scriptBound:true,seedFactory:randomRunSeed})}).prepareDream,
      async start(session) {
        if (!graphicsReady) throw new Error('图形不可用，请刷新重试。');
        if (!isStaticSession(session) && session?.presetFallback !== true && session?.defaultPreset !== true && (!playtest || session?.preview !== true)) throw new Error('生成内容尚未接入，无法开始这场梦。');
        if(!entrySeeds.has(session))entrySeeds.set(session,session.runSeed??randomRunSeed());
        await restartRun('generic',isStaticSession(session)&&!session.manifest.defaults.includes('like')?'none':'cat',isStaticSession(session)?session:null,entrySeeds.get(session));
        activate();
      },
      pause,
      resume() { if(!graphicsReady)throw new Error('图形不可用，请刷新重试。');activate(); },
      async restart() {
        if(!graphicsReady)throw new Error('图形不可用，请刷新重试。');
        const revision=runtimeRevision,current=personalizedSession,nextSeed=randomRunSeed();
        const plans=isStaticSession(current)?await current.replan(nextSeed):null;
        if(revision!==runtimeRevision||current!==personalizedSession)throw new Error('本次启动已取消。');
        await restartRun(state.fear.id,state.like.id,current,nextSeed,plans);
      },
      leave() { music.reset();runtimeRevision++;world.clearGenerated();personalizedSession?.dispose();personalizedSession=null; active=false;started=false;editingFear=true;fearConfirmed=false;keys.clear();ui?.clearInput(); },
      action:handleAction,
      settings(settings) {
        music.setVolume(settings.musicVolume);
        cameraMotionEnabled=settings.motion;
        renderer.setPixelRatio(Math.min(devicePixelRatio,{low:1,medium:1.5,high:2}[settings.quality]));
        renderer.setSize(innerWidth,innerHeight);
        vhs.setIntensity(settings.vhs);vhs.resize(innerWidth,innerHeight);
      }
    });
    if (playtest) {
      const panel=document.createElement('aside');panel.className='runtime-playtest';
      const label=document.createElement('span');label.textContent='玩法测试 · 非生成内容';
      const button=document.createElement('button');button.textContent='开始测试';
      button.addEventListener('click',()=>ui.previewPlay());panel.append(label,button);document.body.append(panel);
    }
  }
  if(query.get('inspectGenerated')==='1'){
    const panel=document.createElement('aside');panel.className='runtime-playtest';
    const info=document.createElement('span');info.textContent='调试定位 · 真实生成模型';panel.append(info);
    for(const [role,label] of [['like','查看喜欢模型'],['fear','查看害怕模型']]){
      const button=document.createElement('button');button.textContent=label;
      button.addEventListener('click',()=>{
        const slot=plan.generatedThemes?.find(s=>s.role===role);if(!slot||!isStaticSession(personalizedSession))return;
        const boxes=world.getColliders(),focus={x:slot.x,y:slot.box.height/2,z:slot.z};
        const points=plan.cells.filter(t=>t.roomId===slot.roomId).map(t=>({x:t.x*plan.cellSize,z:t.z*plan.cellSize,y:1.65}));
        const point=points.find(p=>Math.hypot(p.x-slot.x,p.z-slot.z)>1.1&&Math.hypot(p.x-slot.x,p.z-slot.z)<3&&!boxes.some(b=>overlaps(p.x,p.z,b))&&sightClear(p,focus,boxes.filter(b=>b.kind!=='generated-theme')));
        if(!point){info.textContent='未找到安全观察位置';return;}
        state.player={...state.player,x:point.x,z:point.z,standing:true,flashlight:true};
        yaw=Math.atan2(-(slot.x-point.x),-(slot.z-point.z));pitch=-Math.atan2(1.65-focus.y,Math.hypot(slot.x-point.x,slot.z-point.z));keys.clear();activate();
        info.textContent=`${role} · ${slot.roomId} · 放置缩放 ${slot.scale??1} · 高 ${slot.box.height.toFixed(2)}m`;
      });panel.append(button);
    }
    document.body.append(panel);
  }
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    vhs.resize(innerWidth, innerHeight);
  });
  canvas.addEventListener('webglcontextlost', event => {
    graphicsReady=false;
    event.preventDefault(); document.exitPointerLock(); pause();
    $('error').textContent = '图形上下文已丢失，请刷新页面重新开始。';
    $('start').disabled = true; $('restart').disabled = true;ui?.reportError('图形已中断，请刷新重试。');
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
        nextWorld=createWorld(scene,nextPlan,{threatAppearanceId:state.fear.appearanceId,generatedModels:personalizedSession?.models??[]});
        if(!commitTransition(state,action.id,nextPlan)) {nextWorld.dispose();throw new Error('切层状态不匹配');}
        world.dispose();world=nextWorld;plan=nextPlan;yaw=plan.spawn.yaw;pitch=0;targetDoor=false;
        playerNoise.reset(state.player);
        previewWalk=0;previewWalkDirection=null;
        keys.clear();dragging=false;lastPointer=null;walkSway=0;ui?.clearInput();
        world.updateStory(state.story,state.player);world.updateThreat(state.threat,state.player);vhs.setFlashlight(state.player.flashlight);updatePlanStatus();
      } catch(error) {
        cancelTransition(state);pause();$('error').textContent=`切换失败，可继续当前地图：${error.message}`;ui?.reportError('切换失败，可以继续当前地图。');
      }
    } else if(action.kind==='ending') {
      music.reset();
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
    if(!legacyUI&&(!started||generating))return;
    advanceFlow(dt);
    stepRespawnProtection(state,dt,active);
    const exploring=active && canExplore(state);
    const input=ui?.sample(dt);
    if (exploring && input) { yaw+=input.yaw;pitch=THREE.MathUtils.clamp(pitch+input.pitch,-1.35,1.35); }
    if (exploring) {
      world.update(dt, state);
      if (state.player.standing) {
        let forward = input?.forward ?? (Number(keys.has('KeyW')) - Number(keys.has('KeyS')));
        let right = input?.right ?? (Number(keys.has('KeyD')) - Number(keys.has('KeyA')));
        const length = Math.max(1,Math.hypot(forward, right));
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
      && (input ? Math.hypot(input.forward,input.right)>.01 : ['KeyW', 'KeyA', 'KeyS', 'KeyD'].some(code => keys.has(code)));
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
      targetDoor = targetsDoor(ray, world, state);
      const activePrompt=activeInteraction(plan,state,currentView(),world.getColliders())?.label;
      $('prompt').textContent = !state.player.standing ? 'E  起身' : targetDoor ? `E  ${world.doorPrompt(targetDoor,state)}`
        :activePrompt ? `E  ${activePrompt}`
        :canUseExit(state,plan,currentView(),world.getColliders()) ? 'E  离开这里' : '';
      $('prompt').hidden = !($('prompt').textContent);
    }
    if(exploring) {
      const view=currentView(),boxes=world.getColliders();
      stepActive(plan,state,view,dt,boxes);
      const origin=flashlight.getWorldPosition(new THREE.Vector3());
      const direction=flashlight.target.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
      const beam={enabled:state.player.flashlight,origin,direction,angle:flashlight.angle,distance:flashlight.distance};
      const lethal=stepThreat(world.getTopology(),state,view,beam,dt,{boxes,noiseEvents});
      if(lethal && requestDeath(state)) {keys.clear();dragging=false;lastPointer=null;targetDoor=false;ui?.clearInput();}
      const encounter=state.threat && roomIdAt(plan,state.player)!=='bedroom'
        && (plan.chase ? state.threat.stage>0&&state.threat.phase!=='escaped'
          :['demo','pursuing'].includes(state.threat.phase)
            &&(state.threat.seesPlayer||state.threat.sensesPlayer));
      if(canExplore(state)) {
        if(encounter) {
          if(!['statueDemo','chase'].includes(state.story.cue?.kind)) state.story.cue=null;
          state.story.route=null;state.story.routeFinished=false;
        } else stepFlowNarration(state,plan,view,dt,boxes);
        state.story.themeVariants=world.getThemeVariants();
        const puzzle=plan.activeEncounters?.puzzle;
        const blockedDoorIds=puzzle&&!activeState(plan,state).solved?[puzzle.doorId]:[];
        stepStory(plan,state.story,view,dt,{boxes,threat:state.threat,suppressRoutes:Boolean(encounter),blockedDoorIds});
        world.updateStory(state.story,state.player);
      }
      world.updateThreat(state.threat,state.player);
    }
    if(previewStatus)previewStatus.textContent=chasePreview
      ?`B13–B16 连续追逐 · 阶段 ${state.threat?.stage??0}/4 · ${state.threat?.phase??'无'} · 门阻挡 ${state.threat?.doorRemaining?.toFixed(1)??'0'} 秒 · 侧室 ${roomIdAt(plan,state.player)===plan.chase.hideRoomId?'已进入':'未进入'}`
      :bypassPreview?`M03 安全绕行 · 观察 ${state.story.metaBypass?.phase??'等待'} · 威胁 ${state.threat?.phase??'无'} · 路线 ${plan.threat.bypass.returnRoute.join(' → ')}`
      :hearingPreview
      ?`TH02 隔离预览 · ${state.threat?.phase??'无'} · 调查 ${state.threat?.memory?.phase??'无'} · 声源 ${state.threat?.memory?.lastSound?.eventId??'无'} · 安全示范 ${state.threat?.demoComplete?'已结束':state.threat?.demoStarted?'进行中':'未触发'}`
      :`TH03 隔离预览 · ${state.threat?.phase??'无'} · 手电 ${state.player.flashlight?'开':'关'} · 照见 ${state.threat?.lit?'是':'否'} · 后退 ${state.threat?.demoMoved?.toFixed(2)??'0'} 米 · 安全示范 ${state.threat?.demoComplete?'已结束':state.threat?.demoStarted?'进行中':'未触发'}`;
    $('fade').style.opacity=String(transitionOpacity(state));
    $('crosshair').hidden=!exploring;$('hint').hidden=!exploring;
    if(!exploring) $('prompt').hidden=true;
    $('subtitle').textContent=state.story.cue?.text??'';
    $('subtitle').hidden=!exploring || !state.story.cue;
    $('location').textContent = world.roomAt(state.player.x, state.player.z);
    ui?.update({interaction:exploring?$('prompt').textContent.replace(/^E\s+/, ''):'',
      subtitle:exploring?state.story.cue?.text??'':'',flashlight:state.player.flashlight,
      canMove:exploring,completed:state.completed&&!state.flow.transition});
    world.renderScreens(renderer);
    vhs.render(time / 1000);
  });
  vhs.resize(innerWidth, innerHeight);
}
