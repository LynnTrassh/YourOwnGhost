// Device-independent state: no scene, collision or story mutation here.
export function stickVector(x, y, radius = 48, deadZone = 0.15) {
  const distance = Math.hypot(x, y);
  const amount = Math.min(distance / radius, 1);
  if (!distance || amount <= deadZone) return { x: 0, y: 0 };
  const strength = (amount - deadZone) / (1 - deadZone);
  return { x: x / distance * strength, y: y / distance * strength };
}
export function createControlState() {
  const keys = new Set(), pointers = new Map();
  let delta = { x: 0, y: 0 };
  return {
    keys, pointers,
    claim(id, role) {
      if (pointers.has(id) || [...pointers.values()].some(p => p.role === role)) return false;
      pointers.set(id, { role, x: 0, y: 0 }); return true;
    },
    update(id, vector) { if (pointers.has(id)) Object.assign(pointers.get(id), vector); },
    release(id) { pointers.delete(id); },
    look(x, y) { delta.x += x; delta.y += y; },
    clear() { keys.clear(); pointers.clear(); delta = { x: 0, y: 0 }; },
    sample(dt, { mouseSensitivity = 1, touchSensitivity = 1 } = {}) {
      const move = [...pointers.values()].find(p => p.role === 'move') ?? { x: 0, y: 0 };
      const look = [...pointers.values()].find(p => p.role === 'look') ?? { x: 0, y: 0 };
      let right = Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + move.x;
      let forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS')) - move.y;
      const length = Math.max(1, Math.hypot(right, forward));
      right /= length; forward /= length;
      const result = { right, forward,
        yaw: -delta.x * .002 * mouseSensitivity - look.x * 150 * Math.PI / 180 * dt * touchSensitivity,
        pitch: -delta.y * .002 * mouseSensitivity - look.y * 100 * Math.PI / 180 * dt * touchSensitivity };
      result.yaw ||= 0; result.pitch ||= 0;
      delta = { x: 0, y: 0 }; return result;
    }
  };
}
