# 《心里有鬼 / YOUR OWN GHOST》Codex 恐怖空间美术导演与程序化生成规范

> **版本 v2.0｜2026-10-31｜适用：3D 第一人称恐怖游戏的程序化房间组合、参考研究、镜头预演与视觉 QA**  
> 本文件是 Codex 的**长期工作规范**，不是已接入游戏的代码或现有数据结构说明。后续需要依据实际项目审计决定接入点。  
> 配套文件：[`ROOM_RECIPES_v2.md`](ROOM_RECIPES_v2.md)｜[`RESEARCH_LINKS_v2.md`](RESEARCH_LINKS_v2.md)｜[`ROOM_QA_v2.md`](ROOM_QA_v2.md)｜[`data/room_recipe_candidates_v2.json`](data/room_recipe_candidates_v2.json)。

## 0. 绝对优先级：从“单点异常”升级为“完整房间的噩梦规则”

**v1.1 的“一间房一个微小异常”不能成为全局硬约束。** 本项目需要轻重完整的恐怖频谱：

| 强度 | 类型 | 玩家心理 | 房间表现 | 示例 |
|---|---|---|---|---|
| `0` | NORMAL 生活基线 | 安心/熟悉 | 家具自然，光源可信 | 普通但冷清的旧卧室 |
| `1` | UNCANNY 微小不对劲 | 怀疑 | 过度对称、缺一个椅子、门后负空间 | 桌上八个杯子却没有人 |
| `2` | WATCHED 被注视/错位 | 警觉 | 窗后轮廓、楼上凝视、天花板影子 | 二层栏杆后静止站影 |
| `3` | CORRUPTED 秩序侵蚀 | 不适/窒息 | 物件过量、透视失衡、纹样扩散、脏污 | 档案盒从书架蔓延到天花板 |
| `4` | NIGHTMARE 整房侵占 | 震撼/掉 SAN 感 | **一个超现实规律占据全房**；允许大量重复元素 | **全是手的走廊、堆满杂物的房间、血色的房间** |
| `5` | PEAK 噩梦高潮 | 现实失效 | 整体建筑/材质逻辑被单一噩梦主题彻底替换 | 房间像活体结构，出口仍可辨认 |

**一间房一个“主导规律”，不等于一间房只能有一个恐怖物体。** “手从墙壁长出来”可以重复 40 次，作为**一套统一视觉句法**；不能同时加入与其毫无关联的十种怪物、血雨、棺材、尖叫、摇屏。恐怖强度由剧情房间角色决定，不由纯随机掷骰子决定。

> **审美总纲：** 先让玩家认得这个房间，再决定现实哪一条规则被违背。弱场景靠怀疑；强场景靠**统一的空间侵占、连贯的形体变化和节奏递进**。强视觉允许大胆，不允许乱。

## 1. 本项目已知信息与不可触碰的部分

- 项目：**《心里有鬼 / Your Own Ghost》**；曾观察到本地浏览器预览 `http://127.0.0.1:4190/?seed=1844070019`。localhost 仅在用户开发设备运行时可访问，Codex 不得假设云端也能访问。
- 浏览器当时可见：程序化房间、地图种子、独立事件预览、地图调试、连接房/主要事件/短场面/喘息房、喜欢/害怕输入等。**这些是当时页面观察，不是当前源码审计结论。**
- V02 概念目录可见七型：旧卧室、空客厅、旧育儿室、诊疗室、旧档案室、供奉室、墙纸走廊。概念图 ≠ 已实现房间。
- 参考图 U01–U06 由开发者提供，位于 [`references/user-images/`](references/user-images/)；原始作者、许可未核实，**仅供内部研究**。
- **P0 约束：** 不擅自更改地图拓扑、房间入口出口、玩家碰撞体、移动手感、事件排布、种子确定性、核心剧情/怪物状态机。对高级视觉对象使用 `nonBlocking` 装饰、贴花、非碰撞实例或经验证的固定锚点。
- 不覆盖旧资产、概念母图、手工布置的锁定房间；先做新预设和 A/B 预览。素材版权、现场性能、可访问性与视觉审美同样重要。

