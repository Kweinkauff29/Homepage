"""
2026 Sales Excellence Awards - Idempotent Data Import & Reconciliation Engine
Coconut Coast Organization of REALTORS® (CCOR)

Imports the official consolidated 2026 Excel workbook:
SEA_Recruiting_Qualified_and_Potential_2026.xlsx
into SQLite / Cloudflare D1 compatible database.
"""

import os
import sys
import json
import sqlite3
import openpyxl

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(SCRIPT_DIR, 'sea_2026_local.db')
SCHEMA_PATH = os.path.join(SCRIPT_DIR, 'schema.sql')
WORKBOOK_PATH = r'C:\Users\Kevin\Downloads\SEA_Recruiting_Qualified_and_Potential_2026.xlsx'
CONTACTS_2025_PATH = r'C:\Users\Kevin\2026-Web-Changes-BER\SEA2025\contacts.json'

AWARD_YEAR = 2026
EVENT_NAME = "2027 Sales Excellence Awards"
EVENT_DATE = "February 11, 2027"
EVENT_TIME = "9:00 AM–11:30 AM Eastern"
REGISTRATION_URL = "https://bonitaspringsesterorealtorsfl.growthzoneapp.com/ap/Events/Register/J5F2A7xHJCzC3"
VOL_BENCHMARK = 5000000.0
SIDES_BENCHMARK = 25.0
MANDATORY_BCC = "tech@coconutcoastrealtors.org"

def init_db(conn):
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    conn.executescript(schema_sql)
    conn.commit()

def load_2025_contacts():
    if not os.path.exists(CONTACTS_2025_PATH):
        return {}
    try:
        with open(CONTACTS_2025_PATH, 'r', encoding='utf-8') as f:
            c_list = json.load(f)
        lookup = {}
        for c in c_list:
            fn = (c.get('FirstName') or '').strip().lower()
            ln = (c.get('LastName') or '').strip().lower()
            key = f"{fn} {ln}".strip()
            if key:
                lookup[key] = {
                    'email': (c.get('Email') or '').strip(),
                    'phone': (c.get('PriPhone') or '').strip(),
                    'organization': (c.get('Organization') or '').strip(),
                    'city': (c.get('City') or '').strip(),
                    'state': (c.get('State') or '').strip()
                }
        return lookup
    except Exception as e:
        print(f"Warning: Could not read 2025 contacts: {e}")
        return {}

