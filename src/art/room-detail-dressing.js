import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createSurfaceDetailMaterials} from './surface-detail-materials.js';

const PALETTES = {
  bedroom: [0x4b3026,0xd1bfa0,0x52665c,0x9f7b45],
  parlor: [0x382b26,0xd8c9ad,0x663c35,0xa4824d],
  nursery: [0x66503c,0xd8c7aa,0x7f6266,0x96805b],
  clinic: [0x40362c,0xc9cbb9,0x536e62,0x9ba5a0],
  archive: [0x423126,0xc3b394,0x425961,0x907b52],
  shrine: [0x3d2824,0xd2bea0,0x6b3531,0xa78b51],
};
const TABLES = new Set(['nightstand','dresser','low-table','small-table','instrument-cart','writing-desk','copy-table','offering-table','toy-chest']);

// Generated GLBs may include books, raised rims, or a desk organizer. Their
// maximum Y is not the tabletop. Require a continuous, near-horizontal patch.
export function findTableSupport({model,anchor,width,depth,height,scale,x:preferredX,factors=[1,.72,.52]}) {
  if(!model)return {x:preferredX??width*.22,z:0,y:height,scale};
  anchor.updateWorldMatrix(true,true);
  model.updateWorldMatrix(true,true);
  const inverse=anchor.matrixWorld.clone().invert(), quaternion=anchor.getWorldQuaternion(new THREE.Quaternion());
  const down=new THREE.Vector3(0,-1,0).applyQuaternion(quaternion),up=down.clone().negate();
  const ray=new THREE.Raycaster(),normalMatrix=new THREE.Matrix3(),normal=new THREE.Vector3();
  const triangles=[],point=new THREE.Vector3();
  model.traverse(node=>{
    if(!node.isMesh)return;
    const positions=node.geometry.getAttribute('position'),index=node.geometry.index;
    const matrix=new THREE.Matrix4().multiplyMatrices(inverse,node.matrixWorld);
    const transformed=new Float32Array(positions.count*3);
    for(let i=0;i<positions.count;i++)point.fromBufferAttribute(positions,i).applyMatrix4(matrix).toArray(transformed,i*3);
    const count=index?index.count:positions.count,bounds=new Float32Array(count/3*5);
    for(let i=0;i<count;i+=3) {
      let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,maxY=-Infinity;
      for(let j=0;j<3;j++) {
        const offset=(index?index.getX(i+j):i+j)*3;
        minX=Math.min(minX,transformed[offset]);maxX=Math.max(maxX,transformed[offset]);
        minZ=Math.min(minZ,transformed[offset+2]);maxZ=Math.max(maxZ,transformed[offset+2]);maxY=Math.max(maxY,transformed[offset+1]);
      }
      bounds.set([minX,maxX,minZ,maxZ,maxY],i/3*5);
    }
    triangles.push(bounds);
  });
  function hasRaisedGeometry(x,z,halfW,halfD,y) {
    // A hollow bowl can look flat to downward samples; its narrow rim still
    // intersects a book. Reject triangle bounds crossing the patch as well.
    for(const bounds of triangles)for(let i=0;i<bounds.length;i+=5) {
      if(bounds[i]<x+halfW && bounds[i+1]>x-halfW && bounds[i+2]<z+halfD && bounds[i+3]>z-halfD && bounds[i+4]>y+.014)return true;
    }
    return false;
  }
  for(const factor of factors) {
    const size=scale*factor,halfW=.225*size,halfD=.19*size;
    for(const x of preferredX===undefined?[width*.22,width*.08]:[preferredX])for(const z of [0,-depth*.23,depth*.23]) {
      if(Math.abs(x)+halfW>width/2-.012||Math.abs(z)+halfD>depth/2-.012)continue;
      const levels=[];
      for(const dx of [-halfW,-halfW/2,0,halfW/2,halfW])for(const dz of [-halfD,-halfD/2,0,halfD/2,halfD]) {
        const from=anchor.localToWorld(new THREE.Vector3(x+dx,height+.3,z+dz));
        ray.set(from,down);ray.far=height+.4;
        const hit=ray.intersectObject(model,true)[0];
        if(!hit?.face)continue;
        normalMatrix.getNormalMatrix(hit.object.matrixWorld);
        normal.copy(hit.face.normal).applyNormalMatrix(normalMatrix);
        if(normal.dot(up)<.8)continue;
        const y=hit.point.clone().applyMatrix4(inverse).y;
        if(y<height*.53)continue;
        levels.push(y);
      }
      if(levels.length!==25||Math.max(...levels)-Math.min(...levels)>.012)continue;
      const y=Math.max(...levels);
      if(hasRaisedGeometry(x,z,halfW,halfD,y))continue;
      return {x,z,y,scale:size};
    }
  }
  return null;
}

