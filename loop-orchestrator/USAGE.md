# loop-orchestrator — 使用指南（任意项目，通用 4 栈）

> 对应师-王宇 提的 7 步 autonomous loop 设计：
> 1. 用户提需求 → 2. AI 分析需求 → 3. AI 规划 → 4. AI 写代码 → 5. AI 审查 → 6. AI 改错 → 7. 循环直至成功
>
> **loop-orchestrator 是通用包, 不绑任何项目**。任何 Node / Python / Go / Rust 项目都用得上。 ECC 是增强, 不是必需。

## 0. 5 分钟上手（任意项目）

```sh
# 第 1 步：拷贝 loop-orchestrator 包到任意项目根
cp -r /path/to/loop-orchestrator <your-project>/loop-orchestrator

# 第 2 步：bootstrap（mini mode — 无 ECC 也能跑）
cd <your-project>
node loop-orchestrator/bin/install.js --skip-install
#   ✓ 检查 wrapper 根
#   ✓ 复制 commands.env.example 模板到 .ai/loop/commands.env
#   ✓ 跑 capability-scanner 索引可用资源
#   ✓ 跳过 ECC 复制（mini mode）

# 第 3 步：填 commands.env 实际工程命令
$EDITOR .ai/loop/commands.env
#   4 栈示例 (Node/Python/Go/Rust) 在模板里

# 第 4 步：填 SPEC.md
cp loop-orchestrator/templates/SPEC.md.template SPEC.md
$EDITOR SPEC.md
#   必填: 项目名 / 负责人 / 3-5 条 AC + Check 命令

# 第 5 步：跑首次 verify
bash loop-orchestrator/scripts/verify.sh
#   期望 RESULT: PASS

# 第 6 步：VSCode + Claude Code 对话启动 7 步 loop
#   在对话里说: "按 7 步推进"
```

## 1. 日常 7 步使用 — VSCode + Claude Code 对话

**重要**：loop-orchestrator 是给 Claude Code 用的编排规则，**不是命令行工具**。
日常使用 = 在 VSCode 装 Claude Code 扩展，**在对话里说话**，AI 自动跑 7 步。

### Day 1 一次性（项目维护者做一次）

```sh
# 拷贝包到任意项目根
cp -r /path/to/loop-orchestrator ./loop-orchestrator

# 跑 install.js (任选模式)
node loop-orchestrator/bin/install.js                # full mode (需 ECC-main)
# 或
node loop-orchestrator/bin/install.js --skip-install  # mini mode (无 ECC)

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
3. **加载 16 个物理复制**（`.claude/agents/ecc-*.md`，仅 full mode）
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

## 1.5. AI 自动填 commands.env + SPEC.md（推荐）

**核心问题**：commands.env 和 SPEC.md 是数据，必须人填。但可以**让 AI 帮你填**（基于现有项目，**任意项目**都行）。

### 适用场景（通用 4 栈）

- 新项目刚 bootstrap，commands.env 还是模板
- 想给 SPEC.md 写初稿但不知道从哪下手
- 接手别人项目，要快速生成 SPEC
- **任何栈**：Node / Python / Go / Rust / 任意

### 操作步骤

#### 1. 命令 AI 收集项目信息

```sh
# Node:
cat package.json
# Python:
cat pyproject.toml
# Go:
cat go.mod
# Rust:
cat Cargo.toml
# 任意:
ls -la && tree -L 2 -I 'node_modules|.git'
```

#### 2. 对 Claude Code 说：

> "请帮我基于这个项目（任意项目根）自动填 `<project-root>/.ai/loop/commands.env` 和 `SPEC.md`。 commands.env 看 `package.json` scripts 字段（或 pyproject.toml / Cargo.toml / go.mod）； SPEC.md 看项目结构 + README + 我粘的 1 段自然语言需求"

#### 3. AI 自动做的事

**commands.env** (任意栈):

| 栈 | AI 读 | 填字段 |
|---|---|---|
| Node | `package.json` scripts | `CMD_LINT="npm run lint"` 等 |
| Python | `pyproject.toml` `[tool.poetry.scripts]` 或 `[project.scripts]` | `CMD_LINT="ruff check ."` 等 |
| Go | `go.mod` + `Makefile` | `CMD_TEST="go test ./..."` 等 |
| Rust | `Cargo.toml` `[[bin]]` + `[profile]` | `CMD_LINT="cargo clippy"` 等 |

**SPEC.md** (任意项目):
- 读 README / AGENTS.md / 项目结构
- 提取项目类型 / 规模 / 风险
- 填 10 段模板（聚焦第 4 段 AC）
- 每条 AC 必含 Check 命令（可执行）

#### 4. 验证 AI 填的结果

```sh
# commands.env 验证
bash loop-orchestrator/scripts/verify.sh
# 期望各层 PASS 或 SKIPPED

