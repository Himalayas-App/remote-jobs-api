/**
 * Himalayas Remote Jobs API: TypeScript example with full response types.
 *
 * Docs: https://himalayas.app/docs/remote-jobs-api
 *
 * No API key needed; set HIMALAYAS_API_KEY to use a free key for higher limits (https://himalayas.app/signup/developer).
 *
 * Usage:
 *   npx tsx examples/typescript.ts
 *
 * Copy the types below into your own project, or generate a client from the
 * OpenAPI spec:
 *   npx @hey-api/openapi-ts -i https://himalayas.app/docs/openapi.json -o src/himalayas
 */

const BASE_URL = 'https://himalayas.app';
const MAX_TRIES = 3;

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
  /** Canonical company identifier: pass this back as the `company` filter. */
  companySlug: string;
  /** Logo URL, or an empty string when there is none. */
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
  /** Timezones the candidate must be within, as hours from UTC, e.g. [-8, -7, -6]. Empty means all. */
  timezoneRestrictions: number[];
  categories: string[];
  parentCategories: string[];
  /** Full job description as HTML. Sanitize before rendering. */
  description: string;
  /** Unix timestamp in seconds when the job was last updated. */
  pubDate: number;
  /** Unix timestamp in seconds: the latest the job stays listed. It can close earlier. */
  expiryDate: number;
  /** Job page on Himalayas. Use it unchanged for every Apply action. */
  applicationLink: string;
  /** Stable unique identifier. Deduplicate on this. */
  guid: string;
}

export interface JobsResponse {
  comments: string;
  /** Unix timestamp in seconds of the most recently updated job in the response. */
  updatedAt: number;
  limit: number;
  /** Browse only: pass back as `cursor` for the next page. Absent at the end. */
  nextCursor?: string;
  /** An estimate. Never use it as a stopping condition. */
  totalCount: number;
  jobs: Job[];
}

export interface SearchFilters {
  q?: string;
  /** One country per request: ISO alpha-2, country name or slug. */
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
  /** 1-based. Increase until a page returns no jobs; dedupe on `guid`. */
  page?: number;
}

/** GET a JSON endpoint. On 429, wait Retry-After seconds (60 if absent) and retry. */
async function request(url: URL): Promise<JobsResponse> {
  const key = process.env.HIMALAYAS_API_KEY;
  const headers: Record<string, string> = key ? { Authorization: `Bearer ${key}` } : {};
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers });
    if (response.status === 429 && attempt < MAX_TRIES) {
      const seconds = Number(response.headers.get('retry-after') ?? 60);
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      continue;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    }
    return (await response.json()) as JobsResponse;
  }
}

/**
 * Fetch a page of the full remote jobs feed. `limit` is capped at 20.
 * Pass the previous response's `nextCursor` as `cursor`; stop when it is absent.
 */
export async function browseJobs(limit = 20, cursor?: string): Promise<JobsResponse> {
  const url = new URL('/jobs/api', BASE_URL);
  url.searchParams.set('limit', String(limit));
  if (cursor) url.searchParams.set('cursor', cursor);
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
  console.log(`About ${feed.totalCount.toLocaleString()} remote jobs available\n`);
  for (const job of feed.jobs) {
    console.log(`  ${job.title} at ${job.companyName}`);
  }

  const results = await searchJobs({
    q: 'typescript',
    seniority: 'Senior',
    employment_type: 'Full Time',
    sort: 'recent',
  });
  console.log(`\nAbout ${results.totalCount.toLocaleString()} senior TypeScript roles\n`);
  for (const job of results.jobs.slice(0, 5)) {
    console.log(`  ${job.title} at ${job.companyName} (${job.companySlug})`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
