import * as THREE from 'three';

const profiles = new WeakMap();
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);

// Linear RGB light transmission, projected by the actual spotlight. Never sample
// scene brightness to find this edge: furniture must occlude it, not distort it.
export function createFlashlightProfile() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1);
      const core = 1 - smooth(.32, .69, r);
      const ring = Math.exp(-(((r - .67) / .075) ** 2));
      const spill = (1 - smooth(.68, 1, r)) * .13;
      const neutral = core * .85 + spill;
      const offset = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        const warm = [1, .72, .35][c];
        data[offset + c] = Math.round(255 * Math.min(1, neutral + ring * .27 * warm));
      }
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = 'Flashlight / neutral core, amber lens rim, soft spill';
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function applyFlashlightProfile(light) {
  let texture = profiles.get(light);
  if (!texture) {
    texture = createFlashlightProfile();
    profiles.set(light, texture);
    const dispose = () => {
      if (light.map === texture) light.map = null;
      texture.dispose();
      profiles.delete(light);
      light.removeEventListener('dispose', dispose);
    };
    light.addEventListener('dispose', dispose);
  }
  light.map = texture;
}
