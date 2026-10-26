import json
import sqlite3
import os
import csv

def verify_and_test_restore():
    admin_dir = r"c:\Users\Kevin\Homepage-6\sea-2026\archive\2025_admin"
    backup_file = os.path.join(admin_dir, "signups_d1_backup.json")
    base_file = os.path.join(admin_dir, "contacts_base_2025.json")

    print("=== VERIFYING 2025 ADMINISTRATIVE DATA BACKUP ===")
    if not os.path.exists(backup_file):
        raise FileNotFoundError(f"Missing backup file: {backup_file}")

    with open(backup_file, "r", encoding="utf-8") as f:
        d1_data = json.load(f)

    signups = d1_data.get("signups", {})
    print(f"Loaded {len(signups)} records from signups_d1_backup.json")

    # Export a clean staff CSV for offline historical audit
    csv_path = os.path.join(admin_dir, "historical_2025_staff_audit.csv")
    fieldnames = [
        "RecordKey", "FirstName", "LastName", "Organization", "Email", "Phone",
        "SalesVolume", "ActualAwardLevel", "AwardChoice", "CheckedBy", "NumbersConfirmed",
        "NumbersConfirmedBy", "NumbersConfirmedAt", "EventRegistered", "EventRegisteredBy",
        "NotAttending", "HeadshotUrl", "Notes"
    ]

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for key, rec in signups.items():
            writer.writerow({
                "RecordKey": key,
                "FirstName": rec.get("firstName") or "",
                "LastName": rec.get("lastName") or "",
                "Organization": rec.get("organization") or "",
                "Email": rec.get("email") or "",
                "Phone": rec.get("priPhone") or "",
                "SalesVolume": rec.get("salesVolume") or "",
                "ActualAwardLevel": rec.get("actualAwardLevel") or "",
                "AwardChoice": rec.get("awardPref") or "",
                "CheckedBy": rec.get("checkedBy") or "",
                "NumbersConfirmed": "YES" if rec.get("numbersConfirmed") else "NO",
                "NumbersConfirmedBy": rec.get("numbersConfirmedBy") or "",
                "NumbersConfirmedAt": rec.get("numbersConfirmedAt") or "",
                "EventRegistered": "YES" if rec.get("eventRegistered") else "NO",
                "EventRegisteredBy": rec.get("eventRegisteredBy") or "",
                "NotAttending": "YES" if rec.get("notAttending") else "NO",
                "HeadshotUrl": rec.get("headshotUrl") or "",
                "Notes": rec.get("notes") or ""
            })
    print(f"Generated staff audit CSV: {csv_path}")

    # Test restoration into an isolated SQLite database
    test_db_path = os.path.join(admin_dir, "sea_2025_restored_test.db")
    if os.path.exists(test_db_path):
        os.remove(test_db_path)

    conn = sqlite3.connect(test_db_path)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE sea_2025_signups_restored (
            record_key TEXT PRIMARYKEY,
            checked_by TEXT,
            sales_volume TEXT,
            numbers_confirmed INTEGER,
            numbers_confirmed_by TEXT,
            numbers_confirmed_at TEXT,
            event_registered INTEGER,
            event_registered_by TEXT,
            event_registered_at TEXT,
            award_pref TEXT,
            award_pref_by TEXT,
            award_pref_at TEXT,
            headshot_url TEXT,
            actual_award_level TEXT,
            not_attending INTEGER,
            first_name TEXT,
            last_name TEXT,
            organization TEXT,
            email TEXT,
            phone TEXT,
            notes TEXT,
            raw_payload TEXT
        );
    """)

    inserted = 0
    for key, val in signups.items():
        cur.execute("""
            INSERT INTO sea_2025_signups_restored (
                record_key, checked_by, sales_volume, numbers_confirmed, numbers_confirmed_by,
                numbers_confirmed_at, event_registered, event_registered_by, event_registered_at,
                award_pref, award_pref_by, award_pref_at, headshot_url, actual_award_level,
                not_attending, first_name, last_name, organization, email, phone, notes, raw_payload
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            key,
            val.get("checkedBy"),
            val.get("salesVolume"),
            1 if val.get("numbersConfirmed") else 0,
            val.get("numbersConfirmedBy"),
            val.get("numbersConfirmedAt"),
            1 if val.get("eventRegistered") else 0,
            val.get("eventRegisteredBy"),
            val.get("eventRegisteredAt"),
            val.get("awardPref"),
            val.get("awardPrefBy"),
            val.get("awardPrefAt"),
            val.get("headshotUrl"),
            val.get("actualAwardLevel"),
            1 if val.get("notAttending") else 0,
            val.get("firstName"),
            val.get("lastName"),
            val.get("organization"),
            val.get("email"),
            val.get("priPhone"),
            val.get("notes"),
            json.dumps(val)
        ))
        inserted += 1

    conn.commit()

    # Verify query counts
    cur.execute("SELECT COUNT(*) FROM sea_2025_signups_restored")
    restored_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM sea_2025_signups_restored WHERE actual_award_level IS NOT NULL")
    awarded_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM sea_2025_signups_restored WHERE numbers_confirmed = 1")
    confirmed_count = cur.fetchone()[0]

    conn.close()

    print(f"Restoration Test SUCCESS: Restored {restored_count}/{len(signups)} records into {test_db_path}")
    print(f"Verified breakdown: {confirmed_count} with numbers confirmed, {awarded_count} with actual award level.")
    return True

if __name__ == "__main__":
    verify_and_test_restore()
