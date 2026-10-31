import { createControlState, stickVector } from './control-state.js';

export function createBrowserControls({ surface, moveZone, lookZone, onAction, onPause, onModeHint = () => {} }) {
  const state = createControlState(), abort = new AbortController(), signal = abort.signal;
  let enabled = false, mode = 'keyboard', options = {}, mouseDrag = null;
  const origins = new Map();
  const listen = (node, event, fn) => node.addEventListener(event, fn, { signal });
  const editable = node => node instanceof Element && Boolean(node.closest('input,textarea,select,[contenteditable]'));
  function clear() {
    state.clear(); origins.clear(); mouseDrag = null;
    for (const zone of [moveZone,lookZone]) {
      zone.style.setProperty('--stick-x','0px'); zone.style.setProperty('--stick-y','0px');
      for (const name of ['--base-x','--base-y']) zone.style.removeProperty(name);
    }
  }
  for (const [zone, role] of [[moveZone,'move'],[lookZone,'look']]) {
    listen(zone,'pointerdown', event => {
      if (!enabled || mode !== 'touch' || event.button > 0 || !state.claim(event.pointerId,role)) return;
      event.preventDefault(); zone.setPointerCapture(event.pointerId);
      const rect = zone.getBoundingClientRect();
      const floating = role === 'move' && options.leftStick === 'floating';
      const swipe = role === 'look' && options.look === 'swipe';
      const x = floating || swipe ? event.clientX : rect.left + rect.width/2;
      const y = floating || swipe ? event.clientY : rect.top + rect.height/2;
      origins.set(event.pointerId,{x,y,role,zone,lastX:event.clientX,lastY:event.clientY});
      if (floating) { zone.style.setProperty('--base-x',`${x-rect.left}px`); zone.style.setProperty('--base-y',`${y-rect.top}px`); }
      update(event);
    });
    function update(event) {
      const origin = origins.get(event.pointerId); if (!origin || origin.zone !== zone) return;
      event.preventDefault();
      const dx=event.clientX-origin.x, dy=event.clientY-origin.y;
      if (role === 'look' && options.look === 'swipe') {
        state.look((event.clientX-origin.lastX)*options.touchSensitivity/options.mouseSensitivity,
          (event.clientY-origin.lastY)*options.touchSensitivity/options.mouseSensitivity);
        origin.lastX=event.clientX; origin.lastY=event.clientY;
      } else {
        state.update(event.pointerId,stickVector(dx,dy));
        const factor=Math.min(1,40/(Math.hypot(dx,dy)||1));
        zone.style.setProperty('--stick-x',`${dx*factor}px`); zone.style.setProperty('--stick-y',`${dy*factor}px`);
      }
    }
    listen(zone,'pointermove',update);
    for (const eventName of ['pointerup','pointercancel','lostpointercapture']) listen(zone,eventName,event=>{
      if (!origins.has(event.pointerId)) return;
      origins.delete(event.pointerId); state.release(event.pointerId);
      zone.style.setProperty('--stick-x','0px');zone.style.setProperty('--stick-y','0px');
      zone.style.removeProperty('--base-x');zone.style.removeProperty('--base-y');
    });
  }
  listen(window,'keydown',event=>{
    if (editable(event.target)) return;
    if (event.code==='Escape' && enabled) { event.preventDefault(); clear(); onPause(); return; }
    if (!enabled || mode !== 'keyboard') return;
    if (['KeyW','KeyA','KeyS','KeyD','KeyE','KeyF'].includes(event.code)) {
      event.preventDefault();state.keys.add(event.code);
      if (!event.repeat && event.code==='KeyE') onAction('interact');
      if (!event.repeat && event.code==='KeyF') onAction('flashlight');
    }
  });
  listen(window,'keyup',event=>state.keys.delete(event.code));
  listen(surface,'pointerdown',event=>{
    if (!enabled || mode!=='keyboard' || event.button!==0) return;
    if (document.pointerLockElement===surface) return;
    mouseDrag=event.pointerId;surface.setPointerCapture(event.pointerId);
  });
  listen(surface,'pointerup',()=>{mouseDrag=null;});
  listen(surface,'pointercancel',()=>{mouseDrag=null;});
  listen(surface,'lostpointercapture',()=>{mouseDrag=null;});
  listen(document,'mousemove',event=>{
    if (enabled && mode==='keyboard' && (document.pointerLockElement===surface || mouseDrag!==null)) state.look(event.movementX,event.movementY);
  });
  listen(document,'pointerlockchange',()=>{if(enabled&&mode==='keyboard'&&document.pointerLockElement!==surface){clear();onPause();}});
  listen(window,'blur',()=>{clear();if(enabled)onPause();});
  listen(document,'visibilitychange',()=>{if(document.hidden){clear();if(enabled)onPause();}});
  listen(window,'pagehide',()=>{clear();if(enabled)onPause();});
  listen(document,'pointerdown',event=>{if(!enabled)onModeHint(event.pointerType==='touch'?'touch':'keyboard');});
  return {
    sample(dt) { return enabled ? state.sample(Math.min(Math.max(dt,0),.05),options) : {right:0,forward:0,yaw:0,pitch:0}; },
    configure(nextMode,settings) { clear();mode=nextMode;options=settings; },
    setEnabled(value) { enabled=value;clear();if(!value&&document.pointerLockElement===surface)document.exitPointerLock(); },
    async lock() { if(mode==='keyboard'&&surface.requestPointerLock)await surface.requestPointerLock(); },
    clear,
    dispose() { enabled=false;clear();abort.abort();if(document.pointerLockElement===surface)document.exitPointerLock(); }
  };
}
