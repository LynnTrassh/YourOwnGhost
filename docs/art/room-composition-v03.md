# 房间组合 V03

日期：2026-10-31。责任方：chen 美术。本轮未提交、未推送。

## 分工与目标

已读取相关聊天：模型聊天负责家具变体及六主题道具；环境导演聊天负责 crimson-room、encounter-flash 和独立效果预览；灯光聊天已有 light-moods 候选。本轮负责既有房间中家具、建筑背景与地面区域的对应关系。读取期间模型聊天继续接入新道具，保留其目录、目录表和规划修改。

用户认可的窗边书写角见 [参考图](../../art-source/room-completeness-v02/references/user-approved-window-desk.png)。沿用黑暗、旧室内、伪纪录片方向。新版 v2 规范中的整房噩梦仍可独立使用，本模块只补生活空间的组合基线。

## 已接入

- `src/art/room-composition.js` 在最终家具和墙面模型加载后，寻找合法墙段，把已有窗对应到书桌、游戏桌或检查床。遇到墙面占用、家具遮挡或特殊房间则跳过；布帘候选目前未找到可用位置，不能算已完成。
- 地毯依据功能组的低矮家具范围派生，每房最多两张；绕开门口和墙体，诊疗室不用地毯。每张为两个三角形，主题材质复用。关闭组合时恢复原来的背景位置和旧地毯可见性。
- 诊疗地面改用既有旧绿瓷砖，增加医疗空间辨识度。此材质调整在 A/B 两边均生效；旧锯齿地面另存 `reviews/clinic-floor-before.png`。
- `dark-interiors.js` 的 `ready()` 接入控制器，因此主游戏与独立预览共用。保留原 `ready()` 加载结果返回值。模型对话同时增加的 resolveInteriorAsset 和比例保持逻辑已保留。
- 不改变规划对象、家具位置、碰撞、门或事件，不增加运行时随机。控制器提供 `setEnabled`、`inspect`、`dispose`。

## 参考依据

访问日期均为 2026-10-31，仅作设计研究，没有下载或使用其素材。

| 方向 | 来源 | 本轮设计解释 |
| --- | --- | --- |
| 电影摄影 | [ASC：《The Witch》摄影访谈](https://theasc.com/article/conjuring-a-coven-for-the-witch/) | 参考自然窗光与实用光源的动机，让桌、床和光源有空间关系；本轮没有改灯光参数。 |
| 恐怖游戏 | [Capcom：RE7 开发者谈恐怖与探索](https://news.capcomusa.com/lets/browse/resident-evil-7-developers-discuss-the-new-evolution-of-horror) | 参考可探索居住空间的功能感；不是照搬其房间平面。 |
| 室内陈设 | [Brighton Museums：Victorian Study](https://brightonmuseums.org.uk/booth-museum-of-natural-history/what-to-see/victorian-study/) | 参考书写、阅读、收纳组成使用区域；家具关系是本项目的设计转译。 |

## 预览与检查

入口：`http://127.0.0.1:4190/art-source/room-composition-v03/index.html`。固定种子 1844070019，实际 generateDream/createWorld，站立高度 1.65 m，FOV 72。组合 B 可关闭还原。加载完成前禁用开关，避免空报告。

证据在 [reviews](../../art-source/room-composition-v03/reviews/)，约 3 MB，为美术审阅源文件，不增加运行模型下载量。

- 第一阶段 `layer-1.json` / `layer-2.json`：规划前后相同；分别 13 / 9 张组地毯。卧室、育儿室、客厅、诊疗室有组合与多个观察机位截图。
- 并行家具更新后重新观察：`latest-layer-1.json` 为第一层，4 组窗背景，其中 3 组移动，15 张地毯；`latest-layer-2.json` 为第二层，2 组窗背景均移动，4 张地毯。数字随另一聊天继续修改家具而变化，不是全游戏固定覆盖率。
- 两层关闭组合均观察到 `restored:true`，启用时 `planUnchanged:true`。第二层最终 `archive-A.png` / `archive-B.png` 显示已接入的电脑档案桌；`latest-shrine-A/B.png` 属于第一层供奉室。
- `node --check` 两个新增 JS 入口通过；`git diff --check` 通过。最新 `npm run build` 成功，仍有既有大 chunk 提示。
- 浏览器最终检查无 error/warn，第二层当时 198 模型、0 加载失败。没有运行单元测试，没有真人试玩或完整 FPS 验收。

## 尚未完成

大房间远端空区、特殊事件房陈设和强异常房仍需专门配方。部分窗、全部布帘对齐因占用检查被跳过。此轮不声称解决所有空房、完成满手／满玩偶房，也不把其他聊天新模型计为本轮产出。新地毯只是功能区联系，不替代家具密度与动线设计。
