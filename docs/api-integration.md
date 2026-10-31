# API 接入状态（2026-10-31）

本轮完成本地 API 基础接线，**没有完成生产 provider 或可玩生成世界验收**。无在线模型调用、无收费生成、未配置／打印密钥。供应商、凭证方式和费用上限已询问用户，尚待确认。

## 已实现

- main.js 只增加 createDreamApi import 和 prepareDream 注入；已交回协调任务继续玩法。index.html、src/art/、public/art/ 未由本任务修改。
- 同源 `/api` 客户端：保留原文，调用解释→UI 显式确认→后端确认→生成入口；超时、取消、迟到解释隔离和错误反馈。不接受未经验证的 session。
- 本地 Node HTTP 服务：仅监听 127.0.0.1:4192，JSON 大小限制、来源限制、HttpOnly/SameSite 私有会话 cookie、不缓存响应、不回显内部异常。
- SQLite 账本：当前 revision、原文、语义摘要/hash、确认 ID、作业唯一键与状态持久化。旧 revision 不能确认或发布；同解释复用、同作业不重复登记；进程重启将 submitting 标记 submissionUnknown，禁止自动重新提交。
- 开放主题契约：未知名词不按猫／花白名单映射；主题角色完整、关系合法，拒绝模型自报 verifiedCapabilities。
- 正常启动无任何模型／资产 provider。解释端点真实返回 PROVIDER_UNAVAILABLE；fixture 只通过自动测试显式依赖注入，生产启动不导入测试。
- 世界能力验证尚缺，因此账本拒绝 ready，客户端拒绝将任何生成响应直接当成可玩 session；现有 playtest 与旧调试入口语义不变。

## 本地运行

需要 Node 24（本机验证 24.21.0，使用内置 node:sqlite）。实际代码仓库内分别执行 `npm run api`、`npm run dev`。Vite 配置将 `/api` 代理到 4192。已在新增配置之前启动的 Vite 进程可能需要其所有者重启；本轮没有停止他人的 4190 服务。

独立浏览器检查使用 4193：`npm run dev -- --port 4193`，API 使用 `DREAM_DEV_ORIGIN=http://127.0.0.1:4193 npm run api`。该变量仅指定额外本地开发来源，不是供应商配置。构建产物本身不包含后端；将来部署仍须同源代理、HTTPS、安全 cookie、访问控制和成本限制，不能直接作为公共服务发布。

账本存放 `.local/dream-api/ledger.sqlite`，已加入 .gitignore。目录权限 0700；原文属于本地私有数据，未写浏览器持久存储或 Git。现阶段单服务实例使用；不要对同一个账本启动多个 worker。

## 实际证据

- 最终 API + UI 专项合计 27/27 通过，其中 API 7/7：契约、过期解释、确认篡改／歧义、持久去重、崩溃未知提交、跨会话查询拒绝、取消、ready 屏障、HTTP 无供应商、测试解释确认和重试复用。
- 本轮初次 `npm run build` 通过，保留既有大包体积警告。
- 浏览器 4193：输入“透明的风铃水母”／“会重复我动作的影子”→实际后端返回“梦境生成服务尚未配置，你的描述已保留。”→入梦禁用→返回修改保留原文。4190 旧进程未载入代理时也正确处理非 JSON 响应，无假成功。
- 全量 npm test 已运行，但与协调任务的进行中玩法改动重叠，出现地图／内容测试失败后停止。不能将其记为通过或归因于 API；最终整合全量由协调任务统一执行。
- 远端 fetch 成功，origin/main 从 d82c5b0 前进到 6f2b815；未合并、提交或推送。

## 未完成与继续入口

1. 用户确认供应商、密钥复用／新建和费用上限后，才能接真实理解 provider。当前 interpret 注入点只是协议接口；测试中模拟返回不算在线证据。
2. 解释请求的跨进程崩溃去重、费用预留／实际费用对账、供应商取消与恢复均未实现。当前解释 in-flight 去重仅同进程；**不得把它直接接收费 provider 后宣称 exactly-once**。初次请求尚未返回 revision/cookie 时取消，也尚不能取消服务端解释。
3. 资产作业尚无 worker、供应商适配、GLB 下载／校验／缓存、动画与危险能力验证。账本 reserve 是独立模块接口，HTTP dream-jobs 故意返回 GENERATION_UNAVAILABLE，不创建假作业。
4. PCG 须先生成空间、识别相邻／远距离／连续房组机会、适配事件、全量校验，再安装世界；本轮没有改规划或绕过规则。固定卧室及邻房主题排除、开场冲突、主题区域边界、资源清理和原子 world commit 仍待实现。
5. 正式 main adapter.start 仍保留测试入口限制。没有生产 session，故未接真实安装／重玩／后台所有权；不能声称加载或世界安装成功。
6. 真人通关、手机资源与性能、真实供应商耗时／费用／质量都没有验证。

本轮不是开放输入整体完成；以上阻塞和缺口需要下一步真实供应商及玩法适配继续闭合。

## 用户追加：允许服务失败后进入预设

用户明确要求错误页把“重新尝试”改为“直接进入”。已实现：错误页提示“生成暂不可用，可进入预设梦境。”，隐藏禁用的入梦按钮；点击取消旧生成，使用显式 presetFallback 会话交给 main.js，复用通用两层预设并保留草稿原文。此为用户选择的降级体验，不代表 API 成功、主题匹配或生成世界安装。本节更新前文“错误时禁止进入”的产品行为；未验证生成结果仍然不允许进入生成路径。

浏览器已验证直接进入和 E 起身／开场字幕；UI 专项 20/20、构建通过，未做完整通关。

## 后续：Tripo 静态模型切片

已新增真实Tripo认证/余额/任务查询、图生模型provider、持久模型作业、审批与预算限制、私有GLB交付及独立静态加载。最终专项42/42与两个构建通过。未调用新的收费生成，整局理解与世界安装仍未接；详细证据与限制见 [Tripo API 接入](tripo-api-integration.md)。旧版“没有任何资产provider”的描述仅适用于此前阶段。

### VibeToken semantic provider (2026-10-31)

Server-only credentials are read from `VIBETOKEN_API_KEY` or the ignored private `.local/dream-api/vibetoken.env` (0600). The interpreter calls the official `/v1/chat/completions` endpoint with `deepseek/deepseek-v4.1-flash`, a 1600-token output cap, 25-second timeout, disabled thinking, JSON output and no automatic retry. The existing semantic validator remains mandatory; invalid or incomplete results fail closed. Raw themes are passed as JSON data, and the existing ledger reuses successful interpretations for unchanged current input.

Live credential/model discovery returned HTTP 200. Two synthetic semantic calls used reported token totals 333 and 372; the first failed structural validation, the second preserved blue glass bird / no feathers and the abstract fear of being forgotten. These token counts are not a verified currency charge. Full personalized generation/world installation remains unavailable; Tripo billing is separate. Provider credentials never enter browser code or logs.
