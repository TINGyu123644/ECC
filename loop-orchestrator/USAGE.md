# loop-orchestrator — 使用指南

> **目前只适配 Claude Code**（[https://claude.ai/code](https://claude.ai/code)）。
> VSCode 只是个**例子** — 任何装 Claude Code 的 IDE 都能用（Cursor / JetBrains / 终端版 等）。

---

## 1. 6 步上手（1 次设置 + 之后对话即用）

### 第 1 步：解压 zip

把 `loop-orchestrator-v0.1.0.zip` 解压到任何位置，会得到 `loop-orchestrator/` 文件夹。

```
[Windows] 双击 zip 或者右键 → 解压到当前文件夹
[Mac]   双击自动解压
[Linux] unzip loop-orchestrator-v0.1.0.zip
```

### 第 2 步：把 loop-orchestrator/ 拷到你的项目根

```
[你的项目根]/
├── loop-orchestrator/        ← 刚拷过来
├── src/                       ← 你的代码
├── package.json
└── ...
```

**关键**：`loop-orchestrator/` 必须在项目根的**直接子目录**。

### 第 3 步：跑 install.js

```sh
cd <你的项目根>
node loop-orchestrator/bin/install.js
```

**安装脚本自动做 5 件事**：

1. 检查环境（ECC submodule 是可选的）
2. 在 `.ai/loop/commands.env` 创建空白模板
3. 在 `SPEC.md` 创建空白模板
4. 初始化 `.ai/loop/state.json`（状态机）
5. 跑 capability-scanner 索引可用资源

跑完你会看到类似：

```
=== loop-orchestrator install ===
step 0: bootstrap commands.env + SPEC.md
  + copied template -> .ai/loop/commands.env
  + copied template -> SPEC.md
step 1: capability-scanner
  agents: 71, skills: 287, commands: 95
```

### 第 4 步：填 commands.env（5 分钟）

打开 `.ai/loop/commands.env`，填你项目用什么命令跑门禁：

```bash
# 留空 = 跳过该层。至少填 CMD_TEST

CMD_LINT="npm run lint"           # 你项目用什么跑 lint
CMD_TYPECHECK="npx tsc --noEmit"  # 类型检查
CMD_TEST="npm test"                # 测试
CMD_PROJECT_GATE="npm run release" # 项目自有门禁
```

**模板里 4 栈示例**（Node / Python / Go / Rust），不知道就空着。

### 第 5 步：填 SPEC.md（25 分钟）

打开 `SPEC.md`，至少写 3 条 AC。这是给 AI 的"任务说明书"。

```markdown
# SPEC.md — <你的项目名>

## 0. 元信息
- **负责人**: 你的名字

## 4. 验收标准

### AC-1: <你的需求一句话>
- **Given**: <前提>
- **When**: <动作>
- **Then**: <结果>
- **Check**: <验证命令 — 比如 `npm test` 或 `curl ...`>
```

**不会写？** 看 `loop-orchestrator/templates/SPEC.md.template`（模板里给了完整 10 段）。

### 第 6 步：在 Claude Code 对话里提需求

打开装 Claude Code 扩展的 IDE（示例：**VSCode**，但 Cursor / JetBrains / 终端版都行）。

**重开 IDE**（让 Claude Code 读新文件）。

在 Claude Code 对话面板里说一句：

```
我要加 XX 功能：[你的需求]

按 loop-orchestrator 7 步推进
```

**Claude Code 自动**：

1. 读 SPEC.md
2. 调 `state.py get` 看 phase
3. 跑 `size-classify.js` 找 size tier
4. 调 `state.py set-size`
5. 按 phase 调对应 routing shell（CONTEXT / REQUIREMENT / PLAN / CODE / VERIFY / REVIEW / DELIVER）
6. 完成后推下一 phase
7. 失败自动 REPLAN / SAFE_STOP

**你不用再说话**。Claude Code 跑完告诉你结果。

---

## 2. 完整动作清单（粘贴就能跑）

```sh
# === Windows (PowerShell) ===
Expand-Archive loop-orchestrator-v0.1.0.zip -DestinationPath .
Move-Item loop-orchestrator <your-project>\
cd <your-project>
node loop-orchestrator\bin\install.js
code .ai\loop\commands.env      # 填 5 行
code SPEC.md                    # 填 3 条 AC
code .                          # 重开 VSCode

# === Mac / Linux ===
unzip loop-orchestrator-v0.1.0.zip
mv loop-orchestrator <your-project>/
cd <your-project>
node loop-orchestrator/bin/install.js
code .ai/loop/commands.env      # 填 5 行
code SPEC.md                    # 填 3 条 AC
code .                          # 重开编辑器
```

---

## 3. 实际场景例子

```
你的项目:  C:\Users\你\Desktop\my-app\    (有 src/, package.json)
你的需求:  "加用户登录页"

Step 1: 双击 zip → 解压得 loop-orchestrator/
Step 2: 拖到 C:\Users\你\Desktop\my-app\
Step 3: 终端 cd my-app, node loop-orchestrator\bin\install.js
Step 4: code .ai\loop\commands.env, 填:
        CMD_LINT="npm run lint"
        CMD_TEST="npm test"
Step 5: code SPEC.md, 写 3 条 AC:
        AC-1: 登录页能加载
          Check: curl localhost:3000/login | grep "Login"
        AC-2: 错误密码拒绝
          Check: curl -X POST /login -d "{}" -w "%{http_code}" | grep 400
        AC-3: 速率限制
          Check: for i in 1..11; do curl /login; done | grep 429
Step 6: 重开 VSCode, Claude Code 对话说 "加用户登录页"

→ AI 跑 7 步 → 完成 → 你看结果
```

**总耗时**：30-35 分钟。

---

## 4. 适用 / 不适用

### 适用

- ✅ 任何 Node / Python / Go / Rust 项目
- ✅ 任何规模（小项目 1-2 文件 到 跨模块大项目）
- ✅ 团队协作（每人管一个模块，AI 不会越界 — 软约束，靠 SPEC 写明）
- ✅ 个人 / 教学 / POC

### 不适用

- ❌ 目前只适配 Claude Code（不直接支持 Cursor Composer / Continue / Cline 等其他 AI 工具）
- ❌ 严格隔离的多模块大项目（需要补模块边界硬 hook — 段 3 计划）
- ❌ 只能用 ECC 完整 7-profile 部署的企业生产环境（plan 拒绝完整 ECC install）

---

## 5. 核心命令速查

| 命令 | 用途 |
|---|---|
| `node loop-orchestrator/bin/install.js` | 一键 bootstrap (full mode, 需 ECC) |
| `node loop-orchestrator/bin/install.js --skip-install` | Mini mode (不需 ECC, 90% 场景) |
| `node loop-orchestrator/bin/install.js --rebuild` | 重建 capabilities.json + 强制覆盖 |
| `node loop-orchestrator/scripts/visibility-report.js` | ECC 资源可见性报告 (有 ECC 时有意义) |
| `node loop-orchestrator/scripts/size-classify.js --dry-run` | 阶段 0 size 判定 |
| `python loop-orchestrator/scripts/state.py get` | 读当前 phase / round / baseline |
| `python loop-orchestrator/scripts/state.py set-phase <PHASE>` | 推进阶段 |
| `python loop-orchestrator/scripts/state.py next-round` | 跨 round 检测 + REPLAN/SAFE_STOP |
| `python loop-orchestrator/scripts/state.py record-issue --sig "..."` | 记录失败 |
| `bash loop-orchestrator/scripts/verify.sh` | 1+8 层门禁 |

---

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
| Claude Code 不读 loop-orchestrator | 重开 IDE / 检查 `.claude/CLAUDE.md` 存在 |

---

## 7. 进阶

- **Mini mode（不依赖 ECC）**: `node loop-orchestrator/bin/install.js --skip-install` 仅做能力扫描
- **Rebuild capability cache**: `node loop-orchestrator/bin/install.js --rebuild`
- **加新 agent**: 在 `loop-orchestrator/agents/<name>.md` 写 frontmatter + body, harness 自动加载
- **加新 hook**: 在 `loop-orchestrator/hooks/<event>.json` 写命令, settings.json 引用
- **加新 stack**: 改 `commands.env`, 不改 loop-orchestrator 任何代码

---

## 8. 完整文件清单

```
loop-orchestrator/
├── README.md                       # 包入口（5 分钟上手）
├── USAGE.md                        # 本文件
├── SPEC.md / AGENTS.md / ROUTING.md / BOOTSTRAP.md / RISK.md  # 段 1 文档
├── state.schema.json / commands.env.schema     # schema 校验
├── bin/
│   ├── install.js / install.sh / install.ps1   # 跨平台入口
│   └── autopilot.js                              # 7 步驾驶舱
├── scripts/
│   ├── capability-scanner.js                    # 扫 ECC 资源
│   ├── mini-installer.js                       # 物理复制 ECC subagent
│   ├── capability-cache.js                       # 7 天失效检查
│   ├── visibility-report.js                   # ECC 资源可见性
│   ├── state.py                                  # 状态机 + 原子写
│   ├── verify.sh                                 # 1+8 层门禁
│   ├── size-classify.js                         # 阶段 0 分类
│   ├── security-gate.js                         # 本地 orch-review 替代
│   └── validate-state-schema.js                # 段 1 验证
├── hooks/
│   ├── PreToolUse.json / PostToolUse.json / Stop.json  # 3 拦截器
├── agents/                                       # 15 路由壳 (orchestrator + 14 routing shell)
├── templates/
│   ├── SPEC.md.template                          # 新项目 SPEC 模板
│   └── commands.env.example                      # 4 栈示例
└── capabilities.json                            # 装置产物 (git ignored)
```

**loop-orchestrator 是通用包** — 任何 Node / Python / Go / Rust 项目都用得上。 ECC 是增强, 不是必需。

**目前只适配 Claude Code**。 VSCode / Cursor / JetBrains 都行, 只要装 Claude Code 扩展。
