# UI 接入说明（2026-10-31）

状态：独立 UI／输入实现，正式 main.js 接入由玩法任务负责。入口 [ui-preview.html](../ui-preview.html)；开发服务器地址 http://127.0.0.1:4190/ui-preview.html 。独立预览的房间用于测试输入，不是正式地图或生成结果。

## 所有权

本任务只改 `src/ui/`、`src/input/`、`ui-preview.html`、`tests/ui/` 与独立文档。共享 `main.js`、`index.html`、`world.js` 和 PCG 由“整理并提交游戏设计文档”任务接入，已收到该任务确认，不在两边并行编辑。

UI 遵循最新要求：喜欢／害怕为任意原文，不做主题白名单，不要求玩家从猫／花、人偶／小丑中选。每栏 1200 UTF-16 code units 是输入负载上限，不是语义类别限制。暂不加入图片上传。

## 实际导出与初始化

```js
import { createGameUI } from './ui/shell.js';

// scene/state/renderer 初始化之后调用。创建 UI 不会自动开始游戏。
const ui = createGameUI({
  surface: canvas,
  adapter: {
    prepareDream, // 可缺省：会显示未连接，保留原文并禁用入梦。
    start(session) {},
    pause() {},
    resume() {},
    restart() {},
    leave() {},
    action(name) {},
    settings(value, mode) {},
  },
});
```

`mount` 默认 document.body；可传专用容器。`storage` 默认 localStorage，异常回退会话设置。`demo` 默认 false：只有独立 UI 预览启用 `previewPlay()`；正式产品不能借预览绕过生成入口。

CSS 由 shell.js 导入，作用域 `.yog-ui`。请移除旧菜单／HUD的显示与事件绑定，不把新旧 UI 同时放到游戏上。暂不依赖旧 index.html 中的任何 ID。原全局 style.css 存在 header、button 等规则，正式接入时建议将旧样式作用域缩到开发工具，或替换为仅 canvas/body 基础样式，避免影响新控件。

## adapter 契约

| 方法 | 调用语义 |
|---|---|
| `prepareDream({like,fear}, {signal,onProgress})` | 异步返回 opaque session；原文原样传递，不上传至任何默认服务。onProgress 接受 understanding / generating / preparing。返回 session 意味着开场区可进入，不表示主题资产全部完成。 |
| `start(session)` | 用户点击入梦时调用，可返回 Promise；成功后 UI 交还后台作业所有权给玩法。这里提交当前局与场景，不能重复收费生成。失败保留 session，可重试进入。 |
| `pause()` | 离开 playing 页面就调用，必须幂等；冻结世界、威胁、剧情、字幕和未来音频。初始标题／设置也会调用，不可因此创建新局。 |
| `resume()` | 用户点击继续时调用，可返回 Promise。与 start 分开，不能重置地图或偏好。 |
| `restart()` | 用户确认后调用，可返回 Promise；复用偏好，重置本局，再停留暂停页等待继续。 |
| `leave()` | 用户确认返回标题时调用；清理玩法持有的会话／后台作业，UI 只保留本页输入草稿。 |
| `action('interact' / 'flashlight')` | 只在 playing 状态发出。玩法仍需检验 canExplore、目标距离、遮挡、起身和转场权限，UI 不直接改变 doors/state。 |
| `settings(value,mode)` | 初始化和设置变化时调用，mode 为 keyboard / touch。对渲染器、VHS 和镜头微动应用实际设置。不要改变 PCG 或玩法难度。 |

### 后台生成交接

已与技术方案任务对齐：出生卧室／开场区准备好即可先进入，其余生成在玩法后台继续。UI 对应文案为“开场已就绪／可以先进入，门后的梦境仍在准备”。

准备过程取消或返回修改：AbortSignal 取消当前准备请求，迟到的进度／返回值不会覆盖新输入。服务端收费任务的取消、复用与幂等由 provider 处理，不能把前端 abort 当作服务端已取消的证明。

