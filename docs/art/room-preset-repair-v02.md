# 房间预设修复 V02

## 问题与实际状态

2026-10-31，用户指出实际游戏房间空洞，未见手墙/悬吊玩偶。核查运行 catalog、源文件、主游戏引用和最终 generateDream：

| 内容 | 已有 | 缺失/原因 |
|---|---|---|
| 普通室内 | 36 个优化版 GLB、12 张贴图 | 最终事件编排清掉部分普通家具；旧补全排除整个事件房；完成记录未随清除更新 |
| 满墙伸手 | horror-v03 场景概念；另一模型任务现已导出手臂单体 | 整房布局、墙缝景片、运行接入尚未完成 |
| 悬吊玩偶房 | horror-v03 场景概念；另一模型任务现已导出瓷偶单体 | 未有玩偶群布局与悬线；旧 sewn-nursery-doll.glb 主游戏未引用 |
| 剧情玩偶 | story-proxies 中的方块代理 | 不是概念图中的瓷偶，未由本轮替换 |
| 墙画 | 三张画面贴图 | 卧室、客厅、供奉室同用肖像；墙饰配方还重复添加画组 |

用户已明确模型在另一个对话制作。本任务停止模型生产、不调用 Tripo，仅负责已有家具的组合、空间预设及接入。新出的两张单体参考图保留于 asset-inputs（约 3.7 MB，imagegen 原图与完整 prompt），单体制作及批准由另一任务记录。本任务收尾时已读取其[模型交接](horror-models-v01.md)：手臂 6033 面、瓷偶 5725 面，已导出，最终美术验收待完成；不修改或代提交对方资产。

## 实装

- `ROOM_DRESSING_GROUPS`：六用途、每用途三个功能组，包含各件米制尺寸、相对位置、朝向。睡眠/阅读/收纳、谈话/展示/书写、玩耍/玩具收纳/照护、检查/药品/病历、阅档/存档/整理、供奉/保管/等待。
- 椅子正式占据自己的 AABB，不再把独立椅子挤在桌子下；扶手椅和餐椅复用既有模型，稳定 prefab ID 新增为 armchair、dining-chair、floor-lamp。客厅和诊疗组附带既有落地灯，接入现有局部灯光预算。
- 最终 `completeRoomContent` 和跨层回声之后调用 `completeFinalRoomInteriors`，随后完整校验并重算 planHash。保留旧场面/家具，仅追加经过验证的完整组。
- 保护每个事件局部坐标、已畅通观察关系、门口与真实碰撞。每候选功能组通过完整 `validatePlan` 后才接纳，失败回滚该组；不会为加家具删事件或改随机种子。
- 第一组优先靠近入口可发现的位置，后续组按空间间距分散；即使既有家具件数已达目标，普通房仍尝试加入一个完整功能组。
- 固定出生房和动态变形/追逐场景仍有专用约束，报告明确标记 excluded/shortfall，不能算作全房完成。
- 减少客厅重复挂画，加入挂布、挂钩、索引组合；供奉室加入布料/牌位组合。同房额外画组最多一组。当前仍只有三张画面素材，不声称已补新画作。
- 陈设面板读取最终家具数量和功能组，空房不再因“受保护”而被排除出缺口报告。

## 联网与白皮书依据（检索 2026-10-31）

已读取另一对话“搜索参考并生成游戏封面”，确认用户要求研究的是 Trevor Henderson。以下为设计参考，原作不进入运行资源。

