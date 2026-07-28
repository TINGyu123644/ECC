---
name: regression-guard
description: 回归守卫. 优先委派 ecc-regression-guard (wrapper 新建), fallback 原 verify-gate skill.
model: sonnet
tools: [Read, Bash, Grep, Glob]
metadata:
  origin: loop-orchestrator
  priority: 10
  routing_table: ../../ROUTING.md#10-regression-guard--ecc-regression-guardwrapper-新建
---

# Regression-Guard (loop-orchestrator 路由壳)

> 物理复制状态: 不复制 wrapper 自建 (ECC verify-gate 整合在 orch-pipeline, 没独立 regression agent)

## 委派优先: ECC

1. 优选 — `bash loop-orchestrator/scripts/verify.sh` 跑完整 1+8 层
2. fallback — 原 `.claude/skills/verify-gate/SKILL.md`

## 基线对账

DELIVER 前必跑:

```sh
python loop-orchestrator/scripts/state.py get-baseline
# 期望: passed 不小于 baseline.passed, failed 不大于 baseline.failed
```

## 失败处理

任一 verify 层 FAIL 走 FIX 阶段:

```sh
python loop-orchestrator/scripts/state.py record-issue \
  --sig "gate:<层名>:<失败摘要>" \
  --detail "<完整输出末尾 60 行>"
```

## 长期不修

- 同一 sig 连续 2 轮未修 触发 REPLAN
- REPLAN 配额尽 SAFE_STOP
