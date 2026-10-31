# AB01 空下来的群体切片

- 责任方：玩法／程序方
- 状态：程序与表现灰盒已接入；正式美术、声音和完整自然路径验收待补
- 起始提交：f538fbb（本地工作尚未提交）
- 空间：只落在有自然回路、能看清至少六只活猫的合法房间；九只猫不增加碰撞，水碗与位置痕迹属于同一实例。与 CAT01 在整局层面互斥，不把消失改成死亡。
- 事实链：先连续看清活猫，正常跨门离开才切换为空房；死亡传送、未观察离开均不切换。回访看清水碗后播放一次“啊，你回来晚了一点。”，初见句为“这回，都在这儿了。”。阶段与字幕消费在同层死亡后保留。
- 程序范围：`src/planning/content-catalog.js`、`src/planning/content-fit.js`、`src/planning/composition.js`、`src/planning/validate.js`、`src/story/runtime.js`、`src/rendering/story-proxies.js`、`src/main.js`、`src/preview.js`、`tests/ab01.test.js`。
- 自动验证：`node --test tests/ab01.test.js` 与 `npm run build` 通过；全套测试复跑中。浏览器 `seed=12&preview=AB01&like=none` 确认初见九只猫与水碗、模拟正常离开后猫消失、九处地面痕迹和水碗保留、回访字幕出现。独立预览不代替真人自然路线。
- 遗留：猫、碗与痕迹仍为简模，声音、回访可读性和真人自然路径尚未最终验收。
