import './shell.css';
import { defaults, loadSettings, saveSettings, normalizeSettings, resolveMode } from './settings.js';
import { createGeneration } from './generation.js';
import { startSession } from './start-session.js';
import { createBrowserControls } from '../input/browser-controls.js';

// Adapter owns gameplay. This shell only emits intents and consumes snapshots.
export function createGameUI({ mount = document.body, surface, adapter = {}, storage, demo = false } = {}) {
  try { storage ??= window.localStorage; } catch { /* Settings still work for this session. */ }
  let settings = loadSettings(storage), page = 'title', returnPage = 'title', tab = 'controls';
  let modeHint = matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0;
  let mode = resolveMode(settings,modeHint), hasSession = false, preparedSession, generationStatus='idle', stage='understanding';
  let interpretationAnswer=null;
  let confirmAction, beforeRotate='paused', toastTimer, destroyed=false, pendingStart=false, entering=false, entrySequence=0;
  const abort = new AbortController(), signal = abort.signal, draft={like:'',fear:''};
  const root=document.createElement('div');root.className='yog-ui';
  root.innerHTML=`
    <section class="screen" data-screen="title" aria-labelledby="ui-title">
      <div class="content title-content"><h1 id="ui-title" tabindex="-1">心里有鬼</h1><p class="eyebrow">YOUR OWN GHOST</p>
      <p class="title-copy">门外的房间，似乎又换了位置。</p><div class="title-actions">
      <button class="primary" data-action="begin">进入梦境 <span aria-hidden="true">↗</span></button>
      <button data-action="settings">设置</button><button class="quiet" data-action="help">操作说明</button></div>
      <p class="title-note">包含恐怖与动物死亡表现。<br>当前版本暂无音效，旁白以字幕呈现。<br>刷新页面会重新开始。</p></div></section>
    <section class="screen form-screen" data-screen="like" hidden aria-labelledby="ui-like-title"><span class="brand">心里有鬼</span><span class="step">01 / 03</span>
      <div class="content"><h2 id="ui-like-title" tabindex="-1">你喜欢什么？</h2><p class="muted">不必只写一个名字，也可以描述一种感觉。</p>
      <label class="muted" for="ui-like">喜欢的事物与细节</label><textarea id="ui-like" maxlength="1200" placeholder="我喜欢雨天的旧书店，还有会发光的水母。" aria-describedby="ui-like-help"></textarea>
      <div class="field-meta"><span id="ui-like-help">写具体一点，梦会更接近你的想象。</span><span data-count="like">0 / 1200</span></div>
      <div class="actions"><button class="quiet" data-action="title">返回</button><button class="primary" data-action="next">下一步</button></div></div></section>
    <section class="screen form-screen" data-screen="fear" hidden aria-labelledby="ui-fear-title"><span class="brand">心里有鬼</span><span class="step">02 / 03</span>
      <div class="content"><h2 id="ui-fear-title" tabindex="-1">你害怕什么？</h2><p class="muted">是某个东西，还是它靠近你的方式？</p>
      <label class="muted" for="ui-fear">害怕的事物与细节</label><textarea id="ui-fear" maxlength="1200" placeholder="我害怕没有脸的人，站在远处，一直模仿我的动作。" aria-describedby="ui-fear-help"></textarea>
      <div class="field-meta"><span id="ui-fear-help">可以描述外形、声音、动作，或让你不安的细节。</span><span data-count="fear">0 / 1200</span></div>
      <div class="actions"><button class="quiet" data-action="like">上一步</button><button class="primary" data-action="generate">编织梦境</button></div></div></section>
    <section class="screen form-screen" data-screen="generation" hidden aria-labelledby="ui-generation-title"><span class="brand">心里有鬼</span><span class="step">03 / 03</span>
      <div class="content"><h2 id="ui-generation-title" tabindex="-1">梦正在成形</h2><p class="muted" data-generation-copy>你说过的事物，正在门后相遇。</p>
      <div class="summary"><article><header>喜欢的事物<button class="quiet" data-action="edit-like">修改</button></header><p data-summary="like"></p></article>
      <article><header>害怕的事物<button class="quiet" data-action="edit-fear">修改</button></header><p data-summary="fear"></p></article></div>
      <div class="progress" aria-label="准备进度"><span data-stage="understanding">理解描述</span><span data-stage="generating">生成梦境</span><span data-stage="preparing">准备进入</span></div>
      <p class="message" data-generation-message role="status" aria-live="polite"></p>
      <div class="actions"><button class="quiet" data-action="edit-fear">返回修改</button><button data-action="retry" hidden>重新尝试</button><button class="primary" data-action="enter" disabled>入梦</button></div>
      <button class="quiet" data-action="settings" data-mode-label></button></div></section>
    <section class="screen form-screen" data-screen="interpretation" hidden aria-labelledby="ui-interpretation-title"><span class="brand">心里有鬼</span><span class="step">确认理解</span>
      <div class="content"><h2 id="ui-interpretation-title" tabindex="-1">这是你想表达的吗？</h2><p class="muted">先确认梦如何理解你，再让它开始成形。</p>
      <div class="summary"><article><header>喜欢的事物</header><p class="muted">你的原话</p><p data-original="like"></p><p class="muted">梦的理解</p><p data-interpretation="like"></p></article>
      <article><header>害怕的事物</header><p class="muted">你的原话</p><p data-original="fear"></p><p class="muted">梦的理解</p><p data-interpretation="fear"></p></article></div>
      <p class="message" data-ambiguities role="status"></p><div class="actions"><button data-action="interpretation-edit">返回修改</button><button class="primary" data-action="interpretation-accept">理解正确，继续</button></div></div></section>
    <section class="screen centered" data-screen="paused" hidden aria-labelledby="ui-pause-title"><div class="content title-content"><p class="eyebrow">TAKE YOUR TIME</p>
      <h2 id="ui-pause-title" tabindex="-1">梦境暂停</h2><p class="title-copy">房间会在这里等你。</p><div class="title-actions">
      <button class="primary" data-action="resume">继续探索</button><button data-action="settings">设置</button><button data-action="help">操作说明</button>
      <button class="quiet" data-action="restart">重新开始</button><button class="quiet" data-action="leave">返回标题</button></div></div></section>
    <section class="screen centered" data-screen="settings" hidden aria-labelledby="ui-settings-title"><div class="content settings-content">
      <h2 id="ui-settings-title" tabindex="-1">设置</h2><div class="tabs" role="tablist" aria-label="设置分类">
      <button role="tab" id="ui-tab-controls" aria-controls="ui-panel-controls" data-tab="controls">操作</button><button role="tab" id="ui-tab-picture" aria-controls="ui-panel-picture" data-tab="picture">画面</button><button role="tab" id="ui-tab-subtitles" aria-controls="ui-panel-subtitles" data-tab="subtitles">字幕</button></div>
      <div role="tabpanel" id="ui-panel-controls" aria-labelledby="ui-tab-controls" data-panel="controls">
        <div class="setting-row"><label for="ui-mode">操作方式</label><select id="ui-mode" data-setting="mode"><option value="auto">自动识别</option><option value="keyboard">键盘鼠标</option><option value="touch">触屏</option></select></div>
        <div class="setting-row" data-device="keyboard"><label for="ui-mouse">鼠标灵敏度</label><span class="range-wrap"><input id="ui-mouse" type="range" min="0.4" max="2" step="0.1" data-setting="mouseSensitivity"><output for="ui-mouse"></output></span></div>
        <div class="setting-row" data-device="touch"><label for="ui-look">环顾方式</label><select id="ui-look" data-setting="look"><option value="stick">双摇杆</option><option value="swipe">右侧滑动</option></select></div>
        <div class="setting-row" data-device="touch"><label for="ui-touch">视角灵敏度</label><span class="range-wrap"><input id="ui-touch" type="range" min="0.4" max="2" step="0.1" data-setting="touchSensitivity"><output for="ui-touch"></output></span></div>
        <div class="setting-row" data-device="touch"><label for="ui-left">左摇杆</label><select id="ui-left" data-setting="leftStick"><option value="fixed">固定</option><option value="floating">浮动</option></select></div><p class="muted" data-mode-label></p>
      </div>
      <div role="tabpanel" id="ui-panel-picture" aria-labelledby="ui-tab-picture" data-panel="picture" hidden>
        <div class="setting-row"><label for="ui-quality">画面质量</label><select id="ui-quality" data-setting="quality"><option value="low">流畅</option><option value="medium">标准</option><option value="high">精细</option></select></div>
        <div class="setting-row"><label for="ui-vhs">录像质感</label><span class="range-wrap"><input id="ui-vhs" type="range" min="0" max="1" step="0.05" data-setting="vhs"><output for="ui-vhs"></output></span></div>
        <div class="setting-row"><label for="ui-motion">镜头微动</label><input id="ui-motion" type="checkbox" data-setting="motion"></div><p class="muted">关闭镜头微动可减少动态效果。</p>
      </div>
      <div role="tabpanel" id="ui-panel-subtitles" aria-labelledby="ui-tab-subtitles" data-panel="subtitles" hidden>
        <div class="setting-row"><label for="ui-size">字幕大小</label><span class="range-wrap"><input id="ui-size" type="range" min="16" max="26" step="1" data-setting="subtitleSize"><output for="ui-size"></output></span></div>
        <div class="setting-row"><label for="ui-background">字幕背景</label><span class="range-wrap"><input id="ui-background" type="range" min="0" max="1" step="0.05" data-setting="subtitleBackground"><output for="ui-background"></output></span></div>
        <p data-subtitle-preview style="padding:14px;text-align:center">门外，好像有什么。</p><p class="muted">当前暂无音效，字幕保持开启。</p>
      </div><p class="message" data-storage-message role="status"></p><div class="actions"><button class="quiet" data-action="reset-settings">恢复本页默认</button><button class="primary" data-action="back">返回</button></div></div></section>
    <section class="screen centered" data-screen="help" hidden aria-labelledby="ui-help-title"><div class="content"><h2 id="ui-help-title" tabindex="-1">在梦里探索</h2>
      <ul class="help-list"><li>键鼠：WASD 移动，鼠标环顾，E 交互，F 手电，Esc 暂停。</li><li>触屏：左摇杆移动，右摇杆环顾，点击“起身／开门”与“手电”。</li><li>也可在设置中选择右侧滑动环顾。</li><li>靠近并看向可交互目标，才会出现对应提示。</li><li>手机请横屏游玩。切到后台会暂停，返回后点击继续。</li></ul><div class="actions"><button class="primary" data-action="back">知道了</button></div></div></section>
    <section class="screen centered" data-screen="ending" hidden aria-labelledby="ui-ending-title"><div class="content title-content"><p class="eyebrow">MORNING, AT LAST</p><h2 id="ui-ending-title" tabindex="-1">你醒了。</h2><p class="title-copy">这一次，梦停在了身后。</p><div class="title-actions"><button class="primary" data-action="new-dream">再做一个梦</button><button class="quiet" data-action="leave">返回标题</button></div></div></section>
    <div class="hud" hidden><div class="reticle" aria-hidden="true"></div><span class="interaction"></span><p class="subtitle" hidden></p><button class="pause-button" aria-label="暂停" data-action="pause">Ⅱ</button>
      <div class="touch-controls"><div class="joystick move-stick" aria-label="移动摇杆"><div class="stick-base"><div class="stick-knob"></div></div><span class="stick-label">移动</span></div>
      <div class="joystick look-stick" aria-label="环顾摇杆"><div class="stick-base"><div class="stick-knob"></div></div><span class="stick-label">环顾</span></div>
      <div class="touch-actions"><button data-action="interact" disabled>交互</button><button data-action="flashlight" aria-label="手电" aria-pressed="false">手电</button></div></div></div>
    <div class="rotate" hidden><div><div class="rotate-icon" aria-hidden="true">▱ ↻</div><h2 tabindex="-1">请横过手机</h2><p class="muted">横屏后点击继续，梦境会等你。</p><button data-action="rotate-back">返回设置</button></div></div>
    <div class="dialog-backdrop" hidden><div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="ui-confirm-title" aria-describedby="ui-confirm-copy"><h2 id="ui-confirm-title">离开这个梦？</h2><p id="ui-confirm-copy"></p><div class="actions"><button data-action="cancel-confirm">取消</button><button class="primary" data-action="confirm">确认</button></div></div></div>
    <p class="toast" role="status" hidden></p>`;
  mount.append(root);
  const $=selector=>root.querySelector(selector), all=selector=>[...root.querySelectorAll(selector)];
  function toast(message) { $('.toast').textContent=message;$('.toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('.toast').hidden=true;},5000); }
  const controls=createBrowserControls({surface,moveZone:$('.move-stick'),lookZone:$('.look-stick'),onPause:pause,onAction:action,
    onModeHint(hint){if(settings.mode==='auto'&&page!=='playing'){modeHint=hint==='touch';applySettings(false);}}
  });
  function applySettings(persist=true) {
    settings=normalizeSettings(settings);mode=resolveMode(settings,modeHint);
    controls.configure(mode,settings);root.dataset.mode=mode;root.dataset.look=settings.look;root.dataset.reduced=String(!settings.motion);
    root.style.setProperty('--subtitle-size',settings.subtitleSize+'px');root.style.setProperty('--subtitle-bg',settings.subtitleBackground);
    $('.touch-controls').hidden=mode!=='touch';
    for(const node of all('[data-setting]')) {const value=settings[node.dataset.setting];if(node.type==='checkbox')node.checked=value;else node.value=value;const output=node.parentElement.querySelector('output');if(output)output.value=String(value);}
    for(const node of all('[data-device]'))node.hidden=node.dataset.device!==mode;
    for(const node of all('[data-mode-label]'))node.textContent=`当前操作：${mode==='touch'?'触屏 · '+(settings.look==='stick'?'双摇杆':'滑动环顾'):'键盘鼠标'}`;
    $('[data-subtitle-preview]').style.cssText=`padding:14px;text-align:center;font-size:${settings.subtitleSize}px;background:rgb(6 12 10 / ${settings.subtitleBackground})`;
    if(persist&&!saveSettings(storage,settings))$('[data-storage-message]').textContent='设置已在本次生效，但浏览器无法保存。';
    adapter.settings?.({...settings},mode);
  }
  function show(next) {
    if(destroyed)return;
    page=next;root.dataset.page=page;
    all('[data-screen]').forEach(node=>node.hidden=node.dataset.screen!==page);
    $('.hud').hidden=page!=='playing'; controls.setEnabled(page==='playing');
    if(page!=='playing')adapter.pause?.();
    if(page==='settings')showTab(tab);
    const heading=$(`[data-screen="${page}"] h1, [data-screen="${page}"] h2`);heading?.focus({preventScroll:true});
  }
  function showTab(next) {tab=next;all('[data-tab]').forEach(node=>{node.setAttribute('aria-selected',String(node.dataset.tab===tab));node.tabIndex=node.dataset.tab===tab?0:-1;});all('[data-panel]').forEach(node=>node.hidden=node.dataset.panel!==tab);}
  const generation=createGeneration({prepare:adapter.prepareDream,
    confirm(interpretation,{signal:confirmationSignal}) {
      if(destroyed||confirmationSignal.aborted)return Promise.reject(new Error('确认已取消。'));
      for(const role of ['like','fear']){
        $(`[data-original=${role}]`).textContent=draft[role];
        $(`[data-interpretation=${role}]`).textContent=interpretation.displaySummary[role];
      }
      const ambiguous=interpretation.ambiguities.length>0;
      $('[data-ambiguities]').textContent=ambiguous?'还需要澄清：'+interpretation.ambiguities.map(item=>typeof item==='string'?item:(item?.question??item?.message??JSON.stringify(item))).join('；'):'';
      $('[data-action=interpretation-accept]').disabled=ambiguous;
      show('interpretation');
      return new Promise((resolve,reject)=>{
        const answer={accept(){if(ambiguous||interpretationAnswer!==answer)return;cleanup();show('generation');resolve({decision:'accept'});}};
        function cleanup(){confirmationSignal.removeEventListener('abort',cancel);if(interpretationAnswer===answer)interpretationAnswer=null;}
        function cancel(){cleanup();reject(Object.assign(new Error('确认已取消。'),{code:'ABORTED'}));if(page==='interpretation'&&!destroyed)show('generation');}
        interpretationAnswer=answer;confirmationSignal.addEventListener('abort',cancel,{once:true});
      });
    },onChange(result){
    if(destroyed)return;
    generationStatus=result.status;stage=result.stage??stage;preparedSession=result.session;
    $('#ui-generation-title').textContent=result.status==='error'?'梦还没有准备好':result.status==='ready'?'开场已就绪':'梦正在成形';
    $('[data-generation-copy]').textContent=result.status==='error'?'你的描述还在这里。':result.status==='ready'?'可以先进入，门后的梦境仍在准备。':'你说过的事物，正在门后相遇。';
    $('[data-generation-message]').textContent=result.message??(result.status==='ready'?'开场已准备好，可以入梦。':'正在准备，请稍候。');
    $('[data-action=enter]').disabled=result.status!=='ready';$('[data-action=retry]').hidden=result.status!=='error';
    all('[data-stage]').forEach(node=>node.classList.toggle('current',node.dataset.stage===stage||(stage==='ready'&&node.dataset.stage==='preparing')));
  }});
  function generate() {
    if(!draft.like.trim()){show('like');$('#ui-like').focus();toast('写下你喜欢的事物。');return;}
    if(!draft.fear.trim()){show('fear');$('#ui-fear').focus();toast('写下你害怕的事物。');return;}
    for(const role of ['like','fear'])$(`[data-summary=${role}]`).textContent=draft[role];
    show('generation');void generation.run(draft);
  }
  function portrait(){return mode==='touch'&&innerHeight>innerWidth;}
  async function resume(start=false) {
    if(entering)return;
    start ||= pendingStart;
    if(portrait()){pendingStart=start;beforeRotate='paused';show('paused');$('.rotate').hidden=false;return;}
    entering=true;const entryId=++entrySequence;
    root.setAttribute('aria-busy','true');
    $('[data-action=enter]').disabled=true;$('[data-action=resume]').disabled=true;
    try {
      // User activation remains synchronous until the adapter chooses to await.
      const pending=start?startSession(adapter,preparedSession):adapter.resume?.();
      await pending;
      if(destroyed||entryId!==entrySequence){adapter.pause?.();return;}
      if(start){generation.handoff();pendingStart=false;}
      hasSession=true;show('playing');
      try {await controls.lock();} catch {toast('鼠标锁定不可用，可按住画面拖动环顾。');}
    } catch(error){if(destroyed||entryId!==entrySequence)return;pendingStart=start;show('paused');toast(error.message||'无法进入，请重试。');}
    finally{entering=false;root.removeAttribute('aria-busy');$('[data-action=enter]').disabled=generationStatus!=='ready';$('[data-action=resume]').disabled=false;}
  }
  function pause(){if(page==='playing'){show('paused');applySettings(false);}}
  function action(name){if(page==='playing')adapter.action?.(name);}
  function ask(copy,callback){pause();confirmAction=callback;$('#ui-confirm-copy').textContent=copy;$('.dialog-backdrop').hidden=false;$('[data-action=cancel-confirm]').focus();}
  function leave(){entrySequence++;generation.cancel();pendingStart=false;preparedSession=undefined;hasSession=false;adapter.leave?.();show('title');}
  const actions={
    begin(){show('like');},title(){show('title');},like(){show('like');},next(){if(!draft.like.trim()){toast('写下你喜欢的事物。');$('#ui-like').focus();return;}show('fear');},
    'interpretation-accept'(){interpretationAnswer?.accept();},'interpretation-edit'(){generation.cancel();generationStatus='idle';preparedSession=undefined;show('like');},
    generate,retry:generate,'edit-like'(){generation.cancel();generationStatus='idle';preparedSession=undefined;show('like');},'edit-fear'(){generation.cancel();generationStatus='idle';preparedSession=undefined;show('fear');},
    enter(){if(generationStatus==='ready')void resume(true);},resume(){void resume();},pause,
    settings(){returnPage=page;show('settings');applySettings(false);},help(){returnPage=page;show('help');},back(){show(returnPage);},
    interact(){action('interact');},flashlight(){action('flashlight');},
    restart(){ask('从第一层重新开始，本局进度将丢失。',async()=>{try{await adapter.restart?.();show('paused');}catch(error){toast(error.message||'重新开始失败');}});},
    leave(){if(hasSession&&page!=='ending')ask('返回标题会结束本局，当前进度不会保存。',leave);else leave();},
    'new-dream'(){leave();show('like');},
    confirm(){const callback=confirmAction;confirmAction=null;$('.dialog-backdrop').hidden=true;callback?.();},
    'cancel-confirm'(){confirmAction=null;$('.dialog-backdrop').hidden=true;$('[data-screen=paused] h2')?.focus();},
    'rotate-back'(){ $('.rotate').hidden=true;returnPage=beforeRotate;show('settings');},
    'reset-settings'(){const keys=tab==='controls'?['mode','look','leftStick','mouseSensitivity','touchSensitivity']:tab==='picture'?['quality','vhs','motion']:['subtitleSize','subtitleBackground'];for(const key of keys)settings[key]=defaults[key];applySettings();}
  };
  root.addEventListener('click',event=>{const node=event.target.closest('button');if(!node||node.disabled||entering)return;if(node.dataset.tab)showTab(node.dataset.tab);else actions[node.dataset.action]?.();},{signal});
  root.addEventListener('input',event=>{
    const node=event.target;
    if(node.matches('textarea')){const key=node.id==='ui-like'?'like':'fear';draft[key]=node.value;$(`[data-count=${key}]`).textContent=`${node.value.length} / 1200`;}
    if(node.dataset.setting){settings[node.dataset.setting]=node.type==='checkbox'?node.checked:node.type==='range'?Number(node.value):node.value;applySettings();}
  },{signal});
  root.addEventListener('keydown',event=>{
    if(event.target.matches('[role=tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
      event.preventDefault();const tabs=all('[data-tab]'),i=tabs.indexOf(event.target);const next=event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:2))%3;showTab(tabs[next].dataset.tab);tabs[next].focus();
    }
    if(event.key==='Escape'&&page!=='playing') {event.preventDefault();if(!$('.dialog-backdrop').hidden)actions['cancel-confirm']();else if(['settings','help'].includes(page))actions.back();}
    if(event.key==='Tab'&&!$('.dialog-backdrop').hidden){const buttons=[...$('.dialog').querySelectorAll('button')];if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}}
  },{signal});
  window.addEventListener('resize',()=>{if(page==='playing'&&portrait()){beforeRotate='paused';pause();$('.rotate').hidden=false;}else if(!portrait()&&!$('.rotate').hidden){$('.rotate').hidden=true;show('paused');}},{signal});
  applySettings(false);show('title');
  return {
    root, sample:dt=>controls.sample(dt), pause,
    update({interaction='',subtitle='',flashlight=false,canMove=true,completed=false}={}) {
      $('[data-action=interact]').disabled=!interaction;$('[data-action=interact]').textContent=interaction||'交互';
      $('.interaction').textContent=interaction?(mode==='keyboard'?`[E] ${interaction}`:interaction):'';
      $('.subtitle').textContent=subtitle;$('.subtitle').hidden=!subtitle;
      $('[data-action=flashlight]').setAttribute('aria-pressed',String(flashlight));
      if(!canMove)controls.clear();
      if(completed&&page==='playing')show('ending');
    },
    previewPlay(){if(!demo)return;generation.cancel();hasSession=true;preparedSession={preview:true};void resume(true);},
    getSnapshot(){return {page,mode,settings:{...settings},draft:{...draft},generationStatus,hasSession};},
    dispose(){destroyed=true;entrySequence++;generation.cancel();controls.dispose();abort.abort();clearTimeout(toastTimer);root.remove();}
  };
}
