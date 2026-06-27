#!/bin/bash
# dev-mgmt-task-board / Surge デプロイスクリプト
# 使い方:
#   ./scripts/deploy.sh                                        # docs/mockup-ideal.html を既定スラッグで公開
#   ./scripts/deploy.sh docs/mockup-ideal.html                 # ファイル指定
#   ./scripts/deploy.sh docs/presentation-diagram.html my-slug # ファイル + スラッグ指定
# HTML と同じフォルダの screenshots/ assets/ images/ も自動で同梱する
set -e

HTML_FILE="${1:-docs/mockup-ideal.html}"
SLUG="${2:-dev-mgmt-task-board-$(date +%Y%m%d)}"
DOMAIN="${SLUG}.surge.sh"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 前提チェック
if ! command -v node &>/dev/null; then
  echo -e "${RED}エラー: Node.js が見つかりません${NC}" >&2; exit 1
fi
if [ ! -f "$HTML_FILE" ]; then
  echo -e "${RED}エラー: $HTML_FILE が見つかりません${NC}" >&2; exit 1
fi

# 一時ディレクトリに index.html としてコピー（同梱アセットも含める）
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT
cp "$HTML_FILE" "$TEMP_DIR/index.html"
printf "User-agent: *\nDisallow: /\n" > "$TEMP_DIR/robots.txt"

HTML_DIR=$(cd "$(dirname "$HTML_FILE")" && pwd)
for ASSET_DIR in screenshots assets images; do
  if [ -d "${HTML_DIR}/${ASSET_DIR}" ]; then
    cp -R "${HTML_DIR}/${ASSET_DIR}" "$TEMP_DIR/${ASSET_DIR}"
    echo -e "${GREEN}同梱: ${ASSET_DIR}/${NC}"
  fi
done

echo -e "${YELLOW}Surge にアップロード中: https://${DOMAIN}${NC}"
npx --yes surge "$TEMP_DIR" --domain "$DOMAIN"

# デプロイ履歴を記録
HISTORY_FILE="scripts/deploy-history.log"
touch "$HISTORY_FILE"
echo "$(date '+%Y-%m-%d %H:%M:%S') | https://${DOMAIN} | ${HTML_FILE}" >> "$HISTORY_FILE"

echo ""
echo -e "${GREEN}完了！${NC}"
echo "URL: https://${DOMAIN}"

# macOS: クリップボードにコピー＆ブラウザで開く
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "https://${DOMAIN}" | pbcopy
  echo -e "${GREEN}URL をクリップボードにコピーしました${NC}"
  open "https://${DOMAIN}"
fi

echo -e "${YELLOW}削除するとき: npx surge teardown ${DOMAIN}${NC}"
