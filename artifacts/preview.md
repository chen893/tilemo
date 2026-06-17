# 预览方式 — 今天提了么（v11 双壳：移动 app 壳 + 原生桌面 web 壳）

## 直接打开（推荐，最贴近评审方式）

双击打开，或在 Chrome 地址栏输入：

```
file:///Users/chen/Desktop/project/June/tilem/index.html
```

零联网、零依赖。可在 DevTools Network 面板勾选 Offline 验证离线可用，刷新后数据仍在（localStorage，键名 `tgm:*` 与 v1–v10 一致，已有数据无缝继承，**移动壳与桌面壳读写同一份 localStorage**）。

## 本地静态服务器（可选）

```bash
cd /Users/chen/Desktop/project/June/tilem
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080/
```

## 必查的两种视口（v11 成败线：桌面是"原生桌面 web 应用"而非"移动拉宽"）

- **移动 app 壳 < 1024px**：DevTools iPhone 12（390 × 844）—— 与 v10 100% 一致，零回归：单列聚焦流 + 底部 tabbar（app 式 4 项）+ masthead 报头 + 节拍器全屏有机呼吸形。`#desk-shell` 被 `display:none` 隐藏。
- **桌面 web 壳 ≥ 1024px**：1440 × 900、1920 × 1080 —— 全新 `#desk-shell`：**左侧常驻侧栏**（字标「今天提了么」+ 日期 + 四项导航 + 连续天数 mini + 主题三选）+ 主区 header + 四视图。
  - 今日 dashboard：主列（每日一句 + 主问句 + **绷紧的弦** + 大数字进度 + 呼吸 CTA + 今日 sessions 列表）+ 右栏 sticky aside（连续天数卡 + 7 天呼吸点 + 图例）。
  - 训练：左方案列表（4 张卡，含默认方案高亮）+ 右选中方案详情面板（参数 + 预计耗时 + 大「开始」按钮）。
  - **记录：年度热力（杀手锏）**：12 月 × 日的 GitHub 式贡献图，但用**暖朱 4 档**（transparent → heat-1 → heat-2 → accent），今日高亮（accent + accent-hot 环 + 阴影），点击任一天 → 下方日详情面板（当天 sessions 只读 + durationSec 分钟）。上一年/下一年导航 + 4 个统计卡（连续/总天数/总组数/本年累计）。
  - 设置（分类分栏）：左分类导航（目标 / 训练方案 / 反馈 / 外观 / 数据 / 关于）+ 右选中分类面板。所有功能（目标步进 / 默认方案 / 声音 / 触感 / 每日一句 / 主题三选 / 导出）与移动壳对齐。
  - 节拍器：呼吸体 `min(42vw, 520px)`，全屏 overlay（双壳共用）。

## 双壳共存机制

- DOM 中两套壳并存：`<div id="app">`（移动 app 壳）+ `<div id="desk-shell">`（桌面 web 壳）。
- CSS：`@media (min-width:1024px){ #app{display:none!important} .desk{display:grid} }`，默认（<1024px）反之。`.desk` 默认 `display:none`。
- 节拍器 `#metronome` 与 `#toast` 抽离到 `#app` 外（body 直接子元素），`position:fixed; inset:0; z-index:100`，无视父壳显隐，**双壳共用同一节拍器实例**。
- 路由：`switchView(name)` 同时切换两套壳的 active 视图 + 指示条；`isDesktop()` 决定渲染调对应壳的 render（移动 `renderHome/...` vs 桌面 `renderDeskHome/...`）。
- 数据变化（打卡 / 训练完成 / 设置改动）→ `refreshAll()` 刷新当前活动壳的当前视图。两套壳读写同一份 `tgm:*` localStorage，永远是同一份数据。
- 跨断点 resize：检测 `isDesktop()` 翻转 → 重新渲染当前视图，刚切到的新壳不会停留在陈旧 DOM。
- 桌面壳侧栏的连续天数永远展示（即便未开始连续也作占位），与今日 dashboard 的连续天数同源。

## 共享内核（复用，零重复造）

