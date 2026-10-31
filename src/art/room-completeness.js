import * as THREE from 'three';
import { batchStaticInteriorGroups } from './static-interior-batch.js';
import { createSurfaceDetailMaterials } from './surface-detail-materials.js';

// Functional wall clusters supplement the already planned floor furniture.
// They occupy only the .12 m wall skin, inside the player's .24 m exclusion.
// A recipe is selected from existing room metadata, never a fresh layout RNG.
export const ROOM_COMPLETENESS_PRESETS = {
  bedroom: { name:'旧卧室', groups:['linen','pictures','pegs'], accent:0x647367, paper:0xbfb198 },
  parlor: { name:'旧客厅', groups:['pictures','textile','pictures'], accent:0x69443c, paper:0xbeb099 },
  nursery: { name:'旧育儿室', groups:['growth','pockets','pictures'], accent:0x8e6f70, paper:0xc6b899 },
  clinic: { name:'诊疗室', groups:['instruments','records','linen'], accent:0x657f76, paper:0xb7c1b2 },
  archive: { name:'档案室', groups:['records','index','records'], accent:0x52666a, paper:0xb6a58a },
  shrine: { name:'供奉室', groups:['textile','tablets','textile'], accent:0x663a34, paper:0xbba88b },
};

export function createRoomCompleteness({plan,root,resources,surfaces}) {
  const container=new THREE.Group();container.name='room-completeness';root.add(container);
  const stats={rooms:[],clusters:0,draws:0,triangles:0,skipped:[]};
  container.userData.roomCompleteness=stats;
  let dressed=false,disposed=false;
  const micro=createSurfaceDetailMaterials({resources});
  resources.add({dispose(){disposed=true;container.removeFromParent();}});
  const own=g=>{resources.add(g);return g;};
  function add(parent,geometry,material,x,y,z,rotation=0) {
    const mesh=new THREE.Mesh(own(geometry),material);mesh.position.set(x,y,z);mesh.rotation.z=rotation;
    mesh.receiveShadow=true;mesh.castShadow=false;parent.add(mesh);return mesh;
  }
  const box=(g,m,w,h,d,x,y,z,r=0)=>add(g,new THREE.BoxGeometry(w,h,d),m,x,y,z,r);
  function cloth(g,m,width,height,x,y,z) {
    const geometry=new THREE.PlaneGeometry(width,height,24,8),p=geometry.attributes.position;
    for(let i=0;i<p.count;i++) {
      const u=p.getX(i)/width+.5,v=p.getY(i)/height+.5;
      p.setZ(i,Math.sin(u*Math.PI*6)*.012*(.5+v*.5));
      if(v<.01)p.setY(i,p.getY(i)+.018*Math.sin(u*Math.PI*5));
    }
    geometry.computeVertexNormals();add(g,geometry,m,x,y,z);
  }
  function picture(g,m,art,width,height,x,y) {
    box(g,m.wood,width+.065,height+.065,.035,x,y,.023);
    box(g,m.paper,width+.012,height+.012,.012,x,y,.045);
    add(g,new THREE.PlaneGeometry(width,height),art,x,y,.053);
    for(const dx of [-1,1])box(g,m.metal,.012,height+.045,.008,x+dx*(width+.038)/2,y,.045);
  }
  function cluster(g,kind,m,variant) {
    if(kind==='pictures') {
      picture(g,m,m.art,.42,.54,-.31,.58);
      picture(g,m,m.secondaryArt,.32,.41,.31,.46);
      box(g,m.wood,1.03,.035,.06,0,.10,.035);
      for(let i=0;i<3;i++)box(g,m.metal,.025,.025,.008,-.38+i*.38,.10,.07);
    } else if(kind==='linen'||kind==='pegs') {
      box(g,m.wood,1.04,.09,.035,0,.82,.025);
      for(let i=0;i<4;i++) {
        const x=-.39+i*.26;
        add(g,new THREE.TorusGeometry(.028,.006,5,10,Math.PI*1.5),m.metal,x,.77,.066,Math.PI/2);
      }
      if(kind==='linen') {
        cloth(g,m.linen,.39,.59,-.22,.46,.085);
        cloth(g,m.fabric,.31,.48,.24,.51,.083);
        box(g,m.accent,.35,.018,.004,-.22,.21,.101);
      } else {
        cloth(g,m.fabric,.3,.65,-.25,.40,.085);
        cloth(g,m.linen,.25,.42,.22,.52,.085);
      }
    } else if(kind==='textile') {
      box(g,m.wood,1.13,.045,.035,0,.94,.03);
      cloth(g,m.fabric,.91,.87,0,.47,.062);
      for(const x of [-.4,.4])box(g,m.metal,.012,.79,.004,x,.47,.084);
      for(let i=0;i<12;i++)box(g,m.paper,.004,.05,.004,-.4+i*.073,.025,.065);
    } else if(kind==='records'||kind==='index') {
      box(g,m.wood,1.10,.91,.035,0,.49,.024);
      const rows=kind==='index'?3:2,cols=kind==='index'?4:3;
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++) {
        const w=.94/cols,x=-.47+(c+.5)*w,y=.15+(r+.5)*(.67/rows);
        box(g,m.accent,w-.025,.67/rows-.025,.028,x,y,.055);
        box(g,m.paper,w-.045,.67/rows*.65,.005,x,y+.035,.075);
        box(g,m.wood,w-.025,.022,.026,x,y-.67/rows*.27,.081);
        for(let line=0;line<3;line++)box(g,m.wood,(w-.07)*(.8-line*.12),.003,.002,x,y+.06-line*.018,.079);
        box(g,m.metal,.035,.012,.004,x,y-.015,.082);
      }
    } else if(kind==='growth') {
      box(g,m.wood,.22,1.09,.025,-.31,.55,.025);
      box(g,m.paper,.17,1.02,.008,-.31,.55,.045);
      for(let i=0;i<16;i++)box(g,m.accent,i%4===0?.10:.055,.006,.003,-.325,.08+i*.06,.052);
      picture(g,m,m.art,.44,.51,.20,.63);
    } else if(kind==='pockets') {
      box(g,m.wood,1.05,.045,.035,0,.94,.025);
      cloth(g,m.linen,.96,.88,0,.48,.051);
      for(let r=0;r<2;r++)for(let c=0;c<3;c++) {
        const x=-.32+c*.32,y=.30+r*.37;
        box(g,m.accent,.255,.24,.025,x,y,.075);
        box(g,m.metal,.018,.012,.003,x,y+.08,.091);
      }
    } else if(kind==='instruments') {
      box(g,m.metal,1.09,.88,.035,0,.50,.03);
      box(g,m.accent,1.03,.82,.015,0,.50,.054);
      for(let i=0;i<5;i++) {
        const x=-.4+i*.20,h=.31+(i%3)*.055;
        box(g,m.metal,.014,h,.014,x,.50,.081);
        add(g,new THREE.TorusGeometry(.035,.007,5,12),m.metal,x,.50-h/2,.081);
        box(g,m.paper,.11,.04,.005,x,.16,.069);
      }
    } else if(kind==='tablets') {
      for(let i=0;i<3;i++) {
        const x=-.36+i*.36,h=i===1?.85:.68;
        box(g,m.wood,.28,h,.04,x,h/2+.04,.031);
        box(g,m.accent,.23,h-.05,.012,x,h/2+.04,.057);
        for(let k=0;k<3;k++)box(g,m.metal,.025,.035,.004,x,.27+k*.10,.066);
      }
    }
    g.userData.roomCompletenessCluster={kind,variant};
  }
  function dress() {
    if(dressed||disposed)return;dressed=true;
    const groups=[];
    for(const room of plan.rooms) {
      const theme=room.interior?.presetId??'bedroom',recipe=ROOM_COMPLETENESS_PRESETS[theme];
      if(!recipe)continue;
      const instances=[...(plan.content?.instances??[]),...(plan.content?.conditionalSlots??[])].filter(i=>i.roomId===room.id);
      const protectedRoom=instances.some(i=>['B19','B20'].includes(i.definitionId));
      const floorObjects=plan.obstacles.filter(o=>o.roomId===room.id&&(o.prefabId||['bed','counter','bookshelf'].includes(o.kind)));
      const area=room.cells.length*plan.cellSize**2;
      const eventCleared=instances.length>0&&room.interior?.type==='empty';
      const desired=eventCleared?2:Math.min(7,Math.max(3,Math.ceil(area/30)));
      const entry={roomId:room.id,theme,areaM2:Math.round(area),floorFurniture:floorObjects.length,desired,placed:0,placements:[],
        events:instances.map(i=>i.definitionId),floorPlan:room.interior?.completeness??null,
        needsFloorPlan:!eventCleared&&!room.interior?.completeness?.preserved&&floorObjects.length<3&&area>65,
        reason:eventCleared?'事件专用布景保留观测区域，墙面补足用途信息':room.interior?.completeness?.reason??null};stats.rooms.push(entry);
      if(protectedRoom){entry.reason='建筑变化事件需共同变换墙饰，等待事件接口';stats.skipped.push(room.id);continue;}
      const m={wood:surfaces.material('floor-walnut-planks',0x75614c,.86),
        paper:surfaces.material(null,recipe.paper,.97),accent:surfaces.material(null,recipe.accent,.95),
        metal:surfaces.material(null,0x86734f,.6),art:surfaces.material(surfaces.look(room.id).art,0xb6aa96,.95),
        secondaryArt:surfaces.material('art-endless-corridor',0x9c998a,.95)};
      m.fabric=m.accent.clone();m.linen=m.paper.clone();m.linen.color.multiplyScalar(.68);
      for(const material of [m.fabric,m.linen]){resources.add(material);micro.apply(material,'cloth');}
      const faces=surfaces.faces.filter(f=>f.roomId===room.id&&f.end-f.start>1.4);
      const used=[];
      for(let i=0;i<desired&&faces.length;i++) {
        // Prefer walls far from previous clusters, retaining large quiet regions.
        const position=f=>[f.axis==='X'?f.plane:(f.start+f.end)/2,f.axis==='Z'?f.plane:(f.start+f.end)/2];
        const ranked=[...faces].sort((a,b)=>{
          const distance=f=>{const p=position(f);return used.length?Math.min(...used.map(q=>Math.hypot(p[0]-q[0],p[1]-q[1]))):f.end-f.start;};
          return distance(b)-distance(a);
        });
        const face=ranked.find(f=>{const p=position(f);return used.every(q=>Math.hypot(p[0]-q[0],p[1]-q[1])>2);});
        if(!face)break;
        const kind=recipe.groups[i%recipe.groups.length],y=kind==='growth'?.62:1.20;
        const slot=surfaces.decor.reserve({roomId:room.id,preferredFace:face,width:1.18,height:1.12,y,depth:.12,kind:`complete-${kind}`});
        if(!slot)break;
        const g=new THREE.Group();g.name=`room-completeness-${room.id}-${kind}`;
        if(slot.face.axis==='X'){g.position.set(slot.face.plane+slot.face.sign*.016,y,slot.along);g.rotation.y=slot.face.sign*Math.PI/2;}
        else {g.position.set(slot.along,y,slot.face.plane+slot.face.sign*.016);g.rotation.y=slot.face.sign>0?0:Math.PI;}
        container.add(g);cluster(g,kind,m,i);groups.push({group:g,roomId:room.id});
        used.push([g.position.x,g.position.z]);entry.placed++;stats.clusters++;
        entry.placements.push({kind,position:g.position.toArray(),normal:slot.face.axis==='X'?[slot.face.sign,0]:[0,slot.face.sign],bounds:slot.bounds});
      }
      if(entry.placed<desired)entry.reason='可用墙槽不足，保留门洞与既有装饰';
    }
    const batch=batchStaticInteriorGroups(groups,container,resources);stats.draws=batch.after;
    container.traverse(n=>{if(n.isMesh){n.name=`room-completeness-batch-${n.userData.roomId}`;stats.triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;}});
  }
  return {dress,stats,dispose(){container.removeFromParent();disposed=true;}};
}
