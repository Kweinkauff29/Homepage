import json
import os

def generate_archive_html():
    base_dir = r"c:\Users\Kevin\Homepage-6\sea-2026\archive\2025_public"
    with open(os.path.join(base_dir, "winners_2025.json"), "r", encoding="utf-8") as f:
        data = json.load(f)

    winners = data["winners"]
    tier_counts = data["tier_counts"]

    # Sort winners alphabetically by name
    winners_sorted = sorted(winners, key=lambda x: x["name"])

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2025 Sales Excellence Award Winners — Official Historical Archive</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {{
            --bg-color: #0c121e;
            --surface: #151f32;
            --surface-hover: #1e2c45;
            --border-color: rgba(255, 255, 255, 0.08);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --gold: #f59e0b;
            --gold-light: #fef3c7;
            --platinum: #cbd5e1;
            --diamond: #67e8f9;
            --diamond-border: rgba(103, 232, 249, 0.4);
            --platinum-border: rgba(203, 213, 225, 0.3);
            --gold-border: rgba(245, 158, 11, 0.4);
        }}

        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}

        body {{
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            min-height: 100vh;
            line-height: 1.5;
        }}

        /* Universal Awards Navigation Header */
        .awards-archive-nav {{
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border-color);
            padding: 0.85rem 1.5rem;
            position: sticky;
            top: 0;
            z-index: 100;
        }}

        .nav-inner {{
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 1rem;
        }}

        .nav-brand {{
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 700;
            font-size: 1.1rem;
            color: #fff;
            text-decoration: none;
        }}

        .nav-brand i {{
            color: var(--gold);
        }}

        .nav-links {{
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;
        }}

        .nav-pill {{
            padding: 0.45rem 0.9rem;
            border-radius: 9999px;
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 600;
            transition: all 0.2s ease;
            color: var(--text-muted);
            border: 1px solid transparent;
        }}

        .nav-pill:hover {{
            color: #fff;
            background: var(--surface);
            border-color: var(--border-color);
        }}

        .nav-pill.active {{
            background: rgba(245, 158, 11, 0.15);
            color: var(--gold);
            border-color: rgba(245, 158, 11, 0.4);
        }}

        .nav-pill.current-year {{
            background: rgba(37, 99, 235, 0.15);
            color: #60a5fa;
            border-color: rgba(37, 99, 235, 0.4);
        }}

        /* Hero Banner */
        .hero {{
            text-align: center;
            padding: 4rem 1.5rem 2.5rem;
            max-width: 900px;
            margin: 0 auto;
        }}

        .archive-tag {{
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(245, 158, 11, 0.12);
            color: var(--gold);
            padding: 0.4rem 1rem;
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1.25rem;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }}

        h1 {{
            font-family: 'Playfair Display', serif;
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #fff 0%, #cbd5e1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}

        .hero p {{
            color: var(--text-muted);
            font-size: 1.15rem;
            line-height: 1.6;
        }}

        .criteria-box {{
            margin-top: 1.5rem;
            padding: 1rem 1.5rem;
            background: var(--surface);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            font-size: 0.9rem;
            color: var(--text-muted);
            display: inline-block;
        }}

        .criteria-box strong {{
            color: #fff;
        }}

        /* Filter Controls */
        .controls-section {{
            max-width: 1400px;
            margin: 0 auto;
            padding: 1rem 1.5rem 2rem;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }}

        .controls-bar {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 1rem;
            background: var(--surface);
            padding: 1rem 1.5rem;
            border-radius: 16px;
            border: 1px solid var(--border-color);
        }}

        .tier-tabs {{
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }}

        .tier-btn {{
            background: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-muted);
            padding: 0.5rem 1.1rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
        }}

        .tier-btn:hover {{
            background: var(--surface-hover);
            color: #fff;
        }}

        .tier-btn.active {{
            background: #fff;
            color: #0f172a;
            border-color: #fff;
        }}

        .tier-btn.diamond.active {{
            background: #22d3ee;
            color: #0f172a;
            border-color: #22d3ee;
        }}

        .tier-btn.platinum.active {{
            background: #cbd5e1;
            color: #0f172a;
            border-color: #cbd5e1;
        }}

        .tier-btn.gold.active {{
            background: #f59e0b;
            color: #0f172a;
            border-color: #f59e0b;
        }}

        .badge-count {{
            padding: 0.15rem 0.5rem;
            border-radius: 999px;
            font-size: 0.75rem;
            background: rgba(0,0,0,0.15);
        }}

        .search-box {{
            position: relative;
            flex-grow: 1;
            max-width: 350px;
        }}

        .search-box i {{
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
        }}

        .search-box input {{
            width: 100%;
            background: var(--bg-color);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 0.6rem 1rem 0.6rem 2.5rem;
            color: #fff;
            font-size: 0.9rem;
            outline: none;
            transition: border-color 0.2s;
        }}

        .search-box input:focus {{
            border-color: var(--gold);
        }}

        /* Winners Grid */
        .winners-container {{
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 1.5rem 5rem;
        }}

        .winners-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
        }}

        .winner-card {{
            background: var(--surface);
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
            position: relative;
        }}

        .winner-card:hover {{
            transform: translateY(-4px);
            box-shadow: 0 16px 30px rgba(0, 0, 0, 0.4);
        }}

        .winner-card.diamond {{
            border-top: 4px solid #22d3ee;
        }}
        .winner-card.platinum {{
            border-top: 4px solid #cbd5e1;
        }}
        .winner-card.gold {{
            border-top: 4px solid #f59e0b;
        }}

        .photo-wrap {{
            height: 280px;
            background: #0f172a;
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }}

        .photo-wrap img {{
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: top center;
            transition: transform 0.3s ease;
        }}

        .winner-card:hover .photo-wrap img {{
            transform: scale(1.03);
        }}

        .photo-placeholder {{
            font-size: 4rem;
            color: rgba(255, 255, 255, 0.15);
        }}

        .tier-tag {{
            position: absolute;
            top: 1rem;
            right: 1rem;
            padding: 0.35rem 0.75rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }}

        .tier-tag.diamond {{
            background: rgba(14, 165, 233, 0.85);
            color: #fff;
        }}
        .tier-tag.platinum {{
            background: rgba(148, 163, 184, 0.85);
            color: #0f172a;
        }}
        .tier-tag.gold {{
            background: rgba(245, 158, 11, 0.85);
            color: #0f172a;
        }}

        .card-body {{
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            justify-content: space-between;
        }}

        .agent-name {{
            font-size: 1.25rem;
            font-weight: 700;
            color: #fff;
            margin-bottom: 0.35rem;
        }}

        .brokerage-name {{
            font-size: 0.9rem;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }}

        .brokerage-name i {{
            font-size: 0.8rem;
            opacity: 0.7;
        }}

        /* Empty state */
        .empty-state {{
            grid-column: 1 / -1;
            text-align: center;
            padding: 4rem 1rem;
            color: var(--text-muted);
            display: none;
        }}

        .empty-state i {{
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.4;
        }}

        footer {{
            border-top: 1px solid var(--border-color);
            padding: 2rem 1.5rem;
            text-align: center;
            color: var(--text-muted);
            font-size: 0.85rem;
        }}
    </style>
