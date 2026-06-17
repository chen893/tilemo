# 今天提了么 — 第 2 轮实现契约（contract-v2）

> 起草依据：`artifacts/spec.md` · `artifacts/contract-v1.md` · `artifacts/review-v1.json` · `artifacts/decision-v1.md`（REFINE）
> 轮次类型：第 2 轮**精修**。方向锁定为 REFINE，不推倒视觉方案，只在 v1 基础上**定点修复** review-v1 的 2 major + 4 minor + 2 nit，并防止已受认可的加分项 regression。
> 本轮仍不实现：F5 自定义方案增删改、F6 统计页、F7 成就页、F8–F10（P2）。IA 入口仍不渲染半成品。

---

## 0. 本轮范围（一句话）

**在 v1 完整骨架上定点修复 8 条 issue**——两个可用性/工艺 major（CTA 自动触发非自愿打卡、`--text-muted` 对比度未达 AA）+ 四个交互/可用性 minor（tab 单条滑动指示条、节拍器阶段同步收敛、训练结束回首页恢复 tabbar、首页 7 天条补日期与今日锚点）+ 两个 nit（focus-visible 外环、hero 节奏收紧），不动 token 体系、不动呼吸圆环结构、不动数据模型、不动离线硬约束。

---

## 1. 本轮修复的 issue（按 review-v1.json 的 severity 排序）

| # | severity | area | issue 摘要 | 本轮处理 |
|---|---|---|---|---|
| M1 | major | usability | 首页 CTA 自动聚焦 + metronome 自动启动，reload 即 0→1 进度 + 进入训练 | **修**（详见 §3.1） |
| M2 | major | craft | `--text-muted` 浅深两套均未达 WCAG AA（浅 2.47:1 / 深 3.8:1） | **修**（详见 §3.2） |
| m1 | minor | interaction_fluency | tab 激活指示条是每 tab 各一条淡入淡出，非单条滑动 | **修**（详见 §3.3） |
| m2 | minor | interaction_fluency | 节拍器阶段文字与圆环颜色偶发错位（收紧文案配放松底色） | **修**（详见 §3.4） |
| m3 | minor | usability | overlay 关闭后活动视图被切到"训练"而非首页、tabbar 可见性无断言 | **修**（详见 §3.5） |
| m4 | minor | design_quality | 首页 7 天热力条缺日期数字与今日锚点，信息密度偏低 | **修**（详见 §3.6） |
| n1 | nit | interaction_fluency | 主按钮 focus-visible 未观察到 3px `--brand-soft` 外环 | **修**（详见 §3.7） |
| n2 | nit | craft | hero 节奏偏空，每日一句与 h1 层级弱 | **修**（详见 §3.8） |

**8 条全部在本轮修完**，无遗留。

---

## 2. 本轮保持（防 regression，严禁改动方向）

下列项已被 review-v1 `highlights` 明确认可，PIVOT/重构风险大于收益，本轮**只允许在 §3 明确列出的点处做最小改动**，其余一律锁死：

1. **设计 token 体系**：色板（陶土橘 #C75D3C / 晨雾米白 #FBF7F1 / 暖夜炭 #1E1A17 / 墨绿 #5B7A5A）、圆角（10/16/24/32/pill）、间距（4–64 八阶）、字阶（xs–mega 九档）、缓动（`--ease-breath` / `--ease-soft`）、时长（`--dur-fast` / `--dur-base`）。**唯一例外**：`--text-muted` 浅深两值按 §3.2 校准，其余 token 取值锁死。
2. **陶土橘 + 晨雾米白 + 暖夜炭主色方案**与浅深双模即切即换机制（`data-theme` + `prefers-color-scheme` 协同）。
3. **节拍器三层呼吸圆环**（outer/mid/core，scale 0.82→1，`--ease-breath`，JS 动态绑定单拍秒数，reduced-motion 退化为静态阶段切换）——本轮只做 m2 的同步收敛，不重构圆环 DOM 与 CSS 结构。
4. **离线硬约束**：单一 HTML 文件、零联网、零 CDN、零外部字体/图片/SVG/SDK、`file://` 双击可跑、console 零网络错误。
5. **localStorage 键名结构与数据模型**：`tgm:settings` / `tgm:plans`（内置 4 方案）/ `tgm:log:YYYY-MM-DD` / `tgm:streak`，4 档热力色映射规则（`--surface-soft` / `--brand-soft` / `--brand` / `--success`）不动。
6. **核心闭环数据链路**：开始 → 跟练/提前结束 → 写 session（`finished: true/false` 都计数）→ 进度 +1 → 当天热力点亮 → 点格展开只读详情。本轮只改"训练结束后的落点视图"与"初始化时序"，写入/读取/streak 重算逻辑不动。
7. **底部 4 tab IA 与窄容器居中响应式**（`max-width: 480px` + `margin: 0 auto`，桌面不强行多列）。
8. **4 档热力色 + tabular-nums 数字 + 大圆角编辑式排版**的整体气质。

