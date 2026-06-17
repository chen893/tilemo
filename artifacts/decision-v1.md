# 第 1 轮决策（decision-v1）

## 1. decision: **REFINE**

## 2. 理由

- 评分趋势首轮即设计 8 / 原创 8 / 加权 7.50 / verdict minor，且 `highlights` 明确认可 token 体系、呼吸圆环视觉锚点、核心闭环可跑通、气质辨识度高——这套方向（陶土橘 + 晨雾米白 + 暖夜炭 + 呼吸圆环 + 大圆角编辑式排版）是人类设计师能认出的刻意创作决策，不是 AI 套路。
- 两个 major 都是**可定位、可定点修复的实现缺陷**，不是结构性硬伤：CTA autofocus/metronome 初始 is-open 是初始化逻辑写错；`--text-muted` 对比度未达 AA 是取值没校准。两者都不需要重做视觉方案即可根治。
- 4 个 minor + 2 个 nit 全部是局部打磨（tab 指示条改单条滑动、阶段切换收敛到单一同步函数、overlay 关闭后显式回首页、首页 7 天条补日期与今日锚点、focus-visible 外环、hero 节奏收紧），修完后预计可用性 / 交互 / 工艺三项同时上扬，设计 / 原创两项不受 regression 影响。
- 没有任何一条 issue 指向"方向是死胡同"或"气质翻车"——PIVOT 的代价远高于 REFINE，沉没成本不成立。

---

## 3. 第 2 轮改造清单（按优先级排序，逐条可执行）

### Major 1 — 首页 CTA 自动聚焦 + metronome 自动启动写入非自愿打卡

**改哪里**：`index.html`（或当前入口 HTML）的 `<script>` 块 + CTA 按钮标签。

**改成什么**：
1. 移除 `<button class="cta" ...>` 上的 `autofocus` 属性（若存在）。
2. 在 `init()` / 首屏渲染函数中全局搜索 `.focus()` / `.click()` 调用，删除任何针对 `.cta` 的自动 focus/click。允许保留 `switchView('home')` 等非交互初始化。
3. metronome overlay 的初始 `className` 必须**不含 `is-open`**：在 HTML 里 `<div id="metro" class="metro">`（不带 is-open），`is-open` 只在 `startSession()` 内由 `classList.add('is-open')` 显式添加，`endSession()` / `closeMetro()` 内 `classList.remove('is-open')`。
4. 在 `init()` 末尾加断言（开发态 `console.assert`，生产可留可删）：reload 后 `metro.classList.contains('is-open') === false` 且今日进度 `=== 0`。
5. 验收：清空 localStorage → reload → 页面停在首页今日态，CTA 不被聚焦（无 `:focus` 默认高亮），overlay 不可见，进度 0/Y；只有用户点 CTA 才进入训练。

### Major 2 — `--text-muted` 浅深两套均未达 WCAG AA（2.47:1 / 3.8:1）

**改哪里**：`:root` 与 `[data-theme="dark"]` 的 token 定义行。

**改成什么**：
1. 浅色：`--text-muted: #A89E92` → `#8C8276`（约 4.5:1 on `#FBF7F1`）。如能再压一档到 `#857A6E` 更稳，建议取 `#877D71` 兼顾气质与对比。
2. 深色：`--text-muted: #807468` → `#9C9085`（约 4.6:1 on `#1E1A17`）。保持暖灰调，不漂白。
3. 修完后用 DevTools "Contrast" pick 复核：浅色 ≥ 4.5:1、深色 ≥ 4.5:1；同时确认这些被 muted 渲染的文本（日期副信息 / 方案描述 / session 元信息 / 设置副标题 / 日历详情头部 .s）视觉层级仍低于 `--text-secondary`，不破坏排版秩序。
4. 验收：评审员列出的 13 处 muted 文本行（行 192/198/327/345/455/484/537/546/559/574/599/759 等）逐一过 DevTools 对比度提示，全部 ≥ AA。

### Minor 1 — tab 激活指示条改单条滑动（契约 §4.1）

**改哪里**：底部 tab bar 的 HTML 结构 + 对应 CSS + 切换 JS。

**改成什么**：
1. 删除每个 `.tab` 内部的 `<span class="ind">`，改为 tabbar 内**唯一一个**绝对定位 `<span class="tab-indicator">`，`position:absolute; bottom:...; height:4px; border-radius:--radius-pill; background:var(--brand)`。
2. 切换 tab 时，在 `switchView(name)` 内计算目标 tab 的 `offsetLeft + offsetWidth/2 - indicatorWidth/2`，`indicator.style.transform = translateX(...)px`，配 `transition: transform 220ms var(--ease-soft)`，宽度可固定（如 24px）或随 tab 宽度 transition。
3. 首屏 `init()` 末尾把指示条无动画放到当前 active tab 中心（先加 `.no-anim` 类、设 transform、下一帧移除），避免首屏从 0 滑过来。
4. 验收：连续点击不同 tab，能看到**一根条**连贯滑过去，不是两条淡入淡出。

### Minor 2 — 节拍器阶段文字与圆环颜色错位

**改哪里**：节拍器拍边界切换逻辑（`setPhase` 相关）。

