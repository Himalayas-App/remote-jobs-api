# Remote Jobs API — free public JSON API for remote job listings

[![Jobs available](https://img.shields.io/badge/jobs-95%2C000%2B-2563eb)](https://himalayas.app/jobs)
[![Auth](https://img.shields.io/badge/auth-none%20required-16a34a)](https://himalayas.app/api)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-6b21a8)](https://himalayas.app/docs/openapi.json)
[![MCP server](https://img.shields.io/badge/MCP-server-f97316)](https://himalayas.app/mcp)

The **Himalayas Remote Jobs API** is a free, public, no-auth JSON API for remote and work-from-home job listings. Use it to backfill a remote job board, power a job search product, populate a dashboard, or feed AI agents and automation workflows.

No API key. No sign-up. No OAuth. Just `curl`.

```bash
curl 'https://himalayas.app/jobs/api?limit=20&offset=0'
```

```bash
curl 'https://himalayas.app/jobs/api/search?q=react%20engineer&country=US&sort=recent'
```

- **Docs:** https://himalayas.app/docs/remote-jobs-api
- **OpenAPI 3.1 spec:** [`openapi.json`](openapi.json) · [`openapi.yaml`](openapi.yaml) · [hosted](https://himalayas.app/docs/openapi.json)
- **Code examples:** [`examples/`](examples) — curl, Python, Node.js, TypeScript, PHP, Go, Ruby
- **RSS feed:** https://github.com/Himalayas-App/remote-jobs-rss-feed
- **MCP server:** https://github.com/Himalayas-App/himalayas-mcp

---

## Contents

- [Endpoints](#endpoints)
- [Browse all remote jobs](#browse-all-remote-jobs)
- [Search remote jobs](#search-remote-jobs)
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

---

## Endpoints

Base URL: `https://himalayas.app`

| Endpoint | Purpose |
| --- | --- |
| `GET /jobs/api` | Browse the full remote jobs feed with `offset`/`limit` pagination |
| `GET /jobs/api/search` | Filtered search by keyword, country, seniority, employment type, company, timezone |

Both endpoints return the same JSON job object, so you can switch between them without changing your parsing code.

---

## Browse all remote jobs

```
GET https://himalayas.app/jobs/api
```

Use this when you want the whole feed and plan to page through it.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `limit` | integer | `20` | Jobs per request. **Maximum is 20.** |
| `offset` | integer | `0` | Jobs to skip. Increment by `limit` to paginate. |

```bash
curl 'https://himalayas.app/jobs/api?limit=20&offset=40'
```

The response includes `totalCount`, so you know when to stop paging.

---

## Search remote jobs

```
GET https://himalayas.app/jobs/api/search
```

Use this when you want filtered results without crawling the full feed locally.

| Parameter | Type | Example | Notes |
| --- | --- | --- | --- |
| `q` | string | `react engineer` | Free-text query |
| `country` | string | `US`, `united-states`, `United States` | ISO alpha-2, country name, slug, or abbreviation |
| `worldwide` | boolean | `true` | Limit to worldwide-friendly jobs |
| `exclude_worldwide` | boolean | `true` | Exclude worldwide matches when filtering by country |
| `seniority` | string | `Senior`, `Mid-level,Senior` | `Entry-level`, `Mid-level`, `Senior`, `Manager`, `Director`, `Executive` |
| `employment_type` | string | `Full Time` | `Full Time`, `Part Time`, `Contractor`, `Temporary`, `Intern`, `Volunteer`, `Other` |
| `company` | string | `linear`, `linear,vercel` | Canonical company slugs — use `companySlug` from a response |
| `timezone` | string | `-5`, `UTC-5`, `UTC+05:30` | Timezone restriction filter |
| `sort` | enum | `recent` | `relevant` (default), `recent`, `salaryAsc`, `salaryDesc`, `nameAToZ`, `nameZToA`, `jobs` |
| `page` | integer | `2` | 1-based page number |

Comma-separate values to pass more than one `seniority`, `employment_type`, or `company`.

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

### Filtering by company

Always filter with the `companySlug` value returned in a response, passed back as the `company` parameter. It is the canonical identifier and is far more reliable than guessing a slug from `companyName`.

---

## Response schema

**Envelope**

| Field | Type | Description |
| --- | --- | --- |
| `comments` | string | Human-readable changelog note about the current API version |
| `updatedAt` | number | Unix timestamp (seconds) of the last data refresh |
| `offset` | number | Offset applied to this response |
| `limit` | number | Number of jobs in this response |
| `totalCount` | number | Total jobs matching the request |
| `jobs` | array | Array of job objects |

**Job object**

| Field | Type | Description |
| --- | --- | --- |
| `title` | string | Job title |
| `excerpt` | string | First few sentences of the description |
| `companyName` | string | Hiring company name |
| `companySlug` | string | Canonical company slug — use this for the `company` filter |
| `companyLogo` | string | URL of the company logo |
| `employmentType` | string | `Full Time`, `Part Time`, `Contractor`, `Temporary`, `Intern`, `Volunteer`, `Other` |
| `minSalary` | number \| null | Minimum salary, in `salaryPeriod` units |
| `maxSalary` | number \| null | Maximum salary, in `salaryPeriod` units |
| `salaryPeriod` | string | `hourly`, `weekly`, `fortnightly`, `monthly`, `annual` (default) |
| `currency` | string \| null | Currency code, e.g. `USD`, `EUR`, `GBP` |
| `seniority` | string[] | Seniority levels for the role |
| `locationRestrictions` | string[] | Countries the candidate must be located in |
| `timezoneRestrictions` | number[] | UTC offsets the candidate must be within |
| `categories` | string[] | Job categories |
| `parentCategories` | string[] | Top-level job categories, e.g. `Developer`, `Sales` |
| `description` | string | Full job description as HTML |
| `pubDate` | number | Unix timestamp (seconds) the job was published |
| `expiryDate` | number | Unix timestamp (seconds) the job expires |
| `applicationLink` | string | URL to apply |
| `guid` | string | Stable unique identifier for the job |

> **Salary note:** since 2026-06-08, `minSalary`/`maxSalary` are expressed in the stated `salaryPeriod` and are **not** normalized to annual. Read `salaryPeriod` before comparing salaries. Listings with no explicit period report `annual`.

---

## Example response

```jsonc
{
  "comments": "13/03/2026: The API has been updated to include the companySlug field in the response.",
  "updatedAt": 1785983902,
  "offset": 0,
  "limit": 1,
  "totalCount": 95666,
  "jobs": [
    {
      "title": "Senior React Native Developer",
      "excerpt": "Are you a talented Senior Developer looking for a remote job…",
      "companyName": "lemon.io",
      "companySlug": "lemon-io",
      "companyLogo": "https://cdn-images.himalayas.app/hcc9f71g0twhi03ly6463ehgjpeb",
      "employmentType": "Full Time",
      "minSalary": null,
      "maxSalary": null,
      "salaryPeriod": "annual",
      "seniority": ["Senior"],
      "currency": "USD",
      "locationRestrictions": ["Argentina", "Australia", "Austria"],
      "timezoneRestrictions": [-8, -7, -6, -5, 0, 1, 2],
      "categories": ["Senior-React-Native-Developer", "React-Native-Developer"],
      "parentCategories": ["Developer"],
      "description": "<p>Are you a talented Senior Developer…</p>",
      "pubDate": 1785983902,
      "expiryDate": 1791167901,
      "applicationLink": "https://himalayas.app/companies/lemon-io/jobs/senior-react-native-developer",
      "guid": "https://himalayas.app/companies/lemon-io/jobs/senior-react-native-developer"
    }
  ]
}
```

---

## Code examples

Runnable scripts live in [`examples/`](examples). Each one fetches jobs and prints a summary.

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
import requests

response = requests.get(
    "https://himalayas.app/jobs/api",
    params={"limit": 20, "offset": 0},
    timeout=30,
)
response.raise_for_status()
data = response.json()

print(f"{data['totalCount']} remote jobs available")
for job in data["jobs"]:
    print(f"{job['title']} — {job['companyName']}")
```

### Node.js

```js
const url = new URL('https://himalayas.app/jobs/api');
url.searchParams.set('limit', '20');
url.searchParams.set('offset', '0');

const response = await fetch(url);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const data = await response.json();

console.log(`${data.totalCount} remote jobs available`);
for (const job of data.jobs) {
  console.log(`${job.title} — ${job.companyName}`);
}
```

---

## Paginating the full feed

`limit` is capped at 20, so a full sync is a loop over `offset`. Respect the rate limit — the data only changes once a day, so a small delay between pages is plenty.

```python
import time
import requests

def fetch_all_jobs(page_size=20, delay=1.0):
    jobs, offset, total = [], 0, None
    while total is None or offset < total:
        response = requests.get(
            "https://himalayas.app/jobs/api",
            params={"limit": page_size, "offset": offset},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        total = data["totalCount"]
        jobs.extend(data["jobs"])
        offset += page_size
        time.sleep(delay)
    return jobs
```

Deduplicate on `guid`, which is stable across refreshes.

---

## Rate limits and caching

The API is rate limited to keep it fast and available for everyone. Exceeding the limit returns `429 Too Many Requests`.

Job data is **cached and refreshed every 24 hours**, so polling more often than once per day gains you nothing. Sync once daily, store the results, and serve from your own cache.

Need a higher limit for a specific use case? Email [hi@himalayas.app](mailto:hi@himalayas.app) and tell us what you're building.

For real-time results instead of a 24-hour cache, use the [MCP server](https://himalayas.app/mcp).

---

## CORS: call this from your server, not the browser

The API does **not** send `Access-Control-Allow-Origin` headers, so a `fetch()` straight from browser JavaScript will be blocked by the browser's same-origin policy.

Call the API from your backend, a serverless function, or a build step, and serve the results to your frontend from your own origin. This is also better practice — it lets you cache the daily-refreshed data instead of hitting the rate limit from every visitor's browser.

If you just want live job listings on a web page with no backend, use the [embeddable widget](https://himalayas.app/free-remote-jobs-widget) instead — one line of HTML, no CORS involved.

---

## Errors

| Status | Meaning | What to do |
| --- | --- | --- |
| `200` | Success | — |
| `400` | Bad Request — invalid query parameter | Check parameter names, enum values, and types |
| `429` | Too Many Requests — rate limit exceeded | Back off and retry later; the data refreshes daily |

---

## OpenAPI and generated clients

The API is described by an OpenAPI 3.1 spec, included in this repo and hosted at `https://himalayas.app/docs/openapi.json`.

Generate a typed client in any language:

```bash
# TypeScript
npx @hey-api/openapi-ts -i https://himalayas.app/docs/openapi.json -o src/himalayas

# Python, Go, Java, C#, and 50+ others
openapi-generator-cli generate \
  -i https://himalayas.app/docs/openapi.json \
  -g python \
  -o ./himalayas-client
```

You can also fork the [Postman collection](https://himalayas.app/api) to explore the endpoints interactively.

---

## Other ways to access the data

| Method | Best for | Freshness |
| --- | --- | --- |
| **JSON API** (this repo) | Apps, databases, dashboards, backfilling a job board | Every 24 hours |
| **[RSS feed](https://github.com/Himalayas-App/remote-jobs-rss-feed)** | Feed readers, monitoring, Zapier/IFTTT automations | Every 24 hours, latest 100 jobs |
| **[MCP server](https://github.com/Himalayas-App/himalayas-mcp)** | AI assistants — Claude, ChatGPT, Cursor, Windsurf | Real time |
| **[Embeddable widget](https://himalayas.app/free-remote-jobs-widget)** | Live listings on a web page, no backend | Live |

---

## Attribution and terms of use

The API is free to use, including commercially. In return we ask that you:

- **Link back** to the job's URL on [himalayas.app](https://himalayas.app) — use the `applicationLink` or `guid` field.
- **Credit Himalayas** as the source of the data wherever you display it.
- **Do not resubmit** Himalayas listings to third-party job aggregators, including but not limited to Jooble, Neuvoo, Google Jobs, and LinkedIn Jobs.

The example code in this repository is MIT licensed — see [LICENSE](LICENSE). The job data itself is provided under the attribution terms above.

---

## FAQ

### Is the Himalayas Remote Jobs API free?

Yes. It is free to use, including for commercial projects, subject to the [attribution requirements](#attribution-and-terms-of-use).

### Do I need an API key or authentication?

No. There is no API key, sign-up, or OAuth flow. Send a plain `GET` request.

### How many jobs can I get per request?

Up to 20. Use `offset` on `/jobs/api` or `page` on `/jobs/api/search` to retrieve more. `totalCount` in every response tells you how many jobs match.

### How often is the data updated?

Every 24 hours. For real-time job data, use the [MCP server](https://himalayas.app/mcp).

### What is the rate limit?

We don't publish an exact number, and it may change with capacity. Exceeding it returns `429`. Since the data refreshes daily, one full sync per day stays well inside the limit. Email [hi@himalayas.app](mailto:hi@himalayas.app) if you need more.

### Can I call the API directly from browser JavaScript?

No — the API does not send CORS headers. See [CORS](#cors-call-this-from-your-server-not-the-browser) for the alternatives.

### How do I filter jobs by company?

Pass the `companySlug` from a response back as the `company` parameter on `/jobs/api/search`, e.g. `?company=linear`. Comma-separate for multiple companies.

### How do I get only worldwide-friendly remote jobs?

Use `?worldwide=true` on the search endpoint. To filter to one country while excluding worldwide listings, combine `country` with `exclude_worldwide=true`.

### Are salaries normalized to an annual figure?

No. Read `salaryPeriod` — it can be `hourly`, `weekly`, `fortnightly`, `monthly`, or `annual`. Convert before comparing. `minSalary`, `maxSalary`, and `currency` may all be `null` when a listing doesn't disclose pay.

### What is the difference between the API, the RSS feed, and the MCP server?

The API returns the full jobs feed with pagination and filtering. The [RSS feed](https://github.com/Himalayas-App/remote-jobs-rss-feed) returns the 100 most recent jobs as XML for feed readers. The [MCP server](https://github.com/Himalayas-App/himalayas-mcp) gives AI assistants real-time search plus tools for companies, salaries, and applications.

### Can I use the API to backfill my own job board?

Yes — that's one of the main use cases. Link back to the original listing on Himalayas and credit Himalayas as the source.

---

## Support

- **Documentation:** https://himalayas.app/docs/remote-jobs-api
- **Issues and questions:** [open an issue](https://github.com/Himalayas-App/remote-jobs-api/issues)
- **Email:** [hi@himalayas.app](mailto:hi@himalayas.app)

Built by [Himalayas](https://himalayas.app) — the remote job board with 95,000+ open remote jobs.
