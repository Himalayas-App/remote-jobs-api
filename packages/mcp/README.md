# @himalayas/mcp

Runs the official [Himalayas MCP server](https://himalayas.app/mcp) as a local stdio server, for AI apps that can only start local MCP servers. It connects to `https://mcp.himalayas.app/mcp`: search remote jobs, salaries and companies, track applications, and post jobs.

**If your app supports remote MCP servers, use the URL directly instead:** `https://mcp.himalayas.app/mcp`. Setup for Claude, ChatGPT, Cursor, VS Code and others is in the [MCP docs](https://himalayas.app/docs/remote-jobs-mcp), or run `npx @himalayas/cli mcp`.

## Use

```json
{
  "mcpServers": {
    "himalayas": {
      "command": "npx",
      "args": ["-y", "@himalayas/mcp"]
    }
  }
}
```

Public tools work straight away. The first time you use a tool that needs a Himalayas account, a browser window opens to sign in. Needs Node.js 18+.

Under the hood this runs [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) against the Himalayas server. Set `HIMALAYAS_MCP_URL` to point it elsewhere.

MIT licensed.
