#!/bin/bash

# 熱中症見守りシステム停止スクリプト

echo "🛑 熱中症見守りシステムを停止します..."

# Nodeプロセスを停止
killall node 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ システムを停止しました"
else
    echo "ℹ️  実行中のプロセスはありません"
fi