`start(session)` 成功后调用 `generation.handoff()`：UI 取消和销毁不再 abort 已交接作业；后续任务清理归 gameplay。离开或新局由 `adapter.leave/restart` 负责。主题区域 ready、入口边界提示、失败恢复由 PCG／玩法实现。

## 每帧接线

```js
const input = ui.sample(dt);
// 仅 active && canExplore(state) 时消费。
yaw += input.yaw;
pitch = THREE.MathUtils.clamp(pitch + input.pitch, -1.35, 1.35);
if (state.player.standing) {
  movePlayer(state.player,
    (-Math.sin(yaw) * input.forward + Math.cos(yaw) * input.right) * 2.4 * dt,
    (-Math.cos(yaw) * input.forward - Math.sin(yaw) * input.right) * 2.4 * dt,
    world.getColliders());
}
ui.update({
  interaction: currentActionLabel, // '' 无目标，'起身'／'开门'／'关门' 等
  subtitle: currentCueText,
  flashlight: state.player.flashlight,
  canMove: canExplore(state), // false 清空输入，转场不会保留摇杆。
  completed: state.completed && !state.flow.transition,
});
```

sample 返回视角增量（弧度），不要再乘 dt。摇杆速度已按 dt 计算；鼠标移动增量按灵敏度一次消费。forward/right 为 [-1,1] 且合成长度不超过 1，保留模拟摇杆慢走；不能再次除以实际长度把慢走变成满速。脚步声跟随实际位置移动；镜头步态用实际移动量／input，而不继续检查 WASD。

必须删除／停用旧的全局键盘、鼠标、pointerlockchange 与焦点暂停监听，避免一次 E 触发两次、锁定回调重新打开旧菜单。新控制器负责清零、失焦暂停、pointer lock 和锁定失败的鼠标拖动回退。

旋转竖屏会暂停并显示横屏提示，转回保持暂停直到点击继续。标题与填写页允许竖屏。触屏控件独立 pointerId，支持双指操作；交互按钮为第三触点，不参与视角区捕获。

## 设置字段

- mode：auto / keyboard / touch。自动模式只在菜单更新，游玩中不突然换控件。
- look：stick / swipe；leftStick：fixed / floating。
- mouseSensitivity、touchSensitivity：0.4–2 独立保存。
- quality：low / medium / high，建议 DPR 上限 1 / 1.5 / 2。
- vhs：0–1；motion：boolean。关闭 motion 关闭镜头微动。
- subtitleSize：16–26；subtitleBackground：0–1；当前无声音版不关闭字幕。

UI 不修改 renderer；adapter.settings 必须应用这些值。UI 预览已应用 DPR、VHS 和镜头微动。设置持久化键为 yog.ui.settings.v1，不持久化偏好原文或游戏进度。

## 构建与验证

- `node --test tests/ui/ui-state.test.js`：自由原文、准备取消／迟到隔离、提前交接不 abort、多触点状态、摇杆死区／速度、存储异常。
- `npm run build`：现有主入口，不自动把 ui-preview.html 打包。正式接入导入 shell.js 后自然加入构建。
- 独立预览构建用 Vite 多入口 API 已验证，产物在 `/tmp/yog-ui-validation`，未修改共享构建配置。
- 浏览器检查：自由填写 → 准备未连接提示 → 返回编辑保留原文；触屏设置、横屏布局、局内起身／手电／暂停、竖屏暂停；不替代手机真机多指或正式两层通关验收。

正式接入后另跑主游戏回归；特别检查追逐关门只消费一次、死亡／假醒输入清零、暂停计时冻结、自然出口与字幕。当前没有生产生成 provider，因此独立预览的“入梦”不会伪造成功；用清楚标注的“预览局内操作”测试 UI。

## G0-2：解释确认补口（兼容旧入参，生产必须确认）

`prepareDream(raw, context)` 的 raw 和进度枚举保持不变；context 新增 `requestConfirmation(interpretation)`。provider 必须等待明确接受，再将绑定的解释 ID／revision／hash 提交后端确认，之后才创建收费任务。UI 并不能阻止不遵守契约的 provider 在调用前收费，后端仍必须守住确认门禁。

