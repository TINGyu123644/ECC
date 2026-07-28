#!/usr/bin/env bash
# verify.sh — loop-orchestrator 门禁。fork 自 .claude/skills/verify-gate/scripts/verify.sh。
#
# 段 2 改造:
#   - 顶部 cd "$(dirname "$0")/../.." 锚定到 wrapper 根 (缓解 R2)
#   - 入口加 0. CMD_SIZE_CLASSIFY (lint 前), 强制 size 已知
#   - 5 层后追加 6. CMD_SECURITY_GATE (security trigger 命中时跑)
#   - 7. CMD_CAPABILITY_REBUILD (capabilities.json 过期 >7 天时跑)
#
# 设计: 失败立即整体 FAIL, 但每层单独记入 verify_report.md。
# 退出: 0=PASS, 1=FAIL (任何一层失败)
set -u

# --- 路径锚定 ------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WRAPPER_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$WRAPPER_ROOT" || { echo "FATAL: cannot cd to wrapper root $WRAPPER_ROOT" >&2; exit 2; }

ENV_FILE=".ai/loop/commands.env"
REPORT=".ai/loop/verify_report.md"
CAPABILITIES="loop-orchestrator/capabilities.json"
SIZECLI="loop-orchestrator/scripts/size-classify.js"
mkdir -p .ai/loop

# --- 0. size classify (新加) -----------------------------------------------
overall=PASS
SIZE_RESULT=""
{
  echo "# Verify Report"
  echo ""
  echo "- 时间: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "- 分支: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo n/a)"
  echo ""
} > "$REPORT"

run_step() {
  local name="$1" cmd="$2"
  if [[ -z "$cmd" ]]; then
    echo "## $name: SKIPPED (未配置)" >> "$REPORT"; echo "" >> "$REPORT"
    return 0
  fi
  local out rc
  out=$(bash -c "$cmd" 2>&1); rc=$?
  if [[ $rc -eq 0 ]]; then
    echo "## $name: PASS" >> "$REPORT"
  else
    overall=FAIL
    {
      echo "## $name: FAIL (exit=$rc)"
      echo '```'
      echo "$out" | tail -n 60
      echo '```'
    } >> "$REPORT"
  fi
  echo "" >> "$REPORT"
  return $rc
}

# 0. size classify — 强制 size 已知; 无 diff 时 SKIPPED
if [[ -f "$SIZECLI" ]]; then
  size_out=$(node "$SIZECLI" --dry-run 2>&1); size_rc=$?
  if [[ $size_rc -eq 0 ]]; then
    SIZE_RESULT=$(echo "$size_out" | tail -n 1 | awk '{print $NF}')
    echo "## 0. size-classify: PASS ($SIZE_RESULT)" >> "$REPORT"
  else
    echo "## 0. size-classify: SKIPPED (size-classify non-zero)" >> "$REPORT"
  fi
  echo "" >> "$REPORT"
else
  echo "## 0. size-classify: SKIPPED ($SIZECLI 不存在)" >> "$REPORT"
  echo "" >> "$REPORT"
fi

# --- 加载 commands.env ----------------------------------------------------
if [[ ! -f "$ENV_FILE" ]]; then
  echo "缺少 $ENV_FILE — 需先完成 CONTEXT 阶段。模板:" >&2
  cat >&2 << 'TPL'
CMD_FMT="npm run format:check"
CMD_LINT="npm run lint"
CMD_TYPECHECK="npx tsc --noEmit"
CMD_TEST="npm test"
CMD_SIZE_CLASSIFY="node loop-orchestrator/scripts/size-classify.js"
CMD_SECURITY_GATE="node loop-orchestrator/scripts/security-gate.js"
TPL
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

# --- 1-4 层 (保留原 5 层逻辑) ---------------------------------------------
run_step "1. 格式化检查" "${CMD_FMT:-}"
run_step "2. Lint"       "${CMD_LINT:-}"
run_step "3. 类型检查/编译" "${CMD_TYPECHECK:-}"
run_step "4. 测试"       "${CMD_TEST:-}"

