#!/bin/sh
git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "git@github.com:"
git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "ssh://git@github.com/"
pnpm install