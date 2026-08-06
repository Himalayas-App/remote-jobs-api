// Himalayas Remote Jobs API — Go example.
//
// Docs: https://himalayas.app/docs/remote-jobs-api
//
// Usage:
//
//	go run examples/go.go
//
// Uses only the standard library. No API key or authentication is required.
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"time"
)

const baseURL = "https://himalayas.app"

// Job is a single remote job listing.
type Job struct {
	Title       string `json:"title"`
	Excerpt     string `json:"excerpt"`
	CompanyName string `json:"companyName"`
	// CompanySlug is the canonical company identifier — pass it back as the
	// "company" search filter rather than guessing from CompanyName.
	CompanySlug    string   `json:"companySlug"`
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
	ApplicationLink      string    `json:"applicationLink"`
	// GUID is stable across refreshes — deduplicate on it.
	GUID string `json:"guid"`
}

// JobsResponse is the envelope returned by both endpoints.
type JobsResponse struct {
	Comments   string `json:"comments"`
	UpdatedAt  int64  `json:"updatedAt"`
	Offset     int    `json:"offset"`
	Limit      int    `json:"limit"`
	TotalCount int    `json:"totalCount"`
	Jobs       []Job  `json:"jobs"`
}

var client = &http.Client{Timeout: 30 * time.Second}

// BrowseJobs fetches a page of the full remote jobs feed. limit is capped at 20.
func BrowseJobs(limit, offset int) (*JobsResponse, error) {
	return request("/jobs/api", url.Values{
		"limit":  {fmt.Sprint(limit)},
		"offset": {fmt.Sprint(offset)},
	})
}

// SearchJobs searches remote jobs. Supported filters: q, country, worldwide,
// exclude_worldwide, seniority, employment_type, company, timezone, sort, page.
func SearchJobs(filters url.Values) (*JobsResponse, error) {
	return request("/jobs/api/search", filters)
}

func request(path string, query url.Values) (*JobsResponse, error) {
	endpoint := baseURL + path + "?" + query.Encode()

	resp, err := client.Get(endpoint)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("rate limited: the feed refreshes every 24h, back off and retry")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d for %s", resp.StatusCode, endpoint)
	}

	var result JobsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

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
	feed, err := BrowseJobs(5, 0)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Printf("%d remote jobs available\n\n", feed.TotalCount)
	for _, job := range feed.Jobs {
		fmt.Printf("  %s — %s\n", job.Title, job.CompanyName)
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
	fmt.Printf("%d matches\n\n", results.TotalCount)
	for i, job := range results.Jobs {
		if i >= 5 {
			break
		}
		fmt.Printf("  %s — %s (%s)\n", job.Title, job.CompanyName, job.CompanySlug)
	}
}
