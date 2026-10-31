# 恐惧输入到内容资格的能力切片

- 责任方：玩法／程序方
- 状态：输入资格链已接；IN02 人偶灰盒接入，正式资源与完整验收待续
- 起始提交：f538fbb（本地工作尚未提交）
- 目标：只有已确认、具有具体可支持表现的恐惧身份能进入对应剧情资格；通用威胁占位和不兼容身份不能伪装成玩家输入。
- 修改范围：`src/personalization/content-tokens.js`、`src/planning/content-catalog.js`、`src/main.js`、`tests/content-tokens.test.js`、本任务卡。
- 实现：重新开始一局时，喜欢与恐惧身份共同生成内容资格。当前仅“人偶”提供 `fear.doll`，可用于后续 IN02 小型人偶溢出表现；“小丑”和通用威胁外观没有兼容抽屉变体。独立预览链接保留本局恐惧身份。
- 验证结果：IN02 接入后完整 `npm test` 120／120、`npm run build`、`git diff --check` 通过；不兼容恐惧身份被资格守卫拒绝。程序灰盒、正式素材和真人试玩的状态见 [IN02 任务](20261031-gameplay-drawer-overflow.md)。
- 交付提交：未提交。
