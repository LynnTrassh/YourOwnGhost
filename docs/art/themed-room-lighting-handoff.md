# 六主题灯光接口交接

状态：接口已可调用，48间独立配置已写入，正在六间画面校准；尚非48间视觉通过。独占 `src/art/themed-room-lighting.js` 和独立 `art-source/themed-lighting-v01/`，不编辑 stage / library / assets / designs / production / 原 preview。

约定导出 `createThemedRoomLighting({root,recipe,owned})`，返回检查及开关接口。新增灯光/目标挂在独立子组，可释放对象注册到 owned。房间坐标沿用布局，灯位参考实际模型位置。既有窄手电、曝光与后处理由调用方持有。

布局方在接口完成后替换 stage 的旧四灯段；不要叠加两套环境光。正式游戏接入与多人房间光源预算属于后续程序适配，不由本模块自行改变。

## 已就绪接口（2026-10-31）

```js
import {createThemedRoomLighting} from './themed-room-lighting.js';
const lighting=createThemedRoomLighting({root,recipe,owned,ambient:true});
// 正式游戏使用 ambient:false；默认 true 保留独立展示效果。
// 返回 lighting.inspect() 和 lighting.setEnabled(boolean)。
```

- 全部坐标在 root 局部空间；root 可整体平移、旋转。匹配 recipe.placements 中 assetId + index，优先使用 root 下对应 id/layoutId 模型的实际 position；autoSupport 的高度修正因此可跟随。
- recipe.design 不会被改写。逐房灯位/目标/强度/色温/光锥独立存于 THEMED_LIGHTING_PROFILES；后续可依据设计变更调此文件，不改布局。
- 当前每间 2 SpotLight（各一张1024阴影）＋1弱 PointLight（无阴影）＋中性 HemisphereLight。比展示页原投影 PointLight 六面阴影更少，但未做GPU实测。
- **正式地图请只启用当前/可见房的灯组，并单独控制相邻房环境光。不能同时启用48组 HemisphereLight。** `setEnabled` 隐藏整个灯组且释放闲置阴影贴图；主世界已有环境光时调用 `setAmbientEnabled(false)`。释放所有 owned 资源由调用方负责。
- 已读取剔除8件模型后的新版布局：检查室灯源支持替换为落地灯；售票室改锚定实际四格窗；布草间改锚定实际洗衣篮。几何替代不等于美术验收，继续在报告标明。
- 六个优先校准房间：hospital-04、park-02、office-02、home-02、hotel-01、ritual-07。与原布局同坐标的检查页正在制作。
- 不生成新模型，不使用新全屏调色，不改手电或摄像机；正式随机池是否完成由适配方报告。

接口更新：支持可选 `ambient=false`；缺锚点会停用对应灯并在 inspect().warnings 报告，不中断整个房间模型加载。

## 首批画面观察（布局仍在更新）

- 六间代表房间已在独立预览做 A/B，灯光锚点均无警告。检查室地面偏移灯斑可读；工位明暗分段、血色前室局部红色已体现。
- 领奖台观众补光原位过高，在天花产生孤立亮斑，已下移到1.65米并降低强度，待新截图更新。
- `home-02` 入口沙发区域有较大的靠背状平面，来源仍需换角度确认，不能凭入口图认定是电视背面、更不能据此直接翻转电视；此前观察名称不准确，在此更正。`hotel-01` 首轮入口看见接待台的柜体后侧/开门面，布局方已报告翻转柜台，待更新画面复核。灯光不会通过压黑模型来掩盖问题。
- 检查页：`/art-source/themed-lighting-v01/index.html`。不依赖修改原 preview，优先复用 stage 已接入的本灯光 controller，避免重复安装。

## 正式适配同步

布局方已报告接入正式生成/渲染，当前房间启用、ambient=false；本轮灯光方不代替其正式回归。按其验证期间请求，暂停大范围参数改动，仅小修 park-01：窗口目标改为固定室内坐标 [1.1,1.65,-2.3]，不再依赖正式适配剔除的 architecture 模型。其余配置维持六间初校版本，继续只读截图检查。

逐房检查发现 office-04 已将整理桌替换为 theme-conference-table-v05，原灯光锚点缺失导致该盏灯停用；已小补丁支持新桌优先、旧桌备选，其他参数未改。首轮截图中该间须复拍，不能用旧图标完成。

## 复拍确认

- office-04 已复拍，主桌灯恢复，inspect.warnings 为0；新图覆盖其入口记录。
- home-02 在当前更宽实际浏览器画面已确认：电视在右侧，屏幕正面可见，**不建议翻转电视**；中央面对入口的大片灰色平面来自沙发背，座面朝向后墙。请布局方复核 sofa 的模型前向。证据：`art-source/themed-lighting-v01/captures/home-02-orientation-review.jpg`。
- park-02 关闭手电检查：舞台仍有主光，观众席低亮可辨，天花孤立亮斑已变弱。保留深暗总体氛围。

## 本轮交付结果

- 48/48 独立灯光配置已写入；按各自功能区、来源、目标、强度、色温和光锥分别设置，不是六主题换色。
- 48/48 入口截图采集，并按六组总览做缩略初查；六间代表房间 A/B 已观察。其余房间未做完整多视角和手电开关逐间精查。
- 当前 `THEMED_ROOM_RECIPES` 的48间灯位锚点静态核对：0缺失。office-04修复后的浏览器检查也为0警告。
- 逐间状态：[`status.json`](../../art-source/themed-lighting-v01/status.json)；每项分别写明配置、入口初查、A/B、遗留问题及 `finalRoomAccepted:false`。
- 截图与原始检查记录：[`captures/observations.json`](../../art-source/themed-lighting-v01/captures/observations.json)。采集期间布局对话更新了模型与台面支撑，记录为各自当时状态；不能声称所有截图是最后同一版本的完整验收。
- 总览：`/art-source/themed-lighting-v01/review.html`；实时A/B：`/art-source/themed-lighting-v01/index.html`。
- 本轮语法检查与 `npm run build` 通过（112模块，保留大分块提示）；无新增测试套件、无GPU计时、无真人试玩。主游戏适配代码已由布局方导入模块；正式生成、碰撞与玩法回归由其记录。
- 材质本轮保留资产原始贴图，没有进一步创建主题材质覆盖。先前通用旧木家具修正不等于这些主题房间全部材质重做。
- 布局需复核：home-02沙发朝向；park-07入口焦点当前偏书架、home-05偏镜台，是否符合新版发现路线；office-03桌面与板面局部亮度需正式曝光下细看。
- 用户已授权本轮本地提交，不推送。初版模块与预览已随 f06208b 进入仓库；本次追加灯位/锚点修正与检查资料，其他对话的正式接入修改由其自行提交。
