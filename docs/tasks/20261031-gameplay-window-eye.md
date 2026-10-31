# BO01 窗外眼睛切片

- 责任方：玩法／程序方
- 状态：程序灰盒已接入；完整场面验收待补
- 起始提交：f538fbb（本地工作尚未提交）
- 目标：在地图中真实窗位摆放占满窗框的眼睛；玩家连续看清后，瞳孔缓慢对准，再播放剧本原文一次。全程不产生伤害或额外通道。
- 修改范围：`src/planning/content-catalog.js`、`src/planning/content-fit.js`、`src/story/runtime.js`、`src/rendering/story-proxies.js`、`src/main.js`、`src/preview.js`、`tests/bo01.test.js`、`tests/content.test.js`、`docs/content-scheduling.md`、本任务卡与批量报告。
- 空间与事实：适配器复用地图实际窗位、入口视线和现有墙体；不修改房型、门或碰撞。瞳孔仅在玩家实际观看时前进；看开、暂停、死亡与回访不重播已消费字幕。没有合适窗位给出拒绝原因。
- 验收条件：独立预览可读出窗框、完整眼睛、朝向变化与原文字幕；合法随机池有实际落位；自动检查覆盖观察连续性、视线冻结、一次性字幕、碰撞不变、资源释放。正式美术需保证窗框遮挡与巨大尺度，不露模型截断面。
- 验证结果：`node --test tests/bo01.test.js tests/flower.test.js tests/content.test.js`（24 项）与 `npm run build` 通过，全套测试复跑中。浏览器 `seed=12&preview=BO01&like=none` 可见眼睛在同一窗框内转向并出现“它已经离得很远了。”；为观察清楚，预览相机选择房内可达的近观察点。[同组 20 种子报告](../validation/20261031-content-audit-20-flower-after-bo01.json)显示 BO01 正常落位 18 层，覆盖不足层数从 16 降至 12。正式美术、整局自然路线和真人试玩未验收。
- 交付提交：未提交。
