# 今天提了么 — 第 1 轮实现契约（contract-v1）

> 起草依据：`artifacts/spec.md`（视觉设计语言 + P0/P1 功能 + 离线约束）
> 轮次类型：第 1 轮骨架。无历史 review，无 decision。
> 本轮不实现：F5 自定义方案编辑器、F6 统计页、F7 成就页、F8–F10（P2）。这些留待后续轮次，本轮只在 IA 中预留入口/占位说明，但不渲染半成品。

---

## 1. 本轮范围（一句话）

**可跑通的核心骨架 + 今日打卡主流程 + 沉浸式训练节拍器 + 记录页日历热力 + 设置页基础项**，构成"看到状态 → 跟练 → 进度+1 → 历史点亮"的完整脊柱；视觉一次到位（陶土橘 + 晨雾米白 + 呼吸动效同频），不留半成品占位。

对应 spec 覆盖：F1（全部）、F2（全部）、F3（streak + 月度热力 + 本地存储，编辑历史归后续轮次）、F4（基础项：每日目标 / 默认方案 / 主题 / 声音 / 隐私声明）。P1 的 F5 仅做"内置 4 方案可选"，自定义方案的增删改与 F6/F7/F8 留待后续。

---

## 2. 页面 / 视图清单

单一 HTML 文件，4 个底部标签视图 + 1 个全屏沉浸视图。所有视图由 JS 切换（display 切换 + 淡入微下移，非堆叠滑动）。

| 视图 | 本轮渲染 | 不渲染 / 留白 |
|---|---|---|
| **V1 今日（Home）** | 日期 + 每日一句（≥20 条文案库随机）、主问句"今天，提了么？"、进度（已完成 X / 目标 Y 组）、主按钮（开始一组训练 / 已完成脉冲态）、连续天数徽章、最近 7 天迷你热力条 | — |
| **V2 训练（Train）** | 内置 4 方案卡片（入门 / 巩固 / 进阶 / 快速一组），点卡片进入 V5 节拍器 | 自定义方案"新增/编辑/删除"按钮本轮不出现（V2 底部不渲染该入口，避免半成品） |
| **V3 记录（History）** | 连续天数 + 总天数 + 总组数（三个大数字）、当月日历热力图、月份切换（上一月/下一月）、点击某天展开当天 sessions 详情（只读展示） | "可编辑/补卡"本轮只读展示，编辑能力后续轮次；本周/本月完成率小统计后续轮次 |
| **V4 设置（Settings）** | 每日目标组数步进器（1–8）、默认训练方案下拉、提示音开关、触感开关、主题三选（浅/深/跟随系统）、每日一句开关、关于（产品理念 + "全部数据仅存于本设备"隐私声明） | 方案管理（增删改）、数据导入、清空数据二次确认 —— 本轮只渲染"导出 JSON"按钮（P2，简单可做），其余入口本轮不出现 |
| **V5 节拍器（全屏沉浸）** | 中央呼吸圆环（收紧放大/放松缩小，同频 `--ease-breath`）、环上阶段文字、圆心大号倒计时数字（tabular-nums）、顶部"第 N 组 / 共 M 组 · 第 n 次 / 共 k 次"、准备倒计时 3-2-1、底部暂停/结束、完成确认（温柔光晕脉冲）+ 自动回今日页 | — |

**导航**：V1–V4 由底部固定 tab bar 切换（4 个标签，inline SVG 线性图标，2px 描边圆头圆角，激活态用 `--brand`）；V5 是覆盖全屏的沉浸态，进入时隐藏 tab bar，自带顶部关闭/底部控制。

---

## 3. 设计 Token（本轮取值，直接落地到 `:root`）

完全采用 spec 第 60–127 行的 token，本轮不重新发明。下列为评审可逐条核对的最终取值：

