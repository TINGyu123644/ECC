# loop-orchestrator — 使用指南（"插拔式" 7 步 autonomous loop）

> 对应师-王宇 提的 7 步 autonomous loop 设计：
> 1. 用户提需求 → 2. AI 分析需求 → 3. AI 规划 → 4. AI 写代码 → 5. AI 审查 → 6. AI 改错 → 7. 循环直至成功

## 0. 5 分钟上手（其他项目怎样用）

```sh
# 第 1 步：拷贝 loop-orchestrator 包到新项目根
cp -r /path/to/loop-orchestrator ./

# 第 2 步：一键 bootstrap（自动做 5 件事）
node loop-orchestrator/bin/install.js
#   ✓ 检查 ECC submodule
#   ✓ 复制 commands.env.example 模板到 .ai/loop/commands.env
#   ✓ 跑 capability-scanner 索引可用资源
#   ✓ 物理复制 16 个 ECC subagent 到 .claude/agents/ecc-*.md
#   ✓ 探测 tests/run-all.js 自动 set-baseline

# 第 3 步：填 commands.env 实际工程命令
$EDITOR .ai/loop/commands.env
#   或参考模板循环注释, 4 栈示例 (Node/Python/Go/Rust)

# 第 4 步：填 SPEC.md 模板
cp loop-orchestrator/templates/SPEC.md.template SPEC.md
$EDITOR SPEC.md
#   必填: 项目名 / 负责人 / 3-5 条 AC

# 第 5 步：跑首次 verify
bash loop-orchestrator/scripts/verify.sh
#   期望 RESULT: PASS

# 第 6 步：开始新任务
python loop-orchestrator/scripts/state.py init --max-rounds 4
#   ↑ 启 4 round 修复循环
python loop-orchestrator/scripts/state.py set-phase CONTEXT
#   ↑ 进入 CONTEXT 阶段
```

## 1. 日常 7 步使用（一次完整循环）— VSCode + Claude Code 对话

**重要**：loop-orchestrator 是给 Claude Code 用的编排规则，**不是命令行工具**。
日常使用 = 在 VSCode 装 Claude Code 扩展，**在对话里说话**，AI 自动跑 7 步。

### Day 1 一次性（项目维护者做一次）

```sh
# 拷贝包到项目根
cp -r /path/to/loop-orchestrator ./loop-orchestrator

# 跑 install.js (一次性, 5 件事全自动)
node loop-orchestrator/bin/install.js

# 填 commands.env (按本项目栈)
$EDITOR .ai/loop/commands.env

# 填 SPEC.md
cp loop-orchestrator/templates/SPEC.md.template SPEC.md
$EDITOR SPEC.md
```

**到此为止。`install.js` 后续不需要再跑。**

### Day 2+ 日常使用（任何人，零 terminal）

```sh
# 1. VSCode 打开项目
# 2. 启动 Claude Code 扩展
# 3. 在对话里说:
```

> "我想做 XXX，请按 loop-orchestrator 7 步推进"

**Claude Code 自动**（你不需要再敲任何命令）：

1. **读 `.claude/CLAUDE.md`**（已改写为 loop-orchestrator 总入口）→ 加载 `loop-orchestrator/AGENTS.md`
2. **加载 15 个 routing shell**（`loop-orchestrator/agents/*.md`）
3. **加载 16 个物理复制**（`.claude/agents/ecc-*.md`）
4. **启 PostToolUse hooks**（auto-lint / 危险命令拦截 / 状态文件保护）
5. **进入 CONTEXT 阶段**（自动 `state.py set-phase CONTEXT`）
6. **跑 7 步**：
   - 读仓库 → 解需求 → 规划 → 写代码 → verify（hook 自动）→ 三视角审查 → 修复 → 循环
7. **在对话里输出结果**（每个阶段你都能看到）

**你可以打断 / 介入 / 调整方向**（plan §"12 条硬性规则" § 11 自主决策 — 必要时 AI 自己记录台账）。

