# BO02 太长的身体切片

- 责任方：玩法／程序方
- 状态：自带人形程序灰盒已接入；正式人物、美术与自然路线验收待补
- 起始提交：f538fbb（本地工作尚未提交）
- 目标：从一间房的真实门缝先看到正常大小的头，再看见异常长的身体持续经过；无伤害、不堵住通关，也不把整体模型拉长。
- 修改范围：`src/planning/content-catalog.js`、`src/planning/content-fit.js`、`src/planning/coverage.js`、`src/story/runtime.js`、`src/rendering/story-proxies.js`、`src/world.js`、`src/main.js`、`tests/bo02.test.js`、`tests/content.test.js`、`docs/content-scheduling.md`、本任务卡与批量报告。
- 空间与状态：观察房与人物房必须由一扇实际门相连；门叶只占门宽一侧，碰撞与可见模型一致，中心通路保留。人物在相邻房的横向轨迹全程经过形状与碰撞适配。头、颈与九个身体段分别建模与驱动，头始终原尺寸；首次连续看见头后才开始经过，只在持续可见时推进。经过足够长度后触发一次原文台词。两个真实参与房都计入覆盖，每房只安排一个主焦点。
- 验收条件：两个种子有合法双房落位和通路；门位置不变，门叶不阻塞玩家，身体各段不出界；先见头再见身体，头比例不变；看开冻结、台词只消费一次；正常随机地图有实际落位。
- 验证结果：`node --test tests/bo02.test.js`、完整 `npm test` 113／113、`npm run build` 与 `git diff --check` 通过，种子 12／42 的配对关系、门／通路合法、模型和阶段均通过。浏览器种子 12 的独立预览见正常头部、门缝中的分段身体与原文“别急，还没过去完。”；第一次灰盒过曝且像平板，已将身体改为窄段圆柱和关节，当前仍需 chen 的正式身体表现。[同前缀 20 种子报告](../validation/20261031-content-audit-20-flower-long-body-sparse.json)中 40 层正常落位 2 层，覆盖不足 9 层、长空白 4 层、主要单元不足 2 局、短场面不足 0 局；ME01／ME02／ME03 各保留 3 层，0 次地图无效、生成失败或保底。[末位对照](../validation/20261031-content-audit-20-flower-long-body-last.json)中 BO02 为 0 层。真人自然路线、正式人物与配音待验收。恐惧输入没有适配骨骼时不绑定本场面。
- 交付提交：未提交。
