import * as THREE from 'three';
import { createWorld } from './world.js';
import { contentEligibility } from './planning/content-catalog.js';
import { buildNavigation, pathThroughTiles } from './planning/validate.js';
import { roomIdAt, sightClear } from './story/spatial.js';
import { createStoryState, stepContent } from './story/runtime.js';

// Explicit query-only inspection scene; it has no connection to the run state.
export function startPreview({renderer,plan,id,runSeed=plan.seed}) {
  document.getElementById('menu').hidden=true;
  const panel=document.createElement('aside');
  panel.style.cssText='position:fixed;top:65px;left:24px;z-index:8;padding:14px 18px;background:#101917e8;color:#e1e7d8;font:14px/1.6 sans-serif;max-width:380px';
  document.body.append(panel);
  const title=document.createElement('strong'),status=document.createElement('p'),link=document.createElement('a');
  title.textContent=`${id} · 独立灰盒预览`;
  link.textContent='返回正常游戏';link.href=`/?seed=${encodeURIComponent(runSeed)}`;link.style.color='#b4d8b3';
  panel.append(title,status,link);
  const conditional=['B27','B28'].includes(id);
  const slot=conditional?plan.content?.conditionalSlots.find(slot=>slot.id===id):null;
  const eligibility=contentEligibility(id,{allowConditional:conditional||id==='IN04',
    preferences:plan.content?.preferences??[]});
  const instance=slot?{...slot,instanceId:id,readiness:'conditional-greybox',
    observation:{x:1.2,z:-1.5,y:1.65}}:
    plan.content?.instances.find(i=>i.definitionId===id);
  if(!eligibility.accepted||!instance) {
    status.textContent=`不可预览：${eligibility.accepted?plan.content?.report.find(r=>r.id===id)?.reason??'本图无落位':eligibility.reason}`;
    return;
  }
  document.getElementById('location').textContent=instance.roomId;
  status.textContent=`种子 ${runSeed} · ${instance.roomId} · ${instance.readiness} · 正常地图绑定已验证`;
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x111916);scene.fog=new THREE.Fog(0x111916,9,24);
  const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.06,40);
  const from={...instance.observation},to=instance.definitionId==='B07'?{...instance.focus,y:1.55}:{...instance.focus};
  if(id==='B19')Object.assign(from,instance.entryObservation);
  if(id==='BO01'||id==='ME03') {
    const vx=from.x-to.x,vz=from.z-to.z,length=Math.hypot(vx,vz),boxes=[...plan.walls,...plan.obstacles];
    const graph=buildNavigation(plan);
    for(const distance of [3.2,4,4.8]) {
      const point={x:to.x+vx/length*distance,z:to.z+vz/length*distance,y:1.65};
      if(roomIdAt(plan,point)!==instance.roomId||!sightClear(point,to,boxes)
        ||!pathThroughTiles(plan,instance.observation,point,[],graph))continue;
      Object.assign(from,point);break;
    }
  }
  camera.position.set(from.x,from.y??1.65,from.z);
  const dx=to.x-from.x,dz=to.z-from.z,dy=(to.y??1.65)-(from.y??1.65);
  camera.rotation.order='YXZ';camera.rotation.set(Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(-dx,-dz),0);
  const lamp=new THREE.SpotLight(0xffe6b8,46,20,Math.PI/7,.5,1.25);
  lamp.position.set(.14,-.15,-.12);lamp.target.position.set(0,-.08,-6);camera.add(lamp,lamp.target);
  scene.add(camera);
  const world=createWorld(scene,plan),story=createStoryState(),boxes=world.getColliders();
  if(conditional) {
    story.conditional[id]={enabled:true,phase:'waiting',exposure:0,
      sourceInstanceId:slot.sourceInstanceId};
    story.consumed.push('flow.falseWake');
  }
  let nearB12=null;
  if(id==='B12') {
    const room=plan.rooms.find(item=>item.id===instance.roomId),door=plan.doors.find(item=>item.id===instance.sideDoorId);
    const doorVisual=door&&{height:2.4,
      minX:door.x-(door.axis==='x'?.08:.8),maxX:door.x+(door.axis==='x'?.08:.8),
      minZ:door.z-(door.axis==='x'?.8:.08),maxZ:door.z+(door.axis==='x'?.8:.08)};
    const sightBoxes=[...boxes.filter(item=>item.id!==`${instance.instanceId}-figure`),...(doorVisual?[doorVisual]:[])];
    const graph=buildNavigation(plan);
    const candidates=room.cells.map(([x,z])=>({x:x*plan.cellSize,z:z*plan.cellSize,y:1.65})).filter(point=>{
      const distance=Math.hypot(point.x-instance.focus.x,point.z-instance.focus.z);
      return distance>=3&&distance<=5.3
        &&pathThroughTiles(plan,instance.observation,point,[],graph)
        &&sightClear(point,instance.focus,sightBoxes);
    });
    nearB12=candidates.sort((a,b)=>
      Math.abs(Math.hypot(a.x-instance.focus.x,a.z-instance.focus.z)-3.5)
      -Math.abs(Math.hypot(b.x-instance.focus.x,b.z-instance.focus.z)-3.5))[0]??null;
  }
  let leaveButton=null;
  if(id==='AB01'||id==='AB02'||id==='B03'||id==='B04'||id==='B05'||id==='B18'||id==='IN01'||id==='BO04') {
    leaveButton=document.createElement('button');leaveButton.textContent='预览：模拟正常跨门离开并回访';
    leaveButton.disabled=true;leaveButton.style.cssText='display:block;margin:10px 0;padding:7px;background:#33463b;color:#e1e7d8;border:1px solid #667969';
    leaveButton.addEventListener('click',()=>{
      story.cue=null;
      stepContent(plan,story,{x:plan.spawn.x,z:plan.spawn.z,y:1.65,yaw:0,pitch:0},0,boxes,
        {door:{id:instance.entryDoorId},previousRoomId:instance.roomId});
      if(id==='IN01') {
        Object.assign(from,instance.spreadObservation);Object.assign(to,instance.furnitureFocus);
        camera.position.set(from.x,from.y,from.z);
        const dx=to.x-from.x,dz=to.z-from.z,dy=(to.y??1.65)-from.y;
        camera.rotation.set(Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(-dx,-dz),0);
      }
      leaveButton.disabled=true;
    });
    panel.insertBefore(leaveButton,link);
  }
  let moveButton=null,moved=false;
  if(id==='B08'||id==='B06'||id==='B11'||id==='ID02'||nearB12) {
    moveButton=document.createElement('button');moveButton.textContent=id==='B06'?'预览：跨过入口观察点':id==='B11'?'预览：靠近柜门':id==='B12'?'预览：到可达近观察位':'预览：横移到观察位';moveButton.disabled=true;
    moveButton.style.cssText='display:block;margin:10px 0;padding:7px;background:#33463b;color:#e1e7d8;border:1px solid #667969';
    moveButton.addEventListener('click',()=>{
      if(moved)return;
      moved=true;Object.assign(from,id==='B06'?instance.triggerPoint:id==='B11'?instance.approach:id==='B12'?nearB12:instance.lateralObservation);
      camera.position.set(from.x,from.y,from.z);
      const dx=to.x-from.x,dz=to.z-from.z,dy=(to.y??1.65)-from.y;
      camera.rotation.set(Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(-dx,-dz),0);
    });
    panel.insertBefore(moveButton,link);
  }
  let photoButton=null,photoMoved=false;
  if(id==='ID03') {
    photoButton=document.createElement('button');photoButton.textContent='预览：看第二张照片';
    photoButton.disabled=true;photoButton.style.cssText='display:block;margin:10px 0;padding:7px;background:#33463b;color:#e1e7d8;border:1px solid #667969';
    photoButton.addEventListener('click',()=>{
      photoMoved=true;
      Object.assign(from,instance.photos[1].observation);Object.assign(to,instance.photos[1].focus);
      camera.position.set(from.x,from.y,from.z);
      const dx=to.x-from.x,dz=to.z-from.z,dy=(to.y??1.65)-from.y;
      camera.rotation.set(Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(-dx,-dz),0);
      photoButton.disabled=true;
    });
    panel.insertBefore(photoButton,link);
  }
  if(id==='ME03'||id==='ME01') {
    const switchButton=document.createElement('button');
    const screenView={...from};
    let showingScreen=true;
    switchButton.textContent=id==='ME01'?'预览：看空椅':'预览：看实景椅子';
    switchButton.style.cssText='display:block;margin:10px 0;padding:7px;background:#33463b;color:#e1e7d8;border:1px solid #667969';
    switchButton.addEventListener('click',()=>{
      showingScreen=!showingScreen;
      const destination=showingScreen?instance.focus:instance.chairFocus;
      Object.assign(to,destination);
      const position=showingScreen?screenView:instance.observation;
      camera.position.set(position.x,position.y??1.65,position.z);
      const dx=to.x-position.x,dz=to.z-position.z,dy=to.y-(position.y??1.65);
      camera.rotation.set(Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(-dx,-dz),0);
      Object.assign(from,position);
      switchButton.textContent=showingScreen
        ?id==='ME01'?'预览：看空椅':'预览：看实景椅子'
        :id==='ME01'?'预览：看镜子':'预览：看屏幕';
    });
    panel.insertBefore(switchButton,link);
    if(id==='ME01') {
      const sideButton=document.createElement('button');let side=false;
      sideButton.textContent='预览：从侧面看镜子';
      sideButton.style.cssText=switchButton.style.cssText;
      sideButton.addEventListener('click',()=>{
        side=!side;showingScreen=true;
        const position=side?instance.sideObservation:instance.observation;
        Object.assign(from,position);Object.assign(to,instance.focus);
        camera.position.set(position.x,position.y,position.z);
        const dx=to.x-position.x,dz=to.z-position.z,dy=to.y-position.y;
        camera.rotation.set(Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(-dx,-dz),0);
        sideButton.textContent=side?'预览：从正面看镜子':'预览：从侧面看镜子';
        switchButton.textContent='预览：看空椅';
      });
      panel.insertBefore(sideButton,link);
    }
  }
  if(id==='ME02') {
    const sideButton=document.createElement('button');let side=false;
    sideButton.textContent='预览：沿镜面侧移';
    sideButton.style.cssText='display:block;margin:10px 0;padding:7px;background:#33463b;color:#e1e7d8;border:1px solid #667969';
    sideButton.addEventListener('click',()=>{
      side=!side;
      const position=side?instance.sideObservation:instance.observation;
      Object.assign(from,position);Object.assign(to,instance.focus);
      camera.position.set(position.x,position.y,position.z);
      const dx=to.x-position.x,dz=to.z-position.z,dy=to.y-position.y;
      camera.rotation.set(Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(-dx,-dz),0);
      sideButton.textContent=side?'预览：返回镜前':'预览：沿镜面侧移';
    });
    panel.insertBefore(sideButton,link);
  }
  let waterButton=null,waterStage=0;
  let tiltButton=null;
  if(id==='B19') {
    tiltButton=document.createElement('button');
    tiltButton.textContent='预览：走到稳定步行区';
    tiltButton.style.cssText='display:block;margin:10px 0;padding:7px;background:#33463b;color:#e1e7d8;border:1px solid #667969';
    tiltButton.addEventListener('click',()=>{
      Object.assign(from,instance.observation);camera.position.set(from.x,from.y,from.z);
      const dx=to.x-from.x,dz=to.z-from.z,dy=to.y-from.y;
      camera.rotation.set(Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(-dx,-dz),0);
      tiltButton.disabled=true;
    });
    panel.insertBefore(tiltButton,link);
  }
  let sealedDoorButton=null,sealedDoorStage=0;
  if(id==='B20') {
    sealedDoorButton=document.createElement('button');
    sealedDoorButton.textContent='预览：走向前方出口';sealedDoorButton.disabled=true;
    sealedDoorButton.style.cssText='display:block;margin:10px 0;padding:7px;background:#33463b;color:#e1e7d8;border:1px solid #667969';
    sealedDoorButton.addEventListener('click',()=>{
      sealedDoorStage++;
      const position=sealedDoorStage===1?instance.forwardObservation:instance.confirmationObservation;
      const destination=sealedDoorStage===1?instance.forwardFocus:instance.focus;
      Object.assign(from,position);Object.assign(to,destination);
      camera.position.set(from.x,from.y,from.z);
      const dx=to.x-from.x,dz=to.z-from.z,dy=to.y-from.y;
      camera.rotation.set(Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(-dx,-dz),0);
      sealedDoorButton.textContent=sealedDoorStage===1?'预览：回头确认墙面':'预览：入口已成墙';
    });
    panel.insertBefore(sealedDoorButton,link);
  }
  if(id==='IN03') {
    waterButton=document.createElement('button');
    waterButton.textContent='预览：进入相邻房看墙缝';waterButton.disabled=true;
    waterButton.style.cssText='display:block;margin:10px 0;padding:7px;background:#33463b;color:#e1e7d8;border:1px solid #667969';
    waterButton.addEventListener('click',()=>{
      waterStage++;
      const destination=waterStage===1?instance.wallFocus:instance.doorFocus;
      const position=waterStage===1?instance.wallObservation:instance.doorObservation;
      Object.assign(from,position);Object.assign(to,destination);
      document.getElementById('location').textContent=instance.supportRoomId;
      camera.position.set(from.x,from.y,from.z);
      const dx=to.x-from.x,dz=to.z-from.z,dy=to.y-from.y;
      camera.rotation.set(Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(-dx,-dz),0);
      waterButton.textContent=waterStage===1?'预览：看门缝水迹':'预览：三处水迹已看完';
    });
    panel.insertBefore(waterButton,link);
  }
  let lookButton=null,lookStep=0;
  if(id==='B12') {
    lookButton=document.createElement('button');lookButton.textContent='预览：转开视线';lookButton.disabled=true;
    lookButton.style.cssText='display:block;margin:10px 0;padding:7px;background:#33463b;color:#e1e7d8;border:1px solid #667969';
    lookButton.addEventListener('click',()=>{
      if(lookStep===0) {camera.rotation.y+=Math.PI;lookStep=1;lookButton.textContent='预览：回看';}
      else if(lookStep===1) {camera.rotation.y-=Math.PI;lookStep=2;lookButton.disabled=true;}
    });
    panel.insertBefore(lookButton,link);
  }
  let traceButton=null,traceMoved=false;
  if(id==='IN04') {
    traceButton=document.createElement('button');traceButton.textContent='预览：跨门进入后续房';
    traceButton.disabled=true;
    traceButton.style.cssText='display:block;margin:10px 0;padding:7px;background:#33463b;color:#e1e7d8;border:1px solid #667969';
    traceButton.addEventListener('click',()=>{
      if(traceMoved)return;
      story.cue=null;
      Object.assign(from,instance.followEntry);Object.assign(to,instance.followFocus);
      camera.position.set(from.x,from.y,from.z);
      const dx=to.x-from.x,dz=to.z-from.z,dy=to.y-from.y;
      camera.rotation.set(Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(-dx,-dz),0);
      stepContent(plan,story,{...from,yaw:camera.rotation.y,pitch:camera.rotation.x},0,world.getColliders(),
        {door:{id:instance.followDoorId},previousRoomId:instance.roomId});
      traceMoved=true;traceButton.disabled=true;
    });
    panel.insertBefore(traceButton,link);
  }
  let previous=performance.now();
  renderer.setAnimationLoop(time=>{
    const dt=Math.min((time-previous)/1000,.05);previous=time;
    stepContent(plan,story,{x:from.x,z:from.z,y:from.y??1.65,yaw:camera.rotation.y,pitch:camera.rotation.x},dt,world.getColliders());
    world.updateAmbient(dt);
    world.updateStory(story,{x:from.x,z:from.z});
    const phase=conditional?story.conditional[id].phase:story.instances[instance.instanceId]?.phase??'waiting';
    if(id==='IN04')document.getElementById('location').textContent=traceMoved?instance.supportRoomId:instance.roomId;
    if(leaveButton) leaveButton.disabled=phase!=='observed';
    if(moveButton) moveButton.disabled=moved||(id==='B06'?!story.instances[instance.instanceId]?.initialSeen:id==='B11'||id==='ID02'?phase!=='seen':phase!=='observed');
    if(photoButton)photoButton.disabled=photoMoved||!story.instances[instance.instanceId]?.photoSeen?.[0];
    if(lookButton)lookButton.disabled=lookStep===0?phase!=='observed':lookStep===1?phase!=='away':true;
    if(traceButton)traceButton.disabled=traceMoved||phase!=='sourceSeen';
    if(waterButton)waterButton.disabled=waterStage===0?phase!=='wallReady'
      :waterStage===1?phase!=='doorReady':true;
    if(sealedDoorButton)sealedDoorButton.disabled=sealedDoorStage===0?phase!=='entrySeen'
      :sealedDoorStage===1?phase!=='sealed':true;
    status.textContent=`种子 ${runSeed} · ${(id==='IN03'&&waterStage>0||id==='IN04'&&traceMoved)?instance.supportRoomId:instance.roomId} · ${instance.readiness} · 阶段 ${phase}${story.cue?' · '+story.cue.text:''}`;
    world.renderScreens(renderer);
    renderer.render(scene,camera);
  });
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  window.addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);world.dispose();},{once:true});
}
