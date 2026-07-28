#!/usr/bin/env node
/**
 * mini-installer.js — 把 ROUTING.md "mini-installer 复制清单" 列出的 16 个
 * ECC subagent 物理复制到 wrapper .claude/agents/, 加 ecc- 前缀。
 *
 * 关键设计 (缓解 RISK.md R1):
 *   - harness 加载 wrapper 根 .claude/agents/, 默认看不见 ECC-main/agents/。
 *   - 把 16 个目标 agent 物理复制过来 + 改 frontmatter `name: ecc-...`
 *     是 wrapper harness 能发现它们的唯一方式。
 *   - 已存在文件: 不覆盖 (凭 --force 选项)。
 *   - frontmatter `name` 字段必须同步改名, 否则 harness 注册失败。
 *   - tools 字段: 保留原值 (ECC 用的工具名 Read/Write/Edit 等在 wrapper 中通用)。
 *
 * 设计取舍:
 *   - 不复制 skill (skill 没有 harness 加载问题, 由 Skill('ecc:...') 直接调)。
 *   - 不复制 command (command 由 wrapper .claude/commands/ 走另一路径)。
 *   - 不强校验源文件 frontmatter 解析正确: 解析失败 → 整文件原样复制 + warning。
 *
 * 用法:
 *   node loop-orchestrator/scripts/mini-installer.js
 *   node loop-orchestrator/scripts/mini-installer.js --force       # 覆盖已有
 *   node loop-orchestrator/scripts/mini-installer.js --dry-run     # 只列将做的动作
 *   node loop-orchestrator/scripts/mini-installer.js --ecc-root <path> --agents-out <path>
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { resolveEccRoot, INSTALL_LIST } = require('./capability-scanner');

// ---------------------------------------------------------------------------
// Frontmatter 改写: name 字段同步加 ecc- 前缀 (如果还没有的话)
// ---------------------------------------------------------------------------

function rewriteFrontmatter(text, newName) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) {
    // 无 frontmatter, 追加一个最小可用 frontmatter
    return `---\nname: ${newName}\ndescription: (imported from ECC; no original frontmatter)\n---\n\n${text}`;
  }
  let block = m[1];
  if (/^name:\s*/m.test(block)) {
    block = block.replace(/^name:\s*.*$/m, `name: ${newName}`);
  } else {
    block = `name: ${newName}\n` + block;
  }
  return `---\n${block}\n---\n` + text.slice(m[0].length);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  let force = false;
  let dryRun = false;
  let cliRoot = null;
  // wrapper Root 默认向上 2 级到 c:/Users/.../ECC-main
  let wrapperRoot = path.resolve(__dirname, '..', '..');
  let agentsOut = path.join(wrapperRoot, '.claude', 'agents');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--force') force = true;
    else if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--ecc-root' && args[i + 1]) cliRoot = args[++i];
    else if (args[i] === '--agents-out' && args[i + 1]) agentsOut = path.resolve(args[++i]);
    else if (args[i] === '--wrapper' && args[i + 1]) wrapperRoot = path.resolve(args[++i]);
  }

  const eccRoot = resolveEccRoot(cliRoot);
  if (!eccRoot) {
    console.error('ERROR: ECC root not found. Run `git submodule update --init ECC-main/` first.');
    process.exit(2);
  }

  fs.mkdirSync(agentsOut, { recursive: true });

  const stats = { copied: 0, skipped: 0, failed: 0 };
  const actions = []; // for dry-run

  for (const item of INSTALL_LIST) {
    const src = path.join(eccRoot, 'agents', item.src);
    const dst = path.join(agentsOut, item.dst);
    const newName = item.dst.replace(/\.md$/, '');

    if (!fs.existsSync(src)) {
      stats.failed++;
      console.warn(`MISSING: ${src}`);
      continue;
    }
    if (fs.existsSync(dst) && !force) {
      stats.skipped++;
      if (dryRun) actions.push(`SKIP ${dst}`);
      continue;
    }
    if (dryRun) {
      actions.push(`COPY ${src} -> ${dst} (name=${newName})`);
      stats.copied++;
      continue;
    }
    try {
      const text = fs.readFileSync(src, 'utf8');
      const rewritten = rewriteFrontmatter(text, newName);
      fs.writeFileSync(dst, rewritten, 'utf8');
      stats.copied++;
      console.log(`  + ${item.src} -> ${item.dst}`);
    } catch (e) {
      stats.failed++;
      console.warn(`FAIL ${item.src}: ${e.message}`);
    }
  }

  if (dryRun) {
    console.log(`DRY RUN — ${actions.length} actions planned:`);
    for (const a of actions.slice(0, 20)) console.log(`  ${a}`);
    if (actions.length > 20) console.log(`  ... and ${actions.length - 20} more`);
  }

  console.log(`mini-installer: copied=${stats.copied} skipped=${stats.skipped} failed=${stats.failed}`);

  // 失败超过 1 个 → exit 1 (caller 决定继续)
  if (stats.failed > 0) process.exit(1);
}

if (require.main === module) main();

module.exports = { rewriteFrontmatter };
