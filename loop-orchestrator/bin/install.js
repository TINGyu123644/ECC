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
const WRAPPER_ROOT = path.resolve(ROOT, '..');
const COMMANDS_ENV_PATH = path.join(WRAPPER_ROOT, '.ai', 'loop', 'commands.env');
const COMMANDS_ENV_TEMPLATE = path.join(ROOT, 'templates', 'commands.env.example');
const SPEC_FILE = path.join(WRAPPER_ROOT, 'SPEC.md');
const SPEC_TEMPLATE = path.join(ROOT, 'templates', 'SPEC.md.template');
const STATE_FILE = path.join(WRAPPER_ROOT, '.ai', 'loop', 'state.json');

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
  let skipAutoBaseline = false;
  for (const a of args) {
    if (a === '--skip-install') skipInstall = true;
    else if (a === '--rebuild') { rebuild = true; force = true; }
    else if (a === '--force') force = true;
    else if (a === '--skip-baseline') skipAutoBaseline = true;
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

  // 1.5 引导 commands.env 模板 (插拔式: 新项目无 commands.env 自动 cp)
  console.log('\n--- step 0: bootstrap commands.env + SPEC.md ---');
  if (!fs.existsSync(COMMANDS_ENV_PATH)) {
    if (fs.existsSync(COMMANDS_ENV_TEMPLATE)) {
      fs.mkdirSync(path.dirname(COMMANDS_ENV_PATH), { recursive: true });
      fs.copyFileSync(COMMANDS_ENV_TEMPLATE, COMMANDS_ENV_PATH);
      console.log(`  + copied template -> ${COMMANDS_ENV_PATH}`);
      console.log(`  ↑ 编辑此文件填实际工程命令 (lint / test / typecheck 等)`);
    } else {
      console.warn(`  WARN: template ${COMMANDS_ENV_TEMPLATE} 不存在, 跳过 auto-cp`);
    }
  } else {
    console.log(`  commands.env 已存在, 跳过 (--force 不覆盖)`);
  }

  // 1.6 引导 SPEC.md 模板 (新项目无 SPEC.md 自动 cp)
  if (!fs.existsSync(SPEC_FILE)) {
    if (fs.existsSync(SPEC_TEMPLATE)) {
      fs.copyFileSync(SPEC_TEMPLATE, SPEC_FILE);
      console.log(`  + copied template -> ${SPEC_FILE}`);
      console.log(`  ↑ 填项目名 / 负责人 / 3-5 条 AC + Check 命令`);
    } else {
      console.warn(`  WARN: template ${SPEC_TEMPLATE} 不存在, 跳过 auto-cp`);
    }
  } else {
    console.log(`  SPEC.md 已存在, 跳过 (--force 不覆盖)`);
  }

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

  // 5. 尝试 set-baseline (插拔式: 新项目若 state.json.baseline 缺失自动跑 1 次 tests)
  if (fs.existsSync(STATE_FILE)) {
    try {
      const st = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (!st.baseline) {
        console.log('\n--- step 4: auto-baseline (state.json.baseline 缺失) ---');
        const autoBaseline = tryAutoBaseline();
        if (autoBaseline) {
          console.log(`  baseline 自动记录: passed=${autoBaseline.passed} failed=${autoBaseline.failed} total=${autoBaseline.total}`);
        } else {
          console.log('  baseline 未自动设置 (没找到 tests/run-all.js 或失败)');
          console.log('  手动: python loop-orchestrator/scripts/state.py set-baseline --data \'{"passed":N,"failed":M,"total":K}\'');
        }
      } else {
        console.log(`\n--- step 4: baseline 已记录 (passed=${st.baseline.passed} failed=${st.baseline.failed} total=${st.baseline.total}) ---`);
      }
    } catch (e) {
      console.warn(`  WARN: state.json 解析失败: ${e.message}`);
    }
  }

  console.log('\n=== install complete ===');
  console.log('Next:');
  console.log('  - bootstrap: see loop-orchestrator/BOOTSTRAP.md');
  console.log('  - verify:    node loop-orchestrator/scripts/validate-state-schema.js');
}

function tryAutoBaseline() {
  // 探测常见测试入口, 跑 1 次拿数字
  const probes = [
    { cmd: 'node tests/run-all.js', cwd: WRAPPER_ROOT },
    { cmd: 'npm test', cwd: WRAPPER_ROOT },
    { cmd: 'pytest tests/ -q', cwd: WRAPPER_ROOT },
    { cmd: 'go test ./...', cwd: WRAPPER_ROOT },
    { cmd: 'cargo test --quiet', cwd: WRAPPER_ROOT },
  ];
  for (const p of probes) {
    try {
      const out = execFileSync(p.cmd, { cwd: p.cwd, encoding: 'utf8', shell: true, timeout: 30000 });
      const stats = parseTestOutput(out);
      if (stats) {
        // 写 state.json.baseline
        const args = ['--data', JSON.stringify(stats)];
        runNode(path.join(ROOT, 'scripts', 'state.py'), ['set-baseline', ...args], { silent: true });
        return stats;
      }
    } catch (e) {
      // 跳过, 尝试下一个
    }
  }
  return null;
}

function parseTestOutput(output) {
  // 通用解析: 找 passed / failed / total 数字
  let passed = 0, failed = 0, total = 0;
  const passedMatch = output.match(/(\d+)\s*(passed|pass)/i);
  const failedMatch = output.match(/(\d+)\s*(failed|fail)/i);
  const totalMatch = output.match(/(\d+)\s*(total)/i);
  if (passedMatch) passed = parseInt(passedMatch[1]);
  if (failedMatch) failed = parseInt(failedMatch[1]);
  if (totalMatch) total = parseInt(totalMatch[1]);
  if (total === 0 && (passed > 0 || failed > 0)) total = passed + failed;
  if (total === 0) return null;
  return { passed, failed, total };
}

if (require.main === module) main();

module.exports = { checkSubmodule, tryAutoBaseline, parseTestOutput };
