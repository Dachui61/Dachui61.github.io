#!/usr/bin/env bash
#
# Publish one episode of the daily hot-video series.
#
#   scripts/publish-episode.sh <slug>
#
# Does, in order:
#   1. re-encode the episode for the web (the master is 300–400 MB; a web
#      delivery copy is ~5 MB)
#   2. re-encode the poster to WebP and put it in public/media/films/
#   3. create or update the GitHub Release that holds the video file
#   4. regenerate content/films/<slug>.md
#   5. commit and push — GitHub Actions redeploys the site
#
# The video file never enters this repository: a single file over 100 MB is
# rejected by GitHub, and one episode a day would push the repository well
# past the size it should be. The release URL is derived from the slug, so
# publishing never touches the content file.
#
set -euo pipefail

SLUG="${1:?用法: scripts/publish-episode.sh <slug>}"
SITE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE="${WORKSPACE:-$(cd "$SITE_ROOT/.." && pwd)}"
# 默认在 $WORKSPACE/motions 与 ~/Documents/motions 里找 episodes
if [ -z "${EPISODES:-}" ]; then
  for CAND in "$WORKSPACE/motions/daily-hot-video/episodes" "$HOME/Documents/motions/daily-hot-video/episodes"; do
    [ -d "$CAND" ] && EPISODES="$CAND" && break
  done
  EPISODES="${EPISODES:-$WORKSPACE/motions/daily-hot-video/episodes}"
fi
RELEASE_REPO="${RELEASE_REPO:-Dachui61/daily-hot-video}"
FF="${FF:-$(command -v ffmpeg || true)}"
if [ -z "$FF" ]; then
  FF=$(find "$HOME/.dsh" -type f -name 'ffmpeg-macos-*' 2>/dev/null | head -1)
fi
PY="${PY:-python3}"
if ! "$PY" -c "import PIL" 2>/dev/null; then
  for CAND in "$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3" python3; do
    [ -x "$CAND" ] && "$CAND" -c "import PIL" 2>/dev/null && PY="$CAND" && break
  done
fi

EP="$EPISODES/$SLUG"
MASTER="$EP/out/final.mp4"
POSTER="$EP/out/poster.png"

[ -f "$MASTER" ] || { echo "找不到母带：$MASTER" >&2; exit 1; }
[ -n "$FF" ] || { echo "找不到 ffmpeg" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "▸ 1/5 重编码视频"
$FF -hide_banner -loglevel error -y -i "$MASTER" \
  -c:v libx264 -crf 27 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 128k "$TMP/$SLUG.mp4"
printf "  %s → %.1f MB\n" "$SLUG" "$(awk "BEGIN{print $(stat -f%z "$TMP/$SLUG.mp4")/1048576}")"

echo "▸ 2/5 poster → WebP"
mkdir -p "$SITE_ROOT/public/media/films"
if [ -f "$POSTER" ]; then
  $PY - "$POSTER" "$SITE_ROOT/public/media/films/$SLUG-poster.webp" <<'EOF'
import sys
from PIL import Image
Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2], 'WEBP', quality=84, method=6)
EOF
  echo "  ok"
fi

echo "▸ 3/5 上传到 release"
if gh release view "$SLUG" --repo "$RELEASE_REPO" >/dev/null 2>&1; then
  # Replace the asset on an existing release.
  ASSET_ID=$(gh api "repos/$RELEASE_REPO/releases/tags/$SLUG" --jq '.assets[0].id')
  gh api -X DELETE "repos/$RELEASE_REPO/releases/assets/$ASSET_ID" >/dev/null
  gh release upload "$SLUG" "$TMP/$SLUG.mp4" --repo "$RELEASE_REPO" --clobber
  echo "  已更新已有 release"
else
  TITLE=$($PY - "$EP/brief.md" <<'EOF'
import re, sys
t = open(sys.argv[1], encoding='utf-8').read()
m = re.search(r'^主题：(.+)$', t, re.M)
print((m.group(1).replace('**', '').strip().rstrip('。') if m else 'Daily hot take'))
EOF
)
  gh release create "$SLUG" "$TMP/$SLUG.mp4" --repo "$RELEASE_REPO" \
    --title "$TITLE" \
    --notes "每日热点 · 科普短视频

展示页与口播稿、来源清单：https://dachui61.github.io/films/$SLUG/" >/dev/null
  echo "  新建 release：$TITLE"
fi

echo "▸ 4/5 生成条目"
cd "$SITE_ROOT"
node scripts/sync-films.mjs | tail -2

echo "▸ 5/5 提交并推送"
git add -A
git commit -q -m "feat(短片): $SLUG

视频文件放在 $RELEASE_REPO 的 release 里，不进本仓库。"
git push origin main
echo "  已推送，GitHub Actions 会重新部署。"

echo
echo "完成。线上：https://dachui61.github.io/films/$SLUG/"
