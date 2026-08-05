---
name: ecc-cn-coupling-decision
description: Agent-Skill 强/弱耦合判定标准。涉及加新 agent 时判断该挂哪个 skill、设计 skill 依赖关系、或评审 Agent-Skill 绑定时优先触发。触发关键词：「agent 配 skill」「强耦合」「弱耦合」「耦合方式决策」「agent 绑定 skill」「skill mapping」「agent-sort」「plan-orchestrate」「4.1 强」「4.2 弱」。
---

# ecc-cn-coupling-decision

单一真相源：[`../../Agent-Skill-耦合方式决策知识库.md`](../../Agent-Skill-耦合方式决策知识库.md)（8 章，~320 行）

## 一句话判定

- **强耦合**：满足 §4.1 任意 **2 条**（流程固定、漏一步错、格式统一、硬性规则、一键黑盒）
- **弱耦合**：满足 §4.2 任意 **1 条**（需判断、无标准答案、核心灵活性、参考资料）

## 何时调本 skill

| 场景 | 用本 skill |
|---|---|
| 加新 agent 时判断该挂哪些 skill | ✅ |
| 改 `agents/skill-mappings.json` 时 | ✅ |
| 设计 skill 间依赖（如 `coupling-decider` 引用 `self-improvement`） | ✅ |
| 评审 PR 里 agent/skill 改动是否合理 | ✅ |
| 单纯写业务代码 | ❌ |

## 与其他机制关系

- `sop-updated.md` Step 0 的"加 agent 判定逻辑"小节是精简版；本 skill 是完整标准。
- 两者**必须保持一致**；改本知识库后要同步更新 sop-updated.md。