## 2. Codex 的身份与工作制度

你兼任：
1. **恐怖电影/游戏视觉研究员**：联网核验作品、游戏画面和制作访谈；提炼可迁移的空间原理，记录可靠链接。
2. **恐怖美术导演**：定义该房间让玩家害怕什么（窥视、拥挤、红色侵占、肉体化、仪式秩序、空间迷失），给出三段式观察经历。
3. **程序化布景师**：使用房型、锚点、模块、物件组、密度场、约束、强度和局部随机，使房间具有“设计过”的感觉。
4. **关卡/镜头与体验验收员**：在实际游戏相机下检验入口第一眼、走近、抬头、回头、出口动线；用同种子截图而不是只用概念图判断。
5. **工程守门人**：任何变更可追踪、可回滚、可重复，无法审计代码时先输出方案。

### 2.1 连网研究不是搜索“恐怖房间图”就结束

- **每批新的视觉语法**，至少搜索电影/电视剧、游戏原作、美术/摄影专业访谈三个方向；新增艺术家优先个人网站、采访或作品介绍。
- 对特殊物件，如手、家具堆、活体墙、血色灯光，额外搜索 **`how the scene uses space / art direction / environment art / composition / lighting breakdown / set design / production design`**。
- 优先：官方游戏页、开发者分享、摄影师/美术指导访谈、制作人访谈、专业影像期刊、可信论文；其次新闻/影评；Pinterest 仅用来发现视觉链接，不能当原作者证明。
- 研究时将**作品真实存在及基本特征**和**本项目推演出来的玩法方法**分开记录；不能把想象中的镜头细节写成事实。
- 每条记录：`title, medium, verified_url, date_checked, evidence_level, spatial_mechanism, fear_mechanism, room_application, what_not_to_copy, asset_rights`。
- 互联网不可用：使用已经核验的参考缓存并标记“离线/待核查”；不可伪造新的已阅读来源。

### 2.2 检索关键词与优先拓展

```text
# 摄影/电影
James Wan The Conjuring hallway negative space long take framing
The Shining Overlook Hotel framing symmetrical architecture production design
Twin Peaks red room production design drapery repeated motif
Suspiria 1977 Luciano Tovoli lighting red green blue production design
Skinamarink Kyle Edward Ball ceilings corners doors perspective interview
Hereditary Grace Yun production designer dollhouse house composition
The Texas Chain Saw Massacre 1974 art direction macabre furniture props
Mad God Phil Tippett industrial debris handmade stop motion environments

# 游戏空间
P.T. Silent Hills loop hallway environmental changes
The Exit 8 anomaly spotting repeating corridor design
Little Nightmares II hospital mannequin arms hands lighting
Scorn Ebb Software art direction biomechanical environment
Resident Evil 7 Baker house environmental storytelling clutter
Rusty Lake Cube Escape room objects symbolism uncanny
Kitty Horrorshow Anatomy haunted house room layout
Alan Wake 2 Dark Place environment art lighting visual storytelling

# 组合/结构/参数
horror corridor dozens of reaching hands wall installation composition
uncanny hoarder room piles of everyday objects art direction
claustrophobic overcrowded room blocked sightlines prop clusters
blood red interior psychological horror lighting source practicals
surreal flesh architecture organic growth room moodboard
body horror environmental storytelling repeated anatomy without character
uncanny symmetrical room one missing object
first person horror room entrance camera occlusion sightline
```

**来源总览**见 [`RESEARCH_LINKS_v2.md`](RESEARCH_LINKS_v2.md)，包含已经核验的网址及具体研究问题。**不得直接保存、拷贝或以图片生成/3D 建模一比一复制搜索到的受版权保护场景、贴图、角色或标志。**

## 3. 参考流派如何变成程序能执行的规律

### 3.1 轻度、隐蔽型——空间让你自己发现不对劲

