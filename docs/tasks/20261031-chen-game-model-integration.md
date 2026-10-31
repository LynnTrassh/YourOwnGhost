# 真实模型接入主游戏

- 责任方：chen 美术，沿用用户对家具密度/款式规划与渲染接入的明确交接。
- 状态：首批主游戏接入完成，后续主题模型继续交给48间布局验收。
- 用户授权：继续批量生成可用主题模型，并提交到主游戏。
- 范围：src/planning/room-presets.js、src/planning/interiors.js、src/art/interior-catalog.js、src/art/room-props-catalog.js、src/art/dark-interiors.js、src/art/room-detail-dressing.js、src/art/model-surface-repair.js 及必要独立表现模块/验证；独占 art-source/game-model-release-v01/、docs/art/game-model-release-v01.md；本任务生成的运行模型。
- 边界：保留其他对话的 room-composition 等未提交修改，不替其提交；不自行接管48间草案布局、主入口、剧情与导航。既有固定出生房和追逐/动态房保护继续有效。
- 目标：正式家具选择可加载真实 Tripo 资源，增加主题道具和款式，按真实包围盒安排占地，修复书桌法线和重复叠放。
- 验收：资产路径不指向被否决的本地简模；按种子确定款式；规划/碰撞测试通过，构建通过，实际场景加载和视觉检查；提交时只暂存本任务明确路径与修改片段。
- 交付：用户授权本地提交到 main；不自动推送。

- 验证：254项测试通过；暂存区独立副本构建与专项5项通过；正式 generateDream/createWorld 实景234实例加载、0失败，浏览器错误0。无真人试玩。
- 交付：本提交包含21件真实家具注册、三款床与梳妆台、尺寸规划和书桌修复；不包含其他对话的构图/灯光改动。
