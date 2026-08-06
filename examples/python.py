"""Himalayas Remote Jobs API — Python example.

Docs: https://himalayas.app/docs/remote-jobs-api

Usage:
    pip install requests
    python3 examples/python.py

Uses only `requests`; no API key or authentication is required.
"""

import time

import requests

BASE_URL = "https://himalayas.app"
TIMEOUT = 30


def browse_jobs(limit: int = 20, offset: int = 0) -> dict:
    """Fetch a page of the full remote jobs feed. `limit` is capped at 20."""
    response = requests.get(
        f"{BASE_URL}/jobs/api",
        params={"limit": limit, "offset": offset},
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def search_jobs(**filters) -> dict:
    """Search remote jobs.

    Accepted filters: q, country, worldwide, exclude_worldwide, seniority,
    employment_type, company, timezone, sort, page.
    """
    response = requests.get(
        f"{BASE_URL}/jobs/api/search",
        params=filters,
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def fetch_all_jobs(page_size: int = 20, delay: float = 1.0) -> list[dict]:
    """Page through the entire feed, deduplicating on the stable `guid`.

    The data refreshes once every 24 hours, so a single daily sync is plenty.
    The delay keeps you comfortably inside the rate limit.
    """
    jobs: dict[str, dict] = {}
    offset = 0
    total = None

    while total is None or offset < total:
        page = browse_jobs(limit=page_size, offset=offset)
        total = page["totalCount"]
        for job in page["jobs"]:
            jobs[job["guid"]] = job
        print(f"  fetched {len(jobs)}/{total}")
        offset += page_size
        time.sleep(delay)

    return list(jobs.values())


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
    print(f"{feed['totalCount']:,} remote jobs available\n")
    for job in feed["jobs"]:
        print(f"  {job['title']} — {job['companyName']}")
        print(f"    {format_salary(job)}")
        print(f"    {job['applicationLink']}")

    print("\n==> Senior React roles open to US candidates")
    results = search_jobs(
        q="react",
        country="US",
        seniority="Senior",
        employment_type="Full Time",
        sort="recent",
    )
    print(f"{results['totalCount']:,} matches\n")
    for job in results["jobs"][:5]:
        print(f"  {job['title']} — {job['companyName']} ({job['companySlug']})")

    # Filter by company using the canonical `companySlug` from a response,
    # not a guess based on `companyName`.
    if results["jobs"]:
        slug = results["jobs"][0]["companySlug"]
        print(f"\n==> All open roles at '{slug}'")
        for job in search_jobs(company=slug)["jobs"][:5]:
            print(f"  {job['title']}")

    # Uncomment to sync the entire feed (takes a while — ~95k jobs at 20/request).
    # all_jobs = fetch_all_jobs()
    # print(f"\nSynced {len(all_jobs):,} jobs")
