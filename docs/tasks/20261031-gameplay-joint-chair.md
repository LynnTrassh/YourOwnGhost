# BO04 家具的关节切片

- 责任方：玩法／程序方
- 状态：程序灰盒已接入；正式美术与自然路线验收待补
- 起始提交：f538fbb（本地工作尚未提交）
- 目标：玩家先看清椅腿的关节；只有观察后正常离开并回访，近侧一个关节才弯曲并保持，弯曲结束播放一次剧本原文。
- 修改范围：`src/planning/content-catalog.js`、`src/planning/content-fit.js`、`src/story/runtime.js`、`src/rendering/story-proxies.js`、`src/world.js`、`src/main.js`、`src/preview.js`、`tests/bo04.test.js`、`docs/content-scheduling.md`、本任务卡与批量报告。
- 空间与状态：仅在合法回访房中安放有计划碰撞的椅子，关节模型由程序灰盒层级构造；只转动玩家可见的近侧一条椅腿下段，不改椅面或通行。未观察离开、死亡传送不触发；看开或离房冻结弯曲进度；普通死亡保留本层阶段，新局重置。
- 验收条件：两种合法种子可达；无此事件的基线与本事件门位一致；真实跨门而非传送触发，回访时单关节动，终态持久，台词只一次；正常地图实际落位，拒绝不适配房间。
- 验证结果：`node --test tests/bo04.test.js` 两种种子通过；浏览器 `seed=12&preview=BO04&like=none` 核对初态、回访按钮后的弯曲终态和“坐久了，总得活动一下。”。[同前缀 20 种子报告](../validation/20261031-content-audit-20-flower-joint-sparse.json)中 40 层正常落位 2 层，替换 2 层 IN01，覆盖指标持平。椅子材质与弯曲幅度需最终美术和真人试玩验收。
- 交付提交：未提交。
