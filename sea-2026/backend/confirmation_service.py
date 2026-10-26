"""
2026 Sales Excellence Awards - Agent Confirmation & Event Registration Service
Coconut Coast Organization of REALTORS® (CCOR)

Core Features:
- Cryptographic SHA-256 Token Verification & Revocation
- Strict Server-Enforced Registration Link Click Requirement
- Conditional Registration Affirmation Checkbox Logic
- Draft Persistence Across Page Navigations
- Idempotent Form Submission & Audit Trail
- Separate Contact Correction Queue (No silent overwriting of MLS records)
- Fictional Test Agent Seeding for Scenarios A, B, and C
"""

import os
import sys
import json
import sqlite3
import secrets
import hashlib
import datetime
from typing import Dict, Any, List, Optional, Tuple

class ConfirmationError(Exception):
    """Base exception for confirmation errors."""
    pass

class InvalidTokenError(ConfirmationError):
    """Raised when token does not exist or token hash fails to match."""
    pass

class ExpiredTokenError(ConfirmationError):
    """Raised when token has exceeded its expiration date."""
    pass

class RevokedTokenError(ConfirmationError):
    """Raised when token has been revoked by administrative staff."""
    pass

class ValidationError(ConfirmationError):
    """Raised when submitted form violates validation invariants."""
    pass

class RegistrationLinkNotClickedError(ValidationError):
    """Raised when an agent attempts to submit without opening the official registration link."""
    pass

class RegistrationCheckboxUncheckedError(ValidationError):
    """Raised when an attending agent fails to affirmatively confirm event registration."""
    pass