### 7 步对应

| 步 | 你在对话里做什么 | Claude Code 自动做什么 |
|---|---|---|
| 1 | 说"我要做 XXX" / 改 `SPEC.md` | `requirement-clarifier` + `requirement-analyst` 跑 ECC skill |
| 2 | 看输出 | (你已经做完，这是 AI 自己做) |
| 3 | — | `solution-architect` 委派 ECC `planner` + `architect` |
| 4 | — | `feature-coder` 委派 ECC `tdd-guide` |
| 5 | — | `code-reviewer` 委派 ECC `code-reviewer` + 8 语言 reviewer |
| 6 | — | `fixer` 三分类归因修复 |
| 7 | — | `state.py` 跨 round 检测 + REPLAN / SAFE_STOP |

### 什么时候需要碰 terminal

**几乎不需要**。例外：

- **第一次 setup**（Day 1）跑 `node install.js`
- **填 commands.env**（VSCode 也能用 `code .ai/loop/commands.env`）
- **想 reset state** (`python loop-orchestrator/scripts/state.py reset`)
- **想看 visibility report** (`node loop-orchestrator/scripts/visibility-report.js`)
- **手动跑 verify** (`bash loop-orchestrator/scripts/verify.sh`)

**这些是开发者 / 调试用的，不是日常使用。**

## 2. 核心命令速查（开发者用，不是用户用）

| 命令 | 用途 |
|---|---|
| `node loop-orchestrator/bin/install.js` | Day 1 一次性 bootstrap |
| `node loop-orchestrator/bin/install.js --rebuild` | 重建 capabilities.json + 强制覆盖 |
| `node loop-orchestrator/scripts/visibility-report.js` | ECC 资源可见性报告 (R1 limitation 透明) |
| `node loop-orchestrator/scripts/size-classify.js --dry-run` | 阶段 0 size 判定 |
| `python loop-orchestrator/scripts/state.py get` | 读当前 phase / round / baseline |
| `python loop-orchestrator/scripts/state.py set-phase <PHASE>` | 推进阶段 |
| `python loop-orchestrator/scripts/state.py next-round` | 跨 round 检测 + REPLAN/SAFE_STOP |
| `python loop-orchestrator/scripts/state.py record-issue --sig "..."` | 记录失败 |
| `python loop-orchestrator/scripts/state.py record-decision --question ...` | 自主决策台账 |
| `bash loop-orchestrator/scripts/verify.sh` | 1+8 层门禁 |
| `bash loop-orchestrator/scripts/verify.sh` 自动跑 | size-classify + security-gate + 全部层 |

## 2. 核心命令速查

| 命令 | 用途 |
|---|---|
| `node loop-orchestrator/bin/install.js` | 一键 bootstrap |
| `node loop-orchestrator/bin/install.js --rebuild` | 重建 capabilities.json + 强制覆盖 |
| `node loop-orchestrator/scripts/visibility-report.js` | ECC 资源可见性报告 (R1 limitation 透明) |
| `node loop-orchestrator/scripts/size-classify.js --dry-run` | 阶段 0 size 判定 |
| `python loop-orchestrator/scripts/state.py get` | 读当前 phase / round / baseline |
| `python loop-orchestrator/scripts/state.py set-phase <PHASE>` | 推进阶段 |
| `python loop-orchestrator/scripts/state.py next-round` | 跨 round 检测 + REPLAN/SAFE_STOP |
| `python loop-orchestrator/scripts/state.py record-issue --sig "..."` | 记录失败 |
| `python loop-orchestrator/scripts/state.py record-decision --question ...` | 自主决策台账 |
| `bash loop-orchestrator/scripts/verify.sh` | 1+8 层门禁 |
| `bash loop-orchestrator/scripts/verify.sh` 自动跑 | size-classify + security-gate + 全部层 |

## 3. 别人 clone 后的 3 步上手

