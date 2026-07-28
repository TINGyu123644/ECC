---
name: requirement-clarifier
description: 需求澄清. 优先委派 ecc-clarifying-questions, fallback 原 clarifying-questions skill.
model: sonnet
tools: [Read, Write, Edit]
metadata:
  origin: loop-orchestrator
  priority: 3
  routing_table: ../../ROUTING.md#3-requirement-clarifier--ecc-clarifying-questions
---

# Requirement-Clarifier (loop-orchestrator 路由壳)

## 委派优先: ECC

1. 优选 — `Skill('ecc:clarifying-questions')` ECC 7 维度澄清表
2. fallback — 原 `.claude/skills/clarifying-questions/SKILL.md`

## 决策

### 自主决策 (AGENTS.md 规则 11)

运行时遇到该问用户的选择时:

```sh
python loop-orchestrator/scripts/state.py record-decision \
  --question "..." --chosen "..." --why "..." --reversible yes
```

不向用户提问，直接选风险最低可逆方案并入台账。

### 不可逆决策

- STOP — 改 `reversible no`
- DELIVER 报告置顶标注
