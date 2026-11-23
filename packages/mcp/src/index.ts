#!/usr/bin/env node
/**
 * Runs the remote Himalayas MCP server (https://mcp.himalayas.app/mcp) as a
 * local stdio server, for AI apps that can't connect to remote servers.
 * It hands off to mcp-remote, which also handles the sign-in flow for
 * account tools.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const MCP_URL = process.env.HIMALAYAS_MCP_URL ?? 'https://mcp.himalayas.app/mcp';

const require = createRequire(import.meta.url);
const pkgPath = require.resolve('mcp-remote/package.json');
const pkg = require(pkgPath) as { bin: string | Record<string, string> };
const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin['mcp-remote'];

const child = spawn(process.execPath, [join(dirname(pkgPath), bin), MCP_URL, ...process.argv.slice(2)], {
  stdio: 'inherit',
});
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => child.kill(sig));
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