# --- 5. 差异纯净 -----------------------------------------------------------
if git rev-parse --git-dir >/dev/null 2>&1; then
  ws=$(git diff --check 2>&1 || true)
  sup=$(git diff -U0 2>/dev/null | grep -E '^\+.*(eslint-disable|#\[allow|# *type: *ignore|@SuppressWarnings|noqa)' || true)
  if [[ -z "$ws" && -z "$sup" ]]; then
    echo "## 5. 差异纯净: PASS" >> "$REPORT"
  else
    overall=FAIL
    {
      echo "## 5. 差异纯净: FAIL"
      [[ -n "$ws"  ]] && { echo "空白错误:"; echo '```'; echo "$ws" | tail -n 20; echo '```'; }
      [[ -n "$sup" ]] && { echo "疑似新增告警抑制标记:"; echo '```'; echo "$sup" | tail -n 20; echo '```'; }
    } >> "$REPORT"
  fi
  echo "" >> "$REPORT"
else
  echo "## 5. 差异纯净: SKIPPED (非 git 仓库)" >> "$REPORT"; echo "" >> "$REPORT"
fi

# --- 6. 项目自有门禁 -------------------------------------------------------
run_step "6. 项目自有门禁" "${CMD_PROJECT_GATE:-}"

# --- 7. security gate (新加; 抄自 ECC-main/workflows/orch-review.workflow.js:58-59) ---
SECURITY_TRIGGER='\b(auth|login|password|passwd|token|secret|credential|api[_-]?key|session|jwt|oauth|cookie|sql|query|exec|eval|crypto|cipher|hash|hmac|sign|fs\.|readFile|writeFile|fetch|axios|request|subprocess|os\.system)\b'
security_needed=0
if git rev-parse --git-dir >/dev/null 2>&1; then
  if git diff -U0 2>/dev/null | grep -E -i "$SECURITY_TRIGGER" >/dev/null 2>&1; then
    security_needed=1
  fi
  if git diff --name-only 2>/dev/null | grep -E -i "$SECURITY_TRIGGER" >/dev/null 2>&1; then
    security_needed=1
  fi
fi
if [[ $security_needed -eq 1 ]]; then
  # 默认指向 loop-orchestrator/scripts/security-gate.js (P1 段 2)
  # 命令未配置时用这个默认值, 替代 SKIPPED
  security_gate_cmd="${CMD_SECURITY_GATE:-node loop-orchestrator/scripts/security-gate.js}"
  run_step "7. security_gate (trigger 命中)" "$security_gate_cmd"
  security_gate_rc=$?
  if [[ $security_gate_rc -ne 0 ]]; then
    echo "  ↑ security_gate FAIL exit=$security_gate_rc" >> "$REPORT"
  fi
else
  echo "## 7. security_gate: SKIPPED (no security trigger in diff)" >> "$REPORT"
  echo "" >> "$REPORT"
fi

# --- 8. capability rebuild (新加; capabilities.json >7 天时) ---------------
if [[ -f "$CAPABILITIES" ]]; then
  age_days=$(node -e "const s=require('fs').statSync('$CAPABILITIES'); console.log(((Date.now()-s.mtimeMs)/86400000).toFixed(2))")
  if (( $(echo "$age_days > 7" | bc -l 2>/dev/null || echo 0) )); then
    if [[ -n "${CMD_CAPABILITY_REBUILD:-}" ]]; then
      run_step "8. capability_rebuild (capabilities.json ${age_days}d old)" "$CMD_CAPABILITY_REBUILD"
    else
      echo "## 8. capability_rebuild: WARN (capabilities.json ${age_days}d old, CMD_CAPABILITY_REBUILD 未配置)" >> "$REPORT"
      echo "" >> "$REPORT"
    fi
  else
    echo "## 8. capability_rebuild: PASS (capabilities.json ${age_days}d old)" >> "$REPORT"
    echo "" >> "$REPORT"
  fi
else
  echo "## 8. capability_rebuild: WARN (capabilities.json 缺失)" >> "$REPORT"
  echo "" >> "$REPORT"
fi

# --- 总结 -----------------------------------------------------------------
{
  echo "---"
  echo "size: $SIZE_RESULT"
  echo "RESULT: $overall"
} >> "$REPORT"

echo "size-classify: $SIZE_RESULT"
echo "RESULT: $overall (详见 $REPORT)"
[[ "$overall" == "PASS" ]]
