import { createProductionAssetLoader } from './production-assets.js';
import { wallSurfaces } from './wall-surfaces.js';
import { roomIdAt } from '../story/spatial.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

// Program-owned greybox. Art can replace these meshes without changing plan bindings.
export function createStoryProxies(THREE,root,plan,{material,box,resources,scene}) {
  const moving=[],ambient=[],monitors=[];
  const productionArt=createProductionAssetLoader(resources);
  const stone=material(0x8a8980),face=material(0x59594f),panel=material(0x4c4237),shadow=material(0x151713),
    shoe=material(0x59483f),rug=material(0x66715e),warm=material(0xa5a18b,{emissive:0x615d47,emissiveIntensity:.12}),
    coat=material(0x696f69),skin=material(0xaaa18d),tableWood=material(0x554537),
    photoBase=material(0x665b4c,{emissive:0x302b25,emissiveIntensity:.15}),photoFigure=material(0x282923),
    dollCloth=material(0xa58370),stuffing=material(0xd7cbb6);
  const dollPiece=(parent,w,h,d,x,y,z,mat)=>{const geometry=new THREE.BoxGeometry(w,h,d);resources.add(geometry);
    const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;};
  const dollBody=parent=>{
    for(const x of [-.17,.17]) {dollPiece(parent,.14,.55,.18,x,.35,-.06,dollCloth);
      dollPiece(parent,.13,.62,.14,x*1.9,1.01,-.02,dollCloth);}
    dollPiece(parent,.43,.4,.37,0,1.51,0,dollCloth);
    dollPiece(parent,.06,.05,.025,-.11,1.55,-.2,face);
    dollPiece(parent,.06,.05,.025,.11,1.55,-.2,face);
    const intact=new THREE.Group(),torn=new THREE.Group();parent.add(intact,torn);
    dollPiece(intact,.42,.48,.28,0,.96,-.02,dollCloth);
    dollPiece(torn,.17,.48,.28,-.17,.96,-.02,dollCloth);
    dollPiece(torn,.17,.48,.28,.17,.96,-.02,dollCloth);
    dollPiece(torn,.18,.31,.13,0,.96,-.09,stuffing);
    for(const x of [-.1,0,.1]) dollPiece(torn,.055,.14,.08,x,.83,-.19,stuffing);
    torn.visible=false;return {intact,torn};
  };
  const petals=material(0x8f5b65,{side:THREE.DoubleSide});
  const petalPatch=(point,name)=>{
    const group=new THREE.Group();group.name=name;group.position.set(point.x,0,point.z);root.add(group);
    for(let index=0;index<7;index++) {
      const geometry=new THREE.SphereGeometry(1,7,4);resources.add(geometry);
      const mesh=new THREE.Mesh(geometry,petals);
      const angle=index*2.39996,radius=.08+.055*(index%4);
      mesh.scale.set(.075,.012,.045);
      mesh.position.set(Math.cos(angle)*radius,.018+index*.001,Math.sin(angle)*radius);
      mesh.rotation.y=angle;group.add(mesh);
    }
    return group;
  };
  for(const instance of plan.content?.instances??[]) {
    const p=instance.focus;
    if(instance.definitionId==='IN04') {
      const source=petalPatch(instance.focus,`story-${instance.instanceId}-source`);
      const follow=petalPatch(instance.followFocus,`story-${instance.instanceId}-follow`);
      follow.visible=false;
      moving.push({id:instance.instanceId,type:'IN04',source,follow});
    } else if(instance.definitionId==='AB01') {
      const fur=material(0x807b70),eyes=material(0xc4d19a,{emissive:0x7b8858,emissiveIntensity:.4});
      const bowlMat=material(0x656b69),waterMat=material(0x6a8b91,{transparent:true,opacity:.72});
      const cats=new THREE.Group(),traces=new THREE.Group();
      cats.name=`story-${instance.instanceId}-cats`;traces.name=`story-${instance.instanceId}-traces`;
      root.add(cats,traces);traces.visible=false;
      const part=(parent,w,h,d,x,y,z,mat)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
        resources.add(mesh.geometry);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
      instance.slots.forEach((slot,index)=>{
        const cat=new THREE.Group();cats.add(cat);cat.position.set(slot.x,0,slot.z);
        cat.rotation.y=index*.7;
        part(cat,.38,.34,.56,0,.23,0,fur);
        part(cat,.31,.27,.28,0,.52,-.16,fur);
        for(const side of [-1,1]) {
          part(cat,.08,.14,.09,side*.11,.72,-.2,fur);
          part(cat,.04,.045,.02,side*.085,.54,-.31,eyes);
        }
        part(cat,.07,.3,.07,0,.37,.32,fur);
        const mark=new THREE.Mesh(new THREE.CircleGeometry(.24,8),
          material(0x9a8c6b,{transparent:true,opacity:.58,emissive:0x5e594b,emissiveIntensity:.24}));
        resources.add(mark.geometry);mark.rotation.x=-Math.PI/2;mark.scale.set(.8,1.25,1);
        mark.position.set(slot.x,.012,slot.z);traces.add(mark);
      });
      const bowl=new THREE.Group();bowl.name=`story-${instance.instanceId}-bowl`;root.add(bowl);
      bowl.position.set(p.x+1.65,0,p.z);
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(.31,.25,.16,12,1,true),bowlMat);
      resources.add(rim.geometry);rim.position.y=.1;bowl.add(rim);
      const water=new THREE.Mesh(new THREE.CircleGeometry(.25,14),waterMat);
      resources.add(water.geometry);water.rotation.x=-Math.PI/2;water.position.y=.13;bowl.add(water);
      moving.push({id:instance.instanceId,type:'AB01',cats,traces,water});
    } else if(instance.definitionId==='IN02') {
      const fixture=instance.fixture,drawer=new THREE.Group();
      drawer.name=`story-${instance.instanceId}-drawer`;
      drawer.position.set((fixture.minX+fixture.maxX)/2,0,(fixture.minZ+fixture.maxZ)/2);
      drawer.rotation.y=Math.atan2(instance.normal.x,instance.normal.z);
      root.add(drawer);
      dollPiece(drawer,.86,.95,.66,0,.5,0,panel);
      dollPiece(drawer,.72,.26,.07,0,.73,-.375,tableWood);
      dollPiece(drawer,.72,.05,.055,0,.55,-.4,shadow);
      dollPiece(drawer,.08,.035,.035,0,.75,-.425,warm);
      const dolls=[];
      for(let index=0;index<instance.maxVisible;index++) {
        const figure=new THREE.Group();figure.name=`story-${instance.instanceId}-doll-${index}`;
        root.add(figure);figure.visible=false;
        dollPiece(figure,.18,.26,.12,0,.22,0,dollCloth);
        dollPiece(figure,.065,.18,.075,-.13,.2,0,dollCloth);
        dollPiece(figure,.065,.18,.075,.13,.2,0,dollCloth);
        for(const side of [-1,1])dollPiece(figure,.065,.16,.07,side*.055,.05,0,dollCloth);
        const head=new THREE.Mesh(new THREE.SphereGeometry(.1,10,8),skin);
        resources.add(head.geometry);head.position.y=.42;head.castShadow=true;figure.add(head);
        for(const side of [-1,1])dollPiece(figure,.018,.018,.012,side*.035,.435,-.09,face);
        dolls.push(figure);
      }
      moving.push({id:instance.instanceId,type:'IN02',dolls,origin:instance.focus,
        inward:{x:-instance.normal.x,z:-instance.normal.z}});
    } else if(instance.definitionId==='IN03') {
      const bed=new THREE.Group();bed.name=`story-${instance.instanceId}-bed`;
      bed.position.set(instance.bed.center.x,0,instance.bed.center.z);
      bed.rotation.y=Math.atan2(instance.bed.forward.x,instance.bed.forward.z);
      root.add(bed);
      const timber=material(0x50483e),linen=material(0x85877b),water=new THREE.MeshBasicMaterial({
        color:0x526f70,transparent:true,opacity:.76,depthWrite:false,side:THREE.DoubleSide});
      resources.add(water);
      dollPiece(bed,1.62,.42,2.62,0,.34,0,timber);
      dollPiece(bed,1.5,.19,2.5,0,.65,0,linen);
      dollPiece(bed,1.24,.12,.42,0,.82,1.01,linen);
      const patches=[instance.focus,instance.wallFocus,instance.doorFocus].map((point,index)=>{
        const geometry=new THREE.CircleGeometry(.38,20),positions=geometry.attributes.position;
        for(let vertex=1;vertex<positions.count;vertex++) {
          const variation=1-.11*(1+Math.sin(vertex*2.7+index*1.8))*.5;
          positions.setXY(vertex,positions.getX(vertex)*variation,positions.getY(vertex)*variation);
        }
        positions.needsUpdate=true;geometry.computeVertexNormals();resources.add(geometry);
        const mesh=new THREE.Mesh(geometry,water);
        mesh.rotation.x=-Math.PI/2;mesh.position.set(point.x,.018+index*.003,point.z);
        mesh.name=`story-${instance.instanceId}-water-${index}`;root.add(mesh);
        return mesh;
      });
      const wallPoint=instance.wallSource.wall,normal=instance.wallSource.normal,
        tangent={x:-normal.z,z:normal.x};
      const near={x:wallPoint.x-normal.x*.13,z:wallPoint.z-normal.z*.13},
        far={x:wallPoint.x-normal.x*.66,z:wallPoint.z-normal.z*.66};
      const runoffGeometry=new THREE.BufferGeometry();resources.add(runoffGeometry);
      runoffGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
        near.x+tangent.x*.045,.024,near.z+tangent.z*.045,
        near.x-tangent.x*.045,.024,near.z-tangent.z*.045,
        far.x-tangent.x*.13,.024,far.z-tangent.z*.13,
        far.x+tangent.x*.13,.024,far.z+tangent.z*.13],3));
      runoffGeometry.setIndex([0,1,2,0,2,3]);runoffGeometry.computeVertexNormals();
      const runoff=new THREE.Mesh(runoffGeometry,water);runoff.name=`story-${instance.instanceId}-wall-runoff`;
      root.add(runoff);
      const doorSource=instance.doorSource,doorNormal=doorSource.normal,
        doorTangent={x:-doorNormal.z,z:doorNormal.x};
      const doorRunoffGeometry=new THREE.BufferGeometry();resources.add(doorRunoffGeometry);
      doorRunoffGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
        doorSource.x+doorNormal.x*.12+doorTangent.x*.035,.027,
        doorSource.z+doorNormal.z*.12+doorTangent.z*.035,
        doorSource.x+doorNormal.x*.12-doorTangent.x*.035,.027,
        doorSource.z+doorNormal.z*.12-doorTangent.z*.035,
        doorSource.x+doorNormal.x*.55-doorTangent.x*.12,.027,
        doorSource.z+doorNormal.z*.55-doorTangent.z*.12,
        doorSource.x+doorNormal.x*.55+doorTangent.x*.12,.027,
        doorSource.z+doorNormal.z*.55+doorTangent.z*.12],3));
      doorRunoffGeometry.setIndex([0,1,2,0,2,3]);doorRunoffGeometry.computeVertexNormals();
      const doorRunoff=new THREE.Mesh(doorRunoffGeometry,water);
      doorRunoff.name=`story-${instance.instanceId}-door-runoff`;root.add(doorRunoff);
      const crevice=dollPiece(root,normal.x?.025:.055,.57,normal.z?.025:.055,
        wallPoint.x-normal.x*.12,.29,wallPoint.z-normal.z*.12,shadow);
      crevice.name=`story-${instance.instanceId}-wall-crevice`;
      moving.push({id:instance.instanceId,type:'IN03',patches,runoff,doorRunoff,crevice});
    } else if(instance.definitionId==='BO01') {
      const frame=new THREE.Group();frame.position.set(p.x,0,p.z);
      frame.rotation.y=Math.atan2(instance.window.normal.x,instance.window.normal.z);
      frame.name=`story-${instance.instanceId}-eye`;root.add(frame);
      const dark=material(0x101514),white=material(0xaaa198,{emissive:0x5b524d,emissiveIntensity:.12}),
        irisMat=material(0x465b4b,{emissive:0x233a2b,emissiveIntensity:.16}),pupilMat=material(0x090c0a);
      dollPiece(frame,1.24,1.14,.02,0,1.9,.05,dark);
      const oval=(parent,mat,width,height,depth,x,y,z)=>{
        const geometry=new THREE.SphereGeometry(1,20,12);resources.add(geometry);
        const mesh=new THREE.Mesh(geometry,mat);mesh.scale.set(width,height,depth);
        mesh.position.set(x,y,z);parent.add(mesh);return mesh;
      };
      oval(frame,white,.49,.38,.055,0,1.9,-.045);
      const gaze=new THREE.Group();gaze.name=`story-${instance.instanceId}-pupil`;
      gaze.position.set(.23,1.9,-.11);frame.add(gaze);
      oval(gaze,irisMat,.17,.19,.018,0,0,0);
      oval(gaze,pupilMat,.087,.11,.012,0,0,-.022);
      moving.push({id:instance.instanceId,type:'BO01',gaze});
    } else if(instance.definitionId==='BO02') {
      const fixture=instance.fixture;
      const cx=(fixture.minX+fixture.maxX)/2,cz=(fixture.minZ+fixture.maxZ)/2;
      const leaf=dollPiece(root,fixture.maxX-fixture.minX,2.3,fixture.maxZ-fixture.minZ,
        cx,1.15,cz,panel);
      leaf.name=`story-${instance.instanceId}-door-leaf`;
      const coatMat=new THREE.MeshBasicMaterial({color:0x53665b}),
        seamMat=new THREE.MeshBasicMaterial({color:0x28372f}),
        skinMat=material(0xb7aa91),eyeMat=material(0x171a16);
      resources.add(coatMat);resources.add(seamMat);
      const figure=new THREE.Group();figure.name=`story-${instance.instanceId}-segmented-figure`;
      root.add(figure);
      const head=new THREE.Group();head.name=`story-${instance.instanceId}-normal-head`;
      figure.add(head);head.position.y=1.68;
      head.rotation.y=Math.atan2(-(instance.observation.x-instance.track.origin.x),
        -(instance.observation.z-instance.track.origin.z));
      const skull=new THREE.Mesh(new THREE.SphereGeometry(.21,14,10),skinMat);
      resources.add(skull.geometry);head.add(skull);
      for(const side of [-1,1])dollPiece(head,.045,.04,.025,side*.075,.015,-.19,eyeMat);
      dollPiece(head,.075,.06,.13,0,-.04,-.23,skinMat);
      dollPiece(head,.16,.24,.17,0,-.32,0,coatMat);
      const segments=[];
      for(let index=0;index<9;index++) {
        const segment=new THREE.Group();segment.name=`story-${instance.instanceId}-body-${index}`;
        figure.add(segment);
        const alongX=Math.abs(instance.track.along.x)>0;
        const tube=new THREE.Mesh(new THREE.CylinderGeometry(.15,.17,.64,8),coatMat);
        resources.add(tube.geometry);tube.position.y=1.14;
        tube.rotation.set(alongX?0:Math.PI/2,0,alongX?Math.PI/2:0);
        tube.castShadow=true;segment.add(tube);
        const joint=new THREE.Mesh(new THREE.SphereGeometry(.17,8,6),seamMat);
        resources.add(joint.geometry);joint.position.y=1.14;segment.add(joint);
        if(index===8)for(const side of [-1,1])
          dollPiece(segment,.09,.56,.11,side*.12,.72,0,coatMat);
        segment.visible=false;segments.push(segment);
      }
      moving.push({id:instance.instanceId,type:'BO02',figure,head,segments,
        origin:instance.track.origin,along:instance.track.along,
        headDistance:instance.track.headDistance});
    } else if(instance.definitionId==='AB04') {
      const bed=new THREE.Group();bed.name=`story-${instance.instanceId}-bed`;
      bed.position.set(instance.bed.center.x,0,instance.bed.center.z);
      bed.rotation.y=Math.atan2(instance.bed.forward.x,instance.bed.forward.z);
      root.add(bed);
      const timber=material(0x51443b),sheetMat=material(0x77766d,{side:THREE.DoubleSide}),
        pillowMat=material(0x9a9586),indentMat=material(0x393d36,
          {transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide});
      dollPiece(bed,1.72,.38,2.72,0,.36,0,timber)
        .name=`story-${instance.instanceId}-frame`;
      dollPiece(bed,1.6,.2,2.6,0,.65,0,pillowMat)
        .name=`story-${instance.instanceId}-mattress`;
      dollPiece(bed,1.3,.11,.48,0,.81,1.03,pillowMat);
      const geometry=new THREE.PlaneGeometry(1.54,2.47,16,24);
      resources.add(geometry);
      const base=Float32Array.from(geometry.attributes.position.array);
      const duvet=new THREE.Mesh(geometry,sheetMat);
      duvet.name=`story-${instance.instanceId}-duvet`;
      duvet.rotation.x=-Math.PI/2;duvet.position.y=.76;
      duvet.receiveShadow=true;bed.add(duvet);
      const indent=new THREE.Mesh(new THREE.PlaneGeometry(.7,1.35),indentMat);
      resources.add(indent.geometry);indent.rotation.x=-Math.PI/2;
      indent.position.set(0,.746,-.08);indent.visible=false;
      indent.name=`story-${instance.instanceId}-indent`;bed.add(indent);
      moving.push({id:instance.instanceId,type:'AB04',bed,duvet,base,indent});
    } else if(instance.definitionId==='BO03') {
      const room=plan.rooms.find(item=>item.id===instance.roomId),panels=[];
      const skin=material(0x657467,{emissive:0x344b39,emissiveIntensity:.09,
        side:THREE.DoubleSide});
      const panel=(geometry,name,position,rotation)=>{
        resources.add(geometry);
        const mesh=new THREE.Mesh(geometry,skin);mesh.receiveShadow=true;
        mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.name=name;root.add(mesh);
        panels.push({mesh,base:Float32Array.from(geometry.attributes.position.array),
          width:geometry.parameters.width,height:geometry.parameters.height});
      };
      for(const face of wallSurfaces(plan.walls)) {
        const midpoint=(face.start+face.end)/2;
        const sample=face.axis==='X'?{x:face.plane+face.sign*.13,z:midpoint}
          :{x:midpoint,z:face.plane+face.sign*.13};
        if(roomIdAt(plan,sample)!==room.id||face.end-face.start<.35)continue;
        const geometry=new THREE.PlaneGeometry(face.end-face.start,2.8,8,4);
        const position=face.axis==='X'?[face.plane+face.sign*.035,1.5,midpoint]
          :[midpoint,1.5,face.plane+face.sign*.035];
        const rotation=[0,face.axis==='X'?face.sign*Math.PI/2:face.sign>0?0:Math.PI,0];
        panel(geometry,`story-${instance.instanceId}-wall-${panels.length}`,position,rotation);
      }
      let ceilingIndex=0;
      for(const [mx,mz] of room.modules) {
        const x=(room.gridCenter[0]+mx*3)*plan.cellSize,z=(room.gridCenter[1]+mz*3)*plan.cellSize;
        panel(new THREE.PlaneGeometry(plan.moduleSize,plan.moduleSize,6,6),
          `story-${instance.instanceId}-ceiling-${ceilingIndex++}`,[x,2.965,z],[Math.PI/2,0,0]);
      }
      moving.push({id:instance.instanceId,type:'BO03',panels});
    } else if(instance.definitionId==='ME01') {
      const frame=new THREE.Group();
      frame.position.set(instance.slot.wall.x-instance.slot.normal.x*.16,0,
        instance.slot.wall.z-instance.slot.normal.z*.16);
      frame.rotation.y=Math.atan2(-instance.slot.normal.x,-instance.slot.normal.z);
      frame.name=`story-${instance.instanceId}-frame`;root.add(frame);
      const mirrorTrim=material(0x333b35),wood=material(0x665949),coatMat=material(0x4b5651),
        skinMat=material(0xa69a85),eyeMat=material(0x171b18);
      dollPiece(frame,2.72,2.02,.12,0,1.64,.01,mirrorTrim);
      const geometry=new THREE.PlaneGeometry(2.48,1.78);resources.add(geometry);
      const mirror=new Reflector(geometry,{textureWidth:512,textureHeight:512,
        clipBias:.004,multisample:0,color:0xa7bcb0});
      mirror.position.set(0,1.64,.085);
      mirror.name=`story-${instance.instanceId}-mirror`;frame.add(mirror);
      resources.add(mirror);
      const people=new THREE.Group();people.name=`story-${instance.instanceId}-mirror-people`;
      people.visible=false;root.add(people);
      const mirrorLight=new THREE.SpotLight(0xb5cabd,22,10,Math.PI/4,.7,1.1);
      mirrorLight.position.set(instance.observation.x,2.35,instance.observation.z);
      mirrorLight.target.position.set(instance.chairFocus.x,1.15,instance.chairFocus.z);
      mirrorLight.visible=false;root.add(mirrorLight,mirrorLight.target);
      const realChairs=new THREE.Group();realChairs.name=`story-${instance.instanceId}-empty-chairs`;
      root.add(realChairs);
      const angle=Math.atan2(-instance.slot.normal.x,-instance.slot.normal.z);
      for(const [index,point] of instance.chairSlots.entries()) {
        const chair=new THREE.Group();chair.position.set(point.x,0,point.z);
        chair.rotation.y=angle;chair.name=`story-${instance.instanceId}-chair-${index}`;
        realChairs.add(chair);
        dollPiece(chair,.65,.11,.58,0,.67,0,wood);
        dollPiece(chair,.65,.58,.09,0,1.01,.26,wood);
        for(const x of [-.25,.25])for(const z of [-.2,.2])
          dollPiece(chair,.075,.6,.075,x,.3,z,wood);
        const person=new THREE.Group();person.position.set(point.x,0,point.z);
        person.rotation.y=angle;people.add(person);
        dollPiece(person,.37,.52,.3,0,.98,-.01,coatMat);
        const head=new THREE.Mesh(new THREE.SphereGeometry(.18,12,10),skinMat);
        resources.add(head.geometry);head.position.set(0,1.43,-.045);person.add(head);
        for(const side of [-1,1])dollPiece(person,.035,.04,.018,side*.065,1.45,-.21,eyeMat);
        for(const side of [-1,1])dollPiece(person,.11,.39,.12,side*.22,.9,-.03,coatMat);
      }
      const original=mirror.onBeforeRender;
      mirror.onBeforeRender=function(renderer,renderScene,camera){
        people.visible=true;mirrorLight.visible=true;
        try {original.call(this,renderer,renderScene,camera);}
        finally {people.visible=false;mirrorLight.visible=false;}
      };
    } else if(instance.definitionId==='ME02') {
      const frame=new THREE.Group();
      frame.position.set(instance.slot.wall.x-instance.slot.normal.x*.16,0,
        instance.slot.wall.z-instance.slot.normal.z*.16);
      frame.rotation.y=Math.atan2(-instance.slot.normal.x,-instance.slot.normal.z);
      frame.name=`story-${instance.instanceId}-frame`;root.add(frame);
      const trim=material(0x333b35),coatMat=material(0x53645d),skinMat=material(0xb7a98e),
        eyeMat=material(0x151b18);
      dollPiece(frame,2.72,2.02,.12,0,1.64,.01,trim);
      const geometry=new THREE.PlaneGeometry(2.48,1.78);resources.add(geometry);
      const mirror=new Reflector(geometry,{textureWidth:512,textureHeight:512,
        clipBias:.004,multisample:0,color:0xa7bcb0});
      mirror.position.set(0,1.64,.085);
      mirror.name=`story-${instance.instanceId}-mirror`;frame.add(mirror);resources.add(mirror);
      const avatar=new THREE.Group();avatar.name=`story-${instance.instanceId}-delayed-avatar`;
      avatar.position.set(instance.observation.x,0,instance.observation.z);
      avatar.visible=false;root.add(avatar);
      dollPiece(avatar,.42,.62,.28,0,1.02,0,coatMat);
      for(const side of [-1,1]) {
        dollPiece(avatar,.12,.58,.15,side*.3,1.01,0,coatMat);
        dollPiece(avatar,.14,.8,.16,side*.12,.38,0,coatMat);
      }
      const head=new THREE.Group();head.name=`story-${instance.instanceId}-head`;
      head.position.y=1.55;avatar.add(head);
      const skull=new THREE.Mesh(new THREE.SphereGeometry(.2,14,10),skinMat);
      resources.add(skull.geometry);head.add(skull);
      for(const side of [-1,1])dollPiece(head,.045,.045,.018,side*.075,.025,-.19,eyeMat);
      dollPiece(head,.075,.075,.16,0,-.045,-.25,skinMat);
      dollPiece(head,.24,.045,.035,0,.17,-.015,coatMat);
      const mirrorLight=new THREE.SpotLight(0xb8cfc0,18,8,Math.PI/4,.7,1.1);
      mirrorLight.position.set(instance.observation.x,2.35,instance.observation.z);
      mirrorLight.target.position.set(instance.observation.x,1.1,instance.observation.z);
      mirrorLight.visible=false;root.add(mirrorLight,mirrorLight.target);
      const original=mirror.onBeforeRender;
      mirror.onBeforeRender=function(renderer,renderScene,camera){
        avatar.visible=true;mirrorLight.visible=true;
        try {original.call(this,renderer,renderScene,camera);}
        finally {avatar.visible=false;mirrorLight.visible=false;}
      };
      moving.push({id:instance.instanceId,type:'ME02',avatar,head,mirrorLight});
    } else if(instance.definitionId==='ME03') {
      const target=new THREE.WebGLRenderTarget(512,384,{depthBuffer:true});
      target.texture.colorSpace=THREE.SRGBColorSpace;resources.add(target);
      const camera=new THREE.PerspectiveCamera(50,512/384,.08,30);
      camera.position.set(instance.cameraObservation.x,instance.cameraObservation.y,
        instance.cameraObservation.z);
      camera.lookAt(instance.chairFocus.x,1.03,instance.chairFocus.z);
      const captureLight=new THREE.SpotLight(0xabc8b8,27,9,Math.PI/5,.7,1.2);
      captureLight.position.copy(camera.position);
      captureLight.target.position.set(instance.chairFocus.x,1.03,instance.chairFocus.z);
      captureLight.visible=false;root.add(captureLight,captureLight.target);
      const frame=new THREE.Group();
      frame.position.set(instance.slot.wall.x-instance.slot.normal.x*.16,0,
        instance.slot.wall.z-instance.slot.normal.z*.16);
      frame.rotation.y=Math.atan2(-instance.slot.normal.x,-instance.slot.normal.z);
      frame.name=`story-${instance.instanceId}-monitor`;root.add(frame);
      const bezel=material(0x151a18),screenMat=new THREE.MeshBasicMaterial({map:target.texture,
        color:0xc2d2c5,side:THREE.DoubleSide});resources.add(screenMat);
      dollPiece(frame,2.28,1.72,.12,0,1.65,.01,bezel);
      const screen=new THREE.Mesh(new THREE.PlaneGeometry(2.04,1.48),screenMat);
      resources.add(screen.geometry);screen.position.set(0,1.65,.08);
      screen.name=`story-${instance.instanceId}-screen`;frame.add(screen);
      const chairWood=material(0x887460),chairBack=material(0x303832),chairFront=material(0xb9a989);
      const makeChair=(name,angle)=>{
        const chair=new THREE.Group();chair.position.set(instance.chairFocus.x,0,instance.chairFocus.z);
        chair.rotation.y=angle;chair.name=name;root.add(chair);
        dollPiece(chair,.78,.12,.7,0,.77,0,chairWood);
        dollPiece(chair,.78,.73,.1,0,1.18,.3,chairWood);
        dollPiece(chair,.69,.56,.018,0,1.2,.36,chairBack);
        dollPiece(chair,.69,.56,.018,0,1.2,.24,chairFront);
        for(const x of [-.3,.3])for(const z of [-.25,.25])
          dollPiece(chair,.09,.7,.09,x,.35,z,chairWood);
        return chair;
      };
      const angle=Math.atan2(instance.observation.x-instance.chairFocus.x,
        instance.observation.z-instance.chairFocus.z);
      const real=makeChair(`story-${instance.instanceId}-real-chair`,angle);
      const alternate=makeChair(`story-${instance.instanceId}-screen-chair`,angle+Math.PI);
      alternate.visible=false;
      monitors.push({target,camera,screen,real,alternate,captureLight,rendered:false});
    } else if(instance.definitionId==='BO04') {
      const chair=new THREE.Group();chair.position.set(p.x,0,p.z);
      chair.rotation.y=Math.atan2(instance.observation.x-p.x,instance.observation.z-p.z);
      chair.name=`story-${instance.instanceId}-chair`;root.add(chair);
      const wood=material(0x6b5945),jointMat=material(0x9a8b6d);
      dollPiece(chair,.76,.12,.7,0,.77,0,wood);
      dollPiece(chair,.76,.77,.1,0,1.19,-.31,wood);
      let bendingLeg=null;
      for(const x of [-.28,.28])for(const z of [-.26,.26]) {
        dollPiece(chair,.09,.32,.09,x,.56,z,wood);
        const hinge=new THREE.Group();hinge.position.set(x,.4,z);chair.add(hinge);
        if(x>0&&z>0)hinge.name=`story-${instance.instanceId}-bend-joint`;
        const joint=new THREE.Mesh(new THREE.SphereGeometry(.075,10,7),jointMat);
        resources.add(joint.geometry);joint.position.y=0;hinge.add(joint);
        dollPiece(hinge,.08,.38,.08,0,-.2,0,wood);
        if(x>0&&z>0)bendingLeg=hinge;
      }
      moving.push({id:instance.instanceId,type:'BO04',bendingLeg});
    } else if(instance.definitionId==='ME04') {
      const projection=new THREE.Group();projection.position.set(p.x,.026,p.z);
      projection.rotation.y=Math.atan2(instance.observation.x-p.x,instance.observation.z-p.z);
      projection.name=`story-${instance.instanceId}-shadow`;root.add(projection);
      const shape=new THREE.Shape();
      shape.moveTo(0,1.78);
      shape.bezierCurveTo(.23,1.78,.42,1.58,.42,1.36);
      shape.bezierCurveTo(.42,1.16,.33,1.04,.24,.96);
      shape.bezierCurveTo(.52,.91,.75,.78,.82,.57);
      shape.bezierCurveTo(.96,.22,1.18,-.07,1.2,-.27);
      shape.bezierCurveTo(1.22,-.42,1.07,-.55,.96,-.47);
      shape.bezierCurveTo(.74,-.29,.57,.06,.53,.22);
      shape.bezierCurveTo(.55,-.14,.5,-.46,.43,-.67);
      shape.bezierCurveTo(.42,-.93,.42,-1.27,.47,-1.49);
      shape.bezierCurveTo(.55,-1.62,.54,-1.71,.36,-1.72);
      shape.bezierCurveTo(.18,-1.74,.13,-1.67,.11,-1.54);
      shape.lineTo(.02,-.56);shape.lineTo(-.02,-.56);shape.lineTo(-.11,-1.54);
      shape.bezierCurveTo(-.13,-1.67,-.18,-1.74,-.36,-1.72);
      shape.bezierCurveTo(-.54,-1.71,-.55,-1.62,-.47,-1.49);
      shape.bezierCurveTo(-.42,-1.27,-.42,-.93,-.43,-.67);
      shape.bezierCurveTo(-.5,-.46,-.55,-.14,-.53,.22);
      shape.bezierCurveTo(-.57,.06,-.74,-.29,-.96,-.47);
      shape.bezierCurveTo(-1.07,-.55,-1.22,-.42,-1.2,-.27);
      shape.bezierCurveTo(-1.18,-.07,-.96,.22,-.82,.57);
      shape.bezierCurveTo(-.75,.78,-.52,.91,-.24,.96);
      shape.bezierCurveTo(-.33,1.04,-.42,1.16,-.42,1.36);
      shape.bezierCurveTo(-.42,1.58,-.23,1.78,0,1.78);
      const geometry=new THREE.ShapeGeometry(shape,28);resources.add(geometry);
      for(const [name,color,opacity,height,scale] of [
        ['fringe',0x111511,.24,.002,1.065],['ink',0x0a0d0b,.93,.005,1]]) {
        const mesh=new THREE.Mesh(geometry,material(color,{transparent:true,opacity,
          side:THREE.DoubleSide,depthWrite:false}));
        mesh.rotation.x=-Math.PI/2;mesh.position.y=height;mesh.scale.setScalar(scale);
        mesh.name=`story-${instance.instanceId}-${name}`;projection.add(mesh);
      }
      moving.push({id:instance.instanceId,type:'ME04',projection});
    } else if(instance.definitionId==='B10') {
      const basin=instance.fixture,normal=instance.arrangement.normal,along=instance.arrangement.along;
      const center={x:(basin.minX+basin.maxX)/2,z:(basin.minZ+basin.maxZ)/2};
      const murk=material(0x657a73,{transparent:true,opacity:.38,emissive:0x334b46,emissiveIntensity:.16}),
        deep=material(0x152420),railMat=material(0x57554b),outlineMat=material(0x101b1a);
      box(basin.maxX-basin.minX,.065,basin.maxZ-basin.minZ,center.x,.055,center.z,deep);
      const shadow=new THREE.Group();
      const silhouette=(offset,length,width)=>{
        const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),outlineMat);
        resources.add(mesh.geometry);mesh.scale.set(normal.x?width:length,.055,normal.z?width:length);
        mesh.position.set(along.x*offset,0,along.z*offset);shadow.add(mesh);
      };
      silhouette(0,.62,.38);silhouette(.46,.22,.23);silhouette(-.46,.28,.16);
      shadow.position.set(center.x-along.x*.65,.08,center.z-along.z*.65);
      shadow.name=`story-${instance.instanceId}-outline`;root.add(shadow);
      box(basin.maxX-basin.minX,.018,basin.maxZ-basin.minZ,center.x,.15,center.z,murk);
      const railCenter={x:center.x-normal.x*.82,z:center.z-normal.z*.82};
      box(normal.x?.075:3.1,.09,normal.z?.075:3.1,railCenter.x,.74,railCenter.z,railMat);
      for(const offset of [-1.45,0,1.45])
        box(.075,.72,.075,railCenter.x+along.x*offset,.38,railCenter.z+along.z*offset,railMat);
      moving.push({id:instance.instanceId,type:'B10',shadow,center,along});
    } else if(instance.definitionId==='B18') {
      const garden=new THREE.Group(),neighbor=new THREE.Group();
      garden.name=`story-${instance.instanceId}-garden`;
      neighbor.name=`story-${instance.instanceId}-neighbor`;
      const frame=new THREE.Group();frame.position.set(p.x,0,p.z);
      frame.rotation.y=Math.atan2(instance.window.normal.x,instance.window.normal.z);
      frame.add(garden,neighbor);root.add(frame);neighbor.visible=false;
      const sky=material(0x6c8a87,{emissive:0x435d5c,emissiveIntensity:.34});
      const grass=material(0x3f5a40,{emissive:0x263c28,emissiveIntensity:.25});
      const trunk=material(0x504436),leaves=material(0x385745);
      const facade=material(0x46494d,{emissive:0x262d31,emissiveIntensity:.2});
      const lit=material(0xb9b7a0,{emissive:0x978f70,emissiveIntensity:.65});
      dollPiece(garden,1.08,.98,.025,0,1.9,0,sky);
      dollPiece(garden,1.08,.3,.029,0,1.56,-.02,grass);
      for(const x of [-.33,.32]) {
        dollPiece(garden,.045,.5,.035,x,1.84,-.04,trunk);
        dollPiece(garden,.25,.3,.04,x,2.12,-.055,leaves);
      }
      dollPiece(neighbor,1.08,.98,.03,0,1.9,0,facade);
      for(const x of [-.34,0,.34]) {
        dollPiece(neighbor,.26,.36,.04,x,1.9,-.04,trunk);
        dollPiece(neighbor,.18,.28,.047,x,1.9,-.07,lit);
        dollPiece(neighbor,.018,.3,.052,x,1.9,-.095,facade);
      }
      moving.push({id:instance.instanceId,type:'B18',garden,neighbor});
    } else if(instance.definitionId==='B01') {
      const bloom=material(0xb76d78),leaf=material(0x5d7250),center=material(0xd4ad65);
      const {x,z,normal}=instance.doorFrame,right={x:-normal.z,z:normal.x};
      const flower=(u,y)=>{
        const px=x+right.x*u+normal.x*.12,pz=z+right.z*u+normal.z*.12;
        const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.26,5),leaf);
        resources.add(stem.geometry);stem.position.set(px,y-.14,pz);root.add(stem);
        const core=new THREE.Mesh(new THREE.SphereGeometry(.075,6,4),center);
        resources.add(core.geometry);core.position.set(px,y,pz);root.add(core);
        for(const [du,dv] of [[-.13,0],[.13,0],[0,-.13],[0,.13]]) {
          const petal=new THREE.Mesh(new THREE.SphereGeometry(.095,6,4),bloom);
          resources.add(petal.geometry);petal.position.set(px+right.x*du,y+dv,pz+right.z*du);root.add(petal);
        }
      };
      for(const side of [-1,1])for(const y of [.48,.78,1.1,1.42,1.74,2.07])flower(side*.92,y);
      for(const u of [-.65,-.32,0,.32,.65])flower(u,2.32);
    } else if(instance.definitionId==='B03') {
      const blossom=material(0xc66f79),flowerDark=material(0x252522),leaf=material(0x60734c);
      const wiltLeaf=material(0x343a30),vase=material(0x8b796a),bloom=new THREE.Group(),withered=new THREE.Group();
      bloom.name=`story-${instance.instanceId}-bloom`;withered.name=`story-${instance.instanceId}-withered`;
      const group=new THREE.Group();group.name=`story-${instance.instanceId}-flowers`;
      group.position.set(p.x,0,p.z);root.add(group);
      const part=(parent,w,h,d,x,y,z,mat)=>{const geometry=new THREE.BoxGeometry(w,h,d);resources.add(geometry);
        const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;};
      part(group,.72,.09,.7,0,.48,0,tableWood);
      for(const x of [-.28,.28])for(const z of [-.27,.27])part(group,.065,.46,.065,x,.23,z,tableWood);
      part(bloom,.3,.42,.3,0,.73,0,vase);
      part(withered,.3,.42,.3,0,.73,0,vase);
      group.add(bloom,withered);withered.visible=false;
      for(const [index,position] of [[0,[-.23,.05]],[1,[0,-.14]],[2,[.24,.07]]]) {
        const [x,z]=position,height=1.25+(index%2)*.16;
        part(bloom,.045,height-.94,.045,x/2,(height+.94)/2,z/2,leaf);
        part(withered,.045,height-.94,.045,x/2,(height+.94)/2,z/2,wiltLeaf);
        const flowerMesh=new THREE.Mesh(new THREE.SphereGeometry(.18,7,5),blossom);
        resources.add(flowerMesh.geometry);flowerMesh.position.set(x,height,z);bloom.add(flowerMesh);
        const darkMesh=new THREE.Mesh(new THREE.SphereGeometry(.13,7,5),flowerDark);
        resources.add(darkMesh.geometry);darkMesh.scale.y=.45;darkMesh.position.set(x,height-.11,z);withered.add(darkMesh);
      }
      productionArt.attach({url:'/art/gameplay-production-v01/dry-flower-vase.glb',parent:withered,width:.6,height:.9,depth:.6,position:[0,.525,0],tint:.36,fallback:[...withered.children]});
      moving.push({id:instance.instanceId,type:'B03',bloom,withered});
    } else if(instance.definitionId==='B04') {
      const doll=new THREE.Group();root.add(doll);doll.position.set(p.x,0,p.z);
      doll.rotation.y=Math.atan2(-instance.facing.x,-instance.facing.z);
      dollPiece(doll,.7,.09,.66,0,.45,0,tableWood);dollPiece(doll,.7,.75,.08,0,.8,.29,tableWood);
      for(const x of [-.25,.25])for(const z of [-.22,.22])dollPiece(doll,.06,.43,.06,x,.22,z,tableWood);
      const body=new THREE.Group();doll.add(body);body.position.y=.17;body.scale.setScalar(.68);
      const {intact,torn}=dollBody(body);
      moving.push({id:instance.instanceId,type:'B04',intact,torn});
    } else if(instance.definitionId==='B07') {
      // Local forward points along -Z, fixed at generation time toward the actual entrance.
      const statue=new THREE.Group();root.add(statue);statue.position.set(p.x,0,p.z);
      statue.rotation.y=Math.atan2(-instance.facing.x,-instance.facing.z);
      const piece=(w,h,d,x,y,z,mat)=>{const geometry=new THREE.BoxGeometry(w,h,d);resources.add(geometry);const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;statue.add(mesh);return mesh;};
      piece(.6,.55,.6,0,.275,0,stone);
      piece(.36,1.22,.28,0,1.16,0,stone);
      piece(.38,.43,.36,0,1.98,0,stone);
      piece(.13,.06,.03,-.095,2.01,-.19,face);piece(.13,.06,.03,.095,2.01,-.19,face);
      piece(.08,.17,.07,0,1.93,-.22,face);
    } else if(instance.definitionId==='B08') {
      const display=new THREE.Group();root.add(display);display.position.set(p.x,0,p.z);
      display.rotation.y=Math.atan2(p.x-instance.observation.x,p.z-instance.observation.z);
      const piece=(parent,w,h,d,x,y,z,mat)=>{const geometry=new THREE.BoxGeometry(w,h,d);resources.add(geometry);
        const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;};
      piece(display,2.55,1.08,.78,0,.54,0,stone);
      const heads=[];
      for(const x of [-.78,0,.78]) {
        piece(display,.16,.18,.16,x,1.18,0,stone);
        const head=new THREE.Group();display.add(head);head.position.set(x,1.48,0);
        piece(head,.39,.48,.36,0,0,0,skin);
        piece(head,.09,.045,.025,-.1,.05,-.2,face);piece(head,.09,.045,.025,.1,.05,-.2,face);
        heads.push(head);
      }
      moving.push({id:instance.instanceId,type:'B08',heads});
    } else if(instance.definitionId==='B09') {
      const spiderDark=material(0x191b18),spiderGlint=material(0x686756),group=new THREE.Group(),spiders=[];
      group.name=`story-${instance.instanceId}-spiders`;root.add(group);
      const positions=[[-1.05,-.8],[-.45,.8],[.35,-1.05],[1.05,.55],[-1.2,.35],[.85,-.35],[0,0],[.1,1.2]];
      positions.forEach(([x,z],index)=>{
        const spider=new THREE.Group();group.add(spider);spider.position.set(p.x+x,2.83,p.z+z);
        const abdomen=new THREE.Mesh(new THREE.SphereGeometry(.13,7,5),spiderDark);
        resources.add(abdomen.geometry);abdomen.scale.set(1,.52,1.3);spider.add(abdomen);
        const head=new THREE.Mesh(new THREE.SphereGeometry(.065,6,4),spiderGlint);
        resources.add(head.geometry);head.position.z=-.16;spider.add(head);
        for(const side of [-1,1])for(let leg=0;leg<4;leg++) {
          const mesh=new THREE.Mesh(new THREE.BoxGeometry(.19,.025,.025),spiderDark);
          resources.add(mesh.geometry);mesh.position.set(side*(.18+leg*.015),-.005,-.15+leg*.1);
          mesh.rotation.y=side*(leg-1.5)*.24;spider.add(mesh);
        }
        spiders.push({group:spider,x:p.x+x,z:p.z+z,offset:index*.81});
      });
      moving.push({id:instance.instanceId,type:'B09',spiders});
    } else if(instance.definitionId==='B11') {
      const cabinet=new THREE.Group();root.add(cabinet);cabinet.position.set(p.x,0,p.z);
      cabinet.rotation.y=Math.atan2(instance.normal.x,instance.normal.z);
      const part=(parent,w,h,d,x,y,z,mat)=>{const geometry=new THREE.BoxGeometry(w,h,d);resources.add(geometry);
        const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
      part(cabinet,1.35,.12,.69,0,2.16,0,panel);
      part(cabinet,1.35,.12,.69,0,.06,0,panel);
      part(cabinet,.09,2.12,.69,-.63,1.1,0,panel);part(cabinet,.09,2.12,.69,.63,1.1,0,panel);
      part(cabinet,1.26,2.1,.08,0,1.1,.31,shadow);
      part(cabinet,.6,2.06,.08,-.32,1.1,-.34,panel);
      const open=new THREE.Group();cabinet.add(open);open.position.set(.61,0,-.34);open.rotation.y=1.4;
      part(open,.6,2.06,.08,-.3,1.1,0,panel);
      part(cabinet,.045,.12,.045,-.12,1.12,-.4,stone);
      const insideLight=new THREE.PointLight(0xffdfb8,.3,1.6);insideLight.position.set(.1,1.05,-.24);cabinet.add(insideLight);
      const person=new THREE.Group();cabinet.add(person);person.position.set(.24,.09,-.17);
      const torso=part(person,.48,.5,.32,0,.57,.02,coat);torso.rotation.z=.18;
      const head=part(person,.4,.4,.37,-.1,.96,-.05,skin);head.rotation.z=.18;
      part(person,.07,.04,.025,-.22,.98,-.25,face);part(person,.07,.04,.025,-.04,1.0,-.25,face);
      for(const side of [-1,1]) {
        part(person,.18,.2,.38,side*.14,.27,-.12,coat);
        part(person,.16,.3,.19,side*.14,.15,-.26,coat);
        part(person,.15,.38,.2,side*.3,.56,-.13,coat);
      }
      moving.push({id:instance.instanceId,type:'B11',person});
    } else if(instance.definitionId==='B12') {
      const figure=new THREE.Group();root.add(figure);figure.position.set(p.x,0,p.z);
      figure.name=`story-${instance.instanceId}-theme`;
      figure.rotation.y=Math.atan2(-(instance.observation.x-p.x),-(instance.observation.z-p.z));
      const part=(w,h,d,x,y,z,mat)=>{const geometry=new THREE.BoxGeometry(w,h,d);resources.add(geometry);
        const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;figure.add(mesh);return mesh;};
      part(.39,.78,.24,0,1.05,0,shadow);
      part(.3,.35,.26,0,1.62,-.02,coat);
      for(const side of [-1,1]) {
        part(.13,.7,.18,side*.11,.36,0,shadow);
        part(.12,.65,.15,side*.26,1.06,0,shadow);
      }
      part(.055,.04,.025,-.085,1.63,-.17,skin);part(.055,.04,.025,.085,1.63,-.17,skin);
      moving.push({id:instance.instanceId,type:'B12',figure,origin:p,destination:instance.finalFocus});
    } else if(instance.definitionId==='B22') {
      const {wall,normal}=instance.slot,alongX=normal.z!==0;
      const at=(depth)=>({x:wall.x-normal.x*depth,z:wall.z-normal.z*depth});
      const frame=at(.12);
      box(alongX?1.38:.07,2.28,alongX?.07:1.38,frame.x,1.22,frame.z,panel);
      const gap=at(.195);
      box(alongX?1.22:.045,.15,alongX?.045:1.22,gap.x,.15,gap.z,shadow);
      const shoes=new THREE.Group();root.add(shoes);
      shoes.position.set(p.x,0,p.z);
      shoes.rotation.y=Math.atan2(-normal.x,-normal.z);
      for(const side of [-1,1]) {
        const geometry=new THREE.BoxGeometry(.26,.13,.46);resources.add(geometry);
        const foot=new THREE.Mesh(geometry,shoe);
        foot.position.set(side*.23,.105,0);foot.castShadow=true;shoes.add(foot);
      }
      moving.push({id:instance.instanceId,shoes,origin:{x:p.x,z:p.z},normal});
    } else if(instance.definitionId==='B25') {
      const room=plan.rooms.find(r=>r.id===instance.roomId),cx=room.center[0]*plan.cellSize,cz=room.center[1]*plan.cellSize;
      box(2.2,.012,1.6,cx,.012,cz,rug);
      box(.85,.05,.85,cx,2.95,cz,warm);
      if(instance.quietVariant) {
        const group=new THREE.Group();group.name=`quiet-${instance.instanceId}-${instance.quietVariant}`;
        group.position.set(p.x,0,p.z);group.rotation.y=instance.yaw;root.add(group);
        const piece=(w,h,d,x,y,z,mat)=>dollPiece(group,w,h,d,x,y,z,mat);
        piece(1.5,.08,.22,0,.89,0,tableWood);
        for(const x of [-.6,.6])piece(.06,.85,.20,x,.43,0,tableWood);
        const cup=(x,z)=>{
          const geometry=new THREE.CylinderGeometry(.07,.055,.12,12,1,true);resources.add(geometry);
          const mesh=new THREE.Mesh(geometry,warm);mesh.position.set(x,1,z);group.add(mesh);
          piece(.19,.015,.17,x,.94,z,stone);
        };
        if(['tea','place-setting'].includes(instance.quietVariant)) {
          cup(-.38,0);cup(.38,0);
          if(instance.quietVariant==='place-setting')cup(0,0);
          else {piece(.2,.02,.22,0,.95,0,panel);piece(.16,.015,.19,.02,.97,0,photoBase);}
        } else if(instance.quietVariant==='letters') {
          for(let i=0;i<4;i++)piece(.3,.012,.2,-.3+i*.08,.94+i*.015,0,warm);
          piece(.2,.3,.05,.4,1.08,0,panel);piece(.15,.24,.012,.4,1.08,.031,photoBase);
        } else {
          for(const [index,x] of [-.38,.38].entries()) {
            piece(.36,.4,.08,x,1.15,0,panel);piece(.3,.34,.012,x,1.15,.047,warm);
            piece(.018,.12,.018,x,1.2,.06,shadow);
            const hand=piece(.12,.018,.018,x+(index?-.05:.05),1.15,.06,shadow);
            hand.rotation.z=index?.5:0;
          }
        }
        const light=new THREE.PointLight(0xffd6a1,1.8,4,2);
        light.position.set(0,1.9,.7);group.add(light);
      }
    } else if(instance.definitionId==='TI02') {
      const actor=new THREE.Group();root.add(actor);actor.position.set(p.x,0,p.z);
      actor.rotation.y=Math.atan2(instance.observation.x-p.x,instance.observation.z-p.z);
      const piece=(parent,w,h,d,x,y,z,mat)=>{const geometry=new THREE.BoxGeometry(w,h,d);resources.add(geometry);const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;};
      piece(actor,.54,.85,.28,0,1.2,0,coat);
      for(const side of [-1,1]) {piece(actor,.18,.75,.2,side*.18,.4,0,coat);piece(actor,.14,.7,.16,side*.37,1.16,0,coat);}
      const head=new THREE.Group();actor.add(head);head.position.y=1.82;
      piece(head,.32,.4,.3,0,0,0,skin);piece(head,.08,.08,.04,0,0,-.17,skin);
      moving.push({id:instance.instanceId,head,type:'TI02'});
      const fan=new THREE.Group();root.add(fan);fan.position.set(p.x,2.91,p.z);
      for(let i=0;i<3;i++){const blade=piece(fan,.1,.025,1.05,0,0,-.42,coat);blade.rotation.y=i*Math.PI*2/3;blade.position.set(Math.sin(blade.rotation.y)*.42,0,-Math.cos(blade.rotation.y)*.42);}
      ambient.push(fan);
    } else if(instance.definitionId==='TI03') {
      const {right}=instance.arrangement;
      const part=(parent,w,h,d,x,y,z,mat)=>{const geometry=new THREE.BoxGeometry(w,h,d);resources.add(geometry);
        const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;};
      box(.95,.12,.95,p.x,.78,p.z,tableWood);
      for(const x of [-.36,.36])for(const z of [-.36,.36])box(.09,.72,.09,p.x+x,.36,p.z+z,tableWood);
      instance.people.forEach((point,index)=>{
        const actor=new THREE.Group();actor.name=`story-${instance.instanceId}-actor-${index}`;
        root.add(actor);actor.position.set(point.x,0,point.z);
        actor.rotation.y=Math.atan2(-(instance.observation.x-point.x),-(instance.observation.z-point.z));
        part(actor,.38,.78,.25,0,1.03,0,coat);
        part(actor,.29,.36,.26,0,1.6,-.02,skin);
        for(const side of [-1,1])part(actor,.12,.72,.17,side*.12,.35,0,coat);
        const arm=part(actor,.12,.64,.17,index===0?-.25:.25,1.25,-.09,coat);
        arm.rotation.z=index===0?-.65:.65;
        part(actor,.07,.05,.025,-.08,1.63,-.17,face);
        part(actor,.07,.05,.025,.08,1.63,-.17,face);
      });
      const held=new THREE.Group();root.add(held);held.position.set(p.x+right.x*.5,1.25,p.z+right.z*.5);
      held.rotation.z=.32;
      part(held,.22,.3,.22,0,0,0,stone);
      const spinner=new THREE.Group();spinner.name=`story-${instance.instanceId}-spinner`;
      root.add(spinner);spinner.position.set(p.x,.99,p.z);
      const cone=new THREE.ConeGeometry(.19,.34,5);resources.add(cone);
      const ornament=new THREE.Mesh(cone,warm);ornament.position.y=.17;ornament.castShadow=true;spinner.add(ornament);
      part(spinner,.1,.05,.24,.15,.22,0,face);
      moving.push({id:instance.instanceId,type:'TI03',spinner});
    } else if(instance.definitionId==='RI02') {
      const {forward,right,places}=instance.arrangement,alongX=right.x!==0;
      box(alongX?2.2:.85,.16,alongX?.85:2.2,p.x,1.08,p.z,tableWood);
      for(const u of [-.8,.8])for(const v of [-.26,.26])
        box(.1,1,.1,p.x+right.x*u+forward.x*v,.5,p.z+right.z*u+forward.z*v,tableWood);
      const liked=new THREE.Group();liked.name=`story-${instance.instanceId}-liked`;
      root.add(liked);liked.position.set(p.x,1.17,p.z);
      if(instance.likedObject==='cat') {
        const catFur=material(0xc8bba4);
        dollPiece(liked,.43,.3,.28,0,.22,0,catFur);
        dollPiece(liked,.28,.26,.23,0,.49,-.11,catFur);
        for(const x of [-.09,.09])dollPiece(liked,.075,.12,.07,x,.66,-.12,catFur);
        dollPiece(liked,.1,.2,.09,.25,.37,.12,catFur);
      } else {
        const blossom=material(0xc66f79),leaf=material(0x60734c),vase=material(0x8b796a);
        dollPiece(liked,.28,.32,.28,0,.16,0,vase);
        for(const [x,z] of [[-.18,0],[.03,-.14],[.2,.08]]) {
          dollPiece(liked,.035,.4,.035,x/2,.49,z/2,leaf);
          const head=new THREE.Mesh(new THREE.SphereGeometry(.16,7,5),blossom);
          resources.add(head.geometry);head.position.set(x,.72,z);liked.add(head);
        }
      }
      for(const key of ['far','left','right']) {
        const position=places[key],person=new THREE.Group();root.add(person);
        person.position.set(position.x,0,position.z);
        person.rotation.y=Math.atan2(-(p.x-position.x),-(p.z-position.z));
        dollPiece(person,.43,.44,.3,0,.52,0,coat);
        dollPiece(person,.25,.25,.24,0,.87,-.09,skin);
        for(const x of [-.15,.15])dollPiece(person,.14,.34,.2,x,.17,.13,coat);
      }
    } else if(instance.definitionId==='RI01'||instance.definitionId==='B06') {
      const {forward,right,places}=instance.arrangement,alongX=right.x!==0;
      const heads=[];
      const part=(parent,w,h,d,x,y,z,mat)=>{const geometry=new THREE.BoxGeometry(w,h,d);resources.add(geometry);const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
      box(alongX?2.2:.85,.13,alongX?.85:2.2,p.x,.82,p.z,tableWood);
      for(const u of [-.85,.85]) for(const v of [-.28,.28]) {
        const x=p.x+right.x*u+forward.x*v,z=p.z+right.z*u+forward.z*v;
        box(.12,.76,.12,x,.38,z,tableWood);
      }
      const chair=(position,occupied)=>{
        const group=new THREE.Group();root.add(group);group.position.set(position.x,0,position.z);
        group.rotation.y=Math.atan2(p.x-position.x,p.z-position.z)+Math.PI;
        part(group,.58,.09,.5,0,.45,0,tableWood);
        part(group,.58,.65,.08,0,.72,.27,tableWood);
        for(const x of [-.22,.22]) for(const z of [-.17,.17]) part(group,.07,.42,.07,x,.21,z,tableWood);
        if(occupied) {
          part(group,.39,.5,.24,0,.78,0,coat);
          const headPivot=new THREE.Group();group.add(headPivot);headPivot.position.set(0,1.13,-.03);
          const head=new THREE.SphereGeometry(instance.definitionId==='B06'?.27:.19,8,6);resources.add(head);
          const mesh=new THREE.Mesh(head,skin);headPivot.add(mesh);
          part(headPivot,.08,.11,.035,0,-.035,instance.definitionId==='B06'?-.27:-.19,face);
          if(instance.definitionId==='B06') {
            for(const side of [-1,1])part(headPivot,.085,.06,.025,side*.1,.07,-.272,face);
            const dx=instance.observation.x-position.x,dz=instance.observation.z-position.z;
            let end=Math.atan2(-dx,-dz)-group.rotation.y;
            end=Math.atan2(Math.sin(end),Math.cos(end));
            const start=end+1.1;headPivot.rotation.y=start;heads.push({pivot:headPivot,start,end});
          }
        }
        return group;
      };
      const empty=chair(places.empty,instance.definitionId==='B06');
      for(const key of ['far','left','right']) chair(places[key],true);
      if(instance.definitionId==='RI01')moving.push({id:instance.instanceId,type:'RI01',chair:empty,origin:places.empty,forward});
      else moving.push({id:instance.instanceId,type:'B06',heads});
    } else if(instance.definitionId==='IN01') {
      const mold=material(0x3d5840),darkMold=material(0x1b2920);
      const crack=new THREE.Group();crack.name=`story-${instance.instanceId}-crack`;
      root.add(crack);
      crack.position.set(instance.slot.wall.x-instance.slot.normal.x*.1,0,
        instance.slot.wall.z-instance.slot.normal.z*.1);
      const along={x:-instance.slot.normal.z,z:instance.slot.normal.x};
      for(const [u,y,height] of [[0,.55,.94],[-.16,.43,.48],[.14,.27,.38]]) {
        const stem=new THREE.Mesh(new THREE.CylinderGeometry(.018,.026,height,5),darkMold);
        resources.add(stem.geometry);stem.position.set(along.x*u,y,along.z*u);crack.add(stem);
      }
      const spread=new THREE.Group();spread.name=`story-${instance.instanceId}-spread`;
      root.add(spread);spread.visible=false;
      const surface=instance.furnitureFocus,face=instance.furnitureFace,bounds=instance.furnitureBounds;
      const width=face.x?bounds.maxZ-bounds.minZ:bounds.maxX-bounds.minX;
      const span=Math.min(width*.35,.6);
      for(const [side,y,size] of [[-.9,.36,.34],[-.55,.82,.48],[-.12,.52,.42],[.36,1.1,.52],[.83,.67,.37],[-.7,1.56,.28],[.48,1.82,.31]]) {
        const offset=side*span,x=surface.x+(face.z?offset:0),z=surface.z+(face.x?offset:0);
        dollPiece(spread,face.x?.045:size,size*.72,face.z?.045:size,x,y,z,mold);
      }
      for(const [side,height] of [[-.8,.8],[-.34,1.35],[0,1.65],[.48,1.2],[.87,.9]]) {
        const offset=side*span,x=surface.x+(face.z?offset:0),z=surface.z+(face.x?offset:0);
        dollPiece(spread,face.x?.052:.045,height,face.z?.052:.045,x,bounds.height*.44,z,darkMold);
      }
      const tip=dollPiece(spread,.055,.65,.055,surface.x,surface.y+.32,surface.z,mold);
      const line=(from,to,mat,radius)=>{
        const start=new THREE.Vector3(from.x,.035,from.z),end=new THREE.Vector3(to.x,.035,to.z);
        const distance=start.distanceTo(end),geometry=new THREE.CylinderGeometry(radius,radius,distance,5);
        resources.add(geometry);const mesh=new THREE.Mesh(geometry,mat);
        mesh.position.copy(start).add(end).multiplyScalar(.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());
        spread.add(mesh);
      };
      const origin={x:instance.slot.wall.x-instance.slot.normal.x*.5,
        z:instance.slot.wall.z-instance.slot.normal.z*.5};
      for(const offset of [-.12,0,.12])line({x:origin.x+along.x*offset,z:origin.z+along.z*offset},
        {x:surface.x+along.x*offset,z:surface.z+along.z*offset},offset===0?mold:darkMold,.015);
      moving.push({id:instance.instanceId,type:'IN01',spread,tip});
    } else if(instance.definitionId==='ID02') {
      const figure=new THREE.Group();figure.name=`story-${instance.instanceId}-figure`;
      root.add(figure);figure.position.set(p.x,0,p.z);
      figure.rotation.y=Math.atan2(instance.observation.x-p.x,instance.observation.z-p.z);
      const left=new THREE.Group(),right=new THREE.Group();figure.add(left,right);
      left.position.set(-.13,.82,0);right.position.set(.13,.82,0);
      dollPiece(left,.13,.75,.16,0,-.36,0,coat);dollPiece(right,.13,.75,.16,0,-.36,0,coat);
      dollPiece(figure,.43,.8,.28,0,1.18,0,coat);
      dollPiece(figure,.32,.34,.29,0,1.76,0,skin);
      for(const x of [-.3,.3])dollPiece(figure,.12,.72,.16,x,1.19,0,coat);
      for(const x of [-.08,.08])dollPiece(figure,.045,.025,.012,x,1.8,-.151,face);
      moving.push({id:instance.instanceId,type:'ID02',figure,left,right,origin:{x:p.x,z:p.z}});
    } else if(instance.definitionId==='ID03') {
      const oldPaper=material(0x8a7455),newPaper=material(0x65717b),oldCloth=material(0x40362f),newCloth=material(0x273641);
      const part=(parent,w,h,d,x,y,z,mat)=>{const geometry=new THREE.BoxGeometry(w,h,d);resources.add(geometry);
        const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
      instance.photos.forEach((photo,index)=>{
        const frame=new THREE.Group();frame.name=`story-${instance.instanceId}-photo-${index}`;
        root.add(frame);frame.position.set(photo.wall.x-instance.slot.normal.x*.18,1.65,
          photo.wall.z-instance.slot.normal.z*.18);
        frame.rotation.y=Math.atan2(instance.slot.normal.x,instance.slot.normal.z);
        const width=index===0?1.05:1.35,height=index===0?1.2:.95;
        part(frame,width,height,.08,0,0,0,tableWood);
        part(frame,width-.12,height-.12,.012,0,0,-.051,index===0?oldPaper:newPaper);
        const people=index===0?[-.22,.22]:[-.34,0,.34];
        people.forEach((x,personIndex)=>{
          const figure=new THREE.Group();frame.add(figure);figure.position.x=x;
          const bodyHeight=index===0?.37:.29;
          part(figure,index===0?.25:.21,bodyHeight,.012,0,-.25,-.071,index===0?oldCloth:newCloth);
          const faceGroup=new THREE.Group();faceGroup.name=`story-${instance.instanceId}-same-face-${index}-${personIndex}`;
          figure.add(faceGroup);faceGroup.position.set(0,.11,-.078);
          part(faceGroup,.18,.2,.012,0,0,0,skin);
          part(faceGroup,.03,.025,.013,-.048,.022,-.013,face);
          part(faceGroup,.03,.025,.013,.048,.022,-.013,face);
          part(faceGroup,.08,.016,.013,0,-.055,-.013,face);
        });
      });
    } else if(instance.definitionId==='AB02'||instance.definitionId==='B05') {
      const {wall,normal}=instance.slot,frame=new THREE.Group();root.add(frame);
      frame.name=`story-${instance.instanceId}-photo`;
      frame.position.set(wall.x-normal.x*.18,1.65,wall.z-normal.z*.18);
      frame.rotation.y=Math.atan2(normal.x,normal.z);
      const part=(parent,w,h,d,x,y,z,mat)=>{const geometry=new THREE.BoxGeometry(w,h,d);resources.add(geometry);const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
      part(frame,1.75,1.16,.08,0,0,0,tableWood);
      part(frame,1.59,1,.012,0,0,-.051,photoBase);
      const faces=[];
      const person=(x,center)=>{
        const group=new THREE.Group();frame.add(group);group.position.x=x;
        part(group,.28,.42,.01,0,-.22,-.067,photoFigure);
        if(instance.definitionId==='B05') {
          const intact=new THREE.Group(),scratched=new THREE.Group();
          intact.name=`story-${instance.instanceId}-face-${faces.length}-intact`;
          scratched.name=`story-${instance.instanceId}-face-${faces.length}-scratched`;
          group.add(intact,scratched);
          part(intact,.23,.23,.012,0,.14,-.073,skin);
          part(intact,.035,.025,.014,-.055,.16,-.084,face);
          part(intact,.035,.025,.014,.055,.16,-.084,face);
          part(scratched,.23,.23,.012,0,.14,-.073,photoFigure);
          for(const [offset,tilt] of [[-.065,.35],[0,-.28],[.065,.22]]) {
            const mark=part(scratched,.27,.022,.014,0,.14+offset,-.084,stone);mark.rotation.z=tilt;
          }
          scratched.visible=false;faces.push({intact,scratched});
        } else part(group,.23,.23,.01,0,.14,-.067,photoFigure);
        if(!center) part(group,.27,.06,.01,x<0?.2:-.2,-.07,-.069,photoFigure);
        return group;
      };
      person(-.48,false);const missing=person(0,true);person(.48,false);
      moving.push(instance.definitionId==='B05'?{id:instance.instanceId,type:'B05',faces}
        :{id:instance.instanceId,type:'AB02',missing});
    }
  }
  for(const slot of plan.content?.conditionalSlots??[]) {
    if(slot.id==='IN04') {
      const bedside=petalPatch(slot.focus,'story-IN04-bedside');bedside.visible=false;
      moving.push({id:'IN04',type:'IN04-bedside',bedside});
    } else if(slot.id==='B28') {
      const doll=new THREE.Group();doll.name='story-B28';root.add(doll);doll.position.set(slot.focus.x,0,slot.focus.z);
      doll.rotation.y=-.36;doll.scale.setScalar(.68);
      const {intact,torn}=dollBody(doll);intact.visible=false;torn.visible=true;doll.visible=false;
      moving.push({id:'B28',type:'B28',doll});
    } else if(slot.id==='B27') {
      const flowers=new THREE.Group();flowers.name='story-B27';root.add(flowers);
      flowers.position.set(slot.focus.x,0,slot.focus.z);flowers.visible=false;
      const bloom=material(0xc66f79),leaf=material(0x60734c),vase=material(0x8b796a);
      dollPiece(flowers,.72,.09,.7,0,.48,0,tableWood);
      for(const x of [-.28,.28])for(const z of [-.27,.27])dollPiece(flowers,.065,.46,.065,x,.23,z,tableWood);
      dollPiece(flowers,.3,.42,.3,0,.73,0,vase);
      for(const [index,[x,z]] of [[0,[-.23,.05]],[1,[0,-.14]],[2,[.24,.07]]]) {
        const height=1.25+(index%2)*.16;
        dollPiece(flowers,.045,height-.94,.045,x/2,(height+.94)/2,z/2,leaf);
        const head=new THREE.Mesh(new THREE.SphereGeometry(.18,7,5),bloom);
        resources.add(head.geometry);head.position.set(x,height,z);flowers.add(head);
      }
      moving.push({id:'B27',type:'B27',flowers});
    }
  }
  return {
    renderScreens(renderer) {
      for(const monitor of monitors) {
        if(monitor.rendered)continue;
        const previous=renderer.getRenderTarget();
        monitor.screen.visible=false;monitor.real.visible=false;monitor.alternate.visible=true;
        monitor.captureLight.visible=true;
        try {
          renderer.setRenderTarget(monitor.target);
          renderer.clear();renderer.render(scene,monitor.camera);
          monitor.rendered=true;
        } finally {
          renderer.setRenderTarget(previous);
          monitor.alternate.visible=false;monitor.real.visible=true;monitor.screen.visible=true;
          monitor.captureLight.visible=false;
        }
      }
    },
    update(story) {
      for(const item of moving) {
        if(item.type==='B06') {const progress=story.instances?.[item.id]?.progress??0;
          for(const head of item.heads)head.pivot.rotation.y=head.start+(head.end-head.start)*progress;continue;}
        if(item.type==='ME02') {const phase=story.instances?.[item.id];
          const pose=phase?.actorPose;
          if(pose) {item.avatar.position.set(pose.x,0,pose.z);item.avatar.rotation.y=pose.yaw;}
          item.head.rotation.y=Math.min(1,Math.max(0,((phase?.progress??0)-.8)/1.8))*.95;
          item.mirrorLight.target.position.set(item.avatar.position.x,1.1,item.avatar.position.z);
          continue;}
        if(item.type==='BO02') {const phase=story.instances?.[item.id];
          const distance=(phase?.progress??0)*item.headDistance;
          item.head.position.set(item.origin.x+item.along.x*distance,1.68,
            item.origin.z+item.along.z*distance);
          for(const [index,segment] of item.segments.entries()) {
            const offset=distance-(index+1)*.58;
            segment.position.set(item.origin.x+item.along.x*offset,0,
              item.origin.z+item.along.z*offset);
            segment.visible=phase?.phase==='passing'||phase?.phase==='passed';
            segment.rotation.y=Math.sin((phase?.progress??0)*Math.PI*2-index*.35)*.035;
          }
          continue;}
        if(item.type==='AB04') {const phase=story.instances?.[item.id];
          const progress=Math.max(0,Math.min(1,phase?.progress??0));
          const easing=progress*progress*(3-2*progress),position=item.duvet.geometry.attributes.position;
          for(let index=0;index<position.count;index++) {
            const u=item.base[index*3],v=item.base[index*3+1];
            const torso=Math.exp(-((u/.42)**2)-(((v+.05)/.66)**2))*.5;
            const head=Math.exp(-((u/.23)**2)-(((v+.68)/.25)**2))*.24;
            const depression=Math.exp(-((u/.42)**2)-(((v+.05)/.62)**2))*(-.026);
            position.setZ(index,(torso+head)*(1-easing)+depression*easing);
          }
          position.needsUpdate=true;item.duvet.geometry.computeVertexNormals();
          item.indent.visible=progress>.85;
          continue;}
        if(item.type==='IN04') {const phase=story.instances?.[item.id];
          item.follow.visible=['followVisible','followSeen'].includes(phase?.phase);
          continue;}
        if(item.type==='IN04-bedside') {
          item.bedside.visible=!!story.conditional?.IN04?.enabled;continue;}
        if(item.type==='IN02') {const phase=story.instances?.[item.id],elapsed=phase?.elapsed??0;
          item.dolls.forEach((doll,index)=>{
            const age=elapsed-index*1.05;
            if(phase?.phase!=='pouring'||age<0) {doll.visible=false;return;}
            const progress=Math.min(1,age/2.6),lateral=Math.sin(index*2.4)*.28*progress;
            doll.visible=true;
            doll.position.set(item.origin.x+item.inward.x*(.05+(1.1+index*.08)*progress)-item.inward.z*lateral,
              .46-.35*progress,
              item.origin.z+item.inward.z*(.05+(1.1+index*.08)*progress)+item.inward.x*lateral);
            doll.rotation.y=Math.sin(Math.min(age,2.6)*2+index)*.17;
          });
          continue;}
        if(item.type==='IN03') {const phase=story.instances?.[item.id];
          const stages=[phase?.progress??0,phase?.wallProgress??0,phase?.doorProgress??0];
          const visible=[true,['wallReady','wallSeeping','doorReady','doorSeeping','complete'].includes(phase?.phase),
            ['doorReady','doorSeeping','complete'].includes(phase?.phase)];
          item.patches.forEach((patch,index)=>{
            patch.visible=visible[index];
            const size=.22+Math.max(0,Math.min(1,stages[index]))*.78;
            patch.scale.set(size,size,1);
          });
          item.runoff.visible=item.crevice.visible=visible[1];
          item.doorRunoff.visible=visible[2];
          continue;}
        if(item.type==='B11') {const phase=story.instances?.[item.id];
          item.person.scale.y=phase?.phase==='breathing'?1+Math.sin((phase.progress??0)*Math.PI*2)*.035:1;continue;}
        if(item.type==='B12') {const progress=story.instances?.[item.id]?.progress??0;
          item.figure.position.set(item.origin.x+(item.destination.x-item.origin.x)*progress,0,
            item.origin.z+(item.destination.z-item.origin.z)*progress);continue;}
        if(item.type==='IN01') {const phase=story.instances?.[item.id];
          item.spread.visible=['spread','spreadSeen'].includes(phase?.phase);
          item.tip.scale.y=.25+(phase?.progress??0)*.75;continue;}
        if(item.type==='ID02') {const phase=story.instances?.[item.id];
          item.figure.position.set(item.origin.x+(phase?.offsetX??0),0,item.origin.z+(phase?.offsetZ??0));
          item.figure.rotation.y=phase?.backYaw??item.figure.rotation.y;
          const gait=phase?.moving?Math.sin((phase.walkTime??0)*12)*.3:0;
          item.left.rotation.x=gait;item.right.rotation.x=-gait;continue;}
        if(item.type==='TI03') {item.spinner.rotation.y=(story.instances?.[item.id]?.progress??0)*2.3;continue;}
        if(item.type==='B28') {item.doll.visible=!!story.conditional?.B28?.enabled;continue;}
        if(item.type==='B27') {item.flowers.visible=!!story.conditional?.B27?.enabled;continue;}
        if(item.type==='B03') {const phase=story.instances?.[item.id]?.phase;
          const dead=['withered','witheredSeen'].includes(phase);item.bloom.visible=!dead;item.withered.visible=dead;continue;}
        if(item.type==='B04') {const phase=story.instances?.[item.id]?.phase;
          const broken=['torn','tearSeen'].includes(phase);item.intact.visible=!broken;item.torn.visible=broken;continue;}
        if(item.type==='B08') {const angle=story.instances?.[item.id]?.headTurn??0;for(const head of item.heads)head.rotation.y=angle;continue;}
        if(item.type==='B09') {const progress=story.instances?.[item.id]?.progress??0;
          for(const spider of item.spiders)spider.group.position.set(spider.x+Math.sin(progress+spider.offset)*.18,2.83,
            spider.z+Math.cos(progress*.8+spider.offset)*.15);continue;}
        if(item.type==='AB01') {const phase=story.instances?.[item.id];
          const gone=['absent','revisited'].includes(phase?.phase);item.cats.visible=!gone;item.traces.visible=gone;
          item.water.scale.setScalar(gone?1+Math.sin((phase?.progress??0)*4)*.025:1);continue;}
        if(item.type==='B18') {const changed=['changed','revisited'].includes(story.instances?.[item.id]?.phase);
          item.garden.visible=!changed;item.neighbor.visible=changed;continue;}
        if(item.type==='B10') {const progress=story.instances?.[item.id]?.progress??0;
          item.shadow.position.set(item.center.x+item.along.x*(-.65+progress*1.3),.08,
            item.center.z+item.along.z*(-.65+progress*1.3));continue;}
        if(item.type==='BO01') {const progress=story.instances?.[item.id]?.progress??0;
          item.gaze.position.x=.23*(1-progress);continue;}
        if(item.type==='BO03') {const progress=story.instances?.[item.id]?.progress??0;
          const bulge=(1-Math.cos(progress*Math.PI/3))*.09;
          for(const panel of item.panels) {
            const position=panel.mesh.geometry.attributes.position;
            for(let index=0;index<position.count;index++) {
              const x=panel.base[index*3],y=panel.base[index*3+1];
              const taper=Math.cos(x/panel.width*Math.PI)*Math.cos(y/panel.height*Math.PI);
              position.setZ(index,bulge*Math.max(0,taper));
            }
            position.needsUpdate=true;panel.mesh.geometry.computeVertexNormals();
          }
          continue;}
        if(item.type==='ME04') {const progress=story.instances?.[item.id]?.progress??0;
          item.projection.scale.x=1+Math.sin(progress*Math.PI/2)*.11;continue;}
        if(item.type==='BO04') {item.bendingLeg.rotation.z=-(story.instances?.[item.id]?.progress??0)*.42;continue;}
        if(item.type==='TI02') {const elapsed=story.instances?.[item.id]?.progress??0;item.head.rotation.y=Math.sin(elapsed*Math.PI)*.9;continue;}
        if(item.type==='RI01') {const progress=story.instances?.[item.id]?.progress??0;item.chair.position.set(item.origin.x-item.forward.x*progress*.6,0,item.origin.z-item.forward.z*progress*.6);continue;}
        if(item.type==='AB02') {const phase=story.instances?.[item.id]?.phase;item.missing.visible=!['absent','revisited'].includes(phase);continue;}
        if(item.type==='B05') {const changed=['scratched','revisited'].includes(story.instances?.[item.id]?.phase);
          for(const face of item.faces){face.intact.visible=!changed;face.scratched.visible=changed;}continue;}
        const progress=story.instances?.[item.id]?.progress??0;
        item.shoes.position.set(item.origin.x+item.normal.x*progress*.45,0,item.origin.z+item.normal.z*progress*.45);
        item.shoes.visible=progress<1;
      }
    },
    updateAmbient(dt) {for(const fan of ambient) fan.rotation.y+=dt*.35;},
  };
}
