# Tripo 模型交接：已提交资源批次 V01

2026-10-31。交给策划／程序的本批为 **95 件带贴图 GLB**，共 **354,622,760 字节（约 355 MB）**。这是已有生成结果的资源快照：26 件此前完成模型视觉检查，69 件仍待逐件视觉检查；不能把“已提交”当作“已在游戏中接入”或“房间已验收”。

## 本次交付

|批次|件数|内容|
|---|---:|---|
|furniture-diversity/v01|4|三款床、椭圆镜梳妆台|
|room-props/v02|41|电脑、电视、衣帽、杂物、线缆、医疗与陈设等原 42 件的 Tripo 替代；排除旧摆钟|
|scene-assets/v03|44|家具变体、卫浴、生活电器、玩具与祭器等；排除失败皮沙发|
|quality-repairs/v04|1|摆钟重做版，尚待视觉检查|
|theme-specific/v05|5|领奖台、睡姿人物、讲台、奖杯、售票柜台，尚待主题规格与视觉检查|

- [完整机器清单](../../art-source/model-delivery-v01/manifest.json)：每件路径、尺寸、包围盒、底面原点、朝向状态、材质与嵌入贴图、节点、SHA-256、Tripo 任务 ID、检查状态。
- [来源记录](../../art-source/model-delivery-v01/provenance.json)：已提交资产的生成来源；原始高分辨率 GLB 留在本机，未将重复源文件和账户日志提交。
- [结构检查结果](../../art-source/model-delivery-v01/validation.json)；复验命令 `python3 art-source/model-delivery-v01/validate.py`。
- 模型查看页：运行 `npm run dev` 后打开 `/art-source/model-delivery-v01/models.html`。按件加载，可转动、切换方向与灯光、下载 GLB；下拉列表区分已检查和待检查。

## 策划与程序接入注意

1. 本提交仅资源及交接，不包含房间规划、密度分配、共享渲染代码、终点事件与屏幕播放器的未提交修改。此前四件家具在本机曾接入预览，但本提交不承诺远端已接入。
2. 所有运行 GLB 使用米制、底面中心原点。朝向以逐件字段为准；`pending-review` 不能当作已统一正面。已检查旧批通常正面 −Z，六主题交接要求 +Z，后续需逐件核对与转换。
3. 尺寸是实际模型包围盒，并非规划碰撞槽。不得把超宽家具硬塞进旧占位；接入时调整布局或按比例缩放并复验通路、门口、接触及穿插。
4. 电脑和电脑工作台的 Tripo 材质尚未拆出播放器使用的独立 `glass` 屏幕；在完成屏幕分件／材质适配前，不直接替换正在播放内容的实例。
5. 睡姿人物已单独交付，最长水平尺寸归一到 1.78 m；包含人物、被褥与支撑垫外形。需核对既有床的实际床垫支撑面、头端朝向和覆盖关系，尚未接入终点。
6. 旧摆钟 `prop-pendulum-clock-v01`（缺钟面）和 `scene-sofa-leather-v03`（两个悬浮沙发）不在本提交；不可从本地旧目录误取。重做摆钟使用独立 v04 路径。
7. 新六主题缺模按交接的 29 组（12 组 P0）继续去重制作。当前五件主题结果不等于首批五组规格齐全：主席台台体、独立侧阶尚未交付，领奖台仍需核对三墩可独立使用，讲台／奖杯也需核对目标尺寸。48 间主题房并未因此全部完成。
8. 单件资源按需加载；不将这 95 件一次性装入每个房间。外观检查、场景接触、功能接口、性能检查均应逐批完成。

## 验证与范围

95/95 GLB 的文件长度、数据块、索引范围、有限顶点与法线／UV、嵌入贴图头、材质贴图引用、包围盒元数据与 SHA-256 检查通过。本地工作区 `npm run build` 通过（保留已有大 chunk 提示）；没有本轮真人试玩。模型查看页已验证清单加载与首件床 GLB 加载。未提交密钥、账户配置、供应商临时下载 URL、生成日志、本地简模或其他对话改动。用户自行推送。

## 逐件清单

尺寸顺序为宽 × 高 × 深（米）；“模型已检查”仍不等于完成场景验收。

