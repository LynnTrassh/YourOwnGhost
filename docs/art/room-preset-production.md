# 梦境房间主题预设生产

## 流程

用户要求整个梦境覆盖。最新流程为先生成整套资产图与场景图，用户统一确认后再按主题批量制作模型、整理尺度并接入网页。床样板是单独授权；角色猫的已批准图不作为场景批准。

房间主题沿用 `src/planning/room-presets.js`，不新增随机布局。所有实例读取 plan 的 `prefabId`、占位 AABB 和朝向；同一资产可在不同房型复用。完整梦境由可拆分的预设装配形成。

| 顺序 | 主题 | 预设资产 ID | 当前状态 |
|---|---|---|---|
| 01 | 旧卧室 | bed、nightstand、dresser、wardrobe、bookcase | 床已按用户要求生成并接入游戏试看，其他四件待确认 |
| 02 | 空客厅 | sofa、low-table、display-cabinet、bookcase | 资产及黑暗场景图已保存；模型待确认 |
| 03 | 旧育儿室 | toy-chest、small-table、toy-shelf、wardrobe | 资产及黑暗场景图已保存；模型待确认 |
| 04 | 诊疗室 | exam-cot、instrument-cart、medicine-cabinet、file-cabinet | 资产及黑暗场景图已保存；模型待确认 |
| 05 | 旧档案室 | writing-desk、copy-table、archive-shelf、filing-cabinet | 资产及黑暗场景图已保存；模型待确认 |
| 06 | 供奉室 | offering-table、kneeler、reliquary、bookcase | 资产及黑暗场景图已保存；模型待确认 |

同名资产按主题做材质差异或共享；不把 `file-cabinet` 与 `filing-cabinet` 混成错误 ID。床是额外固定资产，不属于 counter 随机分派。

## 旧卧室设计约束

- 从参考提取旧木、褪色灰粉布面、陈旧纸张、手工磨损和低反光。家具保留可信用途，异常集中在轻微错位、重复纹样、不自然的空隙与陈旧生活痕迹。
- 家具不统一长猫脸，不把角色的纸拼接材质铺满整个房间。
- 床现有占地 0.8 × 1.9 m；床头柜/斗柜沿现有 counter 的长边约 1.317 m、深约 0.7 m 装配；高柜沿现有 bookshelf 占位，高约 2.3 m。
- 设计图用于资产外观确认，不作为地图布局图。出生房是现有 T 形房间，原有门洞、出生点、柜体占地及通路继续由 plan 决定。
- 墙、地板、天花与门框采用适配房型的共用表面/模块；活动门扇保持独立，不能生成成封死出口的整块模型。

## 接入边界

新模型进入独立美术加载模块，加载失败保留现有占位。复用资源需要管理异步卸载与共享贴图释放。修改 world 前重新读取其最新差异；不修改玩法、碰撞或房间生成规则。任何外形超占位先调整美术尺寸或提出明确交接，不悄悄改变通行空间。

旧卧室 [v1 确认图](../../art-source/room-presets/bedroom/approval-v1.png)已用内置 imagegen 生成；[完整提示词与审批记录](../../art-source/room-presets/bedroom/approval-v1.json)。图中床头柜与床比例仅用于视觉说明，实际模型仍以占位尺寸为准。此记录为初版阶段；后续床样板已生成接入，见下文，其他模型仍待图片确认。

## 单床场景试看（2026-10-31）

用户反馈“手绘感”，要求先生成床放入场景。以套装图中单床为依据，imagegen 提取 [独立参考图](../../art-source/room-presets/bedroom/bed-input-v1.png)，保留[提取提示词](../../art-source/room-presets/bedroom/bed-input-v1.prompt.txt)。只提交一次 Tripo P1 图生模型；task `c048bd2b-f4c1-4625-824b-f8e30dece9d3`，消耗 **50 积分**。

- [请求](../../art-source/room-presets/bedroom/bed-v1.request.json)、[结果](../../art-source/room-presets/bedroom/bed-v1.run.json)、[原始 GLB](../../art-source/room-presets/bedroom/output/bed-v1/model.glb)、[运行 GLB](../../public/art/room-presets/bedroom/bed-v1.glb)。运行文件 1,039,212 字节（约 1 MB），9383 三角面，1 张嵌入颜色贴图，静态单网格/材质。
- 高 1.05 m，宽 0.8 m、长 1.9 m，底部中心原点，床头 +Z，床尾 -Z。为匹配既有窄床占地采用非等比尺度整理；世界中心 `(-1.55, 0, 1.25)`，平面范围 X `[-1.95,-1.15]`、Z `[0.3,2.2]`，与现有床碰撞一致。
- 复现导出：`node art-source/tripo/prepare-model.mjs art-source/room-presets/bedroom/output/bed-v1/model.glb public/art/room-presets/bedroom/bed-v1.glb 1.05 90 preserve 0.8 1.9`。源文件保留不变，保留服务返回的非金属/粗糙材质（metallic 0、roughness 0.9）。
- `src/art/generated-bed.js` 管理异步加载、边界贴合和释放；`src/art/bedroom-set.js` 保留旧床作为加载回退，成功后隐藏。世界释放后到达的加载会被释放，不重新加入房间。本轮不需要修改 `src/world.js`，其其他任务差异保持。
- [实际游戏](http://127.0.0.1:4190/)已加载模型，浏览器进入卧室转向床位，看到手电与 VHS 效果；[实景截图](../../art-source/room-presets/bedroom/bed-v1-in-game.jpg)。鼠标锁定不支持时使用原有拖动视角模式。
- 视觉偏差：服务把被面凹陷重建成较强的隆起；强手电下颜色偏浅。已告知用户，尚未获得其对模型材质/形体的最终认可；其他四件未生成。未运行自动测试或构建，未做完整真人试玩，未提交或推送。

## 整套确认图与黑暗场景 V02

- [资产确认册](../../art-source/room-presets/catalog.html)：12 张套装图、56 类独立资产及首版整体氛围图；完整命名及 gameplayPrefabId 映射见 [asset-catalog.json](../../art-source/room-presets/asset-catalog.json)。使用稳定类别前缀英文 ID，版本号独立，不重命名既有程序 ID。
- [黑暗场景浏览页](../../art-source/room-presets/style/dark-scenes-v02/index.html)：卧室、空客厅、育儿室、诊疗室、档案室、供奉室、墙纸走廊，共 7 张 PNG，约 12.36 MiB。命名 `scene-<theme>-dark-v02.png`，完整提示词和源文件信息见同目录 [manifest.json](../../art-source/room-presets/style/dark-scenes-v02/manifest.json)。由内置 imagegen 生成。
- 最新约束见 [美术方向](psychological-interior-direction.md)：所有场景以黑暗氛围为主，漂亮与破旧都允许；仅在局部照明处显露材质、纹样与空间异常。旧版候选不被覆盖。
- 场景图仅用于美术确认，不是按现有地图渲染的游戏截图；不直接当作单件 Tripo 输入、无缝贴图或布局方案。模型制作还需明确单件结构、米制尺度、原点与碰撞占地。
- 已目视查看生成图，本阶段未追加 Tripo 调用、修改游戏代码、运行测试或构建；全部未提交、未推送。
