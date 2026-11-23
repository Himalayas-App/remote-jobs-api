# @himalayas/cli

Search remote jobs on [Himalayas](https://himalayas.app) from your terminal, and get the setup for the Himalayas MCP server in your AI apps.

```bash
npx @himalayas/cli search react --country BR
# or install it
npm install -g @himalayas/cli
himalayas search "product designer" --country GB --country-only --seniority Senior
```

## Commands

| Command | What it does |
| --- | --- |
| `himalayas search [query]` | Search remote jobs. Options: `--country`, `--country-only`, `--worldwide`, `--seniority`, `--type`, `--company`, `--timezone`, `--sort`, `--page`, `--limit`, `--json` |
| `himalayas job <url>` | Check a job is still open and show it |
| `himalayas mcp [client]` | Show how to add the Himalayas MCP server to Claude, Claude Code, ChatGPT, Cursor, VS Code, Windsurf or Gemini CLI |

`--country` takes a two-letter code or a country name and includes jobs open worldwide; add `--country-only` to leave those out. `--json` prints the raw API response, for piping into `jq`.

Set `HIMALAYAS_API_KEY` to use a [free API key](https://himalayas.app/signup/developer) for higher rate limits.

Built on [`@himalayas/api`](https://www.npmjs.com/package/@himalayas/api). Docs: [Remote Jobs API](https://himalayas.app/docs/remote-jobs-api). MIT licensed.
