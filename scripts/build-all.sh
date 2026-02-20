#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENTRY="$ROOT_DIR/sources/main.ts"
DIST_ROOT="$ROOT_DIR/dist/platforms"
ARCHIVE_ROOT="$ROOT_DIR/dist"

declare -a TARGETS=(
  "linux-x64:bun-linux-x64:mercury"
  "linux-arm64:bun-linux-arm64:mercury"
  "mac-x64:bun-darwin-x64:mercury"
  "mac-arm64:bun-darwin-arm64:mercury"
  "windows-x64:bun-windows-x64:mercury.exe"
)

build_target() {
  local name="$1"
  local bun_target="$2"
  local out_name="$3"

  local out_dir="$DIST_ROOT/$name"
  mkdir -p "$out_dir"
  local outfile="$out_dir/$out_name"

  local args=("build" "$ENTRY" "--compile" "--target=$bun_target" "--outfile" "$outfile")

  echo ""
  echo "Building $name -> $outfile"
  if ! output=$(bun "${args[@]}" 2>&1); then
    if echo "$output" | grep -q "Target platform .* is not available for download"; then
      echo "Skipping $name: $output"
      return 0
    fi
    echo "$output"
    return 1
  fi
  echo "$output"
}

for target in "${TARGETS[@]}"; do
  IFS=":" read -r NAME BUN_TARGET OUT_NAME <<< "$target"
  build_target "$NAME" "$BUN_TARGET" "$OUT_NAME"
done

echo ""
echo "Build complete!"