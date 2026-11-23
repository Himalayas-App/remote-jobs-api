/**
 * Himalayas Remote Jobs API: Node.js example.
 *
 * Docs: https://himalayas.app/docs/remote-jobs-api
 *
 * No API key needed; set HIMALAYAS_API_KEY to use a free key for higher limits (https://himalayas.app/signup/developer).
 *
 * Usage:
 *   node examples/node.js
 *
 * Requires Node 18+ for the built-in fetch.
 *
 * Note: run this on the server, not in the browser. The API does not send
 * CORS headers, so a fetch() from browser JavaScript will be blocked.
 */

const BASE_URL = 'https://himalayas.app';
const MAX_TRIES = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch a page of the full remote jobs feed. `limit` is capped at 20.
 * Pass the previous response's `nextCursor` as `cursor` to get the next page.
 */
async function browseJobs({ limit = 20, cursor } = {}) {
  const url = new URL('/jobs/api', BASE_URL);
  url.searchParams.set('limit', String(limit));
  if (cursor) url.searchParams.set('cursor', cursor);
  return request(url);
}

/**
 * Search remote jobs.
 * Filters: q, country (one per request), worldwide, exclude_worldwide,
 * seniority, employment_type, company, timezone, sort, page.
 * To page, increase `page` until a page returns no jobs; dedupe on `guid`.
 */
async function searchJobs(filters = {}) {
  const url = new URL('/jobs/api/search', BASE_URL);
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return request(url);
}

/** GET a JSON endpoint. On 429, wait Retry-After seconds (60 if absent) and retry. */
async function request(url) {
  const key = process.env.HIMALAYAS_API_KEY;
  const headers = key ? { Authorization: `Bearer ${key}` } : {};
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers });
    if (response.status === 429 && attempt < MAX_TRIES) {
      await sleep(Number(response.headers.get('retry-after') ?? 60) * 1000);
      continue;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    }
    return response.json();
  }
}

/**
 * Walk the entire feed with `nextCursor`, deduplicating on the stable `guid`.
 * Stops when a response has no `nextCursor`; `totalCount` is only an estimate.
 * Browse responses are cached for up to two hours, so syncing more often
 * than that gains little.
 */
async function fetchAllJobs({ pageSize = 20, delayMs = 1100 } = {}) {
  const jobs = new Map();
  let cursor;

  while (true) {
    const page = await browseJobs({ limit: pageSize, cursor });
    for (const job of page.jobs) jobs.set(job.guid, job);
    console.log(`  fetched ${jobs.size.toLocaleString()}`);
    cursor = page.nextCursor;
    if (!cursor) return [...jobs.values()];
    await sleep(delayMs);
  }
}

/** Salaries are in `salaryPeriod` units; they are not normalized to annual. */
function formatSalary(job) {
  if (job.minSalary === null && job.maxSalary === null) return 'salary not disclosed';
  const currency = job.currency ?? '';
  const low = job.minSalary?.toLocaleString() ?? '?';
  const high = job.maxSalary?.toLocaleString() ?? '?';
  return `${currency} ${low}-${high} per ${job.salaryPeriod}`.trim();
}

async function main() {
  console.log('==> Newest remote jobs');
  const feed = await browseJobs({ limit: 5 });
  console.log(`About ${feed.totalCount.toLocaleString()} remote jobs available\n`);
  for (const job of feed.jobs) {
    console.log(`  ${job.title} at ${job.companyName}`);
    console.log(`    ${formatSalary(job)}`);
    // Use applicationLink unchanged for every Apply action.
    console.log(`    ${job.applicationLink}`);
  }

  console.log('\n==> Senior React roles open to US candidates');
  const results = await searchJobs({
    q: 'react',
    country: 'US',
    seniority: 'Senior',
    employment_type: 'Full Time',
    sort: 'recent',
  });
  console.log(`About ${results.totalCount.toLocaleString()} matches\n`);
  for (const job of results.jobs.slice(0, 5)) {
    console.log(`  ${job.title} at ${job.companyName} (${job.companySlug})`);
  }

  // Filter by company using the canonical `companySlug` from a response,
  // not a guess based on `companyName`.
  const slug = results.jobs[0]?.companySlug;
  if (slug) {
    console.log(`\n==> All open roles at '${slug}'`);
    const byCompany = await searchJobs({ company: slug });
    for (const job of byCompany.jobs.slice(0, 5)) console.log(`  ${job.title}`);
  }

  // Uncomment to sync the entire feed. Over 100,000 jobs at 20 per request
  // takes thousands of requests, so use a free key.
  // const allJobs = await fetchAllJobs();
  // console.log(`\nSynced ${allJobs.length.toLocaleString()} jobs`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
