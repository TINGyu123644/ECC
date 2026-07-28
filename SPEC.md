# SPEC.md — loop-orchestrator 整合项目

> AI 自动填写 (基于 wrapper 根实际状态): 段 1 阶段 context-scout 已采集,
> 段 2 实施阶段启动日 2026-07-28 由 loop-orchestrator/scripts/requirement-analyst 派生。

## 0. 元信息

- **版本**: v0.1.0
- **负责人**: @王振宇
- **评审日期**: 2026-07-28
- **关联状态**: `.ai/loop/state.json` (phase=CONTEXT, round=2, baseline=3005/12/3017)
- **关联文档**: `loop-orchestrator/SPEC.md` / `loop-orchestrator/ROUTING.md` / `loop-orchestrator/AGENTS.md`

## 1. 背景

本项目把两套独立 loop 框架合成一个 `loop-orchestrator`：

- **ai-coding-loop**（已加载 15 agents / 21 skills / 5 hooks / `loop_state.py` 状态机）
- **ECC**（困在 submodule `ECC-main/`，73 agents / 289 skills / 95 commands）

核心痛点：ECC 资源在 wrapper session 默认不可见，把 ECC 的 size classifier、orch-pipeline、orch-review 双 stage fail-closed、ECC CLI bootstrap 思路、合规耦合判定复用进来是关键。

## 2. 目标

- **G1**: 5 分钟内一键 bootstrap (`node loop-orchestrator/bin/install.js`)
- **G2**: 7 步 autonomous loop 真实闭环（从提需求到 DELIVER）
- **G3**: 别人 clone 后 0 文档也能跑（VSCode + Claude Code 对话）
- **G4**: 16 个 ECC subagent 物理复制到 wrapper harness 可见
- **G5**: verify 1+8 层全跑过（含 security_gate + size-classify）

## 3. 非目标

- **NG1**: 不调 ECC 7-profile 全安装（避免污染 wrapper 自包含）
- **NG2**: 不实现 LLM 自适应 size classifier（v2 再说）
- **NG3**: 不让 loop-orchestrator 自动 commit（hook 拦截）
- **NG4**: 不改 `.claude/agents/` 原 15 个 ai-coding-loop agent
- **NG5**: 不改 ECC-main/ submodule 任何文件

## 4. 验收标准

### AC-1: install.js 一键就绪

- **Given**: 新项目根目录（无 .claude/agents/ecc-*，无 .ai/loop/commands.env）
- **When**: 用户跑 `node loop-orchestrator/bin/install.js`
- **Then**: 5 分钟内完成，含 16 个 ecc-* 物理复制 + commands.env 模板 cp + capabilities.json 写入
- **Check**: `ls .claude/agents/ | grep -c '^ecc-' | grep -q 16 && test -f .ai/loop/commands.env && test -f loop-orchestrator/capabilities.json`

### AC-2: 7 步 loop 真实闭环

- **Given**: SPEC.md 已写 + commands.env 已填
- **When**: 用户跑 `bash loop-orchestrator/scripts/verify.sh`
- **Then**: size-classify PASS + 1+8 层 verify 跑过
- **Check**: `bash loop-orchestrator/scripts/verify.sh 2>&1 | grep -q 'RESULT: PASS'`

### AC-3: security_gate 触发正确

- **Given**: diff 含 "secret" / "api_key" / "token"
- **When**: 跑 verify.sh
- **Then**: 第 7 层 security_gate 跑且扫描命中
- **Check**: `git diff | grep -i secret && bash loop-orchestrator/scripts/verify.sh 2>&1 | grep security_gate`

### AC-4: ECC 资源可见性

- **Given**: 16 个 ecc-* 已物理复制
- **When**: 跑 `node loop-orchestrator/scripts/visibility-report.js`
- **Then**: 报告 16/16 installed + R1 limitation 透明
- **Check**: `node loop-orchestrator/scripts/visibility-report.js | grep -q '16/16'`

### AC-5: baseline 维持

- **Given**: 已有 baseline 3005/12/3017
- **When**: 跑任何 verify
- **Then**: 失败数不增加
- **Check**: `python loop-orchestrator/scripts/state.py get-baseline | jq -e '.failed <= 12'`

## 5. 范围

### 5.1 In-scope

- 25 个段 2 文件（bootstrap 5 + 状态机 3 + 路由壳 15 + hooks 3 中的命令）
- 16 个 ECC subagent 物理复制
- hooks 3 个 JSON 物理外迁
- 1+8 层 verify
- 2 模板（SPEC.md.template + commands.env.example）
- USAGE.md / DELIVERY_SEG2.md

