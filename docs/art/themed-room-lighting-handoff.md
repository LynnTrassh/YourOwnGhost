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