def run_import():
    print("=" * 70)
    print("2026 SEA DATA IMPORT & RECONCILIATION ENGINE")
    print("=" * 70)
    
    if not os.path.exists(WORKBOOK_PATH):
        raise FileNotFoundError(f"Workbook not found at: {WORKBOOK_PATH}")
    
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)
    cursor = conn.cursor()
    
    # 1. Seed or update Award Year Metadata
    cursor.execute("""
        INSERT INTO sea_award_years (
            award_year, event_name, event_date, event_time, registration_url,
            min_volume_threshold, min_sides_threshold, is_active, email_mode, mandatory_bcc_email, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'disabled', ?, datetime('now'))
        ON CONFLICT(award_year) DO UPDATE SET
            event_name = excluded.event_name,
            event_date = excluded.event_date,
            event_time = excluded.event_time,
            registration_url = excluded.registration_url,
            min_volume_threshold = excluded.min_volume_threshold,
            min_sides_threshold = excluded.min_sides_threshold,
            mandatory_bcc_email = excluded.mandatory_bcc_email,
            updated_at = datetime('now');
    """, (AWARD_YEAR, EVENT_NAME, EVENT_DATE, EVENT_TIME, REGISTRATION_URL, VOL_BENCHMARK, SIDES_BENCHMARK, MANDATORY_BCC))
    conn.commit()
    print(f"Award Year {AWARD_YEAR} configuration seeded (Email Mode: 'disabled').")
    
    # Load 2025 contacts for enrichment
    contacts_2025 = load_2025_contacts()
    print(f"Loaded {len(contacts_2025)} historical 2025 contacts for potential profile enrichment.")
    
    # 2. Parse 2026 Excel Workbook
    wb = openpyxl.load_workbook(WORKBOOK_PATH, data_only=True)
    ws_all = wb['All Agents']
    raw_rows = list(ws_all.iter_rows(values_only=True))[6:] # row 7 onwards
    
    # Track statistics
    total_processed = 0
    agents_created = 0
    agents_updated = 0
    records_created = 0
    records_updated = 0
    
    cat_counts = {
        'Qualified — Preliminary': 0,
        'Potential — High Priority': 0,
        'Potential — Watch List': 0,
        'Needs Manual Review': 0,
        'Not Eligible': 0
    }
    
    # Set of Priority Prospects for exact matching
    ws_priority = wb['Priority Prospects']
    priority_ids = set()
    for pr in list(ws_priority.iter_rows(values_only=True))[6:]:
        if pr[2]:
            priority_ids.add(str(pr[2]).strip().upper())
            
    print(f"Priority Prospects identified in workbook: {len(priority_ids)}")
    
    for row in raw_rows:
        if not row[0] or not row[2]:
            continue
            
        total_processed += 1
        agent_name = str(row[0]).strip()
        office = str(row[1]).strip() if row[1] else ''
        agent_id_str = str(row[2]).strip()
        license_id = agent_id_str.upper()
        
        # Split names
        parts = agent_name.split()
        if len(parts) == 1:
            first_name = parts[0]
            last_name = ''
        else:
            first_name = parts[0]
            last_name = " ".join(parts[1:])
            
        total_sides = float(row[3]) if row[3] is not None else 0.0
        total_volume = float(row[4]) if row[4] is not None else 0.0
        list_sides = float(row[5]) if row[5] is not None else 0.0
        sold_sides = float(row[6]) if row[6] is not None else 0.0
        list_volume = float(row[7]) if row[7] is not None else 0.0
        sold_volume = float(row[8]) if row[8] is not None else 0.0
        
        sides_rank = int(row[9]) if row[9] is not None else None
        volume_rank = int(row[10]) if row[10] is not None else None
        workbook_cat = str(row[11]).strip() if row[11] else ''
        
        proj_sides = float(row[12]) if row[12] is not None else None
        proj_vol = float(row[13]) if row[13] is not None else None
        sides_needed = float(row[14]) if row[14] is not None else 0.0
        vol_needed = float(row[15]) if len(row) > 15 and row[15] is not None else 0.0
        pace = str(row[16]).strip() if len(row) > 16 and row[16] else 'No'
        in_rep = str(row[17]).strip() if len(row) > 17 and row[17] else 'Both reports'
        outreach = str(row[18]).strip() if len(row) > 18 and row[18] else 'Not contacted'
        
        # Check for board / organizational record
        is_board = ('board of realtors' in agent_name.lower()) or (license_id == 'JACKB')
        
        # Assign formal Eligibility Category
        if is_board:
            eligibility = 'Not Eligible'
        elif total_volume > VOL_BENCHMARK and total_sides > SIDES_BENCHMARK:
            eligibility = 'Qualified — Preliminary'
        elif license_id in priority_ids or 'priority' in workbook_cat.lower() or 'p1' in workbook_cat.lower() or 'p2' in workbook_cat.lower():
            eligibility = 'Potential — High Priority'
        elif total_volume > VOL_BENCHMARK or total_sides > SIDES_BENCHMARK or 'p3' in workbook_cat.lower() or 'p4' in workbook_cat.lower() or 'p5' in workbook_cat.lower():
            eligibility = 'Potential — Watch List'
        else:
            eligibility = 'Needs Manual Review'
            
        cat_counts[eligibility] = cat_counts.get(eligibility, 0) + 1
        
        # 3. Create or Match sea_agents profile
        norm_name = agent_name.lower()
        hist = contacts_2025.get(norm_name, {})
        primary_email = hist.get('email', '')
        primary_phone = hist.get('phone', '')
        
        cursor.execute("SELECT id FROM sea_agents WHERE license_id = ?", (license_id,))
        existing_agent = cursor.fetchone()
        
        if existing_agent:
            agent_db_id = existing_agent[0]
            cursor.execute("""
                UPDATE sea_agents SET
                    first_name = ?, last_name = ?, full_name = ?, primary_office = ?,
                    primary_email = COALESCE(NULLIF(primary_email, ''), ?),
                    primary_phone = COALESCE(NULLIF(primary_phone, ''), ?),
                    updated_at = datetime('now')
                WHERE id = ?;
            """, (first_name, last_name, agent_name, office, primary_email, primary_phone, agent_db_id))
            agents_updated += 1
        else:
            # Deterministic, readable permanent agent ID based on index
            agent_db_id = f"SEA-AGT-{license_id}"
            cursor.execute("""
                INSERT INTO sea_agents (
                    id, license_id, first_name, last_name, full_name, primary_email, primary_phone, primary_office, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1);
            """, (agent_db_id, license_id, first_name, last_name, agent_name, primary_email, primary_phone, office))
            agents_created += 1
            
        # 4. Create or Update Annual Record for 2026
        record_id = f"REC-{AWARD_YEAR}-{license_id}"
        cursor.execute("SELECT id FROM sea_records WHERE id = ?", (record_id,))
        existing_rec = cursor.fetchone()
        
        if existing_rec:
            cursor.execute("""
                UPDATE sea_records SET
                    office = ?, total_sides = ?, list_sides = ?, sold_sides = ?,
                    total_volume = ?, list_volume = ?, sold_volume = ?,
                    sides_rank = ?, volume_rank = ?,
                    projected_2026_sides = ?, projected_2026_volume = ?,
                    sides_needed = ?, volume_needed = ?, year_end_pace = ?,
                    in_report = ?, workbook_category = ?, eligibility_category = ?,
                    updated_at = datetime('now')
                WHERE id = ?;
            """, (
                office, total_sides, list_sides, sold_sides,
                total_volume, list_volume, sold_volume,
                sides_rank, volume_rank,
                proj_sides, proj_vol,
                sides_needed, vol_needed, pace,
                in_rep, workbook_cat, eligibility,
                record_id
            ))
            records_updated += 1
        else:
            cursor.execute("""
                INSERT INTO sea_records (
                    id, agent_id, award_year, office,
                    total_sides, list_sides, sold_sides,
                    total_volume, list_volume, sold_volume,
                    sides_rank, volume_rank,
                    projected_2026_sides, projected_2026_volume,
                    sides_needed, volume_needed, year_end_pace,
                    in_report, workbook_category, eligibility_category,
                    award_preference, engraved_name, attendance_response,
                    registration_link_clicked, registration_self_reported, registration_independently_verified,
                    outreach_status, internal_notes
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    NULL, ?, NULL,
                    0, 0, 0,
                    ?, ?
                );
            """, (
                record_id, agent_db_id, AWARD_YEAR, office,
                total_sides, list_sides, sold_sides,
                total_volume, list_volume, sold_volume,
                sides_rank, volume_rank,
                proj_sides, proj_vol,
                sides_needed, vol_needed, pace,
                in_rep, workbook_cat, eligibility,
                agent_name, # Default proposed engraved name
                outreach,
                "Excluded organizational account" if is_board else None
            ))
            records_created += 1
            
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 70)
    print("IMPORT COMPLETE & RECONCILIATION SUMMARY")
    print("=" * 70)
    print(f"Total workbook entries processed : {total_processed}")
    print(f"Permanent Agent profiles created : {agents_created} (updated: {agents_updated})")
    print(f"2026 Annual SEA records created  : {records_created} (updated: {records_updated})")
    print("\nEligibility Category Breakdown:")
    for cat, count in cat_counts.items():
        print(f"  • {cat:26}: {count:3} agents")
    print("=" * 70)

if __name__ == '__main__':
    run_import()
