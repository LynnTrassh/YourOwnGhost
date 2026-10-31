# IN04 痕迹跟随 · 花瓣来源与跨层事实

- 责任方：玩法／程序方
- 状态：花瓣版本程序灰盒与自动验证完成；正式表现和真人试玩待验收
- 起始提交：f538fbb（本地工作尚未提交）
- 目标：在首层花房观察真实花瓣来源后，同种花瓣沿自然相邻房出现；只有玩家实际看见第二处花瓣，假醒卧室才出现床边呼应与原文旁白。
- 修改范围：`src/planning/trace-fit.js`、`src/planning/dream.js`、`src/planning/content-catalog.js`、`src/planning/coverage.js`、`src/story/runtime.js`、`src/flow.js`、`src/rendering/story-proxies.js`、`src/preview.js`、`src/main.js`、`tests/`、本任务卡与相关程序文档。
- 边界：不以 B03 被抽中或花房被生成冒充玩家目击；后续房和假醒卧室共享同一 traceId。缺合法相邻房或源事实时，不启用结果。痕迹无伤害、无碰撞，不覆盖美术方资源。
- 验证结果：种子 `flower-audit-003` 的自动测试覆盖源房实际凝视、真实门洞跨房、第二处实际目击、假醒卧室事实守卫、缺源与仅看源时不启用、普通死亡保留、重置及单次原文旁白。`npm test` 121／121、`npm run build`、`git diff --check` 通过。浏览器独立预览看到了源房与后续房的同种花瓣及第二处旁白；假醒卧室由自动流程验证，尚无真人自然路径试玩。正式花瓣素材与录音未验收。[同前缀 20 种子报告](../validation/20261031-content-audit-20-flower-trace-follow.json)中 IN04 落位 4 局，覆盖不足 5 层、长空白 2 层、主要单元不足 2 局、短场面不足 0 局，0 次生成失败、无效层、保底或跨层重复；相较于接入前同组指标未退步。
- 交付提交：未提交。
