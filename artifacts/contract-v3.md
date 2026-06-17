# 今天提了么 — 第 3 轮实现契约（contract-v3）

> 起草依据：`artifacts/spec.md` · `artifacts/contract-v2.md` · `artifacts/review-v2.json` · `artifacts/decision-v2.md`（REFINE）
> 轮次类型：第 3 轮**精修**。方向锁定 REFINE——v2 加权 8.00、verdict minor、设计/原创 8/8 持平且无 regression 信号，本轮只在 v2 骨架上**定点修复 review-v2 的 1 major + 1 minor + 2 nit**，并**纳入 1 个克制增量**（节拍器倒计时字号随 phase 呼吸），不推倒视觉方案、不动 token、不动呼吸圆环结构、不动数据模型、不动离线硬约束。
> 本轮仍不实现：F5 自定义方案增删改、F6 统计页、F7 成就页、F8–F10（P2）、历史编辑/补卡。IA 入口仍不渲染半成品。

---

## 0. 本轮范围（一句话）

**在 v2 完整骨架上定点修复 4 条 review-v2 issue**（1 major：`session.durationSec` 恒为 0；1 minor：键盘 Tab 穿透非 active 视图；2 nit：tab 指示条 3→4px、移除 `init()` 末尾 `cta.blur()` 兜底），**并纳入 1 个 decision-v2 §5 的克制增量**——节拍器中央倒计时数字随 phase 做 8% 字号呼吸、`prefers-reduced-motion` 退化静态，强化"晨光里的呼吸节拍器"母题；**零回归**：呼吸圆环、token、AA 对比度、tab 滑动、setPhase 同步、离线硬约束全部锁死。

---

## 1. 本轮修复的 issue（按 review-v2.json 的 severity 排序）

| # | severity | area | issue 摘要 | 本轮处理 |
|---|---|---|---|---|
| M1 | major | usability | `session.durationSec` 永远写入 0：`totalElapsed` 声明(行 1906)与重置(行 1935)齐全，但**无任何位置累加**，导致 `totalElapsedSec()` 恒返回 0，记录页 day-detail 永远显示「X 次 / 0 分钟」 | **修**（详见 §3.1） |
| m1 | minor | usability | 4 个 `.view` 都 `display:block` + `visibility:visible`，仅靠 `.is-active` 切 z-index/opacity；键盘 Tab 会依次穿透 train/history/settings 的 plan-card / 30+ cal-cell / switch，focus-visible 外环在不可见区域闪烁 | **修**（详见 §3.2） |
| n1 | nit | interaction_fluency | `#tab-indicator` 实测高度 3px，契约 v2 §5.2.1 写明 4px（字面偏差） | **修**（详见 §3.3） |
| n2 | nit | usability | `init()` 末尾的 `cta.blur()` 兜底暗示存在未被根治的自动聚焦路径；主流 reload 路径下无法复现 | **修**（详见 §3.4，含 grep 根因确认步骤） |

**4 条全部在本轮修完**，无遗留。

---

## 2. 可选增量（本轮**纳入**，来自 decision-v2 §5）

> decision-v2 §5 给出"仅做一个"的克制增量：节拍器中央倒计时的"呼吸字号同步"。本轮**纳入此条**，因为：(a) 它与圆环 scale 同频但不耦合，风险隔离；(b) `prefers-reduced-motion` 退化路径与现有节拍器降级策略天然同源；(c) 它能给"晨光里的呼吸节拍器"母题补一个签名细节，是 v2 卡 8 之后少数能正向试探设计/原创两分的合法手段。

| 增量 | 说明 | 本轮处理 |
|---|---|---|
| E1 | 节拍器中央倒计时数字 `ring-count` 字号随 phase 做 ±8% 呼吸：收紧阶段（主色主导）数字**外张**到 `--text-mega`（满值），放松阶段**内收**到 `--text-mega * 0.92`；单拍内不再二次插值，阶段切换瞬间用 `--ease-breath` 缓动过渡。reduced-motion 退化为静态满值字号。 | **做**（详见 §3.5） |

**风险控制**：E1 只修改 `ring-count` 这一个元素的字号属性，**不触碰** `ring-core` 背景、`ring-phase` 文本、`aria-live`、计时方向、触感/提示音——即 v2 已验证零错位的 `setPhase()` 同步块**原样保留**，E1 在 `setPhase()` 同步块内**追加一行** `ring-count` 字号赋值（与 phase 同帧切换），不引入新的 setTimeout / rAF 调度。

