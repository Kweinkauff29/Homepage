import urllib.request
import json

BASE = 'http://127.0.0.1:8787'

print("--- DEMO SCENARIO A: Trophy + Attending + Clicked + Affirmation Checked ---")
token_a = 'TEST-TOKEN-SCENARIO-A-TROPHY-ATTENDING'
# 1. Click link
req_click_a = urllib.request.Request(
    f'{BASE}/api/confirm/track-click',
    headers={'Content-Type': 'application/json'},
    data=json.dumps({'token': token_a}).encode('utf-8')
)
res_click_a = urllib.request.urlopen(req_click_a)
print('Scenario A Click:', json.loads(res_click_a.read().decode())['message'])

# 2. Submit form
req_sub_a = urllib.request.Request(
    f'{BASE}/api/confirm/submit',
    headers={'Content-Type': 'application/json'},
    data=json.dumps({
        'token': token_a,
        'engraved_name': 'Jordan Rivera, PA',
        'award_preference': 'trophy',
        'attendance_response': 'yes',
        'registration_self_reported': 1,
        'corrections': {'preferred_name': 'Jordan Rivera, PA'}
    }).encode('utf-8')
)
res_sub_a = urllib.request.urlopen(req_sub_a)
data_a = json.loads(res_sub_a.read().decode())
print('Scenario A Result:', data_a['status'], '| Award:', data_a['award_preference'], '| Attendance:', data_a['attendance_response'])
print('Message:', data_a['message'])
print('Note:', data_a['attendance_note'])

print("\n--- DEMO SCENARIO B: Certificate + Not Attending + Clicked ---")
token_b = 'TEST-TOKEN-SCENARIO-B-CERT-DECLINED'
# 1. Click link
req_click_b = urllib.request.Request(
    f'{BASE}/api/confirm/track-click',
    headers={'Content-Type': 'application/json'},
    data=json.dumps({'token': token_b}).encode('utf-8')
)
res_click_b = urllib.request.urlopen(req_click_b)
print('Scenario B Click:', json.loads(res_click_b.read().decode())['message'])

# 2. Submit form
req_sub_b = urllib.request.Request(
    f'{BASE}/api/confirm/submit',
    headers={'Content-Type': 'application/json'},
    data=json.dumps({
        'token': token_b,
        'engraved_name': 'Taylor Morgan, GRI',
        'award_preference': 'certificate',
        'attendance_response': 'no',
        'registration_self_reported': 0
    }).encode('utf-8')
)
res_sub_b = urllib.request.urlopen(req_sub_b)
data_b = json.loads(res_sub_b.read().decode())
print('Scenario B Result:', data_b['status'], '| Award:', data_b['award_preference'], '| Attendance:', data_b['attendance_response'])
print('Message:', data_b['message'])
print('Note:', data_b['attendance_note'])
