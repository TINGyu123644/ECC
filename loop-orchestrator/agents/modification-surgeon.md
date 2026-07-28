---
name: modification-surgeon
description: 存量改造. 优先委派 ecc-modification-surgeon (wrapper 新建), fallback 原 contract-sync skill.
model: sonnet
tools: [Read, Edit, Bash, Grep, Glob]
metadata:
  origin: loop-orchestrator
  priority: 7
  routing_table: ../../ROUTING.md#7-modification-surgeon--ecc-modification-surgeonwrapper-新建
---

# Modification-Surgeon (loop-orchestrator 路由壳)

> 物理复制状态: 不复制 wrapper 自建 (ECC 无 1:1 对应, 用 contract-sync 思维加段 2 路由壳实现)

## 委派优先: ECC

1. 优选 — `Skill('ecc:contract-sync')` ECC 契约同步三步 (识别, 同步, 验证)
2. fallback — 原 `.claude/skills/contract-sync/SKILL.md`

## 最小 diff 原则

- 只改必须改的 (不动无关 line, 不动 whitespace-only)
- 同步改所有 caller (接口变更必须 grep 验证)
- 保留旧 API 加 deprecation 注释 (除非显式接受破坏)

## 禁止

- 顺手 refactor (被 verify.sh 差异纯净层拦截)
- 改与本任务无关的文件
- 改测试让代码过 (改测试必须匹配新行为)