|模型|实际尺寸|检查状态|GLB|
|---|---|---|---|
|铁栏单人床|0.998 × 1.014 × 2.000|模型已检查|[bed-iron-rail-v01](../../public/art/furniture-diversity/v01/bed-iron-rail-v01.glb)|
|半帘四柱床|1.658 × 2.200 × 2.019|模型已检查|[bed-canopy-linen-v01](../../public/art/furniture-diversity/v01/bed-canopy-linen-v01.glb)|
|低矮旧软榻|0.996 × 0.530 × 1.950|模型已检查|[bed-low-divan-v01](../../public/art/furniture-diversity/v01/bed-low-divan-v01.glb)|
|椭圆镜梳妆台|1.062 × 1.650 × 0.455|模型已检查|[vanity-oval-mirror-v01](../../public/art/furniture-diversity/v01/vanity-oval-mirror-v01.glb)|
|厚壳旋钮电视|0.595 × 0.560 × 0.534|模型已检查|[prop-crt-tv-v01](../../public/art/room-props/v02/prop-crt-tv-v01.glb)|
|老式电脑与键鼠|0.611 × 0.500 × 0.692|模型已检查|[prop-crt-computer-v01](../../public/art/room-props/v02/prop-crt-computer-v01.glb)|
|拨盘电话|0.262 × 0.172 × 0.283|模型已检查|[prop-rotary-phone-v01](../../public/art/room-props/v02/prop-rotary-phone-v01.glb)|
|木壳收音机|0.263 × 0.200 × 0.142|模型已检查|[prop-wood-radio-v01](../../public/art/room-props/v02/prop-wood-radio-v01.glb)|
|圆形挂钟|0.440 × 0.440 × 0.164|模型已检查|[prop-wall-clock-v01](../../public/art/room-props/v02/prop-wall-clock-v01.glb)|
|悬挂旧外套|1.234 × 1.200 × 0.466|模型已检查|[prop-hanging-coat-v01](../../public/art/room-props/v02/prop-hanging-coat-v01.glb)|
|空衣架|0.419 × 0.244 × 0.071|模型已检查|[prop-empty-hanger-v01](../../public/art/room-props/v02/prop-empty-hanger-v01.glb)|
|旧毡帽|0.432 × 0.190 × 0.430|模型已检查|[prop-felt-hat-v01](../../public/art/room-props/v02/prop-felt-hat-v01.glb)|
|衣架外套帽子组|0.975 × 1.985 × 0.664|模型已检查|[prop-clothes-rack-v01](../../public/art/room-props/v02/prop-clothes-rack-v01.glb)|
|旧皮鞋|0.465 × 0.180 × 0.477|模型已检查|[prop-shoes-pair-v01](../../public/art/room-props/v02/prop-shoes-pair-v01.glb)|
|绑带旅行箱|0.551 × 0.461 × 0.286|模型已检查|[prop-suitcase-v01](../../public/art/room-props/v02/prop-suitcase-v01.glb)|
|贴签纸箱|0.405 × 0.364 × 0.405|模型已检查|[prop-cardboard-box-v01](../../public/art/room-props/v02/prop-cardboard-box-v01.glb)|
|成组档案盒|0.359 × 0.320 × 0.310|模型已检查|[prop-archive-boxes-v01](../../public/art/room-props/v02/prop-archive-boxes-v01.glb)|
|散叠旧书|0.217 × 0.199 × 0.166|模型已检查|[prop-books-stack-v01](../../public/art/room-props/v02/prop-books-stack-v01.glb)|
|散页纸堆|0.155 × 0.142 × 0.155|待视觉检查|[prop-paper-wave-v01](../../public/art/room-props/v02/prop-paper-wave-v01.glb)|
|茶具托盘|0.193 × 0.133 × 0.244|待视觉检查|[prop-tea-tray-v01](../../public/art/room-props/v02/prop-tea-tray-v01.glb)|
|药瓶器械盘|0.271 × 0.194 × 0.332|待视觉检查|[prop-medicine-tray-v01](../../public/art/room-props/v02/prop-medicine-tray-v01.glb)|
|搪瓷盆洗漱架|1.180 × 1.051 × 0.552|模型已检查|[prop-washstand-v01](../../public/art/room-props/v02/prop-washstand-v01.glb)|
|输液架|0.749 × 1.850 × 0.807|待视觉检查|[prop-iv-stand-v01](../../public/art/room-props/v02/prop-iv-stand-v01.glb)|
|三折布屏风|1.331 × 1.696 × 1.364|待视觉检查|[prop-folding-screen-v01](../../public/art/room-props/v02/prop-folding-screen-v01.glb)|
|木栏摇篮|0.614 × 0.887 × 1.124|待视觉检查|[prop-cradle-v01](../../public/art/room-props/v02/prop-cradle-v01.glb)|
|旧木摇马|0.437 × 0.957 × 0.935|待视觉检查|[prop-rocking-horse-v01](../../public/art/room-props/v02/prop-rocking-horse-v01.glb)|
|三节木玩具车|0.400 × 0.195 × 0.095|待视觉检查|[prop-toy-train-v01](../../public/art/room-props/v02/prop-toy-train-v01.glb)|
|悬吊环饰|0.684 × 0.822 × 0.745|待视觉检查|[prop-hanging-mobile-v01](../../public/art/room-props/v02/prop-hanging-mobile-v01.glb)|
|枯花陶瓶|0.436 × 0.657 × 0.423|待视觉检查|[prop-dried-flowers-v01](../../public/art/room-props/v02/prop-dried-flowers-v01.glb)|
|旧烛台组|0.499 × 0.633 × 0.516|待视觉检查|[prop-candlesticks-v01](../../public/art/room-props/v02/prop-candlesticks-v01.glb)|
|原创剪影像框|0.056 × 0.440 × 0.361|待视觉检查|[prop-portrait-frame-v01](../../public/art/room-props/v02/prop-portrait-frame-v01.glb)|
|褶皱悬布|1.255 × 2.534 × 1.592|待视觉检查|[prop-hanging-drape-v01](../../public/art/room-props/v02/prop-hanging-drape-v01.glb)|
|白布覆盖轮廓|1.429 × 1.350 × 1.434|待视觉检查|[prop-covered-shape-v01](../../public/art/room-props/v02/prop-covered-shape-v01.glb)|
|盘地电缆|0.116 × 0.078 × 0.103|待视觉检查|[prop-cable-coil-v01](../../public/art/room-props/v02/prop-cable-coil-v01.glb)|
|沿墙线束|0.786 × 0.700 × 5.499|待视觉检查|[prop-cable-wall-v01](../../public/art/room-props/v02/prop-cable-wall-v01.glb)|
|垂弧顶线|0.246 × 0.575 × 0.600|待视觉检查|[prop-cable-ceiling-v01](../../public/art/room-props/v02/prop-cable-ceiling-v01.glb)|
|垂落线帘|0.272 × 2.207 × 1.239|待视觉检查|[prop-cable-curtain-v01](../../public/art/room-props/v02/prop-cable-curtain-v01.glb)|
|原创有机褶边|0.541 × 1.762 × 1.961|待视觉检查|[prop-organic-rib-v01](../../public/art/room-props/v02/prop-organic-rib-v01.glb)|
|电视与矮柜组|0.621 × 1.302 × 1.463|待视觉检查|[prop-tv-console-v01](../../public/art/room-props/v02/prop-tv-console-v01.glb)|
|旧电脑工作台|0.921 × 1.260 × 1.373|待视觉检查|[prop-computer-desk-v01](../../public/art/room-props/v02/prop-computer-desk-v01.glb)|
|纸箱与档案堆组|0.506 × 0.685 × 0.725|待视觉检查|[prop-archive-stack-v01](../../public/art/room-props/v02/prop-archive-stack-v01.glb)|
|茶具推车|0.487 × 0.844 × 0.745|待视觉检查|[prop-tea-cart-v01](../../public/art/room-props/v02/prop-tea-cart-v01.glb)|
|玩具整理矮台|0.525 × 0.580 × 0.825|待视觉检查|[prop-toy-bench-v01](../../public/art/room-props/v02/prop-toy-bench-v01.glb)|
|药品器械推架|0.571 × 1.045 × 0.996|待视觉检查|[prop-medical-cart-v01](../../public/art/room-props/v02/prop-medical-cart-v01.glb)|
|烛台与遗像供桌|0.690 × 1.463 × 1.411|待视觉检查|[prop-candle-altar-v01](../../public/art/room-props/v02/prop-candle-altar-v01.glb)|
|双门旧衣柜|1.359 × 2.100 × 0.940|模型已检查|[scene-wardrobe-panelled-v03](../../public/art/scene-assets/v03/scene-wardrobe-panelled-v03.glb)|
|镜门衣橱|1.341 × 2.100 × 0.861|模型已检查|[scene-wardrobe-mirrored-v03](../../public/art/scene-assets/v03/scene-wardrobe-mirrored-v03.glb)|
|褪色布沙发|1.750 × 0.900 × 0.893|模型已检查|[scene-sofa-linen-v03](../../public/art/scene-assets/v03/scene-sofa-linen-v03.glb)|
|高背扶手椅|0.717 × 1.150 × 0.618|模型已检查|[scene-armchair-wingback-v03](../../public/art/scene-assets/v03/scene-armchair-wingback-v03.glb)|
|旧藤椅|0.828 × 0.950 × 0.782|模型已检查|[scene-armchair-wicker-v03](../../public/art/scene-assets/v03/scene-armchair-wicker-v03.glb)|
|木条背餐椅|0.518 × 0.950 × 0.524|模型已检查|[scene-chair-spindle-v03](../../public/art/scene-assets/v03/scene-chair-spindle-v03.glb)|
|软垫餐椅|0.502 × 0.950 × 0.595|模型已检查|[scene-chair-upholstered-v03](../../public/art/scene-assets/v03/scene-chair-upholstered-v03.glb)|
|木摇椅|0.792 × 1.100 × 0.724|待视觉检查|[scene-rocking-chair-v03](../../public/art/scene-assets/v03/scene-rocking-chair-v03.glb)|
|翻板写字柜|0.721 × 1.150 × 0.799|待视觉检查|[scene-writing-bureau-v03](../../public/art/scene-assets/v03/scene-writing-bureau-v03.glb)|
|圆形餐桌|1.021 × 0.760 × 1.023|待视觉检查|[scene-round-table-v03](../../public/art/scene-assets/v03/scene-round-table-v03.glb)|
|旧餐边柜|0.624 × 1.050 × 1.074|待视觉检查|[scene-sideboard-v03](../../public/art/scene-assets/v03/scene-sideboard-v03.glb)|
|旧长木凳|0.467 × 0.460 × 1.348|待视觉检查|[scene-bench-wood-v03](../../public/art/scene-assets/v03/scene-bench-wood-v03.glb)|
|铁架诊疗床|1.686 × 0.900 × 0.881|待视觉检查|[scene-hospital-bed-v03](../../public/art/scene-assets/v03/scene-hospital-bed-v03.glb)|
|旧轮椅|1.075 × 1.000 × 0.686|待视觉检查|[scene-wheelchair-v03](../../public/art/scene-assets/v03/scene-wheelchair-v03.glb)|
|医用圆凳|0.440 × 0.550 × 0.455|待视觉检查|[scene-stool-metal-v03](../../public/art/scene-assets/v03/scene-stool-metal-v03.glb)|
|搪瓷壁挂洗手池|0.470 × 0.650 × 0.525|待视觉检查|[scene-sink-wall-v03](../../public/art/scene-assets/v03/scene-sink-wall-v03.glb)|
|旧浴缸|0.822 × 0.650 × 1.264|待视觉检查|[scene-bathtub-v03](../../public/art/scene-assets/v03/scene-bathtub-v03.glb)|
|旧瓷马桶|0.442 × 0.800 × 0.715|待视觉检查|[scene-toilet-v03](../../public/art/scene-assets/v03/scene-toilet-v03.glb)|
|拖把与铁桶|0.669 × 1.350 × 0.983|待视觉检查|[scene-mop-bucket-v03](../../public/art/scene-assets/v03/scene-mop-bucket-v03.glb)|
|旧洗衣篮|0.621 × 0.550 × 0.640|待视觉检查|[scene-laundry-basket-v03](../../public/art/scene-assets/v03/scene-laundry-basket-v03.glb)|
|伞桶与旧雨伞|0.246 × 0.900 × 0.398|待视觉检查|[scene-umbrella-stand-v03](../../public/art/scene-assets/v03/scene-umbrella-stand-v03.glb)|
|挂钩与围巾组|0.172 × 0.800 × 0.682|待视觉检查|[scene-wall-coat-pegs-v03](../../public/art/scene-assets/v03/scene-wall-coat-pegs-v03.glb)|
|折叠床单组|0.280 × 0.180 × 0.318|待视觉检查|[scene-folded-linen-v03](../../public/art/scene-assets/v03/scene-folded-linen-v03.glb)|
|旧枕头组|0.347 × 0.240 × 0.447|待视觉检查|[scene-pillow-pair-v03](../../public/art/scene-assets/v03/scene-pillow-pair-v03.glb)|
|老式缝纫机|0.260 × 0.350 × 0.496|待视觉检查|[scene-sewing-machine-v03](../../public/art/scene-assets/v03/scene-sewing-machine-v03.glb)|
|旧打字机|0.424 × 0.280 × 0.375|待视觉检查|[scene-typewriter-v03](../../public/art/scene-assets/v03/scene-typewriter-v03.glb)|
|胶片放映机|0.627 × 0.600 × 0.296|待视觉检查|[scene-reel-projector-v03](../../public/art/scene-assets/v03/scene-reel-projector-v03.glb)|
|木箱唱机|0.279 × 0.340 × 0.347|待视觉检查|[scene-record-player-v03](../../public/art/scene-assets/v03/scene-record-player-v03.glb)|
|老电风扇|0.423 × 0.500 × 0.429|待视觉检查|[scene-electric-fan-v03](../../public/art/scene-assets/v03/scene-electric-fan-v03.glb)|
|旧排风扇|0.214 × 0.500 × 0.482|待视觉检查|[scene-wall-fan-v03](../../public/art/scene-assets/v03/scene-wall-fan-v03.glb)|
|钥匙与小托盘|0.153 × 0.050 × 0.154|待视觉检查|[scene-key-tray-v03](../../public/art/scene-assets/v03/scene-key-tray-v03.glb)|
|旧药瓶组|0.139 × 0.200 × 0.231|待视觉检查|[scene-medicine-bottles-v03](../../public/art/scene-assets/v03/scene-medicine-bottles-v03.glb)|
|旧日历板|0.218 × 0.650 × 0.430|待视觉检查|[scene-calendar-board-v03](../../public/art/scene-assets/v03/scene-calendar-board-v03.glb)|
|旧文具整理架|0.179 × 0.220 × 0.252|待视觉检查|[scene-desk-organizer-v03](../../public/art/scene-assets/v03/scene-desk-organizer-v03.glb)|
|悬挂旧长裙|0.300 × 1.300 × 0.581|待视觉检查|[scene-clothes-hanging-dress-v03](../../public/art/scene-assets/v03/scene-clothes-hanging-dress-v03.glb)|
|悬挂旧雨衣|0.344 × 1.250 × 0.660|待视觉检查|[scene-coat-raincoat-v03](../../public/art/scene-assets/v03/scene-coat-raincoat-v03.glb)|
|旧婴儿车|0.593 × 1.000 × 0.864|待视觉检查|[scene-pram-v03](../../public/art/scene-assets/v03/scene-pram-v03.glb)|
|旧三轮车|0.684 × 0.550 × 0.358|待视觉检查|[scene-tricycle-v03](../../public/art/scene-assets/v03/scene-tricycle-v03.glb)|
|旧泰迪熊|0.390 × 0.500 × 0.489|待视觉检查|[scene-teddy-bear-v03](../../public/art/scene-assets/v03/scene-teddy-bear-v03.glb)|
|旧积木组|0.216 × 0.200 × 0.228|待视觉检查|[scene-toy-blocks-v03](../../public/art/scene-assets/v03/scene-toy-blocks-v03.glb)|
|旧八音盒|0.209 × 0.240 × 0.189|待视觉检查|[scene-music-box-v03](../../public/art/scene-assets/v03/scene-music-box-v03.glb)|
|旧香炉|0.282 × 0.280 × 0.327|待视觉检查|[scene-incense-burner-v03](../../public/art/scene-assets/v03/scene-incense-burner-v03.glb)|
|铜铃|0.185 × 0.250 × 0.189|待视觉检查|[scene-ritual-bell-v03](../../public/art/scene-assets/v03/scene-ritual-bell-v03.glb)|
|五臂烛台|0.270 × 0.650 × 0.330|待视觉检查|[scene-candelabrum-v03](../../public/art/scene-assets/v03/scene-candelabrum-v03.glb)|
|落地摆钟（重做）|0.328 × 1.800 × 0.483|待视觉检查|[prop-pendulum-clock-v04](../../public/art/quality-repairs/v04/prop-pendulum-clock-v04.glb)|
|三级领奖台|0.511 × 0.650 × 1.226|待视觉检查|[theme-award-podium-v05](../../public/art/theme-specific/v05/theme-award-podium-v05.glb)|
|终点床上熟睡的人|1.181 × 0.568 × 1.780|待视觉检查|[theme-sleeping-person-v05](../../public/art/theme-specific/v05/theme-sleeping-person-v05.glb)|
|颁奖典礼讲台|0.481 × 1.200 × 0.463|待视觉检查|[theme-ceremony-lectern-v05](../../public/art/theme-specific/v05/theme-ceremony-lectern-v05.glb)|
|双耳奖杯|0.168 × 0.420 × 0.244|待视觉检查|[theme-trophy-cup-v05](../../public/art/theme-specific/v05/theme-trophy-cup-v05.glb)|
|售票柜台|0.707 × 1.250 × 0.746|待视觉检查|[theme-ticket-counter-v05](../../public/art/theme-specific/v05/theme-ticket-counter-v05.glb)|
