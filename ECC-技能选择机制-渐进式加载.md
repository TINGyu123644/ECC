# ECC 技能选择机制 —— 渐进式加载（Progressive Loading）

> 版本：v1.0  ·  日期：2026-07-25  ·  适用范围：ECC-main 全量技能体系

---

## 0. 一句话定义

**ECC 的"技能选择"不是一个匹配算法，而是两段流水线：先用脚本层把候选从 N 收敛到 ≤5，再用 SKILL.md 内部结构把每个候选的正文继续下钻，按需取用。**

目标：在 skills 数量爆炸（当前上百个、还在持续增长）的背景下，保证 context window 不被一次性撑爆。

---

## 1. 为什么需要这套机制

| 问题 | 现象 | 后果 |
|------|------|------|
| Skills 数量爆炸 | 当前 ECC 收录 ≥100 个 SKILL.md | 全部加载 ≈ 数万 token |
| Context 上限 | 单轮对话 context 有限 | 超出即截断、丢早期信号 |
| 误匹配成本 | 错的 skill 进了 context | 后续步骤都被污染 |
| Skills 还在涨 | 持续新增 | 必须有可扩展的加载协议 |

**核心约束：能不读就不读，要读就读最近的那一块。**

---

## 2. 整体架构 —— 两段流水线

```
┌─────────────────────────────────────────────────────────────────┐
│  段一：脚本层（catalog / consult）─── 候选收敛                      │
│  目标：把"全部候选"压成"≤5 条 Top-N"                               │
│  工具：scripts/catalog.js, scripts/consult.js                     │
├─────────────────────────────────────────────────────────────────┤
│  段二：技能层（SKILL.md 内部结构）─── 上下文收敛                    │
│  目标：把单个 SKILL.md 的正文也按需分块                             │
│  工具：每个 SKILL.md 自己约定的 frontmatter / phase / scope        │
└─────────────────────────────────────────────────────────────────┘
```

**段一层**解决"选哪几个 skill"，**段二层**解决"选中的 skill 怎么按段读"。

---

## 3. 七种渐进式加载方法

### ▌段一：脚本层 —— 候选收敛（2 种）

#### 方法 1：三级下钻（Three-Level Drill-down）

- **位置**：`scripts/catalog.js`
- **结构**：`profiles → components → modules`
- **做法**：
  - 第一级 `listInstallProfiles()`：按"语言 / 框架 / 能力 / agent"四大家族返回粗粒度 profile
  - 第二级 `listInstallComponents(profileId)`：在 profile 内列出可安装的 component 集合
  - 第三级 `getInstallComponent(componentId)`：拉取该 component 的具体 module 清单
- **渐进方向**：粗定位 → 中粒度 → 细粒度
- **何时用**：用户最初没有任何线索，需要先帮他缩小范围

#### 方法 2：Top-N 限流（Top-N Throttling）

- **位置**：`scripts/consult.js`
- **关键参数**：`DEFAULT_LIMIT = 5`（第 12 行），`MAX_LIMIT = 20`
- **做法**：
  - 全部候选经过 fuzzy + machine-learning-context 加权排序
  - 默认只返回前 5 条；用户显式传 `--limit N` 时上限 20
  - 配合 `FUZZY_EXCLUDED_TOKENS`、`MACHINE_LEARNING_CONTEXT_TOKENS` 等黑/白名单
- **渐进方向**：全部候选 → 默认 5 条
- **何时用**：候选已经收敛到一个域，但还嫌太多

---

### ▌段二：技能层 —— 上下文收敛（5 种）

#### 方法 3：多轮窄化（Multi-Round Narrowing）

- **位置**：`skills/team-builder/SKILL.md`
- **流程**：`域 → 名字 → 数量 ≤ 5`
  - 第一轮：确定领域（如 "frontend"）
  - 第二轮：在领域内确定具体 skill 名
  - 第三轮：再压到 ≤5 条
- **渐进方向**：先分类，再点名，再限额
- **何时用**：用户输入模糊（如"帮我搭个前端"），需要多轮澄清

#### 方法 4：二级分桶（Two-Level Bucketing）

- **位置**：`skills/agent-sort/SKILL.md`
- **桶设计**：
  - `DAILY 必加载`：高频、几乎每个任务都要用到的基础 skill（如 code-review、test-coverage）
  - `LIBRARY 按需`：低频、专门场景才用的 skill（如特定语言的 build resolver）
- **渐进方向**：hot/cold 分离，必加载的永远在场，按需的查表再调
- **何时用**：区分"基础设施"和"工具库"，避免每次都重新检索

#### 方法 5：Phase Mask（阶段遮罩）

- **位置**：`skills/orch-pipeline/SKILL.md`
- **遮罩规则**：
  - **trivial 任务**：只暴露 3 步（detect → apply → verify）
  - **large 任务**：暴露完整 6 步（detect → analyze → plan → apply → verify → report）
