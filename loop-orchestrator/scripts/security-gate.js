#!/usr/bin/env node
/**
 * security-gate.js — loop-orchestrator 段 2 P1 集成。
 *
 * 替代 ECC-main/workflows/orch-review.workflow.js 的 security dimension,
 * 但**不调用 ECC agent** (plan §"已知 limitation" R1: wrapper harness 不识别 ECC plugin agent).
 * 用本地静态扫描实现, 满足 plan §"验证策略" § 6' 的 "ecc_review.recommendation=APPROVED" 闭环.
 *
 * 触发: verify.sh 第 7 层 (diff 命中 SECURITY_TRIGGER 自动调).
 *
 * 扫描内容 (静态, 非 LLM):
 *   1. 硬编码 secret: `password\s*[:=]\s*["']?[^"'\s]+`, `api[_-]?key\s*[:=]\s*["']?[^"'\s]+`, etc.
 *   2. 硬编码密钥: `BEGIN RSA PRIVATE KEY` 等
 *   3. 弱 hash: md5/sha1
 *   4. 动态 exec/eval
 *   5. SQL 字符串拼接
 *   6. fs 路径拼接 (path traversal 风险)
 *   7. crypto.createHash 用 md5
 *
 * 输出: 写到 .ai/loop/state.json.ecc_review (per state.schema.json)
 * 退出: 0=APPROVED, 1=CHANGES_REQUESTED, 2=SKIPPED (no trigger)
 *
 * 用法:
 *   node loop-orchestrator/scripts/security-gate.js [--dry-run] [--json]
 *   # verify.sh 自动调, 不需要手动
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WRAPPER_ROOT = path.resolve(__dirname, '..', '..');
const STATE_FILE = path.join(WRAPPER_ROOT, '.ai', 'loop', 'state.json');

// 抄自 ECC-main/workflows/orch-review.workflow.js:58-59
const SECURITY_TRIGGER_RE = /\b(auth|login|password|passwd|token|secret|credential|api[_-]?key|session|jwt|oauth|cookie|sql|query|exec|eval|crypto|cipher|hash|hmac|sign|fs\.|readFile|writeFile|fetch|axios|request|subprocess|os\.system)\b/i;

// 静态扫描规则
const SCAN_RULES = [
  {
    id: 'hardcoded-secret',
    title: '疑似硬编码 secret',
    re: /\b(password|passwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9+/=._-]{12,}["']?/i,
    severity: 'CRITICAL',
    fix: '把 secret 移到 .env, 用 process.env 读, .env.example 只放占位',
  },
  {
    id: 'private-key',
    title: '疑似 private key 泄漏',
    re: /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
    severity: 'CRITICAL',
    fix: '删除 key 文件, 加 .gitignore, 用密钥管理服务',
  },
  {
    id: 'weak-crypto',
    title: '使用了已弃用 hash (md5/sha1)',
    re: /\b(md5|sha1)\(/i,
    severity: 'HIGH',
    fix: '改用 sha256/sha3',
  },
  {
    id: 'dynamic-exec',
    title: '动态 exec/eval (潜在注入)',
    re: /\b(exec|eval)\s*\(\s*[^"'`)]/,
    severity: 'HIGH',
    fix: '用静态命令参数, 不要 exec 拼字符串',
  },
  {
    id: 'sql-concat',
    title: 'SQL 字符串拼接 (潜在 SQL 注入)',
    re: /\b(SELECT|INSERT|UPDATE|DELETE)\b.*\+/i,
    severity: 'HIGH',
    fix: '用参数化查询 (?, $1, 占位符)',
  },
  {
    id: 'fs-path-traversal',
    title: 'fs 操作拼接路径 (潜在 path traversal)',
    re: /\b(readFile|writeFile|unlink|rm)\s*\(\s*[^"'`)]*\+/,
    severity: 'MEDIUM',
    fix: '用 path.resolve() + 白名单校验, 不要直接拼',
  },
  {
    id: 'crypto-md5',
    title: 'crypto.createHash 用 md5 (已弃用)',
    re: /crypto\.createHash\s*\(\s*['"]md5['"]/i,
    severity: 'MEDIUM',
    fix: '改 sha256',
  },
];

function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
         `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function getDiffAndFiles() {
  let diff = '';
  let files = [];
  try {
    diff = execFileSync('git', ['diff', '-U0'], { cwd: WRAPPER_ROOT, encoding: 'utf8' });
  } catch { /* no diff */ }
  try {
    const nameOnly = execFileSync('git', ['diff', '--name-only'], { cwd: WRAPPER_ROOT, encoding: 'utf8' });
    files = nameOnly.split('\n').filter(Boolean);
  } catch { /* no files */ }
  return { diff, files };
}

