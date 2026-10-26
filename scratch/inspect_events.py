import urllib.request
import json
import re

def inspect():
    req = urllib.request.Request(
        'https://gz-realestate-proxy.bonitaspringsrealtors.workers.dev/events/all?enriched=true',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    res = urllib.request.urlopen(req, timeout=10)
    data = json.loads(res.read().decode('utf-8'))
    results = data.get('Results', [])
    print('Total gz events:', len(results))

    flyer_count = 0
    desc_img_count = 0
    with_any_img = 0

    for ev in results:
        f = ev.get('EnrichedFlyerUrl') or ev.get('EventLogoUrl')
        desc = ev.get('Description') or ''
        m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', desc, re.I)
        if f:
            flyer_count += 1
        if m:
            desc_img_count += 1
        if f or m:
            with_any_img += 1

    print(f"Events with direct flyer/logo: {flyer_count}, with img in Description: {desc_img_count}, total with flyer/img: {with_any_img}")

    # Inspect all keys across all events
    all_keys = set()
    for ev in results:
        all_keys.update(ev.keys())
    print("All keys across all events in gz-realestate-proxy:", sorted(list(all_keys)))

    # Inspect what calendar/category data exists
    for ev in results[:5]:
        print("\nEvent:", ev.get('Name'))
        print("  EventId:", ev.get('EventId'))
        print("  StartDate:", ev.get('StartDate'))
        print("  Location:", ev.get('Location'), ev.get('LocationName'))
        print("  IsClass:", ev.get('IsClass'))
        print("  Categories:", ev.get('Categories'), ev.get('CategoryName'), ev.get('CalendarName'), ev.get('Calendars'))
        print("  EnrichedFlyerUrl:", ev.get('EnrichedFlyerUrl'))
        print("  EventLogoUrl:", ev.get('EventLogoUrl'))

    # Also inspect ccreschool.com
    print("\n--- Inspecting ccreschool.com ---")
    try:
        req2 = urllib.request.Request(
            'https://www.ccreschool.com/api/public-events?page=education',
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        res2 = urllib.request.urlopen(req2, timeout=10)
        cdata = json.loads(res2.read().decode('utf-8'))
        events = cdata.get('events', [])
        print("ccreschool events count:", len(events))
        c_flyers = sum(1 for e in events if e.get('flyerUrl'))
        print("ccreschool events with flyerUrl:", c_flyers)
        for e in events[:5]:
            print("\n  Class:", e.get('name'))
            print("    flyerUrl:", e.get('flyerUrl'))
            print("    displayImageUrl:", e.get('displayImageUrl'))
            print("    format:", e.get('format'))
            print("    categories:", e.get('categories'))
    except Exception as e:
        print("ccreschool error:", e)

if __name__ == '__main__':
    inspect()
