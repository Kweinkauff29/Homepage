from __future__ import annotations

import html
import json
from pathlib import Path


DISPLAY_YEARS = ("2021", "2022", "2023", "2024", "2025", "2026")
BUTTON_YEARS = ("2026", "2025", "2024", "2023", "2022", "2021")

DEFAULT_ICONS = {
    "homesSold": "program-2026-assets/stat-icon-homes.png",
    "dollarVolume": "program-2026-assets/stat-icon-volume.png",
    "medianSalePrice": "program-2026-assets/stat-icon-price.png",
    "pricePerSF": "program-2026-assets/stat-icon-sqft.png",
    "supplyOfInventory": "program-2026-assets/stat-icon-supply.png",
    "activeInventory": "program-2026-assets/stat-icon-inventory.png",
    "newListings": "program-2026-assets/stat-icon-listings.png",
    "listPricePct": "program-2026-assets/stat-icon-listprice.png",
    "cashPct": "program-2026-assets/stat-icon-cash.png",
    "piti": "program-2026-assets/stat-icon-piti.png",
    "dom": "program-2026-assets/stat-icon-dom.png",
    "pendingSales": "program-2026-assets/stat-icon-pending.png",
}


def load_market_data(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_verified_market(data: dict) -> list[dict]:
    verification = data.get("verification") or {}
    for flag in ("dateRange", "geography", "propertyTypes", "definitions"):
        if verification.get(flag) is not True:
            raise ValueError(f"Unverified market filter: {flag}")

    raw_metrics = data.get("metrics") or []
    if isinstance(raw_metrics, dict):
        metrics_list = [{"key": k, **v} for k, v in raw_metrics.items()]
    else:
        metrics_list = list(raw_metrics)

    if not metrics_list:
        raise ValueError("No market metrics configured")

    for metric in metrics_list:
        key = metric.get("key") or "unknown"
        if metric.get("status") != "verified":
            raise ValueError(f"Metric {key} is not verified")
        if not str(metric.get("source") or "").strip():
            raise ValueError(f"Metric {key} is missing source")
        fmt = str(metric.get("format") or "integer")
        values = metric.get("values") or {}
        for year in DISPLAY_YEARS:
            val = values.get(year)
            if val is None or isinstance(val, bool) or not isinstance(val, (int, float)):
                raise ValueError(f"Metric {key} is missing numeric value for {year}")
            if fmt == "percent1" and (float(val) < 0 or float(val) > 1):
                raise ValueError(f"Whole percent passed as fraction for {key}.{year}: {val}")

    display_order = data.get("displayOrder")
    if isinstance(display_order, list) and display_order:
        by_key = {m.get("key"): m for m in metrics_list}
        ordered = [by_key[k] for k in display_order if k in by_key]
        for m in metrics_list:
            if m not in ordered:
                ordered.append(m)
        return ordered

    return metrics_list


def format_metric_value(value: float | int, fmt: str, suffix: str = "") -> str:
    v = float(value)
    if fmt == "currency0":
        return f"${round(v):,}{suffix}"
    if fmt == "percent1":
        return f"{v * 100:.1f}%{suffix}"
    if fmt == "decimal1":
        return f"{v:.1f}{suffix}"
    return f"{round(v):,}{suffix}"


def format_compact_value(value: float | int, fmt: str, suffix: str = "") -> str:
    v = float(value)
    if fmt == "currency0":
        if v >= 1_000_000_000:
            return f"${v / 1_000_000_000:.2f}B"
        if v >= 1_000_000:
            return f"${v / 1_000_000:.1f}M"
        return f"${round(v):,}"
    if fmt == "percent1":
        return f"{v * 100:.1f}%"
    if fmt == "decimal1":
        return f"{v:.1f}{suffix}"
    return f"{round(v):,}{suffix}"


def compute_initial_comparison(values: dict, fmt: str, good_dir: str) -> tuple[str, str]:
    v26 = float(values["2026"])
    v25 = float(values["2025"])
    diff = v26 - v25
    if abs(diff) < 1e-9:
        return "2026 YTD · unchanged vs. 2025", "neutral"
    is_up = diff > 0
    arrow = "▲" if is_up else "▼"
    if fmt == "percent1":
        pp = abs(diff) * 100
        text = f"{arrow} {'+' if is_up else '-'}{pp:.1f} percentage points vs. 2025 ({format_metric_value(v25, fmt)})"
    elif v25 == 0:
        text = f"{arrow} {format_metric_value(abs(diff), fmt)} vs. 2025"
    else:
        pct = abs(diff / v25) * 100
        text = f"{arrow} {'+' if is_up else '-'}{pct:.1f}% vs. 2025 ({format_compact_value(v25, fmt)})"
    is_good = (is_up and good_dir == "up") or ((not is_up) and good_dir == "down")
    tone = "good" if is_good else "caution"
    return text, tone


def render_market(data: dict) -> str:
    if data.get("status") != "verified":
        return '<p class="pending-note">The 2026 year-to-date market recap is being prepared.</p>'

    metrics_list = validate_verified_market(data)

    # 1. Market overview with the CCOR site mark.
    period_label = html.escape(str(data.get("periodLabel") or "January 1–November 1"))
    geography = html.escape(str(data.get("geography") or "Bonita Springs & Estero"))
    source_label = html.escape(str(data.get("sourceLabel") or "CCOR MLS / Domus Analytics"))

    hero_html = f"""<div class="market-hero-banner">
      <div class="market-hero-copy">
        <span class="market-eyebrow">{geography} MLS · {period_label} YTD</span>
        <p class="market-intro">Explore <strong>{len(metrics_list)} verified MLS market indicators</strong> comparing 2026 year-to-date performance against 2021–2025. Tap any year button or chart bar below to compare historical benchmarks.</p>
      </div>
      <div class="market-brand-mark">
        <img src="program-2026-assets/ccor-favicon.png" width="192" height="124" alt="Coconut Coast REALTORS® palm mark" loading="lazy" decoding="async">
      </div>
    </div>"""

    # 2. Executive Market Pulse Hero KPI Strip
    pulse_items = data.get("pulse") or []
    pulse_html = ""
    if pulse_items:
        p_cards = []
        for p in pulse_items:
            tone = html.escape(str(p.get("badgeTone", "up")))
            p_cards.append(
                f"""      <button type="button" class="market-pulse-card" data-pulse-jump="{html.escape(str(p.get('key', '')))}" data-pulse-target="{p.get('rawTarget', 0)}" data-pulse-prefix="{html.escape(str(p.get('prefix', '')))}" data-pulse-suffix="{html.escape(str(p.get('suffix', '')))}" data-pulse-decimals="{p.get('decimals', 0)}">
        <span class="market-pulse-badge is-{tone}">{html.escape(str(p.get("badge", "")))}</span>
        <strong class="market-pulse-val" data-pulse-value>{html.escape(str(p.get("value", "")))}</strong>
        <span class="market-pulse-label">{html.escape(str(p.get("label", "")))}</span>
        <small class="market-pulse-sub">{html.escape(str(p.get("sub", "")))}</small>
      </button>"""
            )
        pulse_html = '<div class="market-pulse-grid" aria-label="2026 Executive Market Pulse">\n' + "\n".join(p_cards) + "\n    </div>"

    # 3. Single-Family vs. Condo Divergence Callout
    div_data = data.get("divergence") or {}
    divergence_html = ""
    if div_data.get("items"):
        div_cols = []
        for item in div_data["items"]:
            div_cols.append(
                f"""        <div class="market-divergence-col">
          <strong>{html.escape(str(item.get("heading", "")))}</strong>
          <p>{html.escape(str(item.get("detail", "")))}</p>
        </div>"""
            )
        divergence_html = f"""    <div class="market-divergence-box">
      <div class="market-divergence-head">
        <span class="market-eyebrow">Property-Type Breakdown</span>
        <h3>{html.escape(str(div_data.get("title", "")))}</h3>
        <p>{html.escape(str(div_data.get("summary", "")))}</p>
      </div>
      <div class="market-divergence-grid">
{chr(10).join(div_cols)}
      </div>
    </div>"""

    # 4. Interactive Category Filter Pills & Global Year Switcher
    categories = data.get("categories") or []
    toolbar_html = ""
    if categories:
        cat_btns = []
        for idx, cat in enumerate(categories):
            cid = html.escape(str(cat.get("id", "all")))
            clabel = html.escape(str(cat.get("label", "")))
            active_cls = " is-active" if idx == 0 else ""
            cat_btns.append(
                f'<button type="button" class="market-filter-btn{active_cls}" data-market-filter="{cid}">{clabel}</button>'
            )
        global_years = "".join(
            f'<button type="button" class="market-global-year{" is-active" if y == "2026" else ""}" data-market-global-year="{y}">{y}</button>'
            for y in BUTTON_YEARS
        )
        toolbar_html = f"""    <div class="market-toolbar">
      <div class="market-filter-bar" role="group" aria-label="Filter market metrics by category">
        {"".join(cat_btns)}
      </div>
      <div class="market-global-bar">
        <span>Compare All Cards:</span>
        <div class="market-global-years" role="group" aria-label="Compare all market cards by year">
          {global_years}
        </div>
      </div>
    </div>"""

    # 5. Metric Cards
    cards: list[str] = []
    for metric in metrics_list:
        key = str(metric.get("key") or "")
        label = html.escape(str(metric.get("label") or key))
        cat = html.escape(str(metric.get("cat") or "all"))
        cat_label = html.escape(str(metric.get("categoryLabel") or "MLS Metric"))
        subtitle = html.escape(str(metric.get("subtitle") or ""))
        icon_src = html.escape(str(metric.get("icon") or DEFAULT_ICONS.get(key, "program-2026-assets/stat-icon-homes.png")))
        fmt = str(metric.get("format") or "integer")
        suffix = str(metric.get("suffix") or "")
        good_dir = str(metric.get("goodDirection") or "up")
        values = {year: metric["values"][year] for year in DISPLAY_YEARS}
        max_value = max(float(v) for v in values.values()) or 1.0
        values_attr = html.escape(json.dumps(values), quote=True)
        initial_value = format_metric_value(values["2026"], fmt, suffix)
        comp_text, comp_tone = compute_initial_comparison(values, fmt, good_dir)

        year_buttons = "".join(
            f'<button type="button" data-market-year="{year}" aria-pressed="{"true" if year == "2026" else "false"}">{year}</button>'
            for year in BUTTON_YEARS
        )
        bars = "".join(
            f"""<div class="market-bar-row" data-market-bar="{year}" data-selected="{"true" if year == "2026" else "false"}">
              <span>{year}</span>
              <div class="market-track"><span style="width:{max(8, round((float(values[year]) / max_value) * 100))}%"></span></div>
              <strong>{html.escape(format_metric_value(values[year], fmt, suffix))}</strong>
            </div>"""
            for year in DISPLAY_YEARS
        )
        sub_html = f'<p class="market-card-sub">{subtitle}</p>' if subtitle else ""

        cards.append(
            f"""      <article class="market-card" id="market-card-{html.escape(key)}" data-market-key="{html.escape(key)}" data-market-card="{html.escape(key)}" data-market-cat="{cat}" data-format="{html.escape(fmt)}" data-suffix="{html.escape(suffix)}" data-good-direction="{html.escape(good_dir)}" data-values="{values_attr}">
        <div class="market-card-head">
          <div class="market-icon-wrap">
            <img class="market-icon" src="{icon_src}" alt="{label} icon" loading="lazy" decoding="async">
          </div>
          <div class="market-head-copy">
            <span class="market-cat-pill">{cat_label}</span>
            <h3>{label}</h3>
          </div>
        </div>
        {sub_html}
        <div class="market-readout-box">
          <span class="market-selected-year-tag" data-market-year-tag>2026 YTD</span>
          <p class="market-value" data-market-value>{html.escape(initial_value)}</p>
          <p class="market-comparison is-{comp_tone}" data-market-comparison>{html.escape(comp_text)}</p>
        </div>
        <p class="market-breathe">▾ Tap a Year to Compare Against 2026 ▾</p>
        <div class="market-years" role="group" aria-label="{label} comparison years">{year_buttons}</div>
        <div class="market-canvas-wrap">
          <canvas class="market-canvas" data-market-canvas="{html.escape(key)}" width="340" height="155" aria-label="{label} 2021 to 2026 chart"></canvas>
        </div>
        <div class="market-bars" aria-label="{label} six-year comparison">{bars}</div>
      </article>"""
        )

    sponsor = data.get("sponsor") or {}
    sponsor_html = ""
    if sponsor.get("logo"):
        sponsor_html = f"""    <a class="market-sponsor" href="{html.escape(str(sponsor.get('url', '#')))}" target="_blank" rel="noopener noreferrer">
      <span>Market stats sponsored by</span>
      <img src="{html.escape(str(sponsor['logo']))}" alt="{html.escape(str(sponsor.get('name', 'Market Sponsor')))}" loading="lazy" decoding="async">
    </a>"""

    footnote_html = f'<p class="fine market-source-note">Source: {source_label} ({geography}, Single-Family &amp; Condo/Townhouse).</p>'

    return "\n".join(
        part
        for part in [
            hero_html,
            pulse_html,
            sponsor_html,
            divergence_html,
            toolbar_html,
            f'    <div class="market-cards">\n{chr(10).join(cards)}\n    </div>',
            footnote_html,
        ]
        if part
    )


def render_market_section(data: dict) -> str:
    return render_market(data)
