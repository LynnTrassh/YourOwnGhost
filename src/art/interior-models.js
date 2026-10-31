import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { INTERIOR_ASSETS } from './interior-catalog.js';
import { bindCrtMonitor } from './crt-screen-playback.js';

// A world owns one cached resource set; instances share meshes and textures.
export function createInteriorModelLoader(resources) {
  const cache = new Map(), owned = new Set(), instances = new Set(), queue = [];
  const screenBindings = new Set();
  const stats = { requested: 0, loaded: 0, failed: [], pending: 0 };
  let disposed = false, active = 0;
  const loader = new GLTFLoader();
  function collect(scene) {
    scene.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = true; node.receiveShadow = true;
      owned.add(node.geometry);
      for (const material of [node.material].flat()) {
        owned.add(material);
        for (const item of Object.values(material)) if (item?.isTexture) owned.add(item);
      }
    });
  }
  function release() {
    for (const binding of screenBindings) binding.dispose();
    screenBindings.clear();
    for (const instance of instances) instance.removeFromParent();
    instances.clear();
    for (const item of owned) { item.dispose(); if (item.isTexture) item.image?.close?.(); }
    owned.clear();
  }
  function pump() {
    while (!disposed && active < 3 && queue.length) {
      const { id, resolve, reject } = queue.shift(); active++;
      loader.loadAsync(INTERIOR_ASSETS[id].url).then(gltf => {
        collect(gltf.scene);
        if (disposed) { release(); reject(new Error('World disposed')); return; }
        resolve(gltf.scene);
      }, reject).finally(() => { active--; pump(); });
    }
  }
  function source(id) {
    if (!INTERIOR_ASSETS[id]) return Promise.reject(new Error(`Unknown asset: ${id}`));
    if (!cache.has(id)) cache.set(id, new Promise((resolve, reject) => { queue.push({ id, resolve, reject }); pump(); }));
    return cache.get(id);
  }
  function attach(id, { parent, position = [0, 0, 0], yaw = 0, sourceYaw = 0, width, height, depth, fallback = [], onReady, screenPlayback = true } = {}) {
    stats.requested++; stats.pending++;
    const ready = source(id).then(template => {
      if (disposed) return null;
      const model = new Group(), group = new Group();
      const sourceModel = template.clone(true);
      sourceModel.rotation.y += sourceYaw;
      model.add(sourceModel);
      const size = new Box3().setFromObject(model).getSize(new Vector3());
      if (![size.x, size.y, size.z].every(n => Number.isFinite(n) && n > 0)) throw new Error(`Invalid bounds: ${id}`);
      model.scale.set((width ?? size.x) / size.x, (height ?? size.y) / size.y, (depth ?? size.z) / size.z);
      model.updateMatrixWorld(true);
      const bounds = new Box3().setFromObject(model), center = bounds.getCenter(new Vector3());
      model.position.sub(new Vector3(center.x, bounds.min.y, center.z));
      group.add(model); group.position.set(...position); group.rotation.y = yaw;
      group.name = id; group.userData.assetId = id;
      parent.add(group); instances.add(group);
      if (screenPlayback && ['prop-crt-computer-v01','prop-computer-desk-v01'].includes(id)) {
        const binding=bindCrtMonitor(group,screenPlayback===true?{}:{playback:screenPlayback});
        screenBindings.add(binding);group.userData.crtScreenBinding=binding;
      }
      for (const mesh of fallback) mesh.visible = false;
      stats.loaded++; onReady?.(group); return group;
    }).catch(error => {
      if (!disposed) { stats.failed.push(id); console.warn(`Interior asset unavailable: ${id}; preserving fallback`, error); }
      return null;
    }).finally(() => { stats.pending--; });
    return ready;
  }
  resources.add({ dispose() {
    disposed = true;
    for (const item of queue.splice(0)) item.reject(new Error('World disposed'));
    release(); cache.clear();
  } });
  return { attach, stats };
}
