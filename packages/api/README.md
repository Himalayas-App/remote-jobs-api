# @himalayas/api

Official TypeScript client for the [Himalayas Remote Jobs API](https://himalayas.app/docs/remote-jobs-api). Search and browse live remote jobs by keyword, country, seniority, employment type, company and time zone. No dependencies; works in Node 18+, Deno, Bun and edge runtimes.

```bash
npm install @himalayas/api
```

```ts
import { Himalayas } from '@himalayas/api';

const himalayas = new Himalayas();

// React jobs open to people in Brazil, including jobs open worldwide
const { jobs, totalCount } = await himalayas.search({ q: 'React', country: 'BR' });

// Only jobs restricted to the UK, senior level, newest first
await himalayas.search({ q: 'designer', country: 'GB', excludeWorldwide: true, seniority: 'Senior', sort: 'recent' });

// Walk the whole feed (follows nextCursor for you)
for await (const job of himalayas.browseAll({ limit: 20 })) {
  console.log(job.title, job.companyName);
}

// Check one job is still open before you show it
const result = await himalayas.getJob('https://himalayas.app/companies/stripe/jobs/senior-software-engineer');
if (result.status === 'open') console.log(result.job.applicationLink);
```

## API key

Requests work without a key. A free key gives your app its own, higher rate limit: [get one here](https://himalayas.app/signup/developer).

```ts
const himalayas = new Himalayas({ apiKey: process.env.HIMALAYAS_API_KEY, userAgent: 'my-job-board/1.0 (+https://example.com)' });
```

Keep keys on your server. Errors throw `HimalayasError` with `status`, and `retryAfter` (seconds) on a 429.

## Terms

Show visible credit with a link to the job on Himalayas or to himalayas.app, and don't pass the jobs on to other job boards or aggregators. See the [API terms](https://himalayas.app/terms#api).

## Related

- [`@himalayas/cli`](https://www.npmjs.com/package/@himalayas/cli): search remote jobs from your terminal
- [`@himalayas/mcp`](https://www.npmjs.com/package/@himalayas/mcp): the Himalayas MCP server for AI apps
- [Himalayas Remote Jobs WordPress Plugin](https://himalayas.app/wordpress)

MIT licensed.