---

## 3. 视图清单（沿用 v1，本轮在哪些视图上改）

入口仍是单一 HTML 文件，4 个底部 tab 视图 + 1 个全屏沉浸视图。本轮**不增不减视图**，仅按下表所列点做最小修改：

| 视图 | 本轮改动点 | 对应 issue |
|---|---|---|
| **V1 今日（Home）** | (a) hero 区块重组：每日一句降为与日期同组元信息、h1 与进度数字字号落差拉大、收掉 h1 上方多余 margin；(b) "最近 7 天"热力条每格加 `dd` 日期数字、今日格加 `--brand` 锚点、7 格改用 4 档色 | n2, m4 |
| **V2 训练（Train）** | 仅节拍器进入/退出时序受 m2/m3 牵连，方案卡片本身不动 | m2, m3（间接） |
| **V3 记录（History）** | 不动（muted 文本随 §3.2 全局 token 校准自动达标） | M2（被动） |
| **V4 设置（Settings）** | 不动（同上） | M2（被动） |
| **V5 节拍器（全屏沉浸）** | (a) 阶段切换收敛到单一同步函数 `setPhase(phase)`；(b) `endSession()` / `closeMetro()` 末尾显式 `switchView('home')` + 移除 tabbar `is-hidden` | m2, m3 |
| **全局** | (a) `:root` / `[data-theme="dark"]` 的 `--text-muted` 取值校准；(b) 初始化逻辑去 autofocus / 去 auto-focus/click、metronome 初始 className 不含 `is-open`；(c) tab bar 改单条绝对定位指示条；(d) 全局 `:focus-visible` 外环规则 | M1, M2, m1, n1 |

---

## 4. 设计 Token 本轮变化

**唯一变化**（其余 token 一律锁死）：

```
/* 浅色模式 */
--text-muted: #A89E92 → #756B5F    /* on #FBF7F1 实测 4.89:1，达 AA（≥4.5:1）；保留安全余量；保持暖灰调不漂白 */

/* 深色模式 */
--text-muted: #807468 → #9C9085    /* on #1E1A17 实测 5.55:1，达 AA（≥4.5:1）；保持暖夜调不变冷 */
```

> 上述对比度均用 WCAG 相对亮度公式 `L = 0.2126·R' + 0.7152·G' + 0.0722·B'`（通道经 gamma 展开）重算并交叉核对，**非估算**。

校准后须满足：
- 浅色 `--text-muted` on `--bg`（#FBF7F1）对比度 = **4.89:1** ≥ 4.5:1，达 AA。
- 深色 `--text-muted` on `--bg`（#1E1A17）对比度 = **5.55:1** ≥ 4.5:1，达 AA。
- **防层级塌陷断言**：实测 muted 对比度应 ≤ `--text-secondary`（浅 `#6B625A` = 5.59:1 / 深 `#B8AEA2` = 7.91:1）**至少 0.5:1 差距**。本轮实测：
  - 浅色 muted 4.89:1 vs secondary 5.59:1 → 差距 **0.70:1** ≥ 0.5:1 ✓（"primary > secondary > muted"正文秩序不破坏）
  - 深色 muted 5.55:1 vs secondary 7.91:1 → 差距 **2.36:1** ≥ 0.5:1 ✓
- review-v1 列出的 13 处 muted 文本（日期副信息 / 训练方案描述 / session 元信息 / 设置项副标题 / 日历详情头部 `.s` 等）全部自动达标，**不需要逐处改 class**——只改 token 即可。

