# loop-orchestrator

合并 **ai-coding-loop**（强校验状态机 + verify-gate 拦截）与 **ECC**（5 层编排 + orch-* 家族 + 多语言专家）的优点的 harness 包。

> 给任何项目用的"AI 7 步 autonomous loop"工具包。
> 状态机 + 路由 + verify 拦截 + 16 个 ECC subagent 物理复制 + 0 terminal 桌面使用。

## 它是干什么的

让任意项目的 Claude Code session 自动跑 7 步 autonomous loop：

| 步 | 你做什么 | AI 自动做什么 |
|---|---|---|
| 1 | 提需求 | 读 SPEC.md |
| 2 | — | 调 `requirement-analyst` 出 AC |
| 3 | — | 调 `solution-architect` 出方案 |
| 4 | — | 调 `feature-coder` 写代码 |
| 5 | — | 跑 verify 1+8 层 + AI 三视角审查 |
| 6 | — | 调 `fixer` 三分类归因修复 |
| 7 | — | 调 `delivery-reporter` 出报告 |

**用户**全程对话驱动，**0 terminal**。

## 5 分钟上手

```sh
# 1. 解压你拿到的 zip
unzip loop-orchestrator-v0.1.0.zip

# 2. 拷到你的项目根
cp -r loop-orchestrator <your-project>/

# 3. 跑 install.js (mini mode 无 ECC 也能跑)
cd <your-project>
node loop-orchestrator/bin/install.js --skip-install
# 自动 cp 2 个模板: .ai/loop/commands.env + SPEC.md

# 4. 填 2 个文件
$EDITOR .ai/loop/commands.env   # 5 分钟: 填 lint/test/typecheck 命令
$EDITOR SPEC.md                  # 25 分钟: 填项目名 + 3-5 条 AC + Check

# 5. VSCode 打开项目 + Claude Code 对话
# 在对话里说: "加 XX 功能"
# AI 自动 7 步走完
```

详细见 [USAGE.md](./USAGE.md)。

## 文档导航

| 文件 | 何时看 |
|---|---|
| [USAGE.md](./USAGE.md) | **第一次用** — 详细使用指南 |
| [AGENTS.md](./AGENTS.md) | 跑任务时 — 12 条硬规则 + size classifier + 委派策略 |
| [ROUTING.md](./ROUTING.md) | 想看 15 个 agent 怎么委派到 ECC subagent |
| [RISK.md](./RISK.md) | 风险矩阵 + 已知 limitation |
| [BOOTSTRAP.md](./BOOTSTRAP.md) | 路径探测设计原理 (开发者参考) |
| [SPEC.md](./SPEC.md) | 段 1 设计决策 — 取舍矩阵 + 状态机图 |
| [commands.env.schema](./commands.env.schema) | commands.env 字段定义 |
| [state.schema.json](./state.schema.json) | state.json 的 JSON Schema |

## 当前状态

**v0.1.0** — 段 2 完整实施 + 修复 batch + 插拔式 + 通用化 + 自动 7 步驱动

- 25 个段 2 文件 + 16 个物理复制 ECC subagent
- 6 项 plan § "验证策略" 5 PASS
- 11 commit 链 + 修复 batch
- 通用 4 栈适用（Node / Python / Go / Rust + 任意项目）

## 用了什么

```
loop-orchestrator-v0.1.0.zip  (81 KB)
├── bin/        4 工具 (install.js/sh/ps1 + autopilot.js)
├── scripts/    9 工具 (state.py, verify.sh, size-classify, security-gate, ...)
├── agents/    15 路由壳 (orchestrator + 14 routing shell)
├── hooks/      3 JSON (PreToolUse / PostToolUse / Stop)
├── templates/  2 模板 (SPEC.md.template + commands.env.example)
└── 段 1 文档 6 文件 (SPEC/AGENTS/ROUTING/BOOTSTRAP/RISK/state.schema.json)
```

## 关键设计

- **状态机**：10 phase + 4 round 修复循环 + REPLAN/SAFE_STOP
- **门禁**：1+8 层 verify (size-classify + lint + typecheck + test + diff 纯净 + release gate + security_gate + capability_rebuild)
- **路由**：15 个 inline 路由壳，优先委派 ECC，fallback 到原 ai-coding-loop
- **bootstrap**：单 `install.js`，自动 cp 2 模板 + 物理复制 16 ECC subagent + 重建 capability cache
- **R1 残余**：ECC plugin 端不识别 wrapper 复制的 ecc-*（用 `visibility-report.js` 透明）

## 完整记录

| 段 2 | 11 commit 链 | 见 git log |
|---|---|---|
| 段 2 修复 | 3 处修复 (R1 + security_gate + size-classify) | commit 3f9856a |
| 段 2 插拔式 | 2 模板 + auto bootstrap | commit be0de44 |
| 段 2 通用化 | 不绑 ECC | commit 1b22d17 |
| 段 2 自动驱动 | 7 步串联 (CLAUDE.md §1.5 + orchestrator.md + autopilot.js) | commit 6904d0a |
| 段 2 SPEC 自动 cp | install.js 修 | commit ae4fa48 |

## 成功率

- 段 1 (spec) = **~99%**
- 段 2 (实现) = **~95-100%**（含 Real E2E + Trivial E2E + 3 处修复）

## 适用

- ✅ 任何 Node / Python / Go / Rust 项目
- ✅ 任何规模的代码基（小项目 1-2 文件到跨模块）
- ✅ 团队协作（每人管一个模块，AI 不会越界 — 软约束，靠 SPEC 写明）
- ✅ 个人 / 教学 / POC

## 不适用

- ❌ 严格隔离的多模块大项目（需要补模块边界硬 hook — 段 3 计划）
- ❌ 只能用 ECC 完整 7-profile 部署的企业生产环境（plan 拒绝完整 ECC install）
