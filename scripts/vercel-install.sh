#!/bin/sh
set -e

echo "Configuring git auth..."
git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "git@github.com:"
git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "ssh://git@github.com/"
git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"

echo "Verifying GITHUB_TOKEN is set..."
if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN is not set"
  exit 1
fi

echo "Installing dependencies..."
pnpm install