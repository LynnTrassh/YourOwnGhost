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

// Boundary surfaces arrive as one geometry with a separate material group for
// every quad. Reorder opaque indices into material runs, preserving every
// vertex, triangle winding, material index and resource owner.
export function compactOpaqueMaterialGroups(root) {
  const handled = new Set();let before=0,after=0;
  root.traverse(mesh => {
    const geometry=mesh.geometry, materials=mesh.material;
    if (!mesh.isMesh || !geometry?.index || !Array.isArray(materials) || handled.has(geometry)) return;
    if (materials.some(m=>!m || m.transparent || m.depthWrite===false) || geometry.groups.length<=materials.length) return;
    if (geometry.drawRange.start!==0 || geometry.drawRange.count!==Infinity) return;
    // Require a complete partition; overlapping or partial custom groups are
    // not safe to compact through this generic rendering-only path.
    const ordered=[...geometry.groups].sort((a,b)=>a.start-b.start);
    let end=0;
    for (const group of ordered) {
      if (group.start!==end || group.count%3 || !materials[group.materialIndex]) return;
      end+=group.count;
    }
    if (end!==geometry.index.count) return;
    handled.add(geometry);before+=ordered.length;
    const buckets=new Map();
    for (const group of ordered) {
      if(!buckets.has(group.materialIndex))buckets.set(group.materialIndex,[]);
      buckets.get(group.materialIndex).push(group);
    }
    const previous=geometry.index.array, index=new previous.constructor(previous.length);
    let offset=0;geometry.clearGroups();
    for (const [materialIndex,groups] of buckets) {
      const start=offset;
      for (const group of groups) { index.set(previous.subarray(group.start,group.start+group.count),offset);offset+=group.count; }
      geometry.addGroup(start,offset-start,materialIndex);
    }
    geometry.index.array=index;geometry.index.needsUpdate=true;after+=geometry.groups.length;
  });
  return {before,after};
}
