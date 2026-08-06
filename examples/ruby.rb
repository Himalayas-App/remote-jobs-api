# Himalayas Remote Jobs API — Ruby example.
#
# Docs: https://himalayas.app/docs/remote-jobs-api
#
# Usage:
#   ruby examples/ruby.rb
#
# Uses only the standard library. No API key or authentication is required.

require 'json'
require 'net/http'
require 'uri'

BASE_URL = 'https://himalayas.app'.freeze

# Fetch a page of the full remote jobs feed. `limit` is capped at 20.
def browse_jobs(limit: 20, offset: 0)
  himalayas_request('/jobs/api', limit: limit, offset: offset)
end

# Search remote jobs.
# Filters: q, country, worldwide, exclude_worldwide, seniority,
# employment_type, company, timezone, sort, page.
def search_jobs(**filters)
  himalayas_request('/jobs/api/search', **filters)
end

def himalayas_request(path, **query)
  uri = URI("#{BASE_URL}#{path}")
  uri.query = URI.encode_www_form(query.compact)

  response = Net::HTTP.get_response(uri)

  raise 'Rate limited. The feed refreshes every 24h — back off and retry.' if response.code == '429'
  raise "HTTP #{response.code} for #{uri}" unless response.is_a?(Net::HTTPSuccess)

  JSON.parse(response.body)
end

# Salaries are in `salaryPeriod` units — they are not normalized to annual.
def format_salary(job)
  return 'salary not disclosed' if job['minSalary'].nil? && job['maxSalary'].nil?

  low = job['minSalary'] ? job['minSalary'].to_s.reverse.scan(/\d{1,3}/).join(',').reverse : '?'
  high = job['maxSalary'] ? job['maxSalary'].to_s.reverse.scan(/\d{1,3}/).join(',').reverse : '?'
  "#{job['currency']} #{low}-#{high} per #{job['salaryPeriod']}".strip
end

puts '==> Newest remote jobs'
feed = browse_jobs(limit: 5)
puts "#{feed['totalCount']} remote jobs available\n\n"
feed['jobs'].each do |job|
  puts "  #{job['title']} — #{job['companyName']}"
  puts "    #{format_salary(job)}"
  puts "    #{job['applicationLink']}"
end

puts "\n==> Senior Ruby roles, newest first"
results = search_jobs(q: 'ruby', seniority: 'Senior', employment_type: 'Full Time', sort: 'recent')
puts "#{results['totalCount']} matches\n\n"
results['jobs'].first(5).each do |job|
  puts "  #{job['title']} — #{job['companyName']} (#{job['companySlug']})"
end

# Filter by company using the canonical `companySlug` from a response,
# not a guess based on `companyName`.
slug = results['jobs'].first&.fetch('companySlug', nil)
if slug
  puts "\n==> All open roles at '#{slug}'"
  search_jobs(company: slug)['jobs'].first(5).each { |job| puts "  #{job['title']}" }
end