| 参考群 | 重点研究 | 可转译成的程序语法 |
|---|---|---|
| **温子仁：《招魂》《潜伏》** | 门框遮挡、角落留空、暗处视线、日常家庭细节 | `framed_presence`, `negative_space`, `delayed_reveal` |
| **《闪灵》** | 中心轴、重复门洞、规整而压迫的室内秩序 | `ritual_symmetry`, `corridor_axis`, `single_error` |
| **《双峰》** | 仪式化的家具关系，强烈颜色和幕布形成不合常理的舞台感 | `ceremonial_grid`, `curtain_layers`, `color_dissonance` |
| **《锈湖》** | 普通房间中的物品之间有暗示关系 | `story_prop_triad`, `semantic_anchor`, `one_absence` |
| **P.T. /《8号出口》** | 同一位置的重复观察、少量变化、玩家主动辨别差异 | `loop_difference`, `one_object_mutated`, `familiar_route` |
| **《Skinamarink》** | 天花板、门沿、壁角、低位视线与长时间的空白 | `upper_blindspot`, `offscreen_weight`, `near_dark_presence` |
| **Trevor Henderson** | 不可能的生物像是偶然被旧照片/录像机拍到 | `incidental_capture`, `background_insert`, `partial_silhouette` |

### 3.2 强烈、显性型——整个房间的物件关系变成噩梦

| 参考群 | 重点研究 | 程序语法（本项目原创转译） |
|---|---|---|
| **《小小梦魇 II》** | 病院病人/人偶肢体，人体形状与空间尺度冲突 | `wall_hands`, `anatomical_repetition`, `reaching_funnel` |
| **《Scorn》** | 建筑与肉体难以分开、重复的生物机械材料 | `organic_architecture`, `wall_growth`, `ribbed_threshold` |
| **《生化危机 7》** | 私人住宅里过度密集且有生活痕迹的陈设 | `hoarder_clusters`, `contaminated_domestic`, `no_clear_center` |
| **《遗传厄运》** | 家庭室内像微缩模型，家具反映某种控制力 | `miniature_dollhouse`, `family_table_ritual`, `trapped_house` |
| **《德州电锯杀人狂》(1974) /《Mad God》** | 大量物体形成材料族、陈设有“制作者的逻辑”，物件堆积具有层次 | `material_accumulation`, `ritual_assemblage`, `junk_totem` |
| **《阴风阵阵》(Suspiria, 1977)** | 红、蓝、绿、黄的高强度色彩对撞和空间失真 | `red_takeover`, `saturated_color_system`, `color_break` |
| **《寂静岭》系列** | 场景从熟悉生活进入异化、腐蚀、身体化的层级 | `world_corruption`, `texture_spread`, `material_mutation` |
| **《Alan Wake 2》** | 真实素材和受控灯光/气候/颜色使空间服务叙事 | `narrative_lighting`, `wet_surface_exaggeration`, `light_cues` |

> **注意：** 表中语法名称是我们为《心里有鬼》建立的**原创工程词汇**，不是以上作者自称使用的术语。参照链接和可信度见研究文件。

## 4. 八个“视觉恐怖基因”——决定房间为什么会不舒服

1. **过度整齐**：家具像被人刻意排列；规律本身令人不安。
2. **数量过量**：同一类物体过度繁殖（手、鞋、画像、婴儿床、椅子、箱子），直到房间原用途被吞没。
3. **不可能的使用关系**：全体椅子朝墙；床在走廊尽头；水槽安装在天花板。
4. **侵蚀与污染**：墙纸、旧血色痕迹、潮湿反光、织物、生物褶皱从一处逐渐扩散。
5. **可见范围的欺骗**：门框、柜门、遮帘、窗格、堆积物让玩家只能见局部，回头后才连起来。
6. **尺度冲突**：一件巨大的椅子、异常矮的天花板视觉假象、手过长、房间里出现不可解释的大型物件。
7. **颜色犯错**：强烈红色与病态绿混用，光来自不应该存在的位置，光色不能被一般家庭环境解释。
8. **静止中的注视**：墙高处人影、窗框中的半张脸、在灯上方出现的影子；存在但不急着互动。

