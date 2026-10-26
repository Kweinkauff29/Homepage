import json
import sqlite3

db_path = r"c:\Users\Kevin\Homepage-6\sea-2026\database\sea_2026_local.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Load 2025 public winners
with open(r"c:\Users\Kevin\Homepage-6\sea-2026\archive\2025_public\winners_2025.json", "r", encoding="utf-8") as f:
    winners_2025 = {w["name"].lower(): w["brokerage"] for w in json.load(f)["winners"]}

# Load 2025 D1 signups
with open(r"c:\Users\Kevin\Homepage-6\sea-2026\archive\2025_admin\signups_d1_backup.json", "r", encoding="utf-8") as f:
    d1_signups = json.load(f).get("signups", {})
    d1_orgs = {}
    for k, v in d1_signups.items():
        fname = v.get("firstName") or ""
        lname = v.get("lastName") or ""
        name = f"{fname} {lname}".strip().lower()
        if name and v.get("organization"):
            d1_orgs[name] = v.get("organization")

# Load 2025 base contacts
with open(r"c:\Users\Kevin\Homepage-6\sea-2026\archive\2025_admin\contacts_base_2025.json", "r", encoding="utf-8") as f:
    base_contacts = json.load(f)
    for c in base_contacts:
        name = f"{c.get('FirstName', '')} {c.get('LastName', '')}".strip().lower()
        if name and c.get("Organization"):
            d1_orgs[name] = c.get("Organization")

cur.execute("SELECT r.office, a.full_name FROM sea_records r JOIN sea_agents a ON r.agent_id = a.id WHERE a.id NOT LIKE '%TEST%'")
records = cur.fetchall()

office_to_brokerage = {}
office_counts = {}

for off, name in records:
    office_counts[off] = office_counts.get(off, 0) + 1
    n_lower = name.lower()
    b_match = winners_2025.get(n_lower) or d1_orgs.get(n_lower)
    if b_match:
        if off not in office_to_brokerage:
            office_to_brokerage[off] = set()
        office_to_brokerage[off].add(b_match)

print("=== OFFICE CODE MATCHES FROM 2025 DATA ===")
confirmed_mappings = {}
for off, b_set in sorted(office_to_brokerage.items()):
    b_list = list(b_set)
    print(f"{off} ({office_counts.get(off)} agents): {b_list}")
    # If single unambiguous match
    if len(b_list) == 1:
        confirmed_mappings[off] = b_list[0]

unmatched = [off for off in office_counts if off not in office_to_brokerage]
print(f"\nUnmatched office codes ({len(unmatched)}): {unmatched}")
print(f"Total confirmed unique mappings: {len(confirmed_mappings)}")

conn.close()
