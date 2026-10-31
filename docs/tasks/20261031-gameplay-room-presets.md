# 预设房间组合第一版

- 责任方：玩法／程序方
- 状态：已实现，待完整视觉验收
- 起始提交：4bdd3cd
- 目标：为房间建立稳定的主题预设 ID，并让单间房由一组可替换的家具预制体组合构成。
- 修改范围：`src/planning/room-presets.js`、`src/planning/interiors.js`、`src/planning/generate.js`、`src/art/room-prefabs.js`、`src/world.js`、`docs/room-generation.md`、`docs/development-log.md`、本任务卡
- 依赖与交接：当前以程序化几何作预制体占位；后续美术可按 `prefabId` 替换 GLB，保持现有摆放包围盒与碰撞契约。
- 验收条件：同一 seed 可复现 preset 与道具组合；可用 `roomPresetOverrides` 指定主题或单个房间；不同 preset 能调用不同道具组合；场景实例化按稳定 ID 分派；新旧房型不会改变地图拓扑或通行占位。
- 验证结果：`npm run build` 与 `git diff --check` 通过；浏览器 seed 42 可进入场景，控制台无错误。浏览器环境未能锁定鼠标，已用拖动视角模式进入；本轮未能走入其他房间逐一验收新家具外观。
- 交付提交：未提交
