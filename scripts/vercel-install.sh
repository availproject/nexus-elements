#!/bin/bash
# Exit immediately if a command fails
set -e

echo "Step 1: Configuring Git to use GitHub Token..."
# Make sure your Vercel Environment Variable is exactly GITHUB_TOKEN
git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "ssh://git@github.com/"

echo "Step 2: Installing dependencies..."
pnpm install