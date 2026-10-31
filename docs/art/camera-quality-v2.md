# 空间、摄影机与信号分层交付

用户要求：沿用已有模型材质，目标为正式场景；正常探索保留微弱摄影机缺陷，发现异常后才按叙事局部增强失真。正式调用由策划／程序方接入，不把校准场景当作完成的房间。

已完整阅读 [用户参考文档](../../art-source/camera-quality-v2/REFERENCE.md)。文档描述的“2003 年低照度走廊”是视觉目标；本聊天实际收到的两张图片是电视机房间和红光空间，没有看到另一张走廊原始截图，不宣称准确复刻该截图。

## 分层与复用

| 层 | 模块 | 控制与边界 |
|---|---|---|
| 空间美术 | crimson-room / ceiling-art / shrine-room-finish | 现有模型与贴图、局部材质和既有灯光；不写地图或事件 |
| 摄影机低照度缺陷 | [low-light-camera.js](../../src/art/low-light-camera.js) | off / subtle / reference / degraded 强度档；探索默认 subtle |
| 录像信号故障 | [recording-signal.js](../../src/art/recording-signal.js) | 显式 trigger；UV 区域、强度、时长；无随机自动触发 |
| HUD、遭遇插帧 | DOM / encounter-flash | 后处理之后；HUD 默认关闭，插帧另行调用 |

这四档是参考文档指定的**摄影机缺陷强度**，不是此前被用户否定的“旧摄像机／红光渗染”两种色彩风格。

项目使用 Three.js 0.187.0。原管线是 RenderPass + VHS ShaderPass，正式 main.js 的既有 VHS 滑杆仍保持不变。本版为独立模块，复用 EffectComposer，并在两处自己的预览使用。新链为：Scene linear HDR → OutputPass（读取 renderer 曝光和 tone mapping、sRGB 输出，恰好一次）→ display-space camera/signal pass → HUD。末级不再使用 tone mapping 或 colorspace 输出片段，避免二次 gamma。

暗部亮度噪声与低频弱色斑随绝对时间平滑变化，亮区更干净；色度低通保留中心亮度边缘。颗粒与像素偏移按 720 高参考栅格换算，DPR 不直接放大颗粒。正常探索没有自动横向抖动；文档建议的 glitchFrequency 被固定为 0，这是按用户最新指令收紧。所有房间原有红光与暖光仍由空间层控制。

## 正式接入接口

```js
const video = createLowLightCamera(renderer, scene, camera);
video.setPreset('subtle');
video.resize(width, height);
// 正式帧循环
video.update(dtSeconds);
video.render(timeSeconds);
// 策划确认异常已被看见后，传入投影区域，左下为 UV 原点
video.triggerSignal({id: instanceId, region:[cx,cy,rx,ry], strength:.6, duration:1.2});
video.setSignalRegion([cx,cy,rx,ry]); // 跟踪可见异常，而不是锁在屏幕上
video.cancelSignal();              // 离开视野、暂停、切层、事件取消
video.setGrain(0);                 // 独立禁用颗粒
video.setMotion(false);            // 独立禁用局部位移
video.setEnabled(false);           // 全部摄影机／信号效果关闭并取消事件
video.dispose();
```

region 中中心在 0–1，半径在 (0,.5]；边缘平滑衰减。duration .2–3 秒，strength 0–1。模块不负责判断视线／遮挡／异常发现，不绕过玩法事件；调用方必须在真正确认可见后触发，并在出视野时取消或更新区域。正在播放拒绝重入；id 是诊断标签，冷却和去重在策划侧。默认 120 ms 进入，最后 280 ms 退出，无高频闪白。

`configure()` 支持参考文档的归一化参数（见源码 CAMERA_REFERENCE）；先全量验证再更新，拒绝非零 glitchFrequency。`setStage(off/grade/noise/full)` 仅供分层校准；`inspect()` 记录参数与事件状态。标准输出为单视口；XR、分屏和其它后处理的组合需程序方另验。

## 原版手电修复

两个预览都改用 **main.js:260 的完整 SpotLight 构造参数 + configureInteriorFlashlight**。此前仅调用配置函数，漏掉构造器的角度，导致默认 π/3 大光锥；现改为 π/7 半角（约 25.71°）。最终 intensity=24、distance=17、penumbra=.22、decay=1.65；原 cookie、光源偏移和目标点保持一致。参见 [参数核对](../../art-source/camera-quality-v2/flashlight-check.json)。没有改变正式手电配置。

## 对照与验证

- [A–E 对照页](../../art-source/camera-quality-v2/compare.html)：A 原图、B 只调色、C 加暗部噪声、D 完整基础、E 同配置明亮房间。参考档 .55；正常探索默认 subtle .28。A–E 初批使用关手电固定照明，以隔离后处理。当前预览默认已恢复原版手电，可手动关闭作同条件校准。
- [时间／区域合同检查](../../art-source/camera-quality-v2/check-results.json)：无自动事件、30/60/120 Hz 按秒结束、无重入、取消、无效输入与释放通过。
- [区域像素对比](../../art-source/camera-quality-v2/region-check.json)：同机位同时间，局部故障外的最大 RGB 字节差为 **0**。变化位于明确指定区域内。
- [实测](../../art-source/camera-quality-v2/performance.json)：1280×720 CSS、DPR 1.5、1920×1080 渲染，40 样本，关闭手电的校准场景。GPU median A 3.396 ms / D 3.690 ms，差约 **0.294 ms**；P95 A 5.919 / D 8.290 ms。CPU 提交 median .4/.7 ms。新链完整效果共 2 个全屏 pass，比旧 VHS 单 pass 多 1 个；不是零成本。当前浏览器测量不等于目标设备／正式地图性能验收。
- 关闭后与直接渲染的 16×16 墙面采样最大差 1/255，均差 .0078125/255，未发现二次 gamma。只验证了指定采样块，不声称全屏逐像素完全等价。
- 主构建和包含两处新预览的独立 Vite 构建通过；存在既有大 bundle 提示。没有更改正式 main.js、world.js、规划、碰撞、事件或全局 UI。正式集成、真人玩法和目标平台 GPU 仍待程序方验收。
