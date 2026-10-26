import urllib.request
import json

def test():
    req = urllib.request.Request(
        'http://127.0.0.1:8787/api/sea/summary?include_test=false',
        headers={'X-CCOR-Staff-Token': 'ccor-staff-admin-secure-token-2026'}
    )
    res = urllib.request.urlopen(req)
    summary = json.loads(res.read().decode('utf-8'))
    print("Summary HTTP status:", res.status)
    print("Total agents:", summary['total_agents'])
    print("Categories:", summary['categories'])

    req2 = urllib.request.Request(
        'http://127.0.0.1:8787/api/sea/agents?include_test=false',
        headers={'X-CCOR-Staff-Token': 'ccor-staff-admin-secure-token-2026'}
    )
    res2 = urllib.request.urlopen(req2)
    agents_data = json.loads(res2.read().decode('utf-8'))
    print("Agents count returned:", agents_data['count'])

    target_names = ['Amber Teeters', 'Kevin Bartlett', 'Jill B Kushner', 'Joe R Pavich', 'Zachary Rosen']
    for a in agents_data['agents']:
        for n in target_names:
            if n.lower() in a['full_name'].lower():
                print(f"FOUND {n}: License={a['license_id']}, Vol=${a['total_volume']:,.2f}, Sides={a['total_sides']}, Cat={a['eligibility_category']}, Office={a['office_display_name']}")

if __name__ == '__main__':
    test()
