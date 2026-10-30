# 九宫格外框中点门位

- 责任方：玩法／程序方
- 状态：已完成
- 起始提交：56cecfa
- 目标：每间房只允许在完整九宫格外框四条边的中点开门；缺少对应模块的方向不可连接
- 修改范围：src/planning/topology.js、src/planning/validate.js、src/planning/generate.js、tests/generation.test.js、tests/story.test.js、README.md、docs/room-generation.md、docs/development-log.md、本任务卡
- 依赖与交接：保持 11 种轮廓、固定卧室与现有美术接口
- 验收条件：所有门同时居中于两侧房间外框；拒绝偏移门位；随机地图连通，剧情适配与两层流程回归通过
- 验证结果：33 项自动测试通过，含 100 个种子的双侧门位、全部 11 种轮廓、实际碰撞通行、偏移门位拒绝、剧情与两层流程回归；生产构建通过（现有包体积提示保留）。浏览器 seed 12 平面图已核对，无控制台错误；未完成完整真人试玩。地图版本更新为 15，猫房测试样例更新为 seed 4。
- 交付提交：未提交
