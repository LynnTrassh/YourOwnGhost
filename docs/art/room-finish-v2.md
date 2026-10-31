# 血色房整体表现第二轮

沿用已有模型、贴图和材质。新增 [shrine-room-finish.js](../../src/art/shrine-room-finish.js)，仅克隆明确绑定的材质槽，保留原纹理、微表面与既有 crimson／ceiling shader。降低背景墙纸和地毯的纹样对比与饱和度，统一灰泥顶面色调；crimson-room 可按显式 weight 重分配原灯具目标亮度，入口灯保持原权重。没有新增全屏红色滤镜，没有替换家具、缩放模型、增加灯或碰撞。

`createShrineRoomFinish({bindings:[{mesh,index?,role:'wall'|'floor'|'ceiling'}]})` 默认关闭；`setEnabled()`、`inspect()`、`dispose()`。必须在 underlying crimson／ceiling 建立后绑定，先释放 finish 再释放底层模块。换顶材质后重建绑定；不覆盖外部后来换入的材质。

已有事件代理仍是白色灰盒。本轮不以重复贴图或无关模型掩盖角色资产缺口；已有供桌模型尺寸为 1.3×.65×.86 m，事件灰盒桌为 2.2×.85、桌面顶 1.16 m，不能无交接地互换导致台面与供奉物悬空。待程序方确认外观绑定／尺度后再接角色与供桌资产。

- [合同检查](../../art-source/room-finish-v2/check-results.json)通过：槽隔离、旧 shader 保留、开关还原、外部所有权、错误绑定与释放。
- [当前种子重复检查](../../art-source/room-finish-v2/seed-repeat.json)通过；当前 hash 已受并行规划编辑影响，不归因于本模块。
- 真实 world 预览的 plan / colliders / 其他房间墙材质对照保持不变；同机位对照见摄像机交付的截图索引。
- 未接入正式入口，未提交、未推送。空间美术、摄影机缺陷与叙事信号相互独立。正式接入时必须复验原事件、门、导航与主动遭遇。