不要一次抽八个。先选一个**主导规律**，再补 0–2 个让主规律更清晰的辅助规律。对于 `intensity >= 4`，可以有**许多实体**，但它们应服从相同重复、对称、蔓延或材料变形逻辑。

## 5. 机器必须遵守的构图算法（Design First, Spawn Later）

### Step A — 先读真实地图和现有房型

读现有项目中地图种子、room role、房间尺寸、门的位置/朝向、剧情事件、物件目录、光源 API、导航/碰撞系统、实际游戏相机高度/FOV 与已锁定预设。**找不到就标记 UNKNOWN，不要猜 schema。**

### Step B — 先确定“恐惧命题”

每间房必须写出：`normal_function`（这里原来是什么）、`fear_question`（玩家会怀疑什么）、`governing_rule`（是什么统治了房间）。例如：

- 走廊 → “墙上似乎长着试图阻止我经过的手” → 所有手沿动线由小到大伸展。
- 储藏室 → “屋主把几年的生活全部塞进同一处，仿佛不愿离开” → 同类旧物按年代、用途和高度密集堆积。
- 会客厅 → “每样东西都像被红光慢慢吞没” → 红色从一个有来源的区域蔓延到材质，但仍留有冷色出口轮廓。

### Step C — 固定玩家动线和“不能覆盖区”

锁定入口、出口、门扇摆动、可交互目标、剧情触发区域、摄影机通行、碰撞通路。先建立 `safe_path` 和 `reserved_zones`，再在其余位置生成。不能为了画面效果打断地图连通；碰撞容差/玩家宽度按项目现有值读取，不写死。

### Step D — 建立三个以上真实视觉锚点

- `entry_camera_anchor`：玩家从门口自然看向何处；
- `primary_focal_anchor`：主视觉奇观（手群终点、堆积物形成的墙、红色祭台）；
- `foreground_occluder_anchor`：门框、柜子、布、堆积物制造前景遮挡；
- `reveal_anchor`：走近、侧移、回头或抬头发现的第二信息；
- `exit_readability_anchor`：出口附近仍有可见边界或唯一导航提示。

强场景允许**第一眼就看见主奇观**，第三眼再揭示隐藏信息；不要把“逐渐发现”误读为“永远看不清”。

### Step E — 按物件“簇”而不是独立点来生成

采用三级组合：

```text
ROOM
  ├─ PRIMARY MASS（唯一主轮廓/主侵占区域）
  │   ├─ MID CLUSTERS（2–5 组中型成因明确的堆积）
  │   └─ DETAIL SPRINKLE（少量具有方向和节奏的细节）
  ├─ CONTROLLED NEGATIVE SPACE（让眼睛休息并看出通路的空域）
  └─ REVEAL NODE（第二次观察才成立的构图）
```

- 高密度不等于均匀撒满：**密集区域必须和空域相邻**，否则没有轮廓、透视或情绪变化。
- 同一簇里，物体应共享至少一个属性：用途、材质、年代、形状、大小序列、朝向或“属于同一个人”的叙事信息。
- 小物体使用带权采样和局部相关噪声；不用均匀随机分布覆盖整个房间。
- 重复物件优先实例化/复用低成本材质、网格与 LOD，避免高密度场景性能失控。

### Step F — 让密度随玩家路径变化

```text
入口  →  初次识别  →  增密/变形  →  主奇观  →  保留出口的可读通道
 0.2       0.4           0.8          1.0               0.3
```

上述是**相对密度曲线示例**，不是现有引擎的固定数值。可使用从左到右、从地面向顶部、由远到近、从墙角向门框的**梯度场**。高密度区需要具备视觉方向与因果——手为什么都伸向同一个点？堆积为何在那张空床旁达到最高？

### Step G — 光照必须服务主规律，而不是做颜色滤镜

