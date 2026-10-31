import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URL = '/art/room-presets/bedroom/bed-v1.glb';

// Own each load's resources so a late response cannot resurrect a disposed room.
export function attachGeneratedBed({ root, obstacle, resources, fallbackMeshes }) {
  let disposed = false;
  let model;
  const owned = new Set();
  function collect(object) {
    object.traverse(node => {
      if (!node.isMesh) return;
      owned.add(node.geometry);
      for (const material of [node.material].flat()) {
        owned.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) owned.add(value);
      }
    });
  }
  function release() {
    model?.removeFromParent();
    for (const resource of owned) resource.dispose();
    owned.clear();
  }
  resources.add({ dispose() { disposed = true; release(); } });
  const ready = new GLTFLoader().loadAsync(MODEL_URL).then(gltf => {
    model = gltf.scene;
    collect(model);
    if (disposed) { release(); return; }
    const bounds = new Box3().setFromObject(model);
    const size = bounds.getSize(new Vector3());
    if (![size.x, size.y, size.z].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid bed bounds');
    const width = obstacle.maxX - obstacle.minX;
    const depth = obstacle.maxZ - obstacle.minZ;
    // The exported bed is metre-scaled, headboard +Z. Fit only the existing footprint.
    model.scale.set(width / size.x, 1, depth / size.z);
    model.updateMatrixWorld(true);
    const fitted = new Box3().setFromObject(model);
    const center = fitted.getCenter(new Vector3());
    model.position.set((obstacle.minX + obstacle.maxX) / 2 - center.x,
      -fitted.min.y, (obstacle.minZ + obstacle.maxZ) / 2 - center.z);
    model.name = 'generated-bedroom-bed';
    model.userData.assetId = 'bed-v1';
    model.traverse(node => {
      if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
    });
    root.add(model);
    for (const mesh of fallbackMeshes) mesh.visible = false;
  }).catch(error => {
    release();
    if (!disposed) console.warn('Generated bed unavailable; keeping the original bed.', error);
  });
  return { ready };
}
