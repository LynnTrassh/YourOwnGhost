# 通用电脑屏幕播放器 V01

日期：2026-10-31。状态：独立工位预览与普通电脑加载器已接入；本轮已获提交授权；未推送。

## 默认序列

| 画面 | 时长 |
| --- | --- |
| UE 标志 + UNREAL ENGINE 5 | 2.5 s |
| 雪花噪点 | 0.7 s |
| Unity 标志 | 2.5 s |
| 撕裂花屏 | 0.9 s |
| OpenAI Blossom + GPT | 2.5 s |
| 黑屏 | 1.2 s |

一轮 10.3 s。用户最后明确标志 2.5 s、雪花 0.7 s；早期截图报告中的 2 s 为调节过程。使用黑底、灰绿色显示、扫描线与弱噪点，雪花不使用全屏亮白闪烁。

## 通用适配

- [crt-screen-playback.js](../../src/art/crt-screen-playback.js)：创建时间线、动态纹理和屏幕材质适配。
- [interior-models.js](../../src/art/interior-models.js)：加载 `prop-crt-computer-v01` 或 `prop-computer-desk-v01` 自动绑定。普通房间的单台电脑同样生效；不更改电视、墙面、碰撞或 GLB。
- [crt-room.js](../../src/art/crt-room.js)：工位房使用独立同步时间线，可指定一台冻结或延迟。屏幕亮度影响已有局部溢光，未增加灯数。
- [预览](../../art-source/horror-room-recipes-v01/index.html)：自动循环、六画面定位、暂停／继续、单台适配、异常工位和 JSON 导出。入口 `http://127.0.0.1:4190/art-source/horror-room-recipes-v01/index.html`。

普通电脑默认共享当前页面的时间线。模型加载晚也直接显示当前画面。要一个房间使用独立节奏，给该房全部电脑传同一个 `screenPlayback`；需要关闭则传 `false`。普通电脑的适配器可从返回模型的 `userData.crtScreenBinding` 取得。

```js
import {createCrtPlayback} from './art/crt-screen-playback.js';
const playback=createCrtPlayback({
  sequence:[{frame:'ue5',seconds:2.5},{frame:'snow',seconds:.7},
    {frame:'unity',seconds:2.5},{frame:'tear',seconds:.9},
    {frame:'gpt',seconds:2.5},{frame:'black',seconds:1.2}],
  noiseStrength:.16, fps:10, offsetSeconds:0,
});
const model=await loader.attach('prop-computer-desk-v01',{
  parent:roomRoot, screenPlayback:playback,
});
await playback.ready; // 返回加载失败的标志 ID；失败时保留文字画面
playback.showFrame('gpt'); // 定位并暂停
playback.seek(3.2);       // 定位到序列时间，不自动改播放状态
playback.play();
playback.pause();
// 自定义 playback 由调用方释放；先释放模型绑定，再 playback.dispose()
```

`createCrtPlayback` 返回 `texture / ready / subscribe / play / pause / seek / showFrame / inspect / dispose`。`subscribe` 在画面刷新时通知，返回取消订阅函数。按需渲染的独立预览需要监听并请求绘制；主游戏已有渲染循环。

工位房接口：`createCrtRoom({proposal,parent,playbackOptions})`；用 `room.playback` 控制整个房间。`room.setException(stationId,{mode:'freeze',frame:'unity'})` 冻结指定工位；`mode:'delay',delaySeconds:2` 从主时间线派生延迟，跟随主时间线暂停／定位；`setException(null)` 恢复同步。初版每房最多一个异常工位。

## 材质与生命周期

绑定针对既有模型的 `glass` 材质；为曲面屏克隆局部几何，生成屏幕平面 UV，保留原始几何和材质用于释放还原。玻璃材质独立克隆，其他电脑和缓存原材质不被改写。每台可调色温／增益，动态纹理按时间线共享。

每条时间线只有一张 256×192 CanvasTexture，默认 10 Hz 更新，隐藏标签暂停推进。8／16 台同步工位不产生 8／16 张动态纹理。冻结异常增加一张静态纹理；延迟异常增加一条派生纹理。最后一个自动绑定释放时停止共享时钟并释放纹理。没有视频解码、逐台实时灯或新增模型。

## 标志来源

本地 SVG 来自固定版本 Simple Icons 13.0.0，实际下载链接与大小见 [sources.json](../../art-source/crt-screens-v01/sources.json)。共 3041 字节，三个文件位于 `public/art/crt-screens/v01/`。图标是第三方整理的品牌图形，不是本项目原创或品牌授权证明；游戏内显示不表示官方合作。GPT 画面使用 OpenAI Blossom 符号及 GPT 文字。没有下载或执行远程脚本。

## 检查与局限

浏览器观察：8 工位 16 模型、单台适配 2 模型，均 0 失败；三种标志均载入，截图文字方向正确；雪花、花屏、暂停定位、单台停在 Unity 已观察。证据在 [reviews](../../art-source/crt-screens-v01/reviews/)。16 工位模式沿用同一绑定和共享纹理机制；本轮未对其单独做 FPS 验收。

JS 语法、差异与构建检查通过。未添加／运行单元测试；普通房间的自动路径已接入代码，本轮实景观察使用独立预览的同一模型加载器，没有真人主游戏巡房验收。

## 本次提交边界

本提交包含工位组合、屏幕播放器、加载器屏幕适配、标志和预览证据。电脑 GLB、room-props-catalog 及 interior-catalog 中的电脑登记来自另一任务，截至提交前仍未提交，因此未替其纳入。本地预览与构建是在包含这些依赖的共享工作区完成；其他 checkout 要运行工位预览，需同步模型任务的后续提交。已跟踪的其他模型加载行为保持原接口。
