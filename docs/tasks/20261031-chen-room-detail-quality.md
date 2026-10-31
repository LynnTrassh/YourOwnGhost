# 六主题房间陈设与表面质感

- 责任方：chen 美术，本聊天“评估网页渲染质感”。
- 状态：进行中。
- 起始提交：bf4df8268293bb5a47a0bdb25690879e68194247。
- 目标：提升现有六种主题的生活细节、表面质感和家具落地感；保留黑暗基调与通行/剧情空间。
- 用户授权：用户明确要求与另一个窗口一起完善美术质量、填充房间。
- 修改范围：新增 `src/art/room-detail-dressing.js`、`src/art/surface-detail-materials.js`；`art-source/room-detail-quality/` 检查工具、截图及本任务卡；`src/art/dark-interiors.js` 的最小接入。
- 分工确认：对方已在 `20261031-chen-interior-performance.md` 明确不编辑 dark-interiors.js，陈设任务负责接入。用户再次要求同步后已补发双方文件范围与远距显示注意事项。
- 协作：已向“梳理28种惊吓方式与剧情”发送分工。本聊天负责日常小物、接触阴影、独立表面细节模块；对方负责性能、墙面批处理和新恐怖场景图。不改公共入口、规划、碰撞与剧情，也不并行编辑对方的 `interior-surfaces.js`、`interior-lighting.js`、`vhs-effect.js`。
- 接入接口：表面细节模块提供 `createSurfaceDetailMaterials({ resources })`，返回 `apply(material, surfaceId)`；以调用方已有颜色贴图为基础，仅设置共享程序化微表面 bumpMap/roughnessMap 与适度粗糙度，不增加宏观污损。对方可在创建墙地面材质后调用。
- 资源预算：复用现有 GLB，不调用收费模型生成；新增小物由可复用低面数几何表达，同一家具按材质合批，预计每组最多 4 个实体绘制批次。程序化微表面使用小型共享数据贴图，不新增大图片或依赖。
- 空间：陈设放在已有家具水平占位与预留高度内；地毯贴地，不增加碰撞；不新增家具堵路，不改变灯具、门洞、故事对象或模型资源路径。
- 同步：main；fetch 成功，HEAD 与 origin/main 0/0；暂存区空，已有其他任务的未提交改动全部保留。
- 验收：六主题可辨识、无悬空穿插、布局确定、资源可释放；相关专项脚本和 build 通过，游戏内/实际 world 检查页截图单独记录。
- 验证结果：待完成。
- 交付提交：未提交，未推送。