其余 token（含 `--brand` / `--brand-soft` / `--brand-deep` / `--success` / `--bg` / `--bg-elevated` / `--surface-soft` / `--text-primary` / `--text-secondary` / 圆角 / 间距 / 字阶 / 缓动 / 时长）**取值与 v1 完全一致**。

---

## 5. 交互动效清单（本轮新增/修改项，其余沿用 v1 §4 不变）

> 下面只列本轮**变化**条目，编号沿用 v1 §4 原编号便于对照；未列出的条目（视图淡入微下移、主按钮态、呼吸圆环缩放、准备倒计时、计数滚动、温柔光晕、热力格 hover、开关/步进器、触感提示音、reduced-motion 退化）**沿用 v1 不变**。

### §5.1 [新] 初始化时序（修 M1）—— 隶属于原 §4 之外的初始化约束

1. `<button class="cta">` 上**禁止** `autofocus` 属性。
2. `init()` / 首屏渲染函数中**禁止**对 `.cta` 调用 `.focus()` 或 `.click()`；允许 `switchView('home')`、读取并渲染今日状态等非交互初始化。
3. metronome overlay 的初始 DOM className **不含** `is-open`：HTML 写 `<div id="metro" class="metro">`，`is-open` 仅由 `startSession()` 内 `classList.add('is-open')` 显式添加，`endSession()` / `closeMetro()` 内 `classList.remove('is-open')`。
4. **[仅 fresh-load 执行，禁止污染常规 init]** 定义 `isFreshLoad = (localStorage 中无任何 `tgm:log:*` 键) && (`tgm:streak.lastCheckedDate !== today`)`。`init()` 末尾仅当 `isFreshLoad === true` 时才执行：
   - `console.assert(!metro.classList.contains('is-open'), 'metro should not auto-open')`
   - `console.assert(todaySessions.length === 0, 'no session on fresh load')`

   若 `isFreshLoad === false`（已有历史 log 或今日已打卡），**这两条 assert 一律不执行**——否则在常规 reload（用户当天已经打过卡）时会持续失败、污染生产 console。`metro is-open` 断言也可降级为"仅在自动化测试 / 手测触发时跑"，不进生产 `init()`。
5. **验收**：清空 localStorage → reload → 页面停在首页今日态、CTA 无 `:focus` 高亮、overlay 不可见（`getComputedStyle(metro).display === 'none'`）、进度 0/Y；只有用户主动点 CTA 才进入训练。

### §5.2 [改] tab 激活指示条（修 m1，替换原 §4.1 的尾段）

1. 删除每个 `.tab` 内部的 `<span class="ind">`，tabbar 内改放**唯一一个**绝对定位 `<span class="tab-indicator">`：`position:absolute; bottom: <安全值>; height:4px; border-radius: var(--radius-pill); background: var(--brand); transition: transform 220ms var(--ease-soft);`（宽度可固定 24px，亦可随当前 tab 宽度 transition）。
2. `switchView(name)` 内：读目标 tab 的 `offsetLeft + offsetWidth/2 - indicator.offsetWidth/2`，赋值 `indicator.style.transform = translateX(${x}px)`，**禁止重排**（只用 transform）。
3. 首屏 `init()` 末尾把指示条无动画放到当前 active tab 中心：临时加 `.no-anim` 类（`transition: none`）→ 设 transform → `requestAnimationFrame` 内移除 `.no-anim`，避免首屏从 0 滑过来。
4. **验收**：连续点击 4 个 tab，肉眼可见**一根条**连贯滑过去，不是两条淡入淡出。

### §5.3 [改] 节拍器阶段切换收敛（修 m2）

1. 新增单一同步函数 `setPhase(phase)`，`phase ∈ {'contract', 'relax'}`。在**同一个同步执行块内**一次性更新：
   - `ring-core` 背景色（`--brand` 收紧 ↔ `--brand-soft` 放松）；
   - `ring-phase.textContent`（"收紧" / "放松"）；
   - `aria-live` 朗读文本（同 ring-phase，供屏幕阅读器）；
   - 计时方向（收紧递增数到 `contract` 秒 / 放松递增数到 `relax` 秒，或统一递减，二选一后保持一致）；
   - 触感 / 提示音触发（依 `settings.haptics` / `settings.sound`）。
