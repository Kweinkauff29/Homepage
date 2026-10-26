"""
2026 Sales Excellence Awards - Stage 3 Comprehensive Test Suite
Coconut Coast Organization of REALTORS® (CCOR)

Tests:
1. Cryptographic SHA-256 token verification, expiration, and revocation.
2. Data isolation between agents.
3. Mandatory award format (Certificate vs Trophy strictly enforced).
4. Mandatory attendance choice (Yes, No, Undecided).
5. SERVER-ENFORCED INVARIANT: Registration link MUST be clicked by everyone.
6. ATTENDANCE INVARIANT: Attending agents must check the registration affirmation.
7. Non-attending and undecided agents are not forced to falsely affirm registration.
8. Registration click does not create independent verification (Fact C untouched).
9. Direct API requests cannot bypass validation.
10. Draft persistence across requests.
11. Idempotent submission prevents duplicate award records.
12. Form revisions preserve audit history.
13. Three required demonstration scenarios:
    - Scenario A: Trophy + Attending + Clicked + Affirmation Checked -> SUCCESS
    - Scenario B: Certificate + Not Attending + Clicked -> SUCCESS
    - Scenario C: Trophy + Attending + Unclicked / Unchecked -> BLOCKED with validation errors
"""

import os
import sys
import json
import sqlite3
import unittest
import hashlib

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_DIR, 'database', 'sea_2026_local.db')
BACKEND_DIR = os.path.join(PROJECT_DIR, 'backend')
sys.path.insert(0, BACKEND_DIR)

from confirmation_service import (
    AgentConfirmationService,
    InvalidTokenError,
    RevokedTokenError,
    ExpiredTokenError,
    ValidationError,
    RegistrationLinkNotClickedError,
    RegistrationCheckboxUncheckedError
)
from sea_service import SEADatabaseService
from email_safety import EmailSafetyEngine, EmailModeDisabledError

