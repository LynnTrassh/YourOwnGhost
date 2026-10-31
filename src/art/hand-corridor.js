import * as THREE from 'three';

const vector=value=>new THREE.Vector3(...value);
const box=value=>new THREE.Box3(new THREE.Vector3(value.minX,value.minY??0,value.minZ),new THREE.Vector3(value.maxX,value.maxY??value.height??3,value.maxZ));

/** Static art only. Caller supplies authored placements, actual mount faces and
 * protected volumes in parent-local metres; sourceModel's rear-cap pivot is 0,
 * forward -Z. Source geometry/material/texture remain owned by the loader.
 * Rejects an entire variant if any placement violates its safety contract.
 */
export function createHandCorridor({parent,sourceModel,variants,protectedVolumes=[],ceiling=3}) {
  if(!parent?.isObject3D||!sourceModel?.isObject3D)throw new Error('Parent and static source model required');
  sourceModel.updateMatrixWorld(true);
  const sources=[];sourceModel.traverse(node=>{if(node.isMesh)sources.push(node);});
  if(sources.length!==1||sources[0].isSkinnedMesh||Array.isArray(sources[0].material))throw new Error('One static mesh/material required');
  const source=sources[0],local=source.matrixWorld.clone();
  source.geometry.computeBoundingBox();
  const sourceBounds=source.geometry.boundingBox.clone();
  const protectedBoxes=protectedVolumes.map(v=>({box:box(v),id:v.id??'protected'}));
  const compiled=new Map(),stats={version:2,variants:{},additionalLights:0,colliders:0};
  for(const [id,anchors] of Object.entries(variants)) {
    if(!anchors.length||anchors.length>24)throw new Error('Hand budget is 1–24 per variant');
    const matrices=[],bounds=[],errors=[];
    for(const anchor of anchors) {
      const {position,direction,scale=1,roll=0,mount}=anchor;
      if(!position?.every(Number.isFinite)||position.length!==3||!direction?.every(Number.isFinite)||direction.length!==3
        ||!Number.isFinite(scale)||scale<=0||scale>1.2||!Number.isFinite(roll)||!mount||!['X','Z'].includes(mount.axis))throw new Error('Invalid hand anchor');
      const forward=vector(direction);if(forward.lengthSq()<.01)throw new Error('Hand direction required');forward.normalize();
      const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1),forward);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,-1),roll));
      const matrix=new THREE.Matrix4().compose(vector(position),q,new THREE.Vector3(scale,scale,scale)).multiply(local);
      const b=sourceBounds.clone().applyMatrix4(matrix),axis=mount.axis==='X'?'x':'z',along=axis==='x'?'z':'x';
      const inset=(position[axis==='x'?0:2]-mount.plane)*mount.sign;
      if(inset>-.02||inset<-.16||forward[axis]*mount.sign<.8)errors.push(`${anchor.id}:mount-direction-or-inset`);
      if(b.min[along]<mount.start||b.max[along]>mount.end||b.min.y<.2||b.max.y>ceiling-.08)errors.push(`${anchor.id}:outside-mount-band`);
      for(const protectedBox of protectedBoxes)if(b.intersectsBox(protectedBox.box))errors.push(`${anchor.id}:${protectedBox.id}`);
      if(bounds.some(other=>b.intersectsBox(other)))errors.push(`${anchor.id}:hand-overlap`);
      matrices.push(matrix);bounds.push(b);
    }
    stats.variants[id]={count:anchors.length,triangles:(source.geometry.index?.count??source.geometry.attributes.position.count)/3*anchors.length,
      errors,clusters:anchors.reduce((r,a)=>{r[a.cluster]=(r[a.cluster]??0)+1;return r;},{}),bounds:bounds.map(b=>({min:b.min.toArray(),max:b.max.toArray()}))};
    compiled.set(id,{matrices,bounds,errors});
  }
  const capacity=Math.max(...[...compiled.values()].map(v=>v.matrices.length));
  if(!Number.isFinite(capacity))throw new Error('At least one hand variant required');
  const mesh=new THREE.InstancedMesh(source.geometry,source.material,capacity);mesh.name='horror-hand-corridor-v2';mesh.visible=false;
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
  let current='baseline',disposed=false;
  function setVariant(id){
    if(disposed)throw new Error('Hand corridor disposed');
    if(id==='baseline'){mesh.visible=false;current=id;return true;}
    const variant=compiled.get(id);if(!variant)throw new Error(`Unknown hand variant: ${id}`);
    if(variant.errors.length){mesh.visible=false;current='baseline';return false;}
    mesh.count=variant.matrices.length;variant.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.visible=true;current=id;return true;
  }
  return {setVariant,inspect:()=>({...stats,current,disposed,drawObjects:1}),
    dispose(){if(disposed)return;parent.remove(mesh);mesh.dispose();disposed=true;}};
}
