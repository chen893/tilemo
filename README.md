# 今天提了么 (Tilemo)

每日提肛（凯格尔 / 盆底肌训练）打卡与引导训练工具。**离线、本地、私密**。

monorepo:一个 React Native 移动 app + 一个网页端,共享同一套内核(数据 / 节拍引擎 / 设计 token)。

## 结构

```
tilemo/
├─ apps/
│  ├─ web/            # 网页端 — Vite + 原生 JS(从 index.html 1:1 移植的双壳:移动 <1024 + 桌面 ≥1024)
│  └─ mobile/         # 移动 app — Expo / React Native(4 tab + 节拍器)
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
```

## 数据

全部存设备本地,键名前缀 `tgm:`(`tgm:settings` / `tgm:plans` / `tgm:streak` / `tgm:log:YYYY-MM-DD`)。
网页端用 localStorage,移动端用 AsyncStorage。两端 schema 一致;网页端读取既有 `tgm:` 数据**向后兼容**。
不联网、不登录、不上传。

## 部署

见 [DEPLOY.md](./DEPLOY.md):GitHub Actions 打包移动 app(EAS Build)+ Vercel 部署网页端。

## 备注

- `index.html`(仓库根)是迁移前的原始单文件应用,迁移期的**唯一参照物**;正式产物是 `apps/web`。
- 移动端的节拍音暂为 stub(RN 无 Web Audio);视觉 + 触感已实现。