```js
async function prepareDream(raw, { signal, onProgress, requestConfirmation }) {
  if (typeof requestConfirmation !== 'function') {
    throw Object.assign(new Error('需要解释确认能力'), { code: 'CONFIRMATION_REQUIRED' });
  }
  const interpretation = await interpret(raw, { signal });
  const { decision } = await requestConfirmation(interpretation);
  // decision 只能是显式 accept；返回修改／取消通过 AbortError 风格拒绝结束本次准备。
  if (decision !== 'accept') throw new Error('未确认');
  await persistConfirmation(interpretation, { signal });
  onProgress('generating');
  return prepareOpeningAndRegisterJobs(interpretation, { signal });
}
```

解释展示的最小字段为 `interpretationId`（非空字符串）、`inputRevision`（非负整数）、`semanticHash`（非空字符串）、`displaySummary.like/fear`（非空字符串）、`ambiguities`（数组）。实体绑定、hash 的真实性和服务端 revision 归属由契约／后端验证，UI 不伪造这些内容。

UI 将玩家原文与 displaySummary 分开展示，所有字段按文本渲染。任何非空 ambiguities 都使“理解正确，继续”不可用，玩家返回修改原文重新解释；本小切片不实现单独的多选澄清问卷。原文提交不等于解释确认。

- 接受：Promise resolve `{decision:'accept'}`。同一 pending 解释的重复请求合并成同一个 Promise，不弹两个页面；本次 run 中再次请求已接受的完全相同解释直接返回原接受决定。
- 不同解释同时请求：拒绝 `CONFIRMATION_IN_PROGRESS`，不覆盖眼前页面。上一份完成后可按顺序请求新解释并再次确认。
- 返回修改／取消／dispose：结束 pending confirmation，reject code `ABORTED`；UI 保留原文，旧页面和旧结果不能恢复。即便 renderer 的 Promise 没有主动结束，控制层也会立刻中止等待。
- 生产 prepareDream 未请求确认，或请求后忘记 await 就返回 session：明确失败 `CONFIRMATION_REQUIRED`，禁用入梦并取消悬空确认。不允许用非空 session 绕过。
- 无确认 renderer：`CONFIRMATION_REQUIRED`；字段缺失：`INVALID_INTERPRETATION`；歧义仍存在却试图 accept：`AMBIGUITY_UNRESOLVED`。
- 开场 ready／handoff 语义维持不变。确认 Promise 不是后端确认记录，provider 仍需登记并校验 revision/hash。

`adapter.start` 现在是正式进入的必需方法，缺失会明确反馈 `START_UNAVAILABLE`，不会进入 playing 或执行 handoff。独立预览仍通过显式 demo 入口及真实预览 start 函数进入，不给正式入口默认成功。

start pending 期间 UI 取消契约：dispose／leave 使 entrySequence 失效并取消仍由 UI 持有的准备 signal；迟到 start resolve 不显示 playing、不 handoff，只调用 adapter.pause。迟到 reject 不恢复旧页面。gameplay 必须以自身 runId／撤销标记回滚部分场景与订阅，不能仅靠 UI pause。UI 不尝试直接销毁 gameplay 世界。

### 明确标记的测试预览

- `/ui-preview.html`：仍无生成 provider，显示真实未连接状态。
- `/ui-preview.html?confirmationDemo=1`：本地固定假解释，工具栏和解释文字都标注测试；用于检查确认、返回修改和开场就绪；不代表 AI 已理解或生成资产。
- `/ui-preview.html?confirmationDemo=ambiguous`：明确标记的歧义夹具，接受按钮禁用。
- `src/ui/confirmation-preview.js` 只被独立 preview.js 引用，正式 shell 不引入测试 provider。

本轮专项命令 `node --test tests/ui/*.test.js` 共 20/20 通过；浏览器确认正常接受、返回原文、歧义不可接受。未跑全量测试，未改共享构建。生产 provider／服务账本／真实生成与正式玩法接入仍由对应任务负责。
