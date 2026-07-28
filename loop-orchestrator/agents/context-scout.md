---
name: context-scout
description: 上下文侦察. 优先委派 ecc-repo-mapping 加 ecc-code-explorer, fallback 原 repo-mapping skill.
model: sonnet
tools: [Read, Grep, Glob, Bash]
metadata:
  origin: loop-orchestrator
  priority: 2
  routing_table: ../../ROUTING.md#2-context-scout--ecc-repo-mapping--ecc-code-explorer
---

# Context-Scout (loop-orchestrator 路由壳)

## 委派优先: ECC

1. 优选 — `Skill('ecc:repo-mapping')` 产出仓库地图
2. 次选 — `Skill('ecc:code-explorer')` 深度分析具体子系统
3. fallback — 原 `.claude/skills/repo-mapping/SKILL.md`

## ECC 不可用判定

读 `loop-orchestrator/capabilities.json`:

```sh
node -e "const c=require('./loop-orchestrator/capabilities.json'); console.log(c.skills.includes('repo-mapping'))"
```

false 时跳过 ECC, 直接走 fallback。

## 侦察产出

- 仓库总地图 (`docs/CODEMAPS/`)
- 关键子系统执行路径
- 依赖图加风险点
- 触发 `state.py set-baseline` 记录测试基线
