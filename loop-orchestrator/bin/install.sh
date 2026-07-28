#!/usr/bin/env bash
# install.sh — shim: forward to install.js (Node). 路径探测全在 JS 里.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/install.js" "$@"
