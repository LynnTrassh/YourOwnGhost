# 暗部颗粒与边缘通道偏移（已接入主游戏）

## 现状判断

- 接入前的 `src/art/vhs-effect.js` 旧版有全屏极轻微红蓝水平偏移，手电开启时更弱；不是按画面边缘增强的色差。
- `src/art/low-light-camera.js` 新摄影机有颜色拖影，没有按距画面中心控制的红蓝分离。它及导演预览正在由其他任务维护，本轮不覆盖。
- 房间渲染仍受部分剧情代理模型的白盒外形、空间密度和光照层次影响。颗粒不能替代资产和灯光完善。

## 本轮交付

- 模块：[`../../src/art/camera-edge-grain.js`](../../src/art/camera-edge-grain.js)
- 独立预览：[本地对照页](http://127.0.0.1:4190/art-source/camera-edge-grain-v01/index.html)
- 同机位截图：[开启](../../art-source/camera-edge-grain-v01/captures/combined.png)、[关闭](../../art-source/camera-edge-grain-v01/captures/off.png)
- 已通过 `src/art/vhs-effect.js` 的原接口接入主游戏。无需改 main.js 或房间布局；替换旧 VHS 颗粒和微弱水平色差，不叠加 low-light-camera。

## 视觉规则及参数

| 参数 | 默认 | 范围 | 作用 |
| --- | --- | --- | --- |
| grain | 1 | 0–2 | 暗部细颗粒，辅以较慢的大颗粒和彩色噪声 |
| edgePixels | 1.8 | 0–4 | 每个颜色通道最大偏移，按 720 高参考像素计算 |
| centerProtection | 0.4 | 0.1–0.85 | 中央椭圆保护区，范围内没有色差 |

中心到边缘渐进，红色向外、蓝色向内；最外围两通道总间距最大为 3.6 个参考像素。随实际画面高度缩放，横竖屏分别按屏幕轮廓计算；边界采样钳制，避免卷绕。手电开关不影响色差强度。高光区域保留少量颗粒；暗部增强，接近纯黑处削弱，避免黑色变成亮灰雪花。没有自动闪白或随机横向撕裂。

## 接入接口

`createEdgeGrainPass(options)` 返回 `{pass,configure,setTime,resize,inspect,dispose}`；pass 放在**唯一一次 OutputPass 后**，不再进行 gamma/tone mapping。`resize(w,h)` 传像素宽高或同宽高比的 CSS 尺寸；`setTime` 使用非负秒数。`configure` 校验全部参数再应用。

`createEdgeGrainCamera(renderer,scene,camera,options)` 是独立预览包装：RenderPass → OutputPass → 本效果。返回 `configure / inspect / render / resize / dispose`。预览固定曝光 1.1025，采用现有实际场景和手电。

主游戏实际仍调用 `createVhsEffect`，现将其改为本效果的兼容适配器，保留 render / resize / setIntensity / setFlashlight / dispose。VHS 滑杆按 value / 0.62 映射强度；0.62 对应批准的候选，0 同时关闭颗粒和色差并跳过效果 pass，1 是加强档。现有现代界面默认值 0.35 与用户已保存设置继续生效。手电 API 保留，但不再削弱屏幕边缘色差。

当前使用唯一 composer；一次 OutputPass 加一次颗粒色差 pass，相比旧实现多一个全屏 pass，开启色差时效果层 3 次颜色采样。resize 同步 renderer 像素比，dispose 释放所有 pass 和 composer。没有完成目标设备 GPU 性能测量，不能声明零开销。另一对话若后续切换 low-light-camera，需把此效果合并进去并移除重复颗粒，不应串联两个 composer。

## 验证记录

- `node --check`：两个新增 JS 文件通过。
- `npm run build`：通过；既有 world 大包警告仍存在。独立预览不是默认构建入口，另以实际浏览器加载检查。
- 浏览器实际地图：种子 1844070019，二层档案房；119 模型，0 加载失败，计划序列化前后相同。对照关闭/组合，拖动转头及动态颗粒开关可用。
- 首次发现初始 RAF 时间戳早于初始化时钟，导致负时差；已限制 dt >= 0 并重新加载，恢复渲染。不能将修复前留存控制台记录误作新错误。
- 同机位关闭/开启截图保存在 captures；可见地毯边缘颜色分离，中心桌面保持清晰，墙面暗部颗粒增强。
- 主游戏接入后：`npm run build` 通过（既有大包警告）；`node --check` 通过。种子 42 的主游戏 debug UI 可进入、起身、开关手电、暂停/继续。VHS 滑杆 0 / 0.6 已检查，浏览器错误日志为空。截图为 game-flashlight-on.png、game-flashlight-off.png、game-effects-off.png。
- 另发现种子 1844070019 的普通主游戏入口报“主动玩法未能完整落位／追逐空间未能合法落位”；错误发生在初始化渲染前，本轮未改生成器。静态场景对照与种子 42 主流程可加载。该已观察到的生成问题仍待程序方处理。
- 检查在含其他任务未提交内容的共享工作区执行；提交仅包含本任务模块、预览、截图与文档，不包含其他任务资产。
- 没有真人试玩验收；已获用户授权接入并提交，推送由用户执行。
