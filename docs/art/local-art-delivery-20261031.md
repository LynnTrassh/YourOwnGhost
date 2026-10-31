# 2026-10-31 本地美术统一交付索引

本次按用户明确授权，将此前留在本地的美术模块、资源、预览、制作脚本、研究和验收记录统一提交到 main。源模型已分 5 批提交并推送；精确路径见 [交付清单](local-art-delivery-20261031.json)。旧任务卡中的“未提交／未推送”是当时记录，本次统一提交状态以本索引和 Git 历史为准；不将旧记录改写成“全部功能已接入”。

## 策划从这里找

策划拉取后看这里（以下为远端 `main` 的直接链接）：

- [全部功能路径与预览入口](https://github.com/LynnTrassh/YourOwnGhost/blob/main/docs/art/local-art-delivery-20261031.md)
- [闪帧模块](https://github.com/LynnTrassh/YourOwnGhost/blob/main/src/art/encounter-flash.js)
- [灯光颜色模块](https://github.com/LynnTrassh/YourOwnGhost/blob/main/src/art/light-moods.js)

代码与素材已推送；闪帧和光色情绪作为独立模块交付，正式事件触发及房间绑定状态见下表。

在仓库运行 `npm install`、`npm run dev`，打开以下本地预览。端口沿用 package.json 的 4190。

| 内容 | 模块／资源 | 预览或交接 | 当前状态 |
| --- | --- | --- | --- |
| 房间光色情绪：封锁红、灰绿、冷蓝、暖黄、红白分区 | [light-moods.js](../../src/art/light-moods.js) | [预览](http://127.0.0.1:4190/art-source/light-quality-v01/index.html?room=archive&pose=notice&quality=1&mood=lockdown)、[调用说明](light-moods-v01.md) | 独立候选；由程序显式绑定房间灯具和切换，红白分区仍待专门灯位验收 |
| 怪物遭遇闪帧 | [encounter-flash.js](../../src/art/encounter-flash.js)、[四张底图清单](../../public/art/encounter-flashes/v02/manifest.json) | [预览](http://127.0.0.1:4190/art-source/horror-director-v2-preview/index.html)、[调用接口](horror-director-v2-audit/IMPLEMENTATION.md) | 独立模块，正式游戏尚未触发；createEncounterFlash / trigger / update / render / cancel / dispose |
| 血色房 A/B | [crimson-room.js](../../src/art/crimson-room.js) | 与闪帧共用预览及交接说明 | 墙材质与既有灯光的独立方案；不包含完整新增布条与物件簇 |
| 天花板 | [ceiling-art.js](../../src/art/ceiling-art.js) | [接口及净高](ceiling-art-v2.md) | 六类主题独立模块，默认关闭，尚未由正式游戏调用 |
| 低照度摄影机、局部录像故障 | [low-light-camera.js](../../src/art/low-light-camera.js)、[recording-signal.js](../../src/art/recording-signal.js) | [画质预览](http://127.0.0.1:4190/art-source/camera-quality-v2/index.html)、[合同](camera-quality-v2.md) | 独立模块，异常发现和触发由玩法侧负责 |
| 房间组合、灯光层次、材质响应 | [room-composition.js](../../src/art/room-composition.js)、[interior-lighting.js](../../src/art/interior-lighting.js)、[interior-material-response.js](../../src/art/interior-material-response.js) | [房间组合](room-composition-v03.md)、[空间光照](atmosphere-depth-v01.md) | 已有主游戏接入钩子，随此次提交交付 |
| 供奉房表面细化 | [shrine-room-finish.js](../../src/art/shrine-room-finish.js) | [说明](room-finish-v2.md) | 独立预览可用，显式槽绑定 |
| 六主题 48 间房间方案与逐房灯光 | [themed-room-library.js](../../src/art/themed-room-library.js)、[themed-room-stage.js](../../src/art/themed-room-stage.js)、[themed-room-lighting.js](../../src/art/themed-room-lighting.js) | [展示预览](http://127.0.0.1:4190/art-source/themed-room-showcase/index.html)、[制作说明](themed-room-production-v2.md)、[灯光合同](themed-room-lighting-handoff.md) | 已注册到正式随机池，新开局默认启用；[正式入口与接入说明](themed-room-runtime-pool-v1.md)。单局按条件抽取，全部 48 间美术终验仍待完成 |
| 手走廊、电线房等草稿 | [hand-corridor.js](../../src/art/hand-corridor.js)、[cable-room.js](../../src/art/cable-room.js) | [手走廊任务卡](../tasks/20261031-chen-hands-corridor-v2.md) | 草稿存档，不标为已验收正式功能 |
| 模型、恐惧素材、封面与研究 | public/art/、art-source/、docs/horror-art-direction/ | [34 件主题模型](theme-model-delivery-v02.md)、[恐惧库](fear-library-v01.md)、[恐怖模型](horror-models-v01.md)、[封面 V07](cover-posters-v07.md) | 以各资源清单的通过／隔离状态为准；隔离资产仅作研究存档，不自动加入运行池 |

## 提交边界

- 本轮开始后另一聊天提交 `c810bee`（34 件主题模型）；保留此提交并纳入普通推送。
- 六主题正式随机池适配未混入首批冻结快照；后续完成验证，按用户明确确认恢复为 `b7190e9`，28 个文件与原撤销提交完全一致，现已核实在远端 main。
- 原始模型和下载后的稳定 task.json/参考图是可重新导出的源资源，已分 5 批保存并推送。运行 GLB 保持 public/art 下现有路径，未改变尺度或碰撞。
- 本机 .tripo 上下文、生成进程锁、runner 状态、submit/watch/status 服务响应及日志保留本地。其中部分响应带临时下载签名，不进入 Git；没有删除本地文件。
- 历史 baseline、rejected、试稿与截图属于过程存档，不能当作当前运行入口或最新验收。

## 本轮验证

- 工作区初始完整测试：`npm test` 254/254 通过；`npm run build` 通过，保留既有大包提示。
- 灯光、光色情绪、闪帧／血色房、天花板、录像信号、供奉房材质、48 间旧版展示方案共 7 个专项脚本通过。
- 新增 JS/MJS 语法与 JSON 解析检查通过。提交快照复验 254/254 通过；主游戏构建及闪帧、灯光、画质、主题展示四入口独立构建通过；制作版48布局检查0项问题。
- 浏览器观察：闪帧预览 123 模型、0 失败，鬼脸检视画面可见，控制台 error 为空；灯光预览冷蓝夜光 140 模型、0 失败，实际画面可见，控制台 error 为空。两次观察为各自加载时点，不保证相同规划版本；未宣称全量视觉验收。
- 提交快照主游戏调试入口在浏览器显示卧室场景，seed 1844070019、14 房间、规划校验通过，控制台 error 为空。
- 最终正式池集成版本：`npm test` 258/258 通过，`npm run build` 通过。浏览器正式世界 seed 42 抽中 ritual-08、office-01、ritual-02，新布景 30 个及原世界 102 个模型加载成功，支撑跳过 0，规划校验通过，控制台 error 为空。
- 没有真人试玩验收；闪帧等独立模块的正式事件调用、红白分区和全部 48 间逐房美术终验仍待对应接入与验收。

## 已推送记录

以下提交均已核实包含在远端 main（本索引的最终更新提交号见 Git 历史）：

- `c810bee`：34 件主题模型。
- `f06208b`：灯光、闪帧、画质、房间美术、预览和制作资料。
- `f45acf3`、`c290c3c`、`f3c5447`、`c393d74`、`116a72a`：5 批原始模型、稳定生成元数据与参考图。
- `cb7fa25`：逐房灯光与 48 间画面检查记录。
- `b7190e9`：六主题 48 布局正式随机池接入及策划交接。

## 同步方式

策划本地无未提交改动时执行 `git pull --ff-only origin main`。若工作区有改动，先保留并核对，不要强行覆盖。推送完成后的确切提交 ID 由本次聊天交付，并可用 `git log --oneline` 查看各中文批次提交。