- **常规房**：可信的旧灯、墙灯、电视/显示器、门外漏光、手电；避免一味压黑。
- **强烈噩梦房**：允许不合理色彩，但必须创造视觉层次：底色/污染色/可读出口对比色；视觉上解释为红色管灯、异常发光材质、墙体渗出、未知外部照明等。
- **红房间**并非整屏纯红。靠材质、红色局部体积光、反光和阴影制造红色主导性，给肤色/物件边缘/门留明暗差。
- 若游戏已有动态光系统或手电逻辑，先复用，不能随意改变全局后处理。

### Step H — 实机验证与失败重试

在真实游戏中从 `entry` / `notice` / `recheck` / `lookback` 四处截图；检验同 seed 确定性、路径、门、交互、事件、性能、强度、原创性。**只重试导致失败的布景阶段**，不能每次随便重抽地图；失败原因必须保存。没有真实截图不得报告完成。

## 6. 强度分布：恐怖节奏来自“正常 → 错误 → 侵占 → 安静”

- `starting bedroom / guidance`：原则上从 0–2 起步，若已有锁定脚本以脚本为准。
- `connector`：常见 0–2，可作为视觉过渡；未经剧情许可不得自动放 `intensity 5`，不能让平衡完全坍塌。
- `minor scene`：1–3；允许局部异常强化，但要留出回望空间。
- `major scene`：2–5；适合 `hands / hoarder / red / flesh` 的整房主题。
- `respite`：0–1；不出现突然强烈闪烁、隐藏实害和常驻可动威胁。
- **地图节奏受既有剧情与事件分配控制**：生成器只能为已分配角色匹配外观，不应改写触发事件与房间角色。若剧情指定某个高潮房，优先剧情 override。
- 相邻两间不得无理由同时使用相同的主色、高强度物件族和发现方式；连续冲击若为叙事目的，则逐级升级而非重复同一效果。

为避免“全部房间都很红”“所有走廊都有手”，记录每个主题的最近出现距离与总体出现频次（`theme_cooldown`, `palette_cooldown`, `shape_cooldown`）。它们是**美术候选选择条件**，不能动既有房间图种子。

## 7. 种子化选择：可控、可复现、可回退

```text
roomGraph + locked events + global seed
  ↓   不修改原有地图生成链
[extract actual room data]
  ↓
[role & narrative eligibility]
  ↓
[select one room recipe weighted by mood, role, cooldown, asset availability]
  ↓
[derive visual sub-seed: hash(globalSeed, stableRoomId, "visual-v2")]
  ↓
[reserve path/doors/interaction/camera zones]
  ↓
[place primary mass → clusters → safe detail variation]
  ↓
[validations: collision, visibility, intensity, budget]
  ↓
[preview/QA or deterministic fallback]
```

**候选伪代码，非项目接口：**

```ts
function planHorrorRoom(room, worldSeed, context, catalog) {
  const eligible = recipes.filter(r =>
    r.roles.includes(room.role) &&
    r.minIntensity <= context.maxAllowedIntensity &&
    roomSupportsRequiredAnchors(room, r) &&
    catalogCanProvide(r.requiredTags, catalog) &&
    !violatesLockedEvent(room, r)
  );
  const subSeed = stableHash([worldSeed, room.stableId, "visual-v2"]);
  const recipe = weightedChoice(eligible, context.narrativeMood, context.recentThemes, subSeed);
  if (!recipe) return originalRoomVisualsUnchanged(room);
  const protectedZones = collectProtectedZones(room);
  const scene = placeAnchoredClusters(recipe, protectedZones, subSeed);
  if (!validateNavigationAndSightlines(room, scene)) return fallbackToSafeVariant(recipe, room);
  return scene; // only after actual project adaptation
}
```

必须验证：`stableHash` 跨浏览器/平台一致；随机序列不会因新增美术对象而改变地图拓扑的随机调用顺序；同种子+同内容版本有稳定构图；渲染帧率符合目标硬件。

## 8. 三种主推噩梦房：强制阅读的详细配方

完整细化位于 [`ROOM_RECIPES_v2.md`](ROOM_RECIPES_v2.md)；以下摘要为生成器的首选实验主题。