---

## 3. 视图清单（沿用 v2，本轮在哪些视图上改）

入口仍是单一 HTML 文件，4 个底部 tab 视图 + 1 个全屏沉浸视图。本轮**不增不减视图**，仅按下表所列点做最小修改：

| 视图 | 本轮改动点 | 对应 issue |
|---|---|---|
| **V1 今日（Home）** | 移除 `init()` 末尾 `cta.blur()` 兜底（前提：grep 确认零自动聚焦路径） | n2 |
| **V2 训练（Train）** | 不动 | — |
| **V3 记录（History）** | 被动收益：M1 修复后 day-detail 不再恒显示「0 分钟」，按真实时长取整显示 | M1（被动） |
| **V4 设置（Settings）** | 不动 | — |
| **V5 节拍器（全屏沉浸）** | (a) `startTick()` 的 setInterval 回调内累加 `totalElapsed`；(b) `setPhase()` 同步块内追加 `ring-count` 字号呼吸（E1） | M1, E1 |
| **全局** | (a) `switchView(name)` 内对非 active view 设 `inert` 属性；(b) `#tab-indicator` 高度 3px → 4px | m1, n1 |

---

## 4. 设计 Token 本轮变化

**零变化**。所有 token（含 v2 §4 已校准的 `--text-muted` 浅色 #756B5F / 深色 #9C9085）取值与 v2 **完全一致**，本轮**禁止**改任何取值。

> E1 的 8% 呼吸幅度是**乘数**（`--text-mega * 1.0` 与 `--text-mega * 0.92`），不引入新 token；若评审需要可追溯，可加一行注释 `/* E1: breath scale 0.92, decision-v2 §5 */`，但**不落成新 CSS 变量**（避免 token 体系在 REFINE 轮膨胀）。

---

## 5. 交互动效与逻辑清单（本轮新增/修改项，其余沿用 v2 §5 不变）

> 下面只列本轮**变化**条目；未列出的条目（视图淡入微下移、主按钮态、三层呼吸圆环缩放、准备倒计时、计数滚动、温柔光晕、热力格 hover、开关/步进器、触感提示音、tab 单条 transform 滑动、focus-visible 外环、7 天条 + 月历今日 outline 同源、reduced-motion 退化）**沿用 v2 不变**。

### §5.1 [改] `startTick()` 累加 `totalElapsed`（修 M1）

1. **位置**：`index.html` `startTick()` 内 `setInterval` 回调（约行 2054–2064），`remaining -= 1;`（行 2056）之后。
2. **改成什么**：在 `remaining -= 1;` **紧跟一行** `totalElapsed += 1000;`，使写入秒数与 displayed countdown（`el.count.textContent = remaining`）**同源、同频率、同分支**。
   - 选 setInterval 方案而非评审备选的 `onPhaseEnd` 开头加 `Date.now() - phaseStartTs`，理由：与显示秒数天然同源，避免"显示秒数 ≠ 写入秒数"的二次漂移；改动最小（一行）。
   - **保持 early-return 分支不动**：`if (state !== "running") return;`（行 2055）在 paused 态早退，不会误累加——这是符合预期的（暂停期间不应计时长）。
3. **完成判定（容差说明）**：
   - "入门（3s 收 / 3s 放 / 10 次）" 跑完一组：理论时长 60s，写入 `durationSec ≈ 60`，day-detail 显示约「入门 · 10 次 / 1 分钟」（`Math.round(60/60)=1`）。
   - 提前结束 4 reps（= 4 个 contract + 4 个 relax = 8 个 phase × 3s = 24s 内中断）：`durationSec` 落在 0–60 之间，`Math.round` 后可能取整为 0（"0 分钟"）——**这是符合预期的**，本轮只需保证 **≥60s 不再恒为 0** 即可，不追求 <60s 也显示"1 分钟"。
4. **验收**：清空 localStorage → 开始训练「入门」→ 跑完 10 次（约 60–65 秒含准备倒计时之后）→ 提前结束或自然结束 → 回到首页进度 +1 → 进记录页点今天 → day-detail 显示「入门 · 10 次 / 1 分钟」（而非「0 分钟」）。再跑一组「巩固（5s 收 / 5s 放 / 12 次 × 2 组）」自然结束 → day-detail 第二条 session 显示「巩固 · 24 次 / 4 分钟」（240s / 60 = 4）。

### §5.2 [改] 非 active view 加 `inert`（修 m1）

