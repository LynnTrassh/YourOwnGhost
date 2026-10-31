# Tripo 后端与模型加载适配

- 责任方：玩法／程序方 API 任务
- 状态：静态模型 API／加载切片已实现；新收费生成与世界绑定待验证
- 起始提交：d82c5b0b0b63d9ff4d056f938be92f2c93e9ec40（共享工作区保留其他任务改动）
- 用户授权：接入 Tripo；继续推进。费用上限已问询，未收到具体额度，本轮未新建收费任务。
- 修改范围：server/providers/tripo.js、server/model-jobs.js、server/assets/store.js、server/tripo-check.js、server/start.js、server/app.js、src/assets/、tests/api/tripo.test.js、tests/api/generated-model.test.js、tripo-validation.html、package.json（启动和检查脚本）、本卡与 docs/tripo-api-integration.md。
- 依赖与交接：main/world/planning 当前由协调任务持有，本轮未写入；独立加载接口已交付。src/art/public/art 只读，未改现有模型。图片确认和积分授权通过本地服务配置，不接受浏览器或模型自报批准。
- 验收条件：真实认证与只读API；去重、预算、提交未知、查询恢复、过期隔离、资源权限；真实GLB浏览器显示和释放；专项测试、构建。
- 验证结果：见 ../tripo-api-integration.md；最终专项42/42，正式入口及独立预览构建通过，真实余额API通过，旧任务404；已有GLB浏览器加载与释放通过。
- 交付提交：未提交、未推送；不合并远端美术。
