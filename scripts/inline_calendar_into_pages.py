#!/usr/bin/env python3
"""Inline the scoped CCOR favorite/calendar enhancement into the four WordPress HTML pages."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "2026" / "assets"

PAGES = {
    ROOT / "2026" / "Education.html": "education",
    ROOT / "2026" / "Events.html": "event",
    ROOT / "2026" / "Committees.html": "committee",
    ROOT / "2026" / "AllEvents.html": "all",
}

START = "<!-- CCOR INLINE FAVORITES + CALENDAR START -->"
END = "<!-- CCOR INLINE FAVORITES + CALENDAR END -->"
EXTERNAL_LOADER = re.compile(
    r"\s*<script\s+src=\"https://kweinkauff29\.github\.io/Homepage/2026/assets/ccor-events\.js\?v=[^\"]+\"\s+data-ccor-page=\"[^\"]+\"></script>\s*",
    re.IGNORECASE,
)
INLINE_BLOCK = re.compile(
    re.escape(START) + r".*?" + re.escape(END),
    re.DOTALL,
)


def inline_ready_javascript(source: str) -> str:
    """Adapt the shared browser script for inline use without changing its behavior."""
    source = re.sub(
        r"\n\s*const CSS_URL = .*?;",
        "",
        source,
        count=1,
    )
    source = re.sub(
        r"\n\s*function loadStyles\(\) \{.*?\n\s*\}",
        "\n  function loadStyles() {}",
        source,
        count=1,
        flags=re.DOTALL,
    )

    # Matrix supports staff favorites as either complete objects or event keys/IDs.
    old = "state.featured = (payload.featured || []).map(normalize).filter(event => event.start);"
    new = """const suppliedFeatured = (payload.featured || []).map(normalize).filter(event => event.start);
      const favoriteKeys = (payload.featuredKeys || []).map(String);
      const keyedFeatured = favoriteKeys.map(key => state.events.find(event => String(event.key) === key || String(event.id || '') === key)).filter(Boolean);
      state.featured = [...suppliedFeatured, ...keyedFeatured].filter((event, index, list) => list.findIndex(item => item.key === event.key) === index);"""
    if old not in source:
        raise RuntimeError("Expected featured assignment was not found in ccor-events.js")
    source = source.replace(old, new, 1)

    # Use the user's preferred vocabulary while preserving the existing ordering logic.
    source = source.replace("★ CURATED FIRST ROW", "★ FAVORITES FIRST")
    source = source.replace("★ FEATURED", "★ FAVORITE")
    source = source.replace("FEATURED CLASSES", "FAVORITE CLASSES")
    source = source.replace("FEATURED EVENTS", "FAVORITE EVENTS")
    source = source.replace("FEATURED COMMITTEE MEETINGS", "FAVORITE COMMITTEE MEETINGS")
    source = source.replace("FEATURED AT CCOR", "FAVORITES AT CCOR")
    return source


def build_block(page: str, css: str, javascript: str) -> str:
    return (
        f"{START}\n"
        f"<style data-ccor-calendar-injection=\"inline\">\n{css.rstrip()}\n</style>\n"
        f"<script data-ccor-page=\"{page}\">\n{javascript.rstrip()}\n</script>\n"
        f"{END}"
    )


def update_page(path: Path, page: str, css: str, javascript: str) -> None:
    html = path.read_text(encoding="utf-8")
    html = INLINE_BLOCK.sub("", html)
    html, count = EXTERNAL_LOADER.subn("\n", html, count=1)
    if count != 1:
        raise RuntimeError(f"Expected one external CCOR loader in {path}; found {count}")
    if html.count('id="eventsGrid"') != 1:
        raise RuntimeError(f"Original events grid was not preserved in {path}")
    if "</body>" not in html:
        raise RuntimeError(f"Missing closing body in {path}")
    block = build_block(page, css, javascript)
    html = html.replace("</body>", f"\n{block}\n</body>", 1)
    path.write_text(html, encoding="utf-8")


def main() -> None:
    css = (ASSET_DIR / "ccor-events.css").read_text(encoding="utf-8")
    javascript = inline_ready_javascript(
        (ASSET_DIR / "ccor-events.js").read_text(encoding="utf-8")
    )
    for path, page in PAGES.items():
        update_page(path, page, css, javascript)
        print(f"inlined {page}: {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
