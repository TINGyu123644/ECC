#!/usr/bin/env node
/**
 * install.js — loop-orchestrator 跨平台入口。
 *
 * 工作流:
 *   1. 检查 ECC submodule 状态 (R5 缓解: 未 init 立刻报错退出)
 *   2. 跑 capability-scanner.js → 产 capabilities.json
 *   3. 跑 mini-installer.js   → 物理复制 16 个 ECC subagent 加 ecc- 前缀
 *   4. 跑 capability-cache.js → 检查新鲜度提示
 *   5. 打印汇总
 *
 * 用法:
 *   node loop-orchestrator/bin/install.js
 *   node loop-orchestrator/bin/install.js --skip-install
 *   node loop-orchestrator/bin/install.js --rebuild
 *   node loop-orchestrator/bin/install.js --force
 *
 * 退出码:
 *   0 全部成功
 *   1 部分子步骤失败 (但不是致命)
 *   2 submodule 未 init / ecc-root 找不到
 *   3 自身异常
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function runNode(script, args, opts = {}) {
  const fullArgs = [script, ...args];
  try {
    const out = execFileSync(process.execPath, fullArgs, {
      cwd: ROOT,
      stdio: opts.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
    });
    return { ok: true, stdout: out || '' };
  } catch (e) {
    return { ok: false, code: e.status || 1, stderr: e.stderr || e.message };
  }
}

function checkSubmodule() {
  // 借鉴 .ai-loop/adapters/claude/transform-hooks.py 的 read-stdin 启发式,
  // 此处用 filesystem probe — 简单可靠。
  const candidates = [
    path.resolve(ROOT, '..', 'ECC-main'),
    path.resolve(ROOT, '..', '..', 'ECC-main'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'agents', 'code-explorer.md'))) return c;
  }
  return null;
}

function main() {
  const args = process.argv.slice(2);
  let skipInstall = false;
  let rebuild = false;
  let force = false;
  for (const a of args) {
    if (a === '--skip-install') skipInstall = true;
    else if (a === '--rebuild') { rebuild = true; force = true; }
    else if (a === '--force') force = true;
  }

  console.log('=== loop-orchestrator install ===');
  console.log(`root: ${ROOT}`);

  // 1. submodule 状态
  const eccRoot = checkSubmodule();
  if (!eccRoot) {
    console.error('ERROR: ECC-main/ submodule not initialized or missing.');
    console.error('  Run: git submodule update --init ECC-main/');
    process.exit(2);
  }
  console.log(`ecc-root: ${eccRoot}`);

  // 2. capability-scanner
  console.log('\n--- step 1: capability-scanner ---');
  const scannerArgs = ['--out', path.join(ROOT, 'capabilities.json')];
  if (rebuild && fs.existsSync(path.join(ROOT, 'capabilities.json'))) {
    fs.unlinkSync(path.join(ROOT, 'capabilities.json'));
  }
  const scan = runNode(path.join(ROOT, 'scripts', 'capability-scanner.js'), scannerArgs);
  if (!scan.ok) {
    console.error(`capability-scanner failed: ${scan.stderr}`);
    process.exit(2);
  }

  // 3. mini-installer
  if (!skipInstall) {
    console.log('\n--- step 2: mini-installer ---');
    const instArgs = [];
    if (force) instArgs.push('--force');
    const inst = runNode(path.join(ROOT, 'scripts', 'mini-installer.js'), instArgs);
    if (!inst.ok) {
      console.warn(`mini-installer reported errors (exit=${inst.code}); continuing.`);
    }
  } else {
    console.log('\n--- step 2: mini-installer SKIPPED (--skip-install) ---');
  }

  // 4. capability-cache 检查
  console.log('\n--- step 3: capability-cache check ---');
  const cache = runNode(path.join(ROOT, 'scripts', 'capability-cache.js'), [], { silent: true });
  process.stdout.write(cache.stdout || '');
  if (!cache.ok && cache.code === 1) {
    console.warn('(cache is stale, but already rebuilt above; rerun later if you pull ECC updates.)');
  }

  console.log('\n=== install complete ===');
  console.log('Next:');
  console.log('  - bootstrap: see loop-orchestrator/BOOTSTRAP.md');
  console.log('  - verify:    node loop-orchestrator/scripts/validate-state-schema.js');
}

if (require.main === module) main();

module.exports = { checkSubmodule };
