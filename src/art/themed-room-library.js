import { THEMED_ASSETS as INTERIOR_ASSETS } from './themed-room-assets.js';
import {getRoomDesign} from './themed-room-designs.js';
import {finishThemedRooms} from './themed-room-finishing.js';

// Authored art proposals. No random calls, map mutation, event binding or seed consumption.
// Metres, floor y=0, ceiling y=3, +Z entrance, models face +Z before yaw.
export const ROOM_THEMES = [
  {id:'hospital',name:'医院',look:'clinic',color:0xd3e7dc,accent:0xaccfc3},
  {id:'park',name:'游乐场',look:'nursery',color:0xffc989,accent:0xe6a3ad},
  {id:'office',name:'公司',look:'archive',color:0xd9dfc6,accent:0x9bb7a8},
  {id:'home',name:'个人住宅',look:'bedroom',color:0xffd4a0,accent:0xa2b2ba},
  {id:'hotel',name:'旅馆',look:'parlor',color:0xffc89a,accent:0xb39378},
  {id:'ritual',name:'祭祀空间',look:'shrine',color:0xffbd83,accent:0xd83a31},
];
const aliases = {
 bed:'furniture-bed-single',iron:'bed-iron-rail-v01',canopy:'bed-canopy-linen-v01',divan:'bed-low-divan-v01',vanity:'vanity-oval-mirror-v01',
 night:'furniture-nightstand',dresser:'furniture-dresser',wardrobe:'furniture-wardrobe',book:'furniture-bookcase',sofa:'furniture-sofa-two-seat',coffee:'furniture-coffee-table',display:'furniture-display-cabinet',
 toybox:'furniture-toy-chest',child:'furniture-child-table',toys:'furniture-toy-shelf',cot:'furniture-examination-cot',trolley:'furniture-instrument-trolley',medicine:'furniture-medicine-cabinet',medical:'furniture-medical-file-cabinet',
 desk:'furniture-writing-desk',document:'furniture-document-table',archive:'furniture-archive-shelf',file:'furniture-multi-drawer-file-cabinet',altar:'furniture-offering-table',bench:'furniture-kneeling-bench',shrine:'furniture-shrine-cabinet',arm:'furniture-armchair-curved',chair:'furniture-dining-chair',
 tablelamp:'lighting-table-lamp',floorlamp:'lighting-floor-lamp',strip:'lighting-strip-double',chandelier:'lighting-chandelier-three-arm',sconce:'lighting-wall-sconce',bulb:'lighting-pendant-bare-bulb',greenlamp:'lighting-desk-lamp-green',curtain:'fixture-curtain-oxblood-velvet',mirror:'fixture-mirror-aged',radiator:'fixture-radiator-cast-iron',window:'architecture-window-four-pane',door:'architecture-door-panelled',
};
// [asset alias, x, z, yaw in degrees, group, bottom y]. Groups describe purposeful clusters.
const p=(asset,x,z,yaw=0,group='主体',y=0)=>({assetId:aliases[asset],x,z,yaw,y,group});
const rooms=[];
function room(theme,id,name,composition,reveal,items,options={}) {
 const themeInfo=ROOM_THEMES.find(t=>t.id===theme);
 const recipe={id:`${theme}-${id}`,theme,name,composition,reveal,intensity:options.intensity??2,width:5,depth:options.depth??5,height:3,look:themeInfo.look,focus:options.focus??[0,1.15,-1.5],...options,placements:items};
 // One keyed light, practical model and opposite dim fill. No random layout at load time.
 recipe.key=options.key??[-.8,2.45,-1.2];
 recipe.placements.push(p(theme==='hospital'||theme==='office'?'strip':theme==='ritual'?'bulb':'chandelier',recipe.key[0],recipe.key[2],0,'照明',2.48));
 recipe.placements.push(p('door',0,recipe.depth/2-.08,180,'入口'));
 recipe.placements.forEach((item,index)=>{item.id=`${recipe.id}-${index}`;});
 rooms.push(recipe);
}
// Hospital: bilateral beds, reception screen, examination island and compressed archive.
room('hospital','01','夜间分诊室','左侧问诊，右侧空椅；文件柜封住后景。','先看见空着的问诊椅，再发现背后的柜门朝向不一致。',[p('desk',-1.2,-.8),p('chair',-1.2,.25,180),p('medical',-1.3,-2.08),p('medical',.15,-2.08,180),p('arm',1.7,-.8,-90),p('radiator',-2.3,1,90)],{focus:[-1.1,1,-.8]});
room('hospital','02','末班候诊室','两组侧向候诊椅，中间留出纵深；最后一把椅子面墙。','进入时读到秩序，走近尽头才看到反向座位。',[p('chair',-1.85,.6,90),p('chair',-1.85,-.15,90),p('chair',-1.85,-.9,90),p('chair',1.85,.6,-90),p('chair',1.85,-.15,-90),p('chair',1.85,-.9,-90),p('chair',0,-1.95,180),p('medical',-1.25,-2.08),p('radiator',2.3,1.6,-90)],{intensity:2,focus:[0,.8,-1.9]});
room('hospital','03','隔离病房','双床沿两边排列，尽头只有一张偏离床轴的空床。','先经过成对床位，尽头空床突然转向入口。',[p('iron',-1.55,2.1),p('iron',1.55,2.1),p('iron',-1.55,-.5),p('iron',1.55,-.5),p('cot',0,-3.9),p('night',-1.5,3.45),p('night',1.5,3.45),p('medicine',1.6,-4.55),p('trolley',-1.6,-3.5),p('curtain',-2.4,-1.8,90,'隔离',.1)],{depth:10,focus:[0,1,-3.9],key:[0,2.45,-2.6],intensity:3});
room('hospital','04','检查室','偏左检查床与右侧器械工作区，中后景留出轮廓。','手电先扫到金属边缘，再看清床头背后的一组空柜。',[p('cot',-.65,-.65,90),p('trolley',1.6,-.6,90),p('medicine',-1.2,-2.08),p('medicine',.3,-2.08),p('chair',1.85,1,-90),p('medical',-1.9,1.15,90)],{focus:[-.65,.9,-.65]});
room('hospital','05','夜班药房','两侧药柜形成窄巷，终点是孤立的配药台。','柜子连续遮挡，最后才露出亮着的空工作台。',[p('medicine',-2.08,.45,90),p('medicine',-2.08,-1.05,90),p('medicine',2.08,.45,-90),p('medicine',2.08,-1.05,-90),p('trolley',0,-1.75),p('medical',-1.5,-2.08),p('medical',1.5,-2.08)],{focus:[0,.9,-1.75],intensity:3,key:[0,2.45,-1.7]});
room('hospital','06','值班休息室','侧床、靠墙沙发与低桌构成有人生活过的角落。','入口能见到正常休息区，床尾的柜子却面向墙壁。',[p('bed',-1.7,-.6),p('sofa',1.25,-1.9),p('coffee',1.25,-.75),p('wardrobe',-1.6,1.55,180),p('medical',1.9,1.1,-90),p('floorlamp',.3,-2.15)],{focus:[1.2,1,-1.7],key:[1,2.45,-1.2]});
room('hospital','07','病案封存库','双列病案柜与断开的工作岛；一条阅读路径。','先看文件堆积，再发现尽头唯一反向的病床。',[p('medical',-2.08,2.7,90),p('medical',-2.08,1.3,90),p('medical',-2.08,-.1,90),p('medical',2.08,1.8,-90),p('medical',2.08,.4,-90),p('document',1.45,-2),p('cot',-.6,-3.9,180),p('archive',1.6,-4.55),p('chair',1.45,-.95,180)],{depth:10,focus:[-.6,.9,-3.9],intensity:3});
room('hospital','08','遗留物保管室','正面陈列柜、左侧床与右侧空白墙构成不均衡。','柜中物件先吸引视线，回看入口才发现一张独立等待椅。',[p('display',-1.4,-2.08),p('display',.1,-2.08),p('cot',-1.8,.15,90),p('toybox',1.55,-1.6),p('chair',1.7,1.4,180),p('medical',-1.8,1.5,90)],{focus:[-.8,1.4,-2],intensity:3});
// Park: authored indoor support spaces. No fabricated ride meshes.
room('park','01','闭园售票室','双柜台错位，售票员椅子退入侧后方。','先读到服务窗口的节奏，再发现没有面向游客的座位。',[p('desk',-1.25,-.7),p('document',1.2,-1.35),p('chair',-1.25,-1.75),p('file',1.6,.7,-90),p('toys',-1.3,1.55,180),p('window',1.1,-2.42,0,'售票口',1.35)],{focus:[-1.2,1,-.7]});
// Real delivered stage, separate stairs, lectern and rostrum; no cabinet stand-in.
room('park','02','无人领奖台','主席台、左侧阶与主持讲台构成完整舞台；两列观众席夹出中央通道。','先辨认颁奖空间；走近空领奖位，回望发现一张观众椅朝着入口。',[
 {assetId:'theme-stage-deck-v06',x:0,z:-2.7,y:0,yaw:90,group:'舞台',key:'stage'},
 {assetId:'theme-stage-stairs-v06',x:-2.31,z:-2.7,y:0,yaw:90,group:'舞台侧阶'},
 {assetId:'theme-award-podium-v05',x:.45,z:-2.8,y:.45,yaw:90,group:'领奖位',supportKey:'stage'},
 {assetId:'theme-ceremony-lectern-v05',x:-1.05,z:-1.95,y:.45,yaw:180,group:'主持位',supportKey:'stage'},
 p('display',-3.55,-3.7,0,'奖品侧翼'),p('display',3.55,-3.7,0,'奖品侧翼'),
 p('dresser',3.55,-1.9,0,'奖品台'),
 {assetId:'theme-trophy-cup-v05',x:3.55,z:-1.9,y:.88,yaw:0,group:'奖品台',supportKey:'prize-table'},
 p('curtain',-1,-4.82,0,'后台帷幕',.1),p('curtain',1,-4.82,0,'后台帷幕',.1),
 ...[.2,1.5,2.8].flatMap((z,row)=>[-2.45,-1.5,1.5,2.45].map((x,i)=>p('chair',x,z,row===2&&i===3?0:180,'观众席'))),
 p('floorlamp',-3.7,.2,0,'观众入口'),p('floorlamp',3.7,2.9,0,'观众入口')
],{width:10,depth:10,focus:[0,1.05,-2.3],key:[0,2.45,-2.4],intensity:3,implementation:'production-candidate',ceilingStyle:'stage'});
rooms.at(-1).placements.find(p=>p.assetId==='furniture-dresser').key='prize-table';

