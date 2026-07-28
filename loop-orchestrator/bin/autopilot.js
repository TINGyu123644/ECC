#!/usr/bin/env node
/**
 * autopilot.js — loop-orchestrator 自动 7 步串联器。
 *
 * 用户在对话里说"加 XX / 修 XX / 改 XX" 时, AI 调 autopilot.js:
 *   1. 读 SPEC.md 找需求
 *   2. 调 state.py get 看 phase
 *   3. 跑 size-classify
 *   4. 调 state.py set-size
 *   5. 按 phase 调对应 routing shell
 *   6. 完成后 set-phase <next>
 *   7. 直到 DELIVER
 *
 * **不是自动跑脚本** — 是给 AI 看的"驾驶舱脚本", AI 主动 run 它.
 * 用户在对话里说需求 → AI 调 autopilot.js → autopilot 输出下一步指令 → AI 执行.
 *
 * 用法:
 *   node loop-orchestrator/bin/autopilot.js "加邮箱密码登录"   # 接收需求
 *   node loop-orchestrator/bin/autopilot.js --status            # 看当前 phase
 *   node loop-orchestrator/bin/autopilot.js --step             # 推 1 步
 *   node loop-orchestrator/bin/autopilot.js --auto             # 自动跑完整 7 步
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WRAPPER_ROOT = path.resolve(ROOT, '..');
const STATE_FILE = path.join(WRAPPER_ROOT, '.ai', 'loop', 'state.json');
const SPEC_FILE = path.join(WRAPPER_ROOT, 'SPEC.md');
const STATE_PY = path.join(ROOT, 'scripts', 'state.py');
const SIZE_CLI = path.join(ROOT, 'scripts', 'size-classify.js');

// 7 步 phase mask (与 orchestrator.md §2 一致)
const PHASE_ROUTING = {
  INIT:        { next: 'CONTEXT',     agent: null,                  desc: '初始化' },
  CONTEXT:     { next: 'REQUIREMENT', agent: 'context-scout',       desc: '侦察仓库' },
  REQUIREMENT: { next: 'PLAN',        agent: 'requirement-analyst', desc: '解需求 + 出 AC' },
  PLAN:        { next: 'CODE',        agent: 'solution-architect',  desc: '出方案' },
  CODE:        { next: 'VERIFY',      agent: 'feature-coder',       desc: '写代码' },
  VERIFY:      { next: 'REVIEW',      agent: 'regression-guard',    desc: '跑 verify.sh' },
  REVIEW:      { next: 'DELIVER',     agent: 'code-reviewer',       desc: '三视角审查' },
  DELIVER:     { next: null,          agent: 'delivery-reporter',   desc: '出报告' },
  FIX:         { next: 'VERIFY',      agent: 'fixer',               desc: '三分类归因修复' },
  SAFE_STOP:   { next: 'DELIVER',     agent: 'delivery-reporter',   desc: '诚实部分交付' },
};

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd: WRAPPER_ROOT, encoding: 'utf8', ...opts });
}

function runState(args) {
  return run('python', [STATE_PY, ...args]);
}

function getState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { phase: 'INIT', round: 0, max_rounds: 4 };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function getSize() {
  const r = run('node', [SIZE_CLI, '--dry-run']);
  if (r.status !== 0) return 'small';
  const lines = r.stdout.split('\n').filter(Boolean);
  const last = lines[lines.length - 1] || '';
  const m = last.match(/SIZE\s+(\w+)/);
  return m ? m[1].toLowerCase() : 'small';
}

function readSpec() {
  if (!fs.existsSync(SPEC_FILE)) return null;
  return fs.readFileSync(SPEC_FILE, 'utf8');
}

function nextInstruction(requirement) {
  const state = getState();
  const phase = state.phase || 'INIT';
  const size = getSize();
  const routing = PHASE_ROUTING[phase] || PHASE_ROUTING.INIT;
  const spec = readSpec();

  const out = {
    requirement: requirement || '(no requirement)',
    current_phase: phase,
    current_round: state.round || 0,
    size,
    next_phase: routing.next,
    next_agent: routing.agent,
    next_desc: routing.desc,
    state_file_exists: fs.existsSync(STATE_FILE),
    spec_exists: !!spec,
    spec_lines: spec ? spec.split('\n').length : 0,
  };

  out.instruction = buildInstruction(out, phase, routing);
  return out;
}

function buildInstruction(ctx, phase, routing) {
  const lines = [];
  lines.push(`# Phase: ${phase} -> ${routing.next || 'DONE'}`);
  lines.push(`# Size: ${ctx.size}`);
  lines.push(`# Round: ${ctx.current_round}`);
  lines.push('');
  lines.push(`## 下一步:`);
  if (phase === 'INIT') {
    lines.push(`1. 跑 \`state.py init --max-rounds 4\``);
    lines.push(`2. 跑 \`state.py set-size ${ctx.size}\``);
    lines.push(`3. 跑 \`state.py set-phase CONTEXT\``);
  } else if (routing.next) {
    lines.push(`1. 调 \`loop-orchestrator/agents/${routing.agent}.md\` 完成 "${routing.desc}"`);
    lines.push(`2. 完成后 \`state.py set-phase ${routing.next}\``);
    if (routing.next === 'VERIFY') {
      lines.push(`3. 跑 \`bash loop-orchestrator/scripts/verify.sh\``);
    }
  } else {
    lines.push(`OK 已到 DELIVER. 跑 \`loop-orchestrator/agents/delivery-reporter.md\` 输出报告`);
  }
  if (ctx.spec_exists) {
    lines.push('');
    lines.push(`## SPEC.md 存在 (${ctx.spec_lines} 行) — 读 \`./SPEC.md\` 找 AC`);
  } else {
    lines.push('');
    lines.push(`## SPEC.md 不存在 — 按 CLAUDE.md §1.5 不要硬改 SPEC, 先跑 7 步`);
  }
  return lines.join('\n');
}

function runAuto(requirement) {
  // 自动跑完整 7 步 (最多 4 round 修复循环)
  let round = 0;
  const max = 4;
  const log = [];

  while (round < max) {
    const ctx = nextInstruction(requirement);
    log.push(`[round ${round}] phase=${ctx.current_phase} size=${ctx.size}`);

    if (ctx.current_phase === 'DELIVER' || ctx.current_phase === 'SAFE_STOP') {
      log.push(`[done] reached ${ctx.current_phase}`);
      break;
    }
    if (!ctx.next_agent) {
      log.push(`[stop] no next agent for ${ctx.current_phase}`);
      break;
    }

    // AI 实际执行 (省略 — autopilot 只输出指令)
    log.push(`[todo] AI run ${ctx.next_agent}.md then set-phase ${ctx.next_phase}`);

    // 模拟: 假设 AI 完成
    if (ctx.next_phase) {
      runState(['set-phase', ctx.next_phase]);
    }
    round++;
  }

  return log;
}

function main() {
  const args = process.argv.slice(2);
  const requirement = args.find((a) => !a.startsWith('--'));

  if (args.includes('--status')) {
    const state = getState();
    console.log(JSON.stringify(state, null, 2));
    return;
  }

  if (args.includes('--step')) {
    const ctx = nextInstruction(requirement);
    console.log(ctx.instruction);
    return;
  }

  if (args.includes('--auto')) {
    const log = runAuto(requirement);
    console.log(log.join('\n'));
    return;
  }

  // 默认: 输出 full context 给 AI 读
  const ctx = nextInstruction(requirement);
  console.log(JSON.stringify(ctx, null, 2));
}

if (require.main === module) main();

module.exports = { nextInstruction, runAuto, PHASE_ROUTING };
