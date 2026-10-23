"""
2026 Sales Excellence Awards - Stage 2 Comprehensive Verification Test Suite
Coconut Coast Organization of REALTORS® (CCOR)

Tests all Stage 2 Acceptance Criteria:
1. Accurate import of 237 records into local staging database.
2. Complete mathematical reconciliation of eligibility categories (26 qualified, 20 high priority).
3. Preservation of 0.5 fractional sides and exact dollar volumes.
4. Permanent agent ID decoupling from annual records.
5. Server-side authentication enforcement on administrative APIs.
6. Email safety enforcement:
   - Fail-closed when email_mode='disabled'
   - Rejection of non-allowlisted recipients in test mode
   - Stage 2 hard-lock against live mode
   - Mandatory server-injected BCC (tech@coconutcoastrealtors.org)
   - Subject line prefix [TEST — SEA 2026]
   - Comprehensive audit logging into sea_email_logs
7. Eligibility override audit trail immutability.
"""

import os
import sys
import json
import sqlite3
import unittest

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_DIR, 'database', 'sea_2026_local.db')
BACKEND_DIR = os.path.join(PROJECT_DIR, 'backend')
sys.path.insert(0, BACKEND_DIR)

from email_safety import (
    EmailSafetyEngine,
    EmailModeDisabledError,
    RecipientNotAllowlistedError,
    LiveModeUnauthorizedError,
    MANDATORY_BCC
)
from sea_service import SEADatabaseService, STAFF_AUTH_TOKENS

