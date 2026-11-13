#!/bin/bash
# Usage: tools/agent_watch.sh  (run it in the background; STALL=<minutes> to change the limit; it runs just under 2 h, then says to re-arm)
# Classes 3.0 watchdog: every 5 min push each unmerged worktree branch to wip/ (commits only), and EXIT with a
# message (which wakes the lead) when a worktree has shown no sign of life for STALL minutes, or disk is low.
cd /home/user/Project-Heaven-Cry || exit 1
MAIN=claude/charming-gauss-hbq4n0; STALL=${STALL:-40}; END=$(( $(date +%s) + 6900 ))
while [ $(date +%s) -lt $END ]; do
  now=$(date +%s)
  for wt in .claude/worktrees/*/; do
    [ -d "$wt" ] || continue
    b=$(git -C "$wt" rev-parse --abbrev-ref HEAD 2>/dev/null) || continue
    git merge-base --is-ancestor "$b" $MAIN 2>/dev/null && [ -z "$(git -C "$wt" status --porcelain 2>/dev/null | head -1)" ] && continue
    n=$(git rev-list --count $MAIN..$b 2>/dev/null || echo 0)
    [ "$n" -gt 0 ] && git push -q origin "+$b:refs/heads/wip/$b" 2>/dev/null
    last=$(git -C "$wt" log -1 --format=%ct 2>/dev/null || echo 0)
    m=$( { git -C "$wt" ls-files -m -o --exclude-standard 2>/dev/null | head -400 | sed "s#^#$wt#" | xargs -r stat -c %Y 2>/dev/null; find "$wt.check" -maxdepth 2 -type f -printf '%T@\n' 2>/dev/null | cut -d. -f1; } | sort -n | tail -1)
    [ -n "$m" ] && [ "$m" -gt "$last" ] && last=$m
    born=$(stat -c %Y "$wt.git" 2>/dev/null || echo 0); [ "$born" -gt "$last" ] && last=$born   # a new worktree is alive from its creation
    idle=$(( (now - last) / 60 ))
    if [ "$idle" -ge "$STALL" ]; then echo "$(date +%H:%M) STALL: $b idle ${idle} min ($n commits; wip pushed)"; exit 0; fi
  done
  free=$(df --output=avail -BG . | tail -1 | tr -dc 0-9)
  [ "$free" -lt 7 ] && { echo "$(date +%H:%M) LOW DISK ${free}G"; exit 0; }
  sleep 300
done
echo "$(date +%H:%M) watchdog window ended: re-arm"
