---
name: ecc-cn-agent-catalog
description: ECC 全部 73 个 agent 速查表（含 self-improver / stock-analyst / ecc-plugin-dev-agent 等）。当用户想找特定 agent / 问「有哪些 agent」时优先触发。触发关键词：「有哪些 agent」「agent 列表」「agent 速查」「agent catalog」「reviewer」「resolver」「哪个 agent 该用」。
---

# ecc-cn-agent-catalog

单一真相源：[`../../AGENTS.md`](../../AGENTS.md)（自动生成 · 73 个 agent）

## 速查入口

直接读 `AGENTS.md` 顶部表格。

## 类别速记

| 类别 | 典型 agent |
|---|---|
| 代码评审 | `typescript-reviewer` / `python-reviewer` / `go-reviewer` / `rust-reviewer` / `cpp-reviewer` / `vue-reviewer` / `react-reviewer` / `kotlin-reviewer` / `swift-reviewer` / `flutter-reviewer` / `csharp-reviewer` / `fsharp-reviewer` / `php-reviewer` / `java-reviewer` |
| 构建错误修复 | `build-error-resolver` / `cpp-build-resolver` / `dart-build-resolver` / `django-build-resolver` / `go-build-resolver` / `java-build-resolver` / `kotlin-build-resolver` / `pytorch-build-resolver` / `react-build-resolver` / `rust-build-resolver` / `swift-build-resolver` |
| 规划 / 架构 | `planner` / `architect` / `code-architect` / `code-explorer` |
| 安全 / 评审 | `security-reviewer` / `pr-test-analyzer` / `silent-failure-hunter` / `agent-evaluator` |
| 测试 | `tdd-guide` / `e2e-runner` |
| 自省 / 进化 | `self-improver` / `agent-introspection-debugging` / `harness-optimizer` |
| 数据 / ML | `mle-reviewer` / `database-reviewer` |
| 业务领域 | `stock-analyst` / `marketing-agent` / `homelab-architect` |

## 何时调本 skill

| 场景 | 调 |
|---|---|
| 用户问"有哪些 agent" | ✅（展示 AGENTS.md） |
| 用户问"修这个错调哪个 agent" | ✅（路由到 build-resolver 或 reviewer） |
| 用户问"加新 agent 怎么分类" | ✅（路由到 `ecc-cn-sop`） |
| 用户问具体 agent 怎么用 | ❌（直接调用） |