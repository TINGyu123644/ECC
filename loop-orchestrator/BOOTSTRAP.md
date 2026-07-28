# loop-orchestrator — BOOTSTRAP

两套用户路径：当前用户（已 clone + 已跑过 context-scout）vs 新人 clone（首次安装）。

## 当前用户路径（已跑过 context-scout 的 wrapper）

> 适用：当前 `c:\Users\26631\Desktop\ECC-main\`（已 .ai-loop + .claude + .ai 都装好，state.json 在 CONTEXT）。

### 一行命令

```bash
node loop-orchestrator/bin/install.js
```

该命令做的事（段 2 实现，段 1 只列意图）：

1. 探测 wrapper 根（cwd = `c:\Users\26631\Desktop\ECC-main`）
2. 检查 `ECC-main/` submodule 已 init（`git submodule status` 应非 `-` 前缀）
3. 跑 `capability-scanner.js` → 扫 ECC `agents/` `skills/` `commands/` 产出 `loop-orchestrator/capabilities.json`
4. 跑 `mini-installer.js` → 按 [ROUTING.md § "mini-installer 复制清单"](./ROUTING.md) 复制 16 个 agent 加 `ecc-` 前缀到 `.claude/agents/`
5. 检查 `.claude/settings.json` 与 `loop-orchestrator/hooks/*.json` 一致性；按 [SPEC.md § 5](./SPEC.md#5-hooks-行为表) 拆分 5 个 hook 到 3 个 JSON
6. 检查 `.claude/CLAUDE.md` 改为指向 `loop-orchestrator/AGENTS.md` + 加路由壳强提示
7. 写 `loop-orchestrator/capabilities.json`（mtime 标记）
8. 输出"ready" + 6 行使用提示

### 验证当前用户路径

```bash
# 1. 状态机仍在（不应被 install.js 改动）
python .claude/skills/loop-control/scripts/loop_state.py get
# 期望输出：phase=CONTEXT, round=0, baseline.passed=3005, baseline.failed=12

# 2. ECC agent 已物理就位（16 个）
ls .claude/agents/ | grep -c '^ecc-'
# 期望：16

# 3. capabilities.json 存在
test -f loop-orchestrator/capabilities.json && echo OK

# 4. hooks 拆分正确（3 PreToolUse + 1 PostToolUse + 1 Stop）
jq '.hooks.PreToolUse|length,.hooks.PostToolUse|length,.hooks.Stop|length' .claude/settings.json
# 期望：3, 1, 1
```

## 新人 clone 路径

> 适用：`git clone git@github.com:TINGyu123644/ECC.git` 后第一次进入。

### 完整步骤

```bash
git clone git@github.com:TINGyu123644/ECC.git ECC-main
cd ECC-main

# 1. 拉 submodule（含 ECC 产品代码 + 89 个 skills 等）
git submodule update --init ECC-main/

# 2. 安装 python 依赖（仅 ai-coding-loop state.py 要 python 3）
#    （用户使用系统 python；wrapper 没有 .pyproject.toml）

# 3. 装 wrapper 自身依赖（mammoth，仅 `c:\Users\26631\Desktop\ECC-main\package.json` 里那一项）
npm install

# 4. 跑 loop-orchestrator bootstrap
#    Windows:
.\loop-orchestrator\bin\install.ps1
#    POSIX:
./loop-orchestrator/bin/install.sh
#    任一平台通用：
node loop-orchestrator/bin/install.js

# 5. 装 ECC 自身依赖（submodule 内的 npm + 7-profile 不跑，只需普通 npm install）
cd ECC-main
npm install

# 6. （可选）清空旧 state.json，从 INIT 重启
python ../.claude/skills/loop-control/scripts/loop_state.py reset
```

### 验证新人路径

```bash
# 全部预检
node loop-orchestrator/bin/install.js --check-only
# 期望：输出 "All prerequisites met" + 列出 capability count

# 跑 trivial 任务：加 .editorconfig
echo "root = true\n[*]\ncharset = utf-8\nend_of_line = lf" > ECC-main/.editorconfig

python .claude/skills/loop-control/scripts/loop_state.py set-phase PLAN
python .claude/skills/loop-control/scripts/loop_state.py set-phase CODE
python .claude/skills/loop-control/scripts/loop_state.py set-phase VERIFY

# 期望：phase 流转；lint 跑（CMD_LINT = "node node_modules/.bin/eslint ."）；RESULT: PASS
```

## 切换条件（段 1 → 段 2）

四个**必须同时满足**才能进入段 2（实现 25 个文件）：

| # | 条件 | 检查方式 |
|---|---|---|
| 1 | [SPEC.md](./SPEC.md) 由用户在对话中逐§签收（每节回 "go" / "OK" / 类似） | 用户在对话明示 |
| 2 | [ROUTING.md](./ROUTING.md) 至少 12/15 行用户显式确认 | 用户在对话明示 |
| 3 | [state.schema.json](./state.schema.json) 通过 `npx ajv validate` 验证现有 [.ai/loop/state.json](.ai/loop/state.json) | 段 1.8 跑通 |
| 4 | 用户接受 [RISK.md](./RISK.md) 中 ≥ 80% 的概率估计 | 用户在对话明示 |

若任一条件未满足，**段 2 不开始**，留在段 1 完善。

## 失败回滚

任一阶段失败，回滚方案：

```bash
# 回滚 wrapper .claude/* 改动
cd "c:\Users\26631\Desktop\ECC-main"
git checkout .claude/settings.json .claude/CLAUDE.md 2>/dev/null || true

# 删整个 loop-orchestrator 包（也即回滚 wrapper 上所有 loop-orchestrator 相关）
rm -rf loop-orchestrator

# 注意：不删 .claude/agents/ 里加的 ecc-* 文件——属于"已复制但未损坏"，
# 如需彻底清场另跑：
# git clean -fdx .claude/agents/ecc-* （如果 .claude/agents/ 在 git 跟踪里；当前不在）

# state.json / commands.env 不动——本包段 2 不写这俩（hooks 拦截 .ai/loop/* 直接编辑）
```

回滚后再次跑 `node loop-orchestrator/bin/install.js` 可恢复（idempotent — 已存在的文件跳过）。
