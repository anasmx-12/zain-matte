#!/bin/sh
# Starts Sonic-AI and serves the whole app on http://localhost:8787 (also reachable from an iPad on the same wifi).
cd "$(dirname "$0")/.." || exit 1
[ -f dist/index.html ] || npm run build
[ -x ai/.venv/bin/python ] || python3 -m venv ai/.venv
ai/.venv/bin/python -c "import anthropic" 2>/dev/null || ai/.venv/bin/pip install -q anthropic
exec ai/.venv/bin/python ai/server.py
