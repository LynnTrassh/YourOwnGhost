# 第一批房间与异物预制体

## 视觉目标

房间使用可信的旧屋家具比例、磨损木料和褪色布面；异物保持手工拼接感、错位比例与不对称细节。材质以低反光、粗糙面为主，让手电的局部照明承担形体塑造。VHS 颗粒和色差由游戏后处理统一添加，模型本身不烘焙屏幕故障。

## 资产

| 文件 | 类型 | 尺寸与接口 | 可动部分 |
|---|---|---|---|
| `public/art/prefabs/patchwork-watcher-cat.glb` | 门边窥视的猫形异物 | 米制，约 1.98 m 高，前向 `-Z`，脚底中心为原点 | `slow uneven breathing and listening`：轻微躯干起伏、头部倾听；头和身体是独立节点 |
| `public/art/prefabs/sewn-nursery-doll.glb` | 育儿室/卧室杂物 | 米制，约 0.96 m 高，前向 `-Z`，脚底中心为原点 | `small suspended sway` |
| `public/art/prefabs/crooked-dining-chair.glb` | 旧屋餐椅 | 米制，约 0.56 × 1.31 × 0.55 m，前向 `-Z`，脚底中心为原点 | 静态 |

模型由 `art-source/build-prefab-pack.py` 确定性生成；保留脚本作为可编辑源，GLB 是运行资源。表面使用粗糙 PBR 材质和面片颜色变化，不依赖外部贴图，方便先确定灯光和轮廓。每个 GLB 都可以由 Three.js `GLTFLoader` 加载；动画片段通过 `AnimationMixer` 播放。

`public/art/prefabs/manifest.json` 提供稳定 ID、资源 URL、米制包围盒和动画片段名，供场景装配器读取。

## 预览与重建

启动本地 Vite 后打开 `/art-source/scene-study.html` 查看旧屋门口、手电和 VHS 整景；打开 `/art-source/preview.html` 可切换三个单体模型并预览动画。重建运行：

```sh
python3 art-source/build-prefab-pack.py
```

## 场景接入提示

- 猫怪需要由剧情/行为逻辑选取可见的门边或遮挡锚点；资产只负责形体和待机动画，不会自行追逐玩家。
- 玩偶与椅子适合布置在床边、书架或空桌附近；放置必须继续遵守计划中的碰撞包围盒和通道净空。
- 暖色手电可以揭示猫怪的布面、补丁与两只不同的眼睛；暗部保持细节可辨，不要让 VHS 颗粒掩掉轮廓。
- 若后续用 Tripo 生成的 GLB 替换占位或补充资产，保持米制、`-Z` 前向、地面原点，并按房间主题重设粗糙度、明度和颜色范围。生成纹理可保留细节，但金属感和镜面高光需谨慎使用。

## 当前范围

这批资源建立第一套可加载的模型语言，还没有替换 `world.js` 中的程序化房间家具，也没有触发猫怪追逐行为。资产导出完成、程序接入和浏览器实机场景验收分开记录。
