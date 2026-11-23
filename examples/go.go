// Himalayas Remote Jobs API: Go example.
//
// Docs: https://himalayas.app/docs/remote-jobs-api
//
// No API key needed; set HIMALAYAS_API_KEY to use a free key for higher limits (https://himalayas.app/signup/developer).
//
// Usage:
//
//	go run examples/go.go
//
// Uses only the standard library.
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"
)

const (
	baseURL  = "https://himalayas.app"
	maxTries = 3
)

// Job is a single remote job listing.
type Job struct {
	Title       string `json:"title"`
	Excerpt     string `json:"excerpt"`
	CompanyName string `json:"companyName"`
	// CompanySlug is the canonical company identifier: pass it back as the
	// "company" search filter rather than guessing from CompanyName.
	CompanySlug string `json:"companySlug"`
	// CompanyLogo is a URL, or an empty string when there is none.
	CompanyLogo    string   `json:"companyLogo"`
	EmploymentType string   `json:"employmentType"`
	MinSalary      *float64 `json:"minSalary"`
	MaxSalary      *float64 `json:"maxSalary"`
	// SalaryPeriod is one of hourly, weekly, fortnightly, monthly, annual.
	// Salaries are in these units and are not normalized to annual.
	SalaryPeriod         string    `json:"salaryPeriod"`
	Currency             *string   `json:"currency"`
	Seniority            []string  `json:"seniority"`
	LocationRestrictions []string  `json:"locationRestrictions"`
	TimezoneRestrictions []float64 `json:"timezoneRestrictions"`
	Categories           []string  `json:"categories"`
	ParentCategories     []string  `json:"parentCategories"`
	Description          string    `json:"description"`
	PubDate              int64     `json:"pubDate"`
	ExpiryDate           int64     `json:"expiryDate"`
	// ApplicationLink is the job page on Himalayas. Use it unchanged for Apply.
	ApplicationLink string `json:"applicationLink"`
	// GUID is a stable unique identifier. Deduplicate on it.
	GUID string `json:"guid"`
}

// JobsResponse is the envelope returned by both endpoints.
type JobsResponse struct {
	Comments  string `json:"comments"`
	UpdatedAt int64  `json:"updatedAt"`
	Limit     int    `json:"limit"`
	// NextCursor (browse only) is passed back as "cursor" for the next page.
	// It is empty at the end of the feed.
	NextCursor string `json:"nextCursor"`
	// TotalCount is an estimate. Never use it as a stopping condition.
	TotalCount int   `json:"totalCount"`
	Jobs       []Job `json:"jobs"`
}

var client = &http.Client{Timeout: 30 * time.Second}

// BrowseJobs fetches a page of the full remote jobs feed. limit is capped at 20.
// Pass the previous response's NextCursor as cursor ("" for the first page);
// stop when NextCursor is empty.
func BrowseJobs(limit int, cursor string) (*JobsResponse, error) {
	query := url.Values{"limit": {fmt.Sprint(limit)}}
	if cursor != "" {
		query.Set("cursor", cursor)
	}
	return request("/jobs/api", query)
}

// SearchJobs searches remote jobs. Supported filters: q, country (one per
// request), worldwide, exclude_worldwide, seniority, employment_type, company,
// timezone, sort, page. To page, increase page until a page returns no jobs;
// dedupe on GUID.
func SearchJobs(filters url.Values) (*JobsResponse, error) {
	return request("/jobs/api/search", filters)
}

// request GETs a JSON endpoint. On 429 it waits Retry-After seconds (60 if
// absent) and retries, up to maxTries attempts.
func request(path string, query url.Values) (*JobsResponse, error) {
	endpoint := baseURL + path + "?" + query.Encode()

	for attempt := 1; ; attempt++ {
		req, err := http.NewRequest(http.MethodGet, endpoint, nil)
		if err != nil {
			return nil, err
		}
		if key := os.Getenv("HIMALAYAS_API_KEY"); key != "" {
			req.Header.Set("Authorization", "Bearer "+key)
		}

		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}

		if resp.StatusCode == http.StatusTooManyRequests && attempt < maxTries {
			resp.Body.Close()
			wait, err := strconv.Atoi(resp.Header.Get("Retry-After"))
			if err != nil {
				wait = 60
			}
			time.Sleep(time.Duration(wait) * time.Second)
			continue
		}
		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return nil, fmt.Errorf("HTTP %d for %s", resp.StatusCode, endpoint)
		}

		var result JobsResponse
		err = json.NewDecoder(resp.Body).Decode(&result)
		resp.Body.Close()
		if err != nil {
			return nil, err
		}
		return &result, nil
	}
}

// formatSalary shows salaries in SalaryPeriod units; they are not normalized to annual.
func formatSalary(job Job) string {
	if job.MinSalary == nil && job.MaxSalary == nil {
		return "salary not disclosed"
	}
	currency := ""
	if job.Currency != nil {
		currency = *job.Currency
	}
	low, high := "?", "?"
	if job.MinSalary != nil {
		low = fmt.Sprintf("%.0f", *job.MinSalary)
	}
	if job.MaxSalary != nil {
		high = fmt.Sprintf("%.0f", *job.MaxSalary)
	}
	return fmt.Sprintf("%s %s-%s per %s", currency, low, high, job.SalaryPeriod)
}

func main() {
	fmt.Println("==> Newest remote jobs")
	feed, err := BrowseJobs(5, "")
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Printf("About %d remote jobs available\n\n", feed.TotalCount)
	for _, job := range feed.Jobs {
		fmt.Printf("  %s at %s\n", job.Title, job.CompanyName)
		fmt.Printf("    %s\n", formatSalary(job))
		fmt.Printf("    %s\n", job.ApplicationLink)
	}

	fmt.Println("\n==> Senior Go roles, newest first")
	results, err := SearchJobs(url.Values{
		"q":               {"golang"},
		"seniority":       {"Senior"},
		"employment_type": {"Full Time"},
		"sort":            {"recent"},
	})
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Printf("About %d matches\n\n", results.TotalCount)
	for i, job := range results.Jobs {
		if i >= 5 {
			break
		}
		fmt.Printf("  %s at %s (%s)\n", job.Title, job.CompanyName, job.CompanySlug)
	}
}
