"""Build the mobile program from editable public content and the prior-year layout."""
import json
from html import escape
from hashlib import sha256
from pathlib import Path
from string import Template
from market_program import render_market

ROOT = Path(__file__).resolve().parent
data = json.loads((ROOT / 'program-2026-data.json').read_text())
data['market'] = json.loads((ROOT / 'program-2026-market.json').read_text())
e = escape

def image(name, alt, cls='', eager=False):
    return f'<img src="program-2026-assets/{e(name)}" alt="{e(alt)}" class="{cls}" loading="{"eager" if eager else "lazy"}" decoding="async">'

def portrait(person, cls=''):
    if person.get('portrait'):
        return image(person['portrait'], person['name'], cls)
    initials = ''.join(p[0] for p in (person.get('name') or 'To Announce').split()[:2])
    return f'<span class="portrait-placeholder {cls}" aria-hidden="true">{e(initials)}</span>'

def officer(p):
    return f'<article class="officer">{portrait(p,"officer-portrait")}<div class="person"><h3>{e(p["name"])}</h3><p class="role">{e(p["role"])}</p><p class="office">{e(p["office"])}</p></div></article>'

def director(p):
    return f'<article class="director">{portrait(p,"director-portrait")}<div><strong>{e(p["name"])}</strong><small>{e(p["role"])}</small></div></article>'

def chair(p):
    vice = f'<small>Co / Vice Chair: {e(p["vice"])}</small>' if p.get('vice') and not p.get('viceUnconfirmed') else ''
    return f'<article class="chair">{portrait(p,"chair-portrait")}<div><h3>{e(p["name"])}</h3><p>{e(p["committee"])}</p>{vice}</div></article>'

def photo(p, i):
    return f'<button class="photo" data-photo="{i}" data-album="{e(p["album"])}" aria-label="View photo: {e(p["alt"])}">{image(p["src"],p["alt"])}<span>{e(p["alt"])}</span><span class="zoom" aria-hidden="true">↗</span></button>'

SPONSOR_TIERS = ('diamond', 'platinum', 'gold', 'silver', 'bronze', 'special')

def sponsor_tier(group):
    first_word = group['tier'].lower().split()[0]
    return first_word if first_word in SPONSOR_TIERS else 'special'

def sponsor(group):
    logos = data.get('sponsorLogos', {})
    links = data.get('sponsorLinks', {})
    cards = []
    for name in group['names']:
        logo = f'<span class="sponsor-lockup">{image(logos[name], "")}</span>' if name in logos else ''
        content = logo + f'<strong>{e(name)}</strong>'
        if name in links:
            cards.append(f'<a class="sponsor" href="{e(links[name])}" target="_blank" rel="noopener noreferrer">{content}<span class="sponsor-visit">Visit website ↗</span></a>')
        else:
            cards.append(f'<div class="sponsor">{content}</div>')
    tier = sponsor_tier(group)
    return f'<div class="sponsor-group" data-tier="{tier}"><h3 class="tier-tag {tier}">{e(group["tier"])}</h3><div class="sponsor-grid">{"".join(cards)}</div></div>'

def sponsor_ads(section_id):
    links = []
    for ad in data.get('sponsorAds', []):
        if ad.get('section') != section_id:
            continue
        name = e(ad['name'])
        artwork = f'program-2026-assets/{e(ad["asset"])}'
        width, height = ad['width'], ad['height']
        orientation = 'landscape' if width >= height else 'portrait'
        links.append(
            f'<a class="editorial-ad editorial-ad-{orientation}" href="{artwork}" target="_blank" rel="noopener" '
            f'aria-label="Open {name} advertisement at full size in a new tab">'
            f'<img src="{artwork}" width="{width}" height="{height}" alt="" loading="lazy" decoding="async"></a>'
        )
    return ''.join(links)

def president_message(message):
    if not message:
        return ''
    main, closing, signoff = message.partition('\nWith sincere gratitude,\n')
    themes = ('Collaborate and Connect.', 'Educate and Empower.', 'Elevate Our Profession.')
    body = []
    for line in main.splitlines():
        if not line.strip():
            continue
        lead = next((theme for theme in themes if line.startswith(theme + ' ')), '')
        copy = f'<strong>{e(lead)}</strong>{e(line[len(lead):])}' if lead else e(line)
        tone = ' class="letter-motto"' if line in (
            'One Association. One Vision. Endless Possibilities.', 'Collaborate. Educate. Elevate.'
        ) else ''
        body.append(f'<p{tone}>{copy}</p>')
    if closing:
        signature = '<br>'.join(e(line) for line in signoff.splitlines())
        body.append(f'<p class="letter-signoff">With sincere gratitude,<br>{signature}</p>')
    return f'<div class="letter-copy">{"".join(body)}</div>'

def ceremony_order(items):
    if not items:
        return ''
    steps = ''.join(f'<li>{e(step)}</li>' for step in items)
    return f'<section class="ceremony-order"><h3>Ceremony Order</h3><ol>{steps}</ol></section>'

