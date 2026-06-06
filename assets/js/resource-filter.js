// Client-side search + tag filtering for the resource index.
//
// Progressive enhancement: the full list is rendered server-side, and this
// script only hides/shows entries. With JS disabled, every resource is still
// visible.
(function () {
  "use strict";

  var search = document.getElementById("resource-search");
  var tagFilter = document.getElementById("tag-filter");
  var diffFilter = document.getElementById("difficulty-filter");
  var list = document.getElementById("resource-list");
  var header = document.getElementById("list-header");
  var empty = document.getElementById("resource-empty");
  if (!list) return;

  var resources = Array.prototype.slice.call(list.querySelectorAll(".resource"));
  var groups = Array.prototype.slice.call(list.querySelectorAll(".resource-group"));
  var total = resources.length;
  var activeTags = [];
  var activeDiffs = [];

  // Precompute the searchable text, tag list and difficulty for each resource.
  resources.forEach(function (el) {
    var title = el.querySelector(".title");
    var desc = el.querySelector(".desc");
    var tags = el.getAttribute("data-tags");
    el._tags = tags ? tags.split("|").filter(Boolean) : [];
    el._diff = (el.getAttribute("data-difficulty") || "").toLowerCase();
    // Include tags (parents + children) and difficulty in the search text so
    // typing a label like "cas", "air-to-ground" or "beginner" matches too.
    el._text = (
      (title ? title.textContent : "") + " " +
      (desc ? desc.textContent : "") + " " +
      el._tags.join(" ") + " " + el._diff
    ).toLowerCase();
  });

  function apply() {
    var q = (search ? search.value : "").trim().toLowerCase();
    var visible = 0;

    resources.forEach(function (el) {
      var matchesText = !q || el._text.indexOf(q) !== -1;
      // OR within the tag facet: match when no tags are selected, or the
      // resource carries at least one selected tag.
      var matchesTags =
        activeTags.length === 0 ||
        activeTags.some(function (t) {
          return el._tags.indexOf(t) !== -1;
        });
      // The difficulty facet is ANDed with tags: a resource must also match a
      // selected difficulty (OR within the difficulty facet).
      var matchesDiff =
        activeDiffs.length === 0 ||
        activeDiffs.indexOf(el._diff) !== -1;
      var show = matchesText && matchesTags && matchesDiff;
      el.hidden = !show;
      if (show) visible++;
    });

    // Collapse a category heading when none of its resources are visible.
    groups.forEach(function (g) {
      g.hidden = !g.querySelector(".resource:not([hidden])");
    });

    if (empty) empty.hidden = visible !== 0;
    if (header) {
      header.textContent =
        "// RESOURCE INDEX — " +
        (visible !== total ? visible + " / " + total : total) +
        " ENTRIES";
    }
  }

  if (search) {
    search.addEventListener("input", apply);
  }

  // Toggle a chip's active state on click and re-apply. Shared by the tag and
  // difficulty filters; `attr` is the data attribute holding the chip's value.
  function bindChips(container, activeArr, attr) {
    if (!container) return;
    container.addEventListener("click", function (e) {
      var btn = e.target.closest(".tag-chip");
      if (!btn) return;
      var val = btn.getAttribute(attr);
      var i = activeArr.indexOf(val);
      if (i === -1) {
        activeArr.push(val);
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
      } else {
        activeArr.splice(i, 1);
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
      }
      apply();
    });
  }

  bindChips(tagFilter, activeTags, "data-tag");
  bindChips(diffFilter, activeDiffs, "data-difficulty");
})();
