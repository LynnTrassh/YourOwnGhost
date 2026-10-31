import assert from 'node:assert/strict';
import {Group,Box3,Vector3,MeshStandardMaterial,Mesh,BoxGeometry} from 'three';
import {createRoomDetailDressing,findTableSupport} from '../../src/art/room-detail-dressing.js';
import {createSurfaceDetailMaterials} from '../../src/art/surface-detail-materials.js';
import {INTERIOR_ASSETS} from '../../src/art/interior-catalog.js';

const pairs={bedroom:['nightstand','dresser'],parlor:['low-table'],nursery:['small-table','toy-chest'],clinic:['instrument-cart'],archive:['writing-desk','copy-table'],shrine:['offering-table']};
let clusters=0,draws=0;
for(const [theme,prefabs] of Object.entries(pairs))for(const prefab of prefabs)for(let turn=0;turn<4;turn++) {
  const asset=Object.values(INTERIOR_ASSETS).find(a=>a.prefabId===prefab);
  const plan={cellSize:5/3,rooms:[{id:'room',center:[0,0],cells:[[0,0],[0,-1],[0,1]],interior:{presetId:theme,type:'island'}}]};
  const before=JSON.stringify(plan),root=new Group(),resources=new Set(),anchor=new Group();
  anchor.position.set(8,0,-7);anchor.rotation.y=turn*Math.PI/2;root.add(anchor);
  const details=createRoomDetailDressing({plan,root,resources});
  const obstacle={id:'table',roomId:'room',prefabId:prefab,height:1};
  details.furnish({anchor,obstacle,width:1.28,depth:.68,height:asset.height});details.dress();
  root.updateMatrixWorld(true);
  let found;
  root.traverse(node=>{if(node.userData.roomDetail?.kind==='tabletop')found=node;});
  assert(found,`Missing ${theme}/${prefab}`);
  const inverse=anchor.matrixWorld.clone().invert();
  for(const mesh of found.children) {
    assert(mesh.isMesh);assert(mesh.geometry.getAttribute('uv'));
    const b=new Box3().setFromObject(mesh),local=new Box3();
    for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])local.expandByPoint(new Vector3(x,y,z).applyMatrix4(inverse));
    assert(local.min.x>=-.64-.001 && local.max.x<=.64+.001,`${prefab} exceeds width`);
    assert(local.min.z>=-.34-.001 && local.max.z<=.34+.001,`${prefab} exceeds depth`);
    assert(local.min.y>=asset.height && local.max.y<=1,`${prefab} exceeds reserved height: ${local.max.y}`);
  }
  assert(found.children.length<=4,'Small props must be merged by material');
  assert.equal(details.stats.rugs,theme==='clinic'?0:1);
  assert.equal(JSON.stringify(plan),before);
  clusters+=details.stats.clusters;draws+=details.stats.draws;
  for(const resource of resources)resource.dispose?.();
  assert.equal(anchor.children.length,0,'Furniture detail nodes are detached on dispose');
}
const resources=new Set(),micro=createSurfaceDetailMaterials({resources}),a=new MeshStandardMaterial(),b=new MeshStandardMaterial();
micro.apply(a,'floor-walnut-planks');micro.apply(b,'detail-wood');
assert.equal(a.bumpMap,b.bumpMap,'Microtextures shared within one surface manager');
assert.equal(a.bumpMap,a.roughnessMap,'Height and roughness share packed data texture');
assert.equal(a.bumpMap.image.width,128);
const imageMaterial=new MeshStandardMaterial();micro.apply(imageMaterial,'art-misaligned-portrait');assert.equal(imageMaterial.bumpMap,null);
for(const resource of resources)resource.dispose?.();
const anchor=new Group(),model=new Group(),testMaterial=new MeshStandardMaterial();
anchor.position.set(23,0,-17);anchor.rotation.y=Math.PI/2;anchor.add(model);
const top=new Mesh(new BoxGeometry(1.28,.7,.68),testMaterial);top.position.y=.35;model.add(top);
const clutter=new Mesh(new BoxGeometry(.18,.4,.15),testMaterial);clutter.position.set(-.4,.9,0);model.add(clutter);
const support=findTableSupport({model,anchor,width:1.28,depth:.68,height:1.1,scale:.8});
assert(support);assert(Math.abs(support.y-.7)<1e-6,'Use actual table, not top of attached clutter');
const rim=new Mesh(new BoxGeometry(.006,.04,.68),testMaterial);rim.position.set(1.28*.22+.04,.72,0);model.add(rim);
assert.equal(findTableSupport({model,anchor,width:1.28,depth:.68,height:1.1,scale:.8,x:1.28*.22,factors:[1]}),null,'Reject narrow raised rims between support samples');
model.remove(rim);rim.geometry.dispose();
top.rotation.z=.3;clutter.visible=false;model.remove(clutter);
assert.equal(findTableSupport({model,anchor,width:1.28,depth:.68,height:1.1,scale:.8}),null,'Reject sloping/non-continuous surfaces');
top.geometry.dispose();clutter.geometry.dispose();testMaterial.dispose();
console.log(JSON.stringify({themes:6,furnishingVariants:9,orientations:4,clusters,draws,bounds:'passed',disposal:'passed',materialSharing:'passed',actualSupport:'passed'}));
