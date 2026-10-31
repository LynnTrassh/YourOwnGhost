# 离魂开局教学 · 策划／程序调用说明

状态：独立 UI 已交付，待策划／程序接入开局。代表 chen 美术方；没有修改公共入口、既有 UI、状态或地图。

## 玩家看到什么

1. **离魂**：「你的身体，还在原处。」解释玩家已经离魂，心中的恐惧化作梦魇，阻挠回到身体；目标是穿过梦境、寻找出口、醒来。
2. **行动**：先起身，再移动、环顾、靠近并看向门后交互。触屏显示左摇杆／右摇杆或右侧滑动／交互按钮；键鼠显示 WASD／鼠标／E。补充手电和暂停。
3. **回魂**：观察门口与房间变化、记住来路、遇到阻碍换方向、避开梦魇，继续寻找出口。

每页可以跳过、翻页或点击步骤回看。末页「开始寻路」仅结束教学，不直接开始或恢复游戏。文案不承诺战斗、收集、地图标记或当前不存在的导航功能。寻路插图是概念示意，不是本局地图。

## 文件与预览

- [模块](../../src/art/opening-tutorial.js)／[隔离样式](../../src/art/opening-tutorial.css)：使用 Shadow DOM 和原生模态 dialog，隔离现有全局样式，阻挡背景点击和焦点。
- [预览入口](../../art-source/opening-tutorial-v01/index.html)：开发服务启动后打开 `http://127.0.0.1:4190/art-source/opening-tutorial-v01/index.html`。背景是实际游戏 iframe，教学在外层独立展示，不代表正式入口已接入。
- 图示为内联 SVG，无新增代码依赖或网络生成。字体为本地 WOFF2，不依赖第三方 CDN。默认无动画，可显式打开轻微离魂漂浮，并遵循系统减少动态效果设置。

## 摄像机字符风格（用户封面参考）

按用户提供的封面上方 PLAY／时间码调整为冷白点阵字符，移除原宋体与金色按钮。中英文标题、正文、按钮均使用中文点阵字；标题及摄像机字符有轻微静态红青错位，整个卡片覆盖低强度扫描线。正文没有抖动、闪烁或重影动画。顶部 `00:00:01–03` 是教学页码的录像式装饰，不是游戏计时器，不随时间跳动。

字体使用 [Fusion Pixel 官方 2026.10.25 发行版](https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.10.25) 的 12px monospaced zh_hans，原始字体未修改；[字体及许可证目录](../../public/art/ui/opening-tutorial-font/) 保存原 OFL 与上游许可。字体 684,752 字节（约 669 KiB），用于这套教学及其后续中文文案；未加载其他语言的重复字体。

模块通过 FontFace 注册独立字体族 YOG Camera OSD，只在教学 CSS 中引用；多实例引用计数，最后一个实例 dispose 时移除注册。加载失败时回退系统等宽／中文字体。若部署 CSP 限制字体，请允许本站 font-src。36／24px 标题使用 12px 字形的整数倍，正文保留较大字号以方便阅读。

## 调用接口

```js
import { createOpeningTutorial } from './art/opening-tutorial.js';

const tutorial = createOpeningTutorial(); // 创建后不自动显示

// 先由调用方暂停世界、停用并清空输入、释放鼠标锁定。
const { reason } = await tutorial.show({
  mode: 'keyboard', // 默认键鼠；只有 UI 实际处于触屏模式时传 'touch'
  look: 'stick', // 'stick' 或 'swipe'，与 UI 设置一致
  motion: false,
});
// reason: completed / skipped / dismissed / disposed
// completed、skipped：由调用方确认仍是同一局且可恢复，再进入探索。
// dismissed、disposed：取消／销毁，不自动恢复游戏。

tutorial.hide();    // 程序中断：pending show 返回 dismissed
tutorial.dispose(); // 页面离开／销毁：pending show 返回 disposed；释放 DOM 和事件
```

`createOpeningTutorial` 可传 `mount`（默认 document.body）、`mode`、`look`、`motion`。`show` 每次从第 1 页开始；已打开时重复调用返回同一个 Promise，不叠加弹窗，不更新当前操作说明。销毁后调用 show 直接返回 disposed。`isOpen` 为只读状态。无本地存储或自动「已读」记录。

## 当前操作核对

用户明确以 WASD 为主，模块与预览默认键鼠；触屏说明仅供调用方明确选择触屏模式。已对照 [browser-controls.js](../../src/input/browser-controls.js)、[control-state.js](../../src/input/control-state.js)、[main.js](../../src/main.js) 和 [door-interaction.js](../../src/door-interaction.js)：

| 操作 | 实际行为 |
| --- | --- |
| E 起身 | 出生时先从床上起身，站立后才能移动 |
| W / S / A / D | 前进／后退／左移／右移；没有把方向箭头键作为移动键 |
| 鼠标 | 锁定后移动鼠标环顾；未锁定时按住左键拖动 |
| E 交互 | 靠近并看向目标，按屏幕提示开门／关门、操作机关或离开出口 |
| F | 切换手电开关 |
| Esc | 暂停；鼠标解锁、失焦也沿用现有暂停流程 |

未加入代码没有实现的跳跃、冲刺、攻击。教学文案不会把「靠近门」写成自动开门。门交互还受目标距离和遮挡判断约束，实际提示由玩法负责。

## 正式接入交接

推荐在出生场景准备好、玩家首次起身之前展示一次。首次策略建议由策划选择「每次新局一次」或「首次游玩一次」；死亡、转场和暂停恢复不反复弹出，暂停菜单可再次查看。

现有入口 `src/ui/shell.js` 的 resume/start 路径最终执行 `show('playing')`、`controls.lock()`。程序方应在进入 playing 和鼠标锁定**之前**插入教学阶段，在该阶段保持控制器 disabled，并通过 adapter 暂停模拟。仅调用 `ui.clearInput()` 不会停用控制器，也不会冻结梦魇；原生 dialog 也不会停止计时器、动画循环或 capture 阶段键盘监听。

开始后要清空残留按键／摇杆，并继续沿用 entrySequence／局 ID 检查，防止等待期间返回标题、重开或销毁后迟到恢复。若教学期间失焦、设备转为不允许游玩的竖屏，不得自动恢复；交回原暂停／横屏流程。再次获取鼠标锁定失败时保留现有拖动环顾回退。不要直接拿 `reason === 'skipped'` 当作无条件恢复许可。

默认挂在 document.body；不要挂在一个即将 hidden、inert 或删除的旧页面容器里。调用方负责销毁时 hide/dispose，模态关闭后浏览器恢复原焦点。该模块只发出展示结果，不读写 doors、state、PCG、碰撞或剧情。

## 验证记录

- JS 语法检查、主项目 `npm run build` 通过；主构建保留既有大包警告。
- Vite 独立预览构建通过，证明未接入主入口的模块和 inline CSS 可以打包。产物放在 `/tmp/yog-opening-tutorial-build`，未改共享构建配置。
- 浏览器实际观察三页、完成返回 completed、Esc 返回 skipped、重复打开及键鼠／双摇杆／右侧滑动文案；横屏小视口保留底部操作，正文滚动。
- 未改玩法／碰撞／生成，未执行全量 npm test。尚未完成正式开局暂停接线、手机真机多指及真人试玩验收。
- 随「新增 VHS 风格开局教学与键鼠操作指引」提交；推送由用户自行执行。