</head>
<body>

    <!-- Unified Awards Navigation -->
    <nav class="awards-archive-nav">
        <div class="nav-inner">
            <a href="#" class="nav-brand">
                <i class="fa-solid fa-trophy"></i>
                <span>Sales Excellence Awards</span>
            </a>
            <div class="nav-links">
                <a href="/sea-2026/frontend/index.html" class="nav-pill current-year">
                    <i class="fa-solid fa-gear"></i> 2026 Awards Management
                </a>
                <a href="#" class="nav-pill active">
                    <i class="fa-solid fa-clock-rotate-left"></i> 2025 Archive (Active)
                </a>
                <a href="https://coconutcoastrealtors.org/2024-sales-excellence-award-winners/" target="_blank" class="nav-pill">
                    <i class="fa-solid fa-box-archive"></i> 2024 Archive
                </a>
            </div>
        </div>
    </nav>

    <!-- Hero Header -->
    <header class="hero">
        <div class="archive-tag">
            <i class="fa-solid fa-landmark"></i> Historical Archive — 2025 Year
        </div>
        <h1>2025 Sales Excellence Award Winners</h1>
        <p>Celebrating the exceptional achievement and dedication of our top-producing members during the 2024–2025 production year.</p>
        <div class="criteria-box">
            <strong>2025 Award Rules:</strong> Diamond ($20M+ or 75+ sides) &bull; Platinum ($10M+ or 45+ sides) &bull; Gold ($5M+ or 25+ sides)
        </div>
    </header>

    <!-- Filter & Search Controls -->
    <section class="controls-section">
        <div class="controls-bar">
            <div class="tier-tabs">
                <button class="tier-btn active" data-filter="all">
                    All Recipients <span class="badge-count">{len(winners)}</span>
                </button>
                <button class="tier-btn diamond" data-filter="diamond">
                    <i class="fa-solid fa-gem"></i> Diamond <span class="badge-count">{tier_counts['diamond']}</span>
                </button>
                <button class="tier-btn platinum" data-filter="platinum">
                    <i class="fa-solid fa-medal"></i> Platinum <span class="badge-count">{tier_counts['platinum']}</span>
                </button>
                <button class="tier-btn gold" data-filter="gold">
                    <i class="fa-solid fa-award"></i> Gold <span class="badge-count">{tier_counts['gold']}</span>
                </button>
            </div>

            <div class="search-box">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="searchInput" placeholder="Search agent or brokerage...">
            </div>
        </div>
    </section>

    <!-- Winners Roster Grid -->
    <main class="winners-container">
        <div class="winners-grid" id="winnersGrid">
