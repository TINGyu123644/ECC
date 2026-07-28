#!/usr/bin/env node
/**
 * visibility-report.js — 输出 loop-orchestrator ECC 资源可见性报告。
 *
 * 背景 (plan §"RISK.md" § R1 已接受 limitation):
 *   wrapper harness 加载 .claude/agents/*.md, ECC-main 自有 agent 路径 .claude-plugin/agents
 *   不同的加载路径. 我们物理复制 16 个 ECC subagent 到 wrapper/.claude/agents/ecc-*.md,
 *   让 wrapper harness 看见. 但 ECC plugin 端 manifest 不能改 (plan §"不动 ECM-main/").
 *
 * 本脚本针对每个被 mini-installer 复制的 ecc-* agent, 输出:
 *   - 物理位置 (wrapper 根 .claude/agents/ecc-*.md)
 *   - 源 (ECC-main/agents/*.md)
 *   - 加载状态 (wrapper 看到 / ECC plugin 看不到 / fallback needed)
 *   - 委派建议 (用 ecc-* 还是 fallback)
 *
 * 用法:
 *   node loop-orchestrator/scripts/visibility-report.js
 *   # 输出 JSON 或文本
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { INSTALL_LIST, resolveEccRoot } = require('./capability-scanner');

const WRAPPER_ROOT = path.resolve(__dirname, '..', '..');
const ECC_MAIN = resolveEccRoot(null);
const WRAPPER_AGENTS_DIR = path.join(WRAPPER_ROOT, '.claude', 'agents');
const ECC_PLUGIN_MANIFEST = ECC_MAIN ? path.join(ECC_MAIN, '.claude-plugin', 'plugin.json') : null;

function readManifest() {
  if (!ECC_PLUGIN_MANIFEST || !fs.existsSync(ECC_PLUGIN_MANIFEST)) return null;
  try {
    return JSON.parse(fs.readFileSync(ECC_PLUGIN_MANIFEST, 'utf8'));
  } catch {
    return null;
  }
}

function buildReport() {
  const manifest = readManifest();
  // plugin manifest 实际不引用 agents (ECC 自己用 `skills` + `commands` 字段). 我们仅观察 wrapper 路径.
  const eccPluginHasAgentsField = manifest && Array.isArray(manifest.agents) && manifest.agents.length > 0;

  const items = [];
  for (const item of INSTALL_LIST) {
    const srcPath = ECC_MAIN ? path.join(ECC_MAIN, 'agents', item.src) : null;
    const dstPath = path.join(WRAPPER_AGENTS_DIR, item.dst);
    const srcExists = srcPath && fs.existsSync(srcPath);
    const dstExists = fs.existsSync(dstPath);

    let status;
    let recommendation;

    if (!dstExists) {
      status = 'MISSING';
      recommendation = 'run `node loop-orchestrator/bin/install.js --rebuild`';
    } else if (!srcExists) {
      status = 'STALE';
      recommendation = '源 agent 在 ECC-main 缺失, 删除 ecc-* 副本';
    } else if (eccPluginHasAgentsField) {
      status = 'BOTH';
      recommendation = 'wrapper 加载 ecc-*, ECC plugin 也加载 — 路由壳 should 优先 ecc-*';
    } else {
      // 实际情况: ECC plugin manifest 不引用 agents, wrapper 加载 ecc-* 是唯一加载路径
      status = 'WRAPPER_ONLY';
      recommendation = 'wrapper 加载 ecc-*; ECC plugin 端不识别 (plan §"已知 limitation" R1)';
    }

    items.push({
      ecc_name: item.dst.replace(/\.md$/, ''),
      src: srcPath ? path.relative(WRAPPER_ROOT, srcPath).replace(/\\/g, '/') : null,
      dst: path.relative(WRAPPER_ROOT, dstPath).replace(/\\/g, '/'),
      installed: dstExists,
      source_exists: srcExists,
      status,
      recommendation,
    });
  }

  const limitation = {
    R1: manifest && !eccPluginHasAgentsField
      ? 'ECC-main/.claude-plugin/plugin.json 不引用 agents 字段, 所以 ECC plugin 端不会加载 ecc-*. 计划已接受此 limitation.'
      : 'ECC plugin manifest 含 agents 字段, wrapper + ECC plugin 双重加载.',
    plan_acceptance: 'plan §"现实提醒" § 158 用户接受 R1 残余风险',
  };

  return {
    wrapper_root: WRAPPER_ROOT,
    ecc_main: ECC_MAIN,
    ecc_plugin_manifest: ECC_PLUGIN_MANIFEST ? path.relative(WRAPPER_ROOT, ECC_PLUGIN_MANIFEST).replace(/\\/g, '/') : null,
    manifest_references_agents: !!eccPluginHasAgentsField,
    summary: {
      total: items.length,
      installed: items.filter((i) => i.installed).length,
      missing: items.filter((i) => i.status === 'MISSING').length,
      stale: items.filter((i) => i.status === 'STALE').length,
      wrapper_only: items.filter((i) => i.status === 'WRAPPER_ONLY').length,
      both: items.filter((i) => i.status === 'BOTH').length,
    },
    items,
    limitation,
  };
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const report = buildReport();

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('=== loop-orchestrator ECC visibility report ===');
  console.log(`wrapper root:   ${report.wrapper_root}`);
  console.log(`ECC main:       ${report.ecc_main}`);
  console.log(`ECC manifest:   ${report.ecc_plugin_manifest}`);
  console.log(`manifest.agents: ${report.manifest_references_agents ? 'YES' : 'NO (R1 limitation)'}`);
  console.log('');
  console.log(`Install: ${report.summary.installed}/${report.summary.total} installed`);
  console.log(`  - WRAPPER_ONLY: ${report.summary.wrapper_only}`);
  console.log(`  - MISSING:      ${report.summary.missing}`);
  console.log(`  - STALE:        ${report.summary.stale}`);
  console.log(`  - BOTH:         ${report.summary.both}`);
  console.log('');
  console.log('Items:');
  for (const item of report.items) {
    const tag = item.installed ? '✓' : '✗';
    console.log(`  ${tag} ${item.ecc_name.padEnd(30)} ${item.status.padEnd(13)} ${item.recommendation}`);
  }
  console.log('');
  console.log('Limitation:');
  console.log(`  R1: ${report.limitation.R1}`);
  console.log(`  Acceptance: ${report.limitation.plan_acceptance}`);
}

if (require.main === module) main();

module.exports = { buildReport };