1. **位置**：`switchView(name)` 函数体（约行 1536–1551），与 `.is-active` class 切换、tab 切换、`moveTabIndicator(name)` 在**同一同步执行块**内完成。
2. **改成什么**：在现有 `.is-active` 切换循环内**追加** inert 处理：
   ```js
   VIEWS.forEach(function(v){
     var el = document.getElementById("view-"+v);
     if (v === name){ el.classList.add("is-active"); el.removeAttribute("inert"); }
     else { el.classList.remove("is-active"); el.setAttribute("inert", ""); }
   });
   ```
3. **禁止** `display:none` / `visibility:hidden` + `pointer-events:none` 替代 `inert`——会让节拍器圆环 transform 重算、首帧跳变。`inert` 同时屏蔽 focus 与辅助技术扫描，且不影响布局，是 review-v2 明确推荐的方案。
4. **与 `.view.is-active` 现有 CSS 的兼容**：v2 `.view` 默认 `display:block; visibility:visible`，`.is-active` 控 z-index/opacity——`inert` 不改变这些样式，只屏蔽交互与可达性，二者正交，零冲突。
5. **验收**：进入 home 视图 → 按住 Tab 键连续按下 → 焦点只在 tabbar 与 home 内可聚焦元素（CTA / 7 天条等）间循环，**不会**跳到 train 的 plan-card×4 / history 的 30+ cal-cell / settings 的 switches；focus-visible 外环不再在屏幕外或不可见区域闪烁。切到 history 视图 → Tab 能遍历 cal-cell，但 home/train/settings 的可聚焦元素被跳过。

### §5.3 [改] `#tab-indicator` 高度 3px → 4px（修 n1）

1. **位置**：`index.html` CSS `.tab-indicator` 规则（约行 765–777），`height: 3px;`（行 770）。
2. **改成什么**：`height: 4px;`（**仅此一处**，宽度 24px、transform 逻辑、transition 220ms ease-soft、`no-anim` 首屏屏蔽一律不动）。
3. **验收**：`getComputedStyle(document.getElementById("tab-indicator")).height === "4px"`；连续切换 4 个 tab，单条 transform 滑动行为与 v2 一致，无视觉退化。

### §5.4 [改] 移除 `init()` 末尾 `cta.blur()` 兜底（修 n2）

1. **步骤 1（根因确认，grep）**：执行 `grep -nE "\.cta\.(focus|click)\(\)|\.cta\.(focus|click)\b" index.html`，再交叉 `grep -nE "setTimeout|requestAnimationFrame" index.html` 后人工核对回调体内是否引用 `cta` / `home-cta`。**预期零命中**（v2 review 已确认主流 reload 路径无法复现自动聚焦）。
2. **步骤 2（移除兜底）**：删除 `init()` 末尾约行 2239–2242 的兜底块：
   ```js
   var cta = $("#home-cta");
   if (cta && document.activeElement === cta){
     cta.blur();
   }
   ```
   连同其上方的两条说明注释一并删除（保持文件整洁）。
3. **步骤 3（回归测试）**：清空 localStorage → 连续 reload 3 次：每次 `document.activeElement === document.body`（或 `<html>`）、`metro.classList.contains("is-open") === false`、今日无 `tgm:log:*` 键、active view = `view-home`、CTA 无 `:focus` 高亮、不写入 `finished:false` session。
4. **回滚条件**：若步骤 1 grep 命中任何对 `.cta` 的 `focus()`/`click()`（含回调内），**先修那条自动聚焦路径**再决定是否移除兜底；若步骤 3 任何一次 reload 复现自动聚焦或自动开 metro，**立即回滚本条**，留 issue 给下一轮。

### §5.5 [新] 节拍器倒计时数字呼吸（增量 E1）

1. **位置**：`setPhase(phase)` 同步执行块内（v2 §5.3 已建立的单一同步函数，约行 2030 附近），在更新 `ring-core` 背景、`ring-phase.textContent`、`aria-live`、计时方向、触感/提示音的**同一同步块内追加一行** `ring-count` 字号赋值。
2. **改成什么**：
   ```js
   // E1: 倒计时数字随 phase 呼吸（收紧外张满值、放松内收 8%），与圆环 scale 同频但不耦合
   var mega = parseFloat(getCSSVar("--text-mega"));   // 88
   el.count.style.fontSize = (phase === "contract" ? mega : mega * 0.92) + "px";
   el.count.style.transition = "font-size var(--dur-breath) var(--ease-breath)";
   ```
   - 收紧阶段（主色主导）：字号 = `--text-mega`（88px，满值，"提起来"的外张感）。
   - 放松阶段：字号 = `--text-mega * 0.92`（≈81px，内收 8%，"松下来"的收敛感）。
   - 阶段切换瞬间用 `--ease-breath` 缓动过渡（与圆环 scale 同频），**单拍内不再二次插值**（即一个 phase 内字号恒定，不随 remaining 滚动变化——避免与 displayed countdown 数字内容变化叠加产生视觉抖动）。
