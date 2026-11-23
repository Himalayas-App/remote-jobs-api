# Himalayas Remote Jobs API: Ruby example.
#
# Docs: https://himalayas.app/docs/remote-jobs-api
#
# No API key needed; set HIMALAYAS_API_KEY to use a free key for higher limits (https://himalayas.app/signup/developer).
#
# Usage:
#   ruby examples/ruby.rb
#
# Uses only the standard library.

require 'json'
require 'net/http'
require 'uri'

BASE_URL = 'https://himalayas.app'.freeze
MAX_TRIES = 3

# Fetch a page of the full remote jobs feed. `limit` is capped at 20.
# Pass the previous response's `nextCursor` as `cursor`; stop when it is absent.
def browse_jobs(limit: 20, cursor: nil)
  himalayas_request('/jobs/api', limit: limit, cursor: cursor)
end

# Search remote jobs.
# Filters: q, country (one per request), worldwide, exclude_worldwide,
# seniority, employment_type, company, timezone, sort, page.
# To page, increase `page` until a page returns no jobs; dedupe on `guid`.
def search_jobs(**filters)
  himalayas_request('/jobs/api/search', **filters)
end

# GET a JSON endpoint. On 429, wait Retry-After seconds (60 if absent) and retry.
def himalayas_request(path, **query)
  uri = URI("#{BASE_URL}#{path}")
  uri.query = URI.encode_www_form(query.compact)
  headers = {}
  key = ENV.fetch('HIMALAYAS_API_KEY', '')
  headers['Authorization'] = "Bearer #{key}" unless key.empty?

  (1..MAX_TRIES).each do |attempt|
    response = Net::HTTP.get_response(uri, headers)

    if response.code == '429' && attempt < MAX_TRIES
      sleep (response['Retry-After'] || 60).to_i
      next
    end
    raise "HTTP #{response.code} for #{uri}" unless response.is_a?(Net::HTTPSuccess)

    return JSON.parse(response.body)
  end
end

# Salaries are in `salaryPeriod` units; they are not normalized to annual.
def format_salary(job)
  return 'salary not disclosed' if job['minSalary'].nil? && job['maxSalary'].nil?

  low = job['minSalary'] ? job['minSalary'].to_s.reverse.scan(/\d{1,3}/).join(',').reverse : '?'
  high = job['maxSalary'] ? job['maxSalary'].to_s.reverse.scan(/\d{1,3}/).join(',').reverse : '?'
  "#{job['currency']} #{low}-#{high} per #{job['salaryPeriod']}".strip
end

puts '==> Newest remote jobs'
feed = browse_jobs(limit: 5)
puts "About #{feed['totalCount']} remote jobs available\n\n"
feed['jobs'].each do |job|
  puts "  #{job['title']} at #{job['companyName']}"
  puts "    #{format_salary(job)}"
  # Use applicationLink unchanged for every Apply action.
  puts "    #{job['applicationLink']}"
end

puts "\n==> Senior Ruby roles, newest first"
results = search_jobs(q: 'ruby', seniority: 'Senior', employment_type: 'Full Time', sort: 'recent')
puts "About #{results['totalCount']} matches\n\n"
results['jobs'].first(5).each do |job|
  puts "  #{job['title']} at #{job['companyName']} (#{job['companySlug']})"
end

# Filter by company using the canonical `companySlug` from a response,
# not a guess based on `companyName`.
slug = results['jobs'].first&.fetch('companySlug', nil)
if slug
  puts "\n==> All open roles at '#{slug}'"
  search_jobs(company: slug)['jobs'].first(5).each { |job| puts "  #{job['title']}" }
end
