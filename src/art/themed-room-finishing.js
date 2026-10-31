// Authored existing-asset dressing. Applied once to the independent room library.
// No changes to gameplay, seed streams, or the shared runtime catalog.
const floor=(assetId,x,z,yaw=0,group='生活物件')=>({assetId,x,z,yaw,y:0,group});
const on=(assetId,supportAsset,group)=>({assetId,supportAsset,group});
const prop=n=>`prop-${n}-v01`,scene=n=>`scene-${n}-v03`;
const additions={
 'hospital-01':[on(prop('rotary-phone'),'furniture-writing-desk','接诊登记')],
 'hospital-02':[floor(scene('wheelchair'),.8,1.5,90,'轮椅候诊')],
 'hospital-03':[floor(prop('iv-stand'),.8,-2.7,0,'空床输液位')],
 'hospital-04':[on(prop('medicine-tray'),'furniture-instrument-trolley','检查器械')],
 'hospital-05':[on(scene('medicine-bottles'),'furniture-instrument-trolley','配药')],
 'hospital-06':[on(prop('wood-radio'),'furniture-coffee-table','夜班休息')],
 'hospital-07':[on(prop('archive-boxes'),'furniture-document-table','病案整理')],
 'hospital-08':[floor(prop('suitcase'),.75,.75,0,'患者遗留物'),floor(prop('shoes-pair'),1.4,.15,0,'患者遗留物')],
 'park-01':[on(prop('rotary-phone'),'furniture-writing-desk','售票联络')],
 'park-03':[on(scene('toy-blocks'),'furniture-child-table','旧草案手工用品')],
 'park-04':[on(prop('toy-train'),'furniture-child-table','儿童等候')],
 'park-05':[on(prop('felt-hat'),'furniture-dresser','后台换装')],
 'park-06':[floor(prop('cardboard-box'),-.9,2.4,0,'包装区'),floor(scene('teddy-bear'),1.6,-.8,180,'未领取的奖品')],
 'park-07':[on(prop('tea-tray'),scene('round-table'),'员工用餐')],
 'park-08':[floor(prop('suitcase'),-1.6,-.5,0,'后台道具')],
 'office-01':[on(prop('rotary-phone'),'furniture-writing-desk','访客登记')],
 'office-02':[on(scene('desk-organizer'),'furniture-writing-desk','夜班工位')],
 'office-03':[on(prop('rotary-phone'),'furniture-document-table','会议通话')],
 'office-04':[on(scene('typewriter'),'furniture-document-table','档案调阅')],
 'office-05':[on(prop('rotary-phone'),'furniture-writing-desk','主管办公')],
 'office-06':[on(prop('archive-boxes'),'furniture-document-table','邮件分拣')],
 'office-07':[floor(prop('cardboard-box'),-1.05,-1.4,0,'交还私物')],
 'office-08':[on(prop('books-stack'),'furniture-document-table','资料阅读')],
 'home-01':[floor(prop('shoes-pair'),-.55,.9,0,'床侧私物'),floor(prop('suitcase'),.65,.75,90,'个人行李')],
 'home-02':[on(prop('tea-tray'),'furniture-coffee-table','客厅茶具')],
 'home-03':[on(prop('toy-train'),'furniture-child-table','共用玩具'),on(scene('toy-blocks'),'furniture-toy-chest','个人玩具')],
 'home-04':[on(scene('typewriter'),'furniture-writing-desk','写作桌面')],
 'home-05':[on(prop('wood-radio'),'furniture-nightstand','老人起居')],
 'home-06':[on(prop('tea-tray'),scene('round-table'),'家庭餐桌')],
 'home-07':[floor(prop('suitcase'),-.85,1.7,90,'旅行旧物'),floor(prop('cardboard-box'),1.5,2.7,0,'封存纸箱'),floor(scene('teddy-bear'),0,-3,180,'堆积尽头')],
 'home-08':[on(scene('folded-linen'),'furniture-dresser','双人衣物')],
 'hotel-01':[on(prop('rotary-phone'),'furniture-writing-desk','入住登记')],
 'hotel-02':[floor(prop('suitcase'),.6,1.6,90,'短住行李')],
 'hotel-03':[on(scene('folded-linen'),'furniture-dresser','备用床单')],
 'hotel-04':[on(prop('tea-tray'),'furniture-coffee-table','套房前厅'),floor(prop('suitcase'),1.3,.2,90,'行李')],
 'hotel-05':[on(scene('folded-linen'),'furniture-dresser','干净布草'),on(scene('pillow-pair'),'furniture-toy-chest','备用枕头')],
 'hotel-06':[floor(prop('suitcase'),-.65,.8,90,'待领行李'),floor(prop('suitcase'),.8,.9,-90,'已登记行李')],
 'hotel-07':[on(prop('books-stack'),'furniture-coffee-table','公共书刊')],
 'hotel-08':[floor(scene('laundry-basket'),-.55,.55,0,'长住私物')],
 'ritual-01':[on(scene('incense-burner'),'furniture-offering-table','供奉')],
 'ritual-02':[on(scene('ritual-bell'),'furniture-offering-table','双侧祭器')],
 'ritual-03':[on(scene('candelabrum'),'furniture-offering-table','守夜')],
 'ritual-04':[on(scene('ritual-bell'),'furniture-offering-table','祭器清点')],
 'ritual-05':[on(scene('incense-burner'),'furniture-offering-table','圈外供物')],
 'ritual-06':[on(prop('tea-tray'),'furniture-coffee-table','生活区')],
 'ritual-07':[on(scene('candelabrum'),'furniture-offering-table','红光中的烛台')],
 'ritual-08':[on(scene('incense-burner'),'furniture-offering-table','末端供奉')],
};
export function finishThemedRooms(rooms){
 for(const r of rooms){
  // Correct concrete function mismatches with delivered geometry.
  if(r.id==='home-06'||r.id==='park-07'){
   const desks=r.placements.filter(p=>p.assetId==='furniture-document-table');
   const main=desks[0];main.assetId=scene('round-table');if(r.id==='home-06'){main.x=0;main.z=-.65;r.placements=r.placements.filter(p=>p===main||!desks.includes(p));}
  }
  if(r.id==='hospital-07'){
   r.placements=r.placements.filter(p=>p.assetId!=='furniture-examination-cot');
   r.placements.push(floor(prop('archive-stack'),-.8,-3.7,90,'待封存病案'),floor(prop('cardboard-box'),-.9,-2.5,0,'封存包裹'));
  }
  if(r.id==='hospital-08'){
   const cot=r.placements.find(p=>p.assetId==='furniture-examination-cot');cot.assetId=prop('clothes-rack');cot.group='患者衣帽';
  }
  for(const add of additions[r.id]??[]){
   if(add.supportAsset){
    const support=r.placements.find(p=>p.assetId===add.supportAsset);if(!support)continue;
    support.key??=`${r.id}-support-${r.placements.indexOf(support)}`;
    r.placements.push({...add,x:support.x,z:support.z,y:0,yaw:support.yaw,supportKey:support.key,autoSupport:true});
   }else r.placements.push(add);
  }
  r.placements.forEach((p,i)=>p.id=`${r.id}-${i}`);
 }
}
