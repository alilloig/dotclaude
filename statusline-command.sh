#!/bin/sh
# Status line command for Claude Code
# Mirrors the zsh PROMPT: green cwd + green [HH:MM:SS]
input=$(cat)
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd')
timestamp=$(date +%H:%M:%S)
printf '\033[32m%s/\033[0m \033[32m[%s]\033[0m' "$cwd" "$timestamp"
