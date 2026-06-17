# 预览方式 — 今天提了么（v6 PC 网页端 + 移动 app 端 自适应）

## 直接打开（推荐，最贴近评审方式）

双击打开，或在 Chrome 地址栏输入：

```
file:///Users/chen/Desktop/project/June/tilem/index.html
```

零联网、零依赖。可在 DevTools Network 面板勾选 Offline 验证离线可用，刷新后数据仍在（localStorage，键名 `tgm:*` 与 v3/v4/v5 一致，已有数据无缝继承）。

## 本地静态服务器（可选）

```bash
cd /Users/chen/Desktop/project/June/tilem
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080/
```

## 必查的三种视口（v6 成败线：桌面不能像手机 app）

- **移动 app 端 < 768px**：DevTools iPhone 12（390 × 844）—— 单列聚焦流 + 底部 tabbar（app 式导航），与 v5 移动体验一致。
- **平板过渡 768–1023px**：iPad（768 × 1024）—— 训练方案变 2 列，主问句与进度数字适度放大。
- **桌面 / PC 网页端 ≥ 1024px**：1440 × 900、1920 × 1080 —— **满屏宽多区网页布局**：顶部 web 式导航（字标「今天提了么」+ 日期 + 状态 + 四项分段导航，带滑动指示条），底部 tabbar 隐藏。
  - 今日：左主舞台（主问句 / 绷紧的弦 / 巨型进度数字 / 呼吸 CTA）+ 右侧"日志·最近"栏（连续打卡 + 最近 7 天呼吸点）。
  - 训练：左 sticky 标题导览 + 右 2 列方案阵列。
  - 记录：满宽三数字 + 月历与日详情并列（cal-wrap 双区）。
  - 设置：2 列卡片网格 + 关于块通栏。
  - 节拍器：呼吸体放大到 `min(42vw, 520px)`，更沉浸。

## 导航双形态（移动 tabbar ↔ 桌面 webnav）

- 移动 `<768px`：底部 `.tabbar`（app 式 4 项 + tab-indicator 滑动指示条）。
- 平板：沿用底部 tabbar。
- 桌面 `≥1024px`：`.tabbar` 隐藏，`.webnav` 顶导登场（字标 + 日期戳 + 状态徽 + `.webnav-nav` 分段 + nav-indicator 滑动指示条）。
- `switchView()` 同时驱动两套导航的 `is-active` 与指示条；跨断点 resize 时自动重定位。

## 体验路径（核心脊柱，移动/桌面一致）

1. 今日页 → 报头/webnav 日期 + 每日一句 + 主问句「今天，提了么？」（未完成时字距略紧=绷着）+ **绷紧的弦**（向上微拱的紧绷弧）+ 巨型进度数字 0/3 + 呼吸 CTA
2. 点 CTA → 全屏节拍器，准备 3-2-1 → **有机呼吸形**（收紧缩小升温 / 放松扩大降温，桌面更大）+ tabular-nums 倒计时
3. 完成 → 回今日页，**弦松弛下垂**（path d 切换，droop 释放）+ 主问句字距松开 + CTA 一次温柔沉降脉冲
4. 记录页 → 三数字 blob 卡 + 月历 blob 热力（4 档）+ 点格展开日详情（桌面与月历并列）
5. 设置页 → 有机控件（拨子/步进器/分段/方案阵列）+ 主题即时切换 + 导出 JSON

## PWA（手机可"添加到主屏幕"= app 形态）

`installPWA()` 在运行时用 Blob URL 注入 `web app manifest`（无独立文件、无 service worker），加 `apple-touch-icon`（inline SVG 暖朱有机种子）+ `apple-mobile-web-app-capable` + `apple-mobile-web-app-title`。iOS Safari 分享 → 添加到主屏幕，启动为独立全屏 app。完全离线，不产生任何网络请求。

## 视觉语言（1:1 沿自 v5，桌面更沉浸）

- **有机身体曲线**：非对称 border-radius blob + SVG blob 路径，反矩形反尖角
- **呼吸**：CTA 4.5s 呼吸周期 + ambient 装饰形反向呼吸（桌面 ambient 放大到 ~32vw / 560px，填充大画布）
- **张弛**：进度=绷紧的弦，达标=松弛下垂；主问句未完成绷着 / 完成松弛
- **节拍器=有机呼吸形**：肺叶/身体状 blob，桌面放大到 `min(42vw, 520px)`
- **暖身体色**：paper `#FAF3EC` × ink `#2B2320` × 暖朱 `#E85A4F`（收紧升温 `#D63A2E`，放松降温 `#F4B4A8`）

## 主题切换 / reduced-motion

设置页 → 浅 / 深 / 跟随系统；跟随系统模式下系统切深色自动跟随。深色模式暖夜炭 `#1F1814`、文本 `#F2E8DC`、accent 提亮到 `#FF6B5E`。

`prefers-reduced-motion: reduce` 下：CTA 呼吸停、ambient 静态、弦/字距 transition 关闭、节拍器形静态切换（收紧 scale 0.9 / 放松 scale 1.0），倒计时与功能正常。