# SPEC.md 验证
python -c "
import re
text = open('SPEC.md').read()
sections = re.findall(r'^## (\d+\. .+)$', text, re.MULTILINE)
print(f'10 段: {len(sections)}/10 found')
print(f'AC 数: {text.count(\"### AC-\")}')
print(f'Check 数: {text.count(\"- **Check**\")}')
"
```

### 实操示范（3 个不同项目例子）

**示例 1（你刚做的 ECC 整合项目）**:
- 路径: `c:\Users\26631\Desktop\ECC-main`
- AI 读 `package.json` + `ECC-main/package.json` 的 scripts 字段
- 自动填 `commands.env` (段 1 阶段 context-scout 已填)
- 自动填 `SPEC.md` (本次演示, 5 条 AC + 11 段)

**示例 2（任意 Node 项目）**:
- 路径: `/path/to/your-node-app`
- AI 读 `package.json` scripts
- 填 `CMD_LINT="npm run lint"` / `CMD_TEST="npm test"` 等
- 写 SPEC.md 该项目特定 AC

**示例 3（任意 Python 项目）**:
- 路径: `/path/to/your-py-app`
- AI 读 `pyproject.toml`
- 填 `CMD_LINT="ruff check ."` / `CMD_TEST="pytest"` 等

## 1.6. 单独提取给团队/同学用 — 通用 4 步

**核心问题**：loop-orchestrator 是**通用包**，不绑任何项目。 提取 = 拷给别人 + 走 install.js。

### 0 重要前提

loop-orchestrator 可以：
- **完全独立运行**（mini mode，无 ECC）
- **配合 ECC 增强**（full mode，有 ECC 资源）

**没有 ECC 也能跑**——降级到只用 15 个 routing shell + 21 个本地 skill。

### 通用 4 步提取

#### 1. 拷贝 loop-orchestrator 包到对方项目

```sh
cp -r /path/to/loop-orchestrator ./loop-orchestrator
```

#### 2. 决定 ECC 依赖（可选）

**情况 A：项目无 ECC**（默认，占 90% 场景）：

```sh
# 跑 install.js 加 --skip-install 跑 mini mode
node loop-orchestrator/bin/install.js --skip-install
# 仅做能力扫描 + cp 模板, 不复制 ECC subagent
```

**情况 B：项目有 ECC submodule**：

```sh
# 完整流程, 复制 16 个 ECC subagent
node loop-orchestrator/bin/install.js
# 自动探测 ../ECC-main / ../../ECC-main
```

**情况 C：把 ECC 嵌入 vendor/**：

```sh
git clone <ecc-url> loop-orchestrator/vendor/ECC-main
# 改 resolveEccRoot 加 1 个路径
```

#### 3. 朋友怎么用

```sh
# 1. git clone 自己项目
git clone <your-project>
cd <your-project>

# 2. 跑 install.js (任选模式)
node loop-orchestrator/bin/install.js
# 默认 full mode (要 ECC-main)
# 或
node loop-orchestrator/bin/install.js --skip-install   # mini mode

# 3. 填 2 数据
$EDITOR .ai/loop/commands.env   # 5 分钟
$EDITOR SPEC.md                  # 20 分钟

# 4. 进 VSCode + Claude Code 对话
# 在对话里说: "按 7 步推进"
```

#### 4. 朋友项目可填的 commands.env (4 栈示例)

```bash
# Node + TypeScript:
CMD_LINT="npm run lint"
CMD_TYPECHECK="npx tsc --noEmit"
CMD_TEST="npm test"

# Python + pytest:
CMD_LINT="ruff check ."
CMD_TYPECHECK="mypy src/"
CMD_TEST="pytest tests/ -v"

# Go:
CMD_LINT="golangci-lint run"
CMD_TYPECHECK="go vet ./..."
CMD_TEST="go test ./..."

# Rust:
CMD_LINT="cargo clippy"
CMD_TYPECHECK="cargo check"
CMD_TEST="cargo test"
```

#### 5. 打包发团队

```sh
# 你作为分发者:
zip -r loop-orchestrator-v0.1.0.zip loop-orchestrator/
# 发给朋友
# 朋友:
unzip loop-orchestrator-v0.1.0.zip
cd <their-project>
node loop-orchestrator/bin/install.js
```

### 提取后限制

| 限制 | 缓解 |
|---|---|
| 朋友想用 ECC 16 个 subagent | 需要 ECC-main (submodule / vendor / 自定义) |
| wrapper 根路径不同 | `state.py` 已通过 `git rev-parse --show-toplevel` 自适应 |
| vendor/ 路径未探测 | 改 `resolveEccRoot` 加 1 行 (USAGE 已给) |
| hooks 物理外迁需改 `.claude/settings.json` | 已写明 USAGE.md § 1 |

## 2. 核心命令速查

| 命令 | 用途 |
|---|---|
| `node loop-orchestrator/bin/install.js` | 一键 bootstrap (full mode, 需 ECC) |
| `node loop-orchestrator/bin/install.js --skip-install` | Mini mode (不需 ECC) |
| `node loop-orchestrator/bin/install.js --rebuild` | 重建 capabilities.json + 强制覆盖 |
| `node loop-orchestrator/scripts/visibility-report.js` | ECC 资源可见性报告 (有 ECC 时有意义) |
| `node loop-orchestrator/scripts/size-classify.js --dry-run` | 阶段 0 size 判定 |
| `python loop-orchestrator/scripts/state.py get` | 读当前 phase / round / baseline |
| `python loop-orchestrator/scripts/state.py set-phase <PHASE>` | 推进阶段 |
| `python loop-orchestrator/scripts/state.py next-round` | 跨 round 检测 + REPLAN/SAFE_STOP |
| `python loop-orchestrator/scripts/state.py record-issue --sig "..."` | 记录失败 |
| `python loop-orchestrator/scripts/state.py record-decision --question ...` | 自主决策台账 |
| `bash loop-orchestrator/scripts/verify.sh` | 1+8 层门禁 |

## 3. 别人 clone 后的 3 步上手（任意项目）

```sh
# 1. 拉项目
git clone <project> && cd <project>

