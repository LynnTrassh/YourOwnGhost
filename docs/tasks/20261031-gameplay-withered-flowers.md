# B03 花全部枯黑灰盒

- 责任方：玩法／程序方
- 状态：程序灰盒已落地；整卡验收进行中
- 起始提交：f538fbb（本地工作尚未提交）
- 目标：只有明确确认喜欢花才在可自然回访的房间放置同一花瓶；先看清盛放，正常跨门离开后花枯黑，回访看清才记录事实和原文第二句。
- 修改范围：`src/planning/content-catalog.js`、`src/planning/content-fit.js`、`src/planning/generate.js`、`src/planning/dream.js`、`src/planning/validate.js`、`src/story/runtime.js`、`src/rendering/story-proxies.js`、`src/world.js`、`src/preview.js`、`src/main.js`、`tests/flower.test.js`、本任务卡。
- 依赖与交接：当前花瓶、盛放／枯黑花朵为程序几何灰盒；正式资产、配音和 B27 尾声待交接与开发。
- 验收条件：无确认输入不落位；未看清离房与死亡传送不枯萎；正常跨门后保持同一花瓶位置，回访状态可读；枯黑事实只在回访看清后记录，后续 B27 只能依赖该事实；无威胁与阻塞。
- 验证结果：种子 12 的浏览器预览确认盛放、正常跨门后的同位枯黑与两句原文旁白；正常输入界面选择花后 B03 入选第一层，猫不出现。针对性测试验证资格、真实跨门、未观察离房、状态事实、渲染变体与地图校验；B27、正式资产、配音、自然路径真人试玩及公共矩阵仍未验收。
- 交付提交：未提交。
