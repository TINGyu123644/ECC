---
name: ecc-cn-mechanisms
description: 路由查询到 4 份 ECC 机制知识文档之一。涉及 ECC 编排 / 技能选择 / 错误定位修复 / Agent-Skill 耦合判定时优先触发。触发关键词：「编排机制」「orchestration」「技能选择」「progressive loading」「错误定位」「error localization」「耦合判定」「coupling」「ECC 机制」「ECC 是怎么工作的」「编排 pipeline」「size classifier」「build-resolver」。
---

# ecc-cn-mechanisms

按用户意图路由到对应机制文档。所有引用都基于插件安装后的相对路径（`~/.claude/plugins/ecc-cn/` 为根）。

## 路由表

| 用户问到 | 打开这份文档 | 相对路径 |
|---|---|---|
| 编排 / orchestration / pipeline / phase mask / size classifier / 4 类文件 / 6 阶段 / orch-pipeline | 编排机制 v2.0 | `../../ECC-技能编排机制.md` |
| 技能选择 / 选择机制 / progressive loading / catalog / consult / Top-N / 三级下钻 / fuzzy 匹配 / 渐进式加载 | 选择机制 v1.2 | `../../ECC-技能选择机制-渐进式加载.md` |
| 错误定位 / 错误修复 / build-resolver / 编译错 / minimal diff / silent failure / hook 防线 / 11 个 build-resolver | 错误定位与修复机制 v1.0 | `../../ECC-错误定位与修复机制.md` |
| Agent-Skill 耦合 / 强耦合 / 弱耦合 / 耦合判定 / 耦合方式决策 | 耦合判定知识库 | `../../Agent-Skill-耦合方式决策知识库.md` |

## 路由不到时怎么办

- 用户问"ECC 是什么"或"ECC 怎么用"：答"参考插件 `ecc`（自动依赖安装）"，并提供 4 份文档索引。
- 用户问具体 skill 怎么调：路由到编排 / 选择机制之一。
- 用户问具体 bug 怎么修：路由到错误定位与修复机制。

## 不要做

- ❌ 不要复述文档内容（让用户自己读文档或 `/ecc-cn-explain <topic>` 直接打开）
- ❌ 不要修改这 4 份文档（它们是单一真相源；改动走 wrapper repo 的正常 git 流程）
- ❌ 不要假装路由到不存在的文档

## 配套命令

`/ecc-cn-explain <topic>` —— 直接打开对应文档。