/**
 * Himalayas Remote Jobs API — Node.js example.
 *
 * Docs: https://himalayas.app/docs/remote-jobs-api
 *
 * Usage:
 *   node examples/node.js
 *
 * Requires Node 18+ for the built-in fetch. No API key or authentication needed.
 *
 * Note: run this on the server, not in the browser — the API does not send
 * CORS headers, so a fetch() from browser JavaScript will be blocked.
 */

const BASE_URL = 'https://himalayas.app';

/** Fetch a page of the full remote jobs feed. `limit` is capped at 20. */
async function browseJobs({ limit = 20, offset = 0 } = {}) {
  const url = new URL('/jobs/api', BASE_URL);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  return request(url);
}

/**
 * Search remote jobs.
 * Filters: q, country, worldwide, exclude_worldwide, seniority,
 * employment_type, company, timezone, sort, page.
 */
async function searchJobs(filters = {}) {
  const url = new URL('/jobs/api/search', BASE_URL);
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return request(url);
}

async function request(url) {
  const response = await fetch(url);
  if (response.status === 429) {
    throw new Error('Rate limited. The feed refreshes every 24h — back off and retry.');
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

/**
 * Page through the entire feed, deduplicating on the stable `guid`.
 * The data refreshes once every 24 hours, so one daily sync is plenty.
 */
async function fetchAllJobs({ pageSize = 20, delayMs = 1000 } = {}) {
  const jobs = new Map();
  let offset = 0;
  let total = null;

  while (total === null || offset < total) {
    const page = await browseJobs({ limit: pageSize, offset });
    total = page.totalCount;
    for (const job of page.jobs) jobs.set(job.guid, job);
    console.log(`  fetched ${jobs.size}/${total}`);
    offset += pageSize;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return [...jobs.values()];
}

/** Salaries are in `salaryPeriod` units — they are not normalized to annual. */
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
  console.log(`${feed.totalCount.toLocaleString()} remote jobs available\n`);
  for (const job of feed.jobs) {
    console.log(`  ${job.title} — ${job.companyName}`);
    console.log(`    ${formatSalary(job)}`);
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
  console.log(`${results.totalCount.toLocaleString()} matches\n`);
  for (const job of results.jobs.slice(0, 5)) {
    console.log(`  ${job.title} — ${job.companyName} (${job.companySlug})`);
  }

  // Filter by company using the canonical `companySlug` from a response,
  // not a guess based on `companyName`.
  const slug = results.jobs[0]?.companySlug;
  if (slug) {
    console.log(`\n==> All open roles at '${slug}'`);
    const byCompany = await searchJobs({ company: slug });
    for (const job of byCompany.jobs.slice(0, 5)) console.log(`  ${job.title}`);
  }

  // Uncomment to sync the entire feed (~95k jobs at 20 per request).
  // const allJobs = await fetchAllJobs();
  // console.log(`\nSynced ${allJobs.length.toLocaleString()} jobs`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
