# ecc-cn — ECC 中文机制知识扩展

> 一个**只加不改**的 ECC 扩展插件。把 4 份机制知识文档暴露为可调用的 skill 和 slash command。

## 提供什么

| Skill / Command | 作用 |
|---|---|
| `ecc-cn-mechanisms` (skill) | 路由到 4 份机制文档之一（编排 / 选择 / 错误定位修复 / 耦合判定） |
| `ecc-cn-coupling-decision` (skill) | Agent-Skill 强/弱耦合判定标准（独立 skill） |
| `/ecc-cn-explain <topic>` (command) | slash 命令，直接打开对应机制文档 |

## 依赖

通过 `plugin.json` 的 `dependencies` 字段自动安装：

```json
"dependencies": { "ecc": "^2.0.0" }
```

意味着装 `ecc-cn` 会**自动装上原版 ECC 插件**，无需手动操作。

## 对原 ECC 插件的影响

**零。** 本插件是薄包装层：

- ❌ 不修改 `ECC-main/` 子模块的任何文件
- ❌ 不修改 upstream `affaan-m/ecc` 仓库
- ❌ 不重声明 ECC 已有的 skill / agent / command 名
- ❌ 不加会与 ECC 撞 matcher 的 hooks

只新增：

- ✅ `ecc-cn-mechanisms` skill（独占命名空间 `ecc-cn:*`）
- ✅ `ecc-cn-coupling-decision` skill
- ✅ `/ecc-cn-explain` command

## 安装

```bash
# marketplace 形式
claude plugin install ecc-cn

# 或从 GitHub 直装
claude plugin install https://github.com/TINGyu123644/ECC
```

## 文件结构

```
ecc-cn/
├── .claude-plugin/
│   ├── plugin.json
│   ├── marketplace.json
│   └── README.md
├── skills/
│   ├── ecc-cn-mechanisms/
│   │   └── SKILL.md
│   └── ecc-cn-coupling-decision/
│       └── SKILL.md
├── commands/
│   └── ecc-cn-explain.md
└── 4 份根级机制文档（被 SKILL.md 引用）
    ├── ECC-技能编排机制.md
    ├── ECC-技能选择机制-渐进式加载.md
    ├── ECC-错误定位与修复机制.md
    └── Agent-Skill-耦合方式决策知识库.md
```

## 版本

- **v1.0.0** — 首次发布（2026-08-05）

## License

MIT