#!/bin/sh
# set -e
git config --global url."https://${GH_PAT}@github.com/".insteadOf "git@github.com:" && git config --global url."https://${GH_PAT}@github.com/".insteadOf "ssh://git@github.com/" && git config --global url."https://${GH_PAT}@github.com/".insteadOf "https://github.com/" && pnpm install
