# 首轮源码调查与最小改造计划

2026-10-31，初查基于 `f90d9f0`，推送前快进同步到 `1f3085e` 并重新核验；本地现有美术改动保留。本轮完成资料导入、只读调查、研究与设计，不更改运行代码。用户明确房间主题可以继续增加，六主题是当前实现快照，七类是首轮研究样本，均不构成设计上限。下一步最小候选为卧室桌面关系；走廊灯色与供奉室缺位分别评审，避免一次修改多种因素。

## 实际实现与文档差异

| 证据文件 | 已确认事实 | 对本次方案的影响 |
|---|---|---|
| [README](../../../README.md)、[房间设计文档](../../room-generation.md) | Three.js/Vite、固定出生房和两层梦境；部分 README/旧美术文档仍保留早期状态 | 当前是否实现以源码和实测为准，不能照抄旧“未实现”结论 |
| [generate.js](../../../src/planning/generate.js)、[dream.js](../../../src/planning/dream.js) | 种子子流、候选校验、有限重试、两层内容再拟合；`planHash` 由计划生成 | 复现要固定输入和版本；`generatePlan(seed)` 与 `generateDream(seed)` 不能混为相同上下文 |
| [room-presets.js](../../../src/planning/room-presets.js)、[interiors.js](../../../src/planning/interiors.js) | 当前登记六主题；家具带 prefabId、AABB，出生卧室固定 | 七张概念图不是七个运行 ID；新主题后续可按接口登记，本轮不改规划文件 |
| [content-catalog.js](../../../src/planning/content-catalog.js)、[composition.js](../../../src/planning/composition.js)、[content-fit.js](../../../src/planning/content-fit.js) | 内容具有角色、条件、互斥和空间拟合；本 seed 有明确实例 | 不将具体人形作为无条件房间装饰 |
| [world.js](../../../src/world.js) | 已调用 `createDarkInteriors`，暴露 `artReady` 与 `artStats` | 家具运行模块确已接入；本轮不接管公共入口 |
| [interior-catalog.js](../../../src/art/interior-catalog.js)、[interior-models.js](../../../src/art/interior-models.js) | 36 个运行模型条目，路径指向 v03；模型按现有占位装配 | 资产已有运行版本，不需要重新生成整批家具；路径存在检查不等于全部解码检查 |
| [dark-interiors.js](../../../src/art/dark-interiors.js) | 家具、灯具、窗、帷幕与陈设组合，读取计划布局 | 最小接入应复用锚点，不重抽家具 |
| [interior-surfaces.js](../../../src/art/interior-surfaces.js)、[wall-decor-layout.js](../../../src/art/wall-decor-layout.js) | 六套 ROOM_LOOKS、v03 纹理、墙面槽位与合批 | 装饰窗只是贴墙资产，不保证窗后有真实可视空间；U06 必须单独验证 |
| [room-detail-dressing.js](../../../src/art/room-detail-dressing.js)、[interior-lighting.js](../../../src/art/interior-lighting.js) | 已有桌面簇、支撑面处理、局部灯光 | 与正在进行的陈设/性能任务重叠，后续接入须交接具体文件 |
| [main.js](../../../src/main.js) | 72° FOV、站立 1.65 m、俯仰 ±1.35 rad、曝光 1.1025 | 不以艺术预览的自由机位代替玩家机位 |

`art-source/room-presets/style/dark-scenes-v02/` 是七张静态概念图；`models-v02/scene-preview.html` 调用真实 world，但使用 seed 42、主题覆盖和 65° OrbitControls 预览机位，不能冒称本 seed 的玩家截图。`src/preview.js` 是场面预览，可能重新拟合内容，也不能当普通游玩同状态。当前剧情多为灰盒，美术模型接入不代表剧情最终表现完成。

## 固定种子检查

两次分别调用 `generateDream('1844070019', options)`，对完整结果做 JSON 相等检查。默认菜单选项、跳过喜欢/通用恐惧选项两组各做两次，全部相同；原始结果见 [SEED_AUDIT.json](SEED_AUDIT.json)。

| 层 | 实际 seed | 房间数 | planHash | 生成校验 |
|---|---|---:|---|---|
| 1 | 1844070019 | 12 | e7595c71 | valid，非保底 |
| 2 | 1844070019:dream:2:0 | 11 | 639ffada | valid，非保底 |

当前两层合计包含六主题；试点为第一层 `bedroom`、第二层档案室 `room-1` 的通道段、第一层供奉室 `room-1`。门的归属需用 door.cells 与 room.cells 匹配。站位和模型视线仍需实机确认，纯数据相等不等于画面像素相等或事件已走通。

复核命令（从仓库根运行；本轮已执行等价检查）：

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { generateDream } from './src/planning/dream.js';
import { contentTokensForInputs } from './src/personalization/content-tokens.js';
const options = { catEnabled: false,
  preferences: contentTokensForInputs('none', 'generic'), threatBehaviorId: null };
