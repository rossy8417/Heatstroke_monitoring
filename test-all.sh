#!/bin/bash

# 熱中症監視システム - 全テスト実行スクリプト
# 使用方法: ./test-all.sh

echo "🚀 熱中症監視システム - 全体テスト開始"
echo "=================================="

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# エラーカウンター
errors=0

# 基本ヘルスチェック
echo -e "\n${YELLOW}1. 基本ヘルスチェック実行中...${NC}"
if node test-simple.js; then
    echo -e "${GREEN}✅ 基本ヘルスチェック成功${NC}"
else
    echo -e "${RED}❌ 基本ヘルスチェック失敗${NC}"
    ((errors++))
fi

# APIテスト（簡易版）
echo -e "\n${YELLOW}2. API詳細テスト実行中...${NC}"
if curl -f -s http://localhost:3000/api/alerts/today > /dev/null; then
    echo -e "${GREEN}✅ アラートAPI正常${NC}"
else
    echo -e "${RED}❌ アラートAPI異常${NC}"
    ((errors++))
fi

if curl -f -s http://localhost:3000/api/weather > /dev/null; then
    echo -e "${GREEN}✅ 気象API正常${NC}"
else
    echo -e "${RED}❌ 気象API異常${NC}"
    ((errors++))
fi

# フロントエンドの基本確認
echo -e "\n${YELLOW}3. フロントエンド確認中...${NC}"
if curl -f -s http://localhost:3001 > /dev/null; then
    echo -e "${GREEN}✅ フロントエンド正常${NC}"
else
    echo -e "${RED}❌ フロントエンド異常${NC}"
    ((errors++))
fi

# Playwrightテスト（オプション）
echo -e "\n${YELLOW}4. E2Eテスト実行中...${NC}"
cd web
if npx playwright --version > /dev/null 2>&1; then
    if npx playwright test tests/simple-e2e.js --timeout=10000; then
        echo -e "${GREEN}✅ E2Eテスト成功${NC}"
    else
        echo -e "${RED}❌ E2Eテスト失敗${NC}"
        ((errors++))
    fi
else
    echo -e "${YELLOW}⚠️  Playwright未インストール - E2Eテストスキップ${NC}"
fi
cd ..

# 結果サマリー
echo -e "\n=================================="
if [ $errors -eq 0 ]; then
    echo -e "${GREEN}🎉 すべてのテストが成功しました！${NC}"
    echo -e "${GREEN}システムは正常に動作しています。${NC}"
    exit 0
else
    echo -e "${RED}⚠️  $errors 個のテストが失敗しました。${NC}"
    echo -e "${RED}ログを確認して問題を修正してください。${NC}"
    exit 1
fi