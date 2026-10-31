# 房间预设缺件与最终布置修复

- 责任方：chen 美术，沿用已明确交接的 interiors.js、room-presets.js、generate.js。
- 状态：普通房预设修复已完成；手墙/悬偶整房实装作为后续接入缺口单列。
- 起始版本：6f2b815；开工 fetch 成功，与 origin/main 相同。
- 用户授权：查清手墙/玩偶房未出现原因，结合白皮书、联网及另一对话的艺术家研究补全预设，然后提交。仅提交本任务明确文件，不自动推送。
- 修改范围：src/planning/interiors.js、src/planning/room-presets.js、src/art/room-completeness.js、src/art/dark-interiors.js、src/art/interior-catalog.js、src/planning/dream.js；独占 art-source/room-completeness-v02/、docs/art/room-preset-repair-v02.md、本任务卡。
- 依赖与交接：需要在 src/planning/dream.js 的 completeRoomContent 与最终 validatePlan/hash 之间调用新增 completeFinalRoomInteriors。用户已明确授权此入口，现已接入。world/main、剧情代理、灯光与性能模块不修改。
- 原因：旧补全整房排除事件；最终内容编排还会清空旧家具。墙饰数量不能证明房间完整；三个主题共用女性肖像。开工时手墙与吊偶只有概念图，收尾时另一模型任务已导出两个单体，仍无整房布置；早期 sewn-nursery-doll.glb 无主游戏引用。
- 实施：保留事件家具，以局部观察点/可见关系和碰撞为约束，成组补入真实家具；只对动态建筑及专用追逐场景维持整体保护并明确列出缺口。运行前确定布局，加载时不随机。用实际 generateDream 两层结果验收。
- 美术依据：白皮书 v1.1 的功能识别、三层构图、2–4 物件簇、单异常及三观察点；另一对话确认艺术家 Trevor Henderson，以普通环境、局部显现、比例异常为研究机制。
- 验收：固定种子实际两层逐房前后家具/组数；事件数据不变；碰撞、导航、观察线及幂等；相关全量测试与构建；游戏同源实景入口/中部/回望截图。单独记录未实装手墙/吊偶，不把概念算模型。
- 验证：最终 npm test 172/172 通过；npm run build 通过（既有分包警告）；专项三种子六层 62 房通过，事件数据不变、无新碰撞、导航有效、幂等。两层模型加载 177/151、0 失败；六主题 24 张实景及主入口 B12 observed 截图已存档。无真人通关或性能验收。
- 结果：固定种子原 10 间零普通家具房补至 6–12 件，两层共加 127 件。普通房即使原件数达标仍补至少一组；家具按入口可发现性选首组落点。
- 剩余：手墙/悬偶整房静态布局、墙缝/悬线与碰撞适配；剧情代理和新墙画尚未替换，固定出生房及动态场面保留。模型由另一对话制作，本任务不调用 Tripo、不修改或代提交其资源。
- 提交：与本任务卡同次中文提交；未推送。

## 明确交接

用户回复“授权接入 dream.js，一并验证提交”，增加 src/planning/dream.js 的最终补全调用。另增加自有美术文件 src/art/interior-catalog.js 的餐椅/扶手椅/落地灯 prefab 映射，使用既有 GLB，不更改资产路径与二进制。主游戏在最终事件编排、跨层回声落位后补家具，再校验和计算 hash。
