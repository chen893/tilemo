# 部署

两个产物:移动 app(GitHub Actions → EAS Build)+ 网页端(Vercel)。

## 0. 前置:把代码推到 GitHub

```bash
# 在 GitHub 建一个空仓库(例如 tilemo),然后:
git remote add origin git@github.com:<你>/tilemo.git
git push -u origin feat/monorepo      # 当前分支
# 合并到 main(部署通常跟 main / tag 走)
git checkout main && git merge feat/monorepo && git push origin main
```

> 仓库根 `.gitignore` 已忽略 `node_modules` / `dist` / `.turbo` / `apps/*/dist` / `.expo` 等。
> `artifacts/` 与 `.claude/` 也已忽略。

---

## 1. 移动 app — GitHub Actions + EAS Build

EAS 在 Expo 云端打 iOS / Android 包,本地不装 Xcode/Android Studio 也能出包。

### 1.1 关联 EAS 项目(一次性,本地)

```bash
cd apps/mobile
pnpm exec eas login                  # 用 Expo 账号
pnpm exec eas init                   # 在 app.json 写入 extra.eas.projectId
# 首次构建会让你填 bundle id / package(已在 app.json 设 com.tilemo.app,回车确认即可)
pnpm exec eas build --profile development --platform ios   # 先跑通一次
```

`eas init` 会把 `projectId` 写进 `apps/mobile/app.json` 的 `expo.extra.eas`。提交这个改动。

### 1.2 配 GitHub Secret

仓库 **Settings → Secrets and variables → Actions → New secret**:

- `EXPO_TOKEN`:在 https://expo.dev/accounts/[you]/settings/access-tokens 生成,粘贴。

### 1.3 触发构建

- 打 tag:`git tag v1.0.0 && git push origin v1.0.0` → 自动构建 iOS + Android(production profile)。
- 或在仓库 **Actions → mobile (EAS build) → Run workflow** 手动触发(可选 preview / production)。

构建产物在 https://expo.dev 的项目 Builds 页下载(.ipa / .aab)。`eas.json` 的 `submit.production` 留了应用商店提交流程的占位(需要你自己的 Apple/Google 凭据),按需填。

---

## 2. 网页端 — Vercel

仓库根已有 `vercel.json`(pnpm monorepo 友好:`pnpm install` + `pnpm --filter @tilemo/web build` → `apps/web/dist`)。

### 方式 A:Vercel 控制台导入(推荐,最省事)

1. https://vercel.com/new → Import 你的 GitHub 仓库。
2. **Root Directory** 留仓库根(不要选 apps/web —— vercel.json 在根)。
3. Framework Preset:Vercel 会按 `vercel.json` 走(无需选)。
4. Install Command / Build Command / Output 已被 `vercel.json` 覆盖,确认显示:
   - Install:`pnpm install`
   - Build:`pnpm --filter @tilemo/web build`
   - Output:`apps/web/dist`
5. Deploy。之后每次 push `main` 自动部署。

### 方式 B:CLI(可选,配 GH Action 显式部署)

```bash
npx vercel link                       # 在仓库根,关联项目(生成 .vercel/,内含 org/project id)
npx vercel --prod
```

若用 `.github/workflows/web-deploy.yml`,补三个 secret:
`VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`(`vercel link` 后在 `.vercel/project.json` 里能看到后两个)。

---

## 速查

| 产物 | 触发 | 在哪看结果 | 需要的凭据 |
|---|---|---|---|
| 移动 iOS/Android | push `v*` tag 或手动 | expo.dev Builds | `EXPO_TOKEN`(+ EAS projectId) |
| 网页 | push `main` | Vercel 项目页 | (导入即可;CLI 方式需 `VERCEL_*`) |