room('park','03','雨天手工教室','三张小桌错落组成斜线，教具集中一侧。','沿桌子逐步靠近教具柜，发现最后一张桌子没有座位。',[p('child',-1.15,1),p('child',1.15,-.3),p('child',-.8,-1.45),p('chair',-1.15,.05),p('chair',1.15,.65,180),p('toys',2.08,-1.45,-90),p('toybox',-2.08,-.3,90)],{focus:[-.8,.65,-1.45]});
room('park','04','走失儿童等候室','两侧成人座位围住低矮玩具区，后墙保留空缺。','正常等候席之后，是转向角落的儿童桌。',[p('sofa',-2.03,-.15,90),p('arm',1.8,.2,-90),p('child',.9,-1.7,180),p('toybox',-1.25,-1.85),p('toys',1.55,1.65,180),p('floorlamp',-2.1,1.65),p('curtain',0,-2.42,0,'遮蔽',.1)],{focus:[.9,.6,-1.7],intensity:3});
room('park','05','演员化妆间','两面梳妆镜不对称，衣柜占据一侧后景。','先看见工作镜，移步后才发现另一面镜子朝着衣柜。',[p('vanity',-1.4,-1.95),p('chair',-1.4,-.85,180),p('vanity',1.95,-.3,-90),p('chair',.95,-.3,90),p('wardrobe',1.3,1.6,180),p('dresser',1.1,-2.08),p('floorlamp',-2.1,.8)],{focus:[-1.4,1.3,-1.9]});
room('park','06','旧奖品仓','两侧高低储物错位，尽头儿童桌被大柜夹住。','穿过大尺度储物后，低矮的儿童家具才进入视野。',[p('toys',-2.08,2.5,90),p('toybox',2.08,2.5,-90),p('display',2.08,.8,-90),p('toys',-2.08,.4,90),p('wardrobe',-1.55,-4.55),p('display',1.55,-4.55),p('child',0,-3.65),p('toybox',1.65,-2.2),p('chair',-1.6,-1.55,90)],{depth:10,intensity:4,focus:[0,.65,-3.65]});
room('park','07','闭园员工室','一边用餐一边休息，中央留出大片空地。','用餐桌上已有旧物，墙角的玩具柜却不属于员工区域。',[p('document',-1.1,-.65),p('chair',-1.1,.4,180),p('chair',-1.1,-1.7),p('sofa',1.7,-.5,-90),p('wardrobe',1.5,1.5,180),p('toys',1.5,-2.08),p('radiator',-2.3,1.2,90)],{focus:[1.5,1.2,-2]});
room('park','08','帷幕后等候厅','错位座椅面向封闭帷幕，角落只留一个陈列柜。','整齐座椅引导前行，最后发现它们面对一面实墙。',[p('chair',-1.1,.6,180),p('chair',1.1,.6,180),p('chair',-1.1,-.5,180),p('chair',1.1,-.5,180),p('curtain',-.65,-2.42,0,'帷幕',.1),p('curtain',.65,-2.42,0,'帷幕',.1),p('display',2.08,1.3,-90),p('toybox',-1.5,1.75)],{intensity:4,focus:[0,1.5,-2.4],key:[0,2.45,-1.3]});
// Office: analogue paperwork supported by current approved assets.
room('office','01','无人前台','单张前台桌偏左，右侧接待席，后景密集柜墙。','越过服务台后才发现工作人员椅子背对柜台。',[p('desk',-.9,-.65),p('chair',-.5,-1.7,180),p('file',-1.4,-2.08),p('file',1.4,-2.08),p('arm',1.8,.35,-90),p('arm',1.8,1.4,-90),p('radiator',-2.3,1.3,90)],{focus:[-.9,.85,-.65]});
room('office','02','夜班工位','四个侧向工作位，尽头唯一一张桌子面向来人。','重复工位遮挡侧景，尽头空座形成反向注视。',[p('desk',-1.65,2.4,90),p('chair',-.65,2.4,-90),p('desk',1.65,1.1,-90),p('chair',.65,1.1,90),p('desk',-1.65,-.2,90),p('chair',-.65,-.2,-90),p('desk',1.65,-1.5,-90),p('chair',.65,-1.5,90),p('desk',0,-3.9),p('chair',0,-2.85,180),p('file',-1.65,-4.55)],{depth:10,intensity:3,focus:[0,1,-3.9]});
room('office','03','裁撤会议室','三张文件桌接成纵轴，座椅集中左侧，右侧空缺。','进入先看到会议桌，绕行才发现两边座位数量不一致。',[p('document',0,-1.1,90),p('document',0,.4,90),p('chair',-1.05,-1.45,90),p('chair',-1.05,-.55,90),p('chair',-1.05,.45,90),p('chair',1.05,-1.15,-90),p('file',1.65,1.5,180)],{focus:[0,.85,-.7],intensity:3});
room('office','04','封存档案室','两侧档案墙与尽头孤立文件桌，形成狭长透视。','靠近尽头才看到桌面上已有的纸堆。',[p('archive',-2.08,2.8,90),p('archive',-2.08,1.3,90),p('archive',-2.08,-.2,90),p('archive',-2.08,-1.7,90),p('file',2.08,2.1,-90),p('file',2.08,.6,-90),p('file',2.08,-.9,-90),p('document',0,-3.7),p('chair',0,-2.65,180),p('book',1.6,-4.55)],{depth:10,focus:[0,.9,-3.7],intensity:4});
room('office','05','合伙人办公室','斜向观看的宽阔书桌，后墙书柜与侧面会客区。','先看到桌面，随后才在侧方发现面向墙的客椅。',[p('desk',-.8,-1),p('arm',-.8,-2),p('book',-2.08,-1,90),p('sofa',1.95,-.1,-90),p('coffee',.9,.3,90),p('chair',-1.6,1.3,90),p('floorlamp',1.95,-1.9)],{focus:[-.8,.9,-1]});
room('office','06','收发登记室','前方交接桌与后方双柜错位；左边候取区。','文件桌挡住下半视线，向右移步才看见两张面对面的空椅。',[p('document',-.9,-.8),p('file',1.55,-2.08),p('file',-1.55,-2.08),p('chair',1.8,-.6,-90),p('chair',.7,-.6,90),p('archive',-2.08,1.2,90),p('dresser',1.55,1.65,180)],{focus:[1.2,.8,-.6],intensity:3});
room('office','07','离职面谈室','桌子在右，低沙发在左，背后只有一组孤立档案柜。','两个谈话位置正常，第三把椅子却面向入口。',[p('desk',1,-.9),p('chair',1,.15,180),p('chair',1,-1.95),p('sofa',-1.8,-.6,90),p('file',-1.4,-2.08),p('chair',-1.6,1.5),p('floorlamp',2.05,1.3)],{intensity:3,focus:[1,.85,-.9]});
room('office','08','停用阅档室','低阅读桌与高书柜形成尺度反差，后墙出现一个空位。','两边满档，中间的空白墙成为唯一视觉焦点。',[p('book',-1.55,-2.08),p('book',1.55,-2.08),p('document',-1.25,.1,90),p('chair',-.2,.1,90),p('archive',2.08,.15,-90),p('file',-1.55,1.7,180),p('chair',.8,-1.3,180)],{focus:[0,1.4,-2.4],intensity:3});
// Home: distinct everyday programmes, not recoloured bedrooms.
room('home','01','独居卧室','床贴左侧，梳妆区在远端，右侧大面积留白。','床先建立熟悉感，镜子与空椅成为第二焦点。',[p('bed',-1.55,-.6),p('night',-.55,-1.5),p('vanity',1.25,-2.08),p('chair',1.25,-1.05,180),p('wardrobe',1.7,1.45,180),p('floorlamp',-2.1,1.4)],{focus:[1.25,1.2,-2]});
room('home','02','旧客厅','沙发、低桌与单人椅构成不闭合的会客三角。','桌面引入视线，最后发现单椅对着无人的角落。',[p('sofa',-.9,-1.9),p('coffee',-.9,-.65),p('arm',1.35,-.45,-90),p('display',1.65,1.5,180),p('book',-2.08,.6,90),p('floorlamp',.3,-2.1)],{focus:[-.9,.85,-1.9]});
room('home','03','双人儿童房','双床的对称被一侧封住的玩具柜打断。','两张床似乎一样，靠近才看到其中一侧没有离床的桌椅。',[p('bed',-1.55,-.7),p('bed',1.55,-.7),p('toybox',-1.55,1.05),p('child',.85,1.2),p('toys',0,-2.08),p('chair',-.3,1.2,90)],{focus:[0,1.2,-2],intensity:3});
room('home','04','家中书房','书桌靠后，书柜包住左角，空椅留在入口右侧。','先读到密集书背，再看到被灯光隔离的桌面。',[p('desk',.7,-1.5),p('chair',.7,-.4,180),p('book',-1.45,-2.08),p('book',-2.08,-.5,90),p('archive',-2.08,1,90),p('arm',1.75,1.3,-90),p('floorlamp',1.9,-1.9)],{focus:[.7,.9,-1.5]});
room('home','05','祖母起居室','低床、扶手椅与镜台三组各自独立，中央保留迂回动线。','旧镜台在远端，床后衣柜把视线切成两段。',[p('divan',-1.5,-.6),p('vanity',1.3,-2.08),p('arm',1.6,.1,-90),p('night',.7,.8),p('wardrobe',-1.55,1.55,180),p('radiator',2.3,1.5,-90)],{focus:[1.3,1.3,-2],intensity:3});
room('home','06','家庭餐室','两张旧桌拼成横向餐台；只摆三把椅子。','第四个座位留空，后方柜子却像另一位旁观者。',[p('document',-.7,-.65),p('document',.7,-.65),p('chair',-1.5,.4,180),p('chair',0,.4,180),p('chair',1.5,.4,180),p('display',-1.5,-2.08),p('dresser',1.4,-2.08),p('radiator',-2.3,1.4,90)],{focus:[0,.9,-.65],intensity:2});
room('home','07','旧物储藏间','高柜封侧墙、旧家具由近密到远疏，尽头只留床头柜。','穿过不同时期的家具，最后看到一件被单独照亮的小家具。',[p('wardrobe',-2.08,2.6,90),p('book',2.08,1.6,-90),p('dresser',-2.08,.8,90),p('toybox',1.65,-.4),p('sofa',-1.65,-1.9,90),p('display',1.6,-3),p('night',0,-4),p('chair',-1.5,-4.2,180),p('floorlamp',.8,-4.3)],{depth:10,focus:[0,.8,-4],intensity:4});
room('home','08','被遮住的婚房','高架床占据左侧，双镜梳妆的秩序被一张转向的椅子破坏。','先看到床幔，再看见镜子中的空座方向不一致。',[p('canopy',-1.3,-.65),p('vanity',1.5,-1.95),p('chair',1.5,-.85,90),p('dresser',1.5,1.55,180),p('night',.1,-1.5),p('curtain',-2.42,1.4,90,'遮蔽',.1)],{focus:[-1.3,1.7,-.65],intensity:3});
// Hotel: occupancy, waiting, storage and ceremonial hospitality.
room('hotel','01','深夜接待间','前台靠后偏右，左侧等候椅引导视线横移。','先见接待台，走近才看见台后没有座位。',[p('desk',.9,-1),p('file',1.5,-2.08),p('display',-1.5,-2.08),p('arm',-1.8,-.25,90),p('arm',-1.8,1.1,90),p('coffee',-.7,.5,90),p('floorlamp',2,1.4)],{focus:[.9,1,-1]});
room('hotel','02','经济单人间','铁床与窄桌沿左右两边，后墙保持压抑的空白。','床侧的私人家具让陌生房间像被长期占用。',[p('iron',-1.5,-.7),p('night',-.5,-1.55),p('desk',1.9,-.5,-90),p('chair',.9,-.5,90),p('wardrobe',1.55,1.55,180),p('curtain',.3,-2.42,0,'窗帘',.1)],{focus:[-1.5,.85,-.7]});
room('hotel','03','无人双床间','同向双床与两件不同床头家具，中央一条空走道。','靠近才发现两张床的新旧与床头配置并不匹配。',[p('iron',-1.55,-.65),p('bed',1.55,-.65),p('night',-.55,-1.5),p('dresser',1.5,1.55,180),p('wardrobe',-1.55,1.55,180),p('mirror',.5,-2.42,0,'镜面',1.5)],{focus:[0,1,-1.6],intensity:3});
room('hotel','04','蜜月套房','前方客厅到后方高架床两段空间，右侧梳妆结束视线。','经过低家具后，高架床的体量突然占满远景。',[p('sofa',-1.9,2,90),p('coffee',-.7,2,90),p('arm',1.5,2.2,-90),p('canopy',-.9,-2.8),p('vanity',1.6,-4.5),p('chair',1.6,-3.4,180),p('night',.4,-2.4),p('wardrobe',2.08,-.5,-90)],{depth:10,focus:[-.9,1.65,-2.8],intensity:3});
room('hotel','05','换季布草间','衣柜沿两侧排开，矮柜组成后方工作带。','高柜之间的缝隙先隐藏后景，再露出一把面向墙的椅子。',[p('wardrobe',-2.08,.5,90),p('wardrobe',2.08,.5,-90),p('wardrobe',-2.08,-1,90),p('dresser',1.3,-2.08),p('toybox',-.3,-1.9),p('chair',.7,-.7,180),p('night',1.6,1.65)],{focus:[.7,.85,-.7],intensity:3});
room('hotel','06','退房行李室','高低柜按三组分布，中央靠后一张孤立低桌。','储物边缘层层挡住视线，低桌上方却异常空旷。',[p('wardrobe',-1.5,-2.08),p('display',1.5,-2.08),p('toybox',-1.6,.3,90),p('dresser',1.65,.3,-90),p('coffee',0,-.9),p('arm',-1.6,1.6,180),p('floorlamp',1.95,1.65)],{focus:[0,.5,-.9],intensity:3});
room('hotel','07','楼层休息厅','两张沙发互望，末端单椅形成不对称第三组。','在对称座位之间前行，尽头单椅却朝向侧墙。',[p('sofa',-1.95,0,90),p('sofa',1.95,0,-90),p('coffee',0,0,90),p('arm',-.8,-1.8,90),p('display',1.5,-2.08),p('floorlamp',-2.1,-1.85),p('radiator',-2.3,1.6,90)],{focus:[-.8,1,-1.8],intensity:2});
room('hotel','08','长住客房','床被推到角落，办公与梳妆争夺房间中央的视线。','像日常使用的房间，衣柜却转向入口并遮住一半床。',[p('divan',-1.55,-1.1),p('desk',1.85,.05,-90),p('chair',.85,.05,90),p('vanity',1.3,-2.08),p('wardrobe',-1.55,1.5,180),p('night',-.5,-1.85),p('floorlamp',2,1.8)],{focus:[1.3,1.3,-2],intensity:3});
// Ritual: narrative spatial rules, controlled empty foreground and independent accent light.
room('ritual','01','单人祈祷室','矮凳对准供桌，单侧神柜打破中轴。','先见矮凳，供桌后只留下空白。',[p('altar',0,-1.55),p('bench',0,-.15,180),p('shrine',-1.5,-2.08),p('curtain',1.35,-2.42,0,'帷幕',.1),p('chair',1.7,1.3,180)],{focus:[0,1,-1.55],intensity:3});
room('ritual','02','双像对视室','左右两柜互相对视，主轴上没有神像。','从门口只能看到侧面，走入后才看清两柜朝向彼此。',[p('shrine',-1.75,-.9,90),p('shrine',1.75,-.9,-90),p('altar',0,-2.05),p('bench',-.9,.65,90),p('bench',.9,.65,-90),p('curtain',0,-2.42,0,'背景',.1)],{focus:[0,1.3,-.9],intensity:4});
room('ritual','03','守夜席','两列跪凳重复推进，终点供桌偏离中轴。','整齐秩序一直延伸到尽头，最后的偏移才显露。',[p('bench',-1.2,2.2,180),p('bench',1.2,2.2,180),p('bench',-1.2,.6,180),p('bench',1.2,.6,180),p('bench',-1.2,-1,180),p('bench',1.2,-1,180),p('altar',.6,-3.75),p('shrine',-1.6,-4.55),p('curtain',.6,-4.92,0,'背景',.1)],{depth:10,intensity:4,focus:[.6,1,-3.75],key:[.6,2.45,-3]});
room('ritual','04','祭器保管室','陈列柜与神柜交替，不同高度把供桌切成局部。','先看到储藏秩序，再发现一张供桌被藏在侧方。',[p('display',-2.08,.4,90),p('shrine',2.08,-1,-90),p('display',-1.45,-2.08),p('display',.05,-2.08),p('altar',1.4,.6,90),p('bench',-.9,.7,90)],{focus:[1.4,1,.6],intensity:3});
room('ritual','05','空座仪式','四把椅子围绕空心，供桌退到远端。','光照落在空处，玩家环顾才意识到所有座位都朝内。',[p('chair',-1.25,-.45,90),p('chair',1.25,-.45,-90),p('chair',-.55,-1.5),p('chair',.55,.6,180),p('altar',0,-2.1),p('shrine',-1.6,1.55,180),p('curtain',1.4,-2.42,0,'帷幕',.1)],{focus:[0,.9,-.45],intensity:4,key:[0,2.45,-.45]});
room('ritual','06','旧宅神龛','生活家具与祭器分开成两组，空走道划出边界。','先看见一间普通起居室，再发现柜子对着独立矮凳。',[p('sofa',-1.85,-.1,90),p('coffee',-.65,-.1,90),p('shrine',1.45,-2.08),p('bench',1.45,-.6,180),p('dresser',-1.45,-2.08),p('wardrobe',1.55,1.55,180),p('floorlamp',-2.1,1.7)],{focus:[1.45,1.6,-2],intensity:3});
room('ritual','07','血色前室','红光只停留在远端，前景两柜压出一道入口。','暖色前景过渡到血色背景，中央孤凳最后出现。',[p('shrine',-1.6,1.25,90),p('shrine',1.6,1.25,-90),p('bench',0,-.5,180),p('altar',0,-1.85),p('curtain',-.7,-2.42,0,'血色背景',.1),p('curtain',.7,-2.42,0,'血色背景',.1)],{focus:[0,1,-1.85],intensity:4,key:[0,2.45,-1.6],keyColor:0xff4934});
room('ritual','08','背向神柜长室','神柜沿两侧朝墙，尽头保留一张空供桌。','经过一串柜背后，才意识到所有供奉都背离玩家。',[p('shrine',-1.95,2.5,-90),p('shrine',1.95,2.5,90),p('shrine',-1.95,.7,-90),p('shrine',1.95,.7,90),p('shrine',-1.95,-1.1,-90),p('shrine',1.95,-1.1,90),p('altar',0,-3.8),p('bench',0,-2.2,180),p('curtain',0,-4.92,0,'末端',.1)],{depth:10,focus:[0,1,-3.8],intensity:4,key:[0,2.45,-3.4]});

