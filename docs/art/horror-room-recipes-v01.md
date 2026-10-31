# 恐怖组合房间预设库 V01

日期：2026-10-31。责任方：chen 美术，本对话。用户明确本对话负责恐怖组合方案和可供策划调用、修改的预设。

## 首套：crt-records / 旧电脑录入室

恐惧机制：工作人员全部缺席，工位依然整齐通电；电脑重复排列形成秩序，显式切换屏幕与照明状态破坏可信度。保持黑暗和物件辨识度。

| 状态 ID | 表现 | 建议用途 |
| --- | --- | --- |
| night | 灰绿色屏幕，旧绿白顶灯，弱红指示灯 | 进入时的日常基线 |
| sync | 屏幕一起变亮、顶灯退暗 | 外部事件触发后的整房同步异常 |
| blind | 尽头一排屏幕熄灭，其余偏冷，红指示灯增强 | 玩家接近或回望时制造视线缺口 |

房间灯色状态仍由策划显式切换。电脑已追加通用标志／雪花／花屏播放序列，详见 [屏幕播放器](crt-screen-playback-v01.md)；没有自动游戏事件、声音、动态人物或摄像头监视内容。

## 文件与接口

- 方案：[horror-room-recipes.js](../../src/art/horror-room-recipes.js)。`HORROR_ROOM_RECIPES` 是可编辑定义；`proposeHorrorRoom(id, options)` 返回纯数据，不修改地图。
- 表现：[crt-room.js](../../src/art/crt-room.js)。`createCrtRoom({proposal,parent})` 返回 `ready / setVariant / inspect / dispose`。
- [独立预览](../../art-source/horror-room-recipes-v01/index.html)：两种规模、三种状态、入口／走近／回望机位、手电开关、JSON 导出。
- 浏览器：`http://127.0.0.1:4190/art-source/horror-room-recipes-v01/index.html`。

```js
import {proposeHorrorRoom} from './art/horror-room-recipes.js';
import {createCrtRoom} from './art/crt-room.js';

const proposal = proposeHorrorRoom('crt-records', {
  width: 10, depth: 10, rows: 4, columnsPerBank: 1, aisle: 1.8,
  exclusions: [], // 房间局部坐标下的门口、事件和已有家具保留矩形
});
// 程序方先验证并接受 proposal，建立家具碰撞；随后创建表现。
const art = createCrtRoom({proposal, parent: roomLocalRoot});
await art.ready;
art.setVariant('blind'); // 外部选择时机
// 房间卸载：art.dispose();
```

`parent` 必须是房间局部根节点，可以整体平移或旋转；碰撞与保留区域需要相同坐标变换。不要再为这些 placements 叠加普通家具渲染器。

## 尺度、参数与空间约束

- 米制，原点为地面中心，Y 向上，入口在 +Z，向室内看为 -Z；房间高 3 m。
- 默认 10×10 m、4 排、左右各 1 列，共 8 工位；大版 15×15 m、4 排、左右各 2 列，共 16 工位。
- 可改 `width` 8–15、`depth` 10–15、`rows` 2–5、`columnsPerBank` 1–2、`aisle` 1.5–3 m。排距小于 2.1 m 拒绝生成，不能强挤。
- 每工位使用 1.28×0.82×1.26 m 桌组及 0.44×0.46×0.96 m 椅子（宽×深×高）。返回 `size` 是宽×高×深，`bounds` 为真实提议占位。
- 桌椅之间的工作区一同作为 reservation；不适配墙边、中央通道或 exclusions 时整组拒绝，返回 `rejected`。默认中央净通道 1.8 m。
- 仅提供矩形房间方案。凹形房、侧门通路、现有遮挡／追逐／事件／视线条件必须由主规划器额外验证；`status` 明确为 proposal-requires-planner-validation。
- 预览的房壳、出口示意、环境填充与手电属于样板。正式房壳／门和全局照明由游戏提供。

## 资产与灯光预算

复用另一任务制作的 `prop-computer-desk-v01` 与已有 `furniture-dining-chair`，没有改写 GLB 或调用 Tripo。普通模型资源共享；屏幕播放扩展为每台独立玻璃材质／UV 克隆，共享一条时间线的动态纹理，切换不污染缓存原材质。

独立模块固定 4 盏不投影的局部点光：2 顶灯、1 尽头红指示、1 局部屏幕溢光。屏幕自身走 emissive；预览手电是额外的 1 盏聚光。正式接入需纳入游戏可见房间／光源预算，不能所有离屏房同时亮灯。此版未做 GPU 实例化或 FPS 基准。

灯色与增益在 `HORROR_ROOM_RECIPES['crt-records'].variants` 修改；灯位置和基准强度在 `crt-room.js`，策划可按表修改。当前玻璃按模型材质名 `glass` 绑定；更换模型需确认这个接口。

## 联网研究与原创转译

下表日期均为 2026-10-31；仅研究文本和作品说明，未下载或复制受版权保护资产，未声称对全部原作镜头做过逐帧检查。

| title / medium / verified_url | evidence_level | spatial_mechanism / fear_mechanism | room_application / what_not_to_copy / asset_rights |
| --- | --- | --- | --- |
| [Severance 美术指导 Jeremy Hindle 访谈](https://www.motionpictures.org/2022/06/severance-production-designer-jeremy-hindle/)；电视剧制作访谈 | 主创直接访谈；讨论定制桌、电脑、色彩和走廊 | 工作秩序与隔离感 | 本项目转译为密集重复工位；原剧四桌大留白不是本预设布局。不得复制 Lumon 标识、专有电脑和原场景；仅参考。 |
| [Stuart Macdonald：Developing Control’s Brutalism](https://machinefire.artstation.com/projects/xzynYY)；游戏世界设计作者作品页 | 作者自述；部分是早期概念而非实际关卡 | 体量、重复层级与机构空间 | 转译为重复工位和明确纵深；不照搬概念平面、造型或纹理；仅参考。 |
| [Adobe：Control 材质库制作访谈](https://www.adobe.com/products/substance3d/magazine/control-how-one-senior-environment-artist-created-entire-brutalist-material-library.html)；专业环境美术访谈 | 制作人员直接讲述 | 形体、材料、照明共同建立空间气氛 | 转译为克制的旧绿灰材料与局部灯源；屏幕同步和熄灭是本项目推演，不是该访谈中的机制；仅参考。 |

## 观察记录与交接状态

- JS 语法检查与 `git diff --check` 通过；`npm run build` 成功，仍有已有大 chunk 提示。未新增／运行单元测试。
- 小版 8 工位／16 模型，大版 16 工位／32 模型，浏览器均 0 加载失败；最后 console 无 error/warn。已观察三种状态及入口、走近、回望，截图和导出报告在 [reviews](../../art-source/horror-room-recipes-v01/reviews/)；约 0.5 MB。
- 独立样板完成；主游戏分配、事件触发、碰撞和连通性验证待策划／程序接入。没有真人试玩验收。本轮已获提交授权；未推送。
- 后续组合预设沿用“正常功能 → 重复／遮挡组织 → 整房异常状态 → 通路／预算 → 调用参数”结构。满手、玩偶、线缆可引用其他任务模块，各自成熟后再成为独立配方，不在本次伪称已完成。