2. **禁止**把上述任一项拆到不同 `setTimeout` / `requestAnimationFrame` 回调里分别赋值。拍边界只用一个 `setTimeout(tick, beatMs)` 调度，进入下一拍时同步调用 `setPhase`。
3. **验收**：在收紧→放松、放松→收紧边界连续采样 5 次，`ring-phase.textContent` 与 `ring-core` 计算背景色（`getComputedStyle(...).backgroundColor`）始终保持同阶段。

### §5.4 [改] 训练结束落点（修 m3）

1. `endSession()`（无论 `finished: true` 还是提前结束）与 `closeMetro()` 末尾**显式**：
   - `switchView('home')`；
   - `document.getElementById('tabbar').classList.remove('is-hidden')`；
   - 再触发进度 +1 计数滚动与（若达标）温柔光晕庆祝态。
2. 顺序硬约束：先切视图与恢复 tabbar，**后**触发计数滚动与庆祝，确保用户回到首页立刻看到 +1。
3. **验收**：开始训练 → 跟练或提前结束 → 落点是首页（active tab = 今日，不是训练）、tabbar 可见、进度已 +1；若是当日达标首次则触发温柔光晕。

### §5.5 [改] 首页"最近 7 天"热力条（修 m4）

1. 每格下方加一位日期数字（`dd`，`--text-xs`，`--text-muted`），与星期缩写上下排列（星期在上、日期在下，或同行紧凑排布二选一，保持全 7 格一致）。
2. 今日格加视觉锚点：**统一 `outline: 2px solid var(--brand)`**（不用小圆点；记录页月历今日格同步用同种 2px `--brand` outline 锚点，保证两处"今日"视觉语义同源）。
3. 7 格用与记录页同源的 4 档色（`--surface-soft` 0 档 / `--brand-soft` 部分 / `--brand` 达标 / `--success` 超额），未打卡日不再是同色平铺。
4. **[共用函数约束]** 首页 7 天条与记录页月历的 4 档色映射（按 `sessions.length/goalGroups` 比值分档）**共用同一函数**（如 `heatLevel(sessions, goalGroups) → { surfaceSoft | brandSoft | brand | success }`），避免两处分档阈值漂移导致色彩语义不一致。
5. **验收**：首页能一眼读出本周哪几天打卡了、哪天是今天、强度几档；与记录页月历热力颜色语义一致；今日锚点（2px brand outline）在两处视觉一致。

### §5.6 [改] 全局 focus-visible 外环（修 n1）

1. **[单一方案，全站统一]** 用 `outline`，不用 `box-shadow`（避免与主按钮 hover shadow 冲突导致外环被裁切或叠层错乱）。全站 focus-visible 外环统一为：
   ```css
   :focus-visible {
     outline: 3px solid var(--brand-soft);
     outline-offset: 2px;
   }
   ```
   该基础规则对 `.cta` / `button` / `.tab` / `.switch` / `.step-btn` / `.cal-cell` 等所有可聚焦元素一并生效（无需逐元素重复声明，但允许各元素自带的 `outline: none` 默认态被 `:focus-visible` 覆盖）。
2. **禁止**任何 `*:focus { outline: none !important; }` 或 `box-shadow: none` 把上述外环覆盖掉；也**禁止**用 `box-shadow: 0 0 0 3px var(--brand-soft)` 模拟外环（与主按钮 hover 的 `box-shadow` 会叠加冲突）。
3. **验收**：桌面端 Tab 键遍历 CTA / 4 个 tab / 所有开关 / 步进器按钮 / 日历格，每个都有清晰可见的 3px `--brand-soft` outline 外环，且 hover shadow 与外环不冲突。

### §5.7 [改] 首页 hero 节奏（修 n2）

1. 把"每日一句"从"h1 上方独占一行 muted 小字"改为**与日期同组的元信息**：日期 + 每日一句紧凑排在同一组（同一行 `·` 分隔，或紧贴两行），统一 `--text-xs`/`--text-sm` + `--text-muted`。
2. **[单一字号方案]** 主标题"今天，提了么？" h1 固定 = `--text-2xl`（36px），下方进度数字固定 = `--text-display`（56px），落差两档，建立编辑式锚点（不再在 xl/2xl、display/mega 之间摇摆）。
3. 收掉 h1 上方多余 `margin-top`（从 `--space-7`/`--space-8` 降到 `--space-4`/`--space-5`），让"日期组 → 问句 → 大数字"三段更紧致。
4. **验收**：视觉上"问句—数字"成为强焦点，每日一句退为元信息，hero 留白节奏不再发空；浅深两模式下层级一致；h1 = 36px / 进度 = 56px 取值唯一。