finishThemedRooms(rooms);
for(const r of rooms) {
 r.design=getRoomDesign(r.id);
 r.productionStatus=r.implementation==='production-candidate'?'实装候选 · 待视觉验收':'完整设计 · 旧布景待重做';
 r.missingAssets=r.design.requiredAssets.filter(id=>!INTERIOR_ASSETS[id]);
}
export const THEMED_ROOMS = rooms;
export function getThemedRoom(id) {
 const recipe=rooms.find(r=>r.id===id); if(!recipe)throw new Error(`Unknown art room: ${id}`);
 return structuredClone(recipe);
}
export function placementBounds(item) {
 const a=INTERIOR_ASSETS[item.assetId]; if(!a)throw new Error(`Missing asset: ${item.assetId}`);
 const r=item.yaw*Math.PI/180,c=Math.abs(Math.cos(r)),s=Math.abs(Math.sin(r));
 return {minX:item.x-(a.width*c+a.depth*s)/2,maxX:item.x+(a.width*c+a.depth*s)/2,minZ:item.z-(a.width*s+a.depth*c)/2,maxZ:item.z+(a.width*s+a.depth*c)/2,minY:item.y,maxY:item.y+a.height};
}
export function getRoomColliders(recipe) {return recipe.placements.filter(p=>!p.supportKey&&!p.wallMounted&&p.y<1.7&&!p.assetId.startsWith('architecture-')&&!p.assetId.startsWith('fixture-')&&!p.assetId.startsWith('lighting-')).map(p=>({id:p.id,...placementBounds(p)}));}