3. **CSS fallback（`prefers-reduced-motion`）**：在节拍器既有的 reduced-motion 降级规则块内**追加**：
   ```css
   @media (prefers-reduced-motion: reduce){
     .metro .ring-count { transition: none !important; }
   }
   ```
   并在 `setPhase` 内增加 reduced-motion 分支：若 `matchMedia('(prefers-reduced-motion: reduce)').matches` 为真，**两次 phase 的字号都赋满值 `--text-mega`**（即关闭呼吸），与现有节拍器降级（圆环改静态阶段切换）策略同源。
4. **风险隔离断言**：E1 只读 `--text-mega` 与 `--ease-breath` 两个**已存在** token，不新增 token；只改 `ring-count` 这一个元素的 `style.fontSize` 与 `style.transition`，**完全不触碰** `ring-core` 背景、`ring-phase` 文本、`aria-live`、`remaining` 累加逻辑、触感/提示音——因此即使 E1 字号动画出 bug（如 NaN、NaNpx），圆环节拍、计时、phase 同步仍正常工作，bug 被隔离在 `ring-count` 视觉层。
5. **与 M1 的解耦**：§5.1 的 `totalElapsed += 1000` 在 `setInterval` 回调内，§5.5 的字号赋值在 `setPhase()` 同步块内——两者**不同函数、不同调用栈**，互不依赖、互不污染。
6. **验收**：
   - 进入训练 → 观察中央倒计时数字：收紧阶段字号略大、放松阶段字号略小，肉眼可辨但**不抢圆环视觉主权**（8% 幅度，非夸张）。
   - DevTools `prefers-reduced-motion: reduce` → 字号在两 phase 间不再变化（恒为 88px），圆环节拍降级为静态阶段切换（沿用 v2 既有行为）。
   - phase 边界采样（收紧→放松、放松→收紧各 5 次）：`ring-count.style.fontSize` 与 `ring-phase.textContent` / `ring-core` 背景色**同一帧切换**，无错位（沿用 v2 setPhase 同步保证）。
   - 数字内容（remaining 倒计时）仍正常滚动，字号呼吸**不破坏**数字可读性（81–88px 区间远超 AA 大字阈值）。

---

## 6. 存储不变项（沿用 v2 §6，本轮零变化）

- 键名：`tgm:settings` / `tgm:plans` / `tgm:log:YYYY-MM-DD` / `tgm:streak` 全部不变。
- `tgm:settings` 字段不变。`tgm:plans` 仍为内置 4 方案。`tgm:log:*` session 写入逻辑（含 `finished: true/false` 都计数、`goalGroups` 快照、`manualOverride` 恒 false）不变——**唯一变化是 `durationSec` 字段从恒 0 变为真实秒数**（这是 bug 修复，不是数据模型变更；写入侧 recordSession 签名、读取侧 day-detail 渲染都不动，只是输入值变正确）。
- streak 重算时机（每次写 log 后即时重算缓存）不变。4 档热力色映射规则不变。时间一律本地时区、`YYYY-MM-DD` 手写格式化，**禁止 UTC**。

---

## 7. 技术约束（沿用 v2 §7，本轮零变化 + 一条强化）

1. 单一静态 HTML 文件，内联 `<style>` + `<script>`，无外部 CSS/JS。
2. 零联网、零 CDN、零外部字体/图片/SVG/SDK（含 Google Fonts）。图标全部 inline SVG。
3. 预览：`file://` 双击打开，或 `python3 -m http.server 8080` 后访问根路径。375×812 与 1440×900 都须正常。
4. 移动优先 + 响应式：根容器 `max-width: 480px` + `margin: 0 auto`，375↔480↔1440 不断版、不强行多列。
5. 可点击区域 ≥ 44×44px。
6. 无障碍：`prefers-color-scheme` + 手选覆盖、`prefers-reduced-motion` 退化（**E1 必须遵守**）、按钮带 `aria-label`、节拍器阶段 `aria-live="polite"`、色彩对比 WCAG AA、**非 active 视图加 `inert` 屏蔽辅助技术**（m1 修复后新增）。
7. 无构建步骤，原生 HTML/CSS/JS。
8. console 零错误、零警告、零 assert 失败——v2 §7.8 全部继承。

