import { Mesh, Matrix4 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Only consume purpose-created, immutable wall trim groups. Furniture and
// story/interactive objects retain their own transforms and visibility.
export function batchStaticInteriorGroups(groups, parent, resources) {
  const buckets = new Map(), inverse = new Matrix4();
  parent.updateWorldMatrix(true, true);
  inverse.copy(parent.matrixWorld).invert();
  let before = 0, after = 0;
  for (const {group, roomId} of groups) {
    group.traverse(node => {
      if (!node.isMesh || Array.isArray(node.material)) return;
      const key = `${roomId}:${node.material.uuid}:${node.castShadow}:${node.receiveShadow}`;
      if (!buckets.has(key)) buckets.set(key, {roomId,material:node.material,castShadow:node.castShadow,receiveShadow:node.receiveShadow,nodes:[]});
      buckets.get(key).nodes.push(node); before++;
    });
  }
  for (const bucket of buckets.values()) {
    const geometries = bucket.nodes.map(node => node.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(inverse,node.matrixWorld)));
    const geometry = mergeGeometries(geometries,false);
    for (const temporary of geometries) temporary.dispose();
    if (!geometry) { after += bucket.nodes.length; continue; }
    resources.add(geometry);geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const merged = new Mesh(geometry,bucket.material);
    merged.name = `wall-trim-batch-${bucket.roomId}`;
    merged.userData.roomId = bucket.roomId;
    merged.castShadow = bucket.castShadow; merged.receiveShadow = bucket.receiveShadow;
    parent.add(merged);after++;
    for (const node of bucket.nodes) {
      node.removeFromParent();resources.delete(node.geometry);node.geometry.dispose();
    }
  }
  for (const {group} of groups) if (!group.children.length) group.removeFromParent();
  return {before,after};
}