### 5.2 Out-of-scope

- ECC 7-profile 全安装
- LLM 自适应 size classifier
- loop-orchestrator 自动 commit
- 改 .claude/agents/ 原 15 个 ai-coding-loop agent
- 改 ECC-main/ submodule

## 6. 技术约束

- **语言**: JavaScript (Node 18+) + Python 3.11+
- **包管理**: npm
- **测试框架**: node tests/run-all.js (3017 tests)
- **lint 工具**: eslint@10.6.0 + markdownlint-cli@0.48.0
- **schema 校验**: ajv 8.20+ + ajv-formats
- **目标平台**: Windows / Mac / Linux
- **状态机**: 10 phase + 4 round 修复循环

## 7. 风险

| 风险 | 概率 | 影响 | 缓解 | 实际状态 |
|---|---|---|---|---|
| **R1 ECC subagent 不可见** | 高 | 致命 | mini-installer 物理复制 16 个 + 加 ecc- 前缀 | ✅ 已缓解，visibility-report 透明 |
| **R2 commands.env cwd 漂移** | 中 | 中 | verify.sh 顶部 `cd "$(dirname "$0")/../.."` 锚定 | ✅ 已缓解 |
| **R3 capability cache drift** | 中 | 中 | capability-cache.js mtime > 7 天提示重扫 | ✅ 已缓解 |
| **R4 Windows 原子写** | 低 | 低 | state.py write-tmp + os.replace + .bak 备份 | ⚠️ 部分（FAT32/WSL 不严格） |
| **R5 submodule 未 init** | 中 | 中 | install.js 启动 `git submodule` 检查 | ✅ 已缓解 |
| **R6 AI 越界改别人代码** | 高 | 高 | SPEC 写明 + git diff --check | ⚠️ 软约束（gap） |

## 8. 阶段

照 `loop-orchestrator/AGENTS.md` 状态机：

```
INIT → CONTEXT → REQUIREMENT → PLAN → CODE → VERIFY → REVIEW → FIX → DELIVER
```

安全路径：PLAN → REPLAN (2 次配额尽) → SAFE_STOP → DELIVER

## 9. 验证

- **baseline**: `cd ECC-main && node tests/run-all.js` → 3005 passed / 12 failed / 3017 total
- **verify**: `bash loop-orchestrator/scripts/verify.sh` → 1+8 层
- **ajv**: `node loop-orchestrator/scripts/validate-state-schema.js` → PASS
- **size dry-run**: `node loop-orchestrator/scripts/size-classify.js --dry-run` → 输出 enum
- **visibility**: `node loop-orchestrator/scripts/visibility-report.js` → 16/16 WRAPPER_ONLY

## 10. 变更记录

- **2026-07-28 11:49** — 段 1 启动；context-scout 跑 3 份 Explore 报告
- **2026-07-28 12:36** — 12 条 known-failures baseline 记录
- **2026-07-28 12:43** — commands.env.schema + state.schema.json + validate-state-schema.js 落地
- **2026-07-28 14:08** — 段 1 签收（用户确认 RISK 55-65% 接受）
- **2026-07-28 14:30** — 段 2 启动（25 文件 + 16 ecc-* 物理复制）
- **2026-07-28 16:03** — Trivial E2E / Real E2E 全 PASS
- **2026-07-28 18:30** — 3 处修复 batch (R1 闭环 + security_gate 集成 + size-classify bug)
- **2026-07-28 18:50** — 插拔式 2 模板 + install.js auto bootstrap + USAGE.md
- **2026-07-28 19:00** — SPEC.md AI 自动填（本次）

## 11. 引用

- `loop-orchestrator/SPEC.md` - 段 1 设计 (取舍矩阵 + 状态机 + 15 路由表)
- `loop-orchestrator/AGENTS.md` - 12 条硬性规则 + size classifier + 耦合判定
- `loop-orchestrator/ROUTING.md` - 15 路由完整表
- `loop-orchestrator/RISK.md` - 5 风险详细分析
- `loop-orchestrator/BOOTSTRAP.md` - 路径选择
- `loop-orchestrator/USAGE.md` - 使用指南
- `loop-orchestrator/DELIVERY_SEG2.md` - 段 2 交付报告
- `loop-orchestrator/state.schema.json` - state.json 校验
- `loop-orchestrator/commands.env.schema` - commands.env 字段定义
- `loop-orchestrator/templates/SPEC.md.template` - SPEC 模板
- `loop-orchestrator/templates/commands.env.example` - 工程命令模板
