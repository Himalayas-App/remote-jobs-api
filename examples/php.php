<?php
/**
 * Himalayas Remote Jobs API: PHP example.
 *
 * Docs: https://himalayas.app/docs/remote-jobs-api
 *
 * No API key needed; set HIMALAYAS_API_KEY to use a free key for higher limits (https://himalayas.app/signup/developer).
 *
 * Usage:
 *   php examples/php.php
 *
 * Requires the curl and json extensions.
 */

const BASE_URL = 'https://himalayas.app';
const MAX_TRIES = 3;

/**
 * Fetch a page of the full remote jobs feed. $limit is capped at 20.
 * Pass the previous response's nextCursor as $cursor; stop when it is absent.
 */
function browse_jobs(int $limit = 20, ?string $cursor = null): array
{
    $query = ['limit' => $limit];
    if ($cursor !== null) {
        $query['cursor'] = $cursor;
    }
    return himalayas_request('/jobs/api', $query);
}

/**
 * Search remote jobs.
 * Filters: q, country (one per request), worldwide, exclude_worldwide,
 * seniority, employment_type, company, timezone, sort, page.
 * To page, increase page until a page returns no jobs; dedupe on guid.
 */
function search_jobs(array $filters = []): array
{
    return himalayas_request('/jobs/api/search', $filters);
}

/**
 * GET a JSON endpoint. On 429, wait Retry-After seconds (60 if absent) and retry.
 */
function himalayas_request(string $path, array $query): array
{
    $url = BASE_URL . $path . '?' . http_build_query($query);
    $headers = [];
    $key = getenv('HIMALAYAS_API_KEY');
    if ($key) {
        $headers[] = "Authorization: Bearer {$key}";
    }

    for ($attempt = 1; ; $attempt++) {
        $retryAfter = 60;
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_USERAGENT => 'himalayas-remote-jobs-api-example/1.0',
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_HEADERFUNCTION => function ($ch, string $line) use (&$retryAfter): int {
                if (stripos($line, 'Retry-After:') === 0) {
                    $retryAfter = (int) trim(substr($line, 12));
                }
                return strlen($line);
            },
        ]);
        $body = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($body === false) {
            throw new RuntimeException("Request failed: {$error}");
        }
        if ($status === 429 && $attempt < MAX_TRIES) {
            sleep($retryAfter);
            continue;
        }
        if ($status !== 200) {
            throw new RuntimeException("HTTP {$status} for {$url}");
        }

        return json_decode($body, true, 512, JSON_THROW_ON_ERROR);
    }
}

/** Salaries are in salaryPeriod units; they are not normalized to annual. */
function format_salary(array $job): string
{
    if ($job['minSalary'] === null && $job['maxSalary'] === null) {
        return 'salary not disclosed';
    }
    $low = $job['minSalary'] !== null ? number_format($job['minSalary']) : '?';
    $high = $job['maxSalary'] !== null ? number_format($job['maxSalary']) : '?';

    return trim(sprintf('%s %s-%s per %s', $job['currency'] ?? '', $low, $high, $job['salaryPeriod']));
}

echo "==> Newest remote jobs\n";
$feed = browse_jobs(5);
printf("About %s remote jobs available\n\n", number_format($feed['totalCount']));
foreach ($feed['jobs'] as $job) {
    printf("  %s at %s\n", $job['title'], $job['companyName']);
    printf("    %s\n", format_salary($job));
    // Use applicationLink unchanged for every Apply action.
    printf("    %s\n", $job['applicationLink']);
}

echo "\n==> Senior PHP roles, newest first\n";
$results = search_jobs([
    'q' => 'php',
    'seniority' => 'Senior',
    'employment_type' => 'Full Time',
    'sort' => 'recent',
]);
printf("About %s matches\n\n", number_format($results['totalCount']));
foreach (array_slice($results['jobs'], 0, 5) as $job) {
    printf("  %s at %s (%s)\n", $job['title'], $job['companyName'], $job['companySlug']);
}

// Filter by company using the canonical companySlug from a response,
// not a guess based on companyName.
if (!empty($results['jobs'])) {
    $slug = $results['jobs'][0]['companySlug'];
    printf("\n==> All open roles at '%s'\n", $slug);
    foreach (array_slice(search_jobs(['company' => $slug])['jobs'], 0, 5) as $job) {
        printf("  %s\n", $job['title']);
    }
}
