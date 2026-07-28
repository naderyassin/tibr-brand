#!/usr/bin/env bash
# Convert oversized landing-page PNGs to resized WebP.
#
# The source art is exported at 1024x1024 PNG (~700-980 kB each), but nothing on
# the page displays it above ~450 CSS px. PNG is also the wrong container for
# photographic art — WebP at q82 is visually indistinguishable here at roughly a
# tenth the bytes.
#
# Re-runnable: skips a target that is already newer than its source. Keep the
# PNG originals in the repo as the masters — only the .webp files are served.
#
# Usage:  bash scripts/convert-images.sh
# Needs:  ffmpeg with libwebp (ffmpeg -encoders | grep webp)

set -euo pipefail
cd "$(dirname "$0")/.."

QUALITY=82

# "<path>:<longest-edge-px>" — the edge is sized for a 2x display of the
# largest box the image is ever rendered into.
TARGETS=(
  "assets/images/promise_original.png:900"
  "assets/images/promise_inspired.png:900"
  "assets/images/promise_signature.png:900"
  "assets/images/frontier_1924.png:1000"
  "assets/images/frontier_1997.png:1000"
)

command -v ffmpeg >/dev/null || { echo "ffmpeg not found on PATH"; exit 1; }

total_before=0
total_after=0

for target in "${TARGETS[@]}"; do
  src="${target%:*}"
  edge="${target##*:}"
  out="${src%.*}.webp"

  [ -f "$src" ] || { echo "skip (missing): $src"; continue; }

  if [ -f "$out" ] && [ "$out" -nt "$src" ]; then
    echo "skip (current): $out"
  else
    # -vf scale: only shrink, never upscale a smaller source.
    ffmpeg -hide_banner -loglevel error -y -i "$src" \
      -vf "scale='min($edge,iw)':'min($edge,ih)':force_original_aspect_ratio=decrease" \
      -c:v libwebp -quality "$QUALITY" -compression_level 6 "$out"
  fi

  before=$(du -k "$src" | cut -f1)
  after=$(du -k "$out" | cut -f1)
  total_before=$((total_before + before))
  total_after=$((total_after + after))
  printf '  %-44s %5s kB -> %5s kB  (-%d%%)\n' \
    "$(basename "$out")" "$before" "$after" "$(( (before - after) * 100 / before ))"
done

echo
printf 'stills: %d kB -> %d kB  (saved %d kB, -%d%%)\n' \
  "$total_before" "$total_after" "$((total_before - total_after))" \
  "$(( (total_before - total_after) * 100 / total_before ))"

# ── Hero frame sequence ──────────────────────────────────────────────────────
# The scroll-scrubbed hero (client/src/components/ui/ScrollSequence.jsx) is the
# single heaviest asset on the site. Format only — NOT resized: the hero is
# locked per CLAUDE.md, and 1600x902 is what the canvas `cover` maths expects.
# WebP at q82 is visually indistinguishable from the JPEG source, including in
# the dark background gradient where banding would show first.
FRAME_DIR="assets/hero-frames-2"
frames_before=0
frames_after=0
converted=0

if [ -d "$FRAME_DIR" ]; then
  echo
  echo "hero frames ($FRAME_DIR):"
  for src in "$FRAME_DIR"/frame_*.jpg; do
    [ -f "$src" ] || continue
    out="${src%.jpg}.webp"

    if [ ! -f "$out" ] || [ "$src" -nt "$out" ]; then
      ffmpeg -hide_banner -loglevel error -y -i "$src" \
        -c:v libwebp -quality "$QUALITY" -compression_level 6 "$out"
      converted=$((converted + 1))
    fi

    frames_before=$((frames_before + $(du -k "$src" | cut -f1)))
    frames_after=$((frames_after + $(du -k "$out" | cut -f1)))
  done

  printf '  %d frames (%d newly converted)\n' \
    "$(ls "$FRAME_DIR"/frame_*.webp 2>/dev/null | wc -l)" "$converted"
  printf '  %d kB -> %d kB  (saved %d kB, -%d%%)\n' \
    "$frames_before" "$frames_after" "$((frames_before - frames_after))" \
    "$(( (frames_before - frames_after) * 100 / frames_before ))"
fi

echo
printf 'TOTAL: %d kB -> %d kB  (saved %d kB)\n' \
  "$((total_before + frames_before))" "$((total_after + frames_after))" \
  "$((total_before + frames_before - total_after - frames_after))"
