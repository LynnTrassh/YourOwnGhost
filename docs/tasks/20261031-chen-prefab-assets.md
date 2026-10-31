# 第一批正式预制体资产

- 责任方：chen 美术
- 状态：待接入
- 起始提交：4bdd3cd
- 目标：提供一批可在 Three.js 场景中直接加载的 GLB 资产，建立“旧屋实拍感 + 手工拼接异物 + 克制 VHS”的资产基准。
- 修改范围：`art-source/build-prefab-pack.py`、`art-source/preview.html`、`public/art/prefabs/`、`docs/art/prefab-assets.md`、本任务卡。
- 依赖与交接：程序方在 `world.js` 中加载 GLB 并放置到计划中的预制体锚点；可用 GLTF `AnimationMixer` 播放猫怪 `slow uneven breathing and listening` 待机片段。模型单位为米，朝向 `-Z`，原点为地面中心。猫怪高度约 1.98 米；玩偶约 0.96 米；椅子约 1.31 米。
- 验收条件：三份 GLB 可由 Three.js `GLTFLoader` 加载；预览页能切换模型并播放内置动画；资源在旧屋暖色手电下保持粗糙材质与清晰轮廓。
- 验证结果：三个 GLB 已由 Three.js `GLTFLoader` 在预览页加载；猫和布偶的动画片段播放正常，旧屋整景显示旧墙、木地板、半开门、手电主光与项目 VHS 后处理。`npm run build` 和 `git diff --check` 通过。浏览器视觉检查为本地美术预览，尚未接入正式游戏世界。
- 交付提交：未提交。
