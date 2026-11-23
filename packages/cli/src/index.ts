#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { Himalayas, HimalayasError, type Job, type SearchParams, type SortOrder } from '@himalayas/api';

const VERSION = '0.1.2';
const MCP_URL = 'https://mcp.himalayas.app/mcp';

const HELP = `himalayas ${VERSION}: search remote jobs on Himalayas from your terminal

Usage
  himalayas search [query] [options]   Search remote jobs
  himalayas job <url>                  Check one job is still open and show it
  himalayas mcp [client]               Show how to add the Himalayas MCP server to an AI app
  himalayas --help | --version

Search options
  -c, --country <code>       Jobs open to people in a country (e.g. BR, "United Kingdom")
      --country-only         With --country: leave out jobs open worldwide
  -w, --worldwide            Only jobs open worldwide
  -s, --seniority <list>     Entry-level, Mid-level, Senior, Manager, Director, Executive
  -t, --type <list>          Full Time, Part Time, Contractor, Temporary, Intern, Volunteer
      --company <slug>       One company's jobs
      --timezone <offset>    e.g. UTC-5 or UTC+5:30
      --sort <order>         relevant (default), recent, salaryDesc, salaryAsc
  -p, --page <n>             Results page (default 1)
  -n, --limit <n>            Show at most n jobs (default 10)
      --json                 Print the raw API response

Set HIMALAYAS_API_KEY to use a free key (higher rate limits): https://himalayas.app/signup/developer
Docs: https://himalayas.app/docs/remote-jobs-api`;

const MCP_CLIENTS: Record<string, string> = {
  claude: `In Claude (claude.ai or Claude Desktop): Customize > Connectors > + Add > Add custom connector.\nName: Himalayas  URL: ${MCP_URL}`,
  'claude-code': `claude mcp add --transport http himalayas ${MCP_URL}\nThen run /mcp inside Claude Code to sign in when you need account tools.`,
  chatgpt: `In ChatGPT: https://chatgpt.com/plugins > + > Add custom MCP server.\nName: Himalayas  URL: ${MCP_URL}  Auth: OAuth`,
  cursor: `Add to ~/.cursor/mcp.json (or .cursor/mcp.json in a project):\n${JSON.stringify({ mcpServers: { himalayas: { url: MCP_URL } } }, null, 2)}`,
  vscode: `Add to .vscode/mcp.json in your workspace:\n${JSON.stringify({ servers: { himalayas: { type: 'http', url: MCP_URL } } }, null, 2)}`,
  windsurf: `Add to mcp_config.json (open it from the MCP settings in Cascade):\n${JSON.stringify({ mcpServers: { himalayas: { serverUrl: MCP_URL } } }, null, 2)}`,
  gemini: `gemini extensions install https://github.com/Himalayas-App/himalayas-plugin\nOr add to ~/.gemini/settings.json:\n${JSON.stringify({ mcpServers: { himalayas: { httpUrl: MCP_URL } } }, null, 2)}`,
  stdio: `For apps that only run local (stdio) servers (needs Node.js):\n${JSON.stringify({ mcpServers: { himalayas: { command: 'npx', args: ['-y', '@himalayas/mcp'] } } }, null, 2)}`,
};

function salary(job: Job): string {
  if (job.minSalary == null && job.maxSalary == null) return '';
  const fmt = (n: number | null) => (n == null ? '' : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  const range = [job.minSalary, job.maxSalary].filter((n) => n != null).map(fmt).join('–');
  const per = job.salaryPeriod === 'annual' ? '/yr' : job.salaryPeriod === 'hourly' ? '/hr' : `/${job.salaryPeriod}`;
  return `${job.currency} ${range}${per}`;
}

function where(job: Job): string {
  if (!job.locationRestrictions.length) return 'Worldwide';
  const shown = job.locationRestrictions.slice(0, 3).join(', ');
  const more = job.locationRestrictions.length - 3;
  return more > 0 ? `${shown} +${more} more` : shown;
}

function printJob(job: Job, full = false): void {
  const bits = [job.companyName, where(job), job.employmentType, job.seniority.join('/'), salary(job)].filter(Boolean);
  console.log(`\x1b[1m${job.title}\x1b[0m`);
  console.log(`  ${bits.join(' · ')}`);
  console.log(`  ${job.guid}`);
  if (full) console.log(`\n${job.excerpt}\n\nApply: ${job.applicationLink}`);
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      country: { type: 'string', short: 'c' },
      'country-only': { type: 'boolean' },
      worldwide: { type: 'boolean', short: 'w' },
      seniority: { type: 'string', short: 's' },
      type: { type: 'string', short: 't' },
      company: { type: 'string' },
      timezone: { type: 'string' },
      sort: { type: 'string' },
      page: { type: 'string', short: 'p' },
      limit: { type: 'string', short: 'n' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });
  const [command, ...rest] = positionals;
  if (values.version) return console.log(VERSION), 0;
  if (values.help || !command) return console.log(HELP), command || values.help ? 0 : 1;

  const api = new Himalayas({ apiKey: process.env.HIMALAYAS_API_KEY, userAgent: `himalayas-cli/${VERSION}` });

  if (command === 'search') {
    const params: SearchParams = {
      q: rest.join(' ') || undefined,
      country: values.country,
      excludeWorldwide: values['country-only'],
      worldwide: values.worldwide,
      seniority: values.seniority?.split(',').map((s) => s.trim()) as SearchParams['seniority'],
      employmentType: values.type?.split(',').map((s) => s.trim()) as SearchParams['employmentType'],
      company: values.company,
      timezone: values.timezone,
      sort: values.sort as SortOrder | undefined,
      page: values.page ? Number(values.page) : undefined,
    };
    const res = await api.search(params);
    if (values.json) return console.log(JSON.stringify(res, null, 2)), 0;
    const limit = values.limit ? Number(values.limit) : 10;
    if (!res.jobs.length) return console.log('No jobs found.'), 0;
    res.jobs.slice(0, limit).forEach((job, i) => {
      if (i) console.log('');
      printJob(job);
    });
    console.log(`\n${res.totalCount.toLocaleString('en')} matching jobs · more: himalayas.app/jobs`);
    return 0;
  }

  if (command === 'job') {
    if (!rest[0]) return console.error('Usage: himalayas job <url>'), 1;
    const res = await api.getJob(rest[0]);
    if (values.json) return console.log(JSON.stringify(res, null, 2)), 0;
    if (res.status === 'closed') return console.log('This job has closed.'), 0;
    if (res.status === 'not_found') return console.log('No job at that URL.'), 1;
    printJob(res.job, true);
    return 0;
  }

  if (command === 'mcp') {
    const client = rest[0];
    if (client && MCP_CLIENTS[client]) return console.log(MCP_CLIENTS[client]), 0;
    console.log(`Himalayas MCP server: ${MCP_URL}\n`);
    for (const [name, how] of Object.entries(MCP_CLIENTS)) console.log(`${name}:\n${how}\n`);
    console.log('Docs: https://himalayas.app/docs/remote-jobs-mcp');
    return client ? 1 : 0;
  }

  console.error(`Unknown command "${command}".\n\n${HELP}`);
  return 1;
}

// Set exitCode rather than calling process.exit(), which can cut off output still being written to a pipe.
main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    if (err instanceof HimalayasError) {
      console.error(err.status === 429 ? `Rate limited. Try again in ${err.retryAfter ?? 'a few'} seconds.` : err.message);
    } else {
      console.error(err instanceof Error ? err.message : err);
    }
    process.exitCode = 1;
  },
);
