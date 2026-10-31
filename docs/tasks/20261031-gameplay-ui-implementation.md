# UI 与跨设备输入实现

- 责任方：玩法／程序方 UI 独立模块
- 状态：待接入（独立模块已完成，正式入口由玩法任务接入）
- 起始提交：bf4df8268293bb5a47a0bdb25690879e68194247
- 目标：实现批准的视觉、任意自由描述向导、异步生成状态、设置及手机双摇杆。
- 独占修改范围：src/ui/、src/input/、ui-preview.html、tests/ui/、本卡及 docs/ui-integration.md。
- 共享入口：main.js、world.js、index.html、style.css、planning/ 均不修改，等待明确交接。当前玩法任务正在修改这些路径。
- 自由输入：保留原文，无主题白名单；prepareDream 由生成服务提供，不模拟成功、不映射预设冒充生成。
- 验收：独立预览可操作；设置保存、取消与旧请求隔离、多触点、暂停清零有检查；构建、现有回归、浏览器视觉检查分别记录。
- 协作：首次跨任务消息被自动审批拒绝；用户随后明确授权，协调已成功。玩法任务确认独占 main.js/index.html/world.js 接入；生成技术任务确认开场先行、后台生成与 session 所有权接口。
- 交付提交：未提交，未推送。

## 验证与交付

- UI／输入单元检查 9/9 通过：模拟摇杆死区／慢走、多触点独立、清零、鼠标增量消费、设置损坏／禁写、自由原文、取消／迟到隔离、后台任务交接。
- 主入口 npm run build 已通过；含主入口与 UI 的多入口构建通过；最后独立 UI 构建通过（/tmp/yog-ui-validation）。已有体积警告，未为此改共享打包配置。
- 浏览器检查通过：1280×800 桌面、844×390 横屏、390×844 竖屏；自由填写与返回保留原文、未连接生成的真实失败态、触屏设置、起身、手电、暂停、旋转暂停与手动恢复、弃局确认。检查时无 console error。
- 修正了预览工具栏遮挡小横屏底部按钮、短横屏字幕与交互提示重叠、提前交接后误取消后台任务、迟到进度回调覆盖 ready 等问题。
- 曾启动全量 npm test，因长时间运行且其他玩法任务同时改代码，主动停止本任务的该进程；全量结果不完整，不能报告全部通过。正式入口接入后由玩法任务做统一回归。本轮最后的独立 UI 9/9 检查完整通过。
- 未使用真实手机多指验收，没有调用外部生成服务，没有修改 main.js/index.html/world.js，不声称正式游戏 UI 已替换。
- 接入说明：../ui-integration.md；可操作预览：http://127.0.0.1:4190/ui-preview.html 。Vite 在其他任务修改共享文件时可能热重载预览，刷新草稿不会持久化。

## COORD-G0-2 完成与同步屏障

- 当前小切片完成：新增异步 requestConfirmation，显示原文与实际解释，明确接受／返回修改；未解决歧义不能接受；取消、销毁、迟到、重复和缺能力均有明确处理。
- 缺 adapter.start 现在失败并反馈，不误判成功。start pending 取消契约已写入接入说明，gameplay rollback 仍归玩法方。
- 本轮修改：src/ui/generation.js、src/ui/shell.js、src/ui/preview.js、tests/ui/ui-state.test.js；新增 src/ui/start-session.js、src/ui/confirmation-preview.js、tests/ui/confirmation.test.js；更新本卡与 docs/ui-integration.md。
- 专项测试 20/20；JS 语法与 git diff --check 通过。浏览器验证测试假解释明确标记、原文／解释分开展示、返回修改保留原文、明确接受后开场 ready、歧义时禁用接受。
- 不调用实际服务、不伪装 AI 已理解；未运行全量检查、未修改共享构建。
- 用户要求本切片完成后暂停并由协调任务统一提交／拉新／推送：交接后停止本任务写入，不自行 Git 提交、拉取、rebase 或推送。
- 本任务没有持续运行的开发服务器或测试后台进程；之前由本任务启动的全量测试已停止，4190 是既有共享服务，本任务不停止它。

### 前后两轮全部未提交文件归属（均属于本 UI 任务）

- ui-preview.html
- src/input/control-state.js
- src/input/browser-controls.js
- src/ui/settings.js
- src/ui/generation.js
- src/ui/shell.js
- src/ui/shell.css
- src/ui/preview.js
- src/ui/start-session.js
- src/ui/confirmation-preview.js
- tests/ui/ui-state.test.js
- tests/ui/confirmation.test.js
- docs/ui-and-input-design.md
- docs/ui-integration.md
- docs/tasks/20261031-gameplay-ui-input-design.md
- docs/tasks/20261031-gameplay-ui-implementation.md

其他已修改／新增源码及任务卡不属于本任务，不纳入 UI 归属。生成的两张概念图仍在 Codex 图片目录，仅用于讨论，没有生产资源引用，不在本次 Git 同步清单。

## 用户追加：文案精简

- 用户明确恢复本轮小改动：界面信息过多，移除无必要文字。
- 修改范围：src/ui/shell.js、shell.css、preview.js、ui-preview.html、本记录。
- 输入页仅保留问题、输入框和导航；标签保留屏幕阅读器语义，字数仅接近上限时显示。
- 删除首页和暂停页重复副标题／英文眉题；无音效与刷新说明移到操作说明。
- 解释页默认显示实际解释，原文通过“查看原文”展开；生成页原描述折叠，不常驻三阶段说明。取消／确认／真实失败反馈继续保留。
- 预览工具栏收成“预览”折叠入口；假解释预览仍明确标记“测试解释 · 非 AI”。
- JS语法和差异检查通过；既有20项UI专项检查通过；浏览器已检查正常首页和精简输入页。未改玩法、输入算法、生成服务或Git配置。
- 本轮结束后再次停止写入，Git同步继续由协调任务统一负责。

### 随机填写补充

用户要求为不想输入的玩家提供随机按钮。喜欢／害怕页分别加入随机填写，连续点击不会重复当前描述，结果仍可自由编辑，沿用正常解释确认与生成流程。随机内容是本地灵感文案，不代表已生成资产，不改变自由输入支持范围。
