# 首批独立表现交接：血色房与遭遇插帧

2026-10-31，chen 美术方。用户授权“先做，不一定调用，策划负责调用”，并追加多张、不同颜色的遭遇底图。已完成两个独立表现模块、四张原创底图和实际地图预览；尚未接入正式游戏，未提交、未推送。

## 预览与交付范围

启动现有 `npm run dev` 后打开 [独立预览](http://127.0.0.1:4190/art-source/horror-director-v2-preview/index.html)。[预览源码](../../../art-source/horror-director-v2-preview/preview.js) 使用真实 createWorld、最终 generateDream、碰撞移动和灯具调度；FOV 72°、眼高 1.65 m、曝光 1.1025、VHS .35。默认原房间、柔和显现，不自动触发遭遇。先选底图，再播放；“检视插帧构图”仅在预览中冻结 140 ms 帧，不是正式时间轴。

血色房宿主为 seed `1844070019`、第二层 room-8、catEnabled=true、preferences=[like.cat,fear.doll]、threatBehaviorId=null、activeEncounters=false（当前默认），原审计 planHash=`ed3fb9dd`；并行家具组更新后的当前复验为 `539ba00d`，宿主 RI02 观察／焦点与入口位置保持一致。预览校验宿主锚点并实时记录 hash，不通过旧全图 hash 冒充当前版本。保留原 RI02 供奉和事件代理，剧情不推进。实际主流程可开启 activeEncounters，该配置不是本预览的兼容保证；策划应从最终计划重新选择绑定，不能硬编码这组 roomId 到所有种子。

房间 A 为红色背景围住既有焦点、最靠近入口的现有灯保持冷中性；B 为单个源点向上延伸的斑驳红色侵染。当前实现限于墙材质与既有灯色／强度，**完整设计里的新增布条和物件簇未制作**。新增灯 0、新增房间几何 0。手走廊与旧物房各两种构图、资产核查已在 [REPORT.md](REPORT.md)，尚未实现其几何生成。

## 资源与颜色

[资源清单](../../../public/art/encounter-flashes/v02/manifest.json)含尺寸、字节数与 SHA256；四图均为 1672×941 PNG，总计 7,907,057 字节（7.54 MiB）。它们是遭遇屏幕画面，不是已经完成的 3D 房间。运行态建议只预载策划选中的一张；不压进地图生成随机流。预览为方便比较加载全部四张，不作为正式内存预算。

| ID | 图像／色调 | 叙事适用方向 |
|---|---|---|
| ghost-bone | [骨白鬼脸](../../../public/art/encounter-flashes/v02/ghost-bone.png) | 正面鬼脸逼近、眼窝／张口一闪可读 |
| shadow-cyan | [冷青黑影](../../../public/art/encounter-flashes/v02/shadow-cyan.png) | 黑影贴近、冷色轮廓与伸向视野的手 |
| ghost-magenta | [紫红歪脸](../../../public/art/encounter-flashes/v02/ghost-magenta.png) | 歪斜面孔、双色侧光、近距离侵入 |
| shadow-amber | [枯黄瘦影](../../../public/art/encounter-flashes/v02/shadow-amber.png) | 瘦长暗面孔、枯黄边光 |
| doll（预览内） | 现有瓷偶 GLB 的骨白／暖灰渲染 | 人偶相关遭遇；纹理由预览临时渲染，不新增模型文件 |

使用内置 image_gen，未使用 CLI/API fallback。最终完整提示词保存在 [image-prompts-v02.json](../../../art-source/horror-director-v2-preview/image-prompts-v02.json)。成品保存在 public/art/encounter-flashes/v02，逐张查看：当前主体均为鬼脸／黑影近景，背景不再包含房间布局。生成源文件保留，无旧资产被覆盖。

用户指出首版部分图像像房间布局，不符合遭遇底图。首版四张移至 [环境试稿归档](../../../art-source/horror-director-v2-preview/rejected-environments/v01/manifest.json)，退出运行资源与预览候选；仅作研究，不算当前底图交付。当前准则：贴近镜头、主体大、空黑背景、眼口／轮廓瞬间可读，颜色体现在鬼脸、轮廓光和残影。

## 策划／程序调用契约

### 墙面与灯具

[crimson-room.js](../../../src/art/crimson-room.js) 导出 `createCrimsonRoom`、`CRIMSON_VARIANTS`。调用方在 artReady 后确定目标房间材质槽与灯位，绑定时默认 baseline。

```js
const art = createCrimsonRoom({
  roomId,
  wallBindings: [{mesh: wallMesh, materialIndices: [roomMaterialIndex]}],
  lights: [{light: focusLight, role: 'focus'}, {light: exitLight, role: 'exit'}],
  source: [x, y, z], // 世界米制坐标，横向侵染中心；高度规则基于地面 y=0
  radius: 6,        // 水平影响半径，单位米
});
art.setVariant('enclosure'); // 或 rising / baseline
art.inspect();
art.dispose();
```

材质只克隆显式槽，纹理共享且不由模块释放；其他房间材质对象不变。已自定义 onBeforeCompile 的墙材质拒绝重复绑定。灯 role 由调用方确定，预览选择最靠近入口的一组既有灯指定 exit，这只是本宿主的示例。模块保留灯光预算的衰减增益，更新 qualityIntensity；不得与另一个 mood／事件灯控制器同时写同一灯。先释放再重建灯光质量。灯泡发光面保留原材质，房间灯具数量和位置不变。

释放恢复本模块仍持有的材质槽和原灯色／目标强度；若外部后来替换材质槽，不抢回覆盖。源点 y 当前保留在接口中用于世界定位记录，效果高度以地面 0 为基准；非零层高宿主需先扩展高度契约。

### 遭遇闪帧

[encounter-flash.js](../../../src/art/encounter-flash.js) 导出 `createEncounterFlash`。模块不加载资源、不选图、不判定碰撞或剧情、不写种子。底图纹理由调用方持有。

```js
const flash = createEncounterFlash({mode: 'reduced'}); // full / reduced / off
const texture = await new THREE.TextureLoader().loadAsync(asset.url);
texture.colorSpace = THREE.SRGBColorSpace; // PNG 底图
flash.trigger({texture, id: encounterInstanceId});
// 游戏自己的帧循环；秒为单位
flash.update(dt);
// 场景与 VHS 后、UI 前，目标为当前输出 render target
flash.render(renderer);
// 暂停、切层、失焦或取消遭遇
flash.cancel();
// 退出场景
flash.dispose();
texture.dispose(); // 由持有方释放
```

- full：峰值不透明覆盖，黑影内部不会透出房间家具；0–50 ms 插入、50–120 ms 露回空间、120–190 ms 第二次插入、190–380 ms 淡出。reduced：650 ms 单次柔和显现；off 拒绝触发。
- 正在播放时再次 trigger 返回 false；结束后同一个 id 可以重播。**id 只是诊断标签，去重／冷却／保存记录由策划侧负责。** setMode 会取消当前播放。
- 无自动定时器、无随机源、无摄像机抖动。低帧率时按真实 dt 前进，不补播漏掉的短插帧；长卡顿直接到结束。
- 各图保留原色，按图片宽高与输出宽高进行中心 cover 裁切；不同宽高比仍需核对关键主体。方形瓷偶渲染允许被裁切，不应拿它证明所有怪物都合适。
- 只临时关闭 renderer.autoClear 并在 finally 恢复。沿用调用方当前 render target；须绑定全屏 viewport/scissor，不为 XR 或拆屏提供保证。PNG 使用 sRGB，RenderTarget 沿用其实际线性数据。纹理、音频及游戏状态都不由本模块创建或释放。

## 验证及限制

- 原审计基线 67d2d42：172/172；工作期间其他任务合并主干至 **40c4afc1f165efc2d0bfafe95028d255c0c88e3a**，本任务未执行提交／合并；合并后重跑 `npm test`，**212/212 通过**。
- [独立契约检查](../../../art-source/horror-director-v2-preview/check.mjs) 5/5：相邻材质隔离、灯光预算增益／还原、错误绑定无部分写入、后来替换材质不覆盖、30/60/120 Hz 与长帧结束、取消／关闭、外部纹理不释放、渲染异常恢复 autoClear。结果见 [check-results.json](../../../art-source/horror-director-v2-preview/check-results.json)。
- `npm run build` 通过；另以预览 HTML 为入口独立 Vite 构建通过，证明新模块也参与打包。两者存在 bundle >500 kB 提示，未改共享构建配置。
- 实际 world 浏览器：原基线 142 模型、当前复验 135 模型，均 0 加载失败，四个观察点通过碰撞占用检查；原版/A/B 可切换，plan/colliders/相邻墙槽对照不变。初次发现 rAF 时间戳相对初始化时刻可为负，已在预览将 dt 下限收为 0；模块仍严格拒绝非法 dt。
- 本轮没有新增导航、碰撞或触发逻辑；没有宣称“全流程试玩验收”或“性能达标”。最新工作区还有其他任务对 room-presets.js 的未提交追加；已另外验证当前种子完整重复相等、两层 validatePlan 和出口连通，通过记录见 [seed-recheck.json](../../../art-source/horror-director-v2-preview/seed-recheck.json)。212 项结果属于之前的合并版本，不宣称覆盖随后所有并行编辑。正式接入仍需门开关／进退房／原事件／主动遭遇／暂停／设置验证。血色房原版/A/B 的四机位截图与四张插帧实机图已保存，见 [截图索引](CAPTURES.md)。完整六套房间及目标设备 P95 帧时尚未交付。

## 建议策划接入顺序

先选一个已明确事件语义的遭遇，将对应底图预载并显式调用；停用原型后应回到原画面。再选一间血色宿主绑定 A 或 B，保护原 likedObject 和逃脱线。不要把四张图全局均匀随机轮播。通过单例集成后再扩展手群与旧物群的实际体量、边界和遮挡验证。

## 本轮追加

按用户要求补齐 [天花板独立模块](../ceiling-art-v2.md)，预览覆盖六类房型并支持抬头、原顶面对照。根据用户两张参考，整体画质应统一审视材质、光照、色彩和物件关系；错误拆分的两个 VHS 档位已撤下，见 [纠偏记录](../vhs-art-v2.md)。最新截图记录实时 hash 与模型数，不以之前的 135 模型结果代表并行修改后的工作区。