function scan(diff, files) {
  const findings = [];
  const lines = diff.split('\n');
  let currentFile = null;
  let currentLine = 0;

  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6);
      currentLine = 0;
      continue;
    }
    if (line.startsWith('@@')) {
      const m = line.match(/\+(\d+)/);
      if (m) currentLine = parseInt(m[1], 10);
      continue;
    }
    if (!line.startsWith('+')) continue;
    if (line.startsWith('+++')) continue;
    currentLine += 1;

    for (const rule of SCAN_RULES) {
      if (rule.re.test(line)) {
        findings.push({
          title: rule.title,
          severity: rule.severity,
          file: currentFile || '<unknown>',
          line: currentLine,
          evidence: line.slice(0, 200),
          proof: `Rule ${rule.id} matched on added line`,
          fix: rule.fix,
        });
      }
    }
  }

  return findings;
}

function buildReport(diff, files, findings) {
  const isBlocking = (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH';
  const blocking = findings.filter(isBlocking);
  const advisory = findings.filter((f) => !isBlocking(f));

  return {
    ran_at: nowStr(),
    security_triggered: SECURITY_TRIGGER_RE.test(diff),
    diff_chars: diff.length,
    files_scanned: files.length,
    recommendation: blocking.length > 0 ? 'CHANGES_REQUESTED' : 'APPROVE',
    blocking,
    advisory,
    stats: {
      raw: findings.length,
      unique: findings.length,
      confirmed: blocking.length,
      refuted: 0,
      unverified: 0,
    },
  };
}

function writeState(report) {
  if (!fs.existsSync(STATE_FILE)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    data.ecc_review = {
      recommendation: report.recommendation === 'APPROVE' ? 'APPROVE' : 'CHANGES_REQUESTED',
      blocking: report.blocking,
      advisory: report.advisory,
      stats: report.stats,
      ran_at: report.ran_at,
    };
    data.updated_at = nowStr();
    const tmp = STATE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
    fs.renameSync(tmp, STATE_FILE);
    return true;
  } catch (e) {
    console.error(`WARN: failed to write state.json.ecc_review: ${e.message}`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const json = args.includes('--json');

  const { diff, files } = getDiffAndFiles();
  const report = buildReport(diff, files, scan(diff, files));

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`security_gate: ${report.recommendation}`);
    console.log(`  diff_chars: ${report.diff_chars}`);
    console.log(`  files_scanned: ${report.files_scanned}`);
    console.log(`  blocking: ${report.blocking.length}`);
    console.log(`  advisory: ${report.advisory.length}`);
    if (report.blocking.length > 0) {
      console.log('  Blocking findings:');
      for (const f of report.blocking) {
        console.log(`    [${f.severity}] ${f.title} (${f.file}:${f.line})`);
      }
    }
  }

  if (!dryRun) {
    const wrote = writeState(report);
    if (wrote && !json) console.log(`  state.json.ecc_review updated: ${report.recommendation}`);
  }

  if (!report.security_triggered && report.blocking.length === 0) {
    process.exit(2); // SKIPPED
  }
  if (report.blocking.length > 0) {
    process.exit(1); // CHANGES_REQUESTED
  }
  process.exit(0); // APPROVED
}

if (require.main === module) main();

module.exports = { scan, buildReport, SCAN_RULES, SECURITY_TRIGGER_RE };
