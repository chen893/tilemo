<p align="center">
  <img src="apps/web/public/icon.svg" width="84" alt="今天提了么" />
</p>

<h1 align="center">今天提了么 (Tilemo)</h1>

<p align="center">
  每日提肛（凯格尔 / 盆底肌训练）打卡与引导训练工具。<strong>离线 · 本地 · 私密</strong>。
</p>

<p align="center">
  <a href="https://github.com/chen893/tilemo/stargazers"><img src="https://img.shields.io/github/stars/chen893/tilemo?style=social" alt="GitHub stars" /></a>
  <img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-E85A4F?style=flat-square" alt="platform" />
  <a href="https://tilemo-web.vercel.app/"><img src="https://img.shields.io/badge/live-tilemo--web.vercel.app-2B2320?style=flat-square" alt="live" /></a>
  <a href="https://linux.do" alt="LINUX DO"><img src="https://img.shields.io/badge/LINUX-DO-FFB003.svg?logo=data:image/svg%2bxml;base64,DQo8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiPjxwYXRoIGQ9Ik00Ni44Mi0uMDU1aDYuMjVxMjMuOTY5IDIuMDYyIDM4IDIxLjQyNmM1LjI1OCA3LjY3NiA4LjIxNSAxNi4xNTYgOC44NzUgMjUuNDV2Ni4yNXEtMi4wNjQgMjMuOTY4LTIxLjQzIDM4LTExLjUxMiA3Ljg4NS0yNS40NDUgOC44NzVoLTYuMjVxLTIzLjk3LTIuMDY0LTM4LjAwNC0yMS40M1EuOTcxIDY3LjA1Ni0uMDU0IDUzLjE4di02LjQ3M0MxLjM2MiAzMC43ODEgOC41MDMgMTguMTQ4IDIxLjM3IDguODE3IDI5LjA0NyAzLjU2MiAzNy41MjcuNjA0IDQ2LjgyMS0uMDU2IiBzdHlsZT0ic3Ryb2tlOm5vbmU7ZmlsbC1ydWxlOmV2ZW5vZGQ7ZmlsbDojZWNlY2VjO2ZpbGwtb3BhY2l0eToxIi8+PHBhdGggZD0iTTQ3LjI2NiAyLjk1N3EyMi41My0uNjUgMzcuNzc3IDE1LjczOGE0OS43IDQ5LjcgMCAwIDEgNi44NjcgMTAuMTU3cS00MS45NjQuMjIyLTgzLjkzIDAgOS43NS0xOC42MTYgMzAuMDI0LTI0LjM4N2E2MSA2MSAwIDAgMSA5LjI2Mi0xLjUwOCIgc3R5bGU9InN0cm9rZTpub25lO2ZpbGwtcnVsZTpldmVub2RkO2ZpbGw6IzE5MTkxOTtmaWxsLW9wYWNpdHk6MSIvPjxwYXRoIGQ9Ik03Ljk4IDcwLjkyNmMyNy45NzctLjAzNSA1NS45NTQgMCA4My45My4xMTNRODMuNDI2IDg3LjQ3MyA2Ni4xMyA5NC4wODZxLTE4LjgxIDYuNTQ0LTM2LjgzMi0xLjg5OC0xNC4yMDMtNy4wOS0yMS4zMTctMjEuMjYyIiBzdHlsZT0ic3Ryb2tlOm5vbmU7ZmlsbC1ydWxlOmV2ZW5vZGQ7ZmlsbDojZjlhZjAwO2ZpbGwtb3BhY2l0eToxIi8+PC9zdmc+" alt="LINUX DO" /></a>
</p>

项目包含网页端、React Native 移动 App、微信小程序和原生鸿蒙端。

## 宣传视频

32 秒竖屏卡点宣传片（1080×1920 · 节奏音乐 + 抽象小熊猫互动 + 真机演示）：

