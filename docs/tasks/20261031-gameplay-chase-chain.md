# B13–B16 连续追逐

- 责任方：玩法／程序方
- 状态：进行中
- 起始提交：f538fbb
- 目标：在自然生成的相邻房间中装配同一追逐实例，依次支持侧门预警、后退房关门、双路绕行和侧室躲避。
- 修改范围：`src/planning/chase-fit.js`、`src/planning/generate.js`、`src/planning/validate.js`、`src/planning/content-catalog.js`、`src/chase.js`、`src/threat.js`、`src/world.js`、`src/main.js`、`src/map-preview.js`、`tests/chase.test.js`。
- 依赖与交接：关键撞击、撞门和远离脚步仍需正式声音资源；不以占位声音替代。
- 验收条件：四段同实例、合法随机空间、接触死亡、暂停与死亡复位、可操作临时门、双路可达、失视经过和暴露重追，完整试玩与声音验收。
- 验证结果：独立入口 `?seed=42&preview=CHASE` 可启动，侧门预警和死亡复位已在浏览器观察；种子 42、70 的导航路线用逐帧玩家移动穿过四段并进入侧室，双路、关门和失视重追有自动检查。正式撞击、撞门和远离脚步未接入，完整真人试玩与声音验收未完成，因此不得进入正常随机池。
- 交付提交：bf4df82 包含初始空间与状态；后续接入尚未提交。
