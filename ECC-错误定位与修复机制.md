# ECC 错误定位与修复机制 —— Error Localization & Fix

> 版本：v1.0 · 日期：2026-08-05
> 核心：**5 类资源 + 1 条触发原则**。11 个 build-resolver agent 真修编译错；5 个语义层 agent 修行为/设计错；hook 是运行时前置防线；orch-fix-defect 是剧本级组合调度；4 条修复原则是跨 agent 共识。
> 诚实声明：**没有"凭空猜 bug"** —— 必须先有具体错误信号（stderr / failed test / stack trace / 异常日志），agent 才能动。

---

## 0. 一句话定义

**错误定位 + 修复 = 5 类资源按"信号 → 定位 → 修复 → 验证 → 拦截"5 步走**：先有 stderr / failed test 等信号 → 喂给对应 build-resolver 或 silent-failure-hunter 定位 → agent 给最小 diff → 跑 test / CI 验证 → hook 在 PreToolUse 拦下同类错误再次发生。

---

## 1. 框架总览（一眼看清）

### 1.1 5 类资源

```
                        [具体错误信号]
                stderr / failed test / stack trace
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  [1] 硬代码 agent 群（⭐ 真修编译错）                      │
│      11 个 build-resolver（按语言路由）                    │
│      → 最小 diff 修复                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  [2] 语义层 agent 群（◐ 修行为 / 设计错）                  │
│      silent-failure-hunter / debugger / code-reviewer /    │
│      security-reviewer / pr-test-analyzer                  │
│      → 评审 + 找吞错 + 测试覆盖 + 行为错                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  [3] 运行时 hook 防线（⭐ 拦截再次发生）                   │
│      PreToolUse / PostToolUse / Stop + ECC_HOOK_PROFILE   │
│      → 在工具调用层阻断危险动作 / 自动跑验证               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  [4] 剧本级组合调度（◐ 多 skill 协同）                     │
│      orch-fix-defect SKILL.md                              │
│      → 复现 bug → 修到绿 → Review → commit                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  [5] 修复原则（◐ 跨 agent 协议共识）                       │
│      不凭空猜 / minimal diff / 架构改动交 architect /      │
│      修完要验证                                            │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 5 类资源清单

| 类别 | 资源 | 形式 | 真起作用范围 |
|------|------|------|-------------|
| **R1 硬代码 agent** | 11 个 build-resolver | agent | ⭐ 各语言栈编译错 |
| **R2 语义层 agent** | silent-failure-hunter / debugger / code-reviewer / security-reviewer / pr-test-analyzer | agent | ◐ 评审 + 吞错 + 行为错 |
| **R3 hook 防线** | PreToolUse / PostToolUse / Stop + `ECC_HOOK_PROFILE` / `ECC_DISABLED_HOOKS` | JSON + Node | ⭐ 运行时拦截 |
| **R4 剧本组合** | `skills/orch-fix-defect/SKILL.md` | SKILL.md | ◐ 端到端修 bug |
| **R5 修复原则** | 4 条铁律（见 § 2.5） | 协议 | ◐ 跨 agent 共识 |

### 1.3 数据流（从错误信号到修复 commit）

```
[具体错误信号]  stderr / failed test / stack trace
   ↓
[1] signals-to-agent → build-resolver（按 stderr 路由语言）
   ↓
[2] 最小 diff 修复（不动架构）
   ↓
[3] 跑 test / CI 验证（verification-loop）
   ↓
[4] silent-failure-hunter 复查（防吞错）
   ↓
[5] Phase 5 Review（orch-review.workflow.js，⭐ 真硬代码 fail-closed）
   ↓
[6] commit: fix: / refactor:
```

### 1.4 实际起到的作用

| 没机制 | 有机制 |
|--------|--------|
| 编译报错只能 stackoverflow | 11 个 build-resolver 按语言精准修 |
| 静默失败无人察觉 | silent-failure-hunter 主动找吞错 |
| 修完不知道有没有副作用 | verification-loop + test 强制验证 |
| 危险动作（`rm -rf` / 写敏感文件）无人拦 | PreToolUse hook 拦 |
| 多文件 bug 改乱了 | orch-fix-defect 剧本串好 6 步 |

### 1.5 效果怎么有（硬代码 vs 协议）

```
硬代码层(40%): agent + skill + hook → 强制执行
  ⭐ build-resolver 11 个 / verification-loop / PreToolUse hook
  真起作用: 修编译错、强制验证、运行时阻断

协议层(60%): 修复原则 / phase mask / 评审触发场景
  ◐ 跨 agent 共识，靠 AI 读完 SKILL.md 自觉
  失效模式: AI 跳过 minimal diff（顺手重构）/ 没验证就 commit
```

### 1.6 快速索引卡

```
┌──────────────────────────────────────────────┐
│  ECC 错误定位修复 = 5 类资源                 │
│                                              │
│  [1] R1 硬代码 agent    11 个 build-resolver│
│  [2] R2 语义层 agent    silent-failure-     │
│                       hunter / debugger ... │
│  [3] R3 hook 防线       PreToolUse 拦截     │
│  [4] R4 剧本组合        orch-fix-defect     │
│  [5] R5 修复原则        minimal diff /      │
│                       不凭空猜              │
│                                              │
│  流程: 信号 → 定位 → 修复 → 验证 → 拦截     │
│  唯一前置条件: 必须先有具体错误信号           │
└──────────────────────────────────────────────┘
```

### 1.7 怎么用这个机制

```
1. 用户报告 bug 并贴 stderr / failed test 输出
2. AI 按 stderr 路由到对应 build-resolver 或 R2 语义 agent
3. agent 给最小 diff 修复（不动架构）
4. 跑 test / CI 验证（verification-loop）
5. silent-failure-hunter 复查（如有吞错风险）
6. Phase 5 Review 走 orch-review.workflow.js（⭐ 真硬代码）
7. commit: fix: / refactor:
```

---

## 2. 5 类资源详解

### 资源 1 —— 11 个 build-resolver agent（⭐ 硬代码，真修编译错）

**是什么**：每个 build-resolver 是一个专项 agent，**只负责最小 diff 修复**自己语言栈的编译/构建错误，不顺手重构。

**清单**（11 个）：

| Agent | 栈 | 触发场景 |
|-------|-----|----------|
| `ecc:build-error-resolver` | 通用 JS/TS | `tsc` / `eslint` / `node` 报错 |
| `ecc:cpp-build-resolver` | C++ | CMake / clang / g++ / 模板错 |
| `ecc:dart-build-resolver` | Dart/Flutter | `dart analyze` / `pub` 冲突 / `build_runner` |
| `ecc:go-build-resolver` | Go | `go build` / `go vet` / linter |
| `ecc:java-build-resolver` | Java/Maven/Gradle | Spring Boot / Quarkus 编译错 |
| `ecc:kotlin-build-resolver` | Kotlin/Gradle | Kotlin compiler / ksp |
| `ecc:pytorch-build-resolver` | PyTorch | tensor shape / device / 梯度 / DataLoader / mixed precision |
| `ecc:react-build-resolver` | React | Vite / webpack / Next.js / hydration / JSX |
| `ecc:rust-build-resolver` | Rust | cargo / borrow checker / Cargo.toml |
| `ecc:swift-build-resolver` | Swift/Xcode | swift build / SPM / signing |
| `ecc:django-build-resolver` | Django/Python | pip / Poetry / migration / collectstatic |

**工作模式**（以 `build-error-resolver` 为例）：

```
输入:  build 命令的 stderr（用户贴 / agent 主动跑）
定位:  按错误类型（syntax / type / import / link / template）
输出:  minimal diff（仅修出错那几行），不重构
验证:  跑回 build 命令确认 green
```

**关键约束**：

- ❌ 不能凭空猜 bug —— 必须先有 stderr
- ❌ 不修运行时逻辑 bug（交给 R2 debugger / silent-failure-hunter）
- ❌ 不做架构改动（交给 `ecc:architect`）
- ✅ 只动"出错那几行"，不顺手改别的

---

### 资源 2 —— 语义层 agent 群（◐ 协议）

**是什么**：5 个 agent 专门抓"非编译错"——吞错、设计缺陷、安全漏洞、测试覆盖、运行时逻辑。

| Agent | 抓什么 | 何时调 |
|-------|--------|--------|
| `ecc:silent-failure-hunter` | 吞掉的异常 / 坏 fallback / 缺错误传播 | 改完不确定 / 怀疑有静默 bug |
| `ecc:debugger` | 运行时逻辑错 | 有 stack trace 但 build 不报错 |
| `ecc:code-reviewer` | 代码质量 / 可维护性 | 改完大段代码后必跑 |
| `ecc:security-reviewer` | OWASP Top 10 / 密钥泄露 | 改 auth / api / secret 后必跑 |
| `ecc:pr-test-analyzer` | 测试覆盖质量 | PR 评审 |

**vs build-resolver 的边界**：

```
编译错   → R1 build-resolver（⭐ 必有 stderr）
行为错   → R2 debugger / silent-failure-hunter（◐ 需复现）
设计错   → R2 code-reviewer / ecc:architect（◐ 评审场景）
安全错   → R2 security-reviewer（◐ 评审场景）
覆盖不足 → R2 pr-test-analyzer（◐ PR 评审场景）
```

---

### 资源 3 —— hook 运行时防线（⭐ 硬代码）

**是什么**：在 Claude Code 工具调用层设拦截点，PreToolUse 可**阻断危险动作**（删文件、写敏感路径、调危险命令）；PostToolUse 可**自动跑验证**（lint / format / resource-index 同步）。

**关键 hook**：

| Hook | 时机 | 作用 |
|------|------|------|
| `PreToolUse` | 工具调用前 | 拦截 `rm -rf` / 写 `/etc/` / 改 secrets / 改 git config |
| `PostToolUse` | 工具调用后 | 自动跑验证（lint / format / resource-index 同步） |
| `Stop` | 会话结束 | 跑 quality-gate / cost-tracker / session-summary |

**运行时控制**：

```bash
# 启用/禁用 profile
export ECC_HOOK_PROFILE=strict       # 全开
export ECC_HOOK_PROFILE=permissive   # 只阻断 critical
export ECC_HOOK_PROFILE=off          # 全关（debug 用）

# 细粒度禁用某个 hook
export ECC_DISABLED_HOOKS=pre:bash:gateguard-fact-force
```

**真实起作用**：用户试 `rm -rf /` 时被拦；写 `.env` 时被警告；写 `package-lock.json` 后自动跑 npm audit。

---

### 资源 4 —— orch-fix-defect 剧本（◐ 协议层组合调度）

**是什么**：把"修 bug"这件事拆成标准 6 步剧本，AI 读完 SKILL.md 自觉按剧本走（参见 [ECC-技能编排机制 v2.0](ECC-技能编排机制.md) § 3 方法 3）。

**位置**：`skills/orch-fix-defect/SKILL.md`

**Phase mask**：

```
0 → (2 light) → 4 → 5 → 6
```

| Phase | 动作 | 委托给 |
|-------|------|--------|
| 0 Intake | 重述 bug 现象 / 读报错输出 | `code-explorer` |
| 2 Plan (light) | 复现路径 + 修复方向 | `planner` |
| 4 Implement TDD | 复现 bug 为新失败测试 → 修到绿 | `tdd-guide` / `tdd-workflow` |
| 5 Review | multi-dim + 对抗验证 | `orch-review.workflow.js`（⭐ 真硬代码） |
| 6 Commit | `fix:` | commit |

**何时用**：跨文件 bug / 复杂 bug / 一次会话修不完的 bug。

**何时不用**：1-2 行能搞定的 typo / 错别字 / 漏 import（直接改 + 跑 test 即可）。

---

### 资源 5 —— 修复原则（◐ 跨 agent 共识）

**是什么**：所有"修"的 agent 共守的 4 条铁律，靠 SKILL.md / agent prompt 文本约束。

| # | 原则 | 违反后果 |
|---|------|----------|
| 1 | **不凭空猜 bug** | 没有 stderr / failed test 不动 |
| 2 | **minimal diff** | 顺手重构 = 引入新 bug |
| 3 | **架构改动交给 architect** | build-resolver 不动设计 |
| 4 | **修完要验证** | 没跑 test / build 不算修完 |

---

## 3. 5 类资源的关系与执行顺序

### 3.1 关系矩阵

| | R1 build-resolver | R2 语义 agent | R3 hook | R4 剧本 | R5 原则 |
|---|:---:|:---:|:---:|:---:|:---:|
| **层** | 段一 | 段二 | 段一 | 段二 | 段二 |
| **形式** | agent | agent | JSON + Node | SKILL.md | 协议 |
| **真起作用** | ⭐ | ◐ | ⭐ | ◐ | ◐ |
| **触发条件** | 必须有 stderr | 评审 / 怀疑场景 | 工具调用时 | 跨文件复杂 bug | 任何"修"动作 |
| **不该做什么** | 架构改动 | 编译错修复 | 业务逻辑 | 1-2 行小修 | 任意跳过 |

### 3.2 执行顺序（典型修 bug 路径）

```
[用户报告: "跑 npm test 报 TypeError"]
       │
       ▼  R5 原则: 不凭空猜 —— 必须先有 stderr
[用户贴 npm test stderr]
       │
       ▼  R1 ⭐ 硬代码
① build-error-resolver agent
   → 定位 TypeError 出处
   → 最小 diff 修
       │
       ▼  R5 原则: 修完要验证
[跑 npm test] → green
       │
       ▼  R2 ◐ 语义层（可选）
② silent-failure-hunter 复查
   → 是否有吞掉的 promise rejection
       │
       ▼  R3 ⭐ 硬代码
③ PreToolUse hook 拦截
   → 阻止下次同类错再次发生（写 linter rule / eslint config）
       │
       ▼  R4 ◐ 剧本（如跨文件则升级）
④ orch-fix-defect 端到端
   → Phase 5 Review（orch-review.workflow.js）
       │
       ▼  R5 原则
[commit: fix: ...]
```

**关键点**：

- **R5 是入口**：任何"修"动作先过原则门（必须有信号）
- **R1 是必经路径**：编译错必走 build-resolver，不绕
- **R3 是运行时拦截**：与 R1/R2/R4 并行存在，每次工具调用都过
- **R4 是升级路径**：单点修不完 → 升级到端到端剧本
- **R2 是兜底复查**：R1 修完不放心时再调

---

## 4. 验证清单

| # | 资源 | 验证证据 | 真起作用范围 |
|---|---|---|---|
| 1 | 11 个 build-resolver | 各 agent schema 强制 minimal diff；任务说明禁止架构改动 | ⭐ 各语言栈编译错 |
| 2 | silent-failure-hunter / debugger / code-reviewer / security-reviewer / pr-test-analyzer | 5 个 agent 文件存在且 schema 合规 | ◐ 评审 + 吞错 + 行为错 |
| 3 | PreToolUse / PostToolUse / Stop hook | `ECC_HOOK_PROFILE=strict` 下 `rm -rf` 被拦；PostToolUse 自动跑验证 | ⭐ 运行时 |
| 4 | `skills/orch-fix-defect/SKILL.md` | 6 步 phase mask + first move 明确 | ◐ 跨文件 bug |
| 5 | 4 条修复原则 | 各 agent prompt / SKILL.md 内含"不凭空猜 / minimal diff / 架构改动交 architect / 修完要验证"明文 | ◐ 跨 agent 共识 |

---

## 5. 与其他机制的关系

| 机制 | 关系 |
|---|---|
| **ECC 技能编排机制**（v2.0） | R4 用编排机制定义 phase；R1 / R2 是 Phase 4 (TDD) 与 Phase 5 (Review) 的输入 |
| **ECC 技能选择机制**（v1.2） | 互补：选择机制决定"调哪个 build-resolver"，本机制决定"调完按什么流程修" |
| **Hook 体系**（与本机制 R3 重叠） | R3 是 hook 的子集；hook 还管质量门禁 / cost 跟踪 / resource index 同步 |
| **orch-review.workflow.js**（⭐ 真硬代码） | R4 Phase 5 走它，是 fail-closed 的最后一道闸 |
| **self-improver agent** | 修完的 bug 走 self-improvement skill 写进 `.learnings/`，下次同类 bug 不再发生 |
| **scripts/release-approval-gate.js** | ❌ 命名撞车，**不是**修复 gate，是 release 流程 gate |

---

## 6. 常见反模式

| ❌ 不要做 | 为什么 |
|---------|--------|
| ❌ 没贴 stderr 就让 agent 修 | 没有信号 = 凭空猜 = 错改 |
| ❌ build-resolver 顺手重构 | 越权 = 引入新 bug |
| ❌ 改完不跑 test | 不知道有没有修对 |
| ❌ 跳过 silent-failure-hunter | 漏掉吞错的 promise rejection |
| ❌ 用 build-resolver 修运行时逻辑 bug | 它只修编译错；逻辑错走 debugger |
| ❌ 1-2 行 typo 走 orch-fix-defect | 杀鸡用牛刀 |
| ❌ 关掉 PreToolUse hook | 危险动作失去拦截 |
| ❌ 修完不写 `.learnings/` | 同类 bug 下次还会复发 |
| ❌ 期待 silent-failure-hunter 也能修编译错 | 它专找吞错，不修编译 |
| ❌ 跨文件 bug 不升级到 orch-fix-defect | 改了一半就 commit，留半截 |

---

## 7. 下一步建议

1. **统一 build-resolver 接口**：写 `scripts/err-resolver-router.js`，根据 stderr 自动路由到对应 build-resolver agent。
2. **silent-failure-hunter 升级为 CI 步骤**：每次 PR 自动跑，找吞错。
3. **PreToolUse hook 加 `.learnings/` 写入拦截**：让危险动作的学习变成机器行为。
4. **写 `scripts/verify-error-fix.js`**：自动扫所有"修"过的 commit，验证修复 diff 是否 minimal。
5. **错误类型知识库**：建 `Agent-Skill-错误类型决策知识库.md`，把"build 错 / 行为错 / 设计错 / 安全错"判定流程沉淀下来。

---

## 8. 讲给小朋友听：你生病了怎么办（5 类资源）

你是小朋友，今天肚子疼。

**问题**：不知道是吃坏了还是着凉了。

---

### 资源 5 —— 先听妈妈说（原则）

妈妈说过：

> "肚子疼先告诉妈妈哪里疼，不能自己乱吃药。"

**这就是「不凭空猜 bug」** —— 必须先有具体信号（哪里疼）才能治。

---

### 资源 1 —— 找对应的医生（11 个 build-resolver）

医生分科：

| 你哪里 | 找谁 |
|--------|------|
| 牙疼 | 牙医 |
| 眼睛 | 眼科 |
| 肚子 | 内科 |

**build-resolver 就是各科医生** —— 编译器报错找编译器医生，Python 报找 Python 医生。

---

### 资源 2 —— 不只看医生，还要看护士（语义层 agent）

医生说"没事"，但妈妈还会问：

> "你确定没事吗？会不会是别的地方不舒服？"

**silent-failure-hunter 就是那位妈妈** —— 找医生没看出来的"闷声疼"。

---

### 资源 3 —— 妈妈设的规矩（hook 防线）

妈妈说：

> "不能吃没洗的水果。"
> "不能跟陌生人走。"

**PreToolUse hook 就是妈妈设的规矩** —— 危险动作直接拦下。

---

### 资源 4 —— 重病去大医院（orch-fix-defect）

普通感冒：在家吃药就好。
重病：去大医院，按"挂号 → 检查 → 治疗 → 复查 → 出院"5 步走。

**orch-fix-defect 就是大医院流程** —— 跨文件复杂 bug 按 6 步走完才出院。

---

## 🎒 加起来，是这么回事

```
① 资源 5 —— 先告诉你哪疼（信号）
② 资源 1 —— 找对应的医生（build-resolver）
③ 资源 2 —— 妈妈再问一遍（silent-failure-hunter）
③ 资源 3 —— 妈妈规矩拦危险动作（hook）
⑤ 资源 4 —— 重病去大医院 6 步走（orch-fix-defect）
```

- **每个孩子都不一样** —— 每种 bug 都得先说信号
- **找对医生** —— 错找医生越治越坏
- **妈妈复查** —— 医生也可能漏诊
- **规矩拦危险** —— 有些事根本不能做
- **重病有流程** —— 不是所有病都吃一片药就好

**这就是 ECC 干的事：bug 各式各样，但你按 5 步走，就能修对。** 💊

> 🌟 一句话记住：**"先有信号，找对医生，妈妈复查，规矩拦截，重病走流程。"**

---

## 9. 与编排机制 / 选择机制的对比

> 三姊妹篇，便于对照阅读。

| 维度 | 错误定位修复（本文件） | 编排 v2.0 | 选择 v1.2 |
|---|---|---|---|
| **关注点** | bug 怎么修 | skill 怎么按顺序跑 | skill 怎么挑 |
| **关键文件** | 11 个 build-resolver + hook 配置 + `orch-fix-defect` | `orch-pipeline` SKILL.md + 5 剧本 + `orch-review.workflow.js` | `scripts/catalog.js` + `scripts/consult.js` |
| **算法** | 信号→定位→修→验→拦 | DAG + 阶段门控 | fuzzy + ML-context + preferred bonus |
| **硬代码占比** | 40%（⭐ 必有） | 15%（⭐ 仅 Phase 5） | 50%（⭐ 段一两方法） |
| **失败模式** | 越界（修架构 / 凭空猜） | 阶段乱序 / 契约违反 | 选错 skill 进 context |
| **恢复方式** | git revert + 重写 stderr | 回退到上一步 | 重打分 |
| **比喻** | 生病找医生 | 写作文 5 步 | 早上准备上学 |

**三者关系**：

- **时序**：先"选"（选择）→ 再"修"（错误定位修复）或"编"（编排）→ 最后"干"（执行）
- **依赖**：错误定位修复可独立运行；编排机制可调度错误定位资源；选择机制按 stderr 内容选 build-resolver

---

**本报告仅供参考，不构成错误处理流程变更建议。** 任何对修复流程的修改都应先在 sandbox 跑通再灰度上线。