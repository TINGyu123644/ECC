#!/usr/bin/env node
/**
 * size-classify.js — 静态 size 分类器 (转译 ECC orch-pipeline § Step 0)。
 *
 * 规则 (取三者最高档):
 *   - 文件改动数           0              trivial
 *   - 文件改动数           1-2            small
 *   - 文件改动数           3-5            standard
 *   - 文件改动数           6+ 或跨模块    large
 *   - 触动 API/contract/public api           至少 standard
 *   - 安全 trigger 命中 (auth/sql/secret…)      至少 standard
 *   - 单文件 ≤ 3 行                          trivial (overrides)
 *
 * 输入来源 (按优先级):
 *   1. --from <patch file>
 *   2. --files a,b,c
 *   3. stdin (unified diff)
 *   4. git diff --name-only (默认)
 *
 * 输出:
 *   stdout 第一行:  size: <name>
 *   stdout 末行:    SIZE   <NAME>      (verify.sh 取末行)
 *   --json 模式:    {size, files, lines, security_triggered, api_touched, reason}
 *   退出码: 0 (分类器不阻断)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WRAPPER_ROOT = path.resolve(__dirname, '..', '..');

// 抄自 ECC-main/workflows/orch-review.workflow.js:58-59
const SECURITY_TRIGGER_RE = /\b(auth|login|password|passwd|token|secret|credential|api[_-]?key|session|jwt|oauth|cookie|sql|query|exec|eval|crypto|cipher|hash|hmac|sign|fs\.|readFile|writeFile|fetch|axios|request|subprocess|os\.system)\b/i;

// 触动 API / contract / 公共接口 的常见路径
const API_PATH_RE = /(^|\/)(api|schema|spec|contract|public|openapi|graphql|swagger|proto|routes?|controllers?)\//i;

function parseUnifiedDiff(text) {
  const files = [];
  let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('+++ ')) {
      const p = line.slice(4).replace(/^b\//, '');
      if (p && p !== '/dev/null') {
        current = { path: p, lines: 0 };
        files.push(current);
      }
    } else if (line.startsWith('--- ')) {
      const p = line.slice(4).replace(/^a\//, '');
      if (p && p !== '/dev/null' && !current) {
        current = { path: p, lines: 0 };
        files.push(current);
      }
    } else if (line.startsWith('@@')) {
      const m = line.match(/\+(\d+)/);
      if (m && current) current.lines = parseInt(m[1], 10);
    }
  }
  return files;
}

function stdinHasData() {
  // piped stdin 才有数据; TTY (用户拉终端跑) 无数据
  // P2 bug 修复: 旧逻辑 `!process.stdin.isTTY` 在 piped-with-empty-input 也走 stdin 路径, 报 0 files.
  // 新逻辑: 真正检查 stdin 是否可读, 且第一字节存在
  try {
    return fs.fstatSync(0).isFile() && fs.readSync(0, 1).length > 0;
  } catch {
    return false;
  }
}

function getChangedFiles(args) {
  if (args.patch) {
    if (!fs.existsSync(args.patch)) {
      console.error(`patch file not found: ${args.patch}`);
      process.exit(2);
    }
    return parseUnifiedDiff(fs.readFileSync(args.patch, 'utf8'));
  }
  if (args.files) {
    return args.files.split(',').filter(Boolean).map((p) => ({ path: p.trim(), lines: 0 }));
  }
  if (stdinHasData()) {
    // 预读了 1 byte, 再读剩余内容
    const rest = fs.readFileSync(0, 'utf8');
    const blob = '' + rest;
    if (blob.trim()) return parseUnifiedDiff(blob);
  }
  let diff;
  try {
    diff = execFileSync('git', ['diff', '--name-only'], { cwd: WRAPPER_ROOT, encoding: 'utf8' });
  } catch {
    return [];
  }
  return diff.split('\n').filter(Boolean).map((p) => ({ path: p, lines: 0 }));
}

function classify(changed) {
  const fileCount = changed.length;
  const totalLines = changed.reduce((sum, f) => sum + (f.lines || 0), 0);

  let diffText = '';
  if (fileCount > 0) {
    try {
      diffText = execFileSync('git', ['diff', '-U0'], { cwd: WRAPPER_ROOT, encoding: 'utf8' });
    } catch { /* no diff */ }
  }
  const allPaths = changed.map((f) => f.path).join('\n');
  const haystack = `${diffText}\n${allPaths}`;

  const security = SECURITY_TRIGGER_RE.test(haystack);
  const api = API_PATH_RE.test(allPaths);

  let size;
  let reason;
  if (fileCount === 0) {
    size = 'trivial';
    reason = 'no files changed';
  } else if (fileCount === 1 && totalLines <= 3) {
    size = 'trivial';
    reason = `single file ${totalLines} lines`;
  } else if (fileCount <= 2 && !api && !security) {
    size = 'small';
    reason = `${fileCount} files, no API/security trigger`;
  } else if (fileCount <= 5) {
    size = 'standard';
    reason = `${fileCount} files${api ? ' + api triggered' : ''}${security ? ' + security triggered' : ''}`;
  } else {
    size = 'large';
    reason = `${fileCount} files (cross-cutting)`;
  }

  // 强制升档
  if (security && (size === 'trivial' || size === 'small')) {
    size = 'standard';
    reason += ' (security trigger → upgraded)';
  }
  if (api && (size === 'trivial' || size === 'small')) {
    size = 'standard';
    reason += ' (api trigger → upgraded)';
  }

  return {
    size,
    files: fileCount,
    lines: totalLines,
    security_triggered: security,
    api_touched: api,
    reason,
  };
}

function main() {
  const args = parseArgs();
  const changed = getChangedFiles(args);
  const result = classify(changed);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (args.dryRun) {
    console.log(`size: ${result.size}`);
    console.log(`reason: ${result.reason}`);
    console.log(`files: ${result.files}, lines: ${result.lines}`);
    console.log(`security_triggered: ${result.security_triggered}, api_touched: ${result.api_touched}`);
    console.log(`SIZE ${result.size.toUpperCase()}`);
  } else {
    console.log(`size: ${result.size}`);
    console.log(`SIZE ${result.size.toUpperCase()}`);
  }
  process.exit(0);
}

function parseArgs() {
  const out = { patch: null, files: null, dryRun: false, json: false };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--dry-run') out.dryRun = true;
    else if (a[i] === '--json') out.json = true;
    else if (a[i] === '--from' && a[i + 1]) out.patch = a[++i];
    else if (a[i] === '--files' && a[i + 1]) out.files = a[++i];
  }
  return out;
}

if (require.main === module) main();

module.exports = { classify, SECURITY_TRIGGER_RE, API_PATH_RE };
