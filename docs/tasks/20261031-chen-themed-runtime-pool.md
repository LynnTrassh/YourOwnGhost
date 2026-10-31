# 六主题48布局正式随机池接入

- 责任方：chen 美术；用户明确授权本轮正式接入。
- 状态：进行中。
- 起始状态：main，fetch 成功，本地与 origin/main 0/0，暂存区为空。保留其他对话所有未提交修改。
- 修改范围：新增 src/planning/themed-rooms.js、src/art/themed-room-runtime.js、src/art/themed-room-recipes.js；本任务拥有的 themed-room 资产、布局与制作脚本；src/planning/dream.js、client.js 的显式开关与调用；src/art/dark-interiors.js 的专用布景分流；tests/themed-room-pool.test.js；本任务交接与验收资料。
- 明确交接：模型对话已交还 planning/interiors.js、dark-interiors.js，确认不再并行修改。保留 dark-interiors 既有 room-composition 钩子。灯光对话独占 themed-room-lighting.js，不并行修改。
- 实现约束：正式游戏默认启用；历史单场景生成可保持原行为。确定性选择不消耗原地图随机序列；房间形状、门位、事件、主动玩法、追逐和出生区域保持；仅在适配通过时接入完整功能布景，不挤压模型或创建封门的新房壳。
- 验收：48候选与资源可解析；拒绝8件已隔离模型；固定种子布局/事件对照；正式导航校验、npm test、npm run build、正式运行入口浏览器检查；自动检查与真人验收分开。
- 交付提交：未提交；“提交给策划”按交付准备处理，暂不推送。
