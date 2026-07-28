# loop-orchestrator — ROUTING

15 个 ai-coding-loop agent → ECC subagent 完整路由表。

## 路由规则

1. **优先委派 ECC**：路由壳先尝试调 `ecc-<name>` subagent（harness 已通过 mini-installer 物理加载）
2. **缺失 fallback**：若 ECC subagent 名称在 `capabilities.json` 中不存在，跳过委派，回到 ai-coding-loop 原行为
3. **不破坏兜底**：原 `[.claude/agents/](../.claude/agents/)` 15 个 agent 完全不动；路由壳存在则它们**不被加载**（写 `loop-orchestrator/agents/<name>.md` 占位），路由壳缺失则 fallback 生效

## 完整路由表

### 1. orchestrator → `ecc-orch-pipeline`（skill 层委派）

| 字段 | 值 |
|---|---|
| ai-coding-loop 原 agent | `[orchestrator.md](../.claude/agents/orchestrator.md)` |
| 委派目标 | `ecc-orch-pipeline` skill + `[orch-pipeline/SKILL.md](../ECC-main/skills/orch-pipeline/SKILL.md)` |
| 物理复制 | ✗（orch-pipeline 是 skill，不是 agent） |
| 调用方式 | `Skill('ecc:orch-pipeline')` 直接调 |
| fallback | 跳到 state.py 直接推进状态机 |

### 2. context-scout → `ecc-repo-mapping` + `ecc-code-explorer`

| 字段 | 值 |
|---|---|
| 原 agent | `[context-scout.md](../.claude/agents/context-scout.md)` |
| 委派目标 1 | `ecc-repo-mapping` skill |
| 委派目标 2 | `ecc-code-explorer`（agent） |
| 物理复制 | ✓ `ecc-code-explorer` |
| fallback | 原 [repo-mapping](../.claude/skills/repo-mapping/SKILL.md) skill |

### 3. requirement-clarifier → `ecc-clarifying-questions`

| 字段 | 值 |
|---|---|
| 原 agent | `[requirement-clarifier.md](../.claude/agents/requirement-clarifier.md)` |
| 委派目标 | `ecc-clarifying-questions` skill |
| 物理复制 | ✓ |
| fallback | 原 [clarifying-questions](../.claude/skills/clarifying-questions/SKILL.md) skill |

### 4. requirement-analyst → `ecc-requirement-to-ac`

| 字段 | 值 |
|---|---|
| 原 agent | `[requirement-analyst.md](../.claude/agents/requirement-analyst.md)` |
| 委派目标 | `ecc-requirement-to-ac` skill |
| 物理复制 | ✓ |
| fallback | 原 [requirement-to-ac](../.claude/skills/requirement-to-ac/SKILL.md) |

### 5. solution-architect → `ecc-planner` + `ecc-architect`

| 字段 | 值 |
|---|---|
| 原 agent | `[solution-architect.md](../.claude/agents/solution-architect.md)` |
| 委派目标 1 | `ecc-planner`（agent） |
| 委派目标 2 | `ecc-architect`（agent） |
| 物理复制 | ✓ 两个 |
| fallback | 原 [impact-analysis](../.claude/skills/impact-analysis/SKILL.md) skill |

### 6. feature-coder → `ecc-tdd-guide` + `ecc-feature-coder`

| 字段 | 值 |
|---|---|
| 原 agent | `[feature-coder.md](../.claude/agents/feature-coder.md)` |
| 委派目标 1 | `ecc-tdd-guide` |
| 委派目标 2 | `ecc-feature-coder`（wrapper 新建） |
| 物理复制 | ✓ |
| fallback | 原 [convention-mining](../.claude/skills/convention-mining/SKILL.md) |

### 7. modification-surgeon → `ecc-modification-surgeon`（wrapper 新建）

| 字段 | 值 |
|---|---|
| 原 agent | `[modification-surgeon.md](../.claude/agents/modification-surgeon.md)` |
| 委派目标 | `ecc-modification-surgeon` |
| 物理复制 | ✗ wrapper 建 |
| fallback | 原 [contract-sync](../.claude/skills/contract-sync/SKILL.md) |

### 8. unit-test-engineer → `ecc-unit-test-engineer`（wrapper 新建）

| 字段 | 值 |
|---|---|
| 原 agent | `[unit-test-engineer.md](../.claude/agents/unit-test-engineer.md)` |
| 委派目标 | `ecc-unit-test-engineer` |
| 物理复制 | ✗ |
| fallback | 原 [test-authoring](../.claude/skills/test-authoring/SKILL.md) |

### 9. integration-test-engineer → `ecc-e2e-runner`

