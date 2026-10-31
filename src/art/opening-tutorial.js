import styles from './opening-tutorial.css?inline';

// FontFace is registered at document scope: shadow-scoped @font-face is not
// consistently supported. Reference counting keeps multiple instances safe.
let cameraFont;
let fontUsers = 0;
function retainCameraFont() {
  if (!cameraFont) {
    cameraFont = new FontFace('YOG Camera OSD', `url("${import.meta.env.BASE_URL}art/ui/opening-tutorial-font/fusion-pixel-12px-monospaced-zh_hans.otf.woff2")`, { display: 'swap' });
    document.fonts.add(cameraFont);
    cameraFont.load().catch(() => { /* Monospace/system fallback remains readable. */ });
  }
  fontUsers++;
  return () => {
    if (--fontUsers === 0) { document.fonts.delete(cameraFont); cameraFont = undefined; }
  };
}

const drawing = `<svg viewBox="0 0 320 360" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><linearGradient id="soul" x1="160" y1="60" x2="160" y2="245" gradientUnits="userSpaceOnUse"><stop stop-color="#e8e5d8" stop-opacity=".75"/><stop offset="1" stop-color="#b9d6c9" stop-opacity="0"/></linearGradient><radialGradient id="halo"><stop stop-color="#adc5b5" stop-opacity=".14"/><stop offset="1" stop-color="#adc5b5" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="160" cy="157" rx="142" ry="146" fill="url(#halo)"/>
  <path d="M46 300H274M65 312H255" stroke="#b8c3b3" opacity=".16"/>
  <g class="soul-art"><ellipse cx="160" cy="275" rx="93" ry="21" stroke="#c9c3a4" opacity=".4"/><path d="M83 274L112 253L153 253L177 264L228 267L237 277L83 281Z" stroke="#c9c3a4" opacity=".6"/><ellipse cx="103" cy="258" rx="15" ry="10" stroke="#c9c3a4" opacity=".6"/>
  <path d="M161 226C185 211 125 211 157 190C189 169 139 169 157 148" stroke="#c9c3a4" stroke-dasharray="3 7" opacity=".6"/>
  <g class="floating"><circle cx="160" cy="88" r="20" stroke="url(#soul)"/><path d="M138 116Q160 107 182 116L196 179L178 163L174 207L159 191L143 208L142 162L124 180Z" fill="url(#soul)" fill-opacity=".16" stroke="url(#soul)"/><path d="M151 88H154M166 88H169" stroke="#e8e5d8" stroke-linecap="round"/></g></g>
  <g class="door-art"><path d="M101 284V77H224V284M111 284V88H214V284" stroke="#c9c3a4" opacity=".5"/><path d="M111 284V88L182 111V263Z" fill="#182a24" stroke="#d5c8a6"/><circle cx="169" cy="188" r="3" fill="#d5c8a6"/><path d="M188 120L212 95V280L188 260" fill="#cfdbbd" opacity=".1"/><path d="M149 311L162 295M171 290L182 278" stroke="#d5c8a6" stroke-dasharray="3 5"/></g>
  <g class="route-art"><path d="M65 280L65 211H135V148H212V77" stroke="#d5c8a6" stroke-width="2" stroke-dasharray="4 7"/><circle cx="65" cy="280" r="8" stroke="#d5c8a6"/><path d="M192 94V56H233V94M201 94V65H224V94" stroke="#d5c8a6"/><path d="M135 211H226V260" stroke="#809189" opacity=".5"/><path d="M213 247L239 273M239 247L213 273" stroke="#a47d70"/><circle cx="135" cy="148" r="5" fill="#d5c8a6"/></g>
  <path d="M24 55V24H55M265 24H296V55M24 305V336H55M265 336H296V305" stroke="#c9c3a4" opacity=".25"/>
</svg>`;

const pages = [
  { tag: '离魂', title: '你的身体，还在原处。', copy: '而你，已经离魂。心中的恐惧化作梦魇，正阻挠你回到身体。', note: '穿过梦境，寻找出口，让自己醒来。', art: 'soul', caption: '魂已离身 · 梦尚未醒' },
  { tag: '行动', title: '先学会在梦里行动。', copy: '起身，环顾四周，再走向第一扇门。', note: '靠近并看向目标，出现提示后再交互。', art: 'door', caption: '看向门 · 靠近门 · 打开门' },
  { tag: '回魂', title: '找到路，回到自己。', copy: '梦魇源于你心中的恐惧。它会阻挠你，但别停在这里。', note: '你的目标：找到出口，回魂醒来。', art: 'route', caption: '记住来路 · 继续向前' },
];

