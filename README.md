# Remote Jobs API

[![Jobs available](https://img.shields.io/badge/jobs-over%20100%2C000-2563eb)](https://himalayas.app/jobs)
[![Auth](https://img.shields.io/badge/auth-optional%20free%20key-16a34a)](https://himalayas.app/api)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-6b21a8)](https://himalayas.app/docs/openapi.json)

The **Himalayas Remote Jobs API** is a free public JSON API for remote job listings. Use it to backfill a remote job board, power a website or app, build a bot, or feed an AI agent.

**Free, no key needed, JSON, 20 jobs per page, commercial use allowed under the [API terms](https://himalayas.app/terms#api).** An optional free API key gives you higher rate limits and usage tracking.

```bash
# Quick test without a key
curl 'https://himalayas.app/jobs/api?limit=20'

# With a free API key stored in HIMALAYAS_API_KEY
curl -H "Authorization: Bearer $HIMALAYAS_API_KEY" \
  'https://himalayas.app/jobs/api?limit=20'
```

We recommend a [free API key](https://himalayas.app/signup/developer) for anything beyond a quick test. Keyed requests get 60 requests per minute and 10,000 per UTC day, plus a daily usage count.

- **Docs:** https://himalayas.app/docs/remote-jobs-api
- **OpenAPI 3.1 spec:** [`openapi.json`](openapi.json), [`openapi.yaml`](openapi.yaml), [hosted](https://himalayas.app/docs/openapi.json)
- **Code examples:** [`examples/`](examples): curl, Python, Node.js, TypeScript, PHP, Go, Ruby

## Contents

- [npm packages](#npm-packages)
- [Endpoints](#endpoints)
- [Browse all remote jobs](#browse-all-remote-jobs)
- [Search remote jobs](#search-remote-jobs)
- [Filter by where candidates can live](#filter-by-where-candidates-can-live)
- [Check whether a job is still open](#check-whether-a-job-is-still-open)
- [Response schema](#response-schema)
- [Example response](#example-response)
- [Code examples](#code-examples)
- [Paginating the full feed](#paginating-the-full-feed)
- [Rate limits and caching](#rate-limits-and-caching)
- [CORS: call this from your server, not the browser](#cors-call-this-from-your-server-not-the-browser)
- [Errors](#errors)
- [OpenAPI and generated clients](#openapi-and-generated-clients)
- [Other ways to access the data](#other-ways-to-access-the-data)
- [Attribution and terms of use](#attribution-and-terms-of-use)
- [FAQ](#faq)
- [Support](#support)

## npm packages

Official packages, in [`packages/`](packages):

| Package | What it is |
| --- | --- |
| [`@himalayas/api`](packages/api) | Typed TypeScript client with no dependencies: `search`, `browse`, `browseAll` (follows `nextCursor`) and `getJob` (open, closed or not found) |
| [`@himalayas/cli`](packages/cli) | Search jobs, check a listing, and print AI app setup instructions |
| [`@himalayas/mcp`](packages/mcp) | A stdio bridge to the hosted MCP server; see [MCP setup](#is-there-an-mcp-server) |

MCP means Model Context Protocol, how AI apps such as Claude and ChatGPT call tools. With stdio, an AI app starts a local process; the bridge still connects to the hosted server.

```bash
npm install @himalayas/api
npx @himalayas/cli search react --country BR
```

```ts
import { Himalayas } from '@himalayas/api';

const client = new Himalayas({ apiKey: process.env.HIMALAYAS_API_KEY });
const { jobs } = await client.search({ q: 'React', country: 'BR' });
```

The client doesn't read `HIMALAYAS_API_KEY` itself; pass it as `apiKey`, as above.

The client methods, including `browseAll`, throw `HimalayasError` with `status` and `retryAfter` on errors such as `429`. They don't retry automatically. If `browseAll` throws, its generator ends; restarting it starts the feed again. For a resumable sync, call `browse({ cursor })` yourself, save the cursor, and retry the failed page after waiting.

The CLI reads `HIMALAYAS_API_KEY`. Use `--country-only` to exclude worldwide matches, `himalayas job <url>` to check a listing, or `himalayas mcp [client]` for setup.

## Endpoints

Base URL: `https://himalayas.app`

| Endpoint | Purpose |
| --- | --- |
| `GET /jobs/api` | Browse the full feed with `cursor`/`limit` pagination |
| `GET /jobs/api/search` | Filter by keyword, country, seniority, employment type, company, timezone |
| `GET /jobs/api/companies/{company}/jobs/{slug}` | Check an individual job's status |

Browse and search return the same JSON job object. The single-job endpoint returns `{ job }` when the job is open.

## Browse all remote jobs

```
GET https://himalayas.app/jobs/api
```

Use this when you want the whole feed.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `limit` | integer | `20` | Jobs per request. **Maximum is 20.** |
| `cursor` | string | Omitted | Pass back `nextCursor` from the previous response |
| `offset` | integer | `0` | Deprecated. Still supported, but will be removed in a future release |

```bash
# First page
curl 'https://himalayas.app/jobs/api?limit=20'

# Next page: set NEXT_CURSOR to the returned nextCursor value
curl --get 'https://himalayas.app/jobs/api' \
  --data-urlencode 'limit=20' \
  --data-urlencode "cursor=$NEXT_CURSOR"
```

Stop when the response has no `nextCursor`. Do not build or parse cursor values yourself. `totalCount` is an estimate, not a stopping condition.

## Search remote jobs

```
GET https://himalayas.app/jobs/api/search
```

Use this when you want filtered results without crawling the full feed locally.

| Parameter | Type | Example | Notes |
| --- | --- | --- | --- |
| `q` | string | `react engineer` | Free-text query |
| `country` | string | `US`, `united-states`, `United States` | One country: ISO alpha-2, name or slug |
| `worldwide` | boolean | `true` | Limit to worldwide-friendly jobs |
| `exclude_worldwide` | boolean | `true` | Exclude worldwide matches when filtering by country |
| `seniority` | string | `Senior`, `Mid-level,Senior` | `Entry-level`, `Mid-level`, `Senior`, `Manager`, `Director`, `Executive` |
| `employment_type` | string | `Full Time` | `Full Time`, `Part Time`, `Contractor`, `Temporary`, `Intern`, `Volunteer`, `Other` |
| `company` | string | `linear`, `linear,vercel` | Canonical company slugs; use `companySlug` from a response |
| `timezone` | string | `-5`, `UTC-5`, `UTC+05:30` | Timezone restriction filter |
| `sort` | enum | `recent` | `relevant` (default), `recent`, `salaryAsc`, `salaryDesc`, `nameAToZ`, `nameZToA`, `jobs` |
| `page` | integer | `2` | 1-based page number |

Comma-separate values for multiple `seniority`, `employment_type`, or `company` values. For multiple countries, search once per country; `country=BR,AR` returns `400`.

```bash
# Keyword search
curl 'https://himalayas.app/jobs/api/search?q=react%20engineer'

# Senior US roles, newest first
curl 'https://himalayas.app/jobs/api/search?country=US&seniority=Senior&sort=recent'

# Full-time roles at a specific company
curl 'https://himalayas.app/jobs/api/search?company=linear&employment_type=Full%20Time'

# Highest-paying Python jobs, page 2
curl 'https://himalayas.app/jobs/api/search?q=python&sort=salaryDesc&page=2'
```

Keep requesting the next `page` until one returns no jobs. Pages can hold fewer jobs than the limit before the end of the results. Deduplicate on `guid` because results can shift between pages. `totalCount` is an estimate that can be up to a day old and can run slightly high.

### Filtering by company

Pass the response's `companySlug` back as the `company` parameter. It is the canonical identifier; don't guess it from `companyName`.

## Filter by where candidates can live

Use `country` to find jobs available to someone living in that country. Results include worldwide jobs unless you add `exclude_worldwide=true`.

```bash
# Candidates in Brazil, including worldwide jobs
curl 'https://himalayas.app/jobs/api/search?country=BR'

# Exclude worldwide matches
curl 'https://himalayas.app/jobs/api/search?country=BR&exclude_worldwide=true'
```

`locationRestrictions` contains country names, such as `["Brazil"]`; an empty array means worldwide. `timezoneRestrictions` contains numeric UTC offsets; an empty array means all timezones.

To keep one country's jobs in sync, page through search for that country instead of browsing the whole feed.

## Check whether a job is still open

Use the single-job endpoint before continuing to display a listing. Jobs can close before their `expiryDate`. This lookup is cached for up to about 15 minutes.

```
GET https://himalayas.app/jobs/api/companies/{company}/jobs/{slug}
```

Use the company and job slug from the job's Himalayas URL.

| Status | Meaning | Action |
| --- | --- | --- |
| `200` | Open; response contains `{ job }` | Keep the listing |
| `404` | Job not found | Check the company and slug |
| `410` | Closed; body includes `expiryDate` | Remove the listing |

## Response schema

The **response envelope** is the outer JSON object containing the jobs and pagination information.

| Field | Type | Description |
| --- | --- | --- |
| `comments` | string | Human-readable changelog note |
| `updatedAt` | number | Unix timestamp (seconds) of the most recently updated job in the response |
| `offset` | number | Offset applied to this response |
| `limit` | number | The limit used in this request |
| `nextCursor` | string | Browse cursor for the following page; absent at the end |
| `totalCount` | number | Estimated total jobs matching the request |
| `jobs` | array | Array of job objects |

**Job object**

| Field | Type | Description |
| --- | --- | --- |
| `title` | string | Job title |
| `excerpt` | string | First few sentences of the description |
| `companyName` | string | Hiring company name |
| `companySlug` | string | Canonical company slug for the `company` filter |
| `companyLogo` | string | URL of the company logo, or an empty string when there is none |
| `employmentType` | string | `Full Time`, `Part Time`, `Contractor`, `Temporary`, `Intern`, `Volunteer`, `Other` |
| `minSalary` | number \| null | Minimum salary, in `salaryPeriod` units |
| `maxSalary` | number \| null | Maximum salary, in `salaryPeriod` units |
| `salaryPeriod` | string | `hourly`, `weekly`, `fortnightly`, `monthly`, `annual` (default) |
| `currency` | string \| null | Currency code |
| `seniority` | string[] | Seniority levels |
| `locationRestrictions` | string[] | Country names where applicants must be based; empty means worldwide |
| `timezoneRestrictions` | number[] | Accepted UTC offsets; empty means all timezones |
| `categories` | string[] | Job categories |
| `parentCategories` | string[] | Top-level job categories |
| `description` | string | Full description as HTML |
| `pubDate` | number | Unix timestamp (seconds) when the job was last updated |
| `expiryDate` | number | Unix timestamp (seconds): the latest the job stays listed. Jobs can close earlier |
| `applicationLink` | string | Job page on Himalayas; use for every Apply action |
| `guid` | string | Stable unique job identifier |

> **Salary note:** since 2026-06-08, `minSalary`/`maxSalary` use the stated `salaryPeriod` and are **not** normalized to annual. Read `salaryPeriod` before comparing salaries. Listings with no explicit period report `annual`.

## Example response

The job, logo URL, timestamps and cursor are illustrative placeholders. `totalCount` is rounded.

```json
{
  "comments": "21/08/2026: Cursor pagination is now available and is the preferred way to page through the feed.",
  "updatedAt": 1785983902,
  "offset": 0,
  "limit": 1,
  "nextCursor": "EXAMPLE_CURSOR_USE_THE_VALUE_FROM_YOUR_RESPONSE",
  "totalCount": 120000,
  "jobs": [
    {
      "title": "Senior React Native Developer",
      "excerpt": "Example remote developer listing.",
      "companyName": "Example Company",
      "companySlug": "example-company",
      "companyLogo": "https://example.com/logo.png",
      "employmentType": "Full Time",
      "minSalary": null,
      "maxSalary": null,
      "salaryPeriod": "annual",
      "seniority": ["Senior"],
      "currency": "USD",
      "locationRestrictions": ["Brazil"],
      "timezoneRestrictions": [-5],
      "categories": ["Senior-React-Native-Developer", "React-Native-Developer"],
      "parentCategories": ["Developer"],
      "description": "<p>Example remote developer listing.</p>",
      "pubDate": 1785983902,
      "expiryDate": 1791167901,
      "applicationLink": "https://himalayas.app/companies/example-company/jobs/example-job?utm_source=api",
      "guid": "https://himalayas.app/companies/example-company/jobs/example-job"
    }
  ]
}
```

Pass `applicationLink` through unchanged, including `?utm_source=api`. Deduplicate on `guid`.

## Code examples

Runnable scripts live in [`examples/`](examples).

| Language | File | Run |
| --- | --- | --- |
| curl / shell | [`examples/curl.sh`](examples/curl.sh) | `bash examples/curl.sh` |
| Python | [`examples/python.py`](examples/python.py) | `python3 examples/python.py` |
| Node.js | [`examples/node.js`](examples/node.js) | `node examples/node.js` |
| TypeScript | [`examples/typescript.ts`](examples/typescript.ts) | `npx tsx examples/typescript.ts` |
| PHP | [`examples/php.php`](examples/php.php) | `php examples/php.php` |
| Go | [`examples/go.go`](examples/go.go) | `go run examples/go.go` |
| Ruby | [`examples/ruby.rb`](examples/ruby.rb) | `ruby examples/ruby.rb` |

### Python

```python
import os
import requests

key = os.getenv("HIMALAYAS_API_KEY")
headers = {"Authorization": f"Bearer {key}"} if key else {}
response = requests.get(
    "https://himalayas.app/jobs/api",
    params={"limit": 20},
    headers=headers,
    timeout=30,
)
response.raise_for_status()
data = response.json()
for job in data["jobs"]:
    print(f"{job['title']} at {job['companyName']}")

# Pass data["nextCursor"] as cursor for the next page, if present.
```

### Node.js

```js
const key = process.env.HIMALAYAS_API_KEY;
const headers = key ? { Authorization: `Bearer ${key}` } : {};
const response = await fetch(
  'https://himalayas.app/jobs/api?limit=20', { headers }
);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const data = await response.json();
for (const job of data.jobs) {
  console.log(`${job.title} at ${job.companyName}`);
}

// Pass data.nextCursor as cursor for the next page, if present.
```

## Paginating the full feed

Walk the feed by passing each response's `nextCursor` back as `cursor`, stopping when `nextCursor` is absent.

At 20 jobs per request, walking over 100,000 jobs takes thousands of requests. Use a free key and pace requests within your account's limits. Responses served from the API's cache don't count toward limits.

```python
import os
import time
import requests

def fetch_all_jobs(page_size=20, delay=1.1):
    key = os.getenv("HIMALAYAS_API_KEY")
    headers = {"Authorization": f"Bearer {key}"} if key else {}
    jobs, cursor = [], None

    while True:
        params = {"limit": page_size}
        if cursor:
            params["cursor"] = cursor

        response = requests.get(
            "https://himalayas.app/jobs/api",
            params=params,
            headers=headers,
            timeout=30,
        )
        if response.status_code == 429:
            time.sleep(float(response.headers.get("Retry-After", "60")))
            continue

        response.raise_for_status()
        data = response.json()
        jobs.extend(data["jobs"])
        cursor = data.get("nextCursor")
        if not cursor:
            return jobs
        time.sleep(delay)
```

Deduplicate on `guid`. A job updated during a walk moves ahead of your position and won't appear in the remaining pages, so re-walk periodically.

## Rate limits and caching

Keyless requests share one public allowance. Free keys allow 60 requests per minute and 10,000 per UTC day per account, shared across its keys; request limits can change.

Exceeding a limit returns `429`. With a key, `Retry-After` gives the seconds to wait. If absent, use a fallback delay, as the Python example does.

Updates usually appear within an hour or two: search responses are cached for up to an hour and browse responses for two hours. A rarely requested query can return an older copy while it refreshes. Cache results in your own storage.

Keys grant only `jobs:read`. Keep them on your server. For higher limits, email [hi@himalayas.app](mailto:hi@himalayas.app) with a link to where you show the jobs.

## CORS: call this from your server, not the browser

CORS (Cross-Origin Resource Sharing) controls whether browser code can read responses from another origin. The API doesn't send `Access-Control-Allow-Origin` headers, so direct browser `fetch()` calls are blocked.

Call from your backend, a serverless function, or a build step. Serve cached results to your frontend from your own origin.

For listings without a backend, the [embeddable widget](https://himalayas.app/free-remote-jobs-widget) takes one line of code. It has no country filter.

## Errors

| Status | Meaning | What to do |
| --- | --- | --- |
| `200` | Success | Read the response |
| `400` | Invalid query parameter | Check names, values and types |
| `401` | Invalid, revoked, suspended or unverified credentials | Check your key and account |
| `404` | Single-job lookup: not found | Check company and job slug |
| `410` | Single-job lookup: closed | Remove it; body includes `expiryDate` |
| `429` | Rate limit exceeded | Wait for `Retry-After`, or use a fallback delay |
| `503` | Service unavailable | Retry later |

## OpenAPI and generated clients

The [OpenAPI 3.1 spec](https://himalayas.app/docs/openapi.json) is a machine-readable description of the API. It imports into Postman and supports generated clients. For TypeScript, we recommend `@himalayas/api`.

The hosted spec currently types `locationRestrictions` items as objects and `timezoneRestrictions` items as strings, while live responses return country-name strings and numbers. Override those two item types before generating a client. Save the corrected spec as `openapi.json`, then run:

```bash
# TypeScript
npx @hey-api/openapi-ts -i ./openapi.json -o src/himalayas

# Python
openapi-generator-cli generate \
  -i ./openapi.json \
  -g python \
  -o ./himalayas-client
```

## Other ways to access the data

| Method | Best for |
| --- | --- |
| **JSON API** | Apps and job boards needing pagination and filtering; updates usually appear within an hour or two |
| **[RSS feed](https://github.com/Himalayas-App/remote-jobs-rss-feed)** | Feed readers; the latest jobs in RSS 2.0 XML, regenerated daily |
| **[MCP server](https://github.com/Himalayas-App/himalayas-mcp)** | AI assistants searching jobs and using company, salary and application tools |
| **[Embeddable widget](https://himalayas.app/free-remote-jobs-widget)** | Listings on a website without a backend; no country filter |

## Attribution and terms of use

Follow the [API terms](https://himalayas.app/terms#api):

- **Use `applicationLink` for every Apply action.** It points to the job's page on Himalayas, so Apply clicks open Himalayas.
- **Credit Himalayas visibly**, with a link to the Himalayas job or [himalayas.app](https://himalayas.app).
- **Show jobs only on sites and apps you operate.** Don't pass them to third parties, including other job boards, aggregators, job search engines, Google Jobs or LinkedIn Jobs, through feeds or `JobPosting` structured data.
- **Cache data, stay within request limits, and remove expired jobs.**
- **Keep keys private** and use them only from your own servers.

The API is free for personal and commercial integrations. You don't need to ask us first.

## FAQ

### Is the Himalayas Remote Jobs API free?

Yes, including commercial use under the [API terms](https://himalayas.app/terms#api). No key is required; an optional free key adds higher limits and usage tracking.

### Do I need an API key or authentication?

No key is required. We recommend a [free key](https://himalayas.app/signup/developer) beyond quick tests for higher limits and a daily usage count.

### How many jobs can I get per request?

Up to 20. Browse with `cursor` until `nextCursor` is absent; search with `page` until no jobs return.

### How often is the data updated?

Usually within an hour or two. Rarely requested queries can return an older copy while refreshing. Single-job checks are cached for up to about 15 minutes.

### What is the rate limit?

Keyed accounts get 60 requests per minute and 10,000 per UTC day. Keyless callers share an allowance. On `429`, keyed responses provide `Retry-After`; otherwise use a fallback delay.

### What can I filter on?

Keyword, candidate country, worldwide availability, seniority, employment type, company and timezone. Sorting includes salary. The single-job check returns `410` for closed listings.

### Can I call the API directly from browser JavaScript?

No. See [CORS](#cors-call-this-from-your-server-not-the-browser) for server-side alternatives.

### How do I filter jobs by company?

Pass `companySlug` as `company`. Comma-separate multiple companies.

### How do I get only worldwide-friendly remote jobs?

Use `worldwide=true`. For country results without worldwide matches, combine `country` with `exclude_worldwide=true`.

### Are salaries normalized to an annual figure?

No. Read `salaryPeriod` before comparing salaries.

### Is there an npm package?

Yes: [`@himalayas/api`](https://www.npmjs.com/package/@himalayas/api), the official typed client.

### Is there a CLI?

Yes: `npx @himalayas/cli search react --country BR`.

### Is there an MCP server?

Yes. Connect to `https://mcp.himalayas.app/mcp`. For stdio, [`@himalayas/mcp`](https://www.npmjs.com/package/@himalayas/mcp) bridges to that hosted server; it isn't an offline server. It requires Node.js 20.18.1 or later:

```json
{"command":"npx","args":["-y","@himalayas/mcp"]}
```

### What is the difference between the API, the RSS feed, and the MCP server?

Use the API for filtered, paginated data; RSS for the latest jobs in a feed reader; MCP for AI assistants calling tools.

### Can I use the API to backfill my own job board?

Yes. Follow the [attribution requirements](#attribution-and-terms-of-use), use `applicationLink`, and remove expired jobs.

## Support

- **Documentation:** https://himalayas.app/docs/remote-jobs-api
- **Issues and questions:** [open an issue](https://github.com/Himalayas-App/remote-jobs-api/issues)
- **Email:** [hi@himalayas.app](mailto:hi@himalayas.app)

Built by [Himalayas](https://himalayas.app), the remote job board with over 100,000 open remote jobs.
