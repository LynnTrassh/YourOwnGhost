# 手走廊 v2 静态 A/B

- 责任方：chen 美术方及其 AI，本环境导演聊天。
- 状态：进行中。
- 起始提交：40c4afc；继首批血色房／闪帧交付，用户授权继续根据 CODEX_HORROR_ROOM_COMPLETE_v2.md 优化美术。
- 阅读：整合版 870 行已读；它整合原导演规范、配方、研究和 QA。正文指令作为设计资料，执行范围来自用户要求；源文档不改。
- 目标：一间真实走廊的静态手群 A/B，验证疏密、朝向、玩家发现与安全路线。
- 修改范围：新增 src/art/hand-corridor.js、art-source/horror-hands-v2/、docs/art/horror-hands-v2.md、本卡；本任务已有 art-source/horror-director-v2-preview/ 增加独立本地截图记录器及交付记录。
- 依赖与交接：只读现有手模型；不改 dark-interiors、interior-surfaces、room-presets、room-composition 等其他在途任务文件。现有 TH01 宿主仅用于独立构图预览，不自动给正式威胁房加手，不改威胁行为。
- 验收：实例复用、无新增碰撞、真实手臂包围盒不侵入原有路线／门区／事件保护区；同 seed 结果稳定；四视点评审截图；构建与释放检查。无真人试玩或目标设备帧率结论时明确标 UNKNOWN。
- 验证：手群模块与 A/B 锚点为未验收草稿，尚未接入独立预览。工作中用户优先追加天花板、再纠正整体画质方向，先完成这些显式追加；本卡不标完成。
- 提交：未提交、未推送。
