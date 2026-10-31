# IN02 溢出房 · 人偶输入灰盒

- 责任方：玩法／程序方
- 状态：程序灰盒与自动验证完成；正式表现和真人试玩待验收
- 起始提交：f538fbb（本地工作尚未提交）
- 目标：确认害怕“人偶”后，普通抽屉的缝隙在持续注视下挤出小人偶；数量有上限且可回收，不伤害、不封路。通用占位与不兼容外观不启用本场面。
- 修改范围：`src/personalization/content-tokens.js`、`src/planning/content-catalog.js`、`src/planning/content-fit.js`、`src/story/runtime.js`、`src/rendering/story-proxies.js`、`src/main.js`、`scripts/content-audit.mjs`、`tests/`、本任务卡和相关程序文档。
- 落位：在合法房间共墙附近选抽屉，验证可见抽屉缝、可达观察位、房内溢出终点及全图通行。占位陈设让出同房空间，抽屉纳入碰撞；挤出的人偶是无伤害视觉组，不改变路线。最多同时存在六个实体，完成一轮后在同一池中循环。
- 状态：看清抽屉缝持续 0.55 秒开始挤出；第一只完整可见后播放原文单次旁白。未看时连续动作冻结，离房与普通死亡保留同层状态，新局重置。
- 验证：种子 4、12 的合法房间、不可用输入的拒绝、碰撞不变、六个实体上限、离房冻结、普通死亡保留、单次原文旁白、重置和资源释放由自动测试覆盖。`npm test` 120／120、`npm run build`、`git diff --check` 通过。浏览器独立预览检查了抽屉初态、连续挤出和旁白；未进行真人自然路线试玩。正式人偶素材、动作与声音未交接。
- 批量报告：[稀疏轮换的 20 种子双层报告](../validation/20261031-content-audit-20-doll-overflow-sparse.json)中 IN02 正常落位 9 层；同前缀无恐惧输入[对照](../validation/20261031-content-audit-20-doll-overflow-control.json)中为 0。两者覆盖不足均 5 层、长空白均 6 层、主要单元不足均 8 局、短场面不足均 1 局，均无生成失败与无效层。始终提前的[实验](../validation/20261031-content-audit-20-doll-overflow-initial.json)虽落位 11 层，但覆盖不足增至 8 层，故采用稀疏顺序。批量报告不等于真人游玩验收。
- 交付提交：未提交。
