#!/usr/bin/env node
/**
 * capability-cache.js — 检查 capabilities.json 缓存新鲜度; 超过 7 天提示重扫。
 *
 * 设计:
 *   - 单纯读 mtime, 不计算 hash (hash 与 ECC 实际资源 drift 不严格对应 —
 *     ECC 内部 agent 改名不报; mtime + 7 天是更宽松也更诚实的策略)。
 *   - 不强制重新生成: 路由壳运行期会读到 cache, 不会因为过期就拒绝工作。
 *   - 提示而非阻断: 让操作者决定。
 *
 * 用法:
 *   node loop-orchestrator/scripts/capability-cache.js
 *   node loop-orchestrator/scripts/capability-cache.js --max-age-days 7
 *   node loop-orchestrator/scripts/capability-cache.js --capabilities <path>
 *   # 退出码: 0=fresh, 1=stale, 2=missing
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_AGE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function main() {
  const args = process.argv.slice(2);
  let maxAgeDays = DEFAULT_MAX_AGE_DAYS;
  let capPath = path.resolve(__dirname, '..', 'capabilities.json');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--max-age-days' && args[i + 1]) maxAgeDays = parseFloat(args[++i]);
    else if (args[i] === '--capabilities' && args[i + 1]) capPath = path.resolve(args[++i]);
  }

  if (!fs.existsSync(capPath)) {
    console.error(`MISSING: ${capPath}`);
    console.error('Run: node loop-orchestrator/scripts/capability-scanner.js');
    process.exit(2);
  }

  const stat = fs.statSync(capPath);
  const ageMs = Date.now() - stat.mtimeMs;
  const ageDays = ageMs / DAY_MS;
  const fresh = ageDays <= maxAgeDays;

  let cap;
  try {
    cap = JSON.parse(fs.readFileSync(capPath, 'utf8'));
  } catch (e) {
    console.error(`CORRUPT: ${capPath}: ${e.message}`);
    process.exit(2);
  }

  const summary = {
    path: capPath,
    mtime: stat.mtime.toISOString(),
    age_days: ageDays.toFixed(2),
    max_age_days: maxAgeDays,
    fresh,
    scanned_at: cap.scanned_at || null,
    agents: cap.counts ? cap.counts.agents : null,
    install_available: cap.counts ? cap.counts.install_available : null,
    install_missing: cap.counts ? cap.counts.install_missing : null,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (fresh) {
    console.log(`OK: capabilities.json is fresh (${ageDays.toFixed(1)} days old, threshold ${maxAgeDays}).`);
    process.exit(0);
  } else {
    console.warn(`STALE: capabilities.json is ${ageDays.toFixed(1)} days old (threshold ${maxAgeDays}).`);
    console.warn('Run: node loop-orchestrator/scripts/capability-cache.js cannot rerun, use capability-scanner.js');
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { DEFAULT_MAX_AGE_DAYS };
