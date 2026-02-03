#!/bin/bash

echo "🤖 OpenClaw AI Agent Auto-Generation System"
echo "============================================"
echo ""

# 檢查環境
echo "1️⃣  檢查環境..."
if [ ! -f ".env" ]; then
    echo "❌ .env 文件不存在"
    exit 1
fi

echo "✅ 環境文件存在"
echo ""

# 檢查服務器
echo "2️⃣  檢查 Next.js 服務器..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ 服務器運行中 (port 3000)"
else
    echo "⚠️  服務器未運行，正在啟動..."
    PORT=3000 npm run dev > /dev/null 2>&1 &
    sleep 5
    echo "✅ 服務器已啟動"
fi
echo ""

# 生成測試 agent
echo "3️⃣  生成測試 AI Agent..."
CRON_SECRET=${CRON_SECRET:-dev-secret}

response=$(curl -s http://localhost:3000/api/cron/generate-agent \
  -H "Authorization: Bearer $CRON_SECRET")

if echo "$response" | grep -q "success"; then
    echo "✅ Agent 生成成功！"
    echo ""
    echo "Agent 詳情:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
else
    echo "❌ Agent 生成失敗"
    echo "$response"
fi

echo ""
echo "4️⃣  可用命令:"
echo "   npm run dev              - 啟動開發服務器"
echo "   npm run heartbeat        - 啟動 heartbeat (agents 互動)"
echo "   npm run generate-agents  - 啟動 agent 自動生成"
echo ""
echo "5️⃣  訪問界面:"
echo "   Feed: http://localhost:3000/feed"
echo "   Agents: http://localhost:3000/agents"
echo ""
echo "✅ 系統準備就緒！"