"""

    for w in winners_sorted:
        name = w["name"]
        tier = w["tier"].lower()
        brokerage = w["brokerage"]
        img = w["image"]

        img_html = f'<img src="{img}" alt="{name}" loading="lazy">' if img else '<i class="fa-solid fa-user photo-placeholder"></i>'

        html_content += f"""
            <div class="winner-card {tier}" data-tier="{tier}" data-name="{name.lower()}" data-brokerage="{brokerage.lower()}">
                <div class="photo-wrap">
                    {img_html}
                    <div class="tier-tag {tier}">{tier}</div>
                </div>
                <div class="card-body">
                    <div class="agent-name">{name}</div>
                    <div class="brokerage-name">
                        <i class="fa-solid fa-building"></i>
                        <span>{brokerage}</span>
                    </div>
                </div>
            </div>
"""

    html_content += f"""
            <div class="empty-state" id="emptyState">
                <i class="fa-solid fa-magnifying-glass"></i>
                <h3>No Recipients Match Your Filter</h3>
                <p>Try clearing your search term or selecting "All Recipients".</p>
            </div>
        </div>
    </main>

    <footer>
        <p>Coconut Coast Organization of REALTORS&reg; (CCOR) &bull; Official Historical Archive for 2025 Sales Excellence Awards</p>
        <p style="margin-top: 0.5rem; opacity: 0.6;">All recipient data, brokerages, and award levels are permanently preserved as published.</p>
    </footer>

    <script>
        const searchInput = document.getElementById('searchInput');
        const filterBtns = document.querySelectorAll('.tier-btn');
        const cards = document.querySelectorAll('.winner-card');
        const emptyState = document.getElementById('emptyState');

        let activeTier = 'all';

        function filterWinners() {{
            const query = searchInput.value.toLowerCase().trim();
            let visibleCount = 0;

            cards.forEach(card => {{
                const tier = card.dataset.tier;
                const name = card.dataset.name;
                const brokerage = card.dataset.brokerage;

                const matchesTier = (activeTier === 'all' || tier === activeTier);
                const matchesQuery = (!query || name.includes(query) || brokerage.includes(query));

                if (matchesTier && matchesQuery) {{
                    card.style.display = 'flex';
                    visibleCount++;
                }} else {{
                    card.style.display = 'none';
                }}
            }});

            if (visibleCount === 0) {{
                emptyState.style.display = 'block';
            }} else {{
                emptyState.style.display = 'none';
            }}
        }}

        filterBtns.forEach(btn => {{
            btn.addEventListener('click', () => {{
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeTier = btn.dataset.filter;
                filterWinners();
            }});
        }});

        searchInput.addEventListener('input', filterWinners);
    </script>
</body>
</html>
"""

    out_file = os.path.join(base_dir, "index.html")
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"Generated standalone archive HTML at {out_file} ({len(html_content)} bytes)")

if __name__ == "__main__":
    generate_archive_html()
