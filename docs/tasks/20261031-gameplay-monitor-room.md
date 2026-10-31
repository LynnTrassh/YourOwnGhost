# ME03 监视器房切片

- 责任方：玩法／程序方
- 状态：程序灰盒已接入；最终屏幕、美术与自然路线验收待补
- 起始提交：f538fbb（本地工作尚未提交）
- 目标：同一房间内，实景椅背朝向玩家，监视器中的椅子朝向相反；玩家分别看清两处后，播放一次剧本原文。
- 修改范围：`src/planning/content-catalog.js`、`src/planning/content-fit.js`、`src/story/runtime.js`、`src/rendering/story-proxies.js`、`src/world.js`、`src/main.js`、`src/preview.js`、`tests/me03.test.js`、`tests/content.test.js`、`docs/content-scheduling.md`、本任务卡与批量报告。
- 空间与状态：监视器固定在真实封闭墙，椅子使用真实计划碰撞；两者都能从房内合法观察位看见，并有足够角度差，需要分别对准。屏幕由 Three.js 独立相机渲染同房，渲染时临时切换为反向椅子，实景始终保留原朝向；屏幕画面完成后复位可见性和渲染目标。无伤害、无答题、无新门。
- 验收条件：两种合法种子通过空间验证；真实屏幕纹理与同房画面存在，捕获时仅反向椅子可见，捕获后实景复原；只看一处不出字幕，双处连续曝光后只出一次原文；正常地图有实际落位。
- 验证结果：`node --test tests/me03.test.js tests/content.test.js` 通过，完整 `npm test` 110／110 通过，`npm run build` 和 `git diff --check` 通过。浏览器种子 12 和 42 的独立预览都看到真实屏幕画面；种子 12 切换观察后实景深色椅背与屏幕中浅色正面可区分，状态进入 `compared` 并显示“都看见了？那你信哪一个？”。[同前缀 20 种子报告](../validation/20261031-content-audit-20-flower-monitor-after-major.json)中 40 层自然落位 3 层，覆盖、长空白、主要／短场面预算与上一版持平。最终屏幕质感、亮度与真人自然路线未验收。
- 交付提交：未提交。
