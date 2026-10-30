import * as THREE from 'three';
import './style.css';
import { createState } from './state.js';
import { movePlayer } from './collision.js';
import { createWorld } from './world.js';
import { generatePlan } from './planning/generate.js';
import { TEMPLATE_NAMES } from './planning/templates.js';
import { drawMap } from './map-preview.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const keys = new Set();
const seed = new URLSearchParams(location.search).get('seed')?.slice(0, 80) || '42';
let plan;
let planError;
try { plan = generatePlan(seed); } catch (error) { planError = error; }
let state = createState(plan);
let active = false;
let started = false;
let yaw = plan?.spawn.yaw ?? 0;
let pitch = 0;
let sensitivity = 1;
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
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111916);
  scene.fog = new THREE.Fog(0x111916, 9, 24);
  const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .06, 40);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  const world = createWorld(scene, plan);
  $('seed').value = plan.seed;
  const bedroom = plan.rooms.find(r => r.id === 'bedroom');
  const sizeX = (Math.max(...bedroom.cells.map(c => c[0])) - Math.min(...bedroom.cells.map(c => c[0])) + 1) * plan.cellSize;
  const sizeZ = (Math.max(...bedroom.cells.map(c => c[1])) - Math.min(...bedroom.cells.map(c => c[1])) + 1) * plan.cellSize;
  $('plan-status').textContent = `种子 ${plan.seed} · ${plan.rooms.length} 个房间 · ${plan.planHash}${plan.validation.fallback ? ' · 保底布局' : ' · 校验通过'} · 起始${TEMPLATE_NAMES[bedroom.type]} ${sizeX}×${sizeZ}米`;
  const flashlight = new THREE.SpotLight(0xffe6b8, 24, 15, Math.PI / 7, .65, 1.5);
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
    $('hint').hidden = true;
    if (state.completed) {
      $('title').textContent = '地图巡查完成';
      $('description').textContent = '已抵达出口。当前为单层地图原型，尚未加入猫房事件与假醒。';
      $('start').innerHTML = '继续探索 <span>↗</span>';
      $('restart').hidden = false;
    } else if (started) {
      $('title').textContent = '梦境暂停';
      $('description').textContent = '房间会在这里等你。';
      $('start').innerHTML = '继续探索 <span>↗</span>';
      $('restart').hidden = false;
    }
  }
  function activate() {
    active = true; started = true; keys.clear();
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
    $('error').textContent = '';
    if (dragMode) { activate(); return; }
    try {
      await canvas.requestPointerLock();
    } catch {
      lockFailed();
    }
  }
  $('start').addEventListener('click', enter);
  $('drag-mode').addEventListener('click', () => { dragMode = true; $('error').textContent = ''; activate(); });
  $('restart').addEventListener('click', () => {
    state = createState(plan); yaw = plan.spawn.yaw; pitch = 0; world.reset();
    enter();
  });
  $('apply-seed').addEventListener('click', () => {
    const next = $('seed').value.trim().slice(0, 80) || '42';
    const url = new URL(location.href); url.searchParams.set('seed', next); location.assign(url);
  });
  $('new-seed').addEventListener('click', () => {
    const url = new URL(location.href); url.searchParams.set('seed', String(crypto.getRandomValues(new Uint32Array(1))[0])); location.assign(url);
  });
  $('show-map').addEventListener('click', () => {
    drawMap($('map-canvas'), plan, state.player); $('map-panel').hidden = false;
  });
  $('close-map').addEventListener('click', () => { $('map-panel').hidden = true; });
  $('sensitivity').addEventListener('input', event => { sensitivity = Number(event.target.value); });
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
    if (!active || !dragMode || event.button !== 0) return;
    dragging = true; lastPointer = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', () => { dragging = false; lastPointer = null; });
  canvas.addEventListener('pointercancel', () => { dragging = false; lastPointer = null; });
  document.addEventListener('mousemove', event => {
    if (!active || (dragMode && !dragging)) return;
    const dx = dragMode ? event.clientX - lastPointer.x : event.movementX;
    const dy = dragMode ? event.clientY - lastPointer.y : event.movementY;
    if (dragMode) lastPointer = { x: event.clientX, y: event.clientY };
    yaw -= dx * .002 * sensitivity;
    pitch = THREE.MathUtils.clamp(pitch - dy * .002 * sensitivity, -1.35, 1.35);
  });
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.code === 'Escape') { document.exitPointerLock(); pause(); return; }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyF', 'Space'].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    if (event.repeat) return;
    if (event.code === 'KeyF') state.player.flashlight = !state.player.flashlight;
    if (event.code === 'KeyE') {
      if (!state.player.standing) state.player.standing = true;
      else if (targetDoor) state.doors.bedroom.open = true;
      else if (Math.hypot(state.player.x - plan.exit.x, state.player.z - plan.exit.z) < 1.7) { state.completed = true; document.exitPointerLock(); pause(); }
    }
  });
  document.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); document.exitPointerLock(); pause();
    $('error').textContent = '图形上下文已丢失，请刷新页面重新开始。';
    $('start').disabled = true; $('restart').disabled = true;
  });
  let previous = performance.now();
  renderer.setAnimationLoop(time => {
    const dt = Math.min(Math.max((time - previous) / 1000, 0), .05); previous = time;
    if (active) {
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
    camera.position.set(state.player.x, state.player.standing ? 1.65 : 1.08, state.player.z);
    camera.rotation.set(pitch, yaw, 0);
    camera.updateMatrixWorld(); scene.updateMatrixWorld();
    flashlight.visible = state.player.flashlight;
    if (active) {
      ray.setFromCamera(new THREE.Vector2(), camera);
      const hit = ray.intersectObjects([...world.solids, ...world.doorMeshes.filter(d => d.visible)], false)[0];
      targetDoor = state.player.standing && !state.doors.bedroom.open && hit?.object === world.door;
      $('prompt').textContent = !state.player.standing ? 'E  起身' : targetDoor ? 'E  开门' : Math.hypot(state.player.x - plan.exit.x, state.player.z - plan.exit.z) < 1.7 ? 'E  完成地图巡查' : '';
      $('prompt').hidden = !($('prompt').textContent);
    }
    $('location').textContent = world.roomAt(state.player.x, state.player.z);
    renderer.render(scene, camera);
  });
}
