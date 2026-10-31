# ME01 镜中满员切片

- 责任方：玩法／程序方
- 状态：程序灰盒已接入；最终人物、美术与自然路线验收待补
- 起始提交：f538fbb（本地工作尚未提交）
- 目标：玩家从真实视点在镜里看到三个人，转身面对对应的三把空椅，再触发一次剧本原文。场面无伤害。
- 修改范围：`src/planning/content-catalog.js`、`src/planning/content-fit.js`、`src/story/runtime.js`、`src/rendering/story-proxies.js`、`src/world.js`、`src/main.js`、`src/preview.js`、`tests/me01.test.js`、`tests/content.test.js`、`docs/content-scheduling.md`、本任务卡与批量报告。
- 空间与状态：镜面安在真实封闭墙，三把实景椅子占用计划碰撞，镜内三人只在反射渲染时短暂可见。反射使用 Three.js Reflector 的独立视点和裁剪，不用贴图假反射。正面与侧面观察位可达，镜面与空椅分别连续曝光后才触发对照状态和一次原文台词。
- 验收条件：强制落位的种子通过空间合法性与门不变检查；镜面视点随玩家移动，现实侧无镜内人物；只看镜面或只看椅子均不触发，双处观察后只触发一次；正常地图有实际落位。
- 验证结果：`node --test tests/me01.test.js` 通过；完整 `npm test` 111／111、`npm run build` 与 `git diff --check` 通过。浏览器种子 12 的独立预览显示正面与侧向反射的视差，以及镜外三把空椅；切换到空椅后状态进入 `compared` 并显示“你转过去，他们就不好意思了。”。[同前缀 20 种子报告](../validation/20261031-content-audit-20-flower-mirror-sparse-final.json)中 40 层正常落位 3 层，覆盖不足 9 层、长空白 4 层，主要单元不足 2 局、短场面不足 0 局；0 次地图无效、保底或生成失败。[始终末位对照](../validation/20261031-content-audit-20-flower-mirror-last.json)落位 0 层。正式人物与镜面质感、真人自然路线未验收。
- 交付提交：未提交。