const a = generateDream('1844070019', options);
const b = generateDream('1844070019', options);
assert.deepEqual(a, b);
console.log(a.map(p => [p.seed, p.rooms.length, p.planHash, p.validation.valid]));
JS
```

## 最小文件改动建议

下表为后续实施清单，本轮没有创建这些运行文件或接口。

| 阶段 | 建议文件与最小变动 | 依赖与验收 |
|---|---|---|
| 1 选点预览 | 新增独立 `art-source/horror-composition-v01/` 预览，读取真实 dream，选择 roomId，记录玩家相机与 A/B 参数 | 不改规划或 public；先验证三观察点可达，再固化坐标 |
| 2 卧室单点 | 新增 `src/art/horror-composition.js`，提供创建/释放接口；对已提供的家具锚点描述一组书杯关系 | 先和陈设任务明确谁调整该组小物，防止重复装饰；不写 state 或新增随机 |
| 3 组合接入 | 由当前责任方在 `dark-interiors.js` 传入 plan/已装配锚点，在既有 resources 中管理释放 | 此文件当前有其他任务改动，本轮只写交接，不能覆盖；不需要修改 world |
| 4 灯色预览 | 在独立预览中以房间为单位覆盖既有灯色，保存 A/B/C 和实际值；确认后由灯光责任方接入参数 | 不直接改全局 ROOM_LOOKS 导致所有房间变化；保持灯数和阴影预算 |
| 5 供桌缺位 | 复用现有桌面装饰的实例范围/支撑面，单桌留空 | 视线、碰撞、事件占位复验；新增模型优先为 0 |

接口建议仅为设计：创建接口输入 `{ plan, roomId, furnitureAnchors, root, resources, recipeId }`，返回 `{ dispose, diagnostics }`；实例数据由调用方提供，缺锚点就跳过并写诊断。不得再随机决定布局，不得修改传入 plan，不承诺这些字段目前已存在。

## 回归与验收顺序

主题扩展接入：美术方提供新主题资源清单、稳定 prefab 映射、尺度和 ROOM_LOOKS 候选；程序方在 `room-presets.js` 登记主题并检查生成/事件适配，必要时更新占位；美术方在独占交接后扩展 catalog、surfaces 与 dressing。新增主题不必新增房壳，也不能假设所有现有轮廓都适配。详见 [开放主题候选](ROOM_RECIPES.md)。

1. 实施前重新 fetch、检查工作区和目标文件，核对 [陈设任务](../../tasks/20261031-chen-room-detail-quality.md) 与 [性能任务](../../tasks/20261031-chen-interior-performance.md) 的交接。当前新增文档不占用它们的路径。
2. 固定本 seed、相同输入、相同 roomId/planHash，固定视口、FOV、曝光、手电/VHS/微动；记录 entry/notice/recheck 的坐标和 yaw/pitch。已有初查出生点基线；正式 A/B 仍需固定更新版本重采。
3. 每轮只改变一个因素，截图 baseline 与 candidate；U03 三组灯色保留完全相同的几何与观察点。无法在合法站位观察就取消该方案。
4. 检查所有相关门洞、玩家路线、场面交互与跨层状态；重复两次同种子。新增视觉不增加碰撞，仍须检查视觉外形是否超占位。
5. 可运行接入运行 `npm run build`；涉及玩法/规划/碰撞时由责任方运行 `npm test`。记录资源加载失败、绘制次数与同条件帧耗；本轮纯文档不把其他任务的性能结果算作本次收益。
6. 填写 [QA 清单](QA_恐怖房间生成审美检查清单_v1.1.md) 与 [评审记录](REVIEW.md)。人工试玩单列，不将浏览器观察写成真人验收。

## 风险与交接

当前工作区包含其他任务尚未提交的灯光支撑面、墙体合批和陈设优化。卧室基线来自这份本地工作区，不保证只检出 `f90d9f0` 会得到逐像素相同画面。后续正式 A/B 必须等相关运行修改提交后重新采样。所有导入参考图留在 docs 下，不进入 public、运行 manifest 或游戏发布包。

U01 的二层、U02 的肢体事件、U05 的动态投影和 U06 的真实窗后深度均不属于本轮最小实施。涉及新空间、角色或事件时需具体设计与程序交接，不能由研究文档扩大权限。

## 远端同步后的复核

推送前 origin/main 从 f90d9f0 前进到 1f3085e，新增两次提交。远端修改与原有本地未提交美术文件无路径重叠，执行快进并逐文件验证原有已跟踪改动哈希保持一致，没有 stash、覆盖或替别人提交。

远端将美术选型从布局随机流分离，所以相同种子的主题和场面选择发生版本变化。初查数据保留于 [SEED_AUDIT_INITIAL.json](SEED_AUDIT_INITIAL.json)，最新数据为 [SEED_AUDIT.json](SEED_AUDIT.json)。这是版本差异，不是同版本非确定性。配方已重绑定房间：原第一层 room-11 现在为卧室，不再把它称作供奉室。源码相机参数未变。同步后运行全量测试和构建，结果见 [评审记录](REVIEW.md)。
