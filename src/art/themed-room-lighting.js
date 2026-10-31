import * as THREE from 'three';

// Authored room-space lighting, independent of planning/geometry and flashlight.
// An asset anchor follows the loaded object's real position, including support correction.
const A=(asset,index=0,offset=[0,0,0])=>({asset,index,offset});
const W=0xffd3a4,N=0xe5e1d5,C=0xb9cbd6,B=0x8fbbc8,R=0xcf493c;
const S=(role,from,to,color,power=16,angle=.8,range=7)=>({role,from,to,color,power,angle,range});
const P=(role,from,color,power=.8,range=3.5)=>({role,from,color,power,range});
const ceiling=(x,z)=>[x,2.78,z];
const floorLamp=A('lighting-floor-lamp',0,[0,1.45,0]);
// Every ID has its own positions, targets and balance; no theme-wide color filter.
// Sources/targets are room local meters. Final exposure stays with the caller.
export const THEMED_LIGHTING_PROFILES={
 'hospital-01':{intent:'先读空接诊位，候诊侧门保持低亮',spots:[S('接诊台',ceiling(-.8,-1.2),A('theme-hospital-triage-counter-v05',0,[0,.9,0]),N,20,.84),S('入口参照',ceiling(.9,1.6),[.7,.3,1.2],W,5,.8)],bounce:P('柜边反射',[-1.4,1.5,-1.4],C)},
 'hospital-02':{intent:'照两侧候诊席，末端反向孤椅不设专灯',spots:[S('左排座位',ceiling(-1.5,1.1),[-1.8,.5,-.1],C,12,.62,4.2),S('右排座位',ceiling(1.5,1.1),[1.8,.5,-.1],N,9,.62,4.2)],bounce:P('入口低反射',[0,1.6,1.6],N,.5,2.5)},
 'hospital-03':{intent:'前中床组分段亮，最深空床冷暗',spots:[S('入口床组',ceiling(-.7,2.2),[-1.5,.7,2],N,18,.85,5),S('中段床组',ceiling(.8,-.2),[1.5,.7,-.5],C,11,.75,4.8)],bounce:P('末端冷反射',[1.5,1.2,-3.1],C,.55,3)},
 'hospital-04':{intent:'灯斑故意偏离检查床；药柜只接受反光',spots:[S('检查空位',A(['theme-exam-lamp-v05','lighting-floor-lamp'],0,[-.25,1.48,.12]),[.7,.12,-.55],N,22,.44,5),S('观片工作面',[-.4,2.75,-1.7],A('theme-xray-viewer-v05',0,[0,.22,0]),C,3.5,.58,3)],bounce:P('低工作反射',[-.8,2.45,.3],N,1.1,4.5)},
 'hospital-05':{intent:'抽屉号冷白、配药台微暖；避免全屋绿色',spots:[S('左柜号码',ceiling(-1.3,-.1),[-2,1.3,-.3],N,13,.75),S('配药面',ceiling(.8,-1.3),A('furniture-instrument-trolley',0,[0,.8,0]),W,9,.62)],bounce:P('右柜反射',[1.4,1.5,-.3],C,.9,3)},
 'hospital-06':{intent:'休息桌暖，床区暗；衣帽轮廓不打正面',spots:[S('休息桌',floorLamp,A('furniture-coffee-table',0,[0,.5,0]),W,9,.95,4.5),S('床边轮廓',ceiling(-1.8,-1.5),[-1.8,.7,-.6],N,5,.5,3.5)],bounce:P('值守微光',[1.5,1.5,.9],C,.6,3)},
 'hospital-07':{intent:'整理台亮，柜列低侧光，空墙保持暗',spots:[S('整理台',ceiling(1,-1.6),A('furniture-document-table',0,[0,.8,0]),W,19,.72),S('近柜轮廓',ceiling(-.8,2.8),[-2,1.1,.8],C,7,.47,5)],bounce:P('柜列反射',[1.35,1.3,.3],N,.6,4)},
 'hospital-08':{intent:'保管物中性可读，等待空椅低暖',spots:[S('保管柜',ceiling(-.7,-1.1),[-.7,1,-2],N,17,.82),S('等待位',ceiling(1.6,1.5),[1.7,.3,1.3],W,4,.52,3.4)],bounce:P('入口反射',[-1.4,1.2,.9],C,.6,3)},
 'park-01':{intent:'售票口暖白，排队折返区域冷暗',spots:[S('售票工作面',ceiling(-.8,-1.2),A('theme-ticket-counter-v05',0,[0,.9,0]),W,17,.78),S('窗口边缘',[-1,2.65,-1.5],[1.1,1.65,-2.3],N,6,.48,4)],bounce:P('排队冷反射',[1.5,1.5,1.2],C,.8,4)},
 'park-02':{intent:'舞台主次聚光，观众席只读轮廓，反向椅不抢焦点',spots:[S('台面主光',[-1.5,2.78,-1.1],A('theme-stage-deck-v06',0,[.1,.7,0]),W,36,.9,9),S('讲台侧缘',[2.8,2.76,-1.8],[1.1,1,-2.9],N,15,.64,7)],bounce:P('观众中性参照',[0,1.65,2],N,1.1,6)},
 'park-03':{intent:'机列低冷光，尽头兑换位一点暖，保留遮挡',spots:[S('左机列',ceiling(-1.1,1.9),[-1.8,1.1,.6],B,12,.65,5.5),S('兑奖边缘',[1.3,2.6,-3.5],[0,1,-4.4],W,7,.55,4)],bounce:P('右机反射',[1.3,1.3,.5],B,1.2,4.3)},
 'park-04':{intent:'儿童桌柔暖，登记角冷白，空座留轮廓',spots:[S('儿童角',ceiling(.8,-1.1),A('furniture-child-table',0,[0,.5,0]),W,13,.9),S('登记一侧',floorLamp,[-1.7,.7,.2],N,7,.75,4)],bounce:P('低反射',[1.6,1.5,.8],C,.6,3)},
 'park-05':{intent:'镜前局部暖白，衣帽区低冷轮廓',spots:[S('主镜前',[-1.3,2.6,-1.35],A('vanity-oval-mirror-v01',0,[0,1,0]),W,12,.64),S('侧镜前',[1.3,2.5,-.2],A('vanity-oval-mirror-v01',1,[0,1,0]),N,7,.6)],bounce:P('衣帽冷反射',[1.2,1.5,1.4],C,.5,2.5)},
 'park-06':{intent:'箱面分段旧暖，远端孤立奖品冷暗',spots:[S('近端箱面',ceiling(-1,2.5),[-1,.8,2],W,14,.7,5),S('中段箱面',ceiling(.7,-1.2),[1.5,.7,-2.2],W,9,.7,4.5)],bounce:P('远端冷点',[.3,1.2,-4],C,.6,2.5)},
 'park-07':{intent:'餐桌生活暖光，侧门冷反光',spots:[S('交班餐桌',ceiling(-.8,-1.2),A('scene-round-table-v03',0,[0,.75,0]),W,15,.85),S('沙发边缘',[1.6,2.5,.3],[1.7,.5,-.5],N,5,.7,3.8)],bounce:P('侧门反射',[1.5,1.7,1.7],C,.65,3)},
 'park-08':{intent:'台口暗红暖光，后台狭缝中性，观众低亮',spots:[S('台口红暖',[-1.5,2.72,-.9],[0,.65,-2.7],R,23,.8,8),S('后台狭缝',[2.7,2.7,-4],[1.8,.8,-3.2],N,10,.35,5)],bounce:P('观众参照',[0,1.65,2.1],N,1,6)},
 'office-01':{intent:'前台冷白、访客位低暖',spots:[S('前台',ceiling(-.8,-1.2),A('theme-office-reception-v05',0,[0,.9,0]),N,19,.85),S('访客侧',[1.6,2.6,.7],[1.8,.55,.5],W,5,.65,3.5)],bounce:P('文件柜反射',[-1.5,1.6,-1.5],C,.65,3)},
 'office-02':{intent:'工位两段中性池，低蓝屏幕反射；末端不全亮',spots:[S('近段工作面',ceiling(-.7,2.1),[-1.6,.85,2.2],N,18,.8,5.5),S('中段工作面',ceiling(.8,-.8),[1.65,.85,-.3],N,13,.72,5)],bounce:P('显示器低反射',[.1,1.1,-2.2],B,1.2,4)},
 'office-03':{intent:'会议桌白，板面微冷，椅子低一档',spots:[S('会议桌',ceiling(-.4,-.4),A('theme-conference-table-v05',0,[0,.8,0]),N,19,.7),S('展示板',[0,2.7,-1.7],A('theme-meeting-board-v05',0,[0,.4,0]),C,4,.55,3)],bounce:P('座位反射',[1.4,1.4,.5],W,.5,3)},
 'office-04':{intent:'深处纸面暖白，档案柜背低灰',spots:[S('读档桌',ceiling(.4,-3.2),A(['theme-conference-table-v05','furniture-document-table'],0,[0,.8,0]),W,19,.7),S('近柜侧缘',ceiling(-.7,2.1),[-2,1.1,.7],N,7,.48,5)],bounce:P('柜间反射',[1.2,1.7,-.7],0xa8b5ad,.6,4)},
 'office-05':{intent:'主桌暖、会客中性、书柜留暗',spots:[S('主桌',ceiling(-.8,-1.2),[-.8,.8,-1],W,16,.72),S('会客位',[1.6,2.55,.4],[1.3,.5,.7],N,6,.66)],bounce:P('入口反射',[0,1.4,1.6],N,.5,2.5)},
 'office-06':{intent:'分拣格口中性斜光，登记台暖，空格可读',spots:[S('格口',[.8,2.6,-1.5],[0,1,-2.1],N,16,.78),S('登记台',[1.5,2.55,.1],[1.2,.8,-.6],W,8,.6)],bounce:P('收件区反射',[-1.3,1.5,.7],C,.55,3)},
 'office-07':{intent:'双人桌中性、入口暖暗，回望第三椅才清晰',spots:[S('会谈桌',ceiling(.8,-.6),[1,.8,-.9],N,14,.65),S('低暖入口',floorLamp,[1.7,.2,1.4],W,3,.55,3)],bounce:P('沙发反射',[-1.4,1.2,-.2],N,.7,3)},
 'office-08':{intent:'阅读白光与复印角低青灰对照',spots:[S('阅读桌',ceiling(-1,.3),[-1.5,.8,.1],N,15,.7),S('复印角',[1.7,2.6,1.1],A('theme-photocopier-v05',0,[0,.8,0]),C,7,.65)],bounce:P('书柜反射',[.3,1.6,-1.5],N,.55,3)},
 'home-01':{intent:'床头暖、镜台中性，衣帽区维持阴影',spots:[S('床头',[-.6,2.6,-1.5],[-1.4,.65,-1.1],W,13,.7),S('镜台',[1.2,2.65,-1.4],A('vanity-oval-mirror-v01',0,[0,1,0]),N,5,.6)],bounce:P('低墙面反射',[-1.6,1.3,.5],W,.6,3)},
 'home-02':{intent:'沙发暖灯与电视冷反光，两者之间留暗',spots:[S('沙发灯',floorLamp,[-.9,.55,-1.55],W,10,.95,5),S('电视冷光',[1.4,1.15,-.7],[-.5,.45,-.9],B,3.8,.85,4.5)],bounce:P('近墙反射',[-1.4,1.45,.6],N,.7,3.5)},
 'home-03':{intent:'玩具角暖、空床冷，中心无均匀顶光',spots:[S('玩具角',ceiling(-1.1,.6),[-1.5,.4,1],W,10,.78),S('空床边缘',[1.8,2.5,-1.6],[1.55,.65,-.7],C,4,.52,3.5)],bounce:P('柜背反射',[0,1.5,-1.7],N,.45,2.5)},
 'home-04':{intent:'工作面暖、窗方向冷，书背不平铺打亮',spots:[S('台灯方向',floorLamp,A('furniture-writing-desk',0,[0,.8,0]),W,11,.8,4.5),S('窗向冷光',[.7,2.4,-2.2],[.6,.7,-.9],C,5,.65,4)],bounce:P('书架侧缘',[-1.6,1.6,-.3],N,.5,3)},
 'home-05':{intent:'旧灯暖、窗侧中性冷，空摇椅低亮',spots:[S('生活桌',ceiling(-.8,-1.2),[-.8,.6,-.6],W,14,.83),S('窗侧',[1.8,2.55,-1.5],[1.3,.6,-.5],C,4,.62,3.8)],bounce:P('入口反射',[-1.3,1.4,1.2],W,.6,3)},
 'home-06':{intent:'餐桌暖白，柜中玻璃只给弱斜光',spots:[S('餐桌',ceiling(-.5,-.5),A('scene-round-table-v03',0,[0,.75,0]),W,17,.78),S('玻璃柜边',[-.8,2.4,-1.4],A('theme-china-cabinet-v05',0,[0,1,0]),N,3,.45,3)],bounce:P('入口低光',[1.4,1.5,.7],N,.5,3)},
 'home-07':{intent:'近暖深冷，尽头玩具一点侧光',spots:[S('近旧物',ceiling(-1,2.4),[-1.8,.8,1.8],W,11,.68,5),S('尽头孤物',floorLamp,[0,.5,-3.5],N,7,.6,3.8)],bounce:P('中段冷反射',[1.25,1.5,-.5],C,.7,4)},
 'home-08':{intent:'床幔暖侧光，镜前中性，帘后保持暗',spots:[S('床幔侧',[.1,2.5,-1.2],[-1,1.1,-.65],W,12,.65),S('镜前',[1.5,2.6,-1.2],A('vanity-oval-mirror-v01',0,[0,1,0]),N,5,.58)],bounce:P('入口反射',[1.3,1.4,1],N,.55,3)},
 'hotel-01':{intent:'黄暖前台、钥匙格中性焦点，访客暗一档',spots:[S('接待台',ceiling(-.5,-.6),A('theme-hotel-reception-v05',0,[0,.95,0]),W,18,.8),S('钥匙格',[.5,2.75,-1.7],A('theme-hotel-key-rack-v05',0,[0,.35,0]),N,5,.48,3.5)],bounce:P('访客反射',[-1.4,1.5,.5],N,.85,3.8)},
 'hotel-02':{intent:'床头暖、书桌冷，中央暗',spots:[S('床头',[-.5,2.5,-1.4],[-1.5,.6,-.7],W,12,.66),S('书桌',[1.8,2.6,-.4],A('furniture-writing-desk',0,[0,.8,0]),C,8,.62)],bounce:P('低入口光',[0,1.4,1.5],N,.45,2.5)},
 'hotel-03':{intent:'同色温双床、右床显著低亮',spots:[S('左床灯',[-.8,2.6,-1.3],[-1.55,.6,-.65],W,13,.62),S('右床灯',[.8,2.6,-1.3],[1.55,.6,-.65],W,5,.62)],bounce:P('入口微光',[0,1.6,1.3],N,.55,3)},
 'hotel-04':{intent:'前厅暖、深床中性、帘后留暗',spots:[S('前厅',ceiling(-.7,2),[-1.1,.6,2],W,15,.86,5.5),S('床沿',[.5,2.6,-2.3],[-.8,.8,-2.8],N,11,.68,5)],bounce:P('连接段',[1,1.5,-.3],C,.65,4)},
 'hotel-05':{intent:'布草工作面中性，深柜灰暗',spots:[S('推车工作面',ceiling(.9,.4),A('scene-laundry-basket-v03',0,[0,.45,0]),N,15,.72),S('柜外沿',[-1.4,2.65,.6],[-2,1,.2],N,5,.45)],bounce:P('后柜反射',[1,1.5,-1.4],W,.55,3)},
 'hotel-06':{intent:'台面暖白，箱面低斜光；逆向箱不过曝',spots:[S('登记面',ceiling(-.3,-.8),A('furniture-coffee-table',0,[0,.5,0]),W,12,.7),S('箱组侧光',floorLamp,[.3,.3,.7],N,6,.75,4.5)],bounce:P('后墙反射',[-1,1.4,-1.5],N,.5,3)},
 'hotel-07':{intent:'两侧暖池，中轴低中性',spots:[S('左会客',floorLamp,[-1.8,.6,-.1],W,10,.85,4.5),S('右会客',[1.7,2.5,-.5],[1.9,.6,0],W,8,.72,4.5)],bounce:P('中轴反射',[0,1.5,.5],N,.7,3)},
 'hotel-08':{intent:'电脑工作面冷白、床侧低暖，镜面不抢焦点',spots:[S('工作位',[1.65,2.6,.1],A('prop-computer-desk-v01',0,[0,.9,0]),C,12,.68),S('床侧',[-.5,2.5,-1.6],[-1.55,.6,-1.1],W,6,.6)],bounce:P('柜边反射',[1,1.5,-1.5],N,.55,3)},
 'ritual-01':{intent:'供桌暖，像脸遮阴，不直射面部',spots:[S('供碗侧光',[-1.1,1.5,-1.4],[0,.65,-1.55],W,7,.48,3.5),S('侧桌低光',[1.8,2.5,.3],[1.6,.6,.5],N,4,.56,3.5)],bounce:P('入口冷灰',[0,1.6,1.4],C,.55,3)},
 'ritual-02':{intent:'两侧低饱和冷暖、中轴保持暗',spots:[S('左像侧缘',[-2.1,2.5,-.4],[-1.6,1,-.8],W,10,.4,3.5),S('右像侧缘',[2.1,2.5,-.4],[1.6,1,-.8],C,8,.4,3.5)],bounce:P('入口参照',[0,1.6,1.7],N,.35,2)},
 'ritual-03':{intent:'守夜灯温暖低位，出口冷灰可读',spots:[S('供桌',ceiling(.6,-3),A('furniture-offering-table',0,[0,.8,0]),W,15,.64,5),S('近守夜席',[-1.5,2.4,2.1],[-1.2,.5,1.4],W,6,.63,4.5)],bounce:P('出口参照',[.5,1.5,3.4],C,.8,4)},
 'ritual-04':{intent:'器物中性，红木颜色来自材质',spots:[S('器物台',ceiling(1,.5),A('furniture-offering-table',0,[0,.8,0]),N,14,.62),S('柜边',[-1.2,2.6,-1.5],[-1.5,1,-2],W,5,.46)],bounce:P('低中性反射',[-1.4,1.3,.6],N,.55,3)},
 'ritual-05':{intent:'外圈暖光、空心弱红，椅子保留暗层次',spots:[S('左外圈',[-1.6,2.6,-.8],[-1,.6,-.45],W,10,.45),S('右外圈',[1.6,2.6,-.1],[1,.6,-.45],W,8,.45)],bounce:P('中心弱红',[0,.8,-.45],R,.32,2.3)},
 'ritual-06':{intent:'起居暖光、神龛低中性，两区靠遮挡划分',spots:[S('生活角',floorLamp,[-1.4,.5,-.1],W,11,.8,4.5),S('神龛侧缘',[1,2.6,-1.4],A('furniture-shrine-cabinet',0,[0,1,0]),N,6,.48)],bounce:P('中性门口',[0,1.5,1.5],N,.45,3)},
 'ritual-07':{intent:'后端两层红，柜间门槛后才进入色区，入口中性',spots:[S('供桌暖红',[.4,2.65,-1.2],[0,.7,-1.7],0xf07b51,16,.66,4.5),S('帘面深红',[-1.1,2.6,-1.4],[.3,1.25,-2.35],0xc32f3c,11,.65,3.5)],bounce:P('中性入口',[0,1.5,1.8],N,.9,3)},
 'ritual-08':{intent:'柜背冷暗，尽头供桌暖白，左右微差',spots:[S('末端供桌',ceiling(.4,-3.3),[0,.75,-3.8],W,19,.65,5),S('左柜背边',ceiling(-1,2.5),[-1.9,1,1],C,5,.4,4.5)],bounce:P('右柜低反射',[1.3,1.4,-.4],N,.55,4)},
};

