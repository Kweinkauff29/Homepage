import sqlite3
import os
import json

def run_stage4_migration():
    db_path = r"c:\Users\Kevin\Homepage-6\sea-2026\database\sea_2026_local.db"
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    print("=== RUNNING STAGE 4 DATABASE MIGRATION ===")

    # 1. Add is_test column to sea_agents if not exists
    cur.execute("PRAGMA table_info(sea_agents)")
    agent_cols = [c[1] for c in cur.fetchall()]
    if "is_test" not in agent_cols:
        print("Adding is_test column to sea_agents...")
        cur.execute("ALTER TABLE sea_agents ADD COLUMN is_test INTEGER DEFAULT 0")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_sea_agents_is_test ON sea_agents(is_test)")

    # 2. Add is_test column to sea_records if not exists
    cur.execute("PRAGMA table_info(sea_records)")
    record_cols = [c[1] for c in cur.fetchall()]
    if "is_test" not in record_cols:
        print("Adding is_test column to sea_records...")
        cur.execute("ALTER TABLE sea_records ADD COLUMN is_test INTEGER DEFAULT 0")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_sea_records_is_test ON sea_records(is_test)")

    # 3. Mark the 3 fictional test agents
    cur.execute("UPDATE sea_agents SET is_test = 1 WHERE id LIKE 'SEA-AGT-TEST%'")
    cur.execute("UPDATE sea_records SET is_test = 1 WHERE agent_id LIKE 'SEA-AGT-TEST%'")
    # Mark all others as is_test = 0
    cur.execute("UPDATE sea_agents SET is_test = 0 WHERE id NOT LIKE 'SEA-AGT-TEST%'")
    cur.execute("UPDATE sea_records SET is_test = 0 WHERE agent_id NOT LIKE 'SEA-AGT-TEST%'")

    cur.execute("SELECT COUNT(*) FROM sea_agents WHERE is_test = 1")
    test_agents_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM sea_agents WHERE is_test = 0")
    real_agents_count = cur.fetchone()[0]
    print(f"Verified agent counts: {real_agents_count} real agents, {test_agents_count} test agents.")

    # 4. Create sea_office_mappings table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS sea_office_mappings (
            office_code TEXT PRIMARY KEY,
            brokerage_name TEXT NOT NULL,
            is_verified INTEGER DEFAULT 1,
            notes TEXT,
            updated_by TEXT DEFAULT 'system',
            updated_at TEXT DEFAULT (datetime('now'))
        );
    """)

    # Add verified mappings
    office_mappings = {
        "BAHRE": "American Homes Real Estate",
        "BBBL": "Broker Brothers LLC",
        "BCOM": "Compass Florida, LLC",
        "BCRM": "Crimaldi and Associates, LLC",
        "BDOWN": "Downing-Frye Realty Inc.",
        "BDOWN2": "Downing-Frye Realty Inc.",
        "BDRC": "DomainRealty.com LLC",
        "BECLLC": "Corkscrew Real Estate / KW Luxury",
        "BEKBRE": "Knowledge Base Real Estate",
        "BEMRG": "Downing-Frye Realty Inc.",
        "BEROG": "Realty One Group MVP",
        "BEXP": "eXp Realty LLC",
        "BKSRI": "Kevin Shelly Realty Inc.",
        "BKWR": "Keller Williams Elite Realty",
        "BLAS": "Builders Land Associates",
        "BNEAL": "Neal Communities Realty, Inc.",
        "BORI": "Orchid Realty International",
        "BPREM07": "Premier Sotheby's International Realty",
        "BPRI": "Pulte Realty Inc",
        "BREM": "RE/MAX Realty Group",
        "BRSRE2": "Royal Shell Real Estate, Inc.",
        "BWRF": "William Raveis Real Estate",
        "DCRL": "Dina Marie Realty LLC",
        "DREG": "Decatur Real Estate Group",
        "HRRC": "Hunters Ridge Realty Co.",
        "JRWD03": "John R. Wood Properties",
        "KWLLC": "Keller Williams Elevate Luxury",
        "LREL": "Local Real Estate LLC",
        "PREP": "Premiere Plus Realty Company",
        "PRUD30": "Berkshire Hathaway HomeServices Florida Realty",
        "PTLR": "Potter Trinity",
        "RLTY": "Realty World J. PAVICH R.E.",
    }

    for code, name in office_mappings.items():
        cur.execute("""
            INSERT INTO sea_office_mappings (office_code, brokerage_name, is_verified, updated_by)
            VALUES (?, ?, 1, 'system')
            ON CONFLICT(office_code) DO UPDATE SET
                brokerage_name = excluded.brokerage_name,
                updated_at = datetime('now');
        """, (code, name))
    print(f"Populated {len(office_mappings)} verified office code mappings into sea_office_mappings.")

    # 5. Ensure sea_award_years has 2026, 2025, and 2024
    # Check 2025
    cur.execute("SELECT award_year FROM sea_award_years WHERE award_year = 2025")
    if not cur.fetchone():
        cur.execute("""
            INSERT INTO sea_award_years (
                award_year, event_name, event_date, event_time, registration_url,
                min_volume_threshold, min_sides_threshold, is_active, email_mode, mandatory_bcc_email
            ) VALUES (
                2025, '2025 Sales Excellence Awards', 'February 2025', 'Completed',
                'https://coconutcoastrealtors.org/2025-sales-excellence-award-winners/',
                5000000.0, 25.0, 0, 'disabled', 'tech@coconutcoastrealtors.org'
            );
        """)
        print("Added 2025 historical awards year.")

    # Check 2024
    cur.execute("SELECT award_year FROM sea_award_years WHERE award_year = 2024")
    if not cur.fetchone():
        cur.execute("""
            INSERT INTO sea_award_years (
                award_year, event_name, event_date, event_time, registration_url,
                min_volume_threshold, min_sides_threshold, is_active, email_mode, mandatory_bcc_email
            ) VALUES (
                2024, '2024 Sales Excellence Awards', 'February 2024', 'Completed',
                'https://coconutcoastrealtors.org/2024-sales-excellence-award-winners/',
                5000000.0, 25.0, 0, 'disabled', 'tech@coconutcoastrealtors.org'
            );
        """)
        print("Added 2024 historical awards year.")

    conn.commit()
    conn.close()
    print("Stage 4 database migration completed successfully!")

if __name__ == "__main__":
    run_stage4_migration()
