#!/usr/bin/env bash
#
# Record the live Vitals panel and encode it for the web.
#
# Produces, in public/media/:
#   <name>.webm          VP9 — modern browsers, smallest file
#   <name>.mp4           H.264 — Safari and anything else
#   <name>-poster.jpg    first frame, used as the <video poster> and as the
#                        reduced-motion fallback
#
# Requirements:
#   - the screen must be UNLOCKED (a locked screen cannot show GUI windows)
#   - macOS Screen Recording permission for the terminal running this script
#   - Accessibility permission, so the menu bar item can be clicked
#
# Usage:
#   scripts/record-demo.sh [name]      # default: vitals-demo
#
set -uo pipefail

NAME="${1:-vitals-demo}"
SITE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$SITE_ROOT/public/media"
WORKSPACE="${WORKSPACE:-$(cd "$SITE_ROOT/.." && pwd)}"
APP="$WORKSPACE/build/Vitals.app/Contents/MacOS/Vitals"

FF="${FF:-$(command -v ffmpeg || true)}"
if [ -z "$FF" ]; then
  echo "找不到 ffmpeg。装一个，或者设 FF=/path/to/ffmpeg" >&2
  exit 1
fi

mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

osa() { osascript -e "$1" 2>/dev/null; }

echo "▸ 启动 Vitals"
pkill -9 -f "Vitals.app/Contents/MacOS/Vitals" 2>/dev/null
sleep 2
[ -x "$APP" ] || { echo "找不到 $APP —— 先跑 scripts/build.sh" >&2; exit 1; }
nohup "$APP" > "$TMP/vitals.log" 2>&1 &

for _ in $(seq 1 20); do
  sleep 2
  n=$(osa 'tell application "System Events" to tell process "Vitals" to get count of menu bar items of menu bar 1')
  [ "$n" = "1" ] && break
done

echo "▸ 打开悬浮窗"
opened=0
for attempt in 1 2 3 4 5; do
  osa 'tell application "System Events" to tell process "Vitals" to click menu bar item 1 of menu bar 1'
  sleep 3
  osa 'tell application "System Events" to tell process "Vitals" to click menu item "显示悬浮窗" of menu 1 of menu bar item 1 of menu bar 1'
  sleep 3
  osa 'tell application "Vitals" to activate'
  sleep 2
  w=$(osa 'tell application "System Events" to tell process "Vitals" to get count of windows')
  if [ "${w:-0}" -ge 1 ] 2>/dev/null; then opened=1; break; fi
  echo "  第 $attempt 次：面板还没出现，重试"
done
[ "$opened" = "1" ] || { echo "打不开悬浮窗 —— 屏幕是不是锁着？解锁后再试。" >&2; exit 1; }

echo "▸ 设置成 L3 尺寸（4 个指标块 + 温度刻度条，不含进程列表）"
osa 'tell application "System Events" to tell process "Vitals" to set size of window 1 to {860, 410}'
sleep 3
osa 'tell application "System Events" to tell process "Vitals" to set position of window 1 to {60, 120}'
sleep 3

GEO=$(osa 'tell application "System Events" to tell process "Vitals" to get {position, size} of window 1')
X=$(echo "$GEO" | cut -d, -f1); Y=$(echo "$GEO" | cut -d, -f2); W=$(echo "$GEO" | cut -d, -f4)
echo "  录制区域（逻辑点）：${X},${Y},${W}"

echo "▸ 录制 10 秒"
screencapture -R "${X},${Y},${W},410" -v "$TMP/raw.mov" 2>/dev/null &
sleep 11
pkill -INT -f "screencapture -R" 2>/dev/null
sleep 2
[ -s "$TMP/raw.mov" ] || { echo "没录到画面" >&2; exit 1; }

echo "▸ 编码"
$FF -hide_banner -loglevel error -y -i "$TMP/raw.mov" -vf "scale=1720:820,fps=30" \
  -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -an "$OUT/$NAME.webm"
$FF -hide_banner -loglevel error -y -i "$TMP/raw.mov" -vf "scale=1720:820,fps=30" \
  -c:v libx264 -crf 27 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart -an "$OUT/$NAME.mp4"
$FF -hide_banner -loglevel error -y -ss 1.5 -i "$OUT/$NAME.mp4" -frames:v 1 -vf "scale=1720:820" -q:v 4 "$OUT/$NAME-poster.jpg"

for f in "$NAME.webm" "$NAME.mp4" "$NAME-poster.jpg"; do
  printf "  %-26s %6s KB\n" "$f" "$(du -k "$OUT/$f" | cut -f1)"
done
echo "▸ 完成。提交 public/media/ 就会自动重新部署。"
