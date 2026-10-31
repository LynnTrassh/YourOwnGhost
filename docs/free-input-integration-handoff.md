# 开放输入程序集成交接 G0／G1

**当前覆盖说明：** 下文是早期契约记录。用户后续明确要求所有已实现剧本统一接线、先进入游戏、后台生成、提前抵达用剧本预设且不阻塞；因此下文“资源未就绪不开放区域”不再执行。当前以 `theme-rules.js` 的完整目录规则、真实场面绑定和观察后外观锁定为准；能力未实现仍保留预设或原目录禁用状态，不将静态 GLB 宣称为动画/声音已完成。

日期：2026-10-31。派单：COORD-1023-G0。状态：契约交付，不是服务实现。依据：[完整方案](free-input-generation-plan.md)、主工程 `docs/ui-integration.md` 及本轮读取的 `src/ui/shell.js`、`src/ui/generation.js`、`tests/ui/ui-state.test.js`。

用户最新要求继续优先：自由输入必须生成与适配；卧室出门即可进入的房间不得直接出现喜爱／恐惧主题，以开场游玩覆盖后台生成时间。本派单与其不冲突。本轮仅新增本文，不修改已有文档、源码、密钥、依赖或运行配置；未调用付费服务、未运行测试、未提交推送。

## 1. 已有与缺口

| 项目 | 状态 | 本轮证据／限制 |
|---|---|---|
| 任意喜欢／恐惧原文 | 现有 | shell 分别保留两栏原文，每栏 maxlength=1200 UTF-16 code units；空白输入被要求补填，无名词白名单 |
| prepareDream 注入 | 现有 | `prepareDream({like,fear},{signal,onProgress})`；进度仅 understanding/generating/preparing |
| 开场进入 | 现有 | 非空 opaque session 令 UI ready；`adapter.start(session)` 成功后 `generation.handoff()` |
| 迟到结果隔离 | 现有 | generation 的局部 sequence＋AbortSignal 过滤旧进度与结果；不是服务端 inputRevision |
| handoff 后取消 | 现有 | 控制器解除旧 controller 引用，UI dispose 不 abort 已移交请求；后台实际资源释放待玩法提供 |
| AI 理解确认 | 待实现 | 当前 summary 显示原文，没有解释展示与确认回调；不能把原文提交当确认解释 |
| 持久 revision／session／manifest | 待实现 | 当前接口把 session 当不透明对象；没有生产语义 schema 或服务端账本证据 |
| 生产 provider、区域门禁与后台恢复 | 待实现 | UI 文档明确未连接；独立 preview 不是生成结果或正常地图 |
| 真实 LLM／Tripo 能力与费用 | 需账号验证 | 端点文档可参考完整方案，账号可用模型、并发、成本和质量尚未实测 |

现有项仅表示代码读取确认，不表示本轮重跑了测试或完成真人试玩。UI start 是可选调用，正式接入必须提供真实 adapter.start，不能让 undefined 也视为成功进入。

## 2. 最小数据契约（新增提案）

不将 revision 加入原始 `{like,fear}`，以保持原文接口；由注入的客户端适配器在私有会话中管理 revision 与后端通信。以下 JSON 仅是项目协议，禁止直接作为 Tripo 原生请求。

```json
{
  "schemaVersion": 1,
  "requestId": "req-17",
  "draftId": "draft-A",
  "inputRevision": 3,
  "raw": {"like": "红色电吉他", "fear": "深海里看不清的东西"},
  "locale": "zh-CN"
}
```

- 每次提交不同原文获得新 revision；同原文失败重试复用原 revision，但可有新的 requestId。显式“重新解释”产生新的解释 attempt，不默认创建资产作业。
- revision 是后端在 draftId 内分配的单调值；客户端局部 sequence 负责当前页面竞态，服务端 revision 负责请求、确认、作业与结果归属，两者不能替代。
- 校验两栏类型、1200 UTF-16 code units 和非空白；保留原文，另存规范化语义，不把 trim／normalize 后内容替换原文。跨语言后端须按 UTF-16 单元计数。
- inputRevision 不等于 runId。重玩同偏好创建新 runId，复用确认语义与资产；死亡／假醒不创建 revision。

解释结果的最小字段：

```json
{
  "interpretationId": "interpret-3-1",
  "inputRevision": 3,
  "semanticHash": "sha256:...",
  "displaySummary": {"like": "红色电吉他", "fear": "深海中不可辨认的巨大存在"},
  "entities": [{"entityId":"e-like","role":"like","subject":"红色电吉他",
    "kind":"physical-object","mustPreserve":["electric-guitar","red"],"excludedTraits":[]}],
  "relations": [],
  "ambiguities": []
}
```

subject 开放；kind、关系类型和执行能力有限枚举。生产结果须包含每个非空角色的实体绑定；上例只展开一个实体展示格式。歧义必须解决；确认记录包含 interpretationId、revision、semanticHash、玩家接受的实体集合与 confirmedAt。模型自报置信度不能生成确认记录，也不能直接生成 verifiedCapabilities。

### opaque session

UI 不读取内部字段；服务／玩法适配器至少需要下列序列化信息：

```json
{
  "schemaVersion": 1,
  "sessionId": "session-A",
  "draftId": "draft-A",
  "inputRevision": 3,
  "confirmationId": "confirm-3",
  "dreamJobId": "dream-job-8",
  "openingManifestId": "manifest-A-1",
  "openingReady": true
}
```

服务端按当前登录／匿名会话授权查询，sessionId 不是公开跨用户查询凭据；供应商密钥、临时下载 URL、完整个人原文不放进游戏 manifest 或 URL。prepareDream 只在确认记录有效、作业已持久登记、开场本机资源与布局可用时 resolve；未具备这些条件不得靠 truthy 对象绕过。

### manifest 与区域清单

最小 manifest：manifestId、manifestVersion、parentVersion、semanticHash、contentVersion、rulesVersion、seed、planHash、openingRoomIds、regions、bindings、assets。每个 region 声明 roomIds、全部入口 boundaryIds、requiredEntityIds、requiredCapabilities、candidatePlacements 与 status；每项 asset 声明 hash、内部资源 ID、真实 bounds、bodyProfileId、verifiedCapabilities、qualityTier 与验证版本。

开场冻结拓扑、输入主题、槽位包络和候选，不冻结未生成资源的虚构能力。区域就绪补充版本用 expectedParentVersion 比较后原子提交；实例身份与已开放区域不变。绑定不符合包络时拒绝该候选，在未开放区重新适配，不能绕过碰撞或当面换模型。

## 3. 确认步骤归属与 UI 最小补口

现有 onProgress 只接受三个字符串，不能用它偷偷携带解释、创建确认弹窗或把 session 提前解释成确认结果。

建议 UI 所有者追加一个可选的异步 context 回调，保留已有入参结构和原进度枚举：

```js
prepareDream(raw, {
  signal,
  onProgress,
  requestConfirmation // 新增，待 UI 所有者接入
});
// requestConfirmation(interpretation) -> Promise<{ decision: 'accept' }>
// 返回修改通过原编辑流程 abort 当前准备；有歧义时不能 accept。
```

职责：provider 获取解释 → 调用 requestConfirmation → UI 展示 summary、必要澄清与“确认／修改” → provider 向后端提交确认 ID／hash → 后端校验 revision 并创建确认记录 → 才允许创建收费资产节点。UI 不生成内容配方，provider 不直接修改 UI DOM。抽象主题需要展示表达方向而不泄露反转。

该回调是提案，尚未与 UI 所有者确认并实现。生产 provider 缺回调或未拿到有效确认时返回 `CONFIRMATION_REQUIRED`，不能默认同意。G0 可用明确标注测试模式的假解释测试，但不能称已理解玩家。协调任务应将此独立补口派给 UI 所有者，本任务不重复派单。

## 4. 开场 ready 与区域 ready

| 屏障 | 必需条件 | 责任 |
|---|---|---|
| 开场 ready | 语义确认、持久作业登记、合法开场／后续槽位、开场资源本机可用 | provider＋规划＋客户端加载；resolve session 后 UI 才启用入梦 |
| start 成功 | 校验 session/revision，原子提交本局与开场世界；不再次收费生成 | gameplay；成功后 shell 调 handoff |
| 主题区域 ready | 所需主题完整绑定、文件与动作能力通过、真实包络复验、客户端解码／GPU 预热、区域提交成功 | 资产 worker＋规划＋gameplay |
| 区域开放 | 所有入口统一读同一 ready 状态；无提前可见／可听表现，无危险把玩家逼向未就绪门 | gameplay／PCG |

