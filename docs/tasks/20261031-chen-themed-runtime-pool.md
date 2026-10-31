# 六主题48布局正式随机池接入

- 责任方：chen 美术；用户明确授权本轮正式接入。
- 状态：正式默认接入完成，自动回归通过；逐房美术终验继续。
- 起始状态：main，fetch 成功，本地与 origin/main 0/0，暂存区为空。保留其他对话所有未提交修改。
- 修改范围：新增 src/planning/themed-rooms.js、src/art/themed-room-runtime.js、src/art/themed-room-recipes.js；本任务拥有的 themed-room 资产、布局与制作脚本；src/planning/dream.js、client.js 的显式开关与调用；src/art/dark-interiors.js 的专用布景分流；tests/themed-room-pool.test.js；本任务交接与验收资料。
- 明确交接：模型对话已交还 planning/interiors.js、dark-interiors.js，确认不再并行修改。保留 dark-interiors 既有 room-composition 钩子。灯光对话独占 themed-room-lighting.js，不并行修改。
- 实现约束：正式游戏默认启用；历史单场景生成可保持原行为。确定性选择不消耗原地图随机序列；房间形状、门位、事件、主动玩法、追逐和出生区域保持；仅在适配通过时接入完整功能布景，不挤压模型或创建封门的新房壳。
- 验收：48候选与资源可解析；拒绝8件已隔离模型；固定种子布局/事件对照；正式导航校验、npm test、npm run build、正式运行入口浏览器检查；自动检查与真人验收分开。
- 交付提交：用户已明确授权提交并推送给策划，随本任务代码一并交付。提交记录以本文件 Git 历史为准，远端同步结果以交付消息核实的提交号为准。

## 完成记录

- 范围补充：src/art/themed-room-props.js；art-source/themed-room-showcase/runtime/（真实world核验入口与证据）；production/check-mesh-support.mjs、support-adjustments.json及检查产物；docs/art/themed-room-runtime-pool-v1.md。未修改 main/world/state/collision、共享依赖或模型二进制。
- 正式 client 默认启用，dream 最后阶段确定性适配，dark-interiors 按计划加载；48候选均可在真实地图中落位，失败事务式回退。保留房壳、门洞、剧情、保护空间与原手电。
- 修正隔离模型引用、校准后的朝向/包围盒及台面支撑。48布局0静态问题；484模型位置的GLB几何支撑检查0失败/0跳过。
- npm test 258通过；npm run build通过（大chunk提示保留）。正式createWorld浏览器种子42第一层3套，30新模型+102原世界模型加载成功、0支撑跳过；记录不是真人试玩验收。
- 工作期间其他流程提交f06208b，包含部分此前美术文件；灯光对话另行提交cb7fa25。保留这些提交，本轮仅提交自己负责的正式接入剩余改动。完整交接见 docs/art/themed-room-runtime-pool-v1.md。
