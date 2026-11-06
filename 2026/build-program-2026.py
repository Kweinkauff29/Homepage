"""Build the mobile program from editable public content and the prior-year layout."""
import json
from html import escape
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

def pending(person):
    return f'<small class="pending">{e(person["pending"])}</small>' if person.get('pending') else ''

def officer(p):
    return f'<article class="officer">{portrait(p,"officer-portrait")}<div class="person"><h3>{e(p["name"])}</h3><p class="role">{e(p["role"])}</p><p class="office">{e(p["office"])}</p></div></article>'

def director(p):
    return f'<article class="director">{portrait(p,"director-portrait")}<div><strong>{e(p["name"])}</strong><small>{e(p["role"])}</small>{pending(p)}</div></article>'

def chair(p):
    vice = f'<small>Co / Vice Chair: {e(p["vice"])}</small>' if p.get('vice') else ''
    return f'<article class="chair">{portrait(p,"chair-portrait")}<div><h3>{e(p["name"] or "To be announced")}</h3><p>{e(p["committee"])}</p>{vice}{pending(p)}</div></article>'

def photo(p, i):
    return f'<button class="photo" data-photo="{i}" data-album="{e(p["album"])}" aria-label="View photo: {e(p["alt"])}">{image(p["src"],p["alt"])}<span>{e(p["alt"])}</span><span class="zoom" aria-hidden="true">↗</span></button>'

def sponsor(group):
    logos = data.get('sponsorLogos', {})
    cards = ''.join(f'<div class="sponsor">{image(logos[n],n) if n in logos else ""}<strong>{e(n)}</strong></div>' for n in group['names'])
    tier = group['tier'].lower()
    tone = 'diamond' if 'diamond' in tier else 'platinum' if 'platinum' in tier else 'gold' if 'gold' in tier else 'silver' if 'silver' in tier else 'special'
    return f'<div class="sponsor-group"><h3 class="tier-tag {tone}">{e(group["tier"])}</h3><div class="sponsor-grid">{cards}</div></div>'

def paragraphs(text, fallback):
    if text:
        return ''.join(f'<p>{e(p)}</p>' for p in text.split('\n') if p.strip())
    return f'<p class="pending-note">{fallback}</p>'

event = data['event']
json_data = json.dumps(data, ensure_ascii=False).replace('<','\\u003c')
album_notes = ''.join(f'<article class="album-note"><h3>{e(a["title"])}</h3><p>{e(a["date"])}</p><p>{e(a["credit"])}</p><a href="{e(a["source"])}" target="_blank" rel="noopener noreferrer">Original album / recap ↗</a></article>' for a in data['albums'])
filters = ''.join(f'<button class="filter" data-filter="{e(a["id"])}" aria-pressed="false">{e(a.get("shortTitle",a["title"]))}</button>' for a in data['albums'])
values = dict(
    title=e(event['title']), theme=e(event['theme']), date=e(event['date']), time=e(event['time']),
    venue=e(event['venue']), address=e(event['address']), emcee=e(event['emcee']),
    installing_officer=e(event['installingOfficer']), music=e(event['music']), event_source=e(event['source']),
    logo=image('logo.png','Coconut Coast Organization of REALTORS®','logo',True),
    draft='<p class="draft-note">Program in progress · Final details to come</p>' if data.get('draft') else '',
    officers=''.join(map(officer,data['officers'])), directors=''.join(map(director,data['directors'])),
    chairs=''.join(map(chair,data['chairs'])), sponsors=''.join(map(sponsor,data['sponsors'])),
    president_portrait=image('wade.jpg','Wade Abed','letter-portrait'),
    president_message=paragraphs(data.get('presidentMessage'),'Wade’s welcome letter will be added once the approved message is available.'),
    market_highlights=render_market(data['market']),
    achievements=paragraphs(data.get('achievements'),'Approved 2026 accomplishments, community impact and association milestones will be added here.'),
    upcoming_events=paragraphs(data.get('upcomingEvents'),'The confirmed 2027 dates and registration links will be added here.'),
    photos=''.join(photo(p,i) for i,p in enumerate(data['photos'])), photo_count=len(data['photos']),
    filters=filters, album_notes=album_notes, updated=e(data['updated']), json_data=json_data,
    first_photo=e(data['photos'][0]['src'])
)
html = Template((ROOT / 'program-2026-template.html').read_text()).substitute(values)
for name in ['2026-installation-program.html','2025 Installation Banquet.html']:
    (ROOT / name).write_text(html)
print(f'Built program: {len(data["photos"])} photos, {len(data["officers"])} officers, {len(data["directors"])} directors, {len(data["chairs"])} committees, {len(data["sponsors"])} sponsor categories.')
