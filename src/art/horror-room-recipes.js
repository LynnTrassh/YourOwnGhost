// Authoring proposals only. The planner must validate and accept these placements.
// Room-local metres: floor origin at centre, entrance +Z, forward -Z, Y up.
export const HORROR_ROOM_RECIPES = {
  'crt-records': {
    id:'crt-records', name:'旧电脑录入室', version:1,
    fear:'所有工位仍在工作，但没有工作人员；重复排列逐渐失去可信度。',
    defaults:{width:10,depth:10,rows:4,columnsPerBank:1,aisle:1.8},
    variants:{
      night:{name:'深夜值班',screen:'#83ac93',screenGain:.65,ceiling:'#b7c5ac',ceilingGain:1,redGain:.35},
      sync:{name:'全屏同步',screen:'#c0ddba',screenGain:1.65,ceiling:'#8c9e8c',ceilingGain:.3,redGain:.6},
      blind:{name:'尽头黑屏',screen:'#839eb7',screenGain:.85,ceiling:'#a2adbb',ceilingGain:.5,redGain:1.1},
    },
    rules:['整组桌椅一起放置或拒绝','中央通道贯穿入口与出口','屏幕使用自发光，少量局部光照到桌椅','状态由外部调用，禁止加载时随机触发'],
  },
};

const overlap=(a,b)=>a.minX<b.maxX&&a.maxX>b.minX&&a.minZ<b.maxZ&&a.maxZ>b.minZ;
function item(id,assetId,x,z,yaw,w,d,h){return {id,assetId,position:[x,0,z],yaw,size:[w,h,d],bounds:{minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:0,maxY:h}};}

export function proposeHorrorRoom(id='crt-records',options={}) {
  const recipe=HORROR_ROOM_RECIPES[id];if(!recipe)throw new Error(`Unknown horror room recipe: ${id}`);
  const {width,depth,rows,columnsPerBank,aisle}= {...recipe.defaults,...options};
  if(![width,depth,aisle].every(Number.isFinite)||width<8||width>15||depth<10||depth>15||aisle<1.5||aisle>3||!Number.isInteger(rows)||rows<2||rows>5||!Number.isInteger(columnsPerBank)||columnsPerBank<1||columnsPerBank>2)throw new Error('Unsupported room dimensions or workstation count');
  const excluded=options.exclusions??[];
  if(!Array.isArray(excluded)||excluded.some(b=>!['minX','maxX','minZ','maxZ'].every(k=>Number.isFinite(b[k]))||b.minX>=b.maxX||b.minZ>=b.maxZ))throw new Error('Invalid exclusion bounds');
  const placements=[],stations=[],rejected=[];
  const central={minX:-aisle/2,maxX:aisle/2,minZ:-depth/2,maxZ:depth/2};
  const zStart=-depth/2+1.25,zEnd=depth/2-2.05,pitch=(zEnd-zStart)/(rows-1);
  if(pitch<2.1)throw new Error('Rows leave insufficient chair clearance; reduce rows or enlarge room');
  for(let row=0;row<rows;row++)for(const side of [-1,1])for(let col=0;col<columnsPerBank;col++) {
    const stationId=`crt-${row}-${side<0?'L':'R'}-${col}`,x=side*(aisle/2+.85+col*1.65),z=zStart+row*pitch;
    const members=[item(`${stationId}-desk`,'prop-computer-desk-v01',x,z,Math.PI,1.28,.82,1.26),item(`${stationId}-chair`,'furniture-dining-chair',x,z+1.08,0,.44,.46,.96)];
    // Includes the working space between desk and chair; used as a reservation.
    const reservation={minX:x-.74,maxX:x+.74,minZ:z-.51,maxZ:z+1.41};
    if(reservation.minX< -width/2+.45||reservation.maxX>width/2-.45||excluded.some(b=>overlap(reservation,b))||overlap(reservation,central)) {rejected.push({stationId,reason:'occupied-or-outside'});continue;}
    placements.push(...members);stations.push({id:stationId,row,side,column:col,position:[x,0,z],reservation,deskId:members[0].id});
  }
  return {schemaVersion:1,recipeId:id,status:'proposal-requires-planner-validation',parameters:{width,depth,rows,columnsPerBank,aisle},
    room:{width,depth,height:3},placements,stations,rejected,reservations:[{id:'main-aisle',...central}],
    cameras:{entry:{position:[0,1.65,depth/2-.4],target:[0,1.15,-depth/2+1]},close:{position:[0,1.65,.5],target:[-aisle/2-.85,1.05,-depth/2+1.25]},reverse:{position:[0,1.65,-depth/2+.65],target:[0,1.1,depth/2]}},
    budget:{maxLocalLights:4,maxShadowLights:0,screenMaterials:'shared by row; emissive only'},
    integration:['Validate room containment, door approaches, event reservations and collision graph before accepting','Transform local placements and all bounds into room coordinates','No automatic room assignment or event trigger'],
  };
}
