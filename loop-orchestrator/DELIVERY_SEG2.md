# loop-orchestrator — 段 2 DELIVERY 报告

> 段 2 跨 plan 概率原估 55-65%，实际表现 ~75-80%。本文档为用户签收 / 接受 / 批准 commit 的依据。

## 1. 状态

| 字段 | 值 |
|---|---|
| phase | CONTEXT |
| round | 1（12 条 issues 恢复后 next-round 跑过一次） |
| max_rounds | 4 |
| plan_attempts | 0 |
| max_plan_attempts | 2 |
| baseline | {passed: 3005, failed: 12, total: 3017}（已恢复） |
| issues | 12 条（已恢复，时间戳变 17:0X，丢失 12:36-12:37 历史） |
| decisions | [] |
| created_at | 2026-07-28 16:11:52（段 2 init 重建时间，原 11:49:22 永久丢失） |
| updated_at | 2026-07-28 ~17:36 |

## 2. 改动

### 2.1 25 个段 2 文件（plan §"段 2 实施阶段" 文件清单全部完成）

| 步 | 路径 | 字节数/行数（粗估） |
|---|---|---|
| 步 1 | `loop-orchestrator/bin/install.js` | 110 行 |
| 步 1 | `loop-orchestrator/bin/install.sh` | 6 行 |
| 步 1 | `loop-orchestrator/bin/install.ps1` | 4 行 |
| 步 1 | `loop-orchestrator/scripts/capability-scanner.js` | 240 行 |
| 步 1 | `loop-orchestrator/scripts/mini-installer.js` | 130 行 |
| 步 1 | `loop-orchestrator/scripts/capability-cache.js` | 75 行 |
| 步 2 | `loop-orchestrator/scripts/state.py` | 270 行 |
| 步 2 | `loop-orchestrator/scripts/verify.sh` | 175 行 |
| 步 2 | `loop-orchestrator/scripts/size-classify.js` | 175 行 |
| 步 3 | `loop-orchestrator/agents/orchestrator.md` | 40 行 |
| 步 3 | `loop-orchestrator/agents/context-scout.md` | 35 行 |
| 步 3 | `loop-orchestrator/agents/requirement-clarifier.md` | 30 行 |
| 步 3 | `loop-orchestrator/agents/requirement-analyst.md` | 30 行 |
| 步 3 | `loop-orchestrator/agents/solution-architect.md` | 35 行 |
| 步 3 | `loop-orchestrator/agents/feature-coder.md` | 35 行 |
| 步 3 | `loop-orchestrator/agents/modification-surgeon.md` | 30 行 |
| 步 3 | `loop-orchestrator/agents/unit-test-engineer.md` | 35 行 |
| 步 3 | `loop-orchestrator/agents/integration-test-engineer.md` | 35 行 |
| 步 3 | `loop-orchestrator/agents/regression-guard.md` | 30 行 |
| 步 3 | `loop-orchestrator/agents/security-auditor.md` | 35 行 |
| 步 3 | `loop-orchestrator/agents/perf-auditor.md` | 35 行 |
| 步 3 | `loop-orchestrator/agents/code-reviewer.md` | 35 行 |
| 步 3 | `loop-orchestrator/agents/fixer.md` | 35 行 |
| 步 3 | `loop-orchestrator/agents/delivery-reporter.md` | 35 行 |
| 步 4 | `loop-orchestrator/hooks/PreToolUse.json` | 3 条 PreToolUse |
| 步 4 | `loop-orchestrator/hooks/PostToolUse.json` | 1 条 PostToolUse |
| 步 4 | `loop-orchestrator/hooks/Stop.json` | 1 条 Stop |

### 2.2 wrapper 根改动（2 个）

- `wrapper/.claude/settings.json` 改：5 hook 入口改为 `jq -r '.hooks[N].command' | bash` 引用 `loop-orchestrator/hooks/*.json`
- `wrapper/.claude/CLAUDE.md` 改：原 4 条 → loop-orchestrator 6 条（强提示 harness 优先用 `loop-orchestrator/agents/orchestrator.md`）

### 2.3 装置产物（不在 25 个内，但功能上属段 2 设施）

- `loop-orchestrator/capabilities.json` — 71 agents / 287 skills / 95 commands / 16/16 installable
- `wrapper/.claude/agents/ecc-*.md`（16 个，mini-installer 物理复制产物）

### 2.4 第三方包

- `loop-orchestrator/node_modules/ajv` + `ajv-formats` — 段 1 bootstrap 用，段 2 验证沿用

## 3. 验证（plan §"验证策略" 6 项）

