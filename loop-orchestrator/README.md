# loop-orchestrator

合并 **ai-coding-loop**（强校验状态机 + verify-gate 拦截）与 **ECC**（5 层编排 + orch-* 家族 + 多语言专家）的优点的 harness 包。

## 它是干什么的

让 wrapper 根的 Claude Code session 既能跑：
- **ai-coding-loop** 的硬门禁（6 层 verify + diff 纯净 + 抑制标记拦截 + REPLAN/SAFE_STOP 降级链）
- **ECC** 的方法论资源（size classifier + orch-pipeline 5 ops + orch-review 双 stage fail-closed + 8 个多语言专家 reviewer）

通过单一 bootstrap 命令（`node loop-orchestrator/bin/install.js`）完成两套资源的接入，避免用户手动配置 ECC install + 写 hooks + 维护 commands.env 三件事。

## 文档导航

| 文件 | 何时看 |
|---|---|
| [SPEC.md](./SPEC.md) | 想理解"为什么这样设计"——取舍矩阵 + 状态机图 + 路由表 |
| [AGENTS.md](./AGENTS.md) | 跑任务时——12 条硬规则 + size classifier + 委派策略 |
| [ROUTING.md](./ROUTING.md) | 想看 15 个 agent 怎么委派到 ECC subagent |
| [BOOTSTRAP.md](./BOOTSTRAP.md) | 第一次安装 / 给新人 clone 后跑 |
| [RISK.md](./RISK.md) | 风险矩阵 + 已知 limitation |
| [commands.env.schema](./commands.env.schema) | commands.env 字段定义 + 新增变量 |
| [state.schema.json](./state.schema.json) | state.json 的 JSON Schema（带 `ecc_review` 子对象） |

## 当前状态

**段 1 — Spec 阶段**：纯文档，可读可签收，零代码风险。

段 2（实现，约 25 个文件）**未开始**，需先满足 4 个切换条件，见 [BOOTSTRAP.md § 切换条件](./BOOTSTRAP.md)。

## 关键交付

- **状态机骨架**：fork 自 ai-coding-loop `loop_state.py`，加 `set-size` + `rebuild-capabilities` 子命令，写入改原子
- **门禁层**：fork 自 ai-coding-loop `verify.sh`，加 `CMD_SIZE_CLASSIFY` + `CMD_SECURITY_GATE` 两步
- **bootstrap**：单 `install.js`（跨平台），不调 ECC `install-apply.js`，自写 mini-installer 复制 8 个 ECC subagent 到 wrapper `.claude/agents/`（加 `ecc-` 前缀避免命名冲突）
- **路由壳**：15 个新 `loop-orchestrator/agents/*.md`，保留原 15 个 ai-coding-loop agent 不变作 fallback

## 成功率诚实估计

- 段 1（spec）= **~99%**
- 段 2（实现）= **~55-65%**，主要拖累：ECC subagent 物理复制 + 命名冲突解决（Risk #1）

完整风险矩阵见 [RISK.md](./RISK.md)。
