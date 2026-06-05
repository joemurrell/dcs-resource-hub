#!/usr/bin/env ruby
# frozen_string_literal: true

# Validates _data/resources.yml — the file the Decap CMS writes to when
# editors add or change links. Because that file is edited by non-developers
# through the CMS, this guard keeps malformed entries from reaching the live
# site. Run locally with `ruby script/validate_resources.rb`; CI runs it on
# every push and pull request.

require "yaml"
require "uri"
require "set"
require "date"

ROOT          = File.expand_path("..", __dir__)
RESOURCES     = File.join(ROOT, "_data", "resources.yml")
CMS_CONFIG    = File.join(ROOT, "admin", "config.yml")

errors = []

def load_yaml(path)
  # Permit Date/Time so an unquoted `date:` (which YAML parses to a Date) loads.
  YAML.safe_load_file(path, permitted_classes: [Date, Time])
rescue StandardError => e
  abort "FATAL: could not parse #{path}: #{e.message}"
end

# The options for a `select` field are defined once, in the Decap CMS config.
# Read them back here so the validator and the CMS never drift apart instead of
# hard-coding a second copy of each list.
def select_options(config, field_name)
  found = nil
  walk = lambda do |node|
    case node
    when Hash
      if node["name"] == field_name && node["widget"] == "select" && node["options"]
        found = node["options"]
      end
      node.each_value { |v| walk.call(v) }
    when Array
      node.each { |v| walk.call(v) }
    end
  end
  walk.call(config)
  Array(found)
end

abort "FATAL: #{RESOURCES} not found" unless File.exist?(RESOURCES)

data   = load_yaml(RESOURCES)
config = File.exist?(CMS_CONFIG) ? load_yaml(CMS_CONFIG) : {}
tags_allowed       = select_options(config, "tags").to_set
difficulty_allowed = select_options(config, "difficulty").to_set

unless data.is_a?(Hash) && data["items"].is_a?(Array)
  abort "FATAL: #{RESOURCES} must contain a top-level `items:` list"
end

items = data["items"]
seen_urls = {}

items.each_with_index do |item, i|
  label = "items[#{i}]"

  unless item.is_a?(Hash)
    errors << "#{label}: each entry must be a mapping (got #{item.class})"
    next
  end

  title = item["title"]
  url   = item["url"]
  tags  = item["tags"]

  # Title — required, non-blank.
  if title.nil? || title.to_s.strip.empty?
    errors << "#{label}: missing or blank `title`"
  else
    label = "items[#{i}] \"#{title}\""
  end

  # URL — required, well-formed http(s), and unique.
  if url.nil? || url.to_s.strip.empty?
    errors << "#{label}: missing or blank `url`"
  else
    url = url.to_s.strip
    begin
      parsed = URI.parse(url)
      unless parsed.is_a?(URI::HTTP) && !parsed.host.to_s.empty?
        errors << "#{label}: `url` must be an http(s) link, got #{url.inspect}"
      end
    rescue URI::InvalidURIError
      errors << "#{label}: `url` is not a valid URI: #{url.inspect}"
    end

    if seen_urls.key?(url)
      errors << "#{label}: duplicate `url` (also used by #{seen_urls[url]})"
    else
      seen_urls[url] = title || "items[#{i}]"
    end
  end

  # Tags — optional, but anything present must be a known CMS option.
  unless tags.nil?
    unless tags.is_a?(Array)
      errors << "#{label}: `tags` must be a list"
      tags = []
    end
    if tags_allowed.any?
      Array(tags).each do |tag|
        next if tags_allowed.include?(tag)

        errors << "#{label}: unknown tag #{tag.inspect} " \
                  "(allowed: #{tags_allowed.to_a.join(', ')})"
      end
    end
  end

  # Date — optional. YAML may parse it to a Date/Time already; a quoted string
  # must still be parseable so the index can sort and badge by it.
  date = item["date"]
  unless date.nil?
    valid_date =
      case date
      when Date, Time then true
      else
        begin
          DateTime.parse(date.to_s)
          true
        rescue ArgumentError, TypeError
          false
        end
      end
    errors << "#{label}: `date` is not a valid date: #{date.inspect}" unless valid_date
  end

  # Difficulty — optional, but must be one of the CMS's allowed options.
  difficulty = item["difficulty"]
  if !difficulty.nil? && difficulty_allowed.any? && !difficulty_allowed.include?(difficulty)
    errors << "#{label}: unknown difficulty #{difficulty.inspect} " \
              "(allowed: #{difficulty_allowed.to_a.join(', ')})"
  end
end

if errors.empty?
  puts "OK: #{items.size} resource(s) validated — titles, URLs, and tags look good."
  exit 0
else
  warn "Found #{errors.size} problem(s) in _data/resources.yml:\n\n"
  errors.each { |e| warn "  - #{e}" }
  warn "\nFix the entries above (or via the CMS) and re-run."
  exit 1
end