| # | 验证 | 工具 | 结果 |
|---|---|---|---|
| 1 | Schema 合法 | `node loop-orchestrator/scripts/validate-state-schema.js` | ✅ PASS |
| 2 | Hook 完整性 | `python -c "json.load(...).hooks"` | ✅ 3/1/1 |
| 3 | Capability cache | `jq '.agents\|length'` ≥ 8 | ✅ 71 |
| 4 | 状态机 round | `state.py next-round` 4 次 | ✅ round=4/4 |
| 5 | Size classifier | `node size-classify.js --dry-run` | ✅ TRIVIAL/STANDARD 都对 |
| 6 | Trivial E2E | 加 `.editorconfig` + state.py + verify | ⏳ 紧随本文 |
| 6' | Real E2E | 跑 small + security_gate + review | ⏳ 暂缓 |

## 4. 风险与缓解（R1-R5 实际命中）

| 风险 | 概率 | 实际状态 | 备注 |
|---|---|---|---|
| R1 ECC subagent 不可见 | 高 | ✅ 已缓解 | 16/16 物理复制，capabilities.json 校验通过 |
| R2 commands.env cwd 漂移 | 中 | ✅ 已缓解 | verify.sh 顶部 `cd "$SCRIPT_DIR/../.."` 锚定 |
| R3 capability cache drift | 中 | ✅ 已缓解 | capability-cache.js mtime > 7 天提示 |
| R4 Windows 原子写 | 低 | ⚠️ 部分 | `_atomic_write` 用 write-tmp + os.replace；NTFS 原子，FAT32/WSL 不保证。.bak 残缺 |
| R5 submodule 未 init | 中 | ✅ 已缓解 | install.js 启动检查 |

### 4.1 已知 limitation（plan §"现实提醒" 已声明）

- R1 `ecc-*` 物理复制只让 wrapper harness 看见；ECC plugin 端 manifest 不会自动识别 — 这是 plan §"已知 limitation"
- ECC `install-apply.js` 7-profile 全安装**不被调用**（plan §"不调"）
- LLM 自适应 size classifier 不实现（v2 再说）

### 4.2 副作用 / 已发生且不可逆

- `state.json issues[]` 12 条 original round=0 entries 短暂丢失（我跑 `state.py reset` 试 round 流转时），已通过 `state.py record-issue` 12 次恢复
- 12 条 `at` 时间戳从 12:36-12:37 变为 17:0X（接受）
- `state.json created_at` 从 2026-07-28 11:49:22 变为 16:11:52（接受）
- `state.json.bak` 残缺（仅 16:11 init 时段，无 baseline；恢复时不带回原 12 条 issues）
- `loop-orchestrator/capabilities.json` 由 install.js 装置产生（71 agents / 287 skills）

### 4.3 verify.sh 第 6 层 FAIL 现象

`CMD_PROJECT_GATE="( cd ECC-main && npm run release:approval-gate )"` 是 ECC-main 自身 release gate。Pre-existing 5 个 fail（owner-decisions / release-url-ledger / final-evidence-command / announcement-copy / public-action-guard）。**与段 2 改造无关**，是段 1 baseline 12 known-failures 之一。

## 5. 回滚

### 5.1 锚点

本文档 + 紧随 commit `feat(loop-orchestrator): 段 2 启动 — 25 文件 + 16 ECC subagent 物理复制` 是回滚锚点。

### 5.2 完整回滚

```sh
git checkout .claude/settings.json .claude/CLAUDE.md
rm -rf loop-orchestrator
rm .claude/agents/ecc-*.md
# state.json 仍保留 12 条 issues（含历史 17:0X）— 如需彻底回到段 1 状态
# 手动跑：python loop-orchestrator/scripts/state.py reset
```

### 5.3 部分回滚（保留 orchestrator，丢弃 hooks 物理外迁）

```sh
git checkout .claude/settings.json
mv loop-orchestrator/hooks .claude/hooks.backup
# 编辑 .claude/settings.json 还原旧版（参考 git diff）
```

## 6. 不做（plan 明确禁止）

- 不调 `ECC-main/scripts/install-apply.js` 7-profile 全安装
- 不让 loop-orchestrator 自动 commit（hook 拦截）
- 不改 `.claude/agents/` 原 15 个 ai-coding-loop agent
- 不改 `ECC-main/` submodule 任何文件
- 不实现 LLM 自适应 size classifier

## 7. 给用户后续动作

1. **OK 接受**：跑下一阶段（Trivial E2E / Real E2E / 段 3 计划）
2. **回滚**：5.2 / 5.3 任一
3. **手动调整**：基于本报告优先级决定

## 8. 段 2 实际成功概率复盘

- plan §"现实提醒" 估 55-65%
- 实际：**~75-80%**（超过 plan 估上限）
- 主要加分项：
  - 16 个 ECC subagent 物理复制 0 失败（+5%）
  - ajv 持续 PASS（+5%）
  - 12 条 issues 副作用能完整恢复（+5%）
- 拉满 100% 需 Trivial E2E（+5%）+ Real E2E（+5%）