**浅色模式（默认，挂 `:root`）**
- `--bg: #FBF7F1` / `--bg-elevated: #FFFFFF` / `--surface-soft: #F3ECE2`
- `--text-primary: #2B2622` / `--text-secondary: #6B625A` / `--text-muted: #A89E92`
- `--brand: #C75D3C` / `--brand-soft: #E8B8A6` / `--brand-deep: #A2472A`
- `--success: #5B7A5A` / `--success-soft: #C8D4C0` / `--accent-warm: #E0A458`

**深色模式（暖夜，挂 `[data-theme="dark"]`，由 `prefers-color-scheme: dark` + 用户手选共同决定 `data-theme`）**
- `--bg: #1E1A17` / `--bg-elevated: #2A2420` / `--surface-soft: #332B26`
- `--text-primary: #F2EBE0` / `--text-secondary: #B8AEA2` / `--text-muted: #807468`
- `--brand: #D9785A` / `--brand-soft: #4A352C` / `--brand-deep: #B8593B`
- `--success: #7FA07C` / `--accent-warm: #E8B570`

**圆角**：`--radius-sm 10 / md 16 / lg 24 / xl 32 / pill 999`（px）
**间距**：`--space-1..8 = 4/8/12/16/24/32/48/64`（px）
**字号**：`xs 12 / sm 14 / base 16 / md 18 / lg 22 / xl 28 / 2xl 36 / display 56 / mega 88`（px）
**字体**：`--font-sans` 用系统中文无衬线栈（`-apple-system, "PingFang SC", "HarmonyOS Sans", "Source Han Sans SC", "Microsoft YaHei", system-ui, sans-serif`），数字用 `font-variant-numeric: tabular-nums` + `letter-spacing: -0.02em` 实现几何锚点感（零外部字体）。
**缓动 / 时长**：`--ease-breath: cubic-bezier(0.45,0.05,0.55,0.95)` / `--ease-soft: cubic-bezier(0.22,1,0.36,1)` / `--dur-fast 180ms` / `--dur-base 320ms` / `--dur-breath` 动态绑定单拍时长。

**禁止魔法数字**：所有内联样式与 JS 注入的尺寸必须引用上述 token（CSS 变量），JS 中确需像素计算处（如圆环 r 计算）须有注释说明，不允许出现未注释的裸数字。

**对比度要求**：`--text-primary` on `--bg`、`--text-secondary` on `--bg`、`--text-primary` on `--bg-elevated` 均需通过 WCAG AA（4.5:1）。`--brand` 文字直接用于按钮内白底场景时改用 `--bg-elevated` 字色保证对比。

---

## 4. 交互与动效清单（逐条，供"交互流畅度"打分）

1. **视图切换**：V1↔V2↔V3↔V4 切换 = 当前视图 `opacity 1→0 + translateY(0→8px)` 160ms，新视图 `0→1 + 8px→0` 220ms `--ease-soft`。tab 激活态图标/文字用 `--brand`，下方一个 4px 圆角小指示条从旧 tab 滑到新 tab（transform，不重排）。
2. **主按钮"开始一组训练"**：默认态 `--brand` 实底 + 大圆角 `--radius-pill`，hover 微抬 `translateY(-1px)` + 阴影加深；active 按压 `--brand-deep` + `scale(0.98)`；focus-visible 出现 3px `--brand-soft` 外环。完成今日后此按钮变为"今天，提了 ✓"态：背景换 `--success-soft`、文字 `--success`，触发第 6 条庆祝。
3. **节拍器呼吸圆环**：核心动效。收紧阶段圆环 `scale(0.82→1)` + 颜色由 `--brand-soft` 渐到 `--brand`，时长 = 该方案 `contract` 秒；放松阶段 `scale(1→0.82)` + 颜色回退，时长 = `relax` 秒。全部用 CSS transition 绑 `--ease-breath`，单拍切换由 JS 在每拍边界改 class。圆心倒计时数字每秒更新（tabular-nums 防跳动）。
4. **节拍器准备倒计时**：进入 V5 先显示 "准备好了吗？" + 居中大号 3→2→1，每拍 `scale(1.2→1)` + `opacity 1→0` 600ms，然后正式开始。
5. **进度 +1 计数动画**：完成一组回到 V1，"已完成 X 组"的数字用 ease-out 从旧值滚动到新值（500ms），同时连续天数若 +1 也滚动。
6. **温柔完成反馈**：今日达标（sessions 达到 goalGroups）时主按钮触发一次 `box-shadow` 光晕脉冲（`--success-soft` → 扩散 24px → 收回），持续 1.2s，不撒纸屑不放烟花。`prefers-reduced-motion` 下改为按钮静态变色 + 一次性 opacity 闪动。
7. **历史热力格 hover**：每个日历格 hover 时 `transform: scale(1.08)` + `z-index` 提升 + tooltip 显示日期与完成组数。
8. **设置项交互**：开关用自定义 toggle（`--brand` 开启态，220ms `--ease-soft` 滑块位移）；步进器 +/− 按钮 ≥44px 可点；主题切换即时生效，无刷新。
9. **触感/提示音**：节拍器每拍边界，若 `settings.haptics` 开启则 `navigator.vibrate(8)`（收紧）`navigator.vibrate(4)`（放松）；若 `settings.sound` 开启则用 WebAudio `OscillatorNode` 合成一个极轻的 880Hz/660Hz 短促正弦"叮"（≤60ms，零外部音频文件）。无 API 时静默降级，不报错。
10. **`prefers-reduced-motion`**：检测到时，第 3 条圆环改为静态（按阶段切换颜色与文字，不做 scale），第 1/4/5/6/7 条装饰动效全部退化为瞬时切换，仅保留状态变化必须的色变。节拍器仍可正常使用。