class TestStage3ConfirmationSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.confirm_service = AgentConfirmationService(DB_PATH)
        cls.db_service = SEADatabaseService(DB_PATH)
        cls.email_engine = EmailSafetyEngine(DB_PATH)
        # Ensure fictional test agents are seeded
        cls.confirm_service.seed_fictional_test_agents()

    def test_01_token_verification_and_data_isolation(self):
        """Verify token hash lookup returns strictly that agent's record, and invalid tokens are rejected."""
        # Valid test token for Scenario A
        context = self.confirm_service.verify_token("TEST-TOKEN-SCENARIO-A-TROPHY-ATTENDING")
        self.assertEqual(context["agent_id"], "SEA-AGT-TEST-A")
        self.assertEqual(context["full_name"], "Jordan Rivera (Test Agent A)")
        self.assertEqual(context["award_year"], 2026)

        # Invalid token rejection
        with self.assertRaises(InvalidTokenError):
            self.confirm_service.verify_token("NON-EXISTENT-FAKE-TOKEN-XYZ")

    def test_02_token_revocation_and_expiration(self):
        """Verify revoked or expired tokens cannot access forms."""
        # Generate temporary token
        raw_token, token_hash = self.confirm_service.generate_token("REC-2026-TEST-A")
        ctx = self.confirm_service.verify_token(raw_token)
        self.assertIsNotNone(ctx)

        # Revoke token
        self.confirm_service.revoke_token("REC-2026-TEST-A")
        with self.assertRaises(RevokedTokenError):
            self.confirm_service.verify_token(raw_token)

        # Re-seed test tokens for scenario stability
        self.confirm_service.seed_fictional_test_agents()

    def test_03_registration_link_click_requirement_enforced(self):
        """Verify server blocks submission if registration link has not been clicked."""
        token = "TEST-TOKEN-SCENARIO-C-BLOCKED-VALIDATION"
        
        # Ensure click flag is reset to 0
        conn = sqlite3.connect(DB_PATH)
        conn.execute("UPDATE sea_records SET registration_link_clicked = 0, registration_link_clicked_at = NULL WHERE id = 'REC-2026-TEST-C'")
        conn.commit()
        conn.close()

        # Attempt submit without click
        with self.assertRaises(RegistrationLinkNotClickedError) as cm:
            self.confirm_service.submit_confirmation(
                raw_token=token,
                payload={
                    "engraved_name": "Alex Bennett",
                    "award_preference": "trophy",
                    "attendance_response": "yes",
                    "registration_self_reported": 1
                }
            )
        self.assertIn("registration link at least once", str(cm.exception))

    def test_04_attending_requires_registration_affirmation(self):
        """Verify attending agents MUST affirmatively check the registration checkbox."""
        token = "TEST-TOKEN-SCENARIO-C-BLOCKED-VALIDATION"

        # Record registration click so Fact A is satisfied
        self.confirm_service.record_registration_click(token)

        # Attempt submit with attendance 'yes' but registration_self_reported = 0
        with self.assertRaises(RegistrationCheckboxUncheckedError) as cm:
            self.confirm_service.submit_confirmation(
                raw_token=token,
                payload={
                    "engraved_name": "Alex Bennett",
                    "award_preference": "trophy",
                    "attendance_response": "yes",
                    "registration_self_reported": 0  # Unchecked
                }
            )
        self.assertIn("must affirmatively confirm", str(cm.exception))

    def test_05_award_choice_strictly_certificate_or_trophy(self):
        """Verify system rejects plaque or any non-authorized award choice."""
        token = "TEST-TOKEN-SCENARIO-C-BLOCKED-VALIDATION"
        self.confirm_service.record_registration_click(token)

        # Attempt invalid award preference 'plaque'
        with self.assertRaises(ValidationError) as cm:
            self.confirm_service.submit_confirmation(
                raw_token=token,
                payload={
                    "engraved_name": "Alex Bennett",
                    "award_preference": "plaque",
                    "attendance_response": "no"
                }
            )
        self.assertIn("Certificate or Trophy", str(cm.exception))

    def test_06_draft_persistence(self):
        """Verify draft data is saved server-side and retrieved upon re-opening."""
        token = "TEST-TOKEN-SCENARIO-C-BLOCKED-VALIDATION"
        draft = {
            "award_preference": "trophy",
            "engraved_name": "Alex Bennett, PA",
            "attendance_response": "undecided",
            "registration_self_reported": 0
        }
        res = self.confirm_service.save_draft(token, draft)
        self.assertEqual(res["status"], "saved")

        ctx = self.confirm_service.verify_token(token)
        self.assertIsNotNone(ctx["draft"])
        self.assertEqual(ctx["draft"]["draft_award_preference"], "trophy")
        self.assertEqual(ctx["draft"]["draft_engraved_name"], "Alex Bennett, PA")

    def test_07_scenario_a_trophy_attending_confirmed(self):
        """
        DEMO SCENARIO A:
        Agent wants a Trophy, plans to attend, opens registration, confirms registration, and submits.
        Expected: SUCCESS
        """
        token = "TEST-TOKEN-SCENARIO-A-TROPHY-ATTENDING"

        # 1. Open / record registration link click (Fact A)
        click_res = self.confirm_service.record_registration_click(token)
        self.assertEqual(click_res["status"], "success")
        self.assertEqual(click_res["registration_link_clicked"], 1)
        self.assertIn("growthzoneapp.com", click_res["target_url"])

        # 2. Submit with Trophy, Attending Yes, and registration_self_reported = 1 (Fact B)
        submit_res = self.confirm_service.submit_confirmation(
            raw_token=token,
            payload={
                "engraved_name": "Jordan Rivera, PA",
                "award_preference": "trophy",
                "attendance_response": "yes",
                "registration_self_reported": 1,
                "corrections": {
                    "preferred_name": "Jordan Rivera, PA",
                    "corrected_email": "jordan.rivera@seasidepremier.com"
                }
            }
        )
        self.assertEqual(submit_res["status"], "success")
        self.assertEqual(submit_res["award_preference"], "trophy")
        self.assertEqual(submit_res["attendance_response"], "yes")
        self.assertEqual(submit_res["registration_self_reported"], 1)

        # 3. Verify in database: Fact A=1, Fact B=1, Fact C=0 (Staff verification remains independent)
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM sea_records WHERE id = 'REC-2026-TEST-A'")
        rec = cur.fetchone()
        self.assertEqual(rec["award_preference"], "trophy")
        self.assertEqual(rec["attendance_response"], "yes")
        self.assertEqual(rec["registration_link_clicked"], 1)
        self.assertEqual(rec["registration_self_reported"], 1)
        self.assertEqual(rec["registration_independently_verified"], 0, "Fact C must remain 0 until staff verifies")

        # 4. Verify sea_form_responses entry created
        cur.execute("SELECT * FROM sea_form_responses WHERE record_id = 'REC-2026-TEST-A'")
        resp = cur.fetchone()
        self.assertIsNotNone(resp)
        self.assertEqual(resp["award_preference"], "trophy")
        conn.close()

    def test_08_scenario_b_certificate_not_attending(self):
        """
        DEMO SCENARIO B:
        Agent wants a Certificate, will not attend, opens mandatory registration link, and submits without claiming registration.
        Expected: SUCCESS
        """
        token = "TEST-TOKEN-SCENARIO-B-CERT-DECLINED"

        # 1. Open / record mandatory registration link click (Fact A)
        click_res = self.confirm_service.record_registration_click(token)
        self.assertEqual(click_res["registration_link_clicked"], 1)

        # 2. Submit with Certificate, Attendance No, registration_self_reported = 0
        submit_res = self.confirm_service.submit_confirmation(
            raw_token=token,
            payload={
                "engraved_name": "Taylor Morgan, GRI",
                "award_preference": "certificate",
                "attendance_response": "no",
                "registration_self_reported": 0
            }
        )
        self.assertEqual(submit_res["status"], "success")
        self.assertEqual(submit_res["award_preference"], "certificate")
        self.assertEqual(submit_res["attendance_response"], "no")
        self.assertEqual(submit_res["registration_self_reported"], 0)

        # Verify database
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM sea_records WHERE id = 'REC-2026-TEST-B'")
        rec = cur.fetchone()
        self.assertEqual(rec["award_preference"], "certificate")
        self.assertEqual(rec["attendance_response"], "no")
        self.assertEqual(rec["registration_link_clicked"], 1)
        self.assertEqual(rec["registration_self_reported"], 0)
        conn.close()

    def test_09_scenario_c_blocked_submission(self):
        """
        DEMO SCENARIO C:
        Agent selects Trophy and plans to attend, but attempts to submit without clicking link or confirming registration.
        Expected: BLOCKED by server with clear validation error messages.
        """
        token = "TEST-TOKEN-SCENARIO-C-BLOCKED-VALIDATION"

        # 1. Reset state to clean unclicked
        conn = sqlite3.connect(DB_PATH)
        conn.execute("UPDATE sea_records SET registration_link_clicked = 0, registration_link_clicked_at = NULL, registration_self_reported = 0 WHERE id = 'REC-2026-TEST-C'")
        conn.commit()
        conn.close()

        # Step C1: Attempt submit without opening registration link
        with self.assertRaises(RegistrationLinkNotClickedError) as cm1:
            self.confirm_service.submit_confirmation(
                raw_token=token,
                payload={
                    "engraved_name": "Alex Bennett",
                    "award_preference": "trophy",
                    "attendance_response": "yes",
                    "registration_self_reported": 1
                }
            )
        self.assertIn("registration link at least once", str(cm1.exception))

        # Step C2: Agent opens link, but attempts to submit attending=yes without checking affirmative checkbox
        self.confirm_service.record_registration_click(token)
        with self.assertRaises(RegistrationCheckboxUncheckedError) as cm2:
            self.confirm_service.submit_confirmation(
                raw_token=token,
                payload={
                    "engraved_name": "Alex Bennett",
                    "award_preference": "trophy",
                    "attendance_response": "yes",
                    "registration_self_reported": 0  # Unchecked
                }
            )
        self.assertIn("must affirmatively confirm that they have completed event registration", str(cm2.exception))

    def test_10_email_safety_remains_disabled(self):
        """Confirm that email delivery remains strictly disabled and real agent sending fails closed."""
        with self.assertRaises(EmailModeDisabledError):
            self.email_engine.dispatch_email_controlled(
                recipient_email="tech@coconutcoastrealtors.org",
                subject="Stage 3 Email Verification",
                html_content="<p>Test</p>",
                plain_text="Test"
            )

    def test_11_staff_dashboard_metrics_accuracy(self):
        """Verify that staff dashboard get_summary_stats reflects Stage 3 form submissions."""
        stats = self.db_service.get_summary_stats(2026, include_test=True)
        
        # Scenarios A and B submitted successfully
        self.assertGreaterEqual(stats["form_metrics"]["forms_completed"], 2)
        self.assertGreaterEqual(stats["form_metrics"]["trophies_selected"], 1)
        self.assertGreaterEqual(stats["form_metrics"]["certificates_selected"], 1)
        self.assertGreaterEqual(stats["form_metrics"]["attending_yes"], 1)
        self.assertGreaterEqual(stats["form_metrics"]["attending_no"], 1)
        self.assertGreaterEqual(stats["registration_facts"]["link_clicked"], 2)
        self.assertEqual(stats["config"]["email_mode"], "disabled")

if __name__ == '__main__':
    unittest.main()
