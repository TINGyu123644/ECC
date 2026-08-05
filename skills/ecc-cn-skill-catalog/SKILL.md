---
name: ecc-cn-skill-catalog
description: ECC 全部 291 个 skill 速查表（按 17 个模块分类）。当用户想找特定 skill / 浏览所有 skill / 问「有哪些 skill」时优先触发。触发关键词：「有哪些 skill」「skill 列表」「skill 速查」「skill 索引」「skill catalog」「按模块分类」「workflow / language / framework」。
---

# ecc-cn-skill-catalog

单一真相源：[`../../SKILLS.md`](../../SKILLS.md)（自动生成 · 17 模块 · 291 个 skill）

## 速查入口

直接读 `SKILLS.md` 顶部表格，按模块查。

## 17 个模块速记

| 类别 | 模块 |
|---|---|
| 工程 | language / framework / backend-patterns / frontend-patterns / mobile-patterns |
| 质量 | code-review / tdd-workflow / verification-loop / test-coverage |
| 工作流 | workflow / orchestration / e2e-testing / deployment-patterns |
| 数据 | data-engineering / ml-adoption-playbook / mle-workflow |
| 协作 | git-workflow / documentation / security-review |
| 知识 | knowledge-ops / continuous-learning / instinct-* |

## 何时调本 skill

| 场景 | 调 |
|---|---|
| 用户问"有哪些 skill" | ✅（展示 SKILLS.md） |
| 用户问"加新 skill 怎么分类" | ✅（路由到 `ecc-cn-sop`） |
| 用户问"某类问题调哪个 skill" | ✅（按模块定位） |
| 用户问具体 skill 怎么用 | ❌（直接调用那个 skill） |

## 不要做

- ❌ 不要复述 SKILLS.md 内容（让用户自己读）
- ❌ 不要假装某个 skill 存在（不确定就路由到 `ecc-cn-sop` 询问）