卧室距离 0，所有距离 1 的邻房排除主题，最早距离 2；不是数组第二项。检查自带物件与输入主题重合、跨门视线、镜面、影子与声音。任意侧路到未就绪区域均被同一加载边界管理。边界等待如实反馈并允许回开场区，不伪装钥匙谜题。

若“喜欢卧室／害怕门”与固定开场构件重合，严格字面排除可能无解：规划必须报告 `OPENING_THEME_CONFLICT`，提供玩家确认的表达区分（如普通门是中性环境，恐惧的特定门形态延后）或调整开场方案，不能静默宣称绝对未出现。此类输入应列为开放输入测试，不再添加名词白名单。

区域 ready 是本机条件：服务端 ready 后手机仍可能解码失败。失败保留边界；已开放区不替换成预设。第一层需有真实个性化兑现，不能全部推到最后一层来掩盖准备失败。

## 5. 取消、重试与所有权

- prepare pending／ready 未进入：UI 持有 controller；返回修改 abort 本次请求和确认等待，服务端标记 revision 不再可交付，已收费节点进入独立处理。
- start 失败：session 留给 UI 重试；start(session) 必须幂等，不能重新解释或创建作业。部分场景创建要回滚／释放。
- start 成功：gameplay 已接受后台所有权，UI handoff 只解除旧 controller，不取消服务端任务。gameplay 使用自己的订阅和释放句柄。
- start pending 时 UI 被销毁／返回：当前 shell 会使 entrySequence 失效，成功返回后只调用 pause，不执行 handoff。接入者必须验证这一竞态，保证离开标记使迟到 start 回滚，不遗留活动局或无人拥有的订阅；不能仅依赖 UI 已有 sequence。若无法在 gameplay 闭合，需 UI 所有者补显式撤销入口，不在公共源码中暗改。
- 已进入后的 leave：gameplay 解除该局订阅、禁止新提交并释放本地资源；取消远端尽力而为，有确认才算取消。restart 复用已确认内容／缓存并清理旧 runId，不能凭重开重复收费。
- 断网、页面刷新：恢复会话授权后按 dreamJobId 查询原账本；任务恢复不等于恢复游戏进度。死亡／假醒只迁移玩法状态。
- 回调携带 revision、jobId、regionId、manifestVersion、runId；过期资源可入私有缓存，但不能发布到当前局。

## 6. 后端幂等与任务图

项目后端拥有账本；客户端按钮防抖或 AbortSignal 都不是计费去重。作业唯一键至少包含私有会话范围、confirmationId、recipeHash、provider/model 配置和阶段；同键并发以数据库唯一约束＋事务领取执行权。内容缓存键与作业唯一键分开，避免跨用户暴露输入。

持久节点状态：reserved → submitting → queued/running → downloaded → validating → ready；另有 submissionUnknown、failed、rejected、timedOut。阶段包括生成、绑定、动画、下载、后处理；每阶段单独计费记录与依赖，不用“两个主题”冒充“仅两个收费作业”。

提交响应丢失时，项目自己的唯一键只能阻止再次发起，不能证明供应商未创建任务。供应商若支持查询／幂等则核对；不支持则停在 submissionUnknown 等待恢复或人工对账，不能自动重新 POST。是否支持这些能力、模型版本、真实价格均为需账号验证项。

## 7. 三条具体状态轨迹

### A 正常流：喜欢吉他／害怕蛇

1. UI 传原文；provider 请求 draft-A/revision=1 → interpreting。
2. 解释返回 guitar＋snake，UI 经新增回调显示理解；玩家 accept → 服务端确认 confirm-1。
3. 两个主题配方登记 job-1，生成节点开始；PCG 验证卧室及邻房无主题、后续有匹配槽位。
4. 开场加载完成 → session-1 resolve → UI 显示“开场已就绪”；用户点入梦 → start 成功 → handoff。
5. 玩家探索邻房；蛇资源还在 validating，主题区保持 pending。玩家先到边界则真实提示准备中。
6. 模型、动作、感知点与客户端预热通过 → manifest v1→v2 区域提交 → 入口统一开放。

第 1/4 步 UI 调用和 handoff 骨架现有；解释确认、后端、规划边界及区域提交待实现；真实蛇生成／绑定质量需账号和实机验证。

### B 修改后旧结果迟到

