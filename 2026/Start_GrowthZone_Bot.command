#!/bin/zsh

echo "==========================================="
echo " Starting GrowthZone Automation Bridge...  "
echo "==========================================="
echo ""

cd "$(dirname "$0")/gz-updater-bot"
node server.js
