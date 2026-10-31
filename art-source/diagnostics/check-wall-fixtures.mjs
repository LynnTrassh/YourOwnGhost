import assert from 'node:assert/strict';
import {Group, Mesh, BoxGeometry, MeshStandardMaterial, Box3, Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {generatePlan} from '../../src/planning/generate.js';
import {createDarkInteriors} from '../../src/art/dark-interiors.js';
import {createInteriorModelLoader} from '../../src/art/interior-models.js';
import {createWallDecorLayout, intersectsDecor} from '../../src/art/wall-decor-layout.js';

// Exercise the production placement and lifecycle with a controllable asset loader.
// Real GLB orientation and appearance are checked in wall-fixtures.html separately.
let failSconce = false;
GLTFLoader.prototype.loadAsync = async function(url) {
  if(failSconce && url.includes('lighting-wall-sconce')) throw new Error('Expected fixture load failure');
  const scene = new Group();
  const mesh = new Mesh(new BoxGeometry(.24,.4,.22),new MeshStandardMaterial());
  mesh.position.set(.2,.3,-.1);scene.add(mesh);
  return {scene};
};
const dispose = resources => {for(const r of resources)r.dispose?.();};
let rooms = 0, decorations = 0;
const orientations = new Set(), themes = new Set();
for(const seed of ['1844070019','1','42','89','211','756','1024','8848']) {
  const plan = generatePlan(seed), before=JSON.stringify(plan), root=new Group(), resources=new Set();
  const art=createDarkInteriors({plan,root,resources});
  for(const obstacle of plan.obstacles)art.furnish(obstacle,[]);
  art.dress();
  assert.equal(art.lights.keys.length,0,'No lights before their models load');
  await art.ready();root.updateMatrixWorld(true);
  assert.equal(art.stats.failed.length,0);
  for(const [i,p] of art.decor.placements.entries()) {
    decorations++;orientations.add(`${p.face.axis}${p.face.sign}`);
    assert(p.along-p.width/2>=p.face.start+.119 && p.along+p.width/2<=p.face.end-.119,'Fits wall with edge clearance');
    for(const q of art.decor.placements.slice(i+1))assert(!intersectsDecor(p.bounds,q.bounds,.119),'Decorations overlap');
    for(const o of plan.obstacles)assert(!intersectsDecor(p.bounds,{...o,minY:0,maxY:o.height??1.05},.119),'Decor overlaps furnishing');
  }
  for(const room of plan.rooms){rooms++;themes.add(art.theme(room.id));}
  for(const light of art.lights.keys) {
    assert(light.parent.userData.assetId.startsWith('lighting-'),'Light belongs to loaded fixture');
    assert.equal(light.target.parent,light.parent,'Target rotates with fixture');
    assert(new Box3().setFromObject(light.parent.children[0]).expandByScalar(.025).containsPoint(light.getWorldPosition(new Vector3())),'Emitter stays inside fitted lamp bounds');
  }
  // Light selection must use world positions, including a rotated/moved parent.
  const lamp=art.lights.keys[0], parent=lamp.parent;
  parent.position.x+=1000;parent.rotation.y+=Math.PI/2;
  const at=lamp.getWorldPosition(new Vector3());art.update(0,{x:at.x,z:at.z});
  assert(lamp.visible,'Transformed fixture is selected by its world position');
  assert.equal(JSON.stringify(plan),before,'Art must not modify gameplay plan');
  dispose(resources);
}
assert.equal(orientations.size,4);assert.equal(themes.size,6);

// No available wall area: skip the extra decoration instead of stacking it.
const face={axis:'X',sign:1,plane:0,start:0,end:1,roomId:'test'};
const tiny=createWallDecorLayout([face]);
assert(tiny.reserve({roomId:'test',width:.7,height:.8,y:1.5,kind:'picture'}));
assert.equal(tiny.reserve({roomId:'test',width:.3,height:.4,y:1.7,kind:'lamp'}),null);

// Failure must never create a detached glowing bulb or a lighting source.
failSconce=true;
const root=new Group(), resources=new Set(), plan=generatePlan('1844070019');
const art=createDarkInteriors({plan,root,resources});art.dress();
const originalWarn=console.warn;console.warn=()=>{};
try {await art.ready();} finally {console.warn=originalWarn;}
assert(art.stats.failed.includes('lighting-wall-sconce'));
root.traverse(node=>{if(node.userData.fixtureLight||node.name==='fixture-bulb')assert.notEqual(node.parent.userData.assetId,'lighting-wall-sconce');});
dispose(resources);

// A late async result after world disposal cannot attach a model or light.
failSconce=false;
const lateResources=new Set(), lateRoot=new Group(), models=createInteriorModelLoader(lateResources);
let called=false;
const late=models.attach('lighting-table-lamp',{parent:lateRoot,onReady:()=>{called=true;}});
dispose(lateResources);await late;assert.equal(called,false);assert.equal(lateRoot.children.length,0);
console.log(JSON.stringify({seeds:8,rooms,decorations,orientations:[...orientations],themes:[...themes],loadFailure:'passed',lateDisposal:'passed',transformedLights:'passed'}));
