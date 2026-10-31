import fs from 'node:fs';
import {THEMED_ROOMS,ROOM_THEMES,getRoomColliders,placementBounds} from '../../../src/art/themed-room-library.js';
import {THEMED_ASSETS} from '../../../src/art/themed-room-assets.js';
const source=JSON.parse(fs.readFileSync('art-source/theme-specific-tripo-v05/manifest.json'));
const requests=new Map(source.assets.map(a=>[a.id,a]));
const packageData={version:'production-design-2',date:'2026-10-31',scope:'48间完整制作方案及当前实装对照；正式游戏未接入',rooms:[]};
for(const r of THEMED_ROOMS){
 const d=r.design,theme=ROOM_THEMES.find(t=>t.id===r.theme);
 const dependencies=d.requiredAssets.map(id=>{const a=THEMED_ASSETS[id],q=requests.get(id);return {id,name:a?.name??q?.name??id,available:Boolean(a),runtimeUrl:a?.url??null,boundsWHD:a?[a.width,a.height,a.depth]:null,requestedBoundsWHD:q?.requestedBoundsWHD??null,status:a?'文件已交付，仍需逐房验证':'文件未交付，不能替代核心用途'};});
 const width=r.id==='park-08'?10:r.width,depth=['park-03','park-08'].includes(r.id)?10:r.depth;
 const room={...d,name:r.id==='park-03'?'雨天室内游艺厅':r.name,theme:r.theme,themeName:theme.name,dimensions:[width,3,depth],oldPreviewDimensions:[r.width,3,r.depth],intensity:r.intensity,
  layoutRule:{entrance:{center:[0,0,depth/2],clearWidth:1.4},minimumMainPath:1.2,minimumLocalPassage:.8,heroZone:d.hero,supportGroups:d.secondaryGroups,negativeSpace:'入口至主功能区保留连续可走带；一块主动留白与高密物件组相邻；不得把剩余空地均匀撒满',scalePolicy:'全部模型保持原比例；有高差的台面与楼梯单独交接可走面'},
  discoveryShots:[{name:'入口',eyeHeight:1.65,action:'站在门内看见主功能组，先确认这是哪里',target:d.hero},{name:'走近',eyeHeight:1.65,action:'沿主通道靠近主物件，保留一组前景边缘',target:d.composition},{name:'侧移发现',eyeHeight:1.65,action:'横移或转头而非自动闪屏',target:d.reveal},{name:'回望',eyeHeight:1.65,action:'从主物件附近回看入口；出口与刚经过的陈设仍可识别',target:d.secondaryGroups[0]}],
  cameraContract:{fov:72,height:1.65,flashlight:'正式窄束配置 Math.PI/7 + configureInteriorFlashlight',cameraDefects:'微弱，独立开关',signalFault:'默认关闭，仅策划根据可见异常显式调用'},
  dependencies,missingAssets:dependencies.filter(a=>!a.available).map(a=>a.id),
  currentVisual:{status:r.id==='park-02'?'主席台重构候选':'已补现有道具；仍须按本设计完成核心结构',placements:r.placements.map(p=>({...p,bounds:placementBounds(p),assetUrl:THEMED_ASSETS[p.assetId].url})),colliders:getRoomColliders(r)},
  acceptance:['去掉房名仍能辨认主用途','主物件/辅助组/小物件三级成立，非柜子通吃','门口、主通路、功能操作位分别验证','支撑、朝向、墙角、顶面逐件检查','四视点实景复核；未做真人试玩不写通过'],
  integration:{runtimeEnabled:false,plannerOwner:'程序/策划',requirements:['确定房间尺寸、门位与种子版本后再注册','陈设占地进入实际碰撞，不在加载阶段再随机摆放','事件/追逐/交互保留原锚点，逐房验收','楼梯和高台当前预览按障碍处理，正式需独立可走面适配']}
 };
 packageData.rooms.push(room);
}
packageData.summary={themes:6,rooms:48,roomsWithAllListedFiles:packageData.rooms.filter(r=>!r.missingAssets.length).length,roomsMissingFiles:packageData.rooms.filter(r=>r.missingAssets.length).length,missingAssetIds:[...new Set(packageData.rooms.flatMap(r=>r.missingAssets))],uniqueUsedModels:new Set(THEMED_ROOMS.flatMap(r=>r.placements.map(p=>p.assetId))).size};
fs.writeFileSync(new URL('./rooms.json',import.meta.url),JSON.stringify(packageData,null,2)+'\n');
let md='# 六主题48间：完整制作方案 V2\n\n这是逐房制作方案与当前实装差距的对照。设计内容齐备不等于48间实景完成；正式随机池尚未接入。所有名称、尺寸、物件分组、发现过程、天花与灯光均在下表展开，不能仅通过换色/换房名验收。\n\n';
md+=`文件核查：48间中${packageData.summary.roomsWithAllListedFiles}间所列核心依赖已有文件，${packageData.summary.roomsMissingFiles}间仍缺文件；共${packageData.summary.missingAssetIds.length}种不同缺项。已有文件也需姿态、表面支撑与视觉验收。\n\n`;
for(const theme of ROOM_THEMES){md+=`## ${theme.name}\n\n`;for(const r of packageData.rooms.filter(r=>r.theme===theme.id)){
 md+=`### ${r.id} ${r.name}\n\n- 尺寸：${r.dimensions[0]}×${r.dimensions[2]}米；实体天花3米。强度L${r.intensity}。\n- 原用途：${r.normalFunction}。\n- 主物件：${r.hero}。\n- 辅助组：${r.secondaryGroups.join('；')}。\n- 构图与疏密：${r.composition}。\n- 玩家发现：${r.reveal}。\n- 天花：${r.ceiling}。\n- 光照：${r.lighting}。\n- 路线：入口辨认用途 → 沿1.2米主通道走近 → 侧移观察异常关系 → 回望确认出口与前景。门内净宽至少1.4米；局部操作通行目标至少.8米。\n- 核心资产：${r.dependencies.map(a=>`${a.name}（${a.available?'已有文件，待场景验收':'未交付'}）`).join('；')}。\n- 当前实装：${r.currentVisual.status}；不能以旧草案截图代替新设计验收。\n\n`;
}}
md+='## 实施与正式接入\n\n布局采用米制、落地原点；+Z为入口，天花3米。所有模型保持真实比例，以实际包围盒替换制作规格。桌面物件必须检测连续平面，无法放下时报告缺口，不悬空或缩成小玩具。舞台/侧阶是独立实体，当前预览按障碍处理，不能据此宣称正式高差导航可用。\n\n现有模型、图像、材质不覆盖。空间、摄影机画质和信号故障保持独立；正常探索微弱画质缺陷，叙事故障默认关闭。正式程序接入需明确房间模板尺寸、门洞、家具碰撞、事件锚点、布局版本及种子兼容策略，并运行生成/导航/事件/玩法回归。\n\n验收分四层记录：设计资料检查、静态布局检查、浏览器实景观察、正式游戏与真人试玩。前一层通过不能代替后一层。\n';
fs.writeFileSync('docs/art/themed-room-production-v2.md',md);
console.log(packageData.summary);
