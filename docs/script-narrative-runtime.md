# 剧本与旁白运行规范

版本：v0.1；日期：2026-10-30。依据 [GDD](game-design-v0.2.md) 第 5–10 节与 [剧本总集](script-catalog.md)。本文规定实现接口，具体台词只在总集维护，音频清单通过 lineId 引用，避免复制多份台词。

## 1. 定义、实例与事件

ScriptDefinition 是内容版本中的静态定义；ScriptInstance 是本局某次装配的运行数据。同一剧本出现在不同位置时必须有不同 instanceId。B26 与主流程共用同一演出实例与消费键；B13–B16 属于同一个追逐实例的连续阶段。

| 定义字段 | 含义 |
|---|---|
| definitionId、version、themes | 稳定编号、版本与主题标签 |
| materials、capabilities | 可接受素材语义与模型／声音／动画能力 |
| composition、spatialRequirements | C01–C05 及门、窗、视听、回程要求 |
| initialPhase、phases、transitions | 阶段、事件条件与受限效果 |
| observationTargets | 目标组、采样点、遮挡规则、连续曝光门槛 |
| narrationCues | 台词 ID、阶段、条件、播放类别、失效条件、互斥组 |
| resetPolicy、crossLayerReads | 死亡与离房策略、允许读取的前层事实 |
| dependencies、exclusions | 前置内容与互斥对象组 |

实例保存 definitionId/version、instanceId、layerId、roomBindings、objectBindings、phase、phaseRevision、observations、committedEffects、branchChoices。所有效果使用白名单命令，例如 SetPhase、SetObjectVariant、RequestWorldChange、EmitFact、RequestCue；配置不可注入 JavaScript。

事件结构：

```js
{
  eventId, runId, seq, gameTime, layerId,
  type, actorId, instanceId, targetId,
  cause, payload
}
```

seq 在单局单调递增。eventId 用于去重，cause 区分 normalTraversal、deathReturn、storyWake、debug。调试注入事实必须标记 debug，不用于正常局的验收或跨层记忆。

关键事件包括 RoomEntered、RoomExitedNormal、ObservationConfirmed、LookAwayConfirmed、LookBackConfirmed、PlayerStopped、PreferenceCorrectionConfirmed、RouteChosen、CueStarted、CueCompleted、SuggestionPresented、DeathCommitted、LayerCommitted。事件只表达已发生事实；请求如 RequestCue 不当作 CueStarted。

## 2. 单步提交接口

计划接口均为普通函数，名称用于约定职责：

```js
perceive(worldSnapshot, view, dt) -> observationEvents
appendFacts(events, factStore) -> acceptedFacts
stepScripts(definitions, instances, acceptedFacts, dt) -> effectBatch
validateEffects(effectBatch, worldSnapshot) -> result
commitEffects(effectBatch, state) -> committedEvents
selectCue(candidates, state, audioWindows) -> decision
```

同一阶段变化只有一个拥有者。批次提交检查预期 phaseRevision；重复事件不能再次触发死亡、变形或声音。先提交世界事实，再产生依赖该事实的评论。空间变更使用框架规定的事务接口，不直接 SetPhase 后异步赌地图能够更新。

## 3. 观察与行为判定

观察与交互分别配置。目标在视锥中、遮挡检测通过并达到有效尺寸／可见采样比例后才累计连续曝光；离开条件立即重置未完成曝光，已确认观察保留。猫群使用分布采样点与群体可见数量，不能一只猫的一点像素代表看清整屋。

以下是首次实现的可调配置，不是体验已经验收的数值：

| 参数 | 初始值／规则 |
|---|---|
| observationDuration | 0.8 秒连续有效观察 |
| lookAwayDuration | 连续 0.4 秒不满足目标观察条件 |
| lookBackDuration | 转开后再次连续 0.8 秒有效观察 |
| quickLeaveWindow | 主句完成后 3 秒以内正常离开 |
| lingerDelay | 主句完成后继续在目标区域停留 5 秒 |
| suggestionPresented | 对应语音完整结束，或启用字幕且完整显示 authoredDuration |

转开与回看必须针对同一稳定 targetId，且对象当前仍满足对应评论的状态。参数使用统一配置表；调优时同步记录规则版本。普通鼠标微抖不形成回看；未观察就离开不形成“这么快就走”。3–5 秒之间可以不播放任何分支，不用强行填满空白。

建议开始播放只消费台词，不产生 SuggestionPresented。音频和字幕均关闭、句子被打断或显示窗口未完成时，不回应“你不听建议”。路线建议必须绑定 suggestionId、可见门 ID、有效分叉区、有效期；在建议有效呈现后离开对应合法分支，才产生 RouteChosen。

绕开威胁要求看见／有效进入已定义遭遇观察区，再沿标记的无追逐旁路离开；从未遇见不能算绕开。拒绝空座要求拉椅完成、邀请场面已成立、玩家未坐下且正常离开。偏好修正要求新的确认版本确实改变了已确认解释，重复点击确认不计数。

## 4. CAT01 状态与演出示例

