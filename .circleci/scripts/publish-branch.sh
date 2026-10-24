#!/usr/bin/env bash
# Replace a branch of this repository with the contents of a directory, as a
# single commit pushed over SSH with the project's deploy key.
#
# Usage: publish-branch.sh <directory> <branch>
# Reads REPOSITORY (owner/name, set from pipeline values in config.yml) and
# CIRCLE_SHA1.
set -euo pipefail

directory="$1"
branch="$2"

if [[ ! "$REPOSITORY" =~ ^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$ ]]; then
    echo "REPOSITORY must be owner/name, got '$REPOSITORY'" >&2
    exit 1
fi

# GitHub's SSH host key, from
# https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
mkdir -p ~/.ssh
echo "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl" >> ~/.ssh/known_hosts

cd "$directory"
git init -q -b "$branch"
git config user.name "CircleCI"
git config user.email "noreply@circleci.com"
git add -A
git commit -q -m "Deploy $CIRCLE_SHA1"
git push -q --force "git@github.com:$REPOSITORY.git" "$branch"
