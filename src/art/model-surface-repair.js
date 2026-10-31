// User-reviewed repair for the older desk: recompute smooth normals while
// preserving indexed topology, UVs, textures, physical bounds and materials.
export function createModelSurfaceRepair(resources) {
  const repaired = new WeakMap();
  return (id, model) => {
    if (id !== 'furniture-writing-desk') return;
    model.traverse(node => {
      if (!node.isMesh || Array.isArray(node.material) || node.userData.surfaceNormalsRepaired) return;
      if (!repaired.has(node.geometry)) {
        // User selected the whole-model "recompute normals" comparison.
        // Keep the original indexed topology and material exactly as shown.
        const geometry = node.geometry.clone();
        geometry.computeVertexNormals();
        repaired.set(node.geometry,geometry); resources.add(geometry);
      }
      node.geometry = repaired.get(node.geometry); node.userData.surfaceNormalsRepaired = true;
    });
  };
}
