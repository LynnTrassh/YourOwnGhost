# S05：录音资产播放接口

- 责任方：玩法／程序方
- 状态：接口切片完成；S05 整卡未验收
- 修改范围：`src/audio/asset-output.js`、`tests/asset-audio.test.js`、技术框架及 S05 卡
- 目标：只接受明确登记的本地录音文件，建立可复用的浏览器音频解锁、解码、分总线、静音、暂停续播与资源释放接口。

## 接口与资源约定

`createAssetAudioOutput(manifest)` 接受以 `assetId` 为键的清单。每项需要 `/art/audio/` 下的录音 URL、`narration/world/critical/ambience` 总线及 `authoredDuration`，可选 `loop`。URL 指向美术资源目录，但本任务没有在该目录写文件。调用方先 `setActive(true)`，在用户手势内 `unlock()`；可按需 `prepare(id)`，再 `play(id, {mix})`。`mix` 接受已有空间计算的 gain、pan、cutoff。暂停用 `setActive(false)` 挂起音频时钟，恢复后原声继续；局重建调用 `reset()`，离开页面调用 `dispose()`。加载失败或未登记时保持静音，不生成替代音色。

## 已验证和待验收

- 定向测试覆盖非法清单、缺资产静音、重复加载合并、总线与空间参数、静音、暂停续播、释放、失败加载以及暂停／重建后的迟到回调。
- 本轮 `npm test` 129/129、`npm run build` 和 `git diff --check` 通过；构建仍有既有的大包体积提示。无录音文件，未进行浏览器试听。
- 当前仓库没有可用录音，运行入口仍未启用声音。没有实际听感、空间落位及 S05 指定的关键声验收；`authoredDuration` 目前只用于清单校验，尚未驱动剧情独占窗口。
- 接入前须确定各声源录音与版本，映射场面事件、关键声独占和旁白调度，随后在浏览器验证解锁与音量、实际听感、暂停和跨层重建。
