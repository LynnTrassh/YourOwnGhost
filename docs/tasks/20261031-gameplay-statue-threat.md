# 凝视雕像首轮闭环

- 责任方：玩法／程序方
- 状态：已完成
- 起始提交：4bdd3cd
- 目标：在第二层已有空间中适配凝视雕像，完成安全示范、照停暗行、跨房追踪、接触死亡与同层复位
- 修改范围：src/planning/statue-fit.js、src/planning/generate.js、src/planning/dream.js、src/threat.js、src/state.js、src/flow.js、src/main.js、src/story/runtime.js、src/world.js、src/map-preview.js、index.html、tests/statue.test.js、README.md、docs/room-generation.md、docs/technical-architecture.md、docs/development-log.md、本任务卡
- 依赖与交接：沿用现有地图、普通死亡返回和猫群实例；不修改 chen 的美术模块，不接入外部资源或服务
- 验收条件：不改空间适配；示范未结束无伤害；真实光锥与遮挡决定停止；连续跨门路径无穿墙；死亡复位并保留示范消费；暂停冻结；出口区域结束危险
- 验证结果：47 项自动测试通过，覆盖 20 种布局的无修改适配、光照／视线、示范屏障、暂停、跨门碰撞路径、非格心玩家追踪、接触死亡、宽限、出口停止及示范中断后恢复；最后移动修正后 7 项威胁测试复验通过，生产构建通过（现有包体积提示保留）。浏览器以实际主循环的临时第二层入口验证安全挪动、照停、示范到追踪、熄灯接触死亡与同层回床，原计划标识保持一致，无控制台错误；临时入口已移除。完整自然路径试玩、声音与正式美术尚未完成。
- 交付提交：未提交