class AgentConfirmationService:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    @staticmethod
    def hash_token(raw_token: str) -> str:
        """Compute SHA-256 hash of raw token for safe database indexing and lookup."""
        return hashlib.sha256(raw_token.strip().encode('utf-8')).hexdigest()

    def generate_token(self, record_id: str, days_valid: int = 60) -> Tuple[str, str]:
        """
        Generate a cryptographically secure, unpredictable 256-bit token.
        Stores token_hash in sea_tokens.
        Returns: (raw_token, token_hash)
        """
        raw_token = secrets.token_urlsafe(32)
        token_hash = self.hash_token(raw_token)
        expires_at = (datetime.datetime.now() + datetime.timedelta(days=days_valid)).isoformat()

        with self.get_conn() as conn:
            cur = conn.cursor()
            # Revoke any prior active tokens for this record
            cur.execute("""
                UPDATE sea_tokens 
                SET revoked_at = datetime('now') 
                WHERE record_id = ? AND revoked_at IS NULL;
            """, (record_id,))

            # Insert new token record
            cur.execute("""
                INSERT INTO sea_tokens (
                    token, token_hash, record_id, expires_at, revoked_at, is_submitted, form_version, created_at
                ) VALUES (?, ?, ?, ?, NULL, 0, 'v1', datetime('now'));
            """, (raw_token, token_hash, record_id, expires_at))
            conn.commit()

        return raw_token, token_hash

    def revoke_token(self, record_id: str) -> bool:
        """Revoke active tokens for an agent record."""
        with self.get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                UPDATE sea_tokens 
                SET revoked_at = datetime('now')
                WHERE record_id = ? AND revoked_at IS NULL;
            """, (record_id,))
            conn.commit()
            return cur.rowcount > 0

    def verify_token(self, raw_token: str) -> Dict[str, Any]:
        """
        Validate incoming raw confirmation token against SHA-256 hash or raw token.
        Enforces expiration, revocation, and returns authorized agent context.
        Updates last_accessed_at and marks form_started.
        """
        if not raw_token or not raw_token.strip():
            raise InvalidTokenError("Confirmation token is required.")

        clean_token = raw_token.strip()
        token_hash = self.hash_token(clean_token)

        with self.get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    t.token, t.token_hash, t.record_id, t.expires_at, t.revoked_at, 
                    t.is_submitted, t.submitted_at, t.form_started,
                    r.agent_id, r.award_year, r.office, r.total_sides, r.total_volume,
                    r.eligibility_category, r.award_preference, r.engraved_name,
                    r.attendance_response, r.registration_link_clicked,
                    r.registration_link_clicked_at, r.registration_self_reported,
                    r.registration_independently_verified,
                    a.license_id, a.first_name, a.last_name, a.full_name,
                    a.primary_email, a.primary_phone,
                    y.event_name, y.event_date, y.event_time, y.registration_url
                FROM sea_tokens t
                JOIN sea_records r ON t.record_id = r.id
                JOIN sea_agents a ON r.agent_id = a.id
                JOIN sea_award_years y ON r.award_year = y.award_year
                WHERE t.token_hash = ? OR t.token = ?;
            """, (token_hash, clean_token))
            
            row = cur.fetchone()
            if not row:
                raise InvalidTokenError("Invalid or unrecognized confirmation link.")

            data = dict(row)

            # Check revocation
            if data["revoked_at"]:
                raise RevokedTokenError(f"This confirmation link was revoked by staff on {data['revoked_at']}.")

            # Check expiration
            if data["expires_at"]:
                try:
                    exp_dt = datetime.datetime.fromisoformat(data["expires_at"])
                    if datetime.datetime.now() > exp_dt:
                        raise ExpiredTokenError("This confirmation link has expired. Please contact CCOR staff for assistance.")
                except ValueError:
                    pass

            # Update access telemetry and mark form started
            cur.execute("""
                UPDATE sea_tokens SET
                    last_accessed_at = datetime('now'),
                    form_started = 1,
                    form_started_at = COALESCE(form_started_at, datetime('now'))
                WHERE token_hash = ? OR token = ?;
            """, (token_hash, clean_token))

            # Fetch draft data if present
            cur.execute("SELECT * FROM sea_form_drafts WHERE record_id = ?", (data["record_id"],))
            draft_row = cur.fetchone()
            data["draft"] = dict(draft_row) if draft_row else None

            # Fetch existing submitted response if present
            cur.execute("SELECT * FROM sea_form_responses WHERE record_id = ?", (data["record_id"],))
            resp_row = cur.fetchone()
            data["existing_response"] = dict(resp_row) if resp_row else None

            conn.commit()
            return data

    def record_registration_click(
        self,
        raw_token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Server-side click recording for the official GrowthZone event registration link.
        - Validates the agent's token
        - Inserts an immutable event into sea_registration_events
        - Updates sea_records.registration_link_clicked = 1
        - Returns the official GrowthZone registration URL from configuration
        """
        agent_context = self.verify_token(raw_token)
        record_id = agent_context["record_id"]
        agent_id = agent_context["agent_id"]
        award_year = agent_context["award_year"]
        event_name = agent_context["event_name"]
        target_url = agent_context["registration_url"]
        now_iso = datetime.datetime.now().isoformat()

        with self.get_conn() as conn:
            cur = conn.cursor()
            
            # 1. Log event
            cur.execute("""
                INSERT INTO sea_registration_events (
                    record_id, agent_id, award_year, event_name, target_url,
                    clicked_at, ip_address, user_agent
                ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?);
            """, (record_id, agent_id, award_year, event_name, target_url, ip_address, user_agent))

            # 2. Update sea_records Fact A
            cur.execute("""
                UPDATE sea_records SET
                    registration_link_clicked = 1,
                    registration_link_clicked_at = COALESCE(registration_link_clicked_at, datetime('now')),
                    updated_at = datetime('now')
                WHERE id = ?;
            """, (record_id,))

            conn.commit()

        return {
            "status": "success",
            "record_id": record_id,
            "registration_link_clicked": 1,
            "clicked_at": now_iso,
            "target_url": target_url,
            "message": "Registration link opened."
        }

    def save_draft(self, raw_token: str, draft_data: Dict[str, Any]) -> Dict[str, Any]:
        """Persist partial form draft to allow agents to resume across page navigation."""
        agent_context = self.verify_token(raw_token)
        record_id = agent_context["record_id"]

        award_pref = draft_data.get("award_preference")
        engraved_name = draft_data.get("engraved_name")
        attendance = draft_data.get("attendance_response")
        self_reported = 1 if draft_data.get("registration_self_reported") else 0

        with self.get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO sea_form_drafts (
                    record_id, draft_award_preference, draft_engraved_name,
                    draft_attendance_response, draft_self_reported, updated_at
                ) VALUES (?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(record_id) DO UPDATE SET
                    draft_award_preference = excluded.draft_award_preference,
                    draft_engraved_name = excluded.draft_engraved_name,
                    draft_attendance_response = excluded.draft_attendance_response,
                    draft_self_reported = excluded.draft_self_reported,
                    updated_at = datetime('now');
            """, (record_id, award_pref, engraved_name, attendance, self_reported))
            conn.commit()

        return {"status": "saved", "record_id": record_id}

    def submit_confirmation(
        self,
        raw_token: str,
        payload: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Authoritative, server-enforced confirmation submission.
        Strictly enforces all Stage 3 validation invariants:
        1. Valid, non-expired, non-revoked token
        2. Required award preference: strictly 'certificate' or 'trophy'
        3. Required engraved display name
        4. Required attendance response: strictly 'yes', 'no', or 'undecided'
        5. CRITICAL INVARIANT: Registration link MUST be clicked (Fact A)
        6. ATTENDANCE INVARIANT: If Yes, registration checkbox MUST be checked (Fact B)
        7. If No or Undecided, self-reported registration is forced to 0
        """
        agent_context = self.verify_token(raw_token)
        record_id = agent_context["record_id"]
        agent_id = agent_context["agent_id"]
        award_year = agent_context["award_year"]

        # 1. Award Display Name Validation
        engraved_name = (payload.get("engraved_name") or "").strip()
        if not engraved_name:
            raise ValidationError("Name to appear on the award is required.")

        # 2. Award Selection Validation (Strictly certificate or trophy)
        award_preference = (payload.get("award_preference") or "").strip().lower()
        if award_preference not in ("certificate", "trophy"):
            raise ValidationError("Please select your preferred award: Certificate or Trophy.")

        # 3. Attendance Selection Validation
        attendance = (payload.get("attendance_response") or "").strip().lower()
        if attendance not in ("yes", "no", "undecided"):
            raise ValidationError("Please indicate whether you will be attending the ceremony: Yes, No, or Undecided.")

        # 4. CRITICAL INVARIANT: Server-side check that registration link was clicked
        with self.get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT registration_link_clicked, registration_link_clicked_at FROM sea_records WHERE id = ?", (record_id,))
            rec_row = cur.fetchone()
            link_clicked = rec_row["registration_link_clicked"] if rec_row else 0
            click_timestamp = rec_row["registration_link_clicked_at"] if rec_row else None

        if not link_clicked:
            raise RegistrationLinkNotClickedError(
                "You must open the official event registration link at least once before completing your award confirmation."
            )

        # 5. ATTENDANCE INVARIANT: Checkbox enforcement for attending agents
        self_reported = 0
        if attendance == "yes":
            raw_checkbox = payload.get("registration_self_reported")
            if not raw_checkbox or raw_checkbox not in (True, 1, "1", "true", "True"):
                raise RegistrationCheckboxUncheckedError(
                    "Attending agents must affirmatively confirm that they have completed event registration."
                )
            self_reported = 1
        else:
            # If No or Undecided, do not allow false claims of completed registration
            self_reported = 0

        now_iso = datetime.datetime.now().isoformat()
        response_id = f"RESP-{award_year}-{agent_context['license_id']}"

        # 6. Contact corrections queue (Preserve authoritative MLS records, queue corrections for review)
        corrections = payload.get("corrections", {})
        req_name = corrections.get("preferred_name")
        req_email = corrections.get("corrected_email")
        req_phone = corrections.get("corrected_phone")
        req_office = corrections.get("corrected_brokerage")

        with self.get_conn() as conn:
            cur = conn.cursor()

            # Insert or Update sea_form_responses (Idempotent)
            cur.execute("""
                INSERT INTO sea_form_responses (
                    id, record_id, agent_id, award_year, award_preference,
                    engraved_name, attendance_response, registration_self_reported,
                    registration_link_clicked, registration_link_clicked_at,
                    submitted_at, ip_address, user_agent, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1)
                ON CONFLICT(record_id) DO UPDATE SET
                    award_preference = excluded.award_preference,
                    engraved_name = excluded.engraved_name,
                    attendance_response = excluded.attendance_response,
                    registration_self_reported = excluded.registration_self_reported,
                    submitted_at = excluded.submitted_at,
                    ip_address = excluded.ip_address,
                    user_agent = excluded.user_agent,
                    is_active = 1;
            """, (
                response_id, record_id, agent_id, award_year, award_preference,
                engraved_name, attendance, self_reported, click_timestamp or now_iso,
                now_iso, ip_address, user_agent
            ))

            # Update sea_records
            cur.execute("""
                UPDATE sea_records SET
                    award_preference = ?,
                    engraved_name = ?,
                    attendance_response = ?,
                    registration_self_reported = ?,
                    registration_self_reported_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END,
                    updated_at = datetime('now')
                WHERE id = ?;
            """, (award_preference, engraved_name, attendance, self_reported, self_reported, record_id))

            # Mark sea_tokens as submitted
            clean_token = raw_token.strip()
            token_hash = self.hash_token(clean_token)
            cur.execute("""
                UPDATE sea_tokens SET
                    is_submitted = 1,
                    submitted_at = datetime('now')
                WHERE token_hash = ? OR token = ?;
            """, (token_hash, clean_token))

            # Record audit log
            cur.execute("""
                INSERT INTO sea_audit_log (
                    record_id, field_name, old_value, new_value, changed_by, reason, created_at
                ) VALUES (?, 'form_submission', 'unsubmitted', ?, 'agent', 'Agent completed personalized confirmation form', datetime('now'));
            """, (record_id, f"Preference: {award_preference}, Attendance: {attendance}"))

            # Record contact corrections if provided
            if any([req_name, req_email, req_phone, req_office]):
                cur.execute("""
                    INSERT INTO sea_contact_corrections (
                        record_id, agent_id, requested_name, requested_email,
                        requested_phone, requested_office, review_status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'));
                """, (record_id, agent_id, req_name, req_email, req_phone, req_office))

            # Remove temporary draft on final submission
            cur.execute("DELETE FROM sea_form_drafts WHERE record_id = ?", (record_id,))

            conn.commit()

        # Build response message
        msg = "Thank you! Your Sales Excellence Awards information has been received."
        if attendance == "yes":
            extra_msg = "Your event registration has been self-confirmed. CCOR will verify event registration separately."
        elif attendance == "undecided":
            extra_msg = "We have recorded your attendance as undecided. Staff will follow up closer to the event."
        else:
            extra_msg = "We have recorded that you will not be attending. Your award preference has been securely saved."

        return {
            "status": "success",
            "message": msg,
            "attendance_note": extra_msg,
            "award_preference": award_preference,
            "engraved_name": engraved_name,
            "attendance_response": attendance,
            "registration_self_reported": self_reported,
            "submitted_at": now_iso
        }

    def seed_fictional_test_agents(self) -> List[Dict[str, Any]]:
        """
        Seed 3 isolated fictional test agents with pre-generated secure tokens
        specifically for demonstrating Scenarios A, B, and C.
        """
        fictional_roster = [
            {
                "id": "SEA-AGT-TEST-A",
                "license_id": "TEST-LIC-001",
                "name": "Jordan Rivera (Test Agent A)",
                "office": "Seaside Premier Realty (Test)",
                "email": "jordan.test@coconutcoastrealtors.org",
                "record_id": "REC-2026-TEST-A",
                "scenario": "Scenario A: Trophy + Attending + Clicked + Checkbox Checked",
                "fixed_token": "TEST-TOKEN-SCENARIO-A-TROPHY-ATTENDING"
            },
            {
                "id": "SEA-AGT-TEST-B",
                "license_id": "TEST-LIC-002",
                "name": "Taylor Morgan (Test Agent B)",
                "office": "Gulf Coast Horizon Realty (Test)",
                "email": "taylor.test@coconutcoastrealtors.org",
                "record_id": "REC-2026-TEST-B",
                "scenario": "Scenario B: Certificate + Not Attending + Clicked",
                "fixed_token": "TEST-TOKEN-SCENARIO-B-CERT-DECLINED"
            },
            {
                "id": "SEA-AGT-TEST-C",
                "license_id": "TEST-LIC-003",
                "name": "Alex Bennett (Test Agent C)",
                "office": "Sunshine State Properties (Test)",
                "email": "alex.test@coconutcoastrealtors.org",
                "record_id": "REC-2026-TEST-C",
                "scenario": "Scenario C: Blocked Submission (Unclicked / Unconfirmed)",
                "fixed_token": "TEST-TOKEN-SCENARIO-C-BLOCKED-VALIDATION"
            }
        ]

        seeded_tokens = []
        with self.get_conn() as conn:
            cur = conn.cursor()
            for item in fictional_roster:
                # 1. Upsert Agent
                parts = item["name"].split()
                cur.execute("""
                    INSERT INTO sea_agents (
                        id, license_id, first_name, last_name, full_name, primary_email, primary_office, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                    ON CONFLICT(id) DO UPDATE SET
                        license_id = excluded.license_id,
                        full_name = excluded.full_name,
                        primary_email = excluded.primary_email,
                        primary_office = excluded.primary_office;
                """, (item["id"], item["license_id"], parts[0], " ".join(parts[1:]), item["name"], item["email"], item["office"]))

                # 2. Upsert Record
                cur.execute("""
                    INSERT INTO sea_records (
                        id, agent_id, award_year, office, total_sides, total_volume,
                        eligibility_category, engraved_name, outreach_status, internal_notes
                    ) VALUES (?, ?, 2026, ?, 35.0, 12500000.0, 'Verified Eligible', ?, 'Test Record', ?)
                    ON CONFLICT(id) DO UPDATE SET
                        office = excluded.office,
                        eligibility_category = 'Verified Eligible',
                        internal_notes = excluded.internal_notes;
                """, (item["record_id"], item["id"], item["office"], item["name"], f"Fictional agent for {item['scenario']}"))

                # 3. Create Token
                raw_token = item["fixed_token"]
                token_hash = self.hash_token(raw_token)
                cur.execute("""
                    INSERT INTO sea_tokens (
                        token, token_hash, record_id, expires_at, revoked_at, is_submitted, form_version, created_at
                    ) VALUES (?, ?, ?, datetime('now', '+90 days'), NULL, 0, 'v1', datetime('now'))
                    ON CONFLICT(token) DO UPDATE SET
                        token_hash = excluded.token_hash,
                        revoked_at = NULL,
                        is_submitted = 0,
                        submitted_at = NULL;
                """, (raw_token, token_hash, item["record_id"]))

                seeded_tokens.append({
                    "name": item["name"],
                    "license_id": item["license_id"],
                    "record_id": item["record_id"],
                    "token": raw_token,
                    "url": f"/confirm.html?token={raw_token}",
                    "scenario": item["scenario"]
                })

            conn.commit()

        return seeded_tokens
