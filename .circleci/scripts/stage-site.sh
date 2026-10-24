#!/usr/bin/env bash
# Copy the browser assets into a directory, ready to publish to GitHub Pages.
#
# Usage: stage-site.sh <directory>
set -euo pipefail

site="$1"

mkdir -p "$site"
cp index.html style.css "$site"/
cp -R src demo data images "$site"/
# Pages serves the files as they are, without a Jekyll build.
touch "$site"/.nojekyll
