# 接入已确认的《静林》B 版

- 责任方：玩法／程序方，用户明确授权接入指定音频。
- 状态：已完成本地接入与程序验证。
- 起始提交：8bf2fd077ae670f54090b9eff64cd768b25736c7。
- 修改范围：src/audio/background-music.js、src/audio/asset-output.js、src/bootstrap.js 的用户手势解锁、src/main.js 的音乐生命周期、src/ui/settings.js 与 shell.js 的音乐设置、public/art/audio/suspended-dread-b.m4a、tests/background-music.test.js、本卡。
- 资源：Suno《静林 · Suspended Dread》B，https://suno.com/song/c76e760e-36e8-42d2-9e1e-7c24b79f65ce ，用户已试听确认，2 分钟。通过账户下载的 M4A 原文件，约 2 MB。
- 行为：进入梦境循环，默认音量 35%；暂停／后台暂停时钟，续玩继续；重开／返回标题清除旧音源；结束停止。音量设为 0 可静音，设置保存于本地。
- 协作：工作区已有大量其他任务改动，保留。fetch 成功，远端领先 3 个美术提交；因本地不干净不自动合并，未声称同步完成。
- 验收条件：文件可解码、运行时播放单一循环，暂停续播和离开不泄漏，音量可配置，构建通过。
- 验证结果：17 项音频／UI 定向测试通过，生产构建通过（保留已有大包提示），git diff --check 通过。Edge 中实际解码为 119.607 秒，播放状态 running / voices=1；暂停 suspended，恢复仍只有一个音源且时钟接续；reset 后 voices=0。游戏默认梦境成功进入并暂停，设置显示音乐默认 0.35，控制台无错误。临时验证页面已移除；实际混音听感和手机实机仍待用户验收。全量 npm test 238/238 通过（本地服务测试需回环监听权限；初次沙箱执行受限后已重跑通过）。返回标题流程也通过。
- 文件 SHA-256：f49d178e4af82829013314f76994041fcb8527d797d38c9f0acbafe85c69d167。
- 交付提交：未提交、未推送、未部署。