---

## 8. 本轮仍不做（明确排除，防止范围蔓延）

- **F5 自定义方案增删改**：V2 底部仍不出现"新增方案"入口；`tgm:plans` 仍只有内置 4 条。
- **F6 统计页**：V3 下方"本周/本月完成率小统计"仍不渲染。
- **F7 成就页**：`tgm:achievements` 键本轮不读写。
- **F8–F10（P2）**：每日一句文案库不扩容、不新增 F9 导入、不新增 F10 PWA。
- **历史编辑/补卡**：V3 点格仍只读展开，`manualOverride` 恒 false。
- **节拍器结构重构**：M1 只加一行 `totalElapsed += 1000`，E1 只在 setPhase 内追加一行字号赋值，**不改** outer/mid/core 三层 DOM 与 CSS。
- **token 重发明**：本轮**零** token 取值变化（含 `--text-muted`、`--text-mega` 都不动，E1 只读不改）。
- **视觉方向 PIVOT**：本轮是 REFINE，严禁换色/换字/换布局范式。E1 是**强化**现有母题而非引入新视觉语言。
- **`inert` 替代方案**：禁止用 `display:none` / `visibility:hidden` / `pointer-events:none` / `tabindex=-1` 手动遍历替代 `inert`（前者有副作用，后者维护成本高且不屏蔽辅助技术）。

---

## 9. 评审可逐条核对的"完成"标准（本轮自测清单）

照此逐条过，每条对应一个 issue id 或增量编号：

1. **[M1]** 清空 localStorage → 开始训练「入门（3s 收 / 3s 放 / 10 次）」→ 自然结束（约 60s）→ 进记录页点今天 → day-detail 显示「入门 · 10 次 / 1 分钟」（`durationSec ≈ 60`，`Math.round(60/60)=1`），不再恒为「0 分钟」。再跑「巩固（5s/5s/12 次×2 组）」自然结束 → day-detail 第二条显示「巩固 · 24 次 / 4 分钟」。DevTools 在 session 写入处断点：`recordSession` 第 3 参数 `durationSec` 在 ≥60s 训练后 **> 0**。`grep -n "totalElapsed += 1000" index.html` 命中 1 处，位于 `startTick` 的 setInterval 回调 `remaining -= 1;` 之后。
2. **[m1]** 进入 home 视图 → 连续按 Tab → 焦点只在 tabbar 与 home 内可聚焦元素间循环，**不跳到** train/history/settings 里的 plan-card / cal-cell / switch；DevTools `document.querySelectorAll('.view[inert]').length === 3`（非 active 的三个 view 都带 inert），active view 无 inert 属性。切到任意其他 tab → 同样只有该 tab 的 view 无 inert，其余三个 inert。focus-visible 外环不再在不可见区域闪烁。
3. **[n1]** DevTools：`getComputedStyle(document.getElementById("tab-indicator")).height === "4px"`；切换 4 个 tab 时单条 transform 滑动行为与 v2 一致，无视觉退化。
4. **[n2]** (a) `grep -nE "\.cta\.(focus|click)\(\)|home-cta.*\.(focus|click)" index.html` **零命中**（含 setTimeout/rAF 回调内）；(b) `grep -n "cta.blur()" index.html` 零命中（兜底已删）；(c) 清空 localStorage → 连续 reload 3 次：每次 `document.activeElement === document.body`（或 html）、`!metro.classList.contains("is-open")`、今日无 `tgm:log:*` 键、active view = `view-home`、CTA 无 `:focus-visible` 高亮、不写入 `finished:false` session。
5. **[E1]** (a) 进入训练「入门」→ 观察中央倒计时数字：收紧阶段 `getComputedStyle(ring-count).fontSize === "88px"`、放松阶段 `=== "81px"`（或浏览器取整后的等值，`88*0.92=80.96`），肉眼可见但不抢圆环；(b) DevTools 切 `prefers-reduced-motion: reduce` → 两 phase 字号恒为 88px（`ring-count.style.transition === "none"` 或等同），圆环节拍降级为静态阶段切换（v2 既有行为）；(c) phase 边界采样收紧→放松、放松→收紧各 5 次：`ring-count.style.fontSize`、`ring-phase.textContent`、`getComputedStyle(ring-core).backgroundColor` **同一帧切换**；(d) 数字内容（remaining 倒计时）仍正常滚动；(e) E1 出错（如手动把 0.92 改 NaN）也不影响圆环 scale、计时、phase 同步——风险隔离验证。
6. **[regression]** v2 highlights 全部不退化：
   - 三层呼吸圆环 setPhase 同步零错位（边界帧 phase 文本与 ring-core 背景同帧切换）；
   - 设计 token 取值零变化（`--text-muted` 浅 #756B5F / 深 #9C9085 仍达 AA：浅 4.89:1 / 深 5.55:1）；
   - tab 指示条 transform 滑动逻辑（单条 + transform + no-anim 首屏屏蔽）除高度 3→4px 外不动；
   - 7 天条 + 月历今日 outline 视觉同源（共用 `heatLevel` 与 2px solid brand）；
   - 离线硬约束：`file://` 断网打开 console 零网络错误、零 CDN、零外部资源；
   - 桌面 1440 / 平板 768 / 移动 390 三档视口 max-width 480px 居中窄容器无断版；
   - focus-visible 全站 outline:3px brand-soft + offset 2px 不变（m1 修复后不可见元素不再被 Tab 命中，外环只出现在可见 active view 内）。