| 当前阶段 | 事件及守卫 | 提交结果 | 旁白请求 |
|---|---|---|---|
| aliveUnobserved | 群体有效观察确认 | aliveObserved；记录目击事实 | 初见句，偏好必须匹配猫 |
| aliveUnobserved | 正常离开／死亡 | 保持初始阶段 | 无 |
| aliveObserved | 正常离开 | dead；切换姿态并停止猫声 | 若初见句完成且在快速窗口内，尝试离开评论 |
| aliveObserved | 死亡 | 保留观察和活体阶段 | 不把死亡当离开；不重播已消费句 |
| dead | 回访后观察死亡群体 | 记录死亡目击 | 假惋惜句 |
| dead | 回访句完成后继续停留 5 秒 | 消费该次停留分支 | “刚才还好好的呢。”对应 lineId |

离开评论是过门后独立的一次判定，不是恢复旧房间等待队列。快速离开与同一阶段的停留分支共享分支组；不同阶段的分支互不误锁。重进不恢复猫，假醒不自动继承猫实例。

## 5. 旁白请求与消费

```js
CueRequest = {
  cueId, lineId, category, runId, instanceId, phaseRevision,
  requiredFacts, context, expiresWhen, exclusionGroup,
  consumptionScope, authoredDuration, interruptionPolicy
};
```

category 区分 mainFlow、scene、routeSuggestion、behaviorComment；威胁示范另带 safetyDemo 标签，与 B13 共用遭遇互斥组。消费键默认是 runId＋instanceId＋phase＋lineId，主流程使用全局 scope，B26 复用该 scope。

生命周期为 eligible → selected → started → completed／interrupted；无效请求进入 expired，资源失败可转字幕呈现。开始任何有效呈现即原子写入 consumed，防止重复点击或回调播放两遍。仅选中但尚未开始不消费；字幕与语音属于同一句，不能各算一次。全部输出关闭时记录 suppressed 并关闭本次窗口，不扣行为评论预算、不产生有效接收事实。

行为评论开始呈现时原子增加 behaviorCount，并锁定该 behaviorKind；本局上限两次。被更高优先级拒绝或尚未开始就过期，不扣预算。全局消费和行为预算跨梦层保留，新局清空。

## 6. 优先级与并发

优先顺序为流程转场／死亡取消 → 危险征兆与关键声音窗口 → 主流程 → 当前场面／示范 → 路线建议 → 行为评论。优先级只决定是否开始；不要随意打断一个仍有效的句子。危险开始、上下文失效、死亡、切层可以立即打断并保留消费记录。

同级请求按配置 priority、触发 seq、cueId 排序，保证确定性。同一步多种行为成立时，顺序为路线偏离、拒绝空座、绕开威胁、回头确认、偏好修正；只选择当前上下文有效的一条，其余不作为“以后必播”的队列。偏好修正通常发生在输入流程，其有效呈现窗口不会延伸到梦中场面。

有效场面请求可以暂存在本阶段的候选集合，等关键声音结束后重查条件；一旦离房、阶段改变或超出显式窗口即删除，不跨场景积压。离开评论要求调度器当场空闲且无危险，失败直接作废。

B02 起奏前句、TI01 坠落前句使用 authored timeline 组织。允许玩家随时离开；语音关闭或失败时使用独立时轴继续演出。关键声音不能因旁白静音而被关闭。

## 7. 音频、字幕与暂停

VoiceManifest 保存 lineId、文本引用、audioAssetId、authoredDuration、字幕时间片、语气、版本和语言。固定台词用于首批运行，语义模型不得修改事实守卫、消费键和次数上限。

Web Audio 的一次性播放节点通过保存 buffer 与 offset 重建，实现暂停后从游标续播；同时冻结字幕时轴。所有结束回调携带 playbackToken，停止或重建节点后的旧 onended 不得误报完成。播放失败可用字幕完成表达；二者都不可用时，演出依 authoredDuration 结束，SuggestionPresented 不成立。

死亡取消当前语音；普通暂停只冻结。关闭旁白音量不停止关键声，也不锁住演出。字幕可以单独开关。B24 墙内声音属于世界音源，与非空间旁白分别标识，避免触发“旁白不能被怪物听见”规则时误删真正世界声音。

## 8. 诊断与验收

预览建立独立 runId，可指定剧本、阶段、语音设置与事实组合。显示每次调度决定：accepted、factMissing、phaseMismatch、contextExpired、criticalAudioBusy、alreadyConsumed、budgetReached、branchLocked、outputSuppressed。提供事件列表与播放游标，不以屏幕出现模型作为演出通过证据。

必须覆盖：

- 重复事件只提交一次；未看见不变化；正常离开与死亡区别正确。
- 同帧两个评论只消费一个；评论预算跨层累计；新局重新可用。
- 暂停时观察、动画、字幕和语音均冻结；恢复不从句首开始。
- 旧音频回调、旧模型加载和重开前计时不影响新局。
- 没有有效接收建议不触发偏离评论；鼠标微抖不触发回看。
- 离开时过期候选不补播；关闭语音与字幕仍可完成示范、剧情和通关。
- TI04 三步、RI03 祝福、TI01 碎裂、B14 撞门与 B16 脚步窗口不被盖住。
- 每条台词分别检查文本、资源映射、条件、实际声音表演；自动测试不能替代听感验收。
