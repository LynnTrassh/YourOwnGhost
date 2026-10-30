# 心里有鬼 Your Own Ghost

以个人喜好与恐惧为素材的第一人称梦境恐怖游戏。使用 Three.js、Vite 与 JavaScript ES Modules 开发。

## 本地运行

使用 Node.js 24 LTS，首次运行安装依赖：

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:4190/ 。服务仅监听本机。

点击进入后按 E 起身，WASD 移动，鼠标环顾；靠近并看向门时按 E 开门，F 开关手电，Esc 暂停。无法锁定鼠标的浏览器可选择拖动视角模式。暂停菜单支持调整灵敏度与重新开始。刷新会重置当前进度。

## 当前范围

卧室与起居室的固定场景，起身、移动、墙体及家具碰撞、单向开门、手电、暂停及重新开始。场景以程序化几何搭建，尚无猫房、怪物、假醒、声音、AI 服务或完整通关流程。

## 验证与构建

```sh
npm test
npm run build
npm run preview
```

构建输出位于 `dist/`，预览地址为 http://127.0.0.1:4191/ 。

- `src/state.js`：独立的游戏状态。
- `src/collision.js`：平面碰撞与分步移动。
- `src/world.js`：场景、灯光、门表现及碰撞体。
- `src/main.js`：输入、游戏循环与界面。
- `tests/`：碰撞和状态测试。
- [游戏设计文档 v0.2](docs/game-design-v0.2.md)
- [剧本总集](docs/script-catalog.md)
- [制作与技术规则](docs/production-rules.md)
- [技术框架](docs/technical-architecture.md)
- [剧本与旁白运行规范](docs/script-narrative-runtime.md)
- [随机房间与内容编排](docs/room-generation.md)
- [开发记录](docs/development-log.md)

Three.js 与 Vite 的版本由锁文件固定；第三方依赖遵循各自附带的许可。
