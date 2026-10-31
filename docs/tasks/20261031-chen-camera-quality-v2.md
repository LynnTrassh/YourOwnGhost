# 空间／摄影机／信号分层

- 责任方：chen 美术，本环境导演聊天。
- 状态：进行中。
- 起始提交：40c4afc；沿用本轮 fetch 0/0。
- 用户目标：恐怖空间、常驻微弱摄影机缺陷、局部叙事信号故障独立控制。完整阅读 CODEX_VHS_POSTPROCESS_REFERENCE.md；文档作为设计资料，用户最新明确要求优先，不随机触发故障。
- 范围：src/art/low-light-camera.js、src/art/recording-signal.js、art-source/camera-quality-v2/、docs/art/camera-quality-v2.md、本卡；自己的 horror-director-v2-preview 接独立预览。
- 接口：策划显式触发、更新区域和取消；不自行判定异常可见性、不写规划／事件。保留正式 vhs-effect.js、main.js、index.html 与用户设置。
- 验收：A 原图、B 调色、C 加噪声、D 完整基础质感、E 明亮环境，同机位输出；总开关、颗粒及抖动开关、时间与释放；构建、色彩链核对、GPU 可测则测，无法测时标未知。
- 交付提交：未提交、未推送。
