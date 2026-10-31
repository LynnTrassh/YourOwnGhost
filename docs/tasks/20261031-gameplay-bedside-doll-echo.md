# B28 床边玩偶条件呼应

- 责任方：玩法／程序方
- 状态：程序灰盒已落地；整卡验收进行中
- 起始提交：f538fbb（本地工作尚未提交，远端新增提交尚未整合）
- 目标：第一层确实看清 B04 破口后，第二层假醒卧室床边出现同一破口玩偶；未目击时保持普通卧室。
- 修改范围：`src/planning/generate.js`、`src/planning/dream.js`、`src/planning/composition.js`、`src/planning/content-catalog.js`、`src/story/runtime.js`、`src/flow.js`、`src/rendering/story-proxies.js`、`src/preview.js`、`src/main.js`、`tests/content.test.js`、本任务卡。
- 验收条件：条件槽在开局规划并引用第一层 B04 实例；假醒事务只读取真实 `.tearSeen` 事实；第二层从未见初态时不显示、不说话；普通死亡保留已启用状态；新局清空；不触发拾取或伤害。
- 验证结果：种子 4 的第一层 B04 与第二层 B28 条件槽关联正确；自动测试走初见、真实过门、回访、出口假醒后确认模型显隐和旁白；跳过破口目击的分支保持隐藏。浏览器独立预览看见同一程序模型的相同破口位于床边，床与玩偶同框。独立预览人为启用条件，仅用于构图核对；正常玩家路线、正式模型／配音和真人体验仍待验收。
- 交付提交：未提交。
