# 恐惧输入与威胁外观分离

- 责任方：玩法／程序方
- 状态：已完成
- 起始提交：4bdd3cd
- 目标：用本地预设完成恐惧输入、解释确认和威胁外观接入；凝视行为不绑定石像材质
- 修改范围：src/personalization/、src/rendering/threat-proxy.js、src/threat-profile.js、src/threat.js、src/planning/statue-fit.js、src/state.js、src/world.js、src/main.js、index.html、src/style.css、tests/personalization.test.js、README.md、docs/game-design-v0.2.md、docs/technical-architecture.md、docs/development-log.md、本任务卡
- 依赖与交接：仅制作程序化验证简模，不编辑 chen 的美术目录；不接外部服务，不恢复合成声音；喜爱输入与猫场景映射留待后续
- 验收条件：人偶／小丑输入可确认；未知输入不暗中替换；外观变更不改地图、碰撞和行为；死亡／切层保留选择，修改选择须重开；模型和资源正常释放
- 验证结果：65 项自动测试通过，覆盖本地解释及拒绝歧义、规范身份、外观包络／可见判定点／资源释放、相同规则轨迹、死亡与切层选择保留。生产构建与差异检查通过，保留现有包体积提示。浏览器正式入口验证未知输入、确认及取消修改；临时实际主循环入口确认人偶切层装配、死亡后同层保留、改选小丑重开及相同地图下不同外观，无控制台错误；临时入口已移除。正式美术、生成服务与完整真人试玩未验收。
- 交付提交：未提交
