import * as THREE from 'three';
import {createEdgeGrainCamera, EDGE_GRAIN_DEFAULTS} from './camera-edge-grain.js';

// Keep the existing game/settings interface. Replace the old grain and tiny
// horizontal offset rather than stacking two camera effects.
export function createVhsEffect(renderer, scene, camera) {
  const cameraEffect = createEdgeGrainCamera(renderer, scene, camera);
  let intensity = .62;
  function setIntensity(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    intensity = THREE.MathUtils.clamp(numeric, 0, 1);
    // .62 is the original game slider reference and matches the approved preview.
    const strength = intensity / .62;
    cameraEffect.configure({
      grain: EDGE_GRAIN_DEFAULTS.grain * strength,
      edgePixels: EDGE_GRAIN_DEFAULTS.edgePixels * strength,
    });
  }
  setIntensity(intensity);
  return {
    render: cameraEffect.render,
    resize: cameraEffect.resize,
    setIntensity,
    // Retained for existing callers: screen-edge separation is independent
    // of the flashlight; luminance already protects bright beam detail.
    setFlashlight() {},
    inspect: () => ({intensity, ...cameraEffect.inspect()}),
    dispose: cameraEffect.dispose,
  };
}
