# B01 鲜花遮门灰盒

- 责任方：玩法／程序方
- 状态：程序灰盒已落地；整卡验收进行中
- 起始提交：f538fbb（本地工作尚未提交）
- 目标：只有明确确认喜欢花才在真实门框安排密集花朵；门洞中央保持实际可通行，不需要搬花、不伤害玩家。
- 修改范围：`src/planning/content-catalog.js`、`src/planning/content-fit.js`、`src/planning/generate.js`、`src/planning/dream.js`、`src/planning/validate.js`、`src/story/runtime.js`、`src/rendering/story-proxies.js`、`src/preview.js`、`src/main.js`、`tests/flower.test.js`、本任务卡。
- 依赖与交接：当前花朵为程序几何灰盒；正式资产、门框适配和配音待交接。
- 验收条件：绑定真实房门与确认的喜欢花资格；花沿门框两侧及上方布置，不增加门心碰撞；从合法观察位看清后只消费一次原文旁白；无威胁与阻塞。
- 验证结果：种子 12 的浏览器预览显示花围门框而通道中央开放，原文旁白出现；正常输入界面选择花后 B01 进入实际第一层计划。针对性测试覆盖真实门绑定、中心净空、地图合法、旁白与无危险。正式资产、配音、自然路径真人试玩及公共矩阵仍未验收。
- 交付提交：未提交。
