#!/usr/bin/env ruby
# frozen_string_literal: true

# Checks that every resource URL in _data/resources.yml is still reachable.
#
# Intended to run on a schedule (see .github/workflows/link-check.yml), NOT on
# every PR — external requests are slow and occasionally flaky, so we keep this
# off the main build gate. Exits non-zero if any link looks genuinely dead
# (404/410/5xx or a connection/timeout error). Access-controlled responses
# (401/403/405/429) are reported as warnings, not failures.

require "yaml"
require "net/http"
require "uri"

ROOT      = File.expand_path("..", __dir__)
RESOURCES = File.join(ROOT, "_data", "resources.yml")

MAX_REDIRECTS = 5
TIMEOUT       = 15
RETRIES       = 1
UA = "dcs-resource-hub-linkcheck/1.0 (+https://github.com/joemurrell/dcs-resource-hub)"

# HTTP statuses that mean "reachable, but the bot isn't allowed to see it" —
# treated as warnings so a login wall or rate limit doesn't fail the run.
SOFT_STATUSES = [401, 403, 405, 406, 429].freeze

def request(uri, method, redirects = MAX_REDIRECTS)
  raise "too many redirects" if redirects.negative?

  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = uri.scheme == "https"
  http.open_timeout = TIMEOUT
  http.read_timeout = TIMEOUT

  klass = method == :head ? Net::HTTP::Head : Net::HTTP::Get
  res = http.request(klass.new(uri, "User-Agent" => UA))

  if res.is_a?(Net::HTTPRedirection) && res["location"]
    return request(URI.join(uri.to_s, res["location"]), method, redirects - 1)
  end
  res
end

# Returns [:ok | :warn | :fail, detail].
def check(url)
  uri = URI.parse(url)
  return [:fail, "not an http(s) URL"] unless uri.is_a?(URI::HTTP)

  attempt = 0
  begin
    res = request(uri, :head)
    # Some servers don't support HEAD; retry those with GET before judging.
    res = request(uri, :get) if res.code.to_i >= 400
    code = res.code.to_i

    if code < 400
      [:ok, code.to_s]
    elsif SOFT_STATUSES.include?(code)
      [:warn, "HTTP #{code} (access-controlled)"]
    else
      [:fail, "HTTP #{code}"]
    end
  rescue StandardError => e
    attempt += 1
    retry if attempt <= RETRIES
    [:fail, e.class.name + ": " + e.message]
  end
end

data = YAML.safe_load_file(RESOURCES)
items = (data && data["items"]) || []

failures = []
warnings = []

items.each do |item|
  url = item["url"].to_s.strip
  title = item["title"].to_s.strip
  next if url.empty?

  status, detail = check(url)
  line = format("%-6s %s  (%s)", status.to_s.upcase, url, detail)
  case status
  when :ok
    puts "OK     #{url}  -> #{detail}"
  when :warn
    warnings << "#{title.empty? ? url : title}: #{detail} — #{url}"
    puts line
  when :fail
    failures << "#{title.empty? ? url : title}: #{detail} — #{url}"
    puts line
  end
end

puts
puts "Checked #{items.size} link(s): #{failures.size} dead, #{warnings.size} warning(s)."

unless warnings.empty?
  warn "\nWarnings (reachable but access-controlled):"
  warnings.each { |w| warn "  - #{w}" }
end

unless failures.empty?
  warn "\nDead links:"
  failures.each { |f| warn "  - #{f}" }
  exit 1
end

puts "All links healthy."
