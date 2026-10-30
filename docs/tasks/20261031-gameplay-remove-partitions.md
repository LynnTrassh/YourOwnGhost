# 移除独立隔断

- 责任方：玩法／程序方
- 状态：已完成
- 起始提交：56cecfa
- 目标：移除随机内装的独立高隔断，原隔断布局改为留白
- 修改范围：src/planning/interiors.js、src/planning/generate.js、src/world.js、tests/generation.test.js、README.md、docs/room-generation.md、docs/development-log.md、本任务卡
- 依赖与交接：保留房间轮廓、边界墙体、门洞、固定卧室、柜台与贴墙书架
- 验收条件：生成计划无独立隔断及其碰撞；地图和剧情回归通过
- 验证结果：32 项自动测试及构建通过，100 个种子的生成计划无独立隔断，原通行、墙体和剧情回归通过。浏览器 seed 12 平面图确认原隔断区域留白，无控制台错误；未进行完整真人试玩。
- 交付提交：未提交
