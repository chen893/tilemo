# Goal:把单文件 HTML 应用迁移为 monorepo(Expo app + React web,共享 core)

## 背景
仓库根目录 `index.html`(~5500 行,零框架,单内联 `<script>`)是一个呼吸 + 提训练 app
「今天提了么」(主题看起来是盆底肌/Kegel 训练,请读 index.html 确认),核心是带节拍的
呼吸引导(吸 / 收紧 / 放松 + 每拍时长)。

现状关键事实:
- 47 个 CSS 自定义属性作为设计 token;视觉语言 = 暖朱陶单色体系(#E85A4F 单一强调色)、
  暖纸白底、有机曲线 / 呼吸体 / 绷紧的弦、呼吸动画系统(含每拍 `--dur-breath` 时序,
  v14/v15 专门调过)。
- **双壳结构已存在**:移动 app 壳(单列 + 底部 tabbar)+ 桌面 web 壳(≥1024px 多区布局:
  顶导 + 侧栏 + 热力图 / 日历 / 计划 / 统计)。
- 数据持久化:web 端 localStorage,前缀 `tgm:*`(见文件头注释)。
- 功能:呼吸节拍器、日历热力图、连续天数 / 统计、目标与计划、主题(明/暗)、导出、历史记录。
- 上下文资产(已被 .gitignore 忽略但**仍在磁盘上,存在就读取**):
  `artifacts/spec.md`、`artifacts/contract-*.md`、`artifacts/review-*.json`、
  `artifacts/scores.md`、`.claude/agents/ui-*.md` —— 产品 spec、视觉语言定义、历轮 UI 优化记录。

## 目标
迁移为 monorepo,两个产物:
1. **移动 app**:React Native + Expo。
2. **网页端**:React(与 RN 同栈,最大化逻辑 / 心智模型复用)。
两端共享:业务逻辑、数据模型、设计 token。

## 必须保留(硬约束)
- **视觉语言 1:1 搬过去**:暖朱陶单色体系、呼吸体动画、有机曲线。token 抽象成框架无关的源,
  web 与 RN 各自消费(RN 没有 CSS 变量)。
- **呼吸 / 节拍引擎是签名特性**:时序逻辑(每拍时长、首拍过渡、收紧升温)从 `index.html`
  提取成**纯 TS,两端共用**——别各写一份。
- **Web 端数据向后兼容**:现有用户的 `tgm:*` localStorage 数据不能丢;web 端需读取 / 迁移。
- **功能对齐**:节拍器、热力图、连续天数 / 统计、目标计划、主题、导出、历史,迁完后行为与现版一致。

## 建议结构(起点,可在 plan 中调整)
```
apps/web            # React + Vite,桌面 web 壳 + 响应式
apps/mobile         # Expo / React Native,移动 app 壳
packages/core       # 纯 TS:呼吸引擎 / 节拍 / 统计 / 目标计划(无 DOM/RN 依赖)
packages/data       # 数据模型 + repository,storage 用 adapter(web=localStorage,RN=AsyncStorage)
packages/design-tokens  # token 源(TS/JSON),喂给 web 与 RN
packages/ui         # 可选:跨端原子组件,或拆 ui-web / ui-mobile
pnpm-workspace.yaml + turbo.json
```

## 待评估的关键决策(plan 里逐条给推荐 + 理由)
1. **RN Web vs 双端分离**:一套 RN 代码同时出 web+mobile(共享最大,但 web 体验偏 app),
   还是 React(web)+ RN(mobile)只共享 core/data/tokens?我倾向后者——现有桌面 web 壳是
   多区布局,RN Web 不好表达,且 web 更「原生网页」。
2. 状态管理方案(Zustand / Jotai / Context?两端能否共用)。
3. storage adapter 的抽象边界(数据层怎么做到 web/RN 两实现一套接口)。
4. 设计 token 怎么从 CSS 变量 → 跨端消费(Style Dictionary / 手写)。

## 工作方式(重要)
- **先 plan,后动手**:进入 plan mode,**把 `index.html` 当唯一事实来源读透**,把上面四个
  决策逐一给推荐 + 理由,产出分阶段迁移计划——先搭骨架 + 抽 core/data/token 的一条垂直切片
  (验证两端能跑通一个最小功能,如节拍器单屏),再补齐其余功能。计划经我确认后再落代码。
- **增量、可验证**:不要一口气盲改,每个阶段都要能 build / 跑起来。
- **不要删 `index.html`**:迁移期它一直是参照物。
