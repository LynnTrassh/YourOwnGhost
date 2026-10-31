import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export const DETAIL_RECIPES = {
  'absent-tea': {theme:'parlor',prefabs:['low-table'],title:'缺席茶位',question:'两个茶位准备好了，为什么只有一只杯子？'},
  'missing-index': {theme:'archive',prefabs:['writing-desk','copy-table'],title:'缺失的索引',question:'三格索引都有位置，为什么中间一格完全空着？'},
};

// Authored candidates only. The host selects one already supported tabletop;
// this module neither chooses rooms nor changes plan/collision/story state.
export function createDetailRecipe({target,recipeId,plan}) {
  const recipe=DETAIL_RECIPES[recipeId],info=target?.userData.roomDetail;
  const room=plan.rooms.find(r=>r.id===info?.roomId);
  if(!recipe||info?.kind!=='tabletop'||room?.interior?.presetId!==recipe.theme||!recipe.prefabs.includes(info.prefab))return null;
  const occupied=[...(plan.content?.instances??[]),...(plan.content?.conditionalSlots??[])].some(i=>i.roomId===room.id||i.supportRoomId===room.id);
  if(occupied)return null;
  const original=target.children.map(node=>[node,node.visible]),group=new THREE.Group(),resources=[];
  group.name=`detail-recipe-${recipeId}`;group.visible=false;target.add(group);
  const own=r=>(resources.push(r),r);
  const colors=recipe.theme==='parlor'?[0xc8c0a6,0x3e312b,0x52645a,0xa68a59]:[0xc8bfa5,0x44392b,0x536568,0x9a8859];
  const materials=colors.map((color,i)=>own(new THREE.MeshStandardMaterial({color,roughness:i===3?.46:.84,metalness:i===3?.45:0})));
  const parts=materials.map(()=>[]),transform=new THREE.Object3D();
  function add(geometry,mat,x,y,z,rotation=[0,0,0]) {
    transform.position.set(x,y,z);transform.rotation.set(...rotation);transform.updateMatrix();
    const g=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.dispose();g.applyMatrix4(transform.matrix);parts[mat].push(g);
  }
  const box=(w,h,d,x,y,z,m=0)=>add(new RoundedBoxGeometry(w,h,d,1,Math.min(w,h,d)*.1),m,x,y,z);
  const cylinder=(r,h,x,y,z,m=0)=>add(new THREE.CylinderGeometry(r,r,h,20),m,x,y,z);
  const lathe=(profile,x,y,z,m=0)=>add(new THREE.LatheGeometry(profile.map(v=>new THREE.Vector2(...v)),24),m,x,y,z);
  if(recipeId==='absent-tea') {
    // Two linen coasters establish a pair; only the left saucer has a cup.
    for(const x of [-.125,.125]) {
      box(.14,.002,.135,x,.001,.07,2);
      cylinder(.056,.006,x,.005,.07);
      add(new THREE.TorusGeometry(.048,.0015,5,24),3,x,.009,.07,[Math.PI/2,0,0]);
      box(.055,.003,.004,x,.006,.151,3);
    }
    lathe([[.021,0],[.028,.006],[.034,.06],[.032,.073],[.028,.073],[.026,.01]],-.125,.009,.07);
    cylinder(.028,.001,-.125,.064,.07,1);
    add(new THREE.TorusGeometry(.019,.0038,6,16),0,-.162,.047,.07);
    lathe([[.022,0],[.042,.012],[.047,.043],[.034,.074],[.022,.077]],0,.003,-.077);
    cylinder(.025,.005,0,.083,-.077);cylinder(.007,.008,0,.09,-.077,3);
    add(new THREE.TorusGeometry(.031,.004,7,20,Math.PI*1.5),0,-.044,.044,-.077,[0,0,-Math.PI*.75]);
    add(new THREE.CylinderGeometry(.008,.016,.06,14),0,.052,.054,-.077,[0,0,-.95]);
    // Folded invitation is subordinate to the two place settings, no writing.
    box(.073,.003,.06,.14,.002,-.08);box(.047,.001,.002,.14,.004,-.075,1);
  } else {
    // Three low sorting trays, deliberately one empty; index cards remain
    // within their folders, without inventing a readable gameplay clue.
    for(const [i,x] of [-.14,0,.14].entries()) {
      box(.127,.005,.224,x,.0025,0,2);
      for(const edge of [-.061,.061])box(.005,.025,.224,x+edge,.0175,0,2);
      box(.127,.025,.005,x,.0175,-.109,2);
      box(.061,.016,.002,x,.014,.113,3);
      for(let line=0;line<=i;line++)box(.002,.007,.001,x-.009+i*-.002+line*.009,.014,.1145,1);
      if(i===1)continue;
      for(let layer=0;layer<4;layer++) {
        box(.108,.008,.186,x,.010+layer*.009,.004,0);
        box(.027,.002,.012,x-.032+(layer%3)*.025,.015+layer*.009,-.094,0);
      }
      box(.066,.001,.028,x,.043,-.025,2);
      for(let line=0;line<4;line++)box(.068-line*.005,.0008,.001,x,.043,.005+line*.012,1);
    }
    box(.15,.007,.029,0,.004,.148,1);
    box(.119,.003,.004,0,.009,.148,3);
  }
  for(const [i,list] of parts.entries())if(list.length) {
    const geometry=own(mergeGeometries(list));list.forEach(g=>g.dispose());geometry.computeBoundingBox();
    const b=geometry.boundingBox;
    if(b.min.x<-.225||b.max.x>.225||b.min.z<-.19||b.max.z>.19||b.min.y<-.001||b.max.y>.19)throw new Error(`Recipe exceeds supported footprint: ${recipeId}`);
    const mesh=new THREE.Mesh(geometry,materials[i]);mesh.receiveShadow=true;group.add(mesh);
  }
  let disposed=false,enabled=false;
  const setEnabled=value=>{
    if(disposed)return;enabled=Boolean(value);group.visible=enabled;
    for(const [node,wasVisible] of original)node.visible=enabled?false:wasVisible;
  };
  return {group,recipeId,roomId:room.id,obstacleId:info.obstacleId,setEnabled,
    get enabled(){return enabled;},
    dispose(){if(disposed)return;setEnabled(false);disposed=true;group.removeFromParent();resources.forEach(r=>r.dispose());},
  };
}
