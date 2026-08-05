---
description: Agent-Skill 强/弱耦合判定标准。显式打开耦合判定知识库
---

# /ecc-cn-coupling-decision

直接打开 Agent-Skill 耦合判定知识库。

## 一句话判定

- **强耦合**：满足 §4.1 任意 **2 条**（流程固定、漏一步错、格式统一、硬性规则、一键黑盒）
- **弱耦合**：满足 §4.2 任意 **1 条**（需判断、无标准答案、核心灵活性、参考资料）

## 何时用

| 场景 | 用 |
|---|---|
| 加新 agent 时判断该挂哪些 skill | ✅ |
| 改 `agents/skill-mappings.json` 时 | ✅ |
| 设计 skill 间依赖（如 `coupling-decider` 引用 `self-improvement`） | ✅ |
| 评审 PR 里 agent/skill 改动是否合理 | ✅ |
| 单纯写业务代码 | ❌ |

## 文档位置

`Agent-Skill-耦合方式决策知识库.md`（8 章，~320 行）

## 与其他机制关系

- `sop-updated.md` Step 0 的"加 agent 判定逻辑"小节是精简版；本命令是完整标准
- 两者必须保持一致；改本知识库后要同步更新 sop-updated.md

## 配套

- 原 `ecc-cn-coupling-decision` skill 已被本命令取代