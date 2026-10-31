export const defaults = Object.freeze({ mode: 'auto', look: 'stick', leftStick: 'fixed', mouseSensitivity: 1,
  touchSensitivity: 1, musicVolume: .35, vhs: .35, motion: false, subtitleSize: 18, subtitleBackground: .75, quality: 'low' });
const choices = { mode: ['auto','keyboard','touch'], look: ['stick','swipe'], leftStick: ['fixed','floating'], quality: ['low','medium','high'] };
const ranges = { musicVolume: [0,1], mouseSensitivity: [.4,2], touchSensitivity: [.4,2], vhs: [0,1], subtitleSize: [16,26], subtitleBackground: [0,1] };
export function normalizeSettings(raw = {}) {
  const next = { ...defaults };
  if (!raw || typeof raw !== 'object') return next;
  for (const [key, values] of Object.entries(choices)) if (values.includes(raw[key])) next[key] = raw[key];
  for (const [key, [min,max]] of Object.entries(ranges)) if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) next[key] = Math.max(min,Math.min(max,raw[key]));
  if (typeof raw.motion === 'boolean') next.motion = raw.motion;
  return next;
}
export function loadSettings(storage) {
  try { return normalizeSettings(JSON.parse(storage.getItem('yog.ui.settings.v1'))); } catch { return { ...defaults }; }
}
export function saveSettings(storage, settings) {
  try { storage.setItem('yog.ui.settings.v1',JSON.stringify(normalizeSettings(settings))); return true; } catch { return false; }
}
export function resolveMode(settings, coarse = false) { return settings.mode === 'auto' ? (coarse ? 'touch' : 'keyboard') : settings.mode; }
