import fs from 'node:fs';
import assert from 'node:assert/strict';
import {THEMED_ROOMS} from '../../../src/art/themed-room-library.js';
import {THEMED_ASSETS} from '../../../src/art/themed-room-assets.js';
const pack=JSON.parse(fs.readFileSync(new URL('./rooms.json',import.meta.url)));
const requests=new Map(JSON.parse(fs.readFileSync('art-source/theme-specific-tripo-v05/manifest.json')).assets.map(a=>[a.id,a]));
// These dimensions are explicit reserved envelopes, NOT fabricated measurements.
const envelopes={
 'arcade-cabinet':[.85,1.8,.8],'hospital-triage-counter':[2,1.1,.75],
 'pharmacy-drawers':[1.5,1.7,.5],'office-reception':[2,1.1,.75],'photocopier':[.8,1.1,.8],
 'water-dispenser':[.45,1.4,.45],'china-cabinet':[1.4,1.85,.55],'sewing-basket':[.35,.28,.3],
 'hotel-reception':[2,1.1,.75],'hotel-luggage-rack':[.7,.56,.5],
 'ritual-idol':[.6,.9,.55],'ritual-lantern':[.35,.6,.35],'prayer-cushion':[.6,.16,.6],
};
function asset(id){const a=THEMED_ASSETS[id],q=requests.get(id);const size=a?[a.width,a.height,a.depth]:q?.requestedBoundsWHD??envelopes[id.replace('theme-','').replace('-v05','')];assert(size,`No envelope ${id}`);return {id,name:a?.name??q?.name??id,url:a?.url??null,size,boundsSource:a?'delivered-bounds':'reserved-design-envelope',available:Boolean(a)};}
const t=n=>`theme-${n}-v05`,p=n=>`prop-${n}-v01`,s=n=>`scene-${n}-v03`;
const f=(id,x,z,yaw=0,group='主功能组',y=0)=>({assetId:id,x,z,yaw,y,group});
const top=(id,supportAsset,group='桌面物件',index=0)=>({assetId:id,supportAsset,index,group});
// Explicit authored coordinates for the design's real functional anchors.
const cores={
 'hospital-01':[f(t('hospital-triage-counter'),-.6,-.65),f(t('waiting-bench'),1.9,.2,-90,'候诊'),top(p('rotary-phone'),t('hospital-triage-counter'))],
 'hospital-02':[f(t('waiting-bench'),-1.9,-.2,90,'候诊左列'),f(t('waiting-bench'),1.9,-.2,-90,'候诊右列')],
 'hospital-03':[f(s('hospital-bed'),-1.5,2,90,'床组A'),f(s('hospital-bed'),1.5,-.5,90,'床组B'),f(p('folding-screen'),-1.35,-2.4,0,'隔离'),f(p('iv-stand'),1.5,-2.1,0,'输液')],
 'hospital-04':[f(s('hospital-bed'),-.75,-.6,90,'检查床'),f('lighting-floor-lamp',1.5,-1.5,0,'工作灯'),f(t('xray-viewer'),-.4,-2.32,180,'观片',1.5)],
 'hospital-05':[f(t('pharmacy-drawers'),-2.1,-.3,90,'药柜'),f(t('pharmacy-drawers'),2.1,-.3,-90,'药柜'),f('furniture-instrument-trolley',0,-1.55,90,'配药')],
 'hospital-06':[f(p('clothes-rack'),-1.5,1.5,180,'换衣'),top(p('wood-radio'),'furniture-coffee-table'),top(p('rotary-phone'),'furniture-coffee-table')],
 'hospital-07':[f(p('archive-stack'),-.7,-3.8,90,'封存'),top(p('archive-boxes'),'furniture-document-table')],
 'hospital-08':[f(p('clothes-rack'),-1.7,.2,90,'遗留衣物'),f(p('suitcase'),.8,.75,0,'遗留箱包'),f(p('shoes-pair'),1.5,.15,0,'遗留鞋')],
 'park-01':[f(t('ticket-counter'),-.9,0,0,'售票'),f('furniture-dining-chair',-.9,-1.15,180,'售票员工'),f('furniture-document-table',1.35,.3,90,'人工验票'),top(t('ticket-register'),t('ticket-counter'))],
 'park-02':[],
 'park-03':[...[-1.85,1.85].flatMap((x,i)=>[2.4,.7,-1].map(z=>f(t('arcade-cabinet'),x,z,i?-90:90,'游艺机列'))),f(t('prize-display'),0,-4.55,180,'兑换奖品')],
 'park-04':[f(s('pram'),1.75,.3,-90,'儿童等候'),f(s('teddy-bear'),-1.2,.6,0,'玩具'),top(p('toy-train'),'furniture-child-table')],
 'park-05':[f(p('clothes-rack'),1.3,1.5,180,'服装'),f(s('clothes-hanging-dress'),-2.1,1.4,90,'服装',1.1),top(t('performer-mask'),'furniture-dresser')],
 'park-06':[f(t('prize-display'),-2.1,.5,-90,'奖品层架'),f(p('cardboard-box'),-.9,2.5,0,'包装'),f(s('teddy-bear'),0,-3.7,180,'单件奖品')],
 'park-07':[f(s('round-table'),-1.1,-.65,0,'用餐'),f(p('clothes-rack'),1.5,1.5,180,'换衣'),top(p('tea-tray'),s('round-table'))],
 'park-08':[f('theme-stage-deck-v06',0,-2.7,90,'舞台'),f('theme-stage-stairs-v06',-2.37,-2.7,90,'侧阶'),f(t('stage-pillar'),-2.6,-.8,0,'台口'),f(t('stage-pillar'),2.6,-.8,0,'台口'),f(t('stage-lintel'),0,-1,0,'台口',2.65),f('furniture-dresser',3.5,-2,0,'后台道具台'),top(t('performer-mask'),'furniture-dresser')],
 'office-01':[f(t('office-reception'),-.6,-.7,0,'接待'),top(p('rotary-phone'),t('office-reception'))],
 'office-02':[f(p('computer-desk'),-1.7,2.4,0,'工位A'),f(p('computer-desk'),1.7,-.3,180,'工位B'),f(t('office-chair'),-.65,2.4,-90,'工位A'),f(t('office-chair'),.65,-.3,90,'工位B')],
 'office-03':[f(t('conference-table'),0,-.3,90,'会议'),f(t('meeting-board'),0,-2.3,180,'展示',1.2)],
 'office-04':[f(p('archive-stack'),1.5,-2.7,90,'待归档'),top(p('archive-boxes'),'furniture-document-table'),top(s('typewriter'),'furniture-document-table')],
 'office-05':[f(s('armchair-wingback'),-.8,-2,0,'主管'),f(s('sideboard'),-1.9,1.2,0,'会客备品'),top(p('rotary-phone'),'furniture-writing-desk')],
 'office-06':[f(t('mail-sorting-rack'),0,-2.1,180,'邮件格口'),f(p('cardboard-box'),1.2,1.5,0,'待领包裹'),f('furniture-document-table',-.9,-.6,0,'登记'),top(s('typewriter'),'furniture-document-table')],
 'office-07':[f(p('clothes-rack'),-1.6,1.5,180,'私物交还'),f(p('cardboard-box'),-.55,.95,0,'私物交还'),top(s('desk-organizer'),'furniture-writing-desk')],
 'office-08':[f(t('photocopier'),1.8,1.2,180,'复印'),f(p('computer-desk'),-1.5,.1,0,'查询'),top(p('archive-boxes'),'furniture-multi-drawer-file-cabinet')],
 'home-01':[f(p('clothes-rack'),1.7,1.45,180,'私人物品'),f(p('shoes-pair'),-.55,.9,0,'床侧'),top(p('books-stack'),'furniture-nightstand')],
 'home-02':[f(p('tv-console'),1.85,-.7,90,'电视'),f('furniture-dresser',1.65,1.5,180,'唱机柜'),top(s('record-player'),'furniture-dresser','唱机'),top(p('tea-tray'),'furniture-coffee-table')],
 'home-03':[f(s('tricycle'),-.55,.4,0,'游戏'),f(s('teddy-bear'),1.55,1.2,180,'游戏'),f(p('hanging-mobile'),-1.5,-.7,0,'床上吊饰',2.1)],
 'home-04':[top(s('typewriter'),'furniture-writing-desk'),top(p('books-stack'),'furniture-writing-desk')],
 'home-05':[f(s('rocking-chair'),1.6,.1,-90,'收音'),f('furniture-document-table',-1.3,1.5,180,'缝补'),top(s('sewing-machine'),'furniture-document-table'),top(t('sewing-basket'),'furniture-document-table')],
 'home-06':[f(s('round-table'),0,-.65,0,'餐桌'),f(t('china-cabinet'),-1.45,-1.9,180,'餐具柜'),top(p('tea-tray'),s('round-table'))],
 'home-07':[f(p('covered-shape'),-1.5,-1.8,0,'被覆盖旧物'),f(p('suitcase'),-.85,1.7,90,'行李旧物'),f(p('cardboard-box'),1.5,2.7,0,'封存'),f(s('teddy-bear'),0,-3,180,'尽头')],
 'home-08':[f(p('suitcase'),.3,.6,90,'婚房行李'),f(p('empty-hanger'),2.2,1.5,90,'空衣架',1.8),top(s('folded-linen'),'furniture-dresser')],
 'hotel-01':[f(t('hotel-reception'),.5,-.9,0,'前台'),f(t('hotel-key-rack'),.5,-2.38,180,'钥匙墙',1.3),top(t('hotel-service-bell'),t('hotel-reception'))],
 'hotel-02':[f(p('suitcase'),.6,.65,90,'行李箱'),f(p('shoes-pair'),-.6,.6,0,'床边私物')],
 'hotel-03':[f(p('suitcase'),.6,.65,90,'行李箱'),top(s('folded-linen'),'furniture-dresser')],
 'hotel-04':[f(p('clothes-rack'),1.9,-.5,-90,'衣帽'),f(p('suitcase'),1.3,.7,90,'行李'),top(p('tea-tray'),'furniture-coffee-table')],
 'hotel-05':[f(t('linen-cart'),1.5,.5,0,'周转'),f(s('laundry-basket'),-.7,.6,0,'脏衣'),top(s('folded-linen'),'furniture-dresser'),top(s('pillow-pair'),'furniture-toy-chest')],
 'hotel-06':[f(t('luggage-trolley'),-1.6,.2,0,'待领行李'),f(p('suitcase'),1.6,.25,90,'登记行李'),f(p('clothes-rack'),1.6,-1.9,0,'临存衣帽')],
 'hotel-07':[top(p('rotary-phone'),'furniture-coffee-table'),top(p('books-stack'),'furniture-coffee-table'),f('furniture-nightstand',-.8,-1.8,0,'花台'),top(p('dried-flowers'),'furniture-nightstand')],
 'hotel-08':[f(p('computer-desk'),1.85,.1,180,'长期工作'),f(p('clothes-rack'),-1.55,1.5,180,'私物'),f(s('laundry-basket'),-.55,.55,0,'生活')],
 'ritual-01':[f(s('round-table'),0,-1.55,0,'主供奉'),f(s('round-table'),1.6,.5,0,'供物准备'),f('furniture-nightstand',-1.5,.7,0,'香炉'),top(t('ritual-idol'),s('round-table'),'主供奉',0),top(t('offering-bowl'),s('round-table'),'供物',1),top(s('incense-burner'),'furniture-nightstand')],
 'ritual-02':[f(s('round-table'),-1.6,-.8,0,'左供奉'),f(s('round-table'),1.6,-.8,0,'右供奉'),f(s('round-table'),0,-1.8,0,'后备供物'),top(t('ritual-idol'),s('round-table'),'左供奉',0),top(t('ritual-idol'),s('round-table'),'右供奉',1),top(t('offering-bowl'),s('round-table'),'后备供物',2)],
 'ritual-03':[f(t('ritual-lantern'),-1.1,-3.1,0,'末端灯',2.2),f(t('ritual-lantern'),1.5,-3.1,0,'末端灯',2.2),f('furniture-kneeling-bench',-.2,-2,0,'末席'),top(s('candelabrum'),'furniture-offering-table')],
 'ritual-04':[f(s('round-table'),0,-.6,0,'清点供物'),top(s('incense-burner'),'furniture-offering-table'),top(s('ritual-bell'),'furniture-offering-table'),top(t('offering-bowl'),s('round-table'))],
 'ritual-05':[f(t('ritual-lantern'),-1.8,-1.8,0,'圈外灯',2.1),f(s('round-table'),-1.7,-1.7,0,'圈外供物'),top(t('offering-bowl'),s('round-table'))],
 'ritual-06':[top(t('ritual-tablet'),'furniture-dresser'),top(s('incense-burner'),'furniture-dresser'),{...f(p('portrait-frame'),-1.4,-2.3,90,'生活旧像',1.6),wallMounted:true}],
 'ritual-07':[f(s('round-table'),0,-1.7,0,'主供奉'),f('furniture-nightstand',1.5,-1.3,0,'烛台'),top(t('offering-bowl'),s('round-table')),top(s('candelabrum'),'furniture-nightstand')],
 'ritual-08':[f(s('round-table'),0,-3.8,0,'主供奉'),f('furniture-dresser',1.4,-3.8,0,'供器'),top(t('ritual-idol'),s('round-table')),top(t('ritual-tablet'),'furniture-dresser'),top(s('incense-burner'),'furniture-dresser')],
};
const bounds=item=>{const a=asset(item.assetId),[w,h,d]=a.size,angle=item.yaw*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));return {minX:item.x-(w*c+d*s)/2,maxX:item.x+(w*c+d*s)/2,minZ:item.z-(w*s+d*c)/2,maxZ:item.z+(w*s+d*c)/2,minY:item.y,maxY:item.y+h};};
const overlap=(a,b,pad=.04)=>a.minX<b.maxX+pad&&a.maxX>b.minX-pad&&a.minZ<b.maxZ+pad&&a.maxZ>b.minZ-pad&&a.minY<b.maxY-.005&&a.maxY>b.minY+.005;
const results=[];
for(const room of pack.rooms){
 const original=THEMED_ROOMS.find(r=>r.id===room.id);
 let placements=original.placements.filter(p=>!p.autoSupport).map(p=>({...p,source:'retained-layout'}));
 const specs=cores[room.id];assert(specs,room.id);
 const floor=specs.filter(p=>!p.supportAsset),tops=specs.filter(p=>p.supportAsset);
 // Core anchors are author-selected, replacing obsolete/surrogate draft furnishings.
 for(const item of floor){
  const b=bounds(item);
  placements=placements.filter(old=>(old.group==='台口'&&item.group==='台口')||!overlap(bounds(old),b));
  placements.push({...item,source:'authored-functional-anchor'});
 }
 if(room.id==='park-08'){for(const p of placements){if(p.assetId==='furniture-display-cabinet')p.x=3.7;if(p.assetId==='furniture-toy-chest')p.x=-3.5;}placements.push(f('fixture-curtain-oxblood-velvet',-.65,-4.8,0,'后台帷幕',.1),f('fixture-curtain-oxblood-velvet',.65,-4.8,0,'后台帷幕',.1));placements=placements.filter(p=>p.assetId!=='furniture-dining-chair');for(const z of [.3,1.6,2.9])for(const x of [-2.4,-1.5,1.5,2.4])placements.push({...f('furniture-dining-chair',x,z,180,'观众席'),source:'authored-functional-anchor'});}
 if(room.id==='hospital-02')for(const p of placements)if(p.assetId==='scene-wheelchair-v03')p.x=1.1;
 if(room.id==='park-01')placements=placements.filter(p=>!(p.source==='retained-layout'&&p.assetId==='furniture-dining-chair'));
 if(room.id==='park-03')placements=placements.filter(p=>!['furniture-child-table','furniture-dining-chair','furniture-toy-chest'].includes(p.assetId));
 // Widened room boundaries move their architectural fixtures to the real back/entry.
 for(const item of placements){if(item.assetId==='architecture-door-panelled')item.z=room.dimensions[2]/2-.08;}
 let n=0;
 for(const item of placements)item.layoutId=`${room.id}-layout-${n++}`;
 const supportGroups=new Map();
 for(const spec of tops){
  const supports=placements.filter(p=>p.assetId===spec.supportAsset),support=supports[spec.index];assert(support,`${room.id}: missing support ${spec.supportAsset}`);
  const list=supportGroups.get(support.layoutId)??[];list.push(spec);supportGroups.set(support.layoutId,list);
 }
 for(const [supportId,list]of supportGroups){
  const support=placements.find(p=>p.layoutId===supportId),[sw,sh,sd]=asset(support.assetId).size;
  // Tabletop slots are authored as a row; each has a support link and metre position.
  const total=list.reduce((sum,p)=>sum+asset(p.assetId).size[0],0)+Math.max(0,list.length-1)*.08;
  // Larger ceremonial groups need a real table sized for all objects, not shrink-to-fit.
  if(total>sw-.08)room.tabletopCapacityIssues??=[];
  if(total>sw-.08)room.tabletopCapacityIssues.push({supportId,requiredWidth:total+.08,actualWidth:sw});
  let cursor=-total/2;
  for(const spec of list){const [pw,ph,pd]=asset(spec.assetId).size,lx=cursor+pw/2,angle=support.yaw*Math.PI/180;cursor+=pw+.08;
   placements.push({layoutId:`${room.id}-layout-${n++}`,assetId:spec.assetId,x:support.x+Math.cos(angle)*lx,z:support.z-Math.sin(angle)*lx,y:support.y+sh+.002,yaw:support.yaw,group:spec.group,supportId,source:'authored-tabletop-slot',surfaceCheck:'requires-mesh-contact-check'});
  }
 }
 room.layout={version:2,coordinateSystem:'metres; bottom-centre; +Z entrance; source forward must be verified',placements:placements.map(p=>({...p,bounds:bounds(p),asset:asset(p.assetId)}))};
 const used=new Set(placements.map(p=>p.assetId));room.unplacedRequired=room.requiredAssets.filter(id=>!used.has(id));
 results.push({id:room.id,items:placements.length,unplacedRequired:room.unplacedRequired,tabletopCapacityIssues:room.tabletopCapacityIssues??[]});
}
fs.writeFileSync(new URL('./layouts.json',import.meta.url),JSON.stringify(pack,null,2)+'\n');
console.log(JSON.stringify(results.filter(r=>r.unplacedRequired.length||r.tabletopCapacityIssues.length),null,2));
