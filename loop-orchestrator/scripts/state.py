#!/usr/bin/env python3
"""loop-orchestrator 状态机。fork 自 .claude/skills/loop-control/scripts/loop_state.py。

段 2 改造:
  - 新增子命令: set-size <trivial|small|standard|large>, rebuild-capabilities, version
  - 写入改原子: write .tmp + os.replace, 缓解 R4 (Windows 文件系统非原子)
  - startup schema 校验: 损坏从 .bak 恢复; 双重损坏则 exit 5
  - 路径: 显式锚定到 wrapper 根 (脚本所在目录上溯 2 级)
  - 保留原 10 子命令全部签名及语义

用法:
  state.py init [--max-rounds 4] [--max-plan-attempts 2]
  state.py get
  state.py set-phase <PHASE>
  state.py record-issue --sig <sig> [--detail ...]
  state.py next-round
  state.py reset
  state.py set-baseline --data <json>
  state.py get-baseline
  state.py record-decision --question ... --chosen ... --why ... --reversible yes|no
  state.py list-decisions
  state.py set-size <trivial|small|standard|large>     # 段 2 新增
  state.py rebuild-capabilities                         # 段 2 新增
  state.py version                                      # 段 2 新增

退出码:
  0 正常
  2 非法状态流转
  3 ESCALATE / 配额用尽
  4 REPLAN (尚未到配额尽)
  5 schema 校验失败且 .bak 损坏
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import datetime
import shutil
import subprocess
from pathlib import Path

# ---------------------------------------------------------------------------
# Wrapper 根探测 — 让脚本无论从哪个 cwd 跑都能找到 loop-orchestrator/.
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
# scripts/state.py → scripts/.. = loop-orchestrator/ ; ../.. = wrapper 根
WRAPPER_ROOT = SCRIPT_DIR.parent.parent
LOOP_ORCH_ROOT = SCRIPT_DIR.parent
STATE_DIR = WRAPPER_ROOT / ".ai" / "loop"
STATE_FILE = STATE_DIR / "state.json"
STATE_BAK = STATE_DIR / "state.json.bak"
LOG_FILE = STATE_DIR / "LOOP_LOG.md"
SCHEMA_FILE = LOOP_ORCH_ROOT / "state.schema.json"
CAPABILITIES_FILE = LOOP_ORCH_ROOT / "capabilities.json"
SCANNER_SCRIPT = LOOP_ORCH_ROOT / "scripts" / "capability-scanner.js"

# ---------------------------------------------------------------------------
# 状态机
# ---------------------------------------------------------------------------

PHASES = ["INIT", "CONTEXT", "REQUIREMENT", "PLAN", "CODE",
          "VERIFY", "REVIEW", "FIX", "DELIVER", "SAFE_STOP"]

TRANSITIONS = {
    "INIT":        ["CONTEXT"],
    "CONTEXT":     ["REQUIREMENT"],
    "REQUIREMENT": ["PLAN", "REQUIREMENT"],
    "PLAN":        ["CODE", "PLAN"],
    "CODE":        ["VERIFY"],
    "VERIFY":      ["REVIEW", "FIX"],
    "REVIEW":      ["DELIVER", "FIX"],
    "FIX":         ["VERIFY", "PLAN"],
    "DELIVER":     [],
    "SAFE_STOP":   ["DELIVER"],
}

SIZES = ["trivial", "small", "standard", "large"]

__VERSION__ = "loop-orchestrator/0.1.0"


def now() -> str:
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ---------------------------------------------------------------------------
# 原子 IO + schema 校验
# ---------------------------------------------------------------------------

def _validate_or_raise(data: dict) -> None:
    if not SCHEMA_FILE.exists():
        print(f"WARN: schema not found at {SCHEMA_FILE}", file=sys.stderr)
        return
    try:
        import importlib.util
        if importlib.util.find_spec("jsonschema") is not None:
            from jsonschema import Draft202012Validator
            schema = json.loads(SCHEMA_FILE.read_text(encoding="utf-8"))
            Draft202012Validator(schema).validate(data)
            return
    except Exception:
        pass
    # 最小化校验: 必填字段 + phase 在枚举
    for k in ("phase", "round", "max_rounds", "autonomous",
              "created_at", "updated_at"):
        if k not in data:
            raise ValueError(f"schema-missing-required-field: {k}")
    if data["phase"] not in PHASES:
        raise ValueError(f"schema-invalid-phase: {data['phase']}")
    if data.get("ecc_size") and data["ecc_size"] not in SIZES:
        raise ValueError(f"schema-invalid-ecc-size: {data['ecc_size']}")


def load() -> dict:
    if not STATE_FILE.exists():
        sys.exit("state.json 不存在, 请先执行: state.py init")

    try:
        data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        _validate_or_raise(data)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"WARN: state.json failed validation ({e}); trying .bak", file=sys.stderr)
        if STATE_BAK.exists():
            try:
                data = json.loads(STATE_BAK.read_text(encoding="utf-8"))
                _validate_or_raise(data)
                _atomic_write(data)
                print("OK: recovered from .bak", file=sys.stderr)
                return data
            except Exception as e2:
                print(f"ERROR: .bak also corrupt ({e2}); exit 5", file=sys.stderr)
                sys.exit(5)
        else:
            sys.exit(5)

    return data


def _atomic_write(data: dict) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    if STATE_FILE.exists():
        try:
            shutil.copy2(STATE_FILE, STATE_BAK)
        except Exception:
            pass
    tmp = STATE_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2),
                   encoding="utf-8")
    os.replace(tmp, STATE_FILE)


def save(data: dict) -> None:
    _validate_or_raise(data)
    _atomic_write(data)


def log(line: str) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(f"- [{now()}] {line}\n")


# ---------------------------------------------------------------------------
# 子命令
# ---------------------------------------------------------------------------

def cmd_version(_):
    print(__VERSION__)


def cmd_init(args):
    data = {
        "phase": "INIT",
        "round": 0,
        "max_rounds": args.max_rounds,
        "plan_attempts": 0,
        "max_plan_attempts": args.max_plan_attempts,
        "autonomous": True,
        "issues": [],
        "decisions": [],
        "created_at": now(),
        "updated_at": now(),
    }
    save(data)
    log(f"[round 0][INIT] 循环初始化 max_rounds={args.max_rounds}")
    print(json.dumps(data, ensure_ascii=False))


def cmd_get(_):
    print(json.dumps(load(), ensure_ascii=False))


def cmd_set_phase(args):
    data = load()
    cur, new = data["phase"], args.phase.upper()
    if new not in PHASES:
        sys.exit(f"未知状态: {new}")
    if new not in TRANSITIONS.get(cur, []):
        print(f"非法流转: {cur} -> {new}; 允许: {TRANSITIONS.get(cur)}",
              file=sys.stderr)
        sys.exit(2)
    data["phase"], data["updated_at"] = new, now()
    save(data)
    log(f"[round {data['round']}][{cur}→{new}] 状态推进")
    print(f"OK {cur} -> {new}")


def cmd_record_issue(args):
    data = load()
    data["issues"].append({"round": data["round"], "sig": args.sig,
                           "detail": args.detail or "", "at": now()})
    data["updated_at"] = now()
    save(data)
    log(f"[round {data['round']}][{data['phase']}] 记录问题: {args.sig}")
    print("OK issue recorded")


def _degrade(data, reason):
    if data["plan_attempts"] < data["max_plan_attempts"]:
        data["plan_attempts"] += 1
        data["round"] = 0
        data["issues"] = []
        data["phase"] = "PLAN"
        save(data)
        log(f"[REPLAN #{data['plan_attempts']}] {reason} → 自动回退 PLAN 换方案")
        print(f"REPLAN attempt={data['plan_attempts']}/{data['max_plan_attempts']}: "
              f"{reason}。强制要求: 新 PLAN 必须与上一方案有实质差异并写明"
              f"『上一方案失败根因』, 禁止换皮重试。")
        sys.exit(4)
    data["phase"] = "SAFE_STOP"
    save(data)
    log(f"[SAFE_STOP] {reason}, 重规划配额已用尽")
    print("SAFE_STOP: 自动重规划配额用尽。停止改动, 回退未完成部分到最近绿色"
          "提交, 按 state-templates/SAFE_STOP.md 产出诚实的部分交付报告后"
          " set-phase DELIVER 收尾。禁止继续任何修复尝试。")
    sys.exit(3)


def cmd_next_round(_):
    data = load()
    data["round"] += 1
    if data["round"] > data["max_rounds"]:
        _degrade(data, f"修复轮次超限({data['max_rounds']})")
        return
    sigs_by_round = {}
    for i in data["issues"]:
        sigs_by_round.setdefault(i["round"], set()).add(i["sig"])
    last, prev = data["round"] - 1, data["round"] - 2
    repeated = sigs_by_round.get(last, set()) & sigs_by_round.get(prev, set())
    if repeated:
        _degrade(data, f"同一问题连续两轮未修复{sorted(repeated)}")
        return
    data["updated_at"] = now()
    save(data)
    log(f"[round {data['round']}] 进入新一轮修复")
    print(f"CONTINUE round={data['round']}/{data['max_rounds']}")


def cmd_set_baseline(args):
    data = load()
    data["baseline"] = json.loads(args.data)
    data["updated_at"] = now()
    save(data)
    log(f"[round {data['round']}] 基线记录: {args.data}")
    print("OK baseline recorded")


def cmd_get_baseline(_):
    data = load()
    if "baseline" not in data:
        sys.exit("尚未记录基线 — CONTEXT 阶段须执行 set-baseline")
    print(json.dumps(data["baseline"], ensure_ascii=False))


def cmd_record_decision(args):
    data = load()
    data.setdefault("decisions", []).append(
        {"phase": data["phase"], "question": args.question, "chosen": args.chosen,
         "why": args.why, "reversible": args.reversible, "at": now()})
    data["updated_at"] = now()
    save(data)
    log(f"[{data['phase']}][自主决策] {args.question} → {args.chosen}")
    print("OK decision recorded")


def cmd_list_decisions(_):
    print(json.dumps(load().get("decisions", []), ensure_ascii=False, indent=2))


def cmd_reset(_):
    if STATE_FILE.exists():
        STATE_FILE.unlink()
    log("状态已重置")
    print("OK reset")


# ---- 段 2 新增子命令 -----------------------------------------------------

def cmd_set_size(args):
    if args.size not in SIZES:
        sys.exit(f"未知 size: {args.size}; 允许: {SIZES}")
    data = load()
    data["ecc_size"] = args.size
    data["updated_at"] = now()
    save(data)
    log(f"[{data['phase']}][size] {args.size}")
    print(f"OK size={args.size}")


def cmd_rebuild_capabilities(_):
    if not SCANNER_SCRIPT.exists():
        sys.exit(f"capability-scanner.js 不存在: {SCANNER_SCRIPT}")
    print(f"Running: node {SCANNER_SCRIPT} --out {CAPABILITIES_FILE}")
    rc = subprocess.call(["node", str(SCANNER_SCRIPT),
                          "--out", str(CAPABILITIES_FILE)])
    if rc != 0:
        sys.exit(f"capability-scanner.js exit={rc}")
    if not CAPABILITIES_FILE.exists():
        sys.exit("capabilities.json 未生成")
    import hashlib
    mtime = CAPABILITIES_FILE.stat().st_mtime
    payload = f"{CAPABILITIES_FILE}|{mtime}"
    h = hashlib.md5(payload.encode()).hexdigest()
    data = load()
    data["capabilities_cache_hash"] = h
    data["updated_at"] = now()
    save(data)
    log(f"[rebuild-capabilities] hash={h} mtime={mtime}")
    print(f"OK hash={h}")


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("init")
    s.add_argument("--max-rounds", type=int, default=4)
    s.add_argument("--max-plan-attempts", type=int, default=2)
    s.set_defaults(fn=cmd_init)

    sub.add_parser("get").set_defaults(fn=cmd_get)

    s = sub.add_parser("set-phase")
    s.add_argument("phase")
    s.set_defaults(fn=cmd_set_phase)

    s = sub.add_parser("record-issue")
    s.add_argument("--sig", required=True)
    s.add_argument("--detail")
    s.set_defaults(fn=cmd_record_issue)

    sub.add_parser("next-round").set_defaults(fn=cmd_next_round)

    s = sub.add_parser("set-baseline")
    s.add_argument("--data", required=True)
    s.set_defaults(fn=cmd_set_baseline)

    sub.add_parser("get-baseline").set_defaults(fn=cmd_get_baseline)

    s = sub.add_parser("record-decision")
    s.add_argument("--question", required=True)
    s.add_argument("--chosen", required=True)
    s.add_argument("--why", required=True)
    s.add_argument("--reversible", required=True, choices=["yes", "no"])
    s.set_defaults(fn=cmd_record_decision)

    sub.add_parser("list-decisions").set_defaults(fn=cmd_list_decisions)
    sub.add_parser("reset").set_defaults(fn=cmd_reset)
    sub.add_parser("version").set_defaults(fn=cmd_version)

    s = sub.add_parser("set-size")
    s.add_argument("size", choices=SIZES)
    s.set_defaults(fn=cmd_set_size)

    sub.add_parser("rebuild-capabilities").set_defaults(fn=cmd_rebuild_capabilities)

    args = p.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
