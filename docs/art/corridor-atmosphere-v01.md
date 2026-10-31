# 通道墙纸与局部灯光候选

本轮针对种子 `1844070019` 第二层 `room-1` 档案室的通道段制作独立实景预览。主题仍为 archive，房壳、家具、剧情占位与碰撞保持实际生成结果；没有注册新走廊主题。入口的原灯光偏暗，因此分别比较灯色、已有灯具的照明范围与纸面老化。主游戏默认效果尚未替换。

- [打开预览](http://127.0.0.1:4190/art-source/corridor-atmosphere-v01/index.html)
- [独立模块](../../src/art/corridor-atmosphere-study.js)
- [预览源码](../../art-source/corridor-atmosphere-v01/preview.js)
- [研究总规范](horror-art-direction/CODEX_心里有鬼_恐怖房间构图与联网研究规范_v1.1.md)

## 定向联网研究

检索日期均为 2026-10-31。中文检索“恐怖 电影 摄影 负空间 灯光 招魂”，英文检索 The Shining John Alcott lighting、Control lighting artist corridors、historic wallpaper conservation、horror cinematography practical lights。以下四条分别覆盖影视、游戏、真实空间及摄影技术；研究文字与本项目推导分列。

### CL01 闪灵室内实用灯

- 来源：[American Cinematographer 对 John Alcott 的访谈](https://theasc.com/article/flashback-the-shining/)，primary interview。
- 已核实文字：Alcott 描述用房间内吊灯、床边及梳妆台台灯照明，并在需要时补光。摄影机移动自由度影响布灯方式。
- 转译：用现有灯具形成固定的明暗区域，允许为通行可读性调整强度。灯光不凭空脱离灯具。
- 区别：不复制酒店平面、标志地毯或具体镜头。本轮未逐镜观看原片，不声称复现片中灯位。
- 用途：仅内部研究；不使用文章剧照作为运行资源。

### CL02 Control 的建筑光影分层

- 来源：[Ron Haimov 自述及作品集](https://ronhaimov.artstation.com/projects/9ezvgo)，primary artist portfolio。
- 已核实文字：作者参与 Containment 区域灯光，并列出团队署名。
- 已看图：浏览器打开该项目第 2/40 张作品（ron-haimov-8.jpg）。可见冷灰绿环境、上部亮区、管道与柱体暗面，以及通往深处的亮暗节奏。
- 本项目推导：保持少量受光面与较大的暗面，使用实际墙角与灯具区分空间深度。低饱和灰绿只作用于选中房间的既有灯。
- 区别：保留旧住宅墙纸和木面，不搬用工业管道、建筑移位或原关卡几何；不新增体积光或动态阴影灯。
- 用途：仅内部分析，图片版权仍属原权利人，不下载到游戏资产。

### CL03 Newark Park 的历史纸面

- 来源：[National Trust 的餐厅天花墙纸记录](https://www.nationaltrust.org.uk/visit/gloucestershire-cotswolds/newark-park/victorian-wallpaper-at-newark-park)，primary heritage record。
- 已核实文字：1881 年手工木版印制的墙纸，修复涉及撕裂与昆虫造成的擦损，并监测湿度。该页图片说明和文字已读取，未对原图做像素分析。
- 转译：保持纸面底色和印花连续性，只加接缝、褪色与一处有限磨损。大部分墙仍能看出原来的装饰意图。
- 区别：沿用本项目已有蓝灰条纹纹理，不复制 Morris 图案。shader 磨损是表面处理，没有洞、卷边或破碎墙体厚度。
- 用途：研究真实材质老化，不复用站点照片或纹样。

### CL04 恐怖镜头中的留白与可读性

- 来源：[ASC Shot Craft 构图与照明教程](https://theasc.com/article/shot-craft-halloween-horrors-creating-visual-cues-to-foster-fright/)，primary technical article。
- 已核实文字：教程讨论负空间、前景遮挡、选择性受光区域，以及整体过暗造成的信息不足。
- 转译：入口保留两侧暗部，但至少让地面和局部墙边可认；固定正常视高，靠走近和侧移观察纸面，不强制摇屏。
- 区别：无人物剪贴、无跳脸；单房光色研究不承担剧情惊吓。这里的心理效果是设计目标，尚未得到玩家试玩确认。
- 用途：仅原理研究。

## 房间用途和观察路径

正常用途为存档工作区之间的通道。现有两张桌子及书纸簇提供生活用途，门洞与墙面转折形成前后层次。主要视觉语法是 U03 同构空间的灯色情绪变化；纸面磨损是独立材料候选，不作为额外人形显现。

| 观察点 | 米制相机位置 | 看向位置 | 意图 |
|---|---|---|---|
| entry | 0, 1.65, -8.3 | 1.4, 1.55, -16.4 | 从实际入口内观察桌面与通道 |
| notice | 1.4, 1.65, -14.9 | 2.41, 1.7, -15.5 | 从桌子右侧走近墙纸 |
| recheck | 1.35, 1.65, -16.5 | 2.41, 1.7, -15.5 | 侧移看同一处墙面 |
| return | 1.35, 1.65, -16.5 | 0, 1.55, -7.5 | 回望入口检查可读性 |

正常路线建议：入口 → 先向右移到 x=1.4 → 沿通道向负 Z 行走。不得直穿中间桌面。预览移动使用项目 `movePlayer` 和 `world.getColliders()`；预设观察点在选取时检查玩家半径与碰撞。视点可站立不等于整个游戏流程已走通。

## 对比控制

1. 灯色 A 为原灯色，B 为旧暖黄 `#e2c58d`，C 为灰绿 `#b9cbb0`。仅改 room-1 已有实用灯和对应发光灯泡；按线性亮度归一，强度值在三种颜色间保持一致。感知亮度不保证完全一致。
2. “通路照明”独立开关：现有顶吊灯强度 ×10、距离 ×1.5、角度 1.2；该房间其他实用灯强度 ×2.8、距离 ×1.15。恢复时回到原值，不改变灯数、阴影贴图尺寸和最近灯数量限制。
3. “纸面老化”独立开关：保留原纹理，在选中墙面材质增加低对比接缝、褪色及以 `(2.41,1.7,-15.5)` 为中心的表面磨损。米制世界坐标保证纹理位置不随镜头漂移。无新增纹理、几何或碰撞。
4. 同一视点比较时固定 72° FOV、1.65 m 视高、曝光 1.1025、手电参数、VHS 0.62。VHS 时间固定为 0；无相机微动。可分别关手电观察场景自身照明，但前后截图必须记录相同开关。
5. 页面按需绘制，静止时暂停重复渲染；这是预览页的节电行为，不代表主游戏帧率提升。

## 接口和归属

`createCorridorAtmosphereStudy({wallBindings,fixtures,scarCenter})` 返回 `setLightMode`、`setPathLighting`、`setPaperAging`、`dispose` 和 stats。调用方提供确切墙材质索引和已装配灯具，不修改 plan 或再随机布局。材质克隆与灯色修改可释放恢复；新模块目前只被独立预览引用。

另一对话独占 archive/parlor 的道具关系候选。本轮不修改其 `room-detail-recipes`、`room-detail-dressing` 或 `dark-interiors`。正式接入需由集成责任方提供房间墙材质/灯具引用；预览里从 baseWalls 推导索引的方法仅适配当前源码，不作为通用游戏 API。

## 观察记录

初次浏览器观察加载 119 个模型实例，0 失败。原灯色入口明显偏暗，近墙手电能辨认条纹；因此增加了独立通路照明候选。截图、后续结果与限制在本节追加。未运行自动测试，未进行真人试玩或全流程验收。

## 本轮归档

独立通道研究已完成，未设为主游戏默认灯光。全局灯光交还另一对话维护。reviews 中 entry/notice 图片为开发过程记录，期间手电/VHS 已由另一任务调整，不作为当前版本的严格 A/B；notice-aged.png 为已弃用的亮斑候选，源码已改为深色磨损。最终房间陈设以 room-completeness-v01 最新两层记录为准。
