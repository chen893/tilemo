# 预览方式 — 今天提了么（v12 桌面壳定向打磨）

## 直接打开（推荐，最贴近评审方式）

双击打开，或在 Chrome 地址栏输入：

```
file:///Users/chen/Desktop/project/June/tilem/index.html
```

零联网、零依赖。可在 DevTools Network 面板勾选 Offline 验证离线可用，刷新后数据仍在（localStorage，键名 `tgm:*` 与 v1–v11 一致，已有数据无缝继承，**移动壳与桌面壳读写同一份 localStorage**）。

## 本地静态服务器（可选）

```bash
cd /Users/chen/Desktop/project/June/tilem
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080/
```

## 必查的两种视口

- **移动 app 壳 < 1024px**：DevTools iPhone 12（390 × 844）—— 与 v10/v11 100% 一致，零回归：单列聚焦流 + 底部 tabbar + masthead 报头 + 节拍器全屏有机呼吸形。`#desk-shell` 被 `display:none` 隐藏。
- **桌面 web 壳 ≥ 1024px**：1440 × 900、1920 × 1080 —— `#desk-shell`：左侧常驻侧栏（字标 + 日期 + 四项导航 + **今日进度环徽**（v12 新增，常驻全局）+ 连续天数 + 主题三选）+ 主区 header（eyebrow + title，**随视图更新**）+ 四视图。

### v12 桌面壳核心修复（相对 v11）

1. **header 随视图更新**：切训练/记录/设置，desk-eyebrow + desk-title 跟着变（训练→"训练/挑一组开始"、记录→"记录/你的足迹"、设置→"设置/调成你的样子"；home 仍是"日课/今天，提了么？"）。DOM 已验证。
2. **今日进度（2/3）不再泄漏到非首页 header**：改放**侧栏底部常驻环徽** `#desk-nav-today`（环形进度 + 数字 + "今日打卡 N/M 组"，达标时整徽变暖朱实心）。header 右上 status 徽只在 home 视图出现。
3. **设置面板填实**：每个分类右面板都有实质内容——目标分类加"目标洞察"四宫格（累计组数/达标天数/近 7 天日均/当前目标）+ 随数据动态的小建议；训练方案加当前默认方案参数总览；数据加数据概览（天数/组数/最近一次）+ 格式说明；关于加版本/存储/联网/条目 KV。**二级分类导航加 16px 小图标 + 一行描述**。
4. **首页右栏加"本周节奏"模块**（第 3 卡）：7 天总组数 / 日均 + 7 柱条（暖朱 4 档 + 今日高亮）+ 节奏文案。让首页主列与右栏底部大致对齐。
5. **stepper +/− 对称**：都描边、同色，仅 hover/focus 才暖朱填充。
6. **设置二级导航激活态**：暖朱左竖条（3px × 22px，与一级 nav-item 同语言）+ 暖白底 + 图标转暖朱。
7. **stat 去重**：原"本年累计"与"总组数"同值重叠 → 改为**达标天数**（独立维度，与连续/总天数/总组数正交）。
8. **主题 chip**：清晰标签"浅色/深色/跟随系统"+ 激活态暖朱底（aria-pressed 复用 secondary/active 语言）。
9. **年度热力图例重构**：横向 4 档渐变点（无/部分/达标/超额）+ "少 → 多" + 单独"今日"标注（带描边环示意）+ 右侧"点击任一天查看详情"提示，独占热力图下方一行（与热力图分隔线分开）。
10. **年度热力翻页**：明确为"上一年度/下一年度"年份切换（aria-label/title 标注），**超过当前年份时下一年度按钮禁用**（当前年份 disabled=True，回退到去年后启用）。

## 双壳共存机制（v11 沿用，v12 仅动桌面壳）

- DOM 中两套壳并存：`<div id="app">`（移动 app 壳）+ `<div id="desk-shell">`（桌面 web 壳）。
- CSS：`@media (min-width:1024px){ #app{display:none!important} .desk{display:grid} }`，默认（<1024px）反之。
- 节拍器 `#metronome` 与 `#toast` 抽离到 `#app` 外，`position:fixed; inset:0; z-index:100`，**双壳共用同一节拍器实例**。
- 路由：`switchView(name)` 同时切换两套壳的 active 视图 + 指示条 + **桌面 header（`setDeskHeader`）**；`isDesktop()` 决定渲染调对应壳的 render。
- 数据变化 → `refreshAll()` 刷新当前活动壳的当前视图；侧栏今日进度徽 + 连续天数随数据同步。

## 共享内核（复用，零重复造）

移动壳与桌面壳共用：`Store`（localStorage `tgm:*` 读写）/ `settings` / `plans` / `QUOTES` / `recordSession` / `recomputeStreak` / `heatLevel` / `dayMeetsGoal` / `Metro` 节拍器引擎 / `applyTheme` / `todayKey` / `ymd` / 设计 token / 按钮体系 / 呼吸·弦·有机曲线视觉母题 / `prefers-color-scheme` + `reduced-motion`。**数据模型 `tgm:*` 键名 1:1 不变**。

v12 新增桌面 render/helper：`setDeskHeader` / `renderDeskTodayIndicator` / `renderDeskCadence` / `renderDeskSetGoalExtra` / `renderDeskSetGoalTip` / `renderDeskSetPlanOverview` / `renderDeskSetDataOverview` / `renderDeskSetAboutCounts`。

## 移动壳零回归确认

`<1024px`：`#app` 显示、`#desk-shell` 隐藏、`.webnav` 隐藏、`.tabbar` 显示、masthead 显示、四视图布局与 v10/v11 完全一致、节拍器行为一致、tabbar 滑动指示条一致、移动壳主题标签仍是"浅/深/跟随系统"。所有移动壳 CSS/render 零修改。headless 验证：375 / 900 两个视口下 `#app` 可见、`#desk-shell` 隐藏、四视图切换正常、console 无错。

## PWA（仅 http(s) 下注入，file:// 跳过避免 console warning）

`installPWA()` 运行时用 Blob URL 注入 `web app manifest`（无独立文件、无 service worker）。完全离线。

## 视觉语言（1:1 沿自 v5/v8/v10/v11）

- **有机身体曲线** + **呼吸** + **张弛（弦/字距）** + **节拍器=有机呼吸形** + **暖身体色**（paper `#FAF3EC` × ink `#2B2320` × 暖朱 `#E85A4F`）。**无绿色、无紫色渐变**。
- v12 新增视觉元素（今日进度环徽 / 柱条 / KV 行 / 洞察格 / 重构图例）全部复用现有暖朱 token 与圆角语言，无魔法数字。

## 主题切换 / reduced-motion

侧栏底部 / 设置-外观均可切换：浅色 / 深色 / 跟随系统；跟随系统模式下系统切深色自动跟随。`prefers-reduced-motion: reduce` 下所有呼吸/弦/字距/竖条 transition 关闭，倒计时与功能正常。