### N01｜全是手的走廊 / Hall of Hands

**主规律：** “建筑伸出许多人的手，想触及经过的人。”

- 入口：普通旧墙与长条顶灯，先有尺度参照。
- 中段：从墙缝、窗洞、扶手和门背后出现不同方向的**手/手臂簇**；不要直接复刻参考中的具体手形资产。
- 高潮：手臂朝一侧集中、形成拱门或暗示一条看不见的身体走向；主轮廓应强、细节分层。
- 颜色：暗灰墙面/灰白皮肤或木偶材质/局部红污渍；手电扫过时轮廓接连显现。
- 动线：两侧墙面物件优先不碰撞；手不能把玩家走廊锁死。动态手势需事件授权，静态方案先行。
- 随机：**改变成簇位置、角度与节奏**；不能从大量网格中独立均匀随机生成。
- 低成本：三种手部静态基础网格+变体材质+旋转/尺度受控变化+投影。

### N02｜堆满东西的房间 / Hoarder Chamber

**主规律：** “物件数量过剩，使原来的生活空间逐渐消失。”

- 先明确原用途（储物间/旧卧室/档案室）。道具必须能追溯到一套**主人/用途/时间**逻辑，而不是随机杂货铺。
- 三层堆积：大件搭骨架（床、柜、书架）；中件成组遮挡（纸箱、旧电视、档案盒）；小件给生活故事（杯子、旧玩具、纸条）。
- 高度：一个主堆体接近天花板，另一侧较低，在玩家视线附近保留一道“过窄但合法”的空路。
- 不适点：所有钟表停在相近时间；同一个人头像的相框重复；某张椅子面向一个被遮住的出口。
- 优先考虑有用途的**堆积团块和遮挡**，禁用平铺几十种零散物品导致的“资产展厅感”。
- 低成本：复用纸箱/书本/椅子/布罩 4–6 种基础模块生成密集表面；减少逐件独立阴影。

### N03｜血色房间 / Red Saturation Chamber

**主规律：** “房间被红色侵占，像进入视觉上不稳定的另一种现实。”

- **血色不等于一定要描绘大量血腥细节。** 可以是红墙纸、积水反射红灯、异常红色走廊灯、红色布幕或暗红渗痕构成主色。
- 红色必须有层次：深酒红、氧化锈红、低饱和血红；保留中性暗面、暗冷色门沿或唯一高对比导航物。
- 构图：严格对称的空椅与一扇小门；或正常房间中央有**没有物体的红色亮区**。
- 照明：明确 1–2 个红色主光源或红色自发光表面，不把所有材质强制替换为同一 RGB。
- 节奏：适合主要事件和高峰；**相邻房间应退回低强度颜色**。
- 低成本：已有模型 + 变体材质 + 不同强度的可控区域光；不依赖大量动态粒子。

## 9. 你提供的 6 组图：学习发现方式，不照搬人物

| 编号 | 图像元素（仅可见事实） | 可用于何种构图 | 可组合的主主题 |
|---|---|---|---|
| [U01](references/user-images/U01_high_balcony_gaze.png) | 二层栏杆后方有人影俯视 | `upper_gaze`, `framed_presence` | 空客厅、楼梯厅、仪式房 |
| [U02](references/user-images/U02_narrow_corridor_anatomy.png) | 不成比例的形体塞在狭小通道 | `anatomical_mismatch` | 手走廊、服务通道、肉体化空间 |
| [U03](references/user-images/U03_hallway_lighting_variations.png) | 同走廊不同照度和色温对照 | `lighting_state` | 红色房、普通到异常的回访 |
| [U04](references/user-images/U04_partial_reveal_quadrants.png) | 门框、远景、红光、格栅的局部显现 | `partial_reveal` | 杂物遮挡、档案室、诊疗室 |
| [U05](references/user-images/U05_ceiling_shadow.png) | 天花板附近的影子/人形 | `upper_blindspot` | 育儿室、旧卧室、天花板侵蚀 |
| [U06](references/user-images/U06_windowframe_occlusion.png) | 旧窗格切割人影 | `segmented_occlusion` | 诊疗室观察窗、档案间、旧宅门窗 |

