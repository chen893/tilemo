#!/bin/bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
build_dir="${TILEMO_HARMONY_BUILD_DIR:-$HOME/DevEcoStudioProjects/TilemoHarmony}"
build_mode="${1:-debug}"
case "$build_mode" in
  debug|release) ;;
  *) printf 'Usage: %s [debug|release]\n' "$0" >&2; exit 2 ;;
esac

mkdir -p "$build_dir"
build_dir="$(cd "$build_dir" && pwd -P)"
if [[ "$project_dir" != "$build_dir" ]]; then
  rsync -a --exclude=.hvigor --exclude=.idea --exclude=build --exclude=out \
    --exclude=oh_modules --exclude=node_modules --exclude=local.properties \
    "$project_dir/" "$build_dir/"
fi

cd "$build_dir"
devecocli build --product default --build-mode "$build_mode"
output_dir="$project_dir/out/$build_mode"
mkdir -p "$output_dir"
cp entry/build/default/outputs/default/*.hap "$output_dir/"
cp build/outputs/default/*.app "$output_dir/"
printf 'Packages: %s\n' "$output_dir"
