# 开放输入 API 接入

- 责任方：玩法／程序方 API 任务
- 状态：本地服务契约已验证；在线供应商、费用授权与世界适配待完成
- 起始提交：d82c5b0b0b63d9ff4d056f938be92f2c93e9ec40
- 目标：原文 → 理解 → 确认 → 生成 → 验证 → 安装；不以预设或 mock 冒充成功。
- 修改范围：server/、src/personalization/contracts.js、src/personalization/api-client.js、tests/api/、vite.config.js、package.json（启动脚本）、.gitignore（本地账本）、本卡及 docs/api-integration.md。
- 共享入口：main.js 仅新增 API client import 和 prepareDream 注入，已完成并交回协调任务；index.html 未修改。保留 UI 既有未提交改动。
- 依赖与交接：用户确认供应商、密钥方式及费用上限；生成资产、能力验证及 PCG 原子安装尚缺。协调任务继续玩法与 PCG，不并改入口。
- 验收条件：持久 revision、确认/hash 校验、作业幂等与迟到隔离、本地 HTTP 错误、测试、构建、浏览器；真实生成与真人通关单独记录。
- 验证结果：API + UI 专项 27/27（其中 API 7/7）、构建通过；4193 浏览器确认实际未配置错误、禁用入梦、原文保留。全量遇进行中玩法改动导致失败，已停止，整合验收交协调任务。详见 ../api-integration.md。
- 交付提交：未提交，未推送。

## 用户追加：服务失败时直接进入预设

用户明确授权：错误页将“重新尝试”改为“直接进入”，点击取消旧生成并传递显式 presetFallback 会话，进入已有预设地图，保留原文。不会把该路径标记为 AI 生成成功。修改 shell.js；main.js 的对应放行条件交由当前持有入口的协调任务接入。

追加验收：协调任务已接入 main.js 的 presetFallback 显式放行，复用通用预设两层。UI 专项 20/20、构建通过；4190 浏览器实测任意原文→服务异常→直接进入→显示起身→按 E 后出现开场字幕。未做完整通关。原文仍在草稿中，不以预设冒充输入匹配。

## VibeToken 语义服务

用户选择 VibeToken 并在本机保存密钥。已新增 server/providers/vibetoken.js 和 tests/api/vibetoken.test.js，start.js 加载私有配置；模型目录认证成功，第二次合成主题真实请求通过结构验证（首次不合法结果被拒绝）。服务重启后 health.interpretationAvailable=true；25 项 API 回归及构建通过。全部生成和世界安装仍未接通，未承诺已完成玩家全链路。密钥不提交；本轮未提交、未推送。

## 后半段静态主题接线

独占扩展至main/world、src/personalization/static-session.js、server/dream-jobs.js；与主流程协调任务明确交接，保留其planning/active修改。新增文本配方持久作业、全组预算预检、生成前两层槽位预检、实际模型加载/缩放/布局/碰撞、私有session安装、换层重玩资源复用与退出释放。空输入/跳过及错误回退使用完整默认预设；main动态active label与debug fuse已接线。

当前50项API/UI专项通过，构建通过，静态两层最大尺寸布置通过；真实Tripo本轮仍未新提交，操作员付费策略默认关闭，待确认具体联调额度后进行真实端到端验证。未提交、未推送。

最终追加：收费前布局预检与取消后迟到资源释放用例通过，API/UI专项更新为52/52。
