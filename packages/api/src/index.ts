/**
 * Official client for the Himalayas Remote Jobs API.
 * Docs: https://himalayas.app/docs/remote-jobs-api
 * OpenAPI: https://himalayas.app/docs/openapi.json
 */

export const VERSION = '0.1.0';

export type EmploymentType =
  | 'Full Time'
  | 'Part Time'
  | 'Contractor'
  | 'Temporary'
  | 'Intern'
  | 'Volunteer'
  | 'Other';

export type Seniority = 'Entry-level' | 'Mid-level' | 'Senior' | 'Manager' | 'Director' | 'Executive';

export type SalaryPeriod = 'hourly' | 'weekly' | 'fortnightly' | 'monthly' | 'annual';

export type SortOrder = 'relevant' | 'recent' | 'salaryAsc' | 'salaryDesc' | 'nameAToZ' | 'nameZToA' | 'jobs';

export interface Job {
  title: string;
  excerpt: string;
  companyName: string;
  companySlug: string;
  companyLogo: string;
  employmentType: EmploymentType;
  /** In the pay period given by salaryPeriod, in currency. Null when not disclosed. */
  minSalary: number | null;
  maxSalary: number | null;
  seniority: Seniority[];
  currency: string;
  salaryPeriod: SalaryPeriod;
  /** Country names the job is open to, e.g. ["Brazil"]. Empty means open worldwide. */
  locationRestrictions: string[];
  /** UTC offsets in hours the job accepts, e.g. [-5, -4]. Empty means any time zone. */
  timezoneRestrictions: number[];
  categories: string[];
  parentCategories: string[];
  /** HTML description. */
  description: string;
  /** Unix timestamp (seconds). */
  pubDate: number;
  /** Unix timestamp (seconds). */
  expiryDate: number;
  applicationLink: string;
  /** The job's Himalayas URL. */
  guid: string;
}

export interface JobsResponse {
  comments?: string;
  updatedAt: number;
  /** Browse only. Absent on the last page. */
  nextCursor?: string;
  offset: number;
  limit: number;
  /** Approximate; for display only. */
  totalCount: number;
  jobs: Job[];
}

export interface BrowseParams {
  /** Jobs per page (the API caps this). */
  limit?: number;
  /** nextCursor from the previous page. */
  cursor?: string;
}

export interface SearchParams {
  /** Free-text query. */
  q?: string;
  /** ISO alpha-2 code, country name or slug. Includes jobs open worldwide unless excludeWorldwide is set. */
  country?: string;
  /** Only jobs open worldwide. */
  worldwide?: boolean;
  /** With country: leave out jobs open worldwide. */
  excludeWorldwide?: boolean;
  seniority?: Seniority | Seniority[];
  employmentType?: EmploymentType | EmploymentType[];
  /** Company slug(s). */
  company?: string | string[];
  /** UTC offset, e.g. "UTC-5" or "-5". */
  timezone?: string;
  sort?: SortOrder;
  /** 1-based page. */
  page?: number;
}

export type JobLookup =
  | { status: 'open'; job: Job }
  | { status: 'closed' }
  | { status: 'not_found' };

export interface HimalayasOptions {
  /** Optional free key (hml_...) for higher rate limits. Get one at https://himalayas.app/signup/developer */
  apiKey?: string;
  /** Identify your app, e.g. "my-job-board/1.0 (+https://example.com)". */
  userAgent?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export class HimalayasError extends Error {
  readonly status: number;
  /** Seconds to wait, from Retry-After on a 429. */
  readonly retryAfter?: number;

  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.name = 'HimalayasError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(',') : v);

export class Himalayas {
  private readonly apiKey?: string;
  private readonly userAgent: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HimalayasOptions = {}) {
    this.apiKey = options.apiKey;
    this.userAgent = options.userAgent
      ? `${options.userAgent} himalayas-api/${VERSION}`
      : `himalayas-api/${VERSION} (+https://github.com/Himalayas-App/remote-jobs-api)`;
    this.baseUrl = (options.baseUrl ?? 'https://himalayas.app').replace(/\/$/, '');
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  /** One page of the full remote jobs feed, newest first. */
  browse(params: BrowseParams = {}): Promise<JobsResponse> {
    return this.get('/jobs/api', { limit: params.limit, cursor: params.cursor });
  }

  /** Every job in the feed, following nextCursor until the last page. */
  async *browseAll(params: Omit<BrowseParams, 'cursor'> = {}): AsyncGenerator<Job> {
    let cursor: string | undefined;
    do {
      const page = await this.browse({ ...params, cursor });
      yield* page.jobs;
      cursor = page.nextCursor;
    } while (cursor);
  }

  /** Search jobs by keyword, country, seniority, employment type, company and timezone. */
  search(params: SearchParams = {}): Promise<JobsResponse> {
    return this.get('/jobs/api/search', {
      q: params.q,
      country: params.country,
      worldwide: params.worldwide,
      exclude_worldwide: params.excludeWorldwide,
      seniority: list(params.seniority),
      employment_type: list(params.employmentType),
      company: list(params.company),
      timezone: params.timezone,
      sort: params.sort,
      page: params.page,
    });
  }

  /**
   * Check whether one job is still open. Pass its Himalayas URL (the guid)
   * or its company slug and job slug.
   */
  async getJob(urlOrCompany: string, slug?: string): Promise<JobLookup> {
    let company = urlOrCompany;
    let jobSlug = slug;
    if (!slug) {
      const m = /\/companies\/([^/]+)\/jobs\/([^/?#]+)/.exec(urlOrCompany);
      if (!m) throw new TypeError('Pass a Himalayas job URL, or a company slug and a job slug');
      [, company, jobSlug] = m;
    }
    const path = `/jobs/api/companies/${encodeURIComponent(company)}/jobs/${encodeURIComponent(jobSlug!)}`;
    const res = await this.request(path, {});
    if (res.status === 404) return { status: 'not_found' };
    if (res.status === 410) return { status: 'closed' };
    const body = (await this.parse(res)) as { job: Job };
    return { status: 'open', job: body.job };
  }

  private async get<T>(path: string, query: Record<string, string | number | boolean | undefined>): Promise<T> {
    return (await this.parse(await this.request(path, query))) as T;
  }

  private request(path: string, query: Record<string, string | number | boolean | undefined>): Promise<Response> {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': this.userAgent };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    return this.fetchImpl(url, { headers });
  }

  private async parse(res: Response): Promise<unknown> {
    if (res.ok) return res.json();
    let message = `Himalayas API returned ${res.status}`;
    try {
      const body = (await res.json()) as { errors?: string };
      if (body?.errors) message = body.errors;
    } catch {
      // Non-JSON error body: keep the status message.
    }
    const retry = Number(res.headers.get('retry-after'));
    throw new HimalayasError(message, res.status, Number.isFinite(retry) && retry > 0 ? retry : undefined);
  }
}

export default Himalayas;
