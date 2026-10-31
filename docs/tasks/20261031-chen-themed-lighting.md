# 六主题逐房灯光与氛围

- 责任方：chen 美术，灯光对话。
- 状态：进行中。
- 起始提交：877dca0；fetch 成功，main 与 origin/main 一致，保留其他对话未提交文件，暂存区为空。
- 授权与交接：用户要求优化房间视觉；布局对话明确交接独立灯光模块，继续独占布局、stage、assets、designs 与原展示入口。
- 修改范围：新增 src/art/themed-room-lighting.js；独立 art-source/themed-lighting-v01/；docs/art/themed-room-lighting-handoff.md；本卡。需要材质模块时在此补记。
- 接口：createThemedRoomLighting({root,recipe,owned})；root 已有模型与天花；不改变模型、碰撞、剧情或手电；新增可释放资源进入 owned。
- 目标：先校准 hospital-04 / park-02 / office-02 / home-02 / hotel-01 / ritual-07，再按48间具体布局分别配置。配置完成、浏览器加载、视觉检查分别记录，不以一项代替另一项。
- 验收：独立预览、逐房状态与截图、语法与构建；正式展示由布局对话接入，正式游戏需程序方适配。
- 提交：仅留本地；不提交或推送。