7. **[范围]** 本轮未渲染任何 §8 列出的"不做"项（无自定义方案入口、无统计页、无成就页、无数据导入、无 PWA、无历史编辑、无 token 取值变化、无视觉 PIVOT）。

---

## 10. 自评清单（本轮预期分数，1–10，供评审对照）

> 相比 v2（设计 8 / 原创 8 / 可用性 8 / 交互 8 / 加权 8.00）：M1 是可用性 major（记录页时长信息从恒错变正确），m1 是可用性 minor（键盘可达性从"会闪烁"变"干净循环"），n1/n2 是 nit（工艺与根因整洁度）；E1 是**唯一**能正向影响设计/原创两分的增量。**诚实预估**：四项 issue 修完稳住可用性/交互/工艺底线，E1 给设计/原创提供一个试探上扬的合法路径——但 E1 是 8% 微幅呼吸，不是结构性视觉资产，**单凭它把 8 抬到 9 需要评审认定"母题被显著强化"**，本轮不主动虚报 9，留 8–8.5 区间让评审裁定。

- **设计品质：8（持平，E1 若被认可可浮 8.5）** — E1 让节拍器中央数字也"在呼吸"，与三层圆环 scale 同频，强化"晨光里的呼吸节拍器"母题；但 E1 是 8% 微幅、单点增强，不构成新视觉资产（不引入新插画/有机形/色彩），不足以单方面把 8 抬到 9。若评审判定 E1 + 既有的圆环/排版/色彩协同后母题被显著强化，可浮 8.5；否则持平 8。
- **原创性：8（持平，E1 若被认可可浮 8.5）** — 原创性来源（陶土橘 + 呼吸圆环同频 + 编辑式非对称 + tabular-nums 大数字）全部保留；E1 是对既有母题的深化（"连数字都在呼吸"），不是新的刻意创作决策，原创性增量小于一次全新视觉决策。同样留 8–8.5 区间，不虚报 9。
- **可用性：8（持平）** — M1 修复让记录页时长信息从"恒错"变"正确"，是可用性 major 的根因清除；m1 让键盘 Tab 循环干净（不再闪烁/不再要按几十下）；n2 移除兜底是根因整洁度的提升。但这些都是**修复 v2 的退化/缺陷回到应有的 8**，不构成越过 8 的可用性新增能力（如新增功能/新增可达性维度），所以持平 8。若评审认为"键盘循环干净 + 时长正确 + 根因整洁"三件叠加把可用性从 v2 的"有 major 的 8"抬到"无 major 的 8.5"，可浮 8.5。
- **交互流畅度：8（持平）** — n1 把 tab 指示条高度对齐契约字面（3→4px）是工艺细节；E1 让数字呼吸与圆环呼吸同频，交互层的"呼吸一致性"略增。但 v2 的交互流畅度已经拿到 8 且本轮无重大交互范式升级（如新手势/新转场），持平 8。E1 若被认定为"交互层的签名细节"可浮 8.5。

> **加权预期**：四项 issue 修复后底线稳固（不跌破 8），E1 是上行期权——本轮加权预期落在 **8.00–8.25** 区间，只有 E1 被评审显著认可且三项 8.5 浮动同时命中时才可能触及 8.5+。**不主动预测 ≥8.5**，避免虚高。
