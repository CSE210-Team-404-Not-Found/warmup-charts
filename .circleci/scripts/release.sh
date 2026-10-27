#!/usr/bin/env bash
# Publish the release whose pull request was just merged, if there is one, then
# open or update the release pull request for the next one. See ADR-0015.
#
# Reads REPOSITORY (owner/name), CIRCLE_BRANCH and GITHUB_TOKEN.
set -euo pipefail

release_please() {
    npx --yes release-please@17 "$1" \
        --repo-url="$REPOSITORY" \
        --target-branch="$CIRCLE_BRANCH" \
        --token="$GITHUB_TOKEN"
}

release_please github-release
release_please release-pr
