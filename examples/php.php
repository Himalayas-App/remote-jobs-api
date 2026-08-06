<?php
/**
 * Himalayas Remote Jobs API — PHP example.
 *
 * Docs: https://himalayas.app/docs/remote-jobs-api
 *
 * Usage:
 *   php examples/php.php
 *
 * Requires the curl and json extensions. No API key or authentication needed.
 */

const BASE_URL = 'https://himalayas.app';

/**
 * Fetch a page of the full remote jobs feed. $limit is capped at 20.
 */
function browse_jobs(int $limit = 20, int $offset = 0): array
{
    return himalayas_request('/jobs/api', ['limit' => $limit, 'offset' => $offset]);
}

/**
 * Search remote jobs.
 * Filters: q, country, worldwide, exclude_worldwide, seniority,
 * employment_type, company, timezone, sort, page.
 */
function search_jobs(array $filters = []): array
{
    return himalayas_request('/jobs/api/search', $filters);
}

function himalayas_request(string $path, array $query): array
{
    $url = BASE_URL . $path . '?' . http_build_query($query);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_USERAGENT => 'himalayas-remote-jobs-api-example/1.0',
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($body === false) {
        throw new RuntimeException("Request failed: {$error}");
    }
    if ($status === 429) {
        throw new RuntimeException('Rate limited. The feed refreshes every 24h — back off and retry.');
    }
    if ($status !== 200) {
        throw new RuntimeException("HTTP {$status} for {$url}");
    }

    return json_decode($body, true, 512, JSON_THROW_ON_ERROR);
}

/** Salaries are in salaryPeriod units — they are not normalized to annual. */
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
printf("%s remote jobs available\n\n", number_format($feed['totalCount']));
foreach ($feed['jobs'] as $job) {
    printf("  %s — %s\n", $job['title'], $job['companyName']);
    printf("    %s\n", format_salary($job));
    printf("    %s\n", $job['applicationLink']);
}

echo "\n==> Senior PHP roles, newest first\n";
$results = search_jobs([
    'q' => 'php',
    'seniority' => 'Senior',
    'employment_type' => 'Full Time',
    'sort' => 'recent',
]);
printf("%s matches\n\n", number_format($results['totalCount']));
foreach (array_slice($results['jobs'], 0, 5) as $job) {
    printf("  %s — %s (%s)\n", $job['title'], $job['companyName'], $job['companySlug']);
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