- **渐进方向**：trivial 走捷径，large 才走完整流程
- **何时用**：任务的复杂度差异巨大，需要按规模动态调整流程深度

#### 方法 6：Scope 下钻（Scope Drill-down）

- **位置**：`skills/plan-orchestrate/SKILL.md`
- **下钻语法**：
  - 默认：返回 overview（整个计划的鸟瞰）
  - `step:n`：跳到第 n 步的细节
  - `step:n..m`：跳到 n 到 m 步的区间细节
- **渐进方向**：鸟瞰 → 单步细节 → 区间细节
- **何时用**：用户已经看过 overview，想深挖某一段

#### 方法 7：Description 过滤（Frontmatter-First Reading）

- **位置**：所有 `skills/**/SKILL.md` 的 YAML frontmatter
- **读取顺序**：
  1. **先读 frontmatter**（`name` / `description` / `metadata`）—— 极小、命中即决定是否要读全文
  2. **决定要读后再展开正文** —— 把整个 SKILL.md 的正文按需加载
- **渐进方向**：metadata 先，全文后
- **何时用**：任何 SKILL.md 都必须遵守的"零成本首读"

---

## 4. 方法对照速查表

| # | 方法 | 文件 | 渐进方向 | 段位 |
|---|------|------|---------|------|
| 1 | 三级下钻 | `scripts/catalog.js` | profiles → components → modules | 脚本层 |
| 2 | Top-N 限流 | `scripts/consult.js:12` | 全部候选 → 默认 5 条 | 脚本层 |
| 3 | 多轮窄化 | `skills/team-builder/SKILL.md` | 域 → 名字 → 数量 ≤ 5 | 技能层 |
| 4 | 二级分桶 | `skills/agent-sort/SKILL.md` | DAILY 必加载 / LIBRARY 按需 | 技能层 |
| 5 | Phase Mask | `skills/orch-pipeline/SKILL.md` | trivial 3 步 / large 6 步 | 技能层 |
| 6 | Scope 下钻 | `skills/plan-orchestrate/SKILL.md` | overview → step:n / range | 技能层 |
| 7 | Description 过滤 | 全部 `SKILL.md` frontmatter | metadata 先, 全文后 | 技能层 |

---

## 5. 7 种方法的执行顺序（典型一次技能调度）

```
[用户输入]
   │
   ▼
①  方法 1（三级下钻）   ─→  定位到某个 profile / component
   │
   ▼
②  方法 2（Top-N 限流）  ─→  候选收敛到 ≤5 条
   │
   ▼
③  方法 7（Description）  ─→  先读 frontmatter，决定哪些真的需要展开正文
   │
   ▼
④  方法 4（二级分桶）    ─→  命中的是 DAILY 直接加载；LIBRARY 按需再调
   │
   ▼
⑤  方法 3（多轮窄化）    ─→  若用户表述模糊，进入多轮澄清
   │
   ▼
⑥  方法 5（Phase Mask）  ─→  根据任务规模决定流程深度（3 步 vs 6 步）
   │
   ▼
⑦  方法 6（Scope 下钻）   ─→  任务执行过程中，按 step:n 钻取局部细节
```

---

## 6. 验证清单（已完成 ✅ / 待补 ⚠️）

| 项 | 状态 |
|----|------|
| `scripts/catalog.js` 实现三级下钻 | ✅ 已实现 |
| `scripts/consult.js` 实现 Top-N 限流（DEFAULT_LIMIT=5） | ✅ 已实现 |
| `skills/team-builder/SKILL.md` 实现多轮窄化 | ⚠️ 需打开 frontmatter 验证 |
| `skills/agent-sort/SKILL.md` 实现二级分桶 | ⚠️ 需打开 frontmatter 验证 |
| `skills/orch-pipeline/SKILL.md` 实现 Phase Mask | ⚠️ 需打开 SKILL 正文验证 |
| `skills/plan-orchestrate/SKILL.md` 实现 Scope 下钻 | ⚠️ 需打开 SKILL 正文验证 |
| 全部 SKILL.md 遵守 frontmatter-first | ⚠️ 需扫描全部 SKILL.md 统计 |

---

## 7. 与其他机制的关系

| 机制 | 关系 |
|------|------|
| **匹配算法**（fuzzy / 上下文加权） | 决定"哪些候选入选" —— 在本机制的"段一"内部使用 |
| **ECC 编排 × 执行矩阵**（3×3 = 9） | 本机制属于其中"技能选择 / 调度"那一维 |
| **ECC 5 层抽象**（L1~L5） | 本机制横跨 L3（orch skill）和 L4（workflow script），主要是 L3 |
| **Agent-Skill 映射**（`agents/skill-mappings.json`） | 互补：映射表决定"哪个 agent 该挂哪些 skill"，本机制决定"挂上了之后怎么按需加载" |

---

## 8. 常见反模式（不要做的事）

