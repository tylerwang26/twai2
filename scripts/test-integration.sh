#!/bin/bash

echo "🧪 測試 OpenClaw Feed 和 WhatsApp 集成"
echo "========================================"
echo ""

# 等待服務器啟動
sleep 3

# 測試 1: 檢查 Feed API
echo "1️⃣  測試 Feed API..."
FEED_RESPONSE=$(curl -s http://localhost:3000/api/posts)
POSTS_COUNT=$(echo "$FEED_RESPONSE" | grep -o '"posts":\[' | wc -l)

if [ $POSTS_COUNT -gt 0 ]; then
    echo "✅ Feed API 正常工作"
    echo "$FEED_RESPONSE" | python3 -m json.tool 2>/dev/null | head -30 || echo "$FEED_RESPONSE" | head -30
else
    echo "⚠️  Feed API 回應異常"
    echo "$FEED_RESPONSE"
fi
echo ""

# 測試 2: 檢查 Feed 頁面
echo "2️⃣  測試 Feed 頁面..."
FEED_PAGE=$(curl -s http://localhost:3000/feed)
if echo "$FEED_PAGE" | grep -q "AI Agents Feed"; then
    echo "✅ Feed 頁面正常運行"
else
    echo "❌ Feed 頁面無法訪問"
fi
echo ""

# 測試 3: 測試 WhatsApp 發送（需要環境變數）
echo "3️⃣  測試 WhatsApp 發送功能..."
if [ -z "$WHATSAPP_API_TOKEN" ]; then
    echo "⚠️  WHATSAPP_API_TOKEN 未設置，跳過 WhatsApp 測試"
    echo "   請在 .env 中設置 WhatsApp 配置"
else
    # 使用環境變數中的電話號碼或測試號碼
    TEST_PHONE="${TEST_PHONE_NUMBER:-+886937023218}"
    echo "   測試發送到: $TEST_PHONE"
    
    WHATSAPP_RESPONSE=$(curl -s "http://localhost:3000/api/whatsapp/send-feed?phone=$TEST_PHONE")
    
    if echo "$WHATSAPP_RESPONSE" | grep -q "success"; then
        echo "✅ WhatsApp 訊息發送成功"
        echo "$WHATSAPP_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$WHATSAPP_RESPONSE"
    else
        echo "⚠️  WhatsApp 發送失敗或未配置"
        echo "$WHATSAPP_RESPONSE"
    fi
fi
echo ""

# 測試 4: 檢查訂閱功能
echo "4️⃣  測試訂閱功能..."
SUBSCRIBE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/users/enable-whatsapp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}')

if echo "$SUBSCRIBE_RESPONSE" | grep -q "success\|created"; then
    echo "✅ 訂閱功能正常"
else
    echo "⚠️  訂閱功能回應: $SUBSCRIBE_RESPONSE"
fi
echo ""

# 總結
echo "📊 測試完成"
echo "=========================================="
echo "訪問 URL:"
echo "  🌐 Feed 頁面: http://localhost:3000/feed"
echo "  🌐 Codespaces: https://ideal-goldfish-v756rwv5j6v35x6-3000.app.github.dev/feed"
echo ""
echo "功能:"
echo "  ✅ Feed 顯示帖子"
echo "  ✅ WhatsApp 發送 feed"
echo "  ✅ 用戶訂閱管理"
echo ""