// All pieces are visual dressing inside existing furnishing AABBs. No new
// floor obstacle, gameplay state, layout RNG, or per-frame animation is added.
export function createRoomDetailDressing({plan,root,resources}) {
  const palettes=new Map(), ownedGroups=new Set(), micro=createSurfaceDetailMaterials({resources});
  const roomById=new Map(plan.rooms.map(r=>[r.id,r]));
  const stats={furnished:0,clusters:0,rugs:0,draws:0,skippedClutter:0};
  let disposed=false;
  resources.add({dispose(){disposed=true;for(const group of ownedGroups)group.removeFromParent();ownedGroups.clear();}});
  const own = value => {resources.add(value);return value;};
  function palette(theme) {
    if(palettes.has(theme))return palettes.get(theme);
    const colors=PALETTES[theme]??PALETTES.bedroom;
    const values=colors.map((color,i)=>own(new THREE.MeshStandardMaterial({color,roughness:i===3?.42:i===2?.64:.82,metalness:i===3?.65:0})));
    micro.apply(values[0],'detail-wood');
    palettes.set(theme,values);return values;
  }
  function batch(parent,materials) {
    const parts=materials.map(()=>[]), transform=new THREE.Object3D();
    function add(geometry,material,position=[0,0,0],rotation=[0,0,0]) {
      transform.position.set(...position);transform.rotation.set(...rotation);transform.scale.set(1,1,1);transform.updateMatrix();
      const buffer=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.dispose();
      buffer.applyMatrix4(transform.matrix);parts[material].push(buffer);
    }
    const box=(w,h,d,x,y,z,mat=0,angle=0)=>add(new RoundedBoxGeometry(w,h,d,1,Math.min(w,h,d)*.12),mat,[x,y,z],[0,angle,0]);
    const cylinder=(top,bottom,h,x,y,z,mat=0)=>add(new THREE.CylinderGeometry(top,bottom,h,16),mat,[x,y,z]);
    function finish() {
      for(const [i,list] of parts.entries()) {
        if(!list.length)continue;
        const geometry=own(mergeGeometries(list));for(const part of list)part.dispose();
        geometry.computeBoundingSphere();
        const mesh=new THREE.Mesh(geometry,materials[i]);mesh.castShadow=false;mesh.receiveShadow=true;parent.add(mesh);stats.draws++;
      }
    }
    return {add,box,cylinder,finish};
  }
  function book(b,x,z,y=0,angle=0,cover=2) {
    b.box(.18,.005,.125,x,y+.003,z,cover,angle);
    b.box(.17,.022,.116,x,y+.017,z,1,angle);
    b.box(.18,.005,.125,x,y+.031,z,cover,angle);
    // Spine and narrow foil band distinguish the binding from a plain box.
    b.box(.007,.029,.125,x-.086*Math.cos(angle),y+.017,z+.086*Math.sin(angle),cover,angle);
    b.box(.125,.001,.003,x,y+.034,z-.043,3,angle);
  }
  function papers(b,x,z,y=0) {
    for(let i=0;i<4;i++)b.box(.2,.0018,.145,x+i*.001,y+.002+i*.002,z-i*.002,1,(i-1)*.025);
    for(let i=0;i<6;i++)b.box(.112-(i%3)*.012,.0006,.0012,x-.015,y+.010,z-.043+i*.012,0);
    b.box(.025,.001,.021,x+.06,y+.010,z+.045,2);
  }
  function cup(b,x,z) {
    b.cylinder(.055,.05,.005,x,.003,z,1);
    const profile=[[.019,0],[.026,.005],[.031,.054],[.03,.064],[.026,.064],[.025,.054],[.019,.012]].map(p=>new THREE.Vector2(...p));
    b.add(new THREE.LatheGeometry(profile,20),1,[x,.006,z]);
    b.cylinder(.025,.025,.001,x,.059,z,0);
    b.add(new THREE.TorusGeometry(.018,.0035,6,14),1,[x+.034,.041,z]);
  }
  function bottle(b,x,z,height=.1,mat=2) {
    b.cylinder(.019,.021,height*.73,x,height*.365,z,mat);
    b.cylinder(.01,.019,height*.12,x,height*.79,z,mat);
    b.cylinder(.01,.01,height*.15,x,height*.925,z,3);
    b.box(.024,height*.27,.002,x,height*.4,z+.020,1);
  }
  function tabletop(item) {
    const {anchor,obstacle,width,depth,height}=item, prefab=obstacle.prefabId;
    if(!TABLES.has(prefab))return;
    const clearance=(obstacle.height??height)-height-.015;
    if(clearance<.04)return;
    const theme=roomById.get(obstacle.roomId)?.interior?.presetId??'bedroom';
    const scale=Math.min(width*.45/.5,depth*.72/.4,1);
    const support=findTableSupport({...item,scale,...(prefab==='low-table'?{x:-width*.22}:{})});
    if(!support){stats.skippedClutter++;return;}
    support.scale=Math.min(support.scale,((obstacle.height??height)-support.y-.015)/.19);
    const group=new THREE.Group();group.name=`room-detail-${prefab}`;
    // Keep lamp tables on the opposite side; coffee tables avoid their bowl.
    group.position.set(support.x,support.y+.003,support.z);
    group.scale.setScalar(support.scale);anchor.add(group);ownedGroups.add(group);
    group.userData.roomDetail={roomId:obstacle.roomId,prefab,kind:'tabletop',obstacleId:obstacle.id,supportHeight:support.y};
    const b=batch(group,palette(theme));
    if(theme==='clinic') {
      b.box(.32,.008,.21,0,.004,0,3);
      for(const z of [-.103,.103])b.box(.32,.017,.005,0,.014,z,3);
      for(const x of [-.158,.158])b.box(.005,.017,.20,x,.014,0,3);
      bottle(b,-.09,-.025,.12);bottle(b,-.025,-.025,.087,1);
      b.box(.105,.006,.06,.085,.017,.028,1);
      b.box(.065,.004,.006,.085,.024,-.025,3,.2);
    } else if(theme==='nursery') {
      book(b,-.075,.04,0,-.12);
      const blocks=[[-.08,-.105],[.0,-.10],[.065,-.095]];
      blocks.forEach(([x,z],i)=>{b.box(.045,.045,.045,x,.023,z,i%2?0:2,i*.15);b.box(.027,.001,.027,x,.046,z,1);});
      b.cylinder(.045,.045,.012,.125,.006,.07,0);
      b.cylinder(.006,.006,.105,.125,.058,.07,0);
      for(let i=0;i<3;i++)b.add(new THREE.TorusGeometry(.027-i*.005,.007,6,16),i%2?1:2,[.125,.025+i*.018,.07],[Math.PI/2,0,0]);
    } else if(theme==='shrine') {
      for(const [x,h] of [[-.12,.14],[-.045,.105]]) {
        b.cylinder(.027,.032,.012,x,.006,-.035,3);b.cylinder(.008,.012,.025,x,.025,-.035,3);
        b.cylinder(.013,.014,h,x,.037+h/2,-.035,1);b.cylinder(.0013,.0013,.008,x,.041+h,-.035,0);
      }
      b.cylinder(.061,.047,.017,.1,.009,.04,3);
      b.cylinder(.053,.053,.002,.1,.018,.04,0);
      b.box(.085,.008,.075,.1,.023,-.09,2,-.1);
    } else if(theme==='archive') {
      papers(b,-.07,.055);
      b.box(.19,.014,.145,.06,.009,-.055,2,.08);
      b.box(.005,.001,.15,.06,.017,-.055,1,.08);
      b.box(.025,.09,.035,.16,.045,.09,3);
      for(let i=0;i<3;i++)b.cylinder(.002,.002,.11,.153+i*.006,.096,.09,0);
      b.box(.13,.004,.004,-.05,.017,.14,0,.13);
    } else {
      book(b,-.07,.045,0,-.08);
      if(prefab==='dresser'||theme==='parlor')book(b,-.058,.043,.035,.06,0);
      cup(b,.13,-.05);
      b.box(.065,.002,.004,.135,.007,.065,3,-.15);
      if(prefab==='nightstand')papers(b,-.07,-.105);
    }
    b.finish();stats.clusters++;
  }
  const shadowData=new Uint8Array(64*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++) {
    const edge=Math.max(Math.abs((x-31.5)/31.5),Math.abs((y-31.5)/31.5));
    const i=(y*64+x)*4;shadowData[i]=shadowData[i+1]=shadowData[i+2]=255;
    shadowData[i+3]=Math.round((1-THREE.MathUtils.smoothstep(edge,.48,1))*.8*255);
  }
  const shadowTexture=own(new THREE.DataTexture(shadowData,64,64,THREE.RGBAFormat));
  shadowTexture.magFilter=THREE.LinearFilter;shadowTexture.needsUpdate=true;
  const shadowMaterial=own(new THREE.MeshBasicMaterial({map:shadowTexture,color:0x130f0c,transparent:true,opacity:.3,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  const plane=own(new THREE.PlaneGeometry(1,1));
  function furnish(item) {
    if(disposed)return;
    const detailRoot=new THREE.Group(), lod=new THREE.LOD();
    detailRoot.name='furnishing-details';
    lod.addLevel(detailRoot,0);lod.addLevel(new THREE.Group(),24,.1);
    item.anchor.add(lod);ownedGroups.add(lod);
    const shadow=new THREE.Mesh(plane,shadowMaterial);shadow.name='furniture-contact-shadow';
    shadow.rotation.x=-Math.PI/2;shadow.scale.set(item.width*.98,item.depth*.98,1);shadow.position.y=.004;
    detailRoot.add(shadow);stats.furnished++;
    tabletop({...item,anchor:detailRoot});
  }
  function rugTexture(theme) {
    const size=128, data=new Uint8Array(size*size*4);
    const colors=PALETTES[theme], background=new THREE.Color(colors[2]), cream=new THREE.Color(colors[1]), dark=new THREE.Color(colors[0]);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
      const u=(x+.5)/size,v=(y+.5)/size,edge=Math.min(u,1-u,v,1-v);
      const border=edge>.025&&edge<.055||edge>.105&&edge<.12;
      const diamond=(Math.abs(u-.5)+Math.abs(v-.5)*.7);
      const motif=Math.abs(diamond-.24)<.014||Math.abs(diamond-.32)<.009;
      const small=((Math.floor(u*14)+Math.floor(v*18))%2===0)&&edge>.06&&edge<.09;
      const color=border||motif||small?cream:edge<.025?dark:background;
      const weave=.82+.09*Math.sin(x*Math.PI/2)+.06*Math.cos(y*Math.PI/2);
      const i=(y*size+x)*4;
      data[i]=Math.round(color.r*weave*255);data[i+1]=Math.round(color.g*weave*255);data[i+2]=Math.round(color.b*weave*255);data[i+3]=255;
    }
    const texture=own(new THREE.DataTexture(data,size,size,THREE.RGBAFormat));texture.magFilter=THREE.LinearFilter;
    texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
  }
  const rugs=new Map();
  function dress() {
    if(disposed)return;
    for(const room of plan.rooms) {
      const theme=room.interior?.presetId??'bedroom';
      // Preserve intentionally empty rooms and the clinic's cleanable tile floor.
      if(theme==='clinic'||room.interior?.type==='empty')continue;
      const cells=new Set(room.cells.map(([x,z])=>`${x},${z}`));
      const [cx,cz]=room.center;
      if(!cells.has(`${cx},${cz}`))continue;
      const long=cells.has(`${cx},${cz-1}`)&&cells.has(`${cx},${cz+1}`);
      if(!rugs.has(theme)) {
        const material=own(new THREE.MeshStandardMaterial({map:rugTexture(theme),roughness:1,color:0xbdb7a5,polygonOffset:true,polygonOffsetFactor:-1}));
        micro.apply(material,'detail-fabric');rugs.set(theme,material);
      }
      const rug=new THREE.Mesh(plane,rugs.get(theme));rug.name=`room-rug-${theme}`;
      rug.position.set(cx*plan.cellSize,.009,cz*plan.cellSize);rug.rotation.x=-Math.PI/2;
      rug.scale.set(plan.cellSize*.82,plan.cellSize*(long?1.65:.82),1);rug.receiveShadow=true;
      rug.userData.roomDetail={roomId:room.id,kind:'rug'};root.add(rug);ownedGroups.add(rug);stats.rugs++;
    }
  }
  return {furnish,dress,stats};
}