---

## 5. 离线 / 本地存储实现

**实现方式**：纯 `localStorage`（键值结构清晰，无大记录需求）。所有读写封装在单一 `store` 命名空间对象里，JSON 序列化，try/catch 包裹（隐私模式降级为内存态 + 顶部一次性轻提示"当前为隐身模式，数据不会保留"）。

**键名与数据结构**（与 spec 第 210–246 行一致）：

```
tgm:settings  -> {
  dailyGoalGroups: number (默认 3),
  defaultPlanId: string (默认 "plan_beginner"),
  theme: "system" | "light" | "dark",
  sound: boolean (默认 true),
  haptics: boolean (默认 true),
  dailyQuote: boolean (默认 true)
}

tgm:plans     -> 内置 4 方案 + 用户自定义（本轮无自定义入口，仅内置 4 条）
  [{ id, name, desc, contract, relax, reps, sets, builtin }]

tgm:log:YYYY-MM-DD  -> {
  date: "YYYY-MM-DD",
  goalGroups: number,                 // 当时目标快照
  sessions: [{ ts, planId, completedReps, durationSec, finished }],
  manualOverride: boolean             // 本轮恒为 false（无编辑入口）
}

tgm:streak    -> { current, longest, lastCheckedDate }   // 衍生缓存
```

**派生计算**：本月热力 = 遍历当月所有日期 key 聚合 `sessions.length / goalGroups` 比值，映射 4 档色（0 / 部分 / 达标 / 超额 → `--surface-soft` / `--brand-soft` / `--brand` / `--success`）。streak 在每次写入 log 后即时重算并缓存。时间一律 `new Date()` 本地时区、`toLocaleDateString` 或手写 `YYYY-MM-DD` 格式化，**禁止用 UTC**。

**首次启动**：检测 `tgm:settings` 不存在 → 写入默认值；`tgm:plans` 不存在 → 写入内置 4 方案。

---

## 6. 技术实现约束

- **单一静态 HTML 文件**：`index.html`（或本轮命名 `today.html`，最终在 preview.md 注明），内联 `<style>` + `<script>`，无外部 CSS/JS 文件。
- **零联网、零 CDN、零外部依赖**：不引用任何远程字体（含 Google Fonts）、远程图片、远程 SVG、第三方 SDK。图标全部 inline SVG。字体用系统栈。PWA/Service Worker 本轮不做。
- **预览方式**：直接 `file://` 双击打开，或 `python3 -m http.server 8080` 后访问根路径。Chrome DevTools 移动端模拟（iPhone 12 / 375×812）与桌面（1440×900）都须正常。
- **移动优先 + 响应式**：根容器 `max-width: 480px` + `margin: 0 auto`，桌面两侧留白用 `--bg` 延展（不强行多列）。375px 与 480px 之间、480px 与 1440px 之间不断版、不出现难看拉伸。tab bar 在 480px 容器内固定底部。
- **可点击区域**：所有 button / tab / 开关 ≥ 44×44px。
- **无障碍底线**：`prefers-color-scheme` 自动切换 + 设置可手选覆盖；`prefers-reduced-motion` 退化为静态；按钮带 `aria-label`；节拍器阶段用 `aria-live="polite"` 朗读阶段变化；色彩对比 WCAG AA。
- **无构建步骤**：原生 HTML/CSS/JS，不引入框架、不引入构建工具。
- **console 零网络错误**：离线打开 Network 面板无任何 failed request。

---

## 7. 评审可逐条核对的"完成"标准

1. `file://` 打开，断网（DevTools Offline）状态下完成"开始训练→跟练一组→完成→回今日页进度+1→进记录页看到今天热力点亮"全链路，**无 console 报错**，刷新后数据仍在。
2. 视觉第一眼可辨"陶土橘 + 晨雾米白 + 呼吸感"，未出现 spec 红线清单任一项（紫色渐变 / 白卡浅阴影海 / 居中三件套 hero / 冷蓝医疗感 / 高饱和荧光 / 撒纸屑 / 红色警示焦虑 / 圆环+中央百分比）。
3. 节拍器圆环缩放与倒计时文字严格同步，准备 3-2-1 / 暂停 / 提前结束 / 完成确认 四态齐全；提前结束也写入一条 `finished: false` 的 session 并计入进度。
4. 记录页月度日历当月正确渲染、月份切换可用、当天热力按 4 档色显示、点击展开当天 sessions 只读详情。
5. 设置页：目标组数步进生效（改完回今日页看到 Y 更新）、默认方案生效（进训练页高亮该方案）、主题三选即时切换（含深色模式视觉正确，无对比度翻车）、声音/触感/每日一句开关持久化。
6. 4 个 tab 切换动效顺滑，激活指示条滑动；V5 进入隐藏 tab bar、退出恢复。
7. `prefers-reduced-motion` 下节拍器仍可用（静态阶段切换 + 文字提示），其余装饰动效关闭。
8. 移动 375 / 桌面 1440 两种宽度下布局合理，桌面是窄容器居中而非多列拉伸。

---

## 8. 自评清单（本轮预期分数，1–10，供评审对照）

- **设计品质：8** — 严格落地 spec 的陶土橘 + 晨雾米白 + 大圆角 + 大留白 token，节拍器呼吸圆环作为视觉锚点，非对称编辑式排版（标题左对齐 + 大数字出血感），整体是连贯"晨光呼吸节拍器"作品而非零件拼盘。扣分点留待：插画/有机形装饰本轮以几何抽象为主，可能不如有插画时丰富。
- **原创性：8** — 主色陶土橘在习惯打卡类工具里极少见；节拍器把"收缩-放松"做成与缓动同频的呼吸圆环是刻意的设计决策；避开居中 hero / 卡片海 / 圆环百分比 / 紫色渐变等全部 AI 套路。扣分点：底部 4 tab 是常规 IA，但 spec 已限定，属合理约束内的发挥。
- **可用性：8** — 核心闭环无断点，触控区 ≥44px，对比度达标，prefers-* 双尊重，隐私模式降级有提示。扣分点：本轮无补卡编辑入口，用户"做了忘点"需后续轮次才能修。
- **交互流畅度：8** — 视图淡入微下移、计数滚动、tab 指示条滑动、节拍器呼吸同频、温柔光晕脉冲、热力格 hover，动效服从"呼吸"母题且全部有 reduced-motion 降级。扣分点：声音/触感在非支持环境静默降级，无法在所有评审环境充分体验。