export function createThemedRoomLighting({root,recipe,owned,ambient=true}) {
 if(root.userData.themedRoomLighting)throw new Error('Themed room lighting already installed');
 const profile=THEMED_LIGHTING_PROFILES[recipe.id];
 if(!profile)throw new Error(`Missing authored lighting profile: ${recipe.id}`);
 const group=new THREE.Group();group.name=`lighting:${recipe.id}`;
 const warnings=[],lights=[],sources=[],targets=[];
 function resolve(value) {
  if(Array.isArray(value))return new THREE.Vector3(...value);
  const assets=[value.asset].flat();
  const asset=assets.find(id=>recipe.placements.some(p=>p.assetId===id));
  const placements=recipe.placements.filter(p=>p.assetId===asset);
  const item=placements[value.index];
  if(!item){warnings.push(`缺少灯光锚点，停用对应灯：${value.asset}[${value.index}]`);return null;}
  const object=root.getObjectByName(item.id??item.layoutId);
  const p=object?object.position.clone():new THREE.Vector3(item.x,item.y,item.z);
  if(!object)warnings.push(`使用布局坐标：${item.id??item.layoutId}`);
  return p.add(new THREE.Vector3(...value.offset));
 }
 // Resolve before installing so a missing layout anchor leaves no partial lights.
 const definitions=profile.spots.map(s=>({...s,position:resolve(s.from),target:resolve(s.to)})).filter(s=>s.position&&s.target);
 const bouncePosition=resolve(profile.bounce.from);
 const hemisphere=new THREE.HemisphereLight(0xc0c9ca,0x49413a,.32);
 hemisphere.name='neutral-room-floor';hemisphere.visible=Boolean(ambient);group.add(hemisphere);owned.add(hemisphere);
 for(const d of definitions){
  const light=new THREE.SpotLight(d.color,d.power,d.range,d.angle,.78,2);
  light.name=d.role;light.position.copy(d.position);light.target.position.copy(d.target);
  light.castShadow=true;light.shadow.mapSize.set(1024,1024);
  light.shadow.camera.near=.06;light.shadow.camera.far=d.range;
  light.shadow.bias=-.00012;light.shadow.normalBias=.012;
  group.add(light,light.target);owned.add(light);lights.push(light);targets.push(light.target);
  sources.push({role:d.role,position:d.position.toArray(),target:d.target.toArray(),color:d.color,intensity:d.power,angle:d.angle,range:d.range,shadow:true});
 }
 const b=profile.bounce,fill=new THREE.PointLight(b.color,b.power,b.range,2);
 fill.name=b.role;fill.position.copy(bouncePosition);group.add(fill);owned.add(fill);lights.push(fill);
 sources.push({role:b.role,position:bouncePosition.toArray(),color:b.color,intensity:b.power,range:b.range,shadow:false});
 root.add(group);
 const controller={
  setEnabled(enabled){
   group.visible=Boolean(enabled);
   if(!enabled)for(const l of lights)if(l.shadow){l.shadow.map?.dispose();l.shadow.map=null;l.shadow.mapPass?.dispose();l.shadow.mapPass=null;}
  },
  setAmbientEnabled(enabled){hemisphere.visible=Boolean(enabled);},
  inspect(){return {version:1,id:recipe.id,intent:profile.intent,enabled:group.visible,ambient:hemisphere.visible?.32:0,shadowLights:definitions.length,shadowFaces:definitions.length,lights:sources,warnings:[...warnings]};},
 };
 root.userData.themedRoomLighting=controller;
 // Caller disposes lights through owned; this finalizer handles graph/ownership.
 owned.add({dispose(){group.removeFromParent();group.clear();targets.length=0;lights.length=0;delete root.userData.themedRoomLighting;}});
 return controller;
}
