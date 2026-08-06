/**
 * Himalayas Remote Jobs API — TypeScript example with full response types.
 *
 * Docs: https://himalayas.app/docs/remote-jobs-api
 *
 * Usage:
 *   npx tsx examples/typescript.ts
 *
 * Copy the types below into your own project, or generate a client from the
 * OpenAPI spec:
 *   npx @hey-api/openapi-ts -i https://himalayas.app/docs/openapi.json -o src/himalayas
 */

const BASE_URL = 'https://himalayas.app';

export type EmploymentType =
  | 'Full Time'
  | 'Part Time'
  | 'Contractor'
  | 'Temporary'
  | 'Intern'
  | 'Volunteer'
  | 'Other';

export type Seniority =
  | 'Entry-level'
  | 'Mid-level'
  | 'Senior'
  | 'Manager'
  | 'Director'
  | 'Executive';

export type SalaryPeriod = 'hourly' | 'weekly' | 'fortnightly' | 'monthly' | 'annual';

export type SortOrder =
  | 'relevant'
  | 'recent'
  | 'salaryAsc'
  | 'salaryDesc'
  | 'nameAToZ'
  | 'nameZToA'
  | 'jobs';

export interface Job {
  /** Job title. */
  title: string;
  /** First few sentences of the job description, as plain text. */
  excerpt: string;
  companyName: string;
  /** Canonical company identifier — pass this back as the `company` filter. */
  companySlug: string;
  companyLogo: string;
  employmentType: EmploymentType;
  /** In `salaryPeriod` units, not normalized to annual. Null when undisclosed. */
  minSalary: number | null;
  maxSalary: number | null;
  salaryPeriod: SalaryPeriod;
  /** ISO 4217 currency code, e.g. 'USD'. Null when undisclosed. */
  currency: string | null;
  seniority: Seniority[];
  /** Countries the candidate must be located in. */
  locationRestrictions: string[];
  /** UTC offsets the candidate must be within, e.g. [-8, -7, -6]. */
  timezoneRestrictions: number[];
  categories: string[];
  parentCategories: string[];
  /** Full job description as HTML — sanitize before rendering. */
  description: string;
  /** Unix timestamp in seconds. */
  pubDate: number;
  /** Unix timestamp in seconds. */
  expiryDate: number;
  applicationLink: string;
  /** Stable unique identifier — deduplicate on this. */
  guid: string;
}

export interface JobsResponse {
  comments: string;
  /** Unix timestamp in seconds of the last data refresh. */
  updatedAt: number;
  offset: number;
  limit: number;
  totalCount: number;
  jobs: Job[];
}

export interface SearchFilters {
  q?: string;
  /** ISO alpha-2, country name, slug, or abbreviation. */
  country?: string;
  worldwide?: boolean;
  exclude_worldwide?: boolean;
  /** Comma-separate for multiple, e.g. 'Mid-level,Senior'. */
  seniority?: string;
  employment_type?: string;
  /** Comma-separated company slugs, e.g. 'linear,vercel'. */
  company?: string;
  /** e.g. '-5', 'UTC-5', 'UTC+05:30'. */
  timezone?: string;
  sort?: SortOrder;
  /** 1-based. */
  page?: number;
}

async function request(url: URL): Promise<JobsResponse> {
  const response = await fetch(url);
  if (response.status === 429) {
    throw new Error('Rate limited. The feed refreshes every 24h — back off and retry.');
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  }
  return (await response.json()) as JobsResponse;
}

/** Fetch a page of the full remote jobs feed. `limit` is capped at 20. */
export async function browseJobs(limit = 20, offset = 0): Promise<JobsResponse> {
  const url = new URL('/jobs/api', BASE_URL);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  return request(url);
}

/** Search remote jobs with any combination of filters. */
export async function searchJobs(filters: SearchFilters = {}): Promise<JobsResponse> {
  const url = new URL('/jobs/api/search', BASE_URL);
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return request(url);
}

async function main(): Promise<void> {
  const feed = await browseJobs(5);
  console.log(`${feed.totalCount.toLocaleString()} remote jobs available\n`);
  for (const job of feed.jobs) {
    console.log(`  ${job.title} — ${job.companyName}`);
  }

  const results = await searchJobs({
    q: 'typescript',
    seniority: 'Senior',
    employment_type: 'Full Time',
    sort: 'recent',
  });
  console.log(`\n${results.totalCount.toLocaleString()} senior TypeScript roles\n`);
  for (const job of results.jobs.slice(0, 5)) {
    console.log(`  ${job.title} — ${job.companyName} (${job.companySlug})`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