def optional_section(section_id, label, heading, field, icon):
    entries = data.get(field) or ''
    if isinstance(entries, str):
        stories = [f'<p>{e(p)}</p>' for p in entries.splitlines() if p.strip()]
    else:
        stories = [editorial_story(entry) for entry in entries]
    if not stories:
        return '', ''
    nav = f'<a class="quick-pill" href="#{section_id}">{label}</a>'
    ads = sponsor_ads(section_id)
    copy = ''
    if ads:
        lead = ''.join(stories[:2])
        copy = f'<div class="editorial-spread"><div class="editorial-copy">{lead}</div>{ads}</div>'
        stories = stories[2:]
    if stories:
        copy += f'<div class="editorial-copy editorial-stories">{"".join(stories)}</div>'
    section = (
        f'<details class="program-section review-section" id="{section_id}">'
        f'<summary><span class="summary-left">{image(icon, "", "sec-icon")}<span>{label}</span></span></summary>'
        f'<div class="panel"><h2 class="mini-title">{heading}</h2>{copy}</div></details>'
    )
    return nav, section

def editorial_story(entry):
    date = f'<p class="editorial-date">{e(entry["date"])}</p>' if entry.get('date') else ''
    links = [{'url': entry['source'], 'label': entry['linkLabel']}, *entry.get('related', [])]
    link_markup = ''.join(
        f'<a href="{e(link["url"])}" target="_blank" rel="noopener noreferrer">{e(link["label"])} ↗</a>'
        for link in links
    )
    figures = ''.join(
        f'<figure>{image(photo["src"], photo["alt"], "editorial-artwork" if photo.get("artwork") else "")}'
        f'<figcaption>{e(photo["caption"])}</figcaption></figure>'
        for photo in entry.get('photos', [])
    )
    media = f'<div class="editorial-media">{figures}</div>' if figures else ''
    return (
        f'<article>{date}<h3>{e(entry["title"])}</h3><p>{e(entry["text"])}</p>'
        f'{media}<div class="editorial-links">{link_markup}</div></article>'
    )

event = data['event']
named_chairs = [p for p in data['chairs'] if p.get('name')]
groups = sorted(data['sponsors'], key=lambda g: SPONSOR_TIERS.index(sponsor_tier(g)))
achievement_nav, achievements = optional_section('achievements', '2026 Achievements', 'Celebrating Our Progress', 'achievements', 'sec-icon-achievements.png')
upcoming_nav, upcoming = optional_section('upcoming', 'Events in 2027', 'Looking Ahead', 'upcomingEvents', 'sec-icon-events.png')
json_data = json.dumps({key: data[key] for key in ('photos', 'albums', 'market')}, ensure_ascii=False).replace('<','\\u003c')
album_notes = ''.join(f'<article class="album-note"><h3>{e(a["title"])}</h3><p>{e(a["date"])}</p><p class="album-description">{e(a.get("description", ""))}</p><p>{e(a["credit"])}</p><a href="{e(a["source"])}" target="_blank" rel="noopener noreferrer">Original album / recap ↗</a></article>' for a in data['albums'])
filters = ''.join(f'<button class="filter" data-filter="{e(a["id"])}" aria-pressed="false">{e(a.get("shortTitle",a["title"]))}</button>' for a in data['albums'])
photo_tiles = [photo(p, i) for i, p in enumerate(data['photos'])]
photo_review_ads = sponsor_ads('photos')
lead_count = 6 if photo_review_ads else 0
values = dict(
    stylesheet_revision=sha256((ROOT / 'program-2026.css').read_bytes()).hexdigest()[:12],
    title=e(event['title']), theme=e(event['theme']), date=e(event['date']), time=e(event['time']),
    venue=e(event['venue']), address=e(event['address']), emcee=e(event['emcee']),
    installing_officer=e(event['installingOfficer']), music=e(event['music']), event_source=e(event['source']),
    logo='<img class="logo" src="program-2026-assets/ccor-header-logo.webp" width="1000" height="350" alt="Coconut Coast Organization of REALTORS®" fetchpriority="high" decoding="async">',
    officers=''.join(map(officer,data['officers'])), directors=''.join(map(director,data['directors'])),
    chairs=''.join(map(chair,named_chairs)), sponsors=''.join(map(sponsor,groups)),
    photo_review_ads=photo_review_ads,
    ceremony_order=ceremony_order(event.get('ceremonyOrder', [])),
    president_portrait=image('wade.jpg','Wade H. Abed','letter-portrait'),
    president_message=president_message(data.get('presidentMessage')),
    market_highlights=render_market(data['market']),
    achievement_nav=achievement_nav, achievements=achievements,
    upcoming_nav=upcoming_nav, upcoming_events=upcoming,
    photo_lead=''.join(photo_tiles[:lead_count]),
    photos=''.join(photo_tiles[lead_count:]), photo_count=len(photo_tiles),
    filters=filters, album_notes=album_notes, updated=e(data['updated']), json_data=json_data,
    first_photo=e(data['photos'][0]['src'])
)
html = Template((ROOT / 'program-2026-template.html').read_text()).substitute(values)
for name in ['2026-installation-program.html','2025 Installation Banquet.html']:
    (ROOT / name).write_text(html)
print(f'Built program: {len(data["photos"])} photos, {len(data["officers"])} officers, {len(data["directors"])} directors, {len(named_chairs)} named chairs, {len(groups)} sponsor categories.')