---

## 6. 存储不变项（沿用 v1 §5，本轮零变化）

- 键名：`tgm:settings` / `tgm:plans` / `tgm:log:YYYY-MM-DD` / `tgm:streak` 全部不变。
- `tgm:settings` 字段（`dailyGoalGroups` / `defaultPlanId` / `theme` / `sound` / `haptics` / `dailyQuote`）不变。
- `tgm:plans` 仍为内置 4 方案（入门 / 巩固 / 进阶 / 快速一组），本轮**不引入**自定义方案入口。
- `tgm:log:*` 的 session 写入逻辑（含 `finished: true/false` 都计数、`goalGroups` 快照、`manualOverride` 恒 false）不变。
- streak 重算时机（每次写 log 后即时重算缓存）不变。
- 4 档热力色映射规则不变。
- 时间一律本地时区、`YYYY-MM-DD` 手写格式化，**禁止 UTC**。

---

## 7. 技术约束（沿用 v1 §6，本轮零变化 + 一条强化）

1. 单一静态 HTML 文件，内联 `<style>` + `<script>`，无外部 CSS/JS。
2. 零联网、零 CDN、零外部字体/图片/SVG/SDK（含 Google Fonts）。图标全部 inline SVG。
3. 预览：`file://` 双击打开，或 `python3 -m http.server 8080` 后访问根路径。375×812 与 1440×900 都须正常。
4. 移动优先 + 响应式：根容器 `max-width: 480px` + `margin: 0 auto`，375↔480↔1440 不断版、不强行多列。
5. 可点击区域 ≥ 44×44px。
6. 无障碍：`prefers-color-scheme` + 手选覆盖、`prefers-reduced-motion` 退化、按钮带 `aria-label`、节拍器阶段 `aria-live="polite"`、色彩对比 WCAG AA（**本轮 M2 修复后 muted 也须达标**）。
7. 无构建步骤，原生 HTML/CSS/JS。
8. **[本轮强化]** console 零错误、零警告：不仅网络面板无 failed request，JS 面板也不得有未捕获异常或 `console.assert` 失败。开发态断言（如 §5.1 第 4 条）**仅在 fresh-load 分支或自动化测试中执行**，常规 reload / 已有数据场景下不得触发任何 assert 失败——断言通过即静默，断言失败必须说明代码 bug 而非用户正常状态。

---

## 8. 本轮仍不做（明确排除，防止范围蔓延）

- **F5 自定义方案增删改**：V2 底部仍不出现"新增方案"入口；`tgm:plans` 仍只有内置 4 条。
- **F6 统计页**：V3 下方"本周/本月完成率小统计"仍不渲染。
- **F7 成就页**：`tgm:achievements` 键本轮不读写。
- **F8–F10（P2）**：每日一句文案库已存在（v1 已有 ≥20 条）、数据导出按钮 v1 已有；本轮不新增 F9 导入、F10 PWA、F8 文案库扩容。
- **历史编辑/补卡**：V3 点格仍只读展开，`manualOverride` 恒 false。
- **节拍器结构重构**：m2 只做同步收敛，不改 outer/mid/core 三层 DOM 与 CSS。
- **token 重发明**：除 `--text-muted` 外不动任何取值。
- **视觉方向 PIVOT**：本轮是 REFINE，严禁换色/换字/换布局范式。

---

## 9. 评审可逐条核对的"完成"标准（本轮自测清单）

照此逐条过，每条对应一个 issue id：