```sh
# 1. 拉项目
git clone <project> && cd <project>

# 2. 装 ECC submodule
git submodule update --init ECC-main/

# 3. 一键就绪
node loop-orchestrator/bin/install.js
```

## 4. 安全护栏 (用户不踩的坑)

- `git push` / `--force` / `rm -rf` → hooks/PreToolUse.json #1 拦截
- `.ai/loop/state.json` / `commands.env` → hooks/PreToolUse.json #2 拦截直接篡改
- 代码抑制标记 (eslint-disable 等) → hooks/PreToolUse.json #3 拦截
- verify 任何层 FAIL → 整体 RESULT=FAIL, 必须修
- 同一 issue 连续 2 轮未修 → 自动 REPLAN
- REPLAN 配额尽 (2 次) → 自动 SAFE_STOP

## 5. 已知 limitation (透明告知)

- **R1**: ECC plugin 端不识别 wrapper 复制的 ecc-* (我们用 visibility-report.js 透明报告)
- **R4**: FAT32/WSL 文件系统上 `os.replace` 不严格原子
- **R3**: capability cache > 7 天提示重扫 (不阻断)

## 6. 故障排查

| 现象 | 排查 |
|---|---|
| install 报 "ECC submodule not initialized" | `git submodule update --init ECC-main/` |
| 16 个 ecc-* 没复制 | `node loop-orchestrator/bin/install.js --rebuild` |
| size-classify 报 0 files | 用 `--files a,b,c` 显式指定 |
| verify FAIL 第 6 层 release gate | ECC-main 自身 release 流程问题, 与 loop-orchestrator 无关 |
| security_gate FAIL | 静态扫描命中硬编码 secret, 改用 env / 参数化查询 |
| ajv FAIL | state.json 损坏, 看 `.bak` 是否能恢复 |

## 7. 进阶

- **Mini mode（不依赖 ECC）**: `node loop-orchestrator/bin/install.js --skip-install` 仅做能力扫描
- **Rebuild capability cache**: `node loop-orchestrator/bin/install.js --rebuild`
- **加新 agent**: 在 `loop-orchestrator/agents/<name>.md` 写 frontmatter + body, harness 自动加载
- **加新 hook**: 在 `loop-orchestrator/hooks/<event>.json` 写命令, settings.json 引用

## 8. 完整文件清单

```
loop-orchestrator/
├── SPEC.md                   # 段 1 设计
├── AGENTS.md                 # 12 条硬性规则
├── ROUTING.md                # 15 路由
├── BOOTSTRAP.md              # 引导路径
├── RISK.md                   # 5 风险
├── state.schema.json         # state.json 校验
├── README.md / DELIVERY_SEG2.md / USAGE.md
├── bin/
│   ├── install.js           # 跨平台入口
│   ├── install.sh           # shim
│   └── install.ps1          # shim
├── scripts/
│   ├── capability-scanner.js # 扫 ECC 资源
│   ├── mini-installer.js    # 物理复制 16 个 ECC subagent
│   ├── capability-cache.js  # 7 天失效检查
│   ├── visibility-report.js # ECC 资源可见性 (R1 透明)
│   ├── state.py              # 状态机 + 原子写
│   ├── verify.sh             # 1+8 层门禁
│   ├── size-classify.js     # 阶段 0 分类
│   ├── security-gate.js      # 本地 orch-review 替代
│   └── validate-state-schema.js  # 段 1 验证
├── hooks/
│   ├── PreToolUse.json       # 3 个拦截器
│   ├── PostToolUse.json      # auto-lint
│   └── Stop.json             # 状态打印
├── agents/                   # 15 路由壳
│   └── *.md
├── templates/
│   ├── SPEC.md.template      # SPEC 模板
│   └── commands.env.example  # 工程命令模板
└── capabilities.json         # 装置产物 (git ignored)
```

单人 1 小时内就可以读完 + 用上。
