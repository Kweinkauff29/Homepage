"""
Stage 4 End-to-End Operational Verification & Regression Test Suite
Project: Sales Excellence Awards Management System
Organization: Coconut Coast Organization of REALTORS® (CCOR)
"""

import unittest
import os
import sys
import json
import sqlite3
import urllib.request
import urllib.error

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(TEST_DIR)
DB_PATH = os.path.join(PROJECT_DIR, 'database', 'sea_2026_local.db')
ARCHIVE_PUBLIC_DIR = os.path.join(PROJECT_DIR, 'archive', '2025_public')
ARCHIVE_ADMIN_DIR = os.path.join(PROJECT_DIR, 'archive', '2025_admin')

API_BASE = "http://127.0.0.1:8787"
STAFF_TOKEN = "ccor-staff-admin-secure-token-2026"
STAFF_HEADERS = {"X-CCOR-Staff-Token": STAFF_TOKEN, "Content-Type": "application/json"}


class TestStage4Operational(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        if not os.path.exists(DB_PATH):
            raise FileNotFoundError(f"Database missing at {DB_PATH}")

    # -------------------------------------------------------------
    # 1. 2025 Archive Preservation Tests
    # -------------------------------------------------------------
    def test_01_preserved_2025_public_winners(self):
        """Confirm 2025 public archive exists, has exact 131 winners and preserved photos/tiers."""
        winners_json_path = os.path.join(ARCHIVE_PUBLIC_DIR, 'winners_2025.json')
        self.assertTrue(os.path.exists(winners_json_path), "Missing winners_2025.json")

        with open(winners_json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.assertEqual(data['year'], 2025)
        self.assertEqual(data['total_winners'], 131, "Must have exactly 131 published 2025 winners")
        self.assertEqual(data['tier_counts']['diamond'], 32)
        self.assertEqual(data['tier_counts']['platinum'], 43)
        self.assertEqual(data['tier_counts']['gold'], 56)

        # Confirm photos are preserved
        photos_count = sum(1 for w in data['winners'] if w.get('image'))
        self.assertGreater(photos_count, 100, "Most winners have preserved headshot URLs")

        # Confirm standalone archive index.html exists
        index_html_path = os.path.join(ARCHIVE_PUBLIC_DIR, 'index.html')
        self.assertTrue(os.path.exists(index_html_path), "Missing 2025 public archive index.html")

    def test_02_preserved_2025_administrative_data(self):
        """Confirm 2025 historical contact-management backup exists and has 171 records."""
        d1_backup_path = os.path.join(ARCHIVE_ADMIN_DIR, 'signups_d1_backup.json')
        self.assertTrue(os.path.exists(d1_backup_path), "Missing signups_d1_backup.json")

        with open(d1_backup_path, 'r', encoding='utf-8') as f:
            d1_data = json.load(f)

        signups = d1_data.get('signups', {})
        self.assertEqual(len(signups), 171, "Must preserve exactly 171 historical signups")

        # Verify audit CSV export and restoration test DB
        csv_path = os.path.join(ARCHIVE_ADMIN_DIR, 'historical_2025_staff_audit.csv')
        self.assertTrue(os.path.exists(csv_path), "Missing historical_2025_staff_audit.csv")

        test_db_path = os.path.join(ARCHIVE_ADMIN_DIR, 'sea_2025_restored_test.db')
        self.assertTrue(os.path.exists(test_db_path), "Missing sea_2025_restored_test.db")

    # -------------------------------------------------------------
    # 2. 2026 Database Activation & Test Agent Isolation Tests
    # -------------------------------------------------------------
    def test_03_active_2026_counts_and_test_isolation(self):
        """Confirm 237 real records, 26 preliminary qualified, 20 high-priority, and test isolation."""
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()

        # Real agents count
        cur.execute("SELECT COUNT(*) FROM sea_agents WHERE is_test = 0")
        real_agents = cur.fetchone()[0]
        self.assertEqual(real_agents, 237, "Exactly 237 real source agents")

        # Test agents count
        cur.execute("SELECT COUNT(*) FROM sea_agents WHERE is_test = 1")
        test_agents = cur.fetchone()[0]
        self.assertEqual(test_agents, 3, "Exactly 3 test agents")

        # Breakdown of real records
        cur.execute("""
            SELECT eligibility_category, COUNT(*) 
            FROM sea_records 
            WHERE is_test = 0 AND award_year = 2026 
            GROUP BY eligibility_category
        """)
        cats = dict(cur.fetchall())
        self.assertEqual(cats.get('Qualified — Preliminary', 0), 26, "Must have exactly 26 Qualified Preliminary")
        self.assertEqual(cats.get('Potential — High Priority', 0), 20, "Must have exactly 20 High Priority")
        self.assertEqual(cats.get('Potential — Watch List', 0), 190, "Must have exactly 190 Watch List")
        self.assertEqual(cats.get('Not Eligible', 0), 1, "Must have 1 organizational record marked Not Eligible")

        # Verify organizational record is excluded from individual qualification
        cur.execute("""
            SELECT a.full_name, r.eligibility_category 
            FROM sea_records r 
            JOIN sea_agents a ON r.agent_id = a.id 
            WHERE a.full_name LIKE '%Board of Realtors%' OR a.full_name LIKE '%B.E.R.%'
        """)
        org_row = cur.fetchone()
        self.assertIsNotNone(org_row)
        self.assertEqual(org_row[1], 'Not Eligible', "Board record must be marked Not Eligible")

        conn.close()

    def test_04_summary_api_enforces_test_isolation(self):
        """Confirm /api/sea/summary strictly excludes test records by default."""
        req = urllib.request.Request(f"{API_BASE}/api/sea/summary", headers=STAFF_HEADERS)
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))

        self.assertEqual(data['award_year'], 2026)
        self.assertEqual(data['total_agents'], 237, "Operational total must exclude test agents")
        self.assertEqual(data['test_records_count'], 3, "Test records must be separately tracked")
        self.assertEqual(data['categories']['Qualified — Preliminary'], 26)
        self.assertEqual(data['categories']['Potential — High Priority'], 20)
        self.assertEqual(data['categories']['Potential — Watch List'], 190)
        self.assertIn("AND logic", data['policy_notice']['year_2026_logic'])

    # -------------------------------------------------------------
    # 3. Search, Filter, Brokerage Mapping & Staff Management
    # -------------------------------------------------------------
    def test_05_brokerage_mappings_and_search(self):
        """Confirm office codes are mapped to human-readable brokerages and search works."""
        # Check mappings endpoint
        req = urllib.request.Request(f"{API_BASE}/api/sea/brokerage-mappings", headers=STAFF_HEADERS)
        with urllib.request.urlopen(req) as res:
            m_data = json.loads(res.read().decode('utf-8'))
        self.assertGreaterEqual(len(m_data['mappings']), 30, "At least 30 verified mappings")

        # Search for Amber Teeters
        req_search = urllib.request.Request(f"{API_BASE}/api/sea/agents?search=Amber+Teeters", headers=STAFF_HEADERS)
        with urllib.request.urlopen(req_search) as res:
            s_data = json.loads(res.read().decode('utf-8'))
        self.assertEqual(s_data['count'], 1)
        amber = s_data['agents'][0]
        self.assertEqual(amber['full_name'], 'Amber Teeters')
        self.assertEqual(amber['office'], 'BPRI')
        self.assertEqual(amber['office_display_name'], 'Pulte Realty Inc')
        self.assertEqual(amber['is_office_mapped'], 1)

        # Search by License ID (B3572194)
        req_lic = urllib.request.Request(f"{API_BASE}/api/sea/agents?search=B3572194", headers=STAFF_HEADERS)
        with urllib.request.urlopen(req_lic) as res:
            lic_data = json.loads(res.read().decode('utf-8'))
        self.assertEqual(lic_data['count'], 1)
        self.assertEqual(lic_data['agents'][0]['full_name'], 'Amber Teeters')

    def test_06_contact_verification_and_persistence(self):
        """Confirm staff can update contact info, toggle verification, and persist to database."""
        # Use Amber Teeters' real record ID: REC-2026-B3572194
        rec_id = "REC-2026-B3572194"

        # Update contact notes and assigned staff
        update_payload = {
            "assigned_staff": "Erica",
            "internal_notes": "Automated test verification note - verified via phone",
            "contact_verified": 1,
            "primary_phone": "239-555-0199"
        }
        req_update = urllib.request.Request(
            f"{API_BASE}/api/sea/records/{rec_id}/update",
            data=json.dumps(update_payload).encode('utf-8'),
            headers=STAFF_HEADERS,
            method="POST"
        )
        with urllib.request.urlopen(req_update) as res:
            res_data = json.loads(res.read().decode('utf-8'))
        self.assertEqual(res_data['status'], 'success')

        # Fetch detail and verify persistence
        req_detail = urllib.request.Request(f"{API_BASE}/api/sea/agents/{rec_id}", headers=STAFF_HEADERS)
        with urllib.request.urlopen(req_detail) as res:
            detail = json.loads(res.read().decode('utf-8'))

        self.assertEqual(detail['assigned_staff'], "Erica")
        self.assertEqual(detail['internal_notes'], "Automated test verification note - verified via phone")
        self.assertEqual(detail['contact_verified'], 1)
        self.assertEqual(detail['primary_phone'], "239-555-0199")
        self.assertGreaterEqual(len(detail['audit_logs']), 1, "Audit log must record changes")

    def test_07_eligibility_approval_workflow(self):
        """Confirm authorized staff can approve preliminary qualifiers to Verified Eligible with audit trail."""
        rec_id = "REC-2026-B3572194"
        override_payload = {
            "new_category": "Verified Eligible",
            "reason": "Official board committee review and MLS closing side audit completed."
        }
        req_override = urllib.request.Request(
            f"{API_BASE}/api/sea/records/{rec_id}/override",
            data=json.dumps(override_payload).encode('utf-8'),
            headers=STAFF_HEADERS,
            method="POST"
        )
        with urllib.request.urlopen(req_override) as res:
            res_data = json.loads(res.read().decode('utf-8'))

        self.assertEqual(res_data['status'], 'success')
        self.assertEqual(res_data['new_category'], 'Verified Eligible')

        # Confirm persisted in DB
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT eligibility_category, is_override, override_reason FROM sea_records WHERE id = ?", (rec_id,))
        row = cur.fetchone()
        self.assertEqual(row[0], 'Verified Eligible')
        self.assertEqual(row[1], 1)
        self.assertIn("Official board committee review", row[2])

        # Restore back to Qualified — Preliminary for clean state
        cur.execute("UPDATE sea_records SET eligibility_category = 'Qualified — Preliminary', is_override = 0, override_reason = NULL WHERE id = ?", (rec_id,))
        conn.commit()
        conn.close()

    # -------------------------------------------------------------
    # 4. Confirmation Form Management & Safe Preview Mode
    # -------------------------------------------------------------
    def test_08_form_token_generation_and_safe_preview(self):
        """Confirm token generation and safe preview mode preventing false submission."""
        rec_id = "REC-2026-B3572194"

        # Generate token
        req_gen = urllib.request.Request(
            f"{API_BASE}/api/sea/agents/{rec_id}/generate-token",
            data=b"{}",
            headers=STAFF_HEADERS,
            method="POST"
        )
        with urllib.request.urlopen(req_gen) as res:
            gen_data = json.loads(res.read().decode('utf-8'))

        self.assertEqual(gen_data['status'], 'success')
        raw_token = gen_data['token']
        self.assertIn("preview_url", gen_data)

        # Verify token works for context
        req_verify = urllib.request.Request(f"{API_BASE}/api/confirm/verify?token={raw_token}")
        with urllib.request.urlopen(req_verify) as res:
            v_data = json.loads(res.read().decode('utf-8'))
        self.assertEqual(v_data['full_name'], 'Amber Teeters')

        # Test submit in preview mode (must fail with 403 Forbidden)
        preview_submit_payload = {
            "token": raw_token,
            "engraved_name": "Amber Teeters",
            "award_preference": "trophy",
            "attendance_response": "yes",
            "registration_self_reported": True,
            "is_preview": True  # Safe preview flag
        }
        req_submit = urllib.request.Request(
            f"{API_BASE}/api/confirm/submit",
            data=json.dumps(preview_submit_payload).encode('utf-8'),
            headers={"Content-Type": "application/json", "X-Staff-Preview": "1"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req_submit) as res:
                self.fail("Preview submission should have been blocked with 403")
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 403, "Preview submission must return 403 Forbidden")
            err_body = json.loads(e.read().decode('utf-8'))
            self.assertEqual(err_body.get('error_code'), 'STAFF_PREVIEW_MODE')

    # -------------------------------------------------------------
    # 5. Email Safety & Security Controls
    # -------------------------------------------------------------
    def test_09_email_campaigns_strictly_disabled(self):
        """Confirm outbound emails remain disabled and fail closed."""
        email_payload = {
            "recipient_email": "tech@coconutcoastrealtors.org",
            "subject": "Test Outbound Verification"
        }
        req_send = urllib.request.Request(
            f"{API_BASE}/api/sea/email/test-send",
            data=json.dumps(email_payload).encode('utf-8'),
            headers=STAFF_HEADERS,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req_send) as res:
                self.fail("Sending in disabled mode should have failed closed")
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 403)
            err_data = json.loads(e.read().decode('utf-8'))
            self.assertEqual(err_data.get('error_code'), 'EMAIL_MODE_DISABLED')

    def test_10_staff_auth_security_gate(self):
        """Confirm unauthorized requests without valid staff credentials are rejected with 401."""
        req_unauth = urllib.request.Request(f"{API_BASE}/api/sea/summary")  # No headers
        try:
            with urllib.request.urlopen(req_unauth) as res:
                self.fail("Unauthenticated request should have failed")
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 401, "Admin endpoints must require valid credentials")

    def test_11_csv_export_endpoint(self):
        """Confirm CSV export endpoint produces valid CSV with 237 real records."""
        req = urllib.request.Request(f"{API_BASE}/api/sea/agents/export", headers=STAFF_HEADERS)
        with urllib.request.urlopen(req) as res:
            self.assertEqual(res.status, 200)
            self.assertEqual(res.headers.get_content_type(), "text/csv")
            content = res.read().decode('utf-8')

        lines = content.strip().splitlines()
        self.assertEqual(len(lines), 238, "1 header row + 237 real agent records")
        self.assertIn("Amber Teeters", lines[1])
        self.assertNotIn("Jordan Rivera (Test Agent A)", content, "Test agents must never appear in real CSV export")


if __name__ == "__main__":
    unittest.main(verbosity=2)
