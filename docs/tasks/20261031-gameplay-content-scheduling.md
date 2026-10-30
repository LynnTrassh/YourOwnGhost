# 剧情分池与探索内容编排

- 责任方：玩法／程序方
- 状态：已完成（编排设计；运行实现待后续任务）
- 起始提交：4bdd3cd
- 目标：逐项安排基础场面与扩展剧本的输入依赖、随机分布、内容密度和近期制作顺序，解决当前探索内容稀疏的问题
- 修改范围：docs/content-scheduling.md、docs/script-catalog.md、docs/game-design-v0.2.md、docs/room-generation.md、docs/technical-architecture.md、docs/production-rules.md、docs/development-log.md、本任务卡
- 依赖与交接：只调整设计与开发安排；保留现有代码及其他任务的未提交修改；美术需求按单个场面交接，不代 chen 承诺排期
- 验收条件：CAT01、B01–B28 与 28 个扩展剧本无遗漏；输入依赖和可选关联分开；明确主要事件、短场面、喘息、连接空间及依赖互斥；写明当前未实现部分
- 验证结果：逐项核对 CAT01、28 项基础场面和 28 个扩展剧本，共 57 条，编号均对应剧本总集，无遗漏或重复；检查 7 份文档的相对文件链接目标与 Git 差异。远端读取成功，HEAD 与 origin/main 均为 4bdd3cd；保留既有未提交修改。本次只修改文档，未运行代码测试／构建，也未声称内容密度已在运行版本实现或通过试玩。
- 交付提交：未提交
