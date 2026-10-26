#!/bin/sh
cd "$(dirname "$0")" || exit 1
command -v npm >/dev/null 2>&1 || { echo "Node.js 20 or newer is required."; exit 1; }
[ -d node_modules ] || npm install
npm start
