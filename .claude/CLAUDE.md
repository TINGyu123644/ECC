# Loop 编排规则（loop-orchestrator 版）

> 段 2 改写。继承原 wrapper `.claude/CLAUDE.md` 全部约束，并指向 `loop-orchestrator/AGENTS.md` 作为总纲。

## 0. 段 2 入口（强提示）

**本仓库启用 loop-orchestrator**。所有会话：

1. **编排入口** 优先用 `loop-orchestrator/agents/orchestrator.md`（路由壳），不再读 `.claude/agents/orchestrator.md`。
2. **总纲** 为 `loop-orchestrator/AGENTS.md`（12 硬规则 + size classifier + 耦合判定）。
3. **状态机脚本** 为 `loop-orchestrator/scripts/state.py`（含 `set-size` 与 `rebuild-capabilities` 两个段 2 新增子命令）。
4. **门禁脚本** 为 `loop-orchestrator/scripts/verify.sh`（1+8 层；fork 自 `.claude/skills/verify-gate/scripts/verify.sh`）。
5. **基础设施** 已由 `loop-orchestrator/bin/install.js`（含 shim `install.sh`/`install.ps1`）独立完成。

## 1. 收到开发需求时

读 `loop-orchestrator/AGENTS.md` 加载编排总纲，然后执行：

```sh
python loop-orchestrator/scripts/state.py get   # 读当前 phase / round
node loop-orchestrator/scripts/size-classify.js --dry-run   # 阶段 0 size 判定
python loop-orchestrator/scripts/state.py set-size <trivial|small|standard|large>
```

按 AGENTS.md 状态机决定当前阶段，按 phase mask 决定调哪些 Skill / 委派哪些 Agent。

## 1.5 自动 7 步触发（关键 — 用户期望的核心）

**用户**在对话里说"加 XX / 修 XX / 改 XX / 优化 XX" 时，**AI 自动跑 7 步**，**无需等待指令**。

### 触发识别

任何符合以下模式的用户输入视为"自动触发"：

- "加 [功能]" / "实现 [功能]" / "开发 [功能]"
- "修 [bug]" / "fix [bug]" / "解决 [问题]"
- "改 [代码]" / "优化 [代码]" / "重写 [代码]"
- "做 [任务]" / "我需要 [任务]"
- "测试 [目标]" / "验证 [目标]"

**不触发**: 纯对话 / 问答 ("什么是 X?" / "Y 怎么用?").

### 自动 7 步流程

```
1. 读 SPEC.md 看你接到什么
2. 跑 state.py get 看 phase 位置
3. 跑 size-classify.js --dry-run 找 size tier
4. 调 state.py set-size <trivial|small|standard|large>
5. 按当前 phase 调对应 routing shell:
   - CONTEXT     → context-scout.md
   - REQUIREMENT → requirement-analyst.md
   - PLAN        → solution-architect.md
   - CODE        → feature-coder.md
   - VERIFY      → regression-guard.md (自动跑 verify.sh)
   - REVIEW      → code-reviewer.md
   - FIX         → fixer.md (失败时)
6. 完成后 state.py set-phase <next>
7. 输出结果再自动推下一轮直到 DELIVER
```

### 驾驶舱脚本 (可选)

```sh
node loop-orchestrator/bin/autopilot.js "加 XX 功能"  # 自动识别 + 给 AI 下一步指令
node loop-orchestrator/bin/autopilot.js --step          # 推 1 步
node loop-orchestrator/bin/autopilot.js --auto         # 自动跑完整 7 步
```

### 状态机推进原则

- **不要等指令**：用户说了就立刻跑
- **不要遗漏**：7 步全跑, VERIFY 失败自动 FIX
- **不要硬推 phase**: 用 state.py set-phase, 禁止脑内记状态
- **不要改 SPEC.md**: 用户说需求 ≠ 改 SPEC, 先 running

### 失败处理

- verify 失败 → 立即调 fixer.md + state.py record-issue
- 同一 issue 2 轮未修 → 自动 REPLAN
- REPLAN 配额尽 → 自动 SAFE_STOP

### 用户中途打断

- "停" / "不要" / "等" → 立即停止 phase 推进
- "改 XX" → 重新跑 7 步 (作为新需求)
- "提示" / "hint" → 备注进 state.py record-decision

### 例子

```
用户: "加个邮箱密码登录"
AI: (立即读 state.py get → phase=CONTEXT)
    (size-classify → small)
    (CONTEXT: 跑 context-scout)
    (set-phase REQUIREMENT, 跑 requirement-analyst)
    (set-phase PLAN, 跑 solution-architect)
    (set-phase CODE, 跑 feature-coder)
    (set-phase VERIFY, 跑 verify.sh)
    (set-phase REVIEW, 跑 code-reviewer)
    (如果 OK: set-phase DELIVER, 跑 delivery-reporter)
    (输出: "邮箱密码登录已加, 验证全过, 详见...")
```

**用户不需要说"按 7 步推进"**。AI 自动识别需求并跑完。

## 2. 状态机、规范体系与冲突优先级

照 `loop-orchestrator/AGENTS.md` 唯一事实来源。`loop-orchestrator/SPEC.md` § 1-5 提供取舍矩阵与设计依据。

## 3. 规范参考库

按 [`.ai/loop/standards.md`](../.ai/loop/standards.md) 路由结果取用；项目自有规则与既有风格永远优先。

## 4. Claude Code 特化

- 编排者读 `loop-orchestrator/agents/orchestrator.md`；子 Agent（context-scout / planner / coder / ...）的角色定义已在 `loop-orchestrator/agents/` 落盘；Agent 矩阵与 Skill 授权见 `loop-orchestrator/ROUTING.md` 与 `loop-orchestrator/AGENTS.md`。
- 全部 Skill 通过 Skill 工具按需加载（21 个本地 + 段 2 通过 mini-installer 物理就位的 16 个 ECC subagent + ECC 既有 289 skills 经 capability-scanner 索引）。
- 编辑后自动 Lint 与危险命令拦截由 `loop-orchestrator/hooks/PreToolUse.json` + `PostToolUse.json` 承担（`.claude/settings.json` 改：内联 bash 改为引用 3 个 JSON 文件）；hooks 拒绝的写入不可绕过——若需例外请用户放行。
- 编排者读 `loop-orchestrator/AGENTS.md`；子 Agent 通过 `loop-orchestrator/agents/<name>.md` 各自读取自己的 role 文件。

## 5. 段 2 风险与回滚

段 2 引入 R1-R5 风险（详见 `loop-orchestrator/RISK.md`）。任一阶段 hook 误拒绝合法写入 / state.json 写崩 → 回滚：

```sh
git checkout .claude/settings.json .claude/CLAUDE.md
rm -rf loop-orchestrator
```

## 6. installed agents（段 2 物理就位）

`loop-orchestrator/bin/install.js` 默认会复制以下 16 个 ECC subagent 到 `.claude/agents/`，加 `ecc-` 前缀：

`ecc-code-explorer` `ecc-planner` `ecc-architect` `ecc-tdd-guide` `ecc-code-reviewer` `ecc-security-reviewer` `ecc-e2e-runner` `ecc-build-error-resolver` `ecc-python-reviewer` `ecc-typescript-reviewer` `ecc-cpp-reviewer` `ecc-rust-reviewer` `ecc-go-reviewer` `ecc-java-reviewer` `ecc-react-reviewer` `ecc-vue-reviewer`

未安装？跑：

```sh
node loop-orchestrator/bin/install.js --rebuild
```
