# 六主题逐房灯光与氛围

- 责任方：chen 美术，灯光对话。
- 状态：首轮灯光交付完成，完整房间验收与正式游戏回归待续。
- 起始提交：877dca0；fetch 成功，main 与 origin/main 一致，保留其他对话未提交文件，暂存区为空。
- 授权与交接：用户要求优化房间视觉；布局对话明确交接独立灯光模块，继续独占布局、stage、assets、designs 与原展示入口。
- 修改范围：新增 src/art/themed-room-lighting.js；独立 art-source/themed-lighting-v01/；docs/art/themed-room-lighting-handoff.md；本卡。需要材质模块时在此补记。
- 接口：createThemedRoomLighting({root,recipe,owned})；root 已有模型与天花；不改变模型、碰撞、剧情或手电；新增可释放资源进入 owned。
- 目标：先校准 hospital-04 / park-02 / office-02 / home-02 / hotel-01 / ritual-07，再按48间具体布局分别配置。配置完成、浏览器加载、视觉检查分别记录，不以一项代替另一项。
- 验收：独立预览、逐房状态与截图、语法与构建；正式展示由布局对话接入，正式游戏需程序方适配。
- 提交：用户已授权本轮本地提交，不推送。初版模块与预览已随 f06208b 进入仓库；本次提交后续灯位/锚点修正、48间截图总览与逐间状态，不包含布局对话的正式接入改动。
- 实现：48套独立配置；room-local坐标；可选ambient=false；setEnabled管理当前房间启停并释放闲置阴影；缺锚点停用单灯并报告，避免导致整个模型加载中断。布局对话已自行接入stage与正式runtime。
- 检查：48间入口截图与缩略初查；六代表房间A/B；领奖台关闭手电；修复并复拍office-04新桌锚点；当前正式48布局静态锚点0缺失。语法与构建通过。没有运行新增测试、GPU计时或真人试玩。
- 交付记录：docs/art/themed-room-lighting-handoff.md；art-source/themed-lighting-v01/status.json与captures/observations.json。48间配置完成不等于48间完整视觉验收；本轮发现的朝向/镜头/材质问题逐项标明。