<p>
  <a href="./docs/promo/tilemo-promo-vertical-1080x1920.mp4">
    <img src="docs/promo/tilemo-promo-cover.jpg" alt="今天提了么 32 秒竖屏宣传视频封面" width="240" />
  </a>
</p>

- [观看 / 下载宣传视频（MP4，32s 竖屏版）](./docs/promo/tilemo-promo-vertical-1080x1920.mp4)

## 微信小程序体验版

「今天提了么」已新增微信小程序端。可以跟着节拍训练，查看每日进度和历史记录。训练记录保存在本机。

**目前是体验版，还未正式上架。** 用微信扫描下方二维码试用。

<img src="docs/miniprogram-preview/tilemo.png" alt="今天提了么微信小程序体验二维码" width="220" />

小程序界面预览

<p>
  <img src="docs/miniprogram-preview/home.jpg" alt="今日训练进度" width="220" />
  <img src="docs/miniprogram-preview/training.jpg" alt="训练方案" width="220" />
  <img src="docs/miniprogram-preview/history.jpg" alt="历史训练记录" width="220" />
</p>

## 结构

```
tilemo/
├─ apps/
│  ├─ web/            # 网页端 — Vite + 原生 JS(从 index.html 1:1 移植的双壳:移动 <1024 + 桌面 ≥1024)
│  ├─ mobile/         # 移动 app — Expo / React Native(4 tab + 节拍器)
│  ├─ miniprogram/    # 原生微信小程序
│  └─ harmony/       # 鸿蒙端 — ArkTS + ArkUI
├─ packages/
│  ├─ data/           # Store + StorageAdapter + tgm: 数据模型(两端共用,localStorage / AsyncStorage)
│  ├─ core/           # Metro 节拍引擎 + 域数学(heatLevel/recomputeStreak/recordSession)+ QUOTES
│  ├─ design-tokens/  # 视觉 token 单一源(浅/深,RN 直读 TS,web 注入 CSS 变量)
│  └─ store/          # Zustand 响应层(移动端用)
├─ index.html         # 迁移前的原始单文件(保留为参照,勿改)
└─ turbo.json / pnpm-workspace.yaml
```

## 开发

需要 Node ≥ 20、pnpm 10。

```bash
pnpm install

# 网页端(默认 http://localhost:5173)
pnpm --filter @tilemo/web dev

# 移动 app(Expo,扫码或模拟器)
pnpm --filter @tilemo/mobile dev

# 全量校验
pnpm build        # web 构建 + 移动 iOS/Android bundle
pnpm typecheck    # 全工作区 tsc
pnpm test         # vitest(data + core)
pnpm check:miniprogram # 小程序冒烟测试和边界检查
```

鸿蒙端通过 DevEco 独立构建。见 [鸿蒙开发与验收](./apps/harmony/README.md)。

## 数据

全部存设备本地,键名前缀 `tgm:`(`tgm:settings` / `tgm:plans` / `tgm:streak` / `tgm:log:YYYY-MM-DD`)。
网页端用 localStorage，移动端用 AsyncStorage，微信小程序用微信本地存储，鸿蒙端用 Preferences。网页端读取既有 `tgm:` 数据**向后兼容**。
不联网、不登录、不上传。

## 部署

见 [DEPLOY.md](./DEPLOY.md):GitHub Actions 打包移动 app(EAS Build)+ Vercel 部署网页端。

## 后续规划

见 [多端方案与微信云服务调研](./docs/multi-platform-roadmap.md)，了解三端共用云数据的可行性、账号与同步方案，以及排行榜、对战和日常提醒的分阶段待办。

## 备注

- `index.html`(仓库根)是迁移前的原始单文件应用,迁移期的**唯一参照物**;正式产物是 `apps/web`。
- 移动端的节拍音暂为 stub(RN 无 Web Audio);视觉 + 触感已实现。

## 许可证

[MIT](./LICENSE)