| 来源 | 核实范围 | 本项目转译 |
|---|---|---|
| [Henderson 本人访谈](https://dailydead.com/qa-trevor-henderson-discusses-the-found-footage-style-of-his-fascinating-horror-artwork/) | 阅读关于先做环境、控制怪物显露、失常比例的本人说明；[官方作品集](https://trevorhenderson.format.com/photobash)网页正文未展开图像，不声称逐图复核 | 先建立正常生活功能组；后续异物只占一个焦点，利用柜、门与布的遮挡，避免把所有陈设都做成怪物 |
| [ASC：Nightmare Fuel](https://theasc.com/article/nightmare-fuel/) | 摄影师讨论简洁构图、边缘暗部和悬念 | 入口边缘保留遮挡；中景具备用途关系；远端保留可识别路径，暗部不等于空房 |
| [ASC：The Conjuring 摄影访谈页](https://theasc.com/podcast/conjuring-john-r-leonetti-asc/) | 核实页面摘要关于将布景作为真实场所拍摄；未收听完整音频 | 家具尺度、相邻使用关系先成立，物件不无依据随机分散 |
| [Rusty Lake Hotel 官方页](https://www.rustylake.com/adventure-games/rusty-lake-hotel.html) | 官方作品与酒店房间主题，未逐关游玩 | 功能主题和一处叙事异常分开；不复制原游戏房间或谜题 |
| [National Trust：Newark Park 墙纸](https://www.nationaltrust.org.uk/visit/gloucestershire-cotswolds/newark-park/victorian-wallpaper-at-newark-park) | 历史室内及手工印制墙纸资料 | 延续旧花纹、木作与家具尺度；避免靠满墙肖像填空 |
| [V&A 玩具馆学习资料](https://media.vam.ac.uk/media/documents/legacy_documents/file_upload/17580_file.pdf) | 检索摘要确认传统玩偶的木、瓷、蜡等材质；未逐页视觉核验 | 瓷头/布身的单体参考候选，材质来源不等于授权复用藏品图 |

遵循[白皮书 v1.1](horror-art-direction/CODEX_心里有鬼_恐怖房间构图与联网研究规范_v1.1.md)的功能识别、2–4 物件簇、前中后层次、单异常与三观察点。上述落地是本项目设计推导，不把原作名当作已完成效果证明。

## 手墙与吊偶预设交接（尚未实装）

| 预设 | 模型交付需求 | 组合/净空 | 状态 |
|---|---|---|---|
| reaching-wall | 手臂 2–3 姿态；破石膏/露木条墙片；提供米制 bounds、朝向、安装点与材质 | 选一段侧墙，由稀到密约 12–20 只，手端伸出深度建议≤0.45m；边缘近手为发现点，中央净通路≥1.2m；需真实视觉占地校验，不能直接套 .12m 墙饰安全带 | 单体已由另一任务导出；还需规划的静态安装点与事件互斥，不默认每层强制出现 |
| suspended-dolls | 旧瓷偶/布偶 2–3 变体，肩部挂点；线绳独立重复几何 | 18–28 只沿房间边侧与高处聚集；主通路下沿≥2.1m，少量低位只在侧边；一把空椅作为焦点，多数朝椅、一只朝观察点 | 单体已由另一任务导出；仍需整房组装，与现有玩偶事件区分，避免新增布局遮挡已有剧情 |

复用模型/贴图，先静态组合，低频/少量运动另做预算；不为每只手/玩偶创建独立灯或整套贴图。具体 roomId 与 entry/notice/recheck 待模型实际包围盒和当前事件选点复验，不用旧版本坐标冒充最终布局。

## 验证

独立检查：固定种子 1844070019、7（fear.doll）、19（like.flower）六层共 62 房；已运行事件数据不变、模型映射、真实碰撞/导航、幂等检查，非排除房均达到家具件数目标。这是功能检查，不等于所有房间已达到封面构图质量。

固定种子 1844070019（catEnabled=false、none/generic）：原来 10 间非出生房普通家具为 0，补后为 6–12 件；两层分别增加 72/55 件普通家具，共 127 件。保留动态场面与出生房；现存剧情方块代理未替换。

- 自动验证：最终 `npm test` 172/172 通过（238.50 秒）；独立 `check.mjs` 六层 62 房检查通过，非排除房无件数缺口、无缺失功能组。
- 构建：`npm run build` 通过；保留项目已有的 >500 kB 分包提示。
- 浏览器：六主题各保存入口/中部/回望/家具四视角，共 24 张；两层加载计数分别 177/151、失败均 0，控制台未见 warning/error。入口可发现家具、柜/桌/座椅组合及局部灯光在实景出现；档案室部分观察方向仍偏暗，不能据此宣称达到封面质量。
- 主游戏入口：`?seed=1844070019&preview=B12&like=none&fear=generic` 使用最终 dream 中 room-5，事件进入 observed，控制台无 warning/error；此为程序预览观察，未进行真人完整通关、所有种子逐房验收或 FPS 性能验收。
- 证据：`art-source/room-completeness-v02/audit.json`、`reviews/layer-1.json`、`layer-2.json`、`camera-poses.json`、六主题 PNG、`main-b12.png` 与 `validation.json`。新目录约 6 MB，含此前生成的约 3.7 MB 单体参考源图，余下为代码、报告和实景截图，不加入新的运行时模型。

预览入口：[房间预设 V02](http://127.0.0.1:4190/art-source/room-completeness-v02/index.html)。本页使用主游戏 generateDream/createWorld，不另造演示房。