- 这六组的**作者和出处未经核验**。最后一张 U06 不可认定为 Trevor Henderson 原作；只能说其“伪摄影现场中的局部异常”与他公开讨论的创作方法有可比性。
- Trevor Henderson 本人关于**让不存在的生物像是拍摄当场存在**的访谈请看研究文件；**学习光色一致、景深、噪声/遮挡一致**，而不是直接生成 Siren Head、Cartoon Cat 或已有怪物。
- V02 图片如果已被开发者确认，应优先保留原配色与空间语义；噩梦版本另建 `nightmare_variant`，可在剧情中选用。

## 10. 房型 × 主题适配矩阵（首批候选）

| 现有房型 | L1–L2 轻恐怖 | L3 侵蚀变形 | L4–L5 强烈噩梦候选 |
|---|---|---|---|
| 旧卧室 | 椅子面对床；门框后阴影 | 家具重复、床四周被照片包围 | 床被层层布条/手形暗示包裹；整屋倒挂布幔 |
| 空客厅 | 空座位与过度对称 | 全部家具朝墙、椅子大量增殖 | 家具高堆成墙、空客厅变成物件峡谷 |
| 旧育儿室 | 玩具朝墙、天花角落异样 | 相同摇篮数量失常、玩具堆 | 成排婴儿床像会议厅；天花吊满静止玩具 |
| 诊疗室 | 屏风背后的轮廓 | 器械重复、观察窗异常 | **手臂墙廊、人体模型碎片组成的有规则陈列** |
| 旧档案室 | 一排文件盒出错 | 纸张从柜中溢出、文字排列成一面墙 | **档案盒吞没空间、纸张堆积成主结构** |
| 供奉室 | 中轴与空位置 | 座椅围成无法解释的图形 | **全红祭台、布幔森林、椅子成环绕墙陈列** |
| 墙纸走廊 | 末端人影、灯色细微变化 | 同一门洞越来越窄/纹样生长 | **全是手的走廊、墙纸肉体化、红色无尽廊** |

本表是**美术候选**，不是改变既有 event 规则。具体房型是否支持、是否有资产要先审计；不支持就用低成本降级版本。

## 11. 美术语言与资产复用约束

- 一个房间可有**成千上万个视觉上重复的图形元素**，但应优先用少量可重用网格、贴花、实例化和尺寸变体呈现，不能把“密集”理解为无限增加独立 draw call。
- **层级清晰**：主结构与大件（房间轮廓）→ 成组家具/身体形状（中景）→ 裂缝/指节/旧纸（局部）。远景不要铺满相同分辨率的密集高频纹理。
- 手、脸、眼、骨骼和玩具等高识别形体应有清楚的轮廓。使用细节遮挡增强恐惧，而不是噪声、马赛克或低清遮盖错误建模。
- 伪记录视觉可以只在特定观察点或素材上使用，不默认对全游戏施加强噪声。**稳定帧率、清晰导航比统一 VHS 滤镜重要。**
- 原游戏若有固定美术风格，所有 nightmare 变体必须与其材质/色调体系同属一个世界，避免“随机素材网站拼装感”。
- 如果没有新的 3D 模型，也能只用已有床、椅子、门框、布、纸箱、书、灯、破损贴图设计成功的强恐怖场景。先做能跑的版本，再申请新增昂贵资产。

## 12. 数据层与实现前置：不可凭空发明项目接口

`data/room_recipe_candidates_v2.json` 是**设计中间格式**，不是项目现有接口、也不能未经改造直接当运行时资源加载。推荐字段（见实际 JSON）：

- `id, title, intensity, roleEligibility, baseRoomTypes, coreRule, referenceIds`
- `primaryGrammar, supportingGrammars, assetTags, lowCostFallback`
- `primaryMass, propClusters, densityProfile, lightRecipe, cameraBeats`
- `protectedZones, nonBlockingDefault, assetBudgetClass, constraints`

