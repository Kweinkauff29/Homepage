import urllib.request
import urllib.error
import json
import sqlite3

BASE = 'http://127.0.0.1:8787'

print("--- DEMO SCENARIO C1: Submitting without opening registration link ---")
db_path = r'c:\Users\Kevin\Homepage-6\sea-2026\database\sea_2026_local.db'
conn = sqlite3.connect(db_path)
conn.execute("UPDATE sea_records SET registration_link_clicked = 0, registration_link_clicked_at = NULL, registration_self_reported = 0 WHERE id = 'REC-2026-TEST-C'")
conn.commit()
conn.close()

req1 = urllib.request.Request(
    f'{BASE}/api/confirm/submit',
    headers={'Content-Type': 'application/json'},
    data=json.dumps({
        'token': 'TEST-TOKEN-SCENARIO-C-BLOCKED-VALIDATION',
        'engraved_name': 'Alex Bennett',
        'award_preference': 'trophy',
        'attendance_response': 'yes',
        'registration_self_reported': 1
    }).encode('utf-8')
)

try:
    urllib.request.urlopen(req1)
except urllib.error.HTTPError as e:
    print('HTTP Code:', e.code)
    print('Response:', e.read().decode())

print("\n--- DEMO SCENARIO C2: Agent opens link, but fails to check registration affirmation checkbox ---")
# 1. Record registration click
req_click = urllib.request.Request(
    f'{BASE}/api/confirm/track-click',
    headers={'Content-Type': 'application/json'},
    data=json.dumps({'token': 'TEST-TOKEN-SCENARIO-C-BLOCKED-VALIDATION'}).encode('utf-8')
)
res_click = urllib.request.urlopen(req_click)
print('Click Status:', res_click.status, json.loads(res_click.read().decode())['message'])

# 2. Attempt submit with attending 'yes' and registration_self_reported = 0
req2 = urllib.request.Request(
    f'{BASE}/api/confirm/submit',
    headers={'Content-Type': 'application/json'},
    data=json.dumps({
        'token': 'TEST-TOKEN-SCENARIO-C-BLOCKED-VALIDATION',
        'engraved_name': 'Alex Bennett',
        'award_preference': 'trophy',
        'attendance_response': 'yes',
        'registration_self_reported': 0  # Unchecked
    }).encode('utf-8')
)

try:
    urllib.request.urlopen(req2)
except urllib.error.HTTPError as e:
    print('HTTP Code:', e.code)
    print('Response:', e.read().decode())
