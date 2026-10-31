# AB04 留下的外形切片

- 责任方：玩法／程序方
- 状态：程序灰盒已接入；正式美术、配音与自然路线验收待补
- 起始提交：f538fbb（本地工作尚未提交）
- 目标：独立床房中，被子下面的人形隆起在被看清后缓慢塌陷，最后留下空床与压痕；床架和碰撞始终不缩放。
- 修改范围：`src/planning/content-catalog.js`、`src/planning/content-fit.js`、`src/story/runtime.js`、`src/rendering/story-proxies.js`、`src/world.js`、`src/main.js`、`tests/ab04.test.js`、`tests/content.test.js`、`docs/content-scheduling.md`、本任务卡与批量报告。
- 空间与状态：床位按当前九宫格房型挑选，四角属于同房、入口观察位可达且有视线，移走该房原有内装后重新验证床碰撞与全图通路。床架、床垫、枕头保持固定；独立细分被面用躯干和头部两处隆起的顶点形变，在 3.6 秒里塌成微凹面，终态显示压痕。连续看见 0.8 秒后才开始，视线离开时冻结；塌陷完成后一次性播放剧本原文。普通死亡、重进和重建都从已提交阶段恢复。
- 验收条件：两个合法种子床位与门不变；真实被面顶点改变而床架比例、碰撞和可达性不变；完整观察守卫、视线冻结、一次性台词、死亡与重建状态保持；正常地图实际落位。
- 验证结果：`node --test tests/ab04.test.js`、完整 `npm test` 114／114、`npm run build` 与 `git diff --check` 通过，种子 12／42 强制落位、几何差异、冻结与重建检查均通过。浏览器种子 12 的独立预览看到人形隆起、缓慢塌陷、空床压痕和原文“啊，原来不用给它留位置。”。[同前缀 20 种子报告](../validation/20261031-content-audit-20-flower-bed-indent-priority7.json)中 40 层实际落位 4 层，覆盖不足从 9 降至 8 层、长空白 4 层，主要单元不足 2 局、短场面不足 0 局；ME01／ME02／ME03 及 BO02 的落位数未下降，0 次地图无效、生成失败或保底。[始终末位对照](../validation/20261031-content-audit-20-flower-bed-indent-last.json)与[较晚尝试实验](../validation/20261031-content-audit-20-flower-bed-indent-sparse.json)均没有 AB04 落位。正式被褥材质、配音与真人自然路线待验收。
- 交付提交：未提交。