Codex 先通过代码审计把字段映射到项目已有 preset 和房间生成器，不允许先修改地图系统迎合该 JSON。对旧版 seed 下的配置，考虑引入美术 `visualProfileVersion`，避免新配方池变化引发旧截图无法复现；具体取决于项目已有存储方案。

## 13. 必须真实执行的审美和技术验收

与 [`ROOM_QA_v2.md`](ROOM_QA_v2.md) 联用：

- **镜头 1**：入口自然机位，能看到原用途和主恐怖轮廓吗？
- **镜头 2**：向前走近，物件数量、造型或颜色是否有明显节奏变化？
- **镜头 3**：抬头/回头/侧移，是否有新的遮挡揭示（允许高峰房一眼很强）？
- **镜头 4**：出口反看，主视觉是否仍统一？
- **P0**：撞墙、堵门、剧情触发失败、重复 seed 漂移、不可读出口、不可玩、严重卡顿 → FAIL。
- **P1**：物件密集但没有主轮廓、红色全屏滤镜、堆积无生活意义、高峰相邻疲劳、直接抄原作 → 重做设计。
- **QA 分开评估**：低强度看“不正常的秩序与发现方式”；高强度看“主导噩梦规则、密度梯度、空间整体性与可玩性”。不能强迫所有 nightmare 房只出现一个微小异常。

## 14. 第一轮落地顺序：先三间对比鲜明的房间

1. **研究阶段**：读项目源文件，联网核实高低强度的对照来源；输出至少 12 条合格研究卡片，区分已核实与待核实。查不清代码就停止实施，只报告。
2. **视觉脚本阶段**：选出 3 个真实可接入的房间/独立预览入口，为其各提出 2 套原创构图；尽量挑一条走廊、一间堆积房、一间红房。
3. **原型阶段**：先不批量增加新模型，利用旧场景、已有基础几何和贴花做灰盒 A/B；确定主轮廓、动线与发现点。
4. **小范围实施阶段**：每次仅改动获得授权的预设或单个房间变体，保存 `before/after` 路径、seed、截图和可回滚 commit。
5. **回归阶段**：用同种子验证地图、事件、门/交互、帧率；QA 签字确认后才允许放进程序化候选池。

### Codex 首轮必须交付

```text
A. 审计过哪些源码/目录，当前真实资产和程序化接口是什么
B. 可核查的恐怖影视/游戏/艺术家来源（含链接和源级别）
C. 这次的“主恐怖规律”与为何采用该规律
D. 手走廊、堆积房、血色房：各两种构图方案+可复用资产清单
E. 现有 room schema 到本设计 JSON 的字段映射建议
F. 三间的入口/靠近/回看对照与动线保护方案
G. 潜在性能问题、版权风险、可访问性处理
H. 实施前所需授权的最小范围；暂时不要自动批量改造
```

## 15. 最终否决项

- ❌ 把全部恐怖简化为随机怪物、红色滤镜、光污染、血纹贴花、黑屏、故障穿模。
- ❌ 把“密度高”误写成无意义均匀撒物品，缺少大中小层级、功能成因和视觉空域。
- ❌ 把所有房间做成同级别高潮，或所有连接房必刷可动怪物。
- ❌ 未经授权修改游戏地图、事件、玩家碰撞、剧情/怪物 AI 或已有锁定美术。
- ❌ 明知图片原作者不明却写成 Trevor Henderson 原图、影视剧照或可商用素材。
- ❌ 直接照抄《双峰》的红幕/地板组合、《闪灵》独特地毯、某款游戏标志怪物或具体关卡。
- ❌ 用持续高频闪烁、强制镜头晃动、失控模糊替代设计；应提供低动态选项。
- ❌ 没有真实渲染截图、没有同种子回归却宣布生成成功。

---

**最终标准：** 弱房间让玩家感觉“这屋子有人不在”；强房间让玩家感觉“这间屋子正在遵循某种非人的规律”。两者相互衬托，才能比单一的黑暗和尖叫更恐怖。
