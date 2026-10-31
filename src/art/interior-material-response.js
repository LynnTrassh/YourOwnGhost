// Conservative correction for the original v03 furniture, whose wood-dominant
// atlas was exported with constant roughness .9. Authored PBR maps take precedence.
const woodAssets = new Set([
  'furniture-writing-desk','furniture-nightstand','furniture-dresser',
  'furniture-wardrobe','furniture-bookcase','furniture-coffee-table',
  'furniture-shrine-cabinet','furniture-offering-table','furniture-toy-chest',
]);
const profiles = new WeakMap();
export function prepareInteriorMaterialResponse(model, assetId, url) {
  if (!url.startsWith('/art/room-presets/v03/') || !woodAssets.has(assetId)) return;
  model.traverse(node => {
    if (!node.isMesh) return;
    for (const material of [node.material].flat()) {
      if (!material?.isMeshStandardMaterial || profiles.has(material) || material.roughnessMap || material.metalnessMap
        || material.transparent || material.metalness > .05 || material.roughness < .88) continue;
      const original = material.roughness;
      // Single-atlas assets also include small accessories: keep this restrained.
      const target = assetId === 'furniture-writing-desk' ? .8 : .78;
      profiles.set(material,{original,target});
      material.roughness=target;
    }
  });
}
export function setInteriorMaterialResponse(scene, enabled) {
  const seen=new Set();let changed=0;
  scene.traverse(node=>{
    if(!node.isMesh)return;
    for(const material of [node.material].flat()){
      const profile=profiles.get(material);if(!profile||seen.has(material))continue;
      seen.add(material);material.roughness=enabled?profile.target:profile.original;changed++;
    }
  });
  return changed;
}
