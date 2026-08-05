---
name: ecc-cn-command-catalog
description: ECC 全部 96 个 slash command 速查表。当用户想找特定命令 / 问「有哪些 command」时优先触发。触发关键词：「有哪些命令」「command 列表」「command 速查」「command catalog」「/ 开头」「slash 命令」「什么命令能做 X」。
---

# ecc-cn-command-catalog

单一真相源：[`../../COMMANDS.md`](../../COMMANDS.md)（自动生成 · 96 个 command）

## 速查入口

直接读 `COMMANDS.md` 表格，按命令名 + 描述查。

## 类别速记

| 类别 | 典型命令 |
|---|---|
| ECC 编排 | `/orch-add-feature` / `/orch-change-feature` / `/orch-fix-defect` / `/orch-refine-code` / `/orch-build-mvp` / `/orch-review` |
| 质量门禁 | `/code-review` / `/quality-gate` / `/build-fix` + 各语言 build/review/test |
| GAN / 多 agent | `/gan-build` / `/gan-design` / `/multi-backend` / `/multi-execute` / `/multi-frontend` / `/multi-plan` / `/multi-workflow` |
| Epic 管理 | `/epic-claim` / `/epic-decompose` / `/epic-publish` / `/epic-review` / `/epic-sync` / `/epic-unblock` / `/epic-validate` |
| PRP / 计划 | `/plan` / `/plan-canvas` / `/plan-prd` / `/prp-commit` / `/prp-implement` / `/prp-plan` / `/prp-pr` / `/prp-prd` |
| 项目 / 会话 | `/project-init` / `/projects` / `/promote` / `/prune` / `/pm2` / `/setup-pm` / `/sessions` / `/save-session` / `/resume-session` |
| Hook / Skill | `/hookify` / `/hookify-configure` / `/hookify-help` / `/hookify-list` / `/skill-create` / `/skill-health` |
| Loop | `/loop-start` / `/loop-status` / `/santa-loop` |
| 中文扩展 | `/ecc-cn-explain` |

## 何时调本 skill

| 场景 | 调 |
|---|---|
| 用户问"有哪些命令" | ✅（展示 COMMANDS.md） |
| 用户问"做 X 调哪个命令" | ✅（按类别定位） |
| 用户问"加新命令怎么做" | ✅（路由到 `ecc-cn-sop`） |