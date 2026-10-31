# 六主题模型制作：最新去重队列 V05

2026-10-31，用户在提交95件资源后要求继续生成。本说明替代先前37项计划：**当前49项主题资产，已有5项先前生成，其余44项继续制作，预计新增2200积分**。沿用新账户与 P1 带贴图/PBR 参数，按4件一批提交；原66项场景队列独立继续，不重复提交其任务。

已交付95件见 [模型交接](model-delivery-v01.md)。该提交是快照，新增模型不自动混入其中；模型生成、源文件下载、运行导出、视觉验收、场景接入分别记录。当前不修改主题布局、共享规划、导航、事件或主入口。

## 第一批与去重

先生成独立主席台台体、三级侧阶、三联候诊椅、医用检查灯；随后邮件分拣格柜、会议长桌、旅馆钥匙格架和空载行李车。已生成讲台、奖杯、领奖墩、睡姿人物与售票柜台保留原任务ID，不再次付费生成。领奖墩能否分成三个独立实体仍需检查。

原计划的家庭餐桌、病床隔帘架和成组祭器改为复用已有圆餐桌、布屏风、香炉/铃/烛台与供品组。行李车不带箱子、布草车不带床单、奖品挂板不带玩具；附件复用既有模型。台口立柱和上楣分别制作，立柱两侧复用；手工彩纸、笔筒、颜料盒分别制作；两款演员面具分别制作。

四项额外游乐设施建议没有在本次重新追加；旧主题队列原有街机和旋转木马仍保留，最终房间用途由策划决定。

## 29组功能需求映射

表中映射表示制作/检查范围，不等于已完成。尺寸是建议规格，实际尺寸与朝向以后续导出为准。常规模型源朝向需实测；布局+Z与原模型−Z只适配一次。

|需求|优先级|制作资产ID|分件/核验|
|---|---|---|---|
|模块化主席台／舞台台体|P0|theme-theatre-stage-v05|直段台体一件；端封板可独立；相同模块可拼成5米或7.5米宽。|
|主席台侧阶|P0|theme-stage-stairs-v05|三级阶梯一件，每级高.15米、深.30米；左右侧共用。|
|颁奖／讲话讲台|P0|theme-ceremony-lectern-v05|斜面台板、支柱/柜身、底座；独立麦克风插座。|
|一二三名领奖墩|P0|theme-award-podium-v05|三件独立墩：每件宽.9深.85；高度.4/.6/.3，中央最高；组合宽2.7。|
|旧奖杯|P0|theme-trophy-cup-v05|一件主奖杯；可选低矮杯型后续扩展。|
|游乐场三杆检票闸机|P1|theme-turnstile-v05|箱体与转杆分节点，保留轴心；先交静态模型。|
|服务柜台模块|P0|theme-ticket-counter-v05|直段柜台一件；内侧低工作台；可拼接。|
|售票窗口框与开口隔断|P1|theme-ticket-window-v05|窗口框、玻璃、下方递票口独立材质/节点。|
|机械票券机／票卷座|P1|theme-ticket-register-v05|单件；票卷、出票口可见。|
|医院三联候诊椅|P0|theme-waiting-bench-v05|三联椅一件，座面、横梁、椅脚完整。|
|落地关节检查灯|P0|theme-exam-lamp-v05|底座、立杆、关节臂、灯头分节点；交一份收拢姿态。|
|壁挂X光观片箱|P1|theme-xray-viewer-v05|灯箱一件，胶片面独立材质。|
|邮件分拣格柜|P0|theme-mail-sorting-rack-v05|格柜本体；少量信封/包裹可分离。|
|会议长桌|P0|theme-conference-table-v05|独立长桌；桌面干净，勿自带书纸。|
|旧式办公转椅|P1|theme-office-chair-v05|带可辨认升降/旋转底座的旧办公椅。|
|工位低隔断模块|P1|theme-office-divider-v05|直隔断与落地脚；同一模型重复组合。|
|旅馆钥匙格架|P0|theme-hotel-key-rack-v05|壁挂格架一件；少量钥匙可选独立节点。|
|旅馆行李推车|P0|theme-luggage-trolley-v05|空车一件；上杆、平台、轮子完整；行李箱复用在制模型。|
|布草分拣车|P1|theme-linen-cart-v05|车架及布袋/分层架；床单独立复用在制模型。|
|家庭餐具一人位|P1|theme-place-setting-v05|盘碗杯与餐具可分拆；组合一份一人位。|
|供奉容器与供品组|P1|theme-offering-bowl-v05|浅盘、供碗、少量原创供品独立件。|
|原创祭祀牌板|P1|theme-ritual-tablet-v05|有独立底座的牌板一件；正反面明显。|
|游乐场奖品挂板|P1|theme-prize-display-v05|挂板与挂钩一件；奖品单独挂载。|
|旧麦克风与立架|P1|theme-microphone-stand-v05|麦克风、立杆与底座，可分拆。|
|后台演出面具组|P1|theme-performer-mask-v05、theme-performer-mask-smile-v05|两至三件原创面具各自导出；可挂可置台。|
|会议展示板|P1|theme-meeting-board-v05|壁挂软木/白板一件；空白可替换板面。|
|旅馆前台按铃|P1|theme-hotel-service-bell-v05|按铃单件，按钮独立可选。|
|舞台台口框|P1|theme-stage-pillar-v05、theme-stage-lintel-v05|两侧复用立柱，独立上楣；组合高度与净宽需验收|
|儿童手工材料组|P1|theme-craft-paper-v05、theme-craft-pencil-cup-v05、theme-craft-paint-box-v05|彩纸、笔筒、颜料盒分别生成，不带桌|

## 其余原主题资产保留

- 终点床上熟睡的人：`theme-sleeping-person-v05`；对应 ending-bedroom。
- 旧街机柜：`theme-arcade-cabinet-v05`；对应 park-03, park-07。
- 旋转木马单体：`theme-carousel-horse-v05`；对应 park-06, park-08。
- 医院分诊柜台：`theme-hospital-triage-counter-v05`；对应 hospital-01。
- 心电监护设备车：`theme-ecg-cart-v05`；对应 hospital-04, hospital-03。
- 药房小抽屉柜：`theme-pharmacy-drawers-v05`；对应 hospital-05。
- 公司接待柜台：`theme-office-reception-v05`；对应 office-01。
- 旧复印机：`theme-photocopier-v05`；对应 office-06, office-04。
- 桶装饮水机：`theme-water-dispenser-v05`；对应 office-01, office-07。
- 家庭餐具柜：`theme-china-cabinet-v05`；对应 home-06。
- 祖母针线篮：`theme-sewing-basket-v05`；对应 home-05。
- 旅馆接待总台：`theme-hotel-reception-v05`；对应 hotel-01。
- 客房行李架：`theme-hotel-luggage-rack-v05`；对应 hotel-02, hotel-03, hotel-08。
- 原创祭祀坐像：`theme-ritual-idol-v05`；对应 ritual-01, ritual-02, ritual-06。
- 旧祭祀灯笼：`theme-ritual-lantern-v05`；对应 ritual-03, ritual-07。
- 跪拜蒲团：`theme-prayer-cushion-v05`；对应 ritual-03, ritual-05。

## 质量与交接

只使用真实带贴图生成结果，不以本地简模补件。台体和侧阶是独立资源，不改变正式导航；活动节点、屏幕/灯面等必须后处理并核验，不能仅凭生成提示词宣称已分件。运行导出保留原始源文件与任务ID，记录实际W/H/D、底面原点、朝向、包围盒、材质贴图、节点、SHA-256及正背侧预览。睡姿人物既有结果需按床垫接触核验；本任务不改终点事件。

机器映射：`art-source/theme-specific-tripo-v05/functional-crosswalk.json`；实时队列状态：同目录 `runner-status.json`。新运行资源预计150–220 MB，原始源GLB预计400–600 MB，不新增依赖或LFS。自动续批遇到未知提交结果或下载不完整会停止并保留任务ID，不重复付费。

## 结构重做 V06

首批台体顶部敞开、侧阶超过三级，已隔离。两件采用内置 imagegen 生成参考图后交给 Tripo P1 图生重做；独占 `art-source/theme-structure-repairs-v06/`，图生台体实际60积分，两件预算更新为120积分。参考图为 `stage-deck-reference.png` 和 `stage-stairs-reference.png`；最终提示词分别记录在 `stage-reference-prompt.txt`、`stairs-reference-prompt.txt`。重做使用独立ID，保留失败来源，验收后再映射替代；不覆盖既有交付。

## 并行加速与最新来源

按用户追加要求，将18项未提交的办公椅、复印机、饮水机、餐具柜、针线篮、服务铃、行李架、祭像、灯笼、蒲团、观片箱、工位隔断、牌板、会议板、三件手工材料及第二款面具移至 `art-source/theme-parallel-tripo-v07/`。ID不改，H3每批9件、P1每批4件，各用独立模型并发组；新运行路径为 `/art/theme-parallel/v07/`。原V05条目的 delegatedSource 字段为来源指引，不能再在P1重复制单。18件预计540积分，替代原P1预算900积分；此次不增加资产数量。原66项已完整下载。旋转木马请求被服务拒绝、未得到任务ID，单独保留错误并跳过，不堵住其余队列。
