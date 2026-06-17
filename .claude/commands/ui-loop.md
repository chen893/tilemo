---
description: 运行 UI 优化流水线（planner → generator ⇄ evaluator 多轮迭代，确定性循环控制）
argument-hint: <一句话需求> [--rounds N（默认 10）] [--resume]
---

# UI 优化主循环（Harness）

你（主 agent）是本流水线的执行者，照下面的规则机械执行。**你不对 UI 质量做任何判断**——质量判断只属于 ui-evaluator，方向判断只属于 ui-generator。三个角色都是无状态 subagent，所有状态通过 `artifacts/` 下的文件传递，你在每次调用 Agent 工具时必须在 prompt 里告知：本次任务类型、轮次 N、需要读的文件路径。

用户输入：$ARGUMENTS

## 第 0 步：准备

1. 解析参数：需求描述、`--rounds N`（默认 10）、`--resume`
2. 确保当前目录是 git 仓库（不是则 `git init`），创建 `artifacts/` 目录
3. `--resume` 或 `artifacts/` 已有 review 文件时：读取已有 spec、最大版本号 N 和历史分数，从第 N+1 轮继续，跳过第 1 步
4. 确认 chrome-devtools MCP 可用（evaluator 依赖它操作页面）

## 第 1 步：规划（只跑一次）

调用 `ui-planner`，传入用户需求原文，产出 `artifacts/spec.md`。

## 第 2 步：迭代轮 N（从 1 开始）

按顺序执行，每步一次 Agent 调用：

1. **契约**：调用 `ui-generator`（任务类型 A），产出 `artifacts/contract-vN.md`
2. **审约**：调用 `ui-evaluator`（任务类型 A）审核契约。REJECTED 则调用 `ui-generator`（任务类型 B）修订——**最多往返 2 次**，仍未达成一致则按评审员最后一版批注为准强制定稿，继续往下走
3. **实现**：调用 `ui-generator`（任务类型 C），告知轮次 N。完成后验证 git tag `vN` 存在（不存在则要求补打）
4. **评审**：调用 `ui-evaluator`（任务类型 B），产出 `artifacts/review-vN.json`
5. **记分**：解析 review JSON，把本轮四项分、加权总分、verdict、REFINE/PIVOT 标记追加到 `artifacts/scores.md` 的表格里，并向用户简报一行（轮次、总分、verdict、最关键 issue）
6. **停止判定**（机械执行，按顺序）：
   - `verdict` 为 `pass` → 跳到第 3 步（达标）
   - 连续 3 轮 `weighted_total` 未超过历史最高分 → 跳到第 3 步（平台期）。**PIVOT 后的第一轮不计入平台期计数**
   - 已完成第 `--rounds` 轮 → 跳到第 3 步（轮次上限）
7. **决策**：调用 `ui-generator`（任务类型 D），产出 `artifacts/decision-vN.md`（REFINE 或 PIVOT），回到本步骤 1 进入第 N+1 轮

## 第 3 步：终止交付（不默认推荐最后一版）

分数轨迹不是单调的，人类经常更偏好中间某一轮。向用户输出：

1. 终止原因（达标 / 平台期 / 轮次上限）
2. 完整分数历史表（每轮四项分 + 加权总分 + REFINE/PIVOT 标记）
3. 历史最高分版本号 与 最后一轮版本号（不一致时明确指出）
4. 每个版本的预览方式（`git checkout vN` + `artifacts/preview.md`，以及 `artifacts/screenshots/vN/` 的截图）
5. **请用户从快照中做最终选择**，并列出候选版本各自的遗留 issue 清单

## 异常处理

- evaluator 输出的 JSON 不合法、或出现"提升设计感"类不可执行表述 → 原样退回 ui-evaluator 重写，不要自己脑补
- 页面起不来 → 调用 ui-generator 修复启动问题后重新评审，此次不消耗轮次计数
- 任何一步 subagent 失败 → 重试一次，仍失败则带着已有产物向用户报告中断点

## 预期管理

硬阈值（设计品质与原创性双 ≥ 8）相当严格，多数 run 会以平台期而非达标终止——这不是失败。完整 run 耗时可达数小时；简单页面建议先单独做一版对照，确认不满意再启动本流程。
