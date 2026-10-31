# 小批陈设 V02：缺席茶位与缺失索引

日期：2026-10-31。执行 [v1.1 规范](horror-art-direction/CODEX_心里有鬼_恐怖房间构图与联网研究规范_v1.1.md) 第 16.1 节小批快速模式：已读完整首轮研究，针对客厅和档案室补查用途、物件与照明。当前是可切换的运行几何候选，未接入全游戏。没有新建收费 GLB 或覆盖旧资产。

## 本轮来源与转译

以下均于本日联网打开；中文检索“档案 保存 档案盒 无酸 纸 文件 整理”“闪灵 摄影 约翰奥尔科特 室内 实景灯”，英文检索围绕 Rusty Lake Hotel rooms、Control brutalism、parlour tea、archival paper storage。采用原始机构/创作者资料。网页文字和图片说明已核查；未逐镜头观看影视，本轮不声称复核了完整镜头或游戏关卡。所有原图仅研究，无运行复用许可，未下载到 public。

| ID / 来源 | 可核实内容与空间 | 本项目推导 / 与原作差异 |
|---|---|---|
| R1 [Rusty Lake Hotel 官方](https://www.rustylake.com/adventure-games/rusty-lake-hotel.html) / game, primary | 六房间谜题、五场晚餐与分别设计的主题音乐 | 两个候选分别以茶位和索引为主题物；缺席/空格是本项目设计，不冒称来自具体谜题；不复制角色、餐厅、道具或谜题。 |
| R2 [Stuart Macdonald：Control 早期建筑探索](https://machinefire.artstation.com/projects/xzynYY) / game creator, primary | 作者说明体量、阶梯节奏及结构语汇，部分图非最终游戏空间 | 档案桌把三个等宽槽形成重复秩序，破绽只留一处；这是从建筑节奏到小物的推导，不声称 Control 有此道具。 |
| R3 [ASC：John Alcott 谈《闪灵》](https://theasc.com/article/flashback-the-shining/) / cinematography interview, primary | 公寓与酒店实景灯、必要补光及背景层次 | 客厅沿用可见灯与手电，A/B 不改光强/曝光；不复刻酒店与纹样，不将片场瓦数转为引擎参数。 |
| R4 [Museum of the Home：1745 年客厅](https://museumofthehome.org.uk/whats-on/rooms-through-time/a-parlour-in-1745/) / real interior, primary | 待客饮茶用途、家具与小桌关系；网页图像说明与器物介绍 | 茶壶、杯碟与布垫形成待客组；项目仍是既有旧客厅，不声称历史复原，不复制展陈、画作。 |
| R5 [NARA：Paper-Based Records](https://www.archives.gov/preservation/holdings-maintenance/paper) / real archival practice, primary | 文件用夹套/盒收纳、边缘对齐、标签与支撑 | 以低矮分拣槽、卡套和对齐边缘表达整理活动；小槽是索引卡，不将缩小到失真的全尺寸档案盒冒作正常办公器物。空槽为原创视觉反差，不暗示真实档案操作要求。 |
| R6 [Yale：Beinecke 建筑](https://beinecke.library.yale.edu/beinecke/about-us/history-and-architecture) / real architecture/light, primary | 大理石透光面过滤阳光，展厅中央书塔 | 作为前缘/深处的层次参考，本轮固定既有光；不复制书塔、玻璃墙或尺度。 |

客厅证据组合：R1+R3（影视/游戏），R4（真实室内），R3（光）。档案室：R1+R2（游戏），R5（真实用途），R3/R6（光与空间）。延续黑暗低饱和基线，只改变一组桌面陈设。

## 客厅：缺席茶位

- 正常用途：两个人在客厅喝茶、交谈。疑问：两套杯碟位置都准备了，为什么只有一只杯？
- 主语法 F 错误日常，辅助 D 重复中的缺位；U 母题无，无人形。
- 前景：既有真实入口/柜边；中景：茶几上的茶壶、两套布垫和杯碟；背景：原沙发与陈列柜。茶位为一个焦点，折叠纸片为从属配套，不新增可读线索。
- 原 seed 1844070019 第二层客厅 room-4 有 AB01，因此不放入该事件房。本轮选 `seed=2`、第 1 层 `room-11`、原主题 parlor，未分配普通/支持/条件事件；不擅称其系统角色为喘息房。
- 色彩：旧瓷白、暗绿织物、哑暗金属；沿用原灯，不以红光强调空碟。

## 档案室：缺失索引

- 正常用途：工作人员按索引卡查找/归档材料。疑问：三格有连续标记，中间一格却完全空着。
- 主语法 D 重复中一个错误，辅助 A 局部近对称；U 母题无。
- 前景：既有门框和书桌边；中景：三只低矮分拣槽、两叠带标签卡套与一根搁在笔槽里的笔；后景：原柜体。空格与完整卡套形成唯一反差，没有散纸洒地。
- `seed=1844070019`、第 2 层 `room-5`、archive；避开研究包正在设计的 room-1 通道试点，无普通/支持/条件事件。
- 色彩：灰青槽体、旧纸暖白、暗木笔槽；同曝光和手电状态对照，灯光完全不变。

## 实现与审查边界

- [运行候选模块](../../src/art/room-detail-recipes.js) 的 `createDetailRecipe({target,recipeId,plan})` 只接收已有、通过真实桌面支撑检查的陈设组。继承原米制尺度、原点、朝向和支撑高度，局部范围限 X ±0.225 m、Z ±0.19 m、Y 0–0.19 m，再乘原组缩放；每组最多四材质批次。
- 返回 `setEnabled(boolean)` 与幂等 `dispose()`；A 恢复原物件显隐，B 显示候选。拒绝主题不符、家具不符和事件/支持/条件占用房间。选择房间由预览配置明确指定，没有 RNG，不写 plan/state。
- [实景 A/B 预览](../../art-source/room-detail-recipes-v02/index.html) 调用真实 generateDream/createWorld；非概念图。相机固定 72°、视高 1.65 m、曝光 1.1025；后处理时间固定以减少颗粒时间差。四视点为入口、发现点、侧移复看、回望出口；同视点切 A/B 相机与照明保持一致。
- 观察路径工具使用原 PLAYER_RADIUS 与 movePlayer，检查合法站点及连接边，不以 room.center 当可站位；只移动预览摄像机，不接管玩法导航。碰撞路径检查不等于真人走通或剧情触发验收。
- 最终截图、坐标、性能和 P0/P1/P2 记录见本文件后续验收部分；未知项不按通过。

## 逐房验收记录

2026-10-31，macOS 本机 Codex 内置浏览器，默认 360×584 视口（未为截图改视口），手电开启。以下为程序与浏览器观察，不是玩家审美验收。现有地板与 VHS 色差属于原版；本批只变桌面，A/B 均保留。

| 项目 | 客厅 | 档案室 |
|---|---|---|
| planHash / 实际桌体 | 9599aef8 / room-11-interior-2 | 639ffada / room-5-interior-1 |
| 模型加载 | 108/108，失败 0 | 119/119，失败 0 |
| 入口坐标 | (-23.333,1.65,-59.333) | (30.333,1.65,-21.333) |
| 发现点 | (-25,1.65,-57) | (31,1.65,-20.333) |
| 复看点 | (-26,1.65,-58.333) | (29,1.65,-20.333) |
| 回望 | 复看点看向 door-10 | 复看点看向所选真实门口 |
| 静态门口/路径 | 1 门、19 段连通边通过 | 2 门、15 段连通边通过 |
| 发现点 A→B 绘制调用 | 185→185 | 253→253 |
| 发现点 A→B 三角面（含本帧渲染 pass） | 150748→151512 | 235881→239361 |
| 发现点短采样中位帧间隔 A→B | 20.3→20.9 ms | 21.2→22.0 ms |

帧间隔仅为 34 帧左右的现场浏览器样本，受并行任务与调度影响，不是 GPU 基准或稳定帧率保证。几何/材质批次预算可验证；手机和其他演示设备仍 UNKNOWN。

原始 [客厅数据](../../art-source/room-detail-recipes-v02/parlor-review.json)、[档案室数据](../../art-source/room-detail-recipes-v02/archive-review.json) 包含机位、观察目标、路径与 A/B 数据；[路径审计](../../art-source/room-detail-recipes-v02/route-audit.json) 包含 yaw/pitch、门口验证。视高为 1.65 m，俯仰均未超过游戏 ±1.35 rad。

两个页面分别重新进入第二次，planHash、选中桌体、全部观察点一致，模型失败仍为 0；记录见 [客厅重入](../../art-source/room-detail-recipes-v02/parlor-replay.json) 与 [档案室重入](../../art-source/room-detail-recipes-v02/archive-replay.json)。这验证稳定选择与加载，不声称帧缓冲逐像素完全相等。

### P0 / P1 / P2

- P0 已验证：两组 seed 的完整 dream 各生成两次相等；局部 plan/story 数据不变；三个相关门口与两条观察路线按原 collision/movePlayer 通过；几何界限、4 批次、显隐恢复、重复释放与事件占用拒绝测试通过；没有新增光源、碰撞、后处理或敌人；没有覆盖原资产。
- P0 未验证：完整事件触发链、真人从出生点全程游走、移动设备表现。已有剧情对象与状态原样保留，但不能据此宣布所有事件已试玩通过。
- P1：桌面异常较弱。客厅空杯位可以被读成正常“杯子刚被拿走”，档案空槽也可能被当作普通分类；它们适合作为低强度怀疑候选，尚不满足独立主惊吓的目标。不能因为三视点截图完整就宣称恐怖效果已通过。
- P2：默认窄视口的入口中，上半部负空间偏多；档案模型自带大纸垫与新卡槽存在色彩接近问题；原版高反差地毯仍比桌面抢眼。本批不越权改另一对话负责的材质/后处理。
- 人工负责人反馈：待确认。最终状态：**NEEDS HUMAN REVIEW**；候选与工具可运行，未批量应用。

### 六维自评（非玩家结果）

顺序为正常生活可信度 / 视角构图 / 心理不安感 / 物件叙事关联 / 房间间节奏差异 / 游玩可读与原创。客厅：4 / 3 / 2 / 4 / 3 / 4，平均 3.33。档案室：4 / 3 / 2 / 4 / 3 / 4，平均 3.33。低于规范建议 4.0，不报审美 PASS。两种用途可以区别，但都采用缺位，因此未来不同批次应改用遮挡或朝向关系，避免全游戏都是空格。

### 截图

| 房型 | 原版同机位 | 入口 | 发现点 | 侧移 | 回望出口 |
|---|---|---|---|---|---|
| 客厅 | [A](../../art-source/room-detail-recipes-v02/parlor-baseline-notice.jpg) | [entry](../../art-source/room-detail-recipes-v02/parlor-candidate-entry.jpg) | [notice](../../art-source/room-detail-recipes-v02/parlor-candidate-notice.jpg) | [recheck](../../art-source/room-detail-recipes-v02/parlor-candidate-recheck.jpg) | [exit](../../art-source/room-detail-recipes-v02/parlor-candidate-exit.jpg) |
| 档案室 | [A](../../art-source/room-detail-recipes-v02/archive-baseline-notice.jpg) | [entry](../../art-source/room-detail-recipes-v02/archive-candidate-entry.jpg) | [notice](../../art-source/room-detail-recipes-v02/archive-candidate-notice.jpg) | [recheck](../../art-source/room-detail-recipes-v02/archive-candidate-recheck.jpg) | [exit](../../art-source/room-detail-recipes-v02/archive-candidate-exit.jpg) |

两个房型另有 baseline-entry 保存。回滚只需切回 A 或释放候选；正常游戏入口尚未调用新模块，无须覆盖或删除既有文件。
