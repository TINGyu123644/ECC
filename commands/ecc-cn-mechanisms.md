---
description: 打开对应 ECC 机制文档。topic 可选：orchestration / selection / error-fix / coupling / sop / skill / agent / command（不传则列出全部 8 份简介）
---

# /ecc-cn-mechanisms

显式打开 ECC 机制相关文档。不带参数时列出全部 8 份文档 + 简介。

## 用法

```
/ecc-cn-mechanisms orchestration    → ECC-技能编排机制.md
/ecc-cn-mechanisms selection        → ECC-技能选择机制-渐进式加载.md
/ecc-cn-mechanisms error-fix        → ECC-错误定位与修复机制.md
/ecc-cn-mechanisms coupling         → Agent-Skill-耦合方式决策知识库.md
/ecc-cn-mechanisms sop              → sop-updated.md
/ecc-cn-mechanisms skill            → SKILLS.md
/ecc-cn-mechanisms agent            → AGENTS.md
/ecc-cn-mechanisms command          → COMMANDS.md
/ecc-cn-mechanisms                  → 列出全部 8 份文档 + 简介（无参数）
```

## 路由逻辑

| 参数关键字（含中英文） | 文档 |
|---|---|
| `orchestrat*`, `编排`, `pipeline`, `6 阶段`, `phase mask` | `ECC-技能编排机制.md` |
| `select*`, `选择`, `progressive`, `渐进式`, `fuzzy`, `Top-N`, `三级下钻` | `ECC-技能选择机制-渐进式加载.md` |
| `error`, `fix`, `bug`, `错误`, `修复`, `build-resolver`, `minimal diff` | `ECC-错误定位与修复机制.md` |
| `coupling`, `耦合`, `强耦合`, `弱耦合`, `binding` | `Agent-Skill-耦合方式决策知识库.md` |
| `sop`, `6 步`, `plugin dev`, `插件开发`, `manifest 注册`, `加 skill`, `加 agent` | `sop-updated.md` |
| `skill`, `skills`, `skill 列表`, `skill 速查`, `skill catalog`, `模块` | `SKILLS.md` |
| `agent`, `agents`, `agent 列表`, `agent 速查`, `agent catalog`, `reviewer`, `resolver` | `AGENTS.md` |
| `command`, `commands`, `slash`, `/`, `命令列表`, `命令速查` | `COMMANDS.md` |

## 不要做

- ❌ 不要复述文档内容（让用户读文档）
- ❌ 不要改文档
- ❌ 不要路由到不存在的文档（输入无法识别就列全部 8 份让用户选）

## 配套

- 原 `ecc-cn-mechanisms` skill 已被本命令取代