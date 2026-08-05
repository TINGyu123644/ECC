---
description: 列出 ECC 全部 102 个 slash command 速查表（含 7 个 ecc-cn-*）
---

# /ecc-cn-command-catalog

直接打开 COMMANDS.md（自动生成 · 102 个 command）。

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
| **ecc-cn 中文扩展**（7 个） | `/ecc-cn-explain` / `/ecc-cn-mechanisms` / `/ecc-cn-coupling-decision` / `/ecc-cn-sop` / `/ecc-cn-skill-catalog` / `/ecc-cn-agent-catalog` / `/ecc-cn-command-catalog` |

## 何时用

| 场景 | 用 |
|---|---|
| 用户问"有哪些命令" | ✅ |
| 用户问"做 X 调哪个命令" | ✅（按类别定位） |
| 用户问"加新命令怎么做" | ✅（路由到 `/ecc-cn-sop`） |

## 配套

- 原 `ecc-cn-command-catalog` skill 已被本命令取代