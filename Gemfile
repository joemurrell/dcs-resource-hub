# Pins the toolchain so local builds and CI match what GitHub Pages runs.
#
# The `github-pages` gem bundles the exact Jekyll version GitHub Pages uses,
# along with the jekyll-sitemap and jekyll-feed plugins this site relies on,
# so there is no need to list those separately.
source "https://rubygems.org"

gem "github-pages", group: :jekyll_plugins

# Used by `script/build.sh` / CI to validate the generated HTML.
gem "html-proofer", "~> 5.0"

# webrick is no longer a default gem on Ruby 3+, but `jekyll serve` needs it.
gem "webrick", "~> 1.8"