1. revision=4 喜欢吉他正在解释；玩家返回修改，旧 signal abort。
2. 原文改为喜欢雨声，提交 revision=5。旧 revision=4 的解释或 job ready 随后到达。
3. UI sequence 拒绝旧消息；后端确认端点也拒绝 revision=4 的迟到确认，不创建新资产任务。
4. 若 revision=4 在此前已确认并提交供应商，则仅继续登记其真实终态／缓存，不绑定 revision=5，不将其费用漏记。revision=5 正常确认自己的表达。

UI 局部隔离现有；持久 revision、服务端守卫、过期产物处置待实现。接受同原文失败重试不重复收费另需独立用例。

### C 供应商提交响应丢失

1. confirm-6 的 recipe-R 先登记节点 node-9（唯一键 K），状态 submitting。
2. 供应商可能接受创建，但 HTTP 超时且无 task ID；节点转 submissionUnknown。
3. 用户点重试或刷新：后端查到 K，返回 node-9 原状态；不新建 node-10，不重新 POST。
4. 若核对得到 task ID，将原 node-9 转 queued/running；若供应商不提供可核对方式，明确等待或人工处理，开场可保留，主题边界不开放。
5. 已完成的无关主题不被重做；该节点失败不被计为成功生成。

完整链待实现；恢复手段与计费状态需账号验证。只用模拟超时测试通过不能证明供应商侧 exactly-once。

## 8. 可顺序派发的小任务

| 顺序 | 范围与唯一责任方 | 交付／验收 | 状态 |
|---|---|---|---|
| G0-1 | 生成／契约程序：建议 `src/personalization/contracts.js` 与独立契约测试 | 1200 UTF-16 校验、开放 subject、角色／关系、revision、session／manifest 校验；未知词可通过，非法能力不可通过 | 待认领 |
| G0-2 | UI 所有者：`src/ui/`、`tests/ui/` | requestConfirmation 补口、解释接受／修正、abort 挂起确认、不把原文提交当解释确认 | 待协调实施 |
| G0-3 | 服务程序：建议 `server/jobs/`、`server/interpretation/`、独立后端测试 | 无付费模拟服务，持久 revision／确认／账本唯一键；三条轨迹可复现，明确 mock 标记 | 待认领 |
| G0-4 | 玩法／PCG 所有者：既有规划与共享入口，需协调单一接入任务 | session 校验、开场距离规则、主题冲突报告、所有入口门禁、区域事务、start/leave 竞态；用本地夹具验证 | 待认领；禁止并行覆盖现有追逐修改 |
| G0-5 | 集成责任方协调 UI 与玩法 | 正常进入、启动失败重试、启动中退出、修正迟到、后台完成、不重复动作；仅定向测试和浏览器局部检查 | 前四项通过后 |
| G1-1 | 服务程序：`server/providers/` 及账号配置 | 用户确认账号／额度后一次真实解释；结构、语义与错误记录，不输出密钥 | 需账号验证，当前未授权调用 |
| G1-2 | 资产程序：建议 `server/assets/`、`src/assets/` | 一次陌生静物生成、下载、校验、缓存及静态 GLB 加载；记录真实费用／等待／质量 | 依 G1-1 与账号验证 |
| G1-3 | 玩法＋资产单一集成任务 | 通用静物槽接入，正常开场后到主题区看见生成物，回访／死亡保留；不改源码换下一个名词 | 依 G0-4/G1-2 |

目录是建议认领范围，不表示已建好或已被其他任务接受。`src/ui/`、`src/input/`、`ui-preview.html`、`tests/ui/` 归 UI；`main.js`、`index.html`、`world.js`、规划／状态归既有玩法接入方。本任务仅本文，不派发重复任务。

G1 静物链证明开放主体与真实生成可连通，不代表音乐、抽象感受、动物动作及手机全类别已完成。后续继续按完整方案的 G2–G5 验收；不能为了首条链将正式入口退回猫花白名单。

## 9. 交付与后续

本轮完成实际接口阅读与契约对齐；特别标出尚缺理解确认、start 期间退出竞态、固定开场与开放主题冲突三个集成点。下一步由协调任务先分配 G0-1 与 UI 的 G0-2，再接后端假服务和玩法边界；账号问题不阻塞 G0。

本文件链接与空白检查通过；没有运行全量或定向测试，没有配置供应商，未修改现有主工程。方案字段仍需程序实施并以具体测试证据升级状态。
