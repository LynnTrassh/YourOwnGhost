# Tripo 模型生成接入

日期：2026-10-31。责任方：chen 美术。

## 当前连接

本机已安装官方 `tripo-cli@0.8.1`，使用现有 Node.js v23.11.0。工具安装在项目外，没有改变项目 `package.json`、锁文件或运行时依赖。安装时指定系统证书 `/etc/ssl/cert.pem`，保持 TLS 校验。

用户已完成国际站 `ov` 授权，`tripo doctor --json` 确认认证与 API 连通性成功；首次生成前余额 3000，完成后 2960。已搜索当前插件目录，未返回 Tripo 插件；采用官方支持的 CLI 连接方式。

官方当前 CLI 使用 v3 接口。仓库[个性化流水线](../personalized-asset-pipeline.md)仍描述旧 v2 路径；本轮生成采用 v3，旧文档的修订交给其责任方，不混用请求字段。依据：[官方 CLI 文档](https://developers.tripo3d.ai/en/docs/cli)、[官方 JavaScript SDK](https://github.com/Tripo-Developer/tripo-js-sdk)。

## 首个样板

- 请求：[watcher-cat.request.json](../../art-source/tripo/watcher-cat.request.json)。
- 美术依据：[恐怖元素框架](horror-framework.md)与用户参考图。
- 生成对象：完整、原创的门边猫形窥视者；从参考提取风格，以文字生成独立角色，未上传三联场景图。
- 模型：显式选择低多边形 `tripo-p1`；已通过官方 CLI dry-run，实际模型版本为 `P1-20260311`，请求路径为 `/v3/generation/text-to-model`。计划无参数警告、输出目标为 GLB；已完成一次真实生成，实际消耗 40 积分。
- 数量：单个候选；目标约 6000 面、标准贴图与 PBR。目标面数必须下载后复查。
- 输出目标：GLB；先保存到 `art-source/tripo/output/` 作为生成源，完成格式与视觉检查后再导出到 `public/art/generated/`。
- 尺寸与接口目标：米制、约 1.98 m 高、`-Z` 前向、脚底中心原点。生成结果需要归一化和朝向检查，不能把提示词当作尺寸保证。
- 动画状态：本次先生成静态造型；窥视待机、追逐、骨骼与动画属于后续独立任务。

## 登录与任务恢复

根据用户实际账号选择其中一个登录入口，不能按语言推断站点：

```sh
NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem tripo login --region ov
# 或使用国内站：tripo login --region cn
```

CLI 提供设备授权链接与一次性验证码，用户在浏览器中完成登录和授权。密钥由官方工具保存在本机用户配置中，不写进仓库、浏览器代码或聊天。若采用环境变量密钥，则还需设置与账号一致的 `TRIPO_REGION`；`.env.tripo.local` 不会被 CLI 自动加载，需要明确加载后再调用。

本机 Node 默认信任链连接授权服务失败，增加系统证书后成功。后续联网命令同样使用 `NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem`，保持证书校验。

登录后执行 `tripo doctor --json`，确认认证、联网和余额。无须注册第二个账户；余额不足时报告实际结果，不自动充值。

首次提交前使用 `tripo make ... --dry-run --json` 校验方案。本轮[校验计划](../../art-source/tripo/watcher-cat.plan.json)已保存，`valid=true`，无上传或付费调用。P1 的 CLI 费用估计为未知，不当作免费。真实扣费以任务结果或 `tripo usage` 为准。

创建一次任务后保留 task ID。等待超时或下载失败只恢复同一任务：

```sh
tripo task watch <task-id> --download --json
```

提交本身网络超时或 5xx 且没有 task ID 时，先检查本地历史和账户任务，禁止为恢复而反复重新生成。完成后记录实际模型版本、请求参数、task ID、模型文件、预览、文件大小、实际面数、贴图和可查询的费用。

## 资产检查与接入

1. 核对返回文件确实为可读 GLB，检查嵌入资源、实际大小与面数，不把错误页或其他格式改后缀使用。
2. 用本地预览检查完整轮廓、面部、手脚、背面、材质及是否意外生成房间；生成服务提供预览时也要检查。
3. 检查并归一化尺度、朝向和原点，记录实际包围盒。若超出现有计划占位，交给程序方调整计划与碰撞后再接入。
4. 保存运行资源到独立新路径，附任务来源与实际状态；不覆盖现有程序化猫怪或其他任务的 GLB。
5. 游戏中的 B12 仍由程序控制观察后回看靠近一次，模型不自行改变地图、伤害或剧情状态。

实际进度见[任务卡](../tasks/20261031-chen-tripo-generation.md)。

## 实际结果与图片确认门槛

- 首模 task ID：`2fffe244-5710-4d01-8da2-d91f0c2b9f84`；结果见[运行记录](../../art-source/tripo/watcher-cat.run.json)。原始 GLB 3,985,844 字节、5683 三角面、3 张嵌入贴图、无骨骼和动画。
- [本地交互预览](http://127.0.0.1:4190/art-source/tripo/preview.html)已实际加载。旧导出为 1.98 m 高，包围盒 1.62 × 1.98 × 0.76 m；当时朝向尚有偏差，正面按钮看到侧面。当前预览已切换到已校正朝向的 v2。该候选材质反光偏强、尾巴过长，用户未认可，不可作为已验收运行资产。
- 用户明确要求：**先生成对应图片，用户确认 OK 后，才调用 Tripo API 生成模型。** 此要求适用于后续生成；不得以此前登录授权或生成授权代替图片确认。
- 使用内置 imagegen 生成两版确认图：[v1](../../art-source/tripo/watcher-cat-approval-v1.png)偏怪萌；按用户“诡异、掉 san”要求调整后的[v2](../../art-source/tripo/watcher-cat-approval-v2.png)采用异常头颈比例、不对称凹眼窝、过长四肢和干燥哑光拼接表面。v2 随后获得用户明确确认，并已作为 Tripo 第二次生成的输入。
- [完整图像提示词与审批状态](../../art-source/tripo/image-approval.json)。图片用于美术方向审核，确认后还需考虑中立姿势与关节对生成、绑定的影响。
- 本轮未接入游戏、未新增依赖配置、未提交或推送；未做真人试玩。

## 已确认图片生成的 v2

- 用户确认原话：“对 这个好。出一个这个模型。”只使用其认可的 `watcher-cat-approval-v2.png` 进行一次 image-to-model。
- task ID：`9dfda88f-5811-4213-bb1b-895cc8b7d5d2`；P1-20260311，6000 面目标、标准彩色贴图、`pbr=false`；实际消耗 **50 积分**。
- [请求](../../art-source/tripo/watcher-cat-v2.request.json)、[计划](../../art-source/tripo/watcher-cat-v2.plan.json)、[结果](../../art-source/tripo/watcher-cat-v2.run.json)、[原始模型](../../art-source/tripo/output/watcher-cat-v2/model.glb)。
- [导出 GLB](../../public/art/generated/watcher-cat-v2.glb)：1,387,476 字节，5912 三角面，1 张嵌入颜色贴图，1 个网格/材质，无骨骼/动画。原图约 1.8 MB，为已确认的图生模型输入；原始 GLB 保留约 1.3 MB，运行导出约 1.3 MB。
- 米制，高 1.98 m，前向 `-Z`；原点为整体包围盒底部水平中心（非单独足底接触区域中心），包围盒 min `[-0.404912, 0, -0.513405]`、max `[0.404912, 1.98, 0.513405]`，宽高深约 **0.81 × 1.98 × 1.03 m**，含歪头与尾巴。碰撞不可直接沿用旧猫尺寸，交程序方独立接入。
- 源模型保持不变。导出时统一尺度、绕 Y 轴旋转 90° 并居中；材质设置 `metallicFactor=0`、`roughnessFactor=1`，保留色彩图案。复现命令：`node art-source/tripo/prepare-model.mjs art-source/tripo/output/watcher-cat-v2/model.glb public/art/generated/watcher-cat-v2.glb 1.98 90 matte`。
- [交互预览](http://127.0.0.1:4190/art-source/tripo/preview.html)已切换 v2，提供正侧背视图、旋转缩放和两种灯光；[浏览器截图](../../art-source/tripo/watcher-cat-v2-preview.jpg)。该开发预览需本地 Vite 服务运行。
- 浏览器实际观察：歪头、长颈、大小眼窝、细长手臂保留；背面纹理较少，是单图生成的推断结果。尚无用户对最终模型的验收。当前是静态姿势，绑定动画需后续处理。未运行自动测试/构建，未接入游戏或真人试玩。