1. **[M1]** 清空 localStorage → reload：页面停在首页今日态、CTA 无 `:focus` 高亮、`getComputedStyle(metro).display === 'none'`、今日进度 0/Y；无用户操作下不进入训练、不写 session。只有主动点 CTA 才进入 V5。
2. **[M2]** DevTools "Contrast" pick：浅色 `--text-muted`(#756B5F) on `--bg`(#FBF7F1) 实测 **4.89:1** ≥ 4.5:1；深色 `--text-muted`(#9C9085) on `--bg`(#1E1A17) 实测 **5.55:1** ≥ 4.5:1。review-v1 列出的 13 处 muted 文本逐一过提示，全部 ≥ AA。同时 `--text-secondary`（浅 #6B625A = 5.59:1 / 深 #B8AEA2 = 7.91:1）实测对比度仍**高于** muted 至少 0.5:1（浅差 0.70:1 / 深差 2.36:1），正文秩序不破坏。
3. **[m1]** 连续点击 4 个 tab：肉眼可见**一根**指示条连贯滑过去（不是两条淡入淡出）；首屏加载时指示条无"从 0 滑过来"的动画。
4. **[m2]** 节拍器收紧→放松、放松→收紧边界各采样 5 次：`ring-phase.textContent` 与 `getComputedStyle(ring-core).backgroundColor` 始终同阶段。
5. **[m3]** 开始训练 → 提前结束：落点 active tab = 今日（不是训练）、`#tabbar` 无 `is-hidden` 类、进度已 +1；若是当日达标首次则触发温柔光晕庆祝。
6. **[m4]** 首页 7 天条：每格下方有 `dd` 日期数字、今日格 `outline: 2px solid var(--brand)`（不用圆点）、7 格用 4 档色（与记录页月历语义一致，且 4 档分档共用同一函数）；记录页月历今日格同步同种 2px brand outline 锚点。
7. **[n1]** 桌面端 Tab 键遍历 CTA / 4 tab / 所有开关 / 步进器 / 日历格：每个都有清晰可见的 3px `--brand-soft` **outline** 外环（`outline-offset: 2px`），与 hover shadow 不冲突；全站无 box-shadow 模拟外环。
8. **[n2]** 首页 hero：每日一句与日期同组、字号 ≤ `--text-sm` + `--text-muted`；h1 = `--text-2xl`(36px) / 进度数字 = `--text-display`(56px) 落差两档；h1 上方 margin 收紧、整体不再发空；浅深两模一致。
9. **[regression]** v1 highlights 四项不退化：token 体系（除 muted）/ 陶土橘主色方案 / 三层呼吸圆环 / 离线硬约束 / 数据模型 / 4 档热力 / 核心闭环数据链路 / 底部 4 tab 窄容器响应式——全部保持。`file://` 断网打开 console 仍零网络错误。
10. **[范围]** 本轮未渲染任何 §8 列出的"不做"项（无自定义方案入口、无统计页、无成就页、无数据导入、无 PWA、无历史编辑）。

---

## 10. 自评清单（本轮预期分数，1–10，供评审对照）

> 相比 v1（设计 8 / 原创 8 / 可用性 7 / 交互 7 / 加权 7.50）：M1 是可用性 major、M2 是工艺 major，m1/m2/m3 是交互/可用性 minor——本轮修完后**可用性 / 工艺 / 交互流畅度**三项预计同时上扬；设计 / 原创两项**持平**（本轮不主动加新视觉资产，但也不应 regression）。

- **设计品质：8**（持平）— m4 让首页 7 天条信息密度上来、n2 让 hero 编辑式节奏更紧，视觉上略有增益；但本轮不引入新插画/有机形，所以不主动上调，留 8。若评审认为信息密度与节奏收紧带来可见提升，可浮到 8.5。
- **原创性：8**（持平）— 本轮不动 token / 主色 / 呼吸圆环 / 排版范式，原创性来源（陶土橘 + 呼吸圆环同频 + 编辑式非对称）全部保留；未新增原创决策，不主动上调，防止虚高。
- **可用性：8**（v1 7 → +1）— M1 消除"首次打开被拉进训练 + 非自愿打卡"的可用性事故，m3 修复"训练结束落点错位"，m4 让首页本周节奏可读，n1 补齐键盘可达性外环——四条叠加把可用性从 7 拉到 8。
- **交互流畅度：8**（v1 7 → +1）— m1 把 tab 指示条从"淡入淡出"升级为"单条连贯滑动"，m2 消除节拍器阶段错位，n1 让键盘焦点可见——交互一致性 + 细节流畅度同时上扬，从 7 拉到 8。

> 工艺（craft）在本评分体系里是 major 项 M2 修复的核心承载面：muted 文本 13 处全部达 AA，预计工艺子分显著回升（本轮加权应高于 v1 的 7.50，目标 ≥ 8.0）。
