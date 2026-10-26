import urllib.request
import json
import os
import shutil
import re
from bs4 import BeautifulSoup

def main():
    base_dir = r"c:\Users\Kevin\Homepage-6\sea-2026"
    archive_public_dir = os.path.join(base_dir, "archive", "2025_public")
    archive_admin_dir = os.path.join(base_dir, "archive", "2025_admin")
    os.makedirs(archive_public_dir, exist_ok=True)
    os.makedirs(archive_admin_dir, exist_ok=True)

    print("=== ARCHIVING 2025 PUBLIC WINNERS ===")
    public_url = "https://coconutcoastrealtors.org/2025-sales-excellence-award-winners/"
    req = urllib.request.Request(public_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req, timeout=15) as res:
        public_html = res.read().decode("utf-8", errors="ignore")

    raw_html_path = os.path.join(archive_public_dir, "2025_public_winners_original.html")
    with open(raw_html_path, "w", encoding="utf-8") as f:
        f.write(public_html)
    print(f"Saved original public HTML to {raw_html_path} ({len(public_html)} bytes)")

    soup = BeautifulSoup(public_html, "html.parser")
    winners = soup.select(".sea-winner")
    winner_list = []
    tier_counts = {"diamond": 0, "platinum": 0, "gold": 0, "other": 0}

    for w in winners:
        classes = w.get("class", [])
        tier = "other"
        for t in ["diamond", "platinum", "gold"]:
            if t in classes:
                tier = t
                tier_counts[t] += 1
                break
        if tier == "other":
            tier_counts["other"] += 1

        name_el = w.select_one(".sea-agent-name") or w.select_one("h4") or w.select_one(".winner-name")
        name = name_el.get_text(strip=True) if name_el else "Unknown"

        img_el = w.select_one("img")
        img_src = img_el.get("src") if img_el else None

        brokerage_parent = w.find_parent(class_="sea-brokerage")
        b_name = "Unknown"
        if brokerage_parent:
            b_heading = brokerage_parent.select_one("h3") or brokerage_parent.select_one(".brokerage-title")
            if b_heading:
                b_name = b_heading.get_text(strip=True)

        winner_list.append({
            "name": name,
            "tier": tier.capitalize(),
            "brokerage": b_name,
            "image": img_src
        })

    winners_json_path = os.path.join(archive_public_dir, "winners_2025.json")
    with open(winners_json_path, "w", encoding="utf-8") as f:
        json.dump({
            "year": 2025,
            "award_ceremony": "2025 Sales Excellence Awards",
            "source_url": public_url,
            "total_winners": len(winner_list),
            "tier_counts": tier_counts,
            "winners": winner_list
        }, f, indent=2)
    print(f"Saved {len(winner_list)} parsed winners to {winners_json_path}")
    print(f"Tier breakdown: Diamond={tier_counts['diamond']}, Platinum={tier_counts['platinum']}, Gold={tier_counts['gold']}")

    print("\n=== ARCHIVING 2025 ADMINISTRATIVE RECORDS ===")
    api_url = "https://ber-contacts-api.bonitaspringsrealtors.workers.dev/signups"
    req_api = urllib.request.Request(api_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req_api, timeout=15) as res:
        d1_data = json.loads(res.read().decode("utf-8"))

    d1_backup_path = os.path.join(archive_admin_dir, "signups_d1_backup.json")
    with open(d1_backup_path, "w", encoding="utf-8") as f:
        json.dump(d1_data, f, indent=2)
    signups = d1_data.get("signups", {})
    print(f"Saved live Cloudflare D1 backup ({len(signups)} signups) to {d1_backup_path}")

    # Extract base contacts from 2025-sea-list-extracted.html
    src_extracted = r"c:\Users\Kevin\Homepage-6\2025-sea-list-extracted.html"
    dst_extracted = os.path.join(archive_admin_dir, "2025-sea-list-extracted.html")
    shutil.copyfile(src_extracted, dst_extracted)
    print(f"Preserved copy of {src_extracted} -> {dst_extracted}")

    with open(src_extracted, "r", encoding="utf-8", errors="ignore") as f:
        extracted_content = f.read()

    match_contacts = re.search(r"const CONTACTS_DATA\s*=\s*(\[.*?\]);", extracted_content, re.DOTALL)
    if match_contacts:
        contacts_raw = match_contacts.group(1)
        # Parse JSON array (handle JS keys/values if needed or python json)
        try:
            contacts_data = json.loads(contacts_raw)
            contacts_json_path = os.path.join(archive_admin_dir, "contacts_base_2025.json")
            with open(contacts_json_path, "w", encoding="utf-8") as f:
                json.dump(contacts_data, f, indent=2)
            print(f"Extracted and saved {len(contacts_data)} base contacts from CONTACTS_DATA")
        except Exception as e:
            print(f"Note on CONTACTS_DATA parse: {e}")

    # Create merged historical summary
    merged_summary = {
        "archive_year": 2025,
        "created_at": "2026-10-23T14:55:00Z",
        "description": "Historical 2025 Sales Excellence Awards administrative tracking backup",
        "total_d1_records": len(signups),
        "total_public_winners": len(winner_list),
        "records": signups
    }
    merged_path = os.path.join(archive_admin_dir, "historical_admin_records_2025.json")
    with open(merged_path, "w", encoding="utf-8") as f:
        json.dump(merged_summary, f, indent=2)
    print(f"Saved merged historical admin records to {merged_path}")

if __name__ == "__main__":
    main()
