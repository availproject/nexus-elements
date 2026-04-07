#!/bin/sh
set -e

REWRITE="https://${GH_PAT}@github.com/"

git config --global --add url."${REWRITE}".insteadOf "https://git@github.com:"
git config --global --add url."${REWRITE}".insteadOf "git@github.com:"
git config --global --add url."${REWRITE}".insteadOf "ssh://git@github.com/"
git config --global --add url."${REWRITE}".insteadOf "https://github.com/"

pnpm install --frozen-lockfile --reporter=append-only
