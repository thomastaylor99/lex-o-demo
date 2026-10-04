@AGENTS.md

## Claude Code specifics

- `.claude/settings.json` registers a Stop hook (`.claude/hooks/verify-on-stop.sh`). After a turn that changed files, it runs `scripts/verify --quick`; on failure it blocks the stop once and shows Claude the verdict.
- `.claude/settings.local.json` mounts the Decathlon reference read-only. It is machine-specific and gitignored.
- `claude --worktree <name>` starts a parallel stream; `.worktreeinclude` copies the `.env` files into each new worktree.
- Docstral loads from `.mcp.json`. Approve it when asked. If its tools are missing, restart the session and run `claude mcp login docstral`.