| 反模式 | 为什么坏 |
|--------|---------|
| ❌ 一次性把所有 SKILL.md 全文塞进 context | 撑爆 context，丢早期信号 |
| ❌ 不读 frontmatter 就展开正文 | 浪费 token，命中率低 |
| ❌ 用 fuzzy 排序后还把全部候选都返回 | 绕过了 Top-N 限流的初衷 |
| ❌ 对 trivial 任务也走完整 6 步流程 | 浪费 turn，效率低 |
| ❌ 把 DAILY 和 LIBRARY 混在一起平铺 | 失去 hot/cold 分离的意义 |

---

## 9. 下一步建议

1. **验证脚本**：写一个 `scripts/verify-skill-loading.js`，自动扫描所有 SKILL.md，统计 frontmatter-first / phase mask / scope drilldown 三条约定的覆盖率。
2. **提升为 skill**：把这套机制打包成一个 `ecc:skill-load-strategy` skill，挂在"创建新 SKILL.md"的 SOP 上强制遵循。
3. **对照 SOP**：把今天整理的 `sop-updated.md` 的"添加 Skill-Agent 标准"章节对齐到本机制的 7 种方法，让 SOP 有据可依。

---

## 10. 讲给小朋友听：早上怎么准备上学

你是小朋友。今天早上要去上学。

**问题**：家里有 100 多样东西（书、笔、衣服、吃的、玩具……），但你的小书包只能装 **5 样**。

**怎么挑呢？**

妈妈很聪明，她用了 **7 个办法** 👇

---

### 办法 1 —— 一层一层往下找

不要一上来就在 100 多样东西里乱翻。

妈妈先问你要啥大类的：

> 你说：**"我要书"**。

好，书有 30 本。再问：

> 你说：**"数学"**。

数学只有 3 本了。

就这么一层一层缩：**100 多 → 30 → 3**。不乱翻。

---

### 办法 2 —— 书包最多 5 个（铁规矩）

不管前面找到几个，**小书包永远最多只装 5 个**。

今天数学就 3 本，全装得下。

要是哪天你要装 30 本呢？**那也只装 5 个**——挑最重要的 5 个，剩下的放回去。

---

### 办法 3 —— 你不知道要啥？那就问

有时候你自己也说不清要带啥。妈妈就**慢慢问**：

```
问 1："今天上啥课？"   →  "数学和语文"
问 2："上新的还是复习？" → "复习"
问 3："卷子要不要？"   → "要"
```

**问一次，东西就少一半**。问到最后，就剩几个了。

---

### 办法 4 —— 把东西分两堆放

你平时就把所有东西分两堆：

| **桌上**（每天都要用） | **柜子里**（不常用） |
|---|---|
| 铅笔 ✏️ | 彩色笔 🖍️ |
| 橡皮 | 剪刀 ✂️ |
| 口罩 | 彩纸 |
| 水壶 | 贴纸 |

今天要带的铅笔，本来就在桌上，**直接拿**，不用去柜子里翻。

---

### 办法 5 —— 事大就多带，事小就少带

今天作业少，妈妈说：**"只带铅笔 + 橡皮 + 本子就够了"**（3 样）。

明天要是大考试，还要多带：**尺子 + 草稿纸 + 彩笔**（加起来 6 样）。

**事大就多带，事小就少带。** 别啥都往书包里塞。

---

### 办法 6 —— 想看哪页翻哪页

数学练习本第一页是**目录**：
- "加法 在第 5 页"
- "减法 在第 8 页"
- "乘法 在第 12 页"

你想看"加法"？**翻到第 5 页**就行。
你想看"加法 + 减法"？**翻第 5 到 8 页**就行。

**不用把整本都翻一遍**，只看你要的那几页。

---

### 办法 7 —— 先看书封面再翻开

你从柜子里拿书的时候，**先看书封面写的名字**：

| 封面写的 | 要不要 |
|---------|--------|
| "二年级数学上册" | ✅ 要 |
| "三年级语文下册" | ❌ 不要 |
| "妈妈做饭食谱"   | ❌ 不要 |

**封面 1 秒就能看完**，不用每本都翻开看里头写啥。

---

## 🎒 全部加起来，是这么回事

早上 7 点半，你背着书包出门了：

- 书包里只有 **5 样**东西
- 每样东西**只翻了需要的那几页**
- 家里 100 多样东西，**没全搬进书包**
- 书包里的书，**没每本都从头翻到尾**

**这就是 ECC 干的事：东西很多，但你每次只用一小部分。** 🎒

---

> 🌟 用一句话记住：**"东西多，书包小，少拿几样，每样只看一点点。"**

---

## 11. 与"编排机制"的对比关系

> 姊妹篇：[ECC-技能编排机制-写作文版.md](ECC-技能编排机制-写作文版.md)
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

**本报告仅供参考，不构成架构变更建议。** 任何对技能加载协议的修改都应先在 sandbox 跑通再灰度上线。