# 2. 跑 install.js (mini mode 默认, 无 ECC 也能跑)
node loop-orchestrator/bin/install.js --skip-install

# 3. 一键就绪
$EDITOR .ai/loop/commands.env   # 5 分钟
$EDITOR SPEC.md                  # 20 分钟
```

## 4. 安全护栏 (用户不踩的坑)

- `git push` / `--force` / `rm -rf` → hooks/PreToolUse.json #1 拦截
- `.ai/loop/state.json` / `commands.env` → hooks/PreToolUse.json #2 拦截直接篡改
- 代码抑制标记 (eslint-disable 等) → hooks/PreToolUse.json #3 拦截
- verify 任何层 FAIL → 整体 RESULT=FAIL, 必须修
- 同一 issue 连续 2 轮未修 → 自动 REPLAN
- REPLAN 配额尽 (2 次) → 自动 SAFE_STOP

## 5. 已知 limitation (透明告知)

- **R1**: ECC plugin 端不识别 wrapper 复制的 ecc-* (我们用 visibility-report.js 透明报告) — **仅有 ECC 时适用**
- **R4**: FAT32/WSL 文件系统上 `os.replace` 不严格原子
- **R3**: capability cache > 7 天提示重扫 (不阻断)

## 6. 故障排查

| 现象 | 排查 |
|---|---|
| install 报 "ECC submodule not initialized" | 改用 `--skip-install` (mini mode), 或 `git submodule update --init ECC-main/` |
| 没用 ECC, 想跳过 | `node loop-orchestrator/bin/install.js --skip-install` |
| 16 个 ecc-* 没复制 | `node loop-orchestrator/bin/install.js --rebuild` |
| size-classify 报 0 files | 用 `--files a,b,c` 显式指定 |
| verify FAIL 第 6 层 | 项目自有门禁问题, 与 loop-orchestrator 无关 |
| security_gate FAIL | 静态扫描命中硬编码 secret, 改用 env / 参数化查询 |
| ajv FAIL | state.json 损坏, 看 `.bak` 是否能恢复 |

## 7. 进阶

- **Mini mode（不依赖 ECC）**: `node loop-orchestrator/bin/install.js --skip-install` 仅做能力扫描
- **Rebuild capability cache**: `node loop-orchestrator/bin/install.js --rebuild`
- **加新 agent**: 在 `loop-orchestrator/agents/<name>.md` 写 frontmatter + body, harness 自动加载
- **加新 hook**: 在 `loop-orchestrator/hooks/<event>.json` 写命令, settings.json 引用
- **加新 stack**: 改 `commands.env`, 不改 loop-orchestrator 任何代码

## 8. 完整文件清单

```
loop-orchestrator/
├── README.md / SPEC.md / AGENTS.md / ROUTING.md / BOOTSTRAP.md / RISK.md  # 段 1 文档
├── state.schema.json / commands.env.schema     # schema 校验
├── USAGE.md                                      # 使用指南
├── bin/
│   ├── install.js / install.sh / install.ps1   # 跨平台入口
├── scripts/
│   ├── capability-scanner.js                    # 扫 ECC 资源 (optional)
│   ├── mini-installer.js                       # 物理复制 ECC subagent (optional)
│   ├── capability-cache.js                       # 7 天失效检查
│   ├── visibility-report.js                   # ECC 资源可见性 (optional)
│   ├── state.py                                  # 状态机 + 原子写
│   ├── verify.sh                                 # 1+8 层门禁
│   ├── size-classify.js                         # 阶段 0 分类
│   ├── security-gate.js                         # 本地 orch-review 替代
│   └── validate-state-schema.js                # 段 1 验证
├── hooks/
│   ├── PreToolUse.json                           # 3 个拦截器
│   ├── PostToolUse.json                          # auto-lint
│   └── Stop.json                                  # 状态打印
├── agents/                                       # 15 路由壳 (通用, 不绑 ECC)
├── templates/
│   ├── SPEC.md.template                          # SPEC 模板
│   └── commands.env.example                      # 4 栈示例
└── capabilities.json                            # 装置产物 (git ignored, optional)
```

**loop-orchestrator 是通用包** — 任何 Node / Python / Go / Rust 项目都用得上。 ECC 是增强, 不是必需。

单人 1 小时内就可以读完 + 用上。
