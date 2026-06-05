// Client-side search + tag filtering for the resource index.
//
// Progressive enhancement: the full list is rendered server-side, and this
// script only hides/shows entries. With JS disabled, every resource is still
// visible.
(function () {
  "use strict";

  var search = document.getElementById("resource-search");
  var tagFilter = document.getElementById("tag-filter");
  var list = document.getElementById("resource-list");
  var header = document.getElementById("list-header");
  var empty = document.getElementById("resource-empty");
  if (!list) return;

  var resources = Array.prototype.slice.call(list.querySelectorAll(".resource"));
  var groups = Array.prototype.slice.call(list.querySelectorAll(".resource-group"));
  var total = resources.length;
  var activeTags = [];

  // Precompute the searchable text and tag list for each resource once.
  resources.forEach(function (el) {
    var title = el.querySelector(".title");
    var desc = el.querySelector(".desc");
    var tags = el.getAttribute("data-tags");
    el._tags = tags ? tags.split("|").filter(Boolean) : [];
    // Include tags (parents + children) in the search text so typing a label
    // like "cas" or "air-to-ground" matches too.
    el._text = (
      (title ? title.textContent : "") + " " +
      (desc ? desc.textContent : "") + " " +
      el._tags.join(" ")
    ).toLowerCase();
  });

  function apply() {
    var q = (search ? search.value : "").trim().toLowerCase();
    var visible = 0;

    resources.forEach(function (el) {
      var matchesText = !q || el._text.indexOf(q) !== -1;
      // A resource matches the tag filter if no tags are selected, or it
      // carries at least one of the selected tags (OR semantics).
      var matchesTags =
        activeTags.length === 0 ||
        activeTags.some(function (t) {
          return el._tags.indexOf(t) !== -1;
        });
      var show = matchesText && matchesTags;
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

  if (tagFilter) {
    tagFilter.addEventListener("click", function (e) {
      var btn = e.target.closest(".tag-chip");
      if (!btn) return;
      var tag = btn.getAttribute("data-tag");
      var i = activeTags.indexOf(tag);
      if (i === -1) {
        activeTags.push(tag);
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
      } else {
        activeTags.splice(i, 1);
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
      }
      apply();
    });
  }
})();
