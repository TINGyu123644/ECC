---
description: ECC 插件开发 6 步标准操作清单（v2.0）。打开 sop-updated.md
---

# /ecc-cn-sop

直接打开 ECC 插件开发 6 步 SOP（sop-updated.md）。

## 一句话流程

```
Step 0  分类 + 耦合判定  → 决定是 skill / agent / command / hook
Step 1  写文件 + frontmatter
Step 2  注册 manifest（仅 skill 需要）
Step 3  跑 CI 校验
Step 4  加载路径（cp 到 ~/.claude/custom-rules/）
Step 5  8 项自检清单
```

## 何时用

| 场景 | 用 |
|---|---|
| 加新 skill（最常见） | ✅ |
| 加新 agent | ✅ |
| 加新 command | ✅ |
| 加新 hook | ✅ |
| 重大改造现有资源 | ✅ |
| 修 1-2 行 bug | ❌（直接改 + 跑 CI 即可） |
| 改纯文档 | ❌ |

## Step 0 关键判定

| 情况 | 处理 |
|---|---|
| 需要 agent（如需独立 spawn / 长流程） | 加 agent + 配 skill |
| 不需要 agent（纯文档 / 触发即用） | 只加 skill |
| skill + agent 联动（如 self-improver ↔ self-improvement） | 都加，manifest 双向注册 |

## 配套资源

| Step | 调用的 skill | 调用的 agent |
|---|---|---|
| Step 0 | `coupling-decider` | `ecc-plugin-dev-agent` |
| Step 1 | `file-templates` | `ecc-plugin-dev-agent` |
| Step 2 | `ecc-plugin-dev-sop` | `ecc-plugin-dev-agent` |
| Step 3 | `ecc-plugin-dev-sop` | - |

## 不要做

- ❌ 不要跳过 Step 2（漏注册别人装不到）
- ❌ 不要跳过 Step 3（语法错误埋雷）
- ❌ 不要跳过 Step 4（自己用不到）

## 配套

- 原 `ecc-cn-sop` skill 已被本命令取代