移动壳与桌面壳共用：`Store`（localStorage `tgm:*` 读写）/ `settings` / `plans` / `QUOTES` / `recordSession` / `recomputeStreak` / `heatLevel` / `dayMeetsGoal` / `Metro` 节拍器引擎（`startMetronome` / `setPhase`）/ `applyTheme` / `todayKey` / `ymd` / 设计 token（`--paper/--ink/--accent/--accent-hot/--accent-soft/--text/--text-2/--text-3` / `--blob-*` / 间距 / 字阶 / 缓动）/ 按钮体系（primary 暖朱实心 / secondary 暖朱描边）/ 呼吸·弦·有机曲线视觉母题 / `prefers-color-scheme` + `reduced-motion`。**数据模型 `tgm:*` 键名 1:1 不变**。

新增桌面 render：`renderDeskHome` / `renderDeskTrain` / `renderDeskHistory` / `renderDeskHeatmap` / `renderDeskDayDetail` / `renderDeskSettings` / `renderDeskNavFoot` / `renderDeskWeek` + `bindDeskEvents`（桌面壳独有事件）。

## 移动壳零回归确认

`<1024px`：`#app` 显示、`#desk-shell` 隐藏、`.webnav` 隐藏（v10 已有）、`.tabbar` 显示、masthead 显示、四视图（home/train/history/settings）布局与 v10 完全一致、节拍器行为一致、tabbar 滑动指示条一致。所有移动壳 CSS（`.app/.masthead/.webnav/.view/.tabbar/.metronome/.cta/.streak-block/.mini/.plan-card/.cal-*/.stat-*/.settings-*/.toggle/.stepper/.seg/.plan-select` 等）零修改。

## 体验路径（移动 / 桌面一致，桌面信息密度更高）

1. 今日 → 日期戳 + 状态徽（待打卡 / N/M / 今天提了）+ 每日一句 + 主问句「今天，提了么？」（未完成字距略紧=绷着）+ 绷紧的弦 + 大数字 0/N + 呼吸 CTA
2. 点 CTA（或桌面训练页"开始这组训练"）→ 全屏节拍器 3-2-1 → 有机呼吸形（收紧缩小升温 / 放松扩大降温）+ 倒计时
3. 完成 → 回今日页，弦松弛下垂 + 主问句字距松开 + CTA 一次温柔沉降脉冲（双壳都触发）
4. 记录（桌面：年度热力）→ 4 个统计卡 + 12 月 × 日暖朱热力（今日高亮）+ 点格展开日详情
5. 设置（桌面分类分栏）→ 6 分类（目标/方案/反馈/外观/数据/关于），所有功能与移动壳对齐

## PWA（手机可"添加到主屏幕"= app 形态，仅 http(s) 下注入）

`installPWA()` 在运行时用 Blob URL 注入 `web app manifest`（无独立文件、无 service worker），加 `apple-touch-icon` + `apple-mobile-web-app-*` 元。完全离线，不产生任何网络请求。file:// 下跳过避免 console warning。

## 视觉语言（1:1 沿自 v5/v8/v10）

- **有机身体曲线**：非对称 border-radius blob（仅装饰元素）+ SVG blob 路径，反矩形反尖角；内容容器用克制 px 圆角 ≤24 + padding ≥ radius。
- **呼吸**：CTA 4.5s 呼吸周期 + ambient 装饰形反向呼吸（桌面 ambient ~32vw / 560px）+ 桌面壳 nav-item 左侧竖条与 cat 左侧竖条同源呼吸出现。
- **张弛**：进度=绷紧的弦，达标=松弛下垂；主问句未完成绷着 / 完成松弛。
- **节拍器=有机呼吸形**：肺叶/身体状 blob，桌面放大到 `min(42vw, 520px)`。
- **暖身体色**：paper `#FAF3EC` × ink `#2B2320` × 暖朱 `#E85A4F`（收紧升温 `#D63A2E`，放松降温 `#F4B4A8`，达成最深档 `#C8402E`）。**无绿色**。

## 主题切换 / reduced-motion

侧栏底部 / 设置-外观均可切换：浅 / 深 / 跟随系统；跟随系统模式下系统切深色自动跟随。深色模式暖夜炭 `#1F1814`、文本 `#F2E8DC`、accent 提亮到 `#FF6B5E`（深色 CTA 字色改 paper 保 AA）。

`prefers-reduced-motion: reduce` 下：CTA 呼吸停、ambient 静态、弦/字距 transition 关闭、桌面 nav/cat 竖条 transition 关闭、桌面 week-dot blob morph 停、节拍器形静态切换（收紧 scale 0.9 / 放松 scale 1.0），倒计时与功能正常。
