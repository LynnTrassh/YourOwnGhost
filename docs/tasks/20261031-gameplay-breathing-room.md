# BO03 呼吸的房间切片

- 责任方：玩法／程序方
- 状态：程序灰盒已接入；最终视觉与自然路线验收待补
- 起始提交：f538fbb（本地工作尚未提交）
- 目标：仅让独立房的墙顶缓慢鼓起、复原；家具、玩家镜头、碰撞壳与门位保持稳定。玩家实际连续看见完整一次起伏后，只播放一次剧本原文。
- 修改范围：`src/planning/content-catalog.js`、`src/planning/content-fit.js`、`src/story/runtime.js`、`src/rendering/story-proxies.js`、`src/main.js`、`tests/bo03.test.js`、`tests/content.test.js`、`docs/content-scheduling.md`、本任务卡与批量报告。
- 空间与状态：只选择有可见封闭墙的合法房间；墙面按实际墙段、顶面按房间模块生成独立细分表皮。边缘不位移，最大内凸约 0.18 米，不封门；原碰撞、家具和镜头不随形变。房内推进 6 秒周期，离房冻结；完整连续观察单独计时，看开或离房重算；普通死亡保留进度与字幕消费，新局复位。
- 验收条件：预览中可见墙顶随周期变化，家具静止；自动检查真实几何顶点变化、碰撞／门／内装不变、观察守卫、一次字幕、资源释放；正常随机地图有实际落位。正式材质与幅度需真人试玩确认。
- 验证结果：`node --test tests/bo03.test.js tests/content.test.js` 的 21 项检查通过；浏览器 `seed=12&preview=BO03&like=none` 显示墙顶灰盒形变且完整周期后出现“放松点。这间屋子也在学。”。[同前缀 20 种子报告](../validation/20261031-content-audit-20-flower-breath-sparse.json)中 40 层有 5 层自然落位，未出现生成失败、无效层或保底。画面中的微幅变化仍需美术强化辨识度；整局自然路线与最终视觉未验收。
- 交付提交：未提交。