| 字段 | 值 |
|---|---|
| 原 agent | `[integration-test-engineer.md](../.claude/agents/integration-test-engineer.md)` |
| 委派目标 1 | `ecc-e2e-runner`（agent） |
| 委派目标 2 | `ecc-integration-test-engineer`（wrapper 新建） |
| 物理复制 | ✓ |
| fallback | 原 [integration-e2e](../.claude/skills/integration-e2e/SKILL.md) |

### 10. regression-guard → `ecc-regression-guard`（wrapper 新建）

| 字段 | 值 |
|---|---|
| 原 agent | `[regression-guard.md](../.claude/agents/regression-guard.md)` |
| 委派目标 | `ecc-regression-guard` |
| 物理复制 | ✗ |
| fallback | 原 [verify-gate](../.claude/skills/verify-gate/SKILL.md) |

### 11. security-auditor → `ecc-security-reviewer`

| 字段 | 值 |
|---|---|
| 原 agent | `[security-auditor.md](../.claude/agents/security-auditor.md)` |
| 委派目标 1 | `ecc-security-reviewer` |
| 委派目标 2 | `ecc-security-scan` skill |
| 物理复制 | ✓ |
| fallback | 原 [security-sweep](../.claude/skills/security-sweep/SKILL.md) |

### 12. perf-auditor → `ecc-perf-auditor`（wrapper 新建）

| 字段 | 值 |
|---|---|
| 原 agent | `[perf-auditor.md](../.claude/agents/perf-auditor.md)` |
| 委派目标 | `ecc-perf-auditor` |
| 物理复制 | ✗ |
| fallback | 原 [perf-quantify](../.claude/skills/perf-quantify/SKILL.md) |

### 13. code-reviewer → `ecc-code-reviewer` + 8 语言 reviewer

| 字段 | 值 |
|---|---|
| 原 agent | `[code-reviewer.md](../.claude/agents/code-reviewer.md)` |
| 委派目标 1 | `ecc-code-reviewer` |
| 委派目标 2 | 按文件扩展名动态路由：`ecc-python-reviewer` / `ecc-typescript-reviewer` / ... |
| 物理复制 | ✓ 8 个语言 reviewer |
| fallback | 原 [self-review](../.claude/skills/self-review/SKILL.md) |

### 14. fixer → `ecc-fixer` + `ecc-build-error-resolver`

| 字段 | 值 |
|---|---|
| 原 agent | `[fixer.md](../.claude/agents/fixer.md)`（`tools: read, edit, bash` 由 transform-agents.py 注入） |
| 委派目标 1 | `ecc-fixer`（wrapper 新建） |
| 委派目标 2 | `ecc-build-error-resolver` |
| 物理复制 | ✓ |
| fallback | 原 [fix-with-rca](../.claude/skills/fix-with-rca/SKILL.md) |

### 15. delivery-reporter → `ecc-delivery-reporter`（wrapper 新建）

| 字段 | 值 |
|---|---|
| 原 agent | `[delivery-reporter.md](../.claude/agents/delivery-reporter.md)` |
| 委派目标 | `ecc-delivery-reporter` |
| 物理复制 | ✗ |
| fallback | 原 [delivery-report](../.claude/skills/delivery-report/SKILL.md) |

## mini-installer 复制清单

段 2 启动后，`mini-installer.js` 把以下 16 个 agent 从 `ECC-main/agents/` 复制到 `wrapper/.claude/agents/`，**加 `ecc-` 前缀**：

| # | 源 | 目标 |
|---|---|---|
| 1 | `code-explorer.md` | `ecc-code-explorer.md` |
| 2 | `planner.md` | `ecc-planner.md` |
| 3 | `architect.md` | `ecc-architect.md` |
| 4 | `tdd-guide.md` | `ecc-tdd-guide.md` |
| 5 | `code-reviewer.md` | `ecc-code-reviewer.md` |
| 6 | `security-reviewer.md` | `ecc-security-reviewer.md` |
| 7 | `e2e-runner.md` | `ecc-e2e-runner.md` |
| 8 | `build-error-resolver.md` | `ecc-build-error-resolver.md` |
| 9 | `python-reviewer.md` | `ecc-python-reviewer.md` |
| 10 | `typescript-reviewer.md` | `ecc-typescript-reviewer.md` |
| 11 | `cpp-reviewer.md` | `ecc-cpp-reviewer.md` |
| 12 | `rust-reviewer.md` | `ecc-rust-reviewer.md` |
| 13 | `go-reviewer.md` | `ecc-go-reviewer.md` |
| 14 | `java-reviewer.md` | `ecc-java-reviewer.md` |
| 15 | `react-reviewer.md` | `ecc-react-reviewer.md` |
| 16 | `vue-reviewer.md` | `ecc-vue-reviewer.md` |

skill 文件不复制，由 harness 通过 `Skill('ecc:...')` 引用 ECC 内 skill（无需物理移动）。