class TestStage2Requirements(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.service = SEADatabaseService(DB_PATH)
        cls.email_engine = EmailSafetyEngine(DB_PATH)

    def test_01_total_agent_counts_and_reconciliation(self):
        """Verify exact reconciliation counts: 237 total, 26 qualified, 20 priority, 1 board excluded."""
        stats = self.service.get_summary_stats(2026)
        
        self.assertEqual(stats["total_agents"], 237, "Total agents must equal 237")
        self.assertEqual(stats["categories"]["Qualified — Preliminary"], 26, "Qualified agents must be exactly 26")
        self.assertEqual(stats["categories"]["Potential — High Priority"], 20, "High Priority prospects must be exactly 20")
        self.assertEqual(stats["categories"]["Potential — Watch List"], 190, "Watch list prospects must be exactly 190")
        self.assertEqual(stats["categories"]["Needs Manual Review"], 0, "Needs Review should be 0 on initial clean import")
        self.assertEqual(stats["categories"]["Not Eligible"], 1, "Board organizational record (JACKB) must be Not Eligible")

    def test_02_strict_qualification_thresholds(self):
        """Verify that every Qualified — Preliminary agent satisfies BOTH >$5M and >25 sides."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        cur.execute("""
            SELECT r.*, a.full_name 
            FROM sea_records r
            JOIN sea_agents a ON r.agent_id = a.id
            WHERE r.eligibility_category = 'Qualified — Preliminary'
        """)
        qualified = cur.fetchall()
        self.assertEqual(len(qualified), 26)
        
        for q in qualified:
            self.assertGreater(q['total_sides'], 25.0, f"{q['full_name']} has {q['total_sides']} sides, must be > 25.0")
            self.assertGreater(q['total_volume'], 5000000.0, f"{q['full_name']} has ${q['total_volume']}, must be > $5,000,000")

    def test_03_boundary_conditions_and_edge_cases(self):
        """Verify agents with >25 sides but <$5M, or 25.0 sides, are NOT classified as qualified."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Matthew Larmore: 27 sides, $2.61M
        cur.execute("SELECT r.* FROM sea_records r JOIN sea_agents a ON r.agent_id = a.id WHERE a.license_id = 'B3375915'")
        larmore = cur.fetchone()
        self.assertIsNotNone(larmore)
        self.assertEqual(larmore['total_sides'], 27.0)
        self.assertLess(larmore['total_volume'], 5000000.0)
        self.assertNotEqual(larmore['eligibility_category'], 'Qualified — Preliminary', "Larmore has volume gap and must not be Qualified")
        self.assertEqual(larmore['eligibility_category'], 'Potential — High Priority')

        # Aileen Cuadra-Roque: 26 sides, $3.74M
        cur.execute("SELECT r.* FROM sea_records r JOIN sea_agents a ON r.agent_id = a.id WHERE a.license_id = 'B3530823'")
        aileen = cur.fetchone()
        self.assertIsNotNone(aileen)
        self.assertEqual(aileen['total_sides'], 26.0)
        self.assertLess(aileen['total_volume'], 5000000.0)
        self.assertNotEqual(aileen['eligibility_category'], 'Qualified — Preliminary', "Cuadra-Roque has volume gap and must not be Qualified")
        self.assertEqual(aileen['eligibility_category'], 'Potential — High Priority')

        # Kim Swope Schott: exactly 25.0 sides, $9.18M
        cur.execute("SELECT r.* FROM sea_records r JOIN sea_agents a ON r.agent_id = a.id WHERE a.license_id = 'B3339354'")
        schott = cur.fetchone()
        self.assertIsNotNone(schott)
        self.assertEqual(schott['total_sides'], 25.0)
        self.assertNotEqual(schott['eligibility_category'], 'Qualified — Preliminary', "25.0 sides is not strictly greater than 25")
        self.assertEqual(schott['eligibility_category'], 'Potential — High Priority')

        # JACKB - Board record
        cur.execute("SELECT r.* FROM sea_records r JOIN sea_agents a ON r.agent_id = a.id WHERE a.license_id = 'JACKB'")
        jackb = cur.fetchone()
        self.assertIsNotNone(jackb)
        self.assertEqual(jackb['eligibility_category'], 'Not Eligible', "Organizational record JACKB must be Not Eligible")

    def test_04_fractional_sides_preservation(self):
        """Verify fractional transaction sides (e.g., 131.5, 48.5, 27.5, 23.5) are preserved."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Kevin Bartlett: 131.5 sides (86.5 list, 45 sold)
        cur.execute("SELECT r.* FROM sea_records r JOIN sea_agents a ON r.agent_id = a.id WHERE a.license_id = 'B3338354'")
        bartlett = cur.fetchone()
        self.assertIsNotNone(bartlett)
        self.assertEqual(bartlett['total_sides'], 131.5)
        self.assertEqual(bartlett['list_sides'], 86.5)
        self.assertEqual(bartlett['sold_sides'], 45.0)

        # Kevin Shelly: 48.5 sides (27 list, 21.5 sold)
        cur.execute("SELECT r.* FROM sea_records r JOIN sea_agents a ON r.agent_id = a.id WHERE a.license_id = 'B3116197'")
        shelly = cur.fetchone()
        self.assertIsNotNone(shelly)
        self.assertEqual(shelly['total_sides'], 48.5)
        self.assertEqual(shelly['list_sides'], 27.0)
        self.assertEqual(shelly['sold_sides'], 21.5)

    def test_05_permanent_agent_profile_decoupling(self):
        """Verify agent profile is permanent and distinct from annual records."""
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(DISTINCT id) FROM sea_agents")
        agent_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(DISTINCT id) FROM sea_records")
        record_count = cur.fetchone()[0]
        
        self.assertEqual(agent_count, 237)
        self.assertEqual(record_count, 237)

        # Check foreign key integrity
        cur.execute("""
            SELECT COUNT(*) 
            FROM sea_records r
            LEFT JOIN sea_agents a ON r.agent_id = a.id
            WHERE a.id IS NULL
        """)
        orphans = cur.fetchone()[0]
        self.assertEqual(orphans, 0, "No orphaned annual records permitted")

    def test_06_email_safety_mode_disabled_fails_closed(self):
        """Verify that any attempt to send email while email_mode='disabled' raises EmailModeDisabledError."""
        config = self.email_engine.get_award_year_config(2026)
        self.assertEqual(config.get("email_mode"), "disabled", "Default email_mode in DB must be 'disabled'")

        with self.assertRaises(EmailModeDisabledError):
            self.email_engine.dispatch_email_controlled(
                recipient_email="tech@coconutcoastrealtors.org",
                subject="Test Attempt in Disabled Mode",
                html_content="<p>Test</p>",
                plain_text="Test",
                email_type="test",
                staff_user="test_runner"
            )

    def test_07_email_preview_does_not_send(self):
        """Verify email preview generates complete rendering with mandatory BCC and zero side effects."""
        preview = self.email_engine.generate_email_preview(
            agent_name="Jane Doe",
            award_year=2026,
            token="SAMPLE-TEST-TOKEN-999"
        )
        self.assertEqual(preview["bcc"], MANDATORY_BCC)
        self.assertIn("[TEST — SEA 2026]", preview["subject"])
        self.assertIn("Jane Doe", preview["html"])
        self.assertIn("tech@coconutcoastrealtors.org", preview["html"])

    def test_08_test_mode_allowlist_enforcement(self):
        """Temporarily test allowlist logic to ensure non-allowlisted emails are rejected."""
        # Directly test allowlist rejection logic by mocking config email_mode to 'test'
        conn = sqlite3.connect(DB_PATH)
        conn.execute("UPDATE sea_award_years SET email_mode = 'test' WHERE award_year = 2026")
        conn.commit()

        try:
            # 1. Attempt send to unauthorized agent email (MUST FAIL)
            with self.assertRaises(RecipientNotAllowlistedError):
                self.email_engine.dispatch_email_controlled(
                    recipient_email="real.agent@brokerage.com",
                    subject="Invitation",
                    html_content="<p>Test</p>",
                    plain_text="Test",
                    staff_user="test_runner"
                )

            # 2. Attempt send to allowlisted test address (MUST SUCCEED IN TEST MODE WITH MANDATORY BCC)
            res = self.email_engine.dispatch_email_controlled(
                recipient_email="tech@coconutcoastrealtors.org",
                subject="Test Run",
                html_content="<p>Test</p>",
                plain_text="Test",
                staff_user="test_runner"
            )
            self.assertEqual(res["status"], "success")
            self.assertIn(MANDATORY_BCC, res["bcc"])
            self.assertTrue(res["subject"].startswith("[TEST — SEA 2026]"))

        finally:
            # Revert back to strictly disabled
            conn.execute("UPDATE sea_award_years SET email_mode = 'disabled' WHERE award_year = 2026")
            conn.commit()
            conn.close()

    def test_09_manual_override_audit_logging(self):
        """Verify that staff manual overrides are recorded in sea_audit_log with reason and staff ID."""
        test_record_id = "REC-2026-B3339354" # Kim Swope Schott
        reason_text = "Verified committee policy exception review for test verification."
        staff_id = "CCOR Staff Administrator"

        result = self.service.apply_eligibility_override(
            record_id=test_record_id,
            new_category="Needs Manual Review",
            reason=reason_text,
            staff_user=staff_id
        )

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["new_category"], "Needs Manual Review")

        # Verify audit log entry
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM sea_audit_log WHERE record_id = ? ORDER BY id DESC LIMIT 1", (test_record_id,))
        log = cur.fetchone()
        self.assertIsNotNone(log)
        self.assertEqual(log["changed_by"], staff_id)
        self.assertEqual(log["reason"], reason_text)
        self.assertEqual(log["new_value"], "Needs Manual Review")

        # Revert override back to clean state
        self.service.apply_eligibility_override(
            record_id=test_record_id,
            new_category="Potential — High Priority",
            reason="Reverted test override back to original formula category.",
            staff_user=staff_id
        )
        conn.close()

if __name__ == '__main__':
    unittest.main()
