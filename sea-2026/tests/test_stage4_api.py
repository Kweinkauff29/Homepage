import urllib.request
import json

headers = {"X-CCOR-Staff-Token": "ccor-staff-admin-secure-token-2026"}

def test_endpoint(name, url):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=5) as res:
        print(f"[{name}] Status: {res.status}")
        if "export" in url:
            lines = res.read().decode("utf-8").splitlines()
            print(f"  CSV exported records: {len(lines) - 1} rows + header")
            print(f"  Header: {lines[0]}")
            print(f"  Row 1: {lines[1]}")
        else:
            data = json.loads(res.read().decode("utf-8"))
            if "agents" in data:
                print(f"  Agents count: {data.get('count')}")
                first = data["agents"][0]
                print(f"  First Agent: {first['full_name']} | Office: {first['office']} -> {first['office_display_name']} | Qual: {first['eligibility_category']}")
            elif "award_years" in data:
                years = [f"{y['award_year']} ({y['event_name']})" for y in data["award_years"]]
                print(f"  Award years: {years}")
            elif "mappings" in data:
                print(f"  Brokerage mappings loaded: {len(data['mappings'])} entries")

def run():
    print("=== TESTING STAGE 4 OPERATIONAL ENDPOINTS ===")
    test_endpoint("Award Years", "http://127.0.0.1:8787/api/sea/award-years")
    test_endpoint("Brokerage Mappings", "http://127.0.0.1:8787/api/sea/brokerage-mappings")
    test_endpoint("Real Agents Roster", "http://127.0.0.1:8787/api/sea/agents")
    test_endpoint("CSV Staff Export", "http://127.0.0.1:8787/api/sea/agents/export")

if __name__ == "__main__":
    run()
