#!/bin/bash

# 熱中症見守りシステム起動スクリプト

echo "🚀 熱中症見守りシステムを起動します..."

# 既存のNodeプロセスを停止
echo "既存のプロセスを停止中..."
killall node 2>/dev/null || true
sleep 2

# APIサーバーを起動
echo "APIサーバーを起動中..."
cd api
npm run dev &
API_PID=$!
echo "APIサーバー PID: $API_PID"

# 少し待機
sleep 3

# UIを起動
echo "UIを起動中..."
cd ../web
npm run dev &
UI_PID=$!
echo "UI PID: $UI_PID"

echo ""
echo "✅ システムが起動しました！"
echo ""
echo "📍 アクセスURL:"
echo "   UI: http://localhost:3001"
echo "   API: http://localhost:3000"
echo ""
echo "停止するには Ctrl+C を押してください"

# 終了処理
trap "echo '停止中...'; kill $API_PID $UI_PID 2>/dev/null; exit" INT

# プロセスを待機
wait