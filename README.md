# L'Oréal Learning Expedition voice demo

Voice product-discovery demo for the L'Oréal Learning Expedition on 2026-10-07.

Start with `AGENTS.md`: layout, workflow and rules, for agents and people alike. Inputs live in `context/`, work is planned in `specs/`, and `scripts/verify` gives the verdict.

## First-time setup

1. Install Docstral, the MCP server for Mistral SDK docs: `curl -fsSL https://docstral-mcp.solutions.mistralsol.com/install.sh | sh`, then `claude mcp login docstral`. Approve the `docstral` server from `.mcp.json` when Claude Code asks.
2. Copy `.env.example` to `.env` and fill in `MISTRAL_API_KEY`.
3. Check that the Decathlon reference export exists at the path in `.claude/settings.local.json`. `context/reference-map.md` has the command to recreate it.
4. Run `scripts/verify`.
