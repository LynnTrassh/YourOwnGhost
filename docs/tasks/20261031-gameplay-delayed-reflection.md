# ME02 晚一步的映像切片

- 责任方：玩法／程序方
- 状态：程序灰盒已接入；最终角色表现与自然路线验收待补
- 起始提交：f538fbb（本地工作尚未提交）
- 目标：玩家先看见同步替身，沿镜面侧移后替身留在旧位置，再慢慢转头，最后只播放一次剧本原文。
- 修改范围：`src/planning/content-catalog.js`、`src/planning/content-fit.js`、`src/story/runtime.js`、`src/rendering/story-proxies.js`、`src/preview.js`、`src/main.js`、`tests/me02.test.js`、`tests/content.test.js`、`docs/content-scheduling.md`、本任务卡与批量报告。
- 空间与状态：镜面安在真实封闭墙，镜前及侧向观察位都可达；Three.js Reflector 的视点仍实时跟随玩家，只有反射通道中的替身使用已记录姿态。初看连续曝光后记录同步姿态，侧移至少 0.9 米并继续看镜子才进入滞留阶段；替身先停 0.8 秒，再用 1.8 秒转头。离开视听关系时冻结转头进度；暂停由主循环冻结。镜外不得出现替身，不改变门与通路。
- 验收条件：两个合法种子通过空间验证；镜面实时改变透视，替身保持旧位置并转头；不侧移、离开视线、普通死亡和重复进入不误触发或重播；正常地图有实际落位。
- 验证结果：`node --test tests/me02.test.js tests/in01.test.js`、完整 `npm test` 112／112、`npm run build` 与 `git diff --check` 通过，种子 12／42 的强制落位、真实反射目标、替身隐藏、阶段与单次台词均通过。浏览器种子 12 独立预览确认正面／侧向视差、替身滞留及完成原文“你先走。它还想再待一会儿。”。[同前缀 20 种子报告](../validation/20261031-content-audit-20-flower-delay-mirror-early.json)中 40 层实际落位 3 层，覆盖不足 9 层、长空白 4 层；主要单元不足 2 局、短场面不足 0 局，ME01／ME03 各落位 3 层。[末位对照](../validation/20261031-content-audit-20-flower-delay-mirror-last.json)为 0 层；[较晚尝试实验](../validation/20261031-content-audit-20-flower-delay-mirror-sparse.json)也为 0 层，且 ME03 少 1 层。最终角色美术、正式配音与真人自然路线仍待验收。
- 交付提交：未提交。
