# Decision v2 — 第 2 轮评审后决策

## 1. decision

**REFINE**

## 2. 理由

- **趋势向好**:加权 7.50 → 8.00(↑0.50),verdict 从 v1 的 2 个 major 降到本轮的 1 个新 major + 1 minor + 2 nit,设计/原创两项持平 8/8 且无 regression 标记。
- **v1 两个结构性 major 已根因级修复**:M1(CTA autostart)三次清空 localStorage + reload 路径均无法复现;M2(muted 对比度)浅色 4.89:1 / 深色 5.55:1,达 AA 且不破坏 primary>secondary>muted 正文秩序——这是 token 微调的教科书案例,方向稳定。
- **本轮新 major 是局部遗漏,非结构性硬伤**:`durationSec=0` 是 `totalElapsed` 变量从声明→重置→却无人累加的单点缺失,修复成本一行;不是设计语言或架构层面的死胡同。
- **视觉语言稳定可辨**:陶土橘 + 晨雾米白 + 暖夜炭主色、三层呼吸圆环、大圆角编辑式排版、节拍器 setPhase 同步零错位——`direction_assessment` 没有任何"方向需重做"的信号。PIVOT 代价远高于收益。

综合:四个判定维度全部命中 REFINE 触发条件,无一条命中 PIVOT。

## 3. 第 3 轮重点改造清单(按 severity 排序)

### [major] 修 `session.durationSec` 永远为 0

- **位置**:`index.html` `startTick()` 的 setInterval 回调(行约 2055 附近,`remaining -= 1` 之后)。
- **改成什么**:在 `remaining -= 1;` 紧跟一行 `totalElapsed += 1000;`。
  - 理由:与 displayed countdown(`el.count.textContent = remaining`)同源、同频率,自然避免"显示秒数 ≠ 写入秒数"的二次漂移;比评审给的备选方案(`onPhaseEnd` 开头加 `Date.now() - phaseStartTs`)更简单且不需要额外时间戳计算。
- **自测**:完成一组「入门(3s 收 / 3s 放 / 10 次)」后,记录页 day-detail 应显示约「入门 · 10 次 / 1 分钟」(60s ± 容差)。提前结束 4 reps 应显示约「入门 · 4 次 / 0 分钟」(<60s 取整为 0 是符合预期的,只需 ≥60s 不再恒为 0)。
- **边界**:`paused` 态 `state !== "running"` 时回调 early-return,不会误累加——保持现状,不动 early-return 分支。

### [minor] 给非 active 视图加 `inert`,阻止 Tab 穿透

- **位置**:`switchView(name)` 函数体内,在 `.is-active` class 切换的同一执行块。
- **改成什么**:
  ```js
  document.querySelectorAll('.view').forEach(function(v){
    if (v.id === 'view-' + name) v.removeAttribute('inert');
    else v.setAttribute('inert', '');
  });
  ```
  - 不引入 `display:none`(会让 transform 重算、节拍器圆环首次 transform 跳变);`inert` 同时屏蔽 focus 与辅助技术,且不影响布局。
- **自测**:home 视图按 Tab,焦点应只在 tabbar 与 home 内可聚焦元素间循环,不会跳到 train/history/settings 里的 plan-card / cal-cell / switch;focus-visible 外环不再在不可见区域闪烁。

### [nit] tab 指示条高度 3px → 4px(对齐契约 §5.2.1)

- **位置**:`#tab-indicator` 的 CSS。
- **改成什么**:`height: 4px;`。
- **自测**:`getComputedStyle($('#tab-indicator')).height === '4px'`。

### [nit] 移除 `init()` 末尾 `cta.blur()` 兜底,确认根因清除

- **步骤 1**:先 `grep -nE "\.cta\.(focus|click)\(\)" index.html` 以及 `setTimeout`/`requestAnimationFrame` 回调内对 `cta` 的引用,确认零命中。
- **步骤 2**:若 grep 干净,删除 `init()` 末尾的 `cta.blur();`。
- **步骤 3**:三次 reload 测试,确认 CTA 不自动获焦、metro 不自动打开、不写入 `finished:false` session。
- **回滚条件**:若步骤 1 命中任何 `cta.focus()`/`cta.click()`,先修那条自动聚焦路径,再决定是否保留/移除兜底。

## 4. 下一轮不要碰(防 regression)

以下各项 v1→v2 评审都给出"fixed / 零错位 / 教科书级"的正面证据,**第 3 轮一律不动**,改动溢出契约即视为 regression 风险:

- **三层呼吸圆环**(`ring-outer/mid/core` 的 setPhase 同步、scale 动画、core 文字色切换)——m2 修复后边界帧零错位。
- **设计 token 体系**(色板 / 字阶 / 间距 / 圆角 / 阴影)——M2 muted 对比度是精准微调,不要再动 `--text-muted` 数值,否则可能跌破 AA 或破坏正文层级。
- **AA 对比度**(primary / secondary / muted / brand 在浅深两模式的相对亮度)。
- **tab 指示条的 transform 滑动逻辑**(单条 `#tab-indicator` + transform transition + `no-anim` 首屏屏蔽)——除改高度 3→4px 外不动。
- **setPhase 同步执行块**(ring-core 背景、phase 文本、aria-live、计时方向、触感/提示音同帧切换)。
- **离线硬约束**(零 fetch/XHR、零 CDN、零外部资源、单一 HTML 可双击运行)。
- **7 天条 + 月历今日 outline 视觉同源**(共用 `heatLevel` 与 2px solid brand)。

## 5. 可选的克制增量(拔高原创性/设计品质)

目前卡 8,设计/原创都已"无俗套、有辨识度",但还缺一个能让人记住的**签名细节**。建议第 3 轮在修 issues 之外,**仅做一个**:

- **节拍器中央倒计时的"呼吸字号同步"**:`ring-count` 的字号在收紧阶段(主色主导)随 remaining 从满值 `--text-mega` ease-out 微缩到 `--text-mega * 0.92`,放松阶段反向。幅度极小(8%),不抢节拍圆环的视觉主权,但让数字本身也"在呼吸",强化"晨光里的呼吸节拍器"这个母题。
  - 必须配合:`prefers-reduced-motion` 下退化为静态字号,与现有节拍器降级策略一致。
  - 风险评估:与圆环 scale 同频但不耦合,即使数字动画出 bug,圆环节拍仍正常工作——风险隔离。
  - 若实现优先级冲突,issues 修复优先,此条可弃。