**改成什么**：
1. 把阶段切换收敛到单一同步函数 `setPhase(phase)`，在**同一个同步执行块内**一次性更新：`ring-core` 背景（`--brand` ↔ `--brand-soft`）、`ring-phase` 文本（"收紧"/"放松"）、`aria-live` 朗读文本、计时方向（递增/递减）、触感/提示音触发。
2. 禁止把文本与 class 拆到不同 `setTimeout` / `rAF` 回调里分别赋值；拍边界只用一个 `setTimeout(tick, beatMs)` 调度，进入下一拍时同步调用 `setPhase`。
3. 验收：在收紧→放松、放松→收紧边界连续采样 5 次，`ring-phase.textContent` 与 `ring-core` 计算背景色始终保持同阶段。

### Minor 3 — overlay 关闭后回首页 + 恢复 tabbar

**改哪里**：`endSession()` / `closeMetro()`。

**改成什么**：
1. 在 `endSession()`（无论 finished / 提前结束）和 `closeMetro()` 末尾显式：`switchView('home')` + `document.getElementById('tabbar').classList.remove('is-hidden')`。
2. 把进度 +1 计数滚动与达标庆祝态触发放在 `switchView('home')` 之后执行，确保用户回到首页立刻看到 +1。
3. 验收：开始训练 → 提前结束 → 落点是首页（不是训练 tab）、tabbar 可见、进度已 +1。

### Minor 4 — 首页 7 天热力条补日期 + 今日锚点

**改哪里**：首页"最近 7 天"区块的渲染函数。

**改成什么**：
1. 每格下方加一位日期数字（`dd`，用 `--text-xs`），与星期缩写上下排列。
2. 今日格加视觉锚点：`outline: 2px solid var(--brand)` 或格内加 `--brand` 圆点。
3. 7 格用与记录页同源的 4 档色（`--surface-soft` / `--brand-soft` / `--brand` / `--success`），未打卡日不再是同色平铺。
4. 验收：首页能一眼读出本周哪几天打卡了、哪天是今天、强度几档。

### Nit 1 — focus-visible 外环（契约 §4.2）

**改哪里**：全局 CSS 的 `:focus-visible` 规则。

**改成什么**：
1. 显式 `.cta:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--brand-soft); }`。
2. 同步为所有 `button` / `.tab` / `.switch` / 步进器按钮 / 日历格加 `:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--brand-soft); }`（或 `outline: 3px solid var(--brand-soft); outline-offset: 2px;`，统一一种即可）。
3. 验收：Tab 键遍历所有可交互元素，每个都有清晰外环。

### Nit 2 — hero 节奏收紧

**改哪里**：首页顶部区块排版。

**改成什么**：
1. 把每日一句从"主标题上方独占一行 muted 小字"改为**与日期同组元信息**（日期 + 每日一句同一行或紧贴的两行，`--text-xs/sm` + `--text-muted`），缩短与日期的距离。
2. 主标题"今天，提了么？"与下方进度数字之间用更大字号落差（h1 用 `--text-2xl`/`--text-xl`、进度数字用 `--text-display`/`--text-mega`）建立"大问题 + 大数字"的编辑式锚点。
3. 适度收掉 h1 上方多余 margin，让 hero 整体更紧致。
4. 验收：视觉上"问句—数字"成为强焦点，每日一句退为元信息，留白节奏不再发空。

---

## 4. 第 2 轮**不要碰**的部分（避免 regression）

以下已被 highlights 认可为加分项，PIVOT/重构风险大于收益，本轮严禁改动其方向：

- **设计 token 体系**（色板取值除 `--text-muted` 校准外，其余 token 不动；圆角 / 间距 / 字阶 / 缓动取值全部锁定）。
- **陶土橘 + 晨雾米白 + 暖夜炭的主色方案**与浅深双模即切即换机制。
- **节拍器三层呼吸圆环**（outer/mid/core，scale 0.82→1，`--ease-breath`，JS 动态绑定单拍秒数，reduced-motion 退化为静态）——这是整页最有原创性的视觉锚点，只做 Minor 2 的同步收敛，不重构结构。
- **离线硬约束**（单一 HTML、零联网、零 CDN、零外部字体、`file://` 可跑、console 无网络错误）。
- **localStorage 键名结构与数据模型**（`tgm:settings` / `tgm:plans` / `tgm:log:YYYY-MM-DD` / `tgm:streak`），4 档热力色映射规则不动。
- **核心闭环数据链路**（开始 → 跟练/提前结束 → 写 session → 进度 +1 → 热力点亮 → 只读详情），只修落点视图与初始化时序，不改写入与读取逻辑。
- **底部 4 tab IA 与窄容器居中响应式**（max-width 480px、桌面不强行多列），spec 已限定。

---

## 5. 第 2 轮完成判据（自测，照此逐条过）

1. 清空 localStorage → reload：停在首页、CTA 未聚焦、overlay 不可见、进度 0/Y。✅ Major 1
2. DevTools 对比度 pick：所有 `--text-muted` 文本浅深两套 ≥ 4.5:1。✅ Major 2
3. 连续切 tab：一根指示条连贯滑动。✅ Minor 1
4. 节拍器边界采样：文本与 core 背景同阶段。✅ Minor 2
5. 训练提前结束：落点是首页、tabbar 可见、进度 +1。✅ Minor 3
6. 首页 7 天条：有日期数字、今日有锚点、4 档色。✅ Minor 4
7. Tab 遍历：每个可交互元素有清晰外环。✅ Nit 1
8. 首页 hero：每日一句退为元信息、问句-数字落差更大。✅ Nit 2