/** Presentation only. Caller owns pausing simulation/input and first-run policy. */
export function createOpeningTutorial({ mount = document.body, mode = 'keyboard', look = 'stick', motion = false } = {}) {
  const releaseFont = retainCameraFont();
  const host = document.createElement('div');
  host.dataset.openingTutorial = '';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${styles}</style><dialog aria-labelledby="title" aria-describedby="copy">
    <div class="frame"><header><span class="brand"><span class="play" aria-hidden="true">PLAY ▶</span><span class="brand-label">入梦须知</span></span><div class="header-right"><span class="timecode" aria-hidden="true"></span><button class="skip" data-action="skip">跳过教学 ↗</button></div></header>
    <main><div class="illustration">${drawing}<p class="caption"></p></div><section class="content">
      <p class="eyebrow"></p><h1 id="title" tabindex="-1"></h1><p id="copy" class="copy"></p><div class="details"></div><p class="note"></p>
    </section></main>
    <footer><nav aria-label="教学步骤">${pages.map((page, i) => `<button data-page="${i}" aria-label="第 ${i + 1} 页：${page.tag}"><span>0${i + 1}</span> ${page.tag}</button>`).join('')}</nav>
      <div class="actions"><button class="back" data-action="back">上一步</button><button class="primary" data-action="next"></button></div></footer></div>
  </dialog>`;
  mount.append(host);
  const $ = selector => root.querySelector(selector);
  const dialog = $('dialog');
  let index = 0, pending = null, settle = null, disposed = false;
  const events = new AbortController();

  function render() {
    const page = pages[index];
    dialog.dataset.art = page.art;
    dialog.dataset.motion = String(motion);
    $('.eyebrow').textContent = `0${index + 1} / 03  —  ${page.tag}`;
    $('.timecode').textContent = `00:00:0${index + 1}`;
    $('#title').textContent = page.title;
    $('#copy').textContent = page.copy;
    $('.note').textContent = page.note;
    $('.caption').textContent = page.caption;
    const touch = mode === 'touch';
    if (index === 1) {
      $('#copy').textContent = touch ? '先点击“起身”，再移动、环顾四周。' : '先按 E 从床上起身，再用 WASD 探索。';
      $('.note').textContent = touch ? '靠近并看向目标，按画面提示交互。' : '机关与出口也使用 E；以屏幕上的交互提示为准。';
    }
    const instructions = index === 1 ? [
      [touch ? '左摇杆' : 'W A S D', '移动', touch ? '拖动左侧摇杆，朝想去的方向走。' : 'W 前进 · S 后退 · A 左移 · D 右移。'],
      [touch ? (look === 'swipe' ? '右侧滑动' : '右摇杆') : '鼠标', '环顾', touch ? (look === 'swipe' ? '在画面右侧滑动，观察四周。' : '拖动右侧摇杆，观察四周。') : '移动鼠标环顾；未锁定时按住左键拖动。'],
      [touch ? '交互按钮' : 'E', '交互 / 开关门', touch ? '点击画面上的“起身”“开门”或“关门”。' : '靠近并看向门，出现 [E] 提示时按 E。'],
    ] : index === 2 ? [
      ['01', '观察', '留意门口、走廊与房间里的变化。'],
      ['02', '寻路', '记住走过的路；遇到阻碍，试试别的方向。'],
      ['03', '避开梦魇', '保持距离，寻找能够继续前进的路。'],
    ] : [];
    $('.details').innerHTML = instructions.map(([key, title, copy]) => `<div class="instruction"><span class="key">${key}</span><div><h2>${title}</h2><p>${copy}</p></div></div>`).join('');
    if (index === 1) {
      const hint = document.createElement('p');
      hint.className = 'secondary';
      hint.textContent = touch ? '点击“手电”开关照明 · 点击 Ⅱ 暂停' : 'F 开关手电 · Esc 暂停';
      $('.details').append(hint);
    }
    $('[data-action=back]').disabled = index === 0;
    $('[data-action=next]').textContent = index === 2 ? '开始寻路 →' : '下一步 →';
    root.querySelectorAll('[data-page]').forEach(button => {
      if (Number(button.dataset.page) === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('#title').focus({ preventScroll: true });
  }

  function finish(reason) {
    if (!pending) return;
    const resolve = settle;
    pending = null;
    settle = null;
    dialog.close();
    resolve({ reason });
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !pending) return;
    if (button.dataset.page !== undefined) index = Number(button.dataset.page);
    else if (button.dataset.action === 'skip') return finish('skipped');
    else if (button.dataset.action === 'back') index = Math.max(0, index - 1);
    else if (button.dataset.action === 'next') {
      if (index === pages.length - 1) return finish('completed');
      index++;
    }
    render();
  }, { signal: events.signal });
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish('skipped'); }, { signal: events.signal });
  // Stop modal keyboard events before bubble-phase gameplay listeners.
  // Capture listeners and simulation must still be disabled by the caller.
  for (const type of ['keydown', 'keyup']) dialog.addEventListener(type, event => event.stopPropagation(), { signal: events.signal });

  return {
    show(options = {}) {
      if (disposed) return Promise.resolve({ reason: 'disposed' });
      if (pending) return pending;
      mode = options.mode === 'touch' || options.mode === 'keyboard' ? options.mode : mode;
      look = options.look === 'swipe' || options.look === 'stick' ? options.look : look;
      if (typeof options.motion === 'boolean') motion = options.motion;
      index = 0;
      pending = new Promise(resolve => { settle = resolve; });
      const result = pending;
      try { dialog.showModal(); render(); }
      catch (error) { finish('dismissed'); throw error; }
      return result;
    },
    hide() { finish('dismissed'); },
    get isOpen() { return dialog.open; },
    dispose() {
      if (disposed) return;
      disposed = true;
      finish('disposed');
      events.abort();
      host.remove();
      releaseFont();
    },
  };
}
