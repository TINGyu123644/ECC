# loop-orchestrator — RISK

> 段 1 风险矩阵。用户需在段 1 签收时**明确接受 80%+ 概率估计**，否则段 2 不开始。

## 风险总览

| # | 风险 | 概率 | 影响 | 缓解策略 | 残余风险 |
|---|---|---|---|---|---|
| R1 | ECC subagent 不被 harness 加载 → 路由壳失效 | 高 | 致命：orchestrator 用旧版，循环退化为单源 | mini-installer 复制 16 个 agent 加 `ecc-` 前缀到 `.claude/agents/`；`CLAUDE.md` 强提示 | 中：复制文件可能因路径 bug 未真正就位；R1 是已知 limitation |
| R2 | commands.env cwd 假设（wrapper 根）被破坏 | 中 | 中：lint/test 找不到命令 | `verify.sh` 顶部 `cd "$(dirname "$0")/../.."` 显式锚定 | 低 |
| R3 | capability cache 与 ECC 实际资源 drift | 中 | 中：调不存在的 skill | `capability-cache.js` 检查 mtime > 7 天提示重扫 | 低 |
| R4 | Windows `os.replace` 非原子（FAT32 / WSL） | 低 | 低：状态错乱可恢复 | state.py 加 startup schema 校验；损坏自动备份+reset | 极低 |
| R5 | ECC submodule 未 init → mini-installer 报 missing | 中 | 中：capabilities.json 为空 | install.js 启动时 `git submodule status` 检查，未 init 报错退出 | 低 |

## 详细分析

### R1 — ECC subagent 不可见（已知 limitation）

**场景**：ECC 的 73+ agents 困在 `c:\Users\26631\Desktop\ECC-main\ECC-main\agents\`，wrapper harness 启动时只读 wrapper 内 `c:\Users\26631\Desktop\ECC-main\.claude\agents\`，ECC 的 agent 完全看不见。

**缓解方案**：mini-installer 物理复制 16 个 ECC agent 到 `c:\Users\26631\Desktop\ECC-main\.claude\agents\ecc-*.md`。

**残余风险**：
- 若 mini-installer 因 bug 未复制成功，routes 全失效，退化成纯 ai-coding-loop
- 加 `ecc-` 前缀后，frontmatter `tools` / `model` 字段如不在 wrapper 白名单内，可能被忽略
- 段 1 测试只能通过 `ls .claude/agents/ | grep -c '^ecc-'` 数值验证，**不能**实跑 router 是否真调通（要段 2 完成才能跑通）

**接受条件**：用户在段 1 签收时**必须**明确说"接受 R1 残余风险"。

### R2 — commands.env cwd 漂移

**场景**：原 `.ai/loop/commands.env` 触发 cwd 是 wrapper 根，由 hook `source .ai/loop/commands.env` 时默认可解析相对路径。但 hooks 的 cwd 取决于 Claude Code 启动目录，若用户在 `c:\Users\26631\Desktop\ECC-main\ECC-main` 内启动（或 fork 过程），`source` 会找不到文件。

**缓解**：verify.sh 段 2 起顶部加 `cd "$(dirname "$0")/../.."` 锚定到 loop-orchestrator 包根，再重解析 `commands.env` 路径。

**残余风险**：Windows MSYS2 + Git Bash 的 `$(dirname ...)` 在含空格的路径上偶尔 quote 出错。

### R3 — capability cache drift

**场景**：`loop-orchestrator/capabilities.json` 扫描了 ECC submodule 内的 agent / skill 名称。但 ECC submodule 在 git pull 后会变（commit 变化、文件增删），cache 与实际不同步。

**缓解**：capability-cache.js 段 2 实现 mtime 检查，> 7 天提示用户重扫。

**残余风险**：用户忽略提示继续用，导致 routing 到不存在资源，**段 2 必须**让 router shell 在 capability miss 时静默 fallback（已有设计）。

### R4 — Windows 原子写

**场景**：`os.replace` 在 NTFS 是原子；在 FAT32 / WSL 文件系统不保证。state.json 写一半崩了会丢。

**缓解**：state.py 段 2 写入流程：
1. 写 `.ai/loop/state.json.tmp`
2. `os.replace(tmp, real)`（POSIX + Windows 都尽力原子）
3. startup 校验 schema，损坏则从 `.bak` 恢复

**残余风险**：连续两次崩溃（tmp + real 都坏）→ 自动 reset 到 INIT。

### R5 — submodule 未 init

**场景**：用户 `git clone` 后忘跑 `git submodule update --init`，`ECC-main/` 是空目录或不存在。mini-installer 扫不到 16 个 agent 源，**复制 0 个**。

**缓解**：install.js 段 2 启动时跑 `git submodule status`，任一前置为 `-`（未 init）立刻报错退出：
```
ERROR: ECC-main/ submodule not initialized.
Run: git submodule update --init ECC-main/
```

**残余风险**：用户忽略错误继续跑，会得到 capabilities.json 空 + capabilities.json mtime 旧两条警告。

## 概率与决策

| 段 | 概率 |
|---|---|
| 段 1 (spec) | ~99% — 纯文档，零代码影响 |
| 段 2 (实现) | **~55-65%** — 主要拖累 R1 + R3 |
| 段 2 全成功（含 trivial E2E）| ~50-55% |
| 段 2 全成功（含 real E2E）| ~40-45% |

## 用户签收要求

| 必须明确回应 | 不接受则段 2 不开始 |
|---|---|
| "我接受 R1 残余风险，明白 ECC agent 不物理加载会全失效" | × |
| "我接受 R3 的 capability cache 7 天提示" | × |
| "我对段 2 概率 55-65% 可接受" | × |

## 不高估与不低估

R1 是唯一**已知 limitation**——设计层面无法 100% 消除（除非 `install.sh` 跑完整 ECC 插件部署，违反 plan §"不调 ECC 全 7-profile 安装"）。

R2-R5 都是有缓解的工程风险，可以降到低或极低。

设计取舍：与其用 `install.sh` 解决 R1（污染 wrapper 自包含），不如**接受 R1 已知 limitation**，让 loop-orchestrator 成为"半透明集成层"——能用 ECC 时用，不能用时 fallback 到 ai-coding-loop。能力上限比能力完备更重要。
