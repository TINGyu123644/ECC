#!/usr/bin/env node
/**
 * capability-scanner.js — 扫描 ECC submodule 的 agents / skills / commands 资源,
 * 产出 loop-orchestrator/capabilities.json。
 *
 * 用途:
 *   - 段 2 mini-installer 读此表决定复制哪些 ECC agent (加 ecc- 前缀)。
 *   - 段 2 路由壳运行期查此表 (或经 capability-cache.js) 决定委派目标是否在位。
 *   - AGENTS.md §"三方命名约定" 的 ecc- 前缀 agent 集合以此文件为唯一事实来源。
 *
 * 设计:
 *   - 5 优先级路径探测借鉴 ECC-main/scripts/lib/resolve-ecc-root.js,
 *     但只识别 wrapper 仓库内的两种合法位置: ../ECC-main (submodule) 或同仓库内的 ECC-main。
 *   - 输出 JSON 包含三类资源计数 + 详细描述, 方便人类审阅与 lint。
 *   - 跑得快: O(N) 读 frontmatter, 不递归, 不下载。
 *
 * 风险:
 *   - R5 (submodule 未 init) → 探测不到资源, 输出空表 + exit 0 (由 install.js 拦截并报错)。
 *   - 文件名 / frontmatter 解析失败 → 记入 _warnings[], 不中断整体扫描。
 *
 * 用法:
 *   node loop-orchestrator/scripts/capability-scanner.js
 *   node loop-orchestrator/scripts/capability-scanner.js --out <path>
 *   node loop-orchestrator/scripts/capability-scanner.js --ecc-root <path>
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 路径解析 — 5 优先级 (借鉴 ECC-main/scripts/lib/resolve-ecc-root.js 思路)
// ---------------------------------------------------------------------------

function resolveEccRoot(cliRoot) {
  if (cliRoot && fs.existsSync(cliRoot)) return path.resolve(cliRoot);
  const candidates = [
    // 1. 环境变量 (wrapper install 或 CI 给定)
    process.env.LOOP_ORCH_ECC_ROOT,
    // 2. 同仓库子目录 (submodule 标准位置)
    path.resolve(__dirname, '..', '..', 'ECC-main'),
    // 3. 同仓库 ECC submodule 链接
    path.resolve(__dirname, '..', '..', 'ECC-main'),
    // 4. 上级目录 (老 layout 兼容)
    path.resolve(__dirname, '..', '..', '..', 'ECC-main'),
    // 5. children 目录 (forge 工具产物)
    path.resolve(__dirname, '..', '..', 'children', 'ECC-main'),
  ].filter(Boolean);
  for (const c of candidates) {
    if (c && fs.existsSync(path.join(c, 'agents'))) return c;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Frontmatter 解析 — 仅识别被 harness 关心的 4 字段
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n/;

function parseFrontmatter(text) {
  const m = text.match(FRONTMATTER_RE);
  if (!m) return {};
  const block = m[1];
  const out = {};
  for (const line of block.split('\n')) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (key === 'name' || key === 'description' || key === 'model' || key === 'tools') {
      out[key] = val;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 资源扫描
// ---------------------------------------------------------------------------

function listAgents(eccRoot) {
  const dir = path.join(eccRoot, 'agents');
  if (!fs.existsSync(dir)) return { names: [], byId: {}, warnings: [] };
  const names = [];
  const byId = {};
  const warnings = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    const full = path.join(dir, f);
    try {
      const fm = parseFrontmatter(fs.readFileSync(full, 'utf8'));
      const id = (fm.name || f.replace(/\.md$/, ''));
      names.push(id);
      byId[id] = {
        src: path.relative(eccRoot, full).replace(/\\/g, '/'),
        description: (fm.description || '').slice(0, 200),
      };
    } catch (e) {
      warnings.push(`agents/${f}: ${e.message}`);
    }
  }
  names.sort();
  return { names, byId, warnings };
}

function listSkills(eccRoot) {
  const dir = path.join(eccRoot, 'skills');
  if (!fs.existsSync(dir)) return { names: [], byId: {}, warnings: [] };
  const names = [];
  const byId = {};
  const warnings = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f, 'SKILL.md');
    if (!fs.existsSync(full)) continue;
    try {
      const fm = parseFrontmatter(fs.readFileSync(full, 'utf8'));
      const id = (fm.name || f);
      names.push(id);
      byId[id] = {
        src: path.relative(eccRoot, full).replace(/\\/g, '/'),
        description: (fm.description || '').slice(0, 200),
      };
    } catch (e) {
      warnings.push(`skills/${f}/SKILL.md: ${e.message}`);
    }
  }
  names.sort();
  return { names, byId, warnings };
}

function listCommands(eccRoot) {
  const dir = path.join(eccRoot, 'commands');
  if (!fs.existsSync(dir)) return { names: [], byId: {}, warnings: [] };
  const names = [];
  const byId = {};
  const warnings = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    const full = path.join(dir, f);
    try {
      const fm = parseFrontmatter(fs.readFileSync(full, 'utf8'));
      const id = (fm.name || f.replace(/\.md$/, ''));
      names.push(id);
      byId[id] = {
        src: path.relative(eccRoot, full).replace(/\\/g, '/'),
        description: (fm.description || '').slice(0, 200),
      };
    } catch (e) {
      warnings.push(`commands/${f}: ${e.message}`);
    }
  }
  names.sort();
  return { names, byId, warnings };
}

// ---------------------------------------------------------------------------
// 安装清单 — 与 ROUTING.md "mini-installer 复制清单" 对齐
// ---------------------------------------------------------------------------

const INSTALL_LIST = [
  { src: 'code-explorer.md',        dst: 'ecc-code-explorer.md' },
  { src: 'planner.md',              dst: 'ecc-planner.md' },
  { src: 'architect.md',            dst: 'ecc-architect.md' },
  { src: 'tdd-guide.md',            dst: 'ecc-tdd-guide.md' },
  { src: 'code-reviewer.md',        dst: 'ecc-code-reviewer.md' },
  { src: 'security-reviewer.md',    dst: 'ecc-security-reviewer.md' },
  { src: 'e2e-runner.md',           dst: 'ecc-e2e-runner.md' },
  { src: 'build-error-resolver.md', dst: 'ecc-build-error-resolver.md' },
  { src: 'python-reviewer.md',      dst: 'ecc-python-reviewer.md' },
  { src: 'typescript-reviewer.md',  dst: 'ecc-typescript-reviewer.md' },
  { src: 'cpp-reviewer.md',         dst: 'ecc-cpp-reviewer.md' },
  { src: 'rust-reviewer.md',        dst: 'ecc-rust-reviewer.md' },
  { src: 'go-reviewer.md',          dst: 'ecc-go-reviewer.md' },
  { src: 'java-reviewer.md',        dst: 'ecc-java-reviewer.md' },
  { src: 'react-reviewer.md',       dst: 'ecc-react-reviewer.md' },
  { src: 'vue-reviewer.md',         dst: 'ecc-vue-reviewer.md' },
];

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
         `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function main() {
  const args = process.argv.slice(2);
  let outPath = path.resolve(__dirname, '..', 'capabilities.json');
  let cliRoot = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) { outPath = path.resolve(args[++i]); }
    else if (args[i] === '--ecc-root' && args[i + 1]) { cliRoot = args[++i]; }
  }

  const eccRoot = resolveEccRoot(cliRoot);
  if (!eccRoot) {
    console.error('ERROR: ECC root not found. Run `git submodule update --init ECC-main/` first.');
    console.error('  Tried: $LOOP_ORCH_ECC_ROOT, ../ECC-main, ../../ECC-main, children/ECC-main');
    process.exit(2);
  }

  const agents = listAgents(eccRoot);
  const skills = listSkills(eccRoot);
  const commands = listCommands(eccRoot);

  // 校验 install list 中每个 src 实际存在 — 不存在则记 warning
  const installValidation = [];
  for (const item of INSTALL_LIST) {
    const exists = agents.names.includes(item.src.replace(/\.md$/, ''));
    installValidation.push({ src: item.src, dst: item.dst, available: exists });
  }
  const missing = installValidation.filter((v) => !v.available);
  const warnings = [
    ...agents.warnings,
    ...skills.warnings,
    ...commands.warnings,
    ...missing.map((m) => `install list references missing agent: ${m.src}`),
  ];

  const cap = {
    schema_version: '1',
    scanned_at: nowStr(),
    ecc_root: eccRoot,
    counts: {
      agents: agents.names.length,
      skills: skills.names.length,
      commands: commands.names.length,
      install_list: INSTALL_LIST.length,
      install_available: installValidation.length - missing.length,
      install_missing: missing.length,
    },
    agents: agents.names,
    skills: skills.names,
    commands: commands.names,
    agents_by_id: agents.byId,
    skills_by_id: skills.byId,
    commands_by_id: commands.byId,
    install_list: installValidation,
    _warnings: warnings,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(cap, null, 2) + '\n', 'utf8');

  console.log(`Scanned ECC root: ${eccRoot}`);
  console.log(`  agents:   ${cap.counts.agents}`);
  console.log(`  skills:   ${cap.counts.skills}`);
  console.log(`  commands: ${cap.counts.commands}`);
  console.log(`  install list: ${cap.counts.install_available}/${cap.counts.install_list} available` +
              (missing.length ? ` (missing: ${missing.map((m) => m.src).join(', ')})` : ''));
  console.log(`Wrote: ${outPath}`);
  if (warnings.length) {
    console.warn(`Warnings (${warnings.length}):`);
    for (const w of warnings.slice(0, 10)) console.warn(`  - ${w}`);
    if (warnings.length > 10) console.warn(`  ... and ${warnings.length - 10} more`);
  }
}

if (require.main === module) main();

module.exports = { resolveEccRoot, parseFrontmatter, INSTALL_LIST, listAgents, listSkills, listCommands };
