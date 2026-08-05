---
description: 打开对应 ECC 机制文档（编排 / 选择 / 错误定位修复 / 耦合判定）
---

# /ecc-cn-explain

打开 ECC 中文机制知识扩展中的指定文档。参数 `$ARGUMENTS` 决定打开哪一份。

## 用法

```
/ecc-cn-explain orchestration    → ECC-技能编排机制.md
/ecc-cn-explain selection        → ECC-技能选择机制-渐进式加载.md
/ecc-cn-explain error-fix        → ECC-错误定位与修复机制.md
/ecc-cn-explain coupling         → Agent-Skill-耦合方式决策知识库.md
/ecc-cn-explain                  → 列出所有 4 份文档 + 简介（无参数）
```

## 路由逻辑

| 参数关键字（含中英文） | 文档 |
|---|---|
| `orchestrat*`, `编排`, `pipeline`, `6 阶段`, `phase mask` | `ECC-技能编排机制.md` |
| `select*`, `选择`, `progressive`, `渐进式`, `fuzzy`, `Top-N`, `三级下钻` | `ECC-技能选择机制-渐进式加载.md` |
| `error`, `fix`, `bug`, `错误`, `修复`, `build-resolver`, `minimal diff` | `ECC-错误定位与修复机制.md` |
| `coupling`, `耦合`, `强耦合`, `弱耦合`, `binding` | `Agent-Skill-耦合方式决策知识库.md` |

## 不带参数时

输出 4 份文档的标题 + 一句话简介 + 适用场景，让用户挑。

## 不要做

- ❌ 不要复述文档内容（让用户读文档）
- ❌ 不要改文档
- ❌ 不要路由到不存在的文档（如果用户输入无法识别，列出全部 4 份让用户选）