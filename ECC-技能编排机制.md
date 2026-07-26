# ECC 技能编排机制 —— Orchestration（官方 + 通俗双层）

> 版本：v1.0  ·  日期：2026-07-25  ·  适用范围：ECC-main 全量技能体系
> 配套文档：[ECC-技能选择机制-渐进式加载.md](ECC-技能选择机制-渐进式加载.md)
> 结构约定：与"渐进式加载"文档严格对齐 —— 第 0~9 节是完整**官方版**，第 10 节是**小学生版**。

---

## 0. 一句话定义

**编排机制（Orchestration）通过 `skills/orch-pipeline/SKILL.md` 这个共享引擎，将一组 skill 串成一个有依赖关系的 6 阶段流水线（Research → Plan → Design → TDD → Review → Commit），并按任务规模分类器（trivial / small / standard / large）选择阶段子集执行，保证 skill 间协调（coordination）、质量门控（stage gates）、结果可复现（reproducibility）。**

---

## 1. 为什么需要编排

| 问题 | 现象 | 后果 |
|------|------|------|
| Skill 数量爆炸 | 单任务可能调用 5+ skill | 没顺序就一拥而上，谁也不等谁 |
| 任务规模差异巨大 | trivial 改 1 行 vs large 改整个项目 | 必须按规模分档，否则小活也走大流程 |
| 错误检测滞后 | 写完代码才发现设计错 | 返工成本指数级上升 |
| 结果不可复现 | 同样输入产出不同 | 难以做 review / CI / 回滚 |
| 阶段契约模糊 | skill A 给啥 skill B 没说清 | 接口处出错，下游雪崩 |

**核心约束**：每个阶段的输出必须作为下一个阶段的输入契约（contract），否则流水线断裂。

---

## 2. 整体架构 —— 两层编排

```
┌──────────────────────────────────────────────────────────────┐
│  L1：operation skills（5 个入口，决定"是哪种操作"）          │
│    orch-add-feature  orch-change-feature  orch-fix-defect    │
│    orch-refine-code  orch-build-mvp                         │
│    → 都是 thin wrapper，不重新实现工作，只分类 + 委托        │
├──────────────────────────────────────────────────────────────┤
│  L2：orch-pipeline（共享引擎，决定"按什么顺序执行"）        │
│    Step 0: classify-size                                    │
│    Step 1: research        (gated by tier ≥ standard)        │
│    Step 2: plan            (gated by tier ≥ small)           │
│    Step 3: design          (gated by tier == large)          │
│    Step 4: tdd             (always)                          │
│    Step 5: review          (always)                          │
│    Step 6: commit          (always)                          │
└──────────────────────────────────────────────────────────────┘
```

**L1** 决定"做哪种操作"；**L2** 决定"按什么步骤执行"。两者解耦，新增 operation 不需要改 pipeline。

---

## 3. orch-pipeline 的 6 阶段详解

### Step 0 — classify-size（规模分类器）

| 项 | 内容 |
|---|---|
| 位置 | `orch-pipeline/SKILL.md` 第 39-50 行 |
| 输入 | 用户原始请求 |
| 输出 | `tier ∈ {trivial, small, standard, large}` |
| 算法 | 三信号取最高档：① 文件改动数 ② 新依赖/契约 ③ 设计歧义 |
| 契约 | 必须返回 tier，否则后续阶段无法门控 |

🧒 翻译：先量量看这次是大活还是小活，量完才能决定走几步。

### Step 1 — research（调研）

| 项 | 内容 |
|---|---|
| 触发 | `tier ≥ standard` |
| 输入 | tier |
| 输出 | `context.md`（包含 code-explorer / research 类 agent 的调研结论） |
| 委托 | `agent: code-explorer`、`agent: explore` |
| 跳过代价 | standard/large 不调研 → plan 阶段信息不足，方案凭想象 |

🧒 翻译：standard 以上才查资料，小活可以省。

### Step 2 — plan（计划）

| 项 | 内容 |
|---|---|
| 触发 | `tier ≥ small` |
| 输入 | `context.md`（如存在）|
| 输出 | `plan.md`（实现步骤 + 文件改动清单 + 测试策略）|
| 委托 | `agent: planner`、`agent: code-architect` |
| 契约 | plan.md 必须是 markdown，下游 tdd 阶段消费它 |

🧒 翻译：列提纲，告诉后面的人"先做啥再做啥"。

### Step 3 — design（设计）

| 项 | 内容 |
|---|---|
| 触发 | `tier == large` |
| 输入 | `plan.md` |
| 输出 | `design.md`（架构图 + 接口契约 + 数据流）|
| 委托 | `agent: code-architect` |
| 跳过代价 | large 跳过 design → 实现阶段返工 |

🧒 翻译：大活才画图纸，小活不用。

### Step 4 — tdd（测试驱动开发）

| 项 | 内容 |
|---|---|
| 触发 | 必跑 |
| 输入 | `plan.md` 和/或 `design.md` |
| 输出 | `code + tests`（先写测试，再写实现，让测试从红变绿）|
| 委托 | `agent: tdd-guide` + 各类 reviewer（python-reviewer / react-reviewer / ...）|
| 契约 | code 与 tests 必须同步提交，缺一不可 |

🧒 翻译：先写"考题"（测试），再写"答案"（代码），答案要能让考题通过。

### Step 5 — review（审查）

| 项 | 内容 |
|---|---|
| 触发 | 必跑 |
| 输入 | `code + tests` |
| 输出 | `review-report`（PASS / FAIL + 建议）|
| 委托 | `agent: code-reviewer` + 专项 reviewer |
| 失败行为 | FAIL 时**阻断 commit**，必须回到 Step 4 修复 |

🧒 翻译：老师检查作业，不通过就打回重写。

### Step 6 — commit（提交）

| 项 | 内容 |
|---|---|
| 触发 | 必跑，且 review-report == PASS |
| 输入 | `review-report` |
| 输出 | `commit-sha`（git 提交 hash）|
| 委托 | `agent: refactor-cleaner`（清理）、`script: post-edit-manifest.js`（更新清单）|
| 契约 | 必须返回 commit-sha，否则任务未结束 |

🧒 翻译：作业合格 → 抄到本子上 → 交给老师 → 拿到回执。

---

## 4. 5 个 operation skill 速查表

| Skill | 操作 | 触发时机 | 典型 tier | 跑的阶段 |
|---|---|---|---|---|
| `orch-add-feature` | feature | 还没这功能 | standard / large | 1 → 2 → 4 → 5 → 6 |
| `orch-change-feature` | tweak | 有了，但行为不对 | small / standard | (1 轻) → 2 → 4 → 5 → 6 |
| `orch-fix-defect` | fix | 坏了 | small | (1 轻) → 2 → 4 → 5 → 6 |
| `orch-refine-code` | refactor | 行为不变，结构变好 | small / standard | 4 → 5 → 6 |
| `orch-build-mvp` | mvp | 从设计稿搭 | large | 1 → 2 → 3 → 4 → 5 → 6 |

> 5 个 operation 都是 thin wrapper：**只分类 + 委托**，不重新实现工作。

---

## 5. 6 步的执行顺序（典型一次任务）

### 5.1 standard 任务的典型路径

```
用户说："给我加一个新功能 X"
   ↓
L1: orch-add-feature 接到任务
   ↓
L2: orch-pipeline 启动
   ↓
Step 0: classify-size  →  tier = standard
   ↓
Step 1: research       →  agent: code-explorer → context.md
   ↓
Step 2: plan           →  agent: planner → plan.md
   ↓
Step 3: design         →  跳过（standard 不触发）
   ↓
Step 4: tdd            →  agent: tdd-guide → code + tests
   ↓
Step 5: review         →  agent: code-reviewer → review-report
   ↓                           ├─ PASS → 继续
   ↓                           └─ FAIL → 回到 Step 4
   ↓
Step 6: commit         →  agent: refactor-cleaner → commit-sha
```

### 5.2 不同 tier 跑的阶段对照

```
                trivial  small  standard  large
classify-size     ●       ●       ●        ●
research                   轻      ●        ●
plan                     轻      ●        ●
design                                      ●
tdd             ●       ●       ●        ●
review          ●       ●       ●        ●
commit          ●       ●       ●        ●
合计步数          3       4       5        6
```

---

## 6. 验证清单（已完成 ✅ / 待补 ⚠️）

| 项 | 状态 |
|---|---|
| `skills/orch-pipeline/SKILL.md` 实现 6 阶段定义 | ✅ 已实现 |
| 5 个 operation skill（orch-add/change/fix/refine/build-mvp）| ✅ 已实现 |
| 阶段契约（input/output）有明确定义 | ⚠️ 需逐个 review |
| size classifier 三信号（files / deps / ambiguity）| ✅ 已实现 |
| Stage gates 真的阻断（review FAIL → 不 commit）| ⚠️ 需跑通回归测试 |
| 与"自动选择"机制对接（编排前先选 skill）| ⚠️ 文档未明说，需补 |

---

## 7. 与其他机制的关系

| 机制 | 关系 |
|---|---|
| **自动选择**（catalog / consult） | 编排**之前**先选 skill；编排**期间**决定怎么用它们 |
| **匹配算法**（fuzzy + ML context） | 自动选择的子模块，被编排间接消费 |
| **Agent-Skill 映射**（`agents/skill-mappings.json`） | 编排的 Step 4/5 委托 agents 时用这张表 |
| **Hooks**（PostToolUse / Stop） | 编排的 Stage gate 在 hook 层有镜像实现 |
| **ECC 5 层抽象**（L1~L5） | 编排横跨 L2（orch skills）和 L3（agents）|
| **ECC 编排 × 执行矩阵**（3×3=9） | 本机制属于其中"skill 编排 / 协调"那一维 |

---

## 8. 常见反模式（不要做的事）

| 反模式 | 为什么坏 |
|---|---|
| ❌ 跳过 plan 直接进 tdd | standard/large 没有 plan → 实现凭感觉 |
| ❌ 跳过 review 直接 commit | bug 一路带进 main 分支 |
| ❌ 5 个 skill 并行启动，不分阶段 | 阶段间契约被破坏，结果混乱 |
| ❌ 对 trivial 任务也跑完 6 步 | 浪费 5 个 turn 改 1 行代码 |
| ❌ 让 operation skill 自己实现工作 | 违反"thin wrapper"原则，新增操作要改 pipeline |
| ❌ stage gate 不阻断，review FAIL 还能 commit | 门控形同虚设 |

---

## 9. 下一步建议

1. **契约形式化**：把 6 个阶段的 input/output 写成 JSON Schema，放在 `contracts/` 目录，运行时校验。
2. **Stage gate 实测**：写一个 `scripts/test-stage-gates.js`，故意让 review FAIL，验证 commit 真的被阻断。
3. **打通选择 ↔ 编排**：在 orch-pipeline 的 Step 2（plan）阶段调用 `consult.js` 做一次"实施前的最后选型"。
4. **提升为 skill**：把"5 个 operation skill 的触发判断"打包成一个 `ecc:orch-decide` skill，挂在 SOP 上。

---

## 10. 小学生版：写作文 5 步

> **目标读者**：没听过"pipeline"、"contract"、"stage gate"的小朋友（也送给刚加入 ECC 的同事）。

### 📒 一个真实场景：写作文

老师布置：**"写一篇《我的妈妈》，不少于 500 字"**

你不是一口气写完的。你得按顺序来 5 步：

```
第 1 步：查资料    → 想想妈妈做过啥（做饭、送我上学、生病照顾我...）
第 2 步：列提纲    → 决定先写啥再写啥（开头 / 中间 3 件事 / 结尾）
第 3 步：写        → 按提纲写出来
第 4 步：检查      → 看看有没有错别字、病句
第 5 步：誊抄      → 抄到稿纸上交
```

这 5 步就是**编排**。

### 📖 编排机制长啥样？

**= 一组 skill 按固定顺序串起来干活。**

在 ECC 里就是 5 个 skill 排队：

```
第 1 个：调研 skill      → 查资料
第 2 个：计划 skill      → 列提纲
第 3 个：实现 skill      → 写
第 4 个：检查 skill      → 查错
第 5 个：提交 skill      → 交稿
```

每个 skill 干自己的活，**干完把结果喂给下一个**。

### ❓ 为啥要固定顺序？—— 因为下一步靠上一步

| 上一步产出 | 下一步拿来干啥 |
|---|---|
| 查资料的结果 | 给列提纲用 |
| 提纲 | 给"写"用 |
| 写出来的稿子 | 给"检查"用 |
| 检查过的稿子 | 给"誊抄"用 |

**顺序乱了就出事**：

| 如果顺序乱了 | 出啥事 |
|---|---|
| ❌ 没查资料就写 | 写出来没内容，写 3 行就卡住 |
| ❌ 没列提纲就写 | 写到一半不知道写啥 |
| ❌ 没检查就交 | 错字满天飞，被扣分 |
| ❌ 没誊抄就完事 | 老师根本收不到，等于没写 |

跟做蛋糕一样：先打蛋 → 加面粉 → 烤 → 装盘，**不能反过来**。

### 🎯 编排有 3 件大事

| 作用 | 解释 | 不编排会怎样 |
|---|---|---|
| 🕐 **省时间** | 不返工 | 写完了发现跑题，推倒重来 |
| 🎯 **少出错** | 早发现 | 错别字一路带到最后才看见 |
| 📋 **不乱套** | 顺序固定，谁干都一样 | 5 个 skill 一拥而上，谁都不知道先干啥 |

### 🎬 5 种"写作文任务"对应 5 个 orch-*

| 真实场景 | 对应 skill |
|---|---|
| 老师布置新作文 | `orch-add-feature`（新增） |
| 老师说这篇要改改 | `orch-change-feature`（改） |
| 老师说这篇错字多 | `orch-fix-defect`（修） |
| 老师说重写一遍但意思不变 | `orch-refine-code`（重构） |
| 老师说从头写一篇新的 | `orch-build-mvp`（从 0 搭）|

### 🎒 不同大小的作文，走几步不一样

| 作文大小 | 走几步 | 走哪些 |
|---|:-:|---|
| 简单（改 1 行） | **3 步** | 写 → 检查 → 交 |
| 较小（改 1 个段落） | **4 步** | 简单查资料 → 写 → 检查 → 交 |
| 普通（写 500 字） | **5 步** | 查资料 → 列提纲 → 写 → 检查 → 交 |
| 大（写 2000 字） | **6 步** | 查资料 → 列提纲 → 设计 → 写 → 检查 → 交 |

### 🧒 给小朋友的两条铁律

1. **不能跳**（列提纲前不能直接写）
2. **不能乱**（先检查再交，不能反过来）

做到这两条，ECC 这个"超级写作助手"就能又快又好地帮你干活。📝

### 🌟 一句话记住

> **编排 = 让一组 skill 按固定顺序干活。**
> **为啥要固定？** 下一步要吃上一步的饭。
> **有啥用？** 省时间、少出错、不乱套。
> **跟"自动选择"的关系：** 先"选" 1 个对的 skill，再"编"起来一组 skill 一起干活。

---

## 11. 与"自动选择"的对比关系

> 姊妹篇：[ECC-技能选择机制-渐进式加载.md](ECC-技能选择机制-渐进式加载.md)
> 这份对比表在两份文档里**完全一致**，便于对照阅读。

📖 **官方对比**

| 维度 | 自动选择 (Selection) | 编排 (Orchestration) |
|---|---|---|
| **关注点** | 候选 skill 的 ranking | skill 间的 coordination |
| **关键文件** | `scripts/catalog.js`、`scripts/consult.js` | `skills/orch-pipeline/SKILL.md`、`skills/orch-*/SKILL.md` |
| **算法** | fuzzy + ML-context + preferred bonus | DAG 执行 + 阶段门控 (stage gates) |
| **契约** | top-N candidates | stage input/output contract |
| **数量** | 7 种办法 | 6 阶段 pipeline |
| **失败模式** | 选错的 skill 进 context | 阶段乱序 / 契约违反 |
| **恢复方式** | 重打分 (re-score) | 回退到上一步 (rollback) |
| **比喻** | 早上准备上学（挑 5 样进书包） | 写作文 5 步（按顺序写）|

🧒 **小朋友懂**

| | 自动选择 | 编排 |
|---|---|---|
| 干啥 | 挑 1 个对的 | 让几个按顺序干 |
| 比喻 | 早上准备上学 | 写作文 5 步 |
| 出问题 | 挑错了 | 顺序乱了 |
| 怎么办 | 重挑 | 退回上一步 |

**两者的关系**：

- **时序**：先"选"（自动选择）→ 再"编"（编排）→ 最后"干"（执行）
- **依赖**：编排依赖自动选择的输出（已选定的 skill 才能编排）
- **协同**：自动选择决定"用谁"，编排决定"怎么用"
- **数据流**：自动选择产出 1 个胜出的 skill → 编排把它放进 Step 4 (tdd) 或其他阶段的输入

---

**本报告仅供参考，不构成架构变更建议。** 任何对编排流程的修改都应先在 sandbox 跑通再灰度上线。