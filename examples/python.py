"""Himalayas Remote Jobs API: Python example.

Docs: https://himalayas.app/docs/remote-jobs-api

No API key needed; set HIMALAYAS_API_KEY to use a free key for higher limits (https://himalayas.app/signup/developer).

Usage:
    pip install requests
    python3 examples/python.py

Uses only `requests`.
"""

import os
import time
from typing import Optional

import requests

BASE_URL = "https://himalayas.app"
TIMEOUT = 30
MAX_TRIES = 3


def request(path: str, params: dict) -> dict:
    """GET a JSON endpoint. On 429, wait Retry-After seconds (60 if absent) and retry."""
    key = os.getenv("HIMALAYAS_API_KEY")
    headers = {"Authorization": f"Bearer {key}"} if key else {}
    for attempt in range(1, MAX_TRIES + 1):
        response = requests.get(
            f"{BASE_URL}{path}", params=params, headers=headers, timeout=TIMEOUT
        )
        if response.status_code == 429 and attempt < MAX_TRIES:
            time.sleep(float(response.headers.get("Retry-After", "60")))
            continue
        response.raise_for_status()
        return response.json()


def browse_jobs(limit: int = 20, cursor: Optional[str] = None) -> dict:
    """Fetch a page of the full remote jobs feed. `limit` is capped at 20.

    Pass the previous response's `nextCursor` as `cursor` to get the next page.
    """
    params = {"limit": limit}
    if cursor:
        params["cursor"] = cursor
    return request("/jobs/api", params)


def search_jobs(**filters) -> dict:
    """Search remote jobs.

    Accepted filters: q, country (one per request), worldwide, exclude_worldwide,
    seniority, employment_type, company, timezone, sort, page.
    To page, increase `page` until a page returns no jobs; dedupe on `guid`.
    """
    return request("/jobs/api/search", filters)


def fetch_all_jobs(page_size: int = 20, delay: float = 1.1) -> list[dict]:
    """Walk the entire feed with `nextCursor`, deduplicating on the stable `guid`.

    Stops when a response has no `nextCursor`; `totalCount` is only an estimate.
    Browse responses are cached for up to two hours, so syncing more often
    than that gains little. The delay keeps a keyed client under 60 requests/minute.
    """
    jobs: dict[str, dict] = {}
    cursor = None

    while True:
        page = browse_jobs(limit=page_size, cursor=cursor)
        for job in page["jobs"]:
            jobs[job["guid"]] = job
        print(f"  fetched {len(jobs):,}")
        cursor = page.get("nextCursor")
        if not cursor:
            return list(jobs.values())
        time.sleep(delay)


def format_salary(job: dict) -> str:
    """Salaries are expressed in `salaryPeriod` units, not normalized to annual."""
    if job["minSalary"] is None and job["maxSalary"] is None:
        return "salary not disclosed"
    currency = job["currency"] or ""
    low = f"{job['minSalary']:,}" if job["minSalary"] else "?"
    high = f"{job['maxSalary']:,}" if job["maxSalary"] else "?"
    return f"{currency} {low}-{high} per {job['salaryPeriod']}".strip()


if __name__ == "__main__":
    print("==> Newest remote jobs")
    feed = browse_jobs(limit=5)
    print(f"About {feed['totalCount']:,} remote jobs available\n")
    for job in feed["jobs"]:
        print(f"  {job['title']} at {job['companyName']}")
        print(f"    {format_salary(job)}")
        # Use applicationLink unchanged for every Apply action.
        print(f"    {job['applicationLink']}")

    print("\n==> Senior React roles open to US candidates")
    results = search_jobs(
        q="react",
        country="US",
        seniority="Senior",
        employment_type="Full Time",
        sort="recent",
    )
    print(f"About {results['totalCount']:,} matches\n")
    for job in results["jobs"][:5]:
        print(f"  {job['title']} at {job['companyName']} ({job['companySlug']})")

    # Filter by company using the canonical `companySlug` from a response,
    # not a guess based on `companyName`.
    if results["jobs"]:
        slug = results["jobs"][0]["companySlug"]
        print(f"\n==> All open roles at '{slug}'")
        for job in search_jobs(company=slug)["jobs"][:5]:
            print(f"  {job['title']}")

    # Uncomment to sync the entire feed. Over 100,000 jobs at 20 per request
    # takes thousands of requests, so use a free key.
    # all_jobs = fetch_all_jobs()
    # print(f"\nSynced {len(all_jobs):,} jobs")
