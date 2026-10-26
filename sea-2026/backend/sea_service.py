"""
2026 Sales Excellence Awards - Administrative & Agent Confirmation API Controller
Stage 4 Activated Operational Service
Organization: Coconut Coast Organization of REALTORS® (CCOR)

Key Features:
- Real 2026 Database Activation with 237 reconciled records
- Strict isolation of fictional test records (is_test = 0 vs is_test = 1)
- Office-code-to-human-readable brokerage mapping
- Multi-year award management (2026 active, 2025/2024 historical archives)
- Staff contact verification workflow (inline email/phone confirmation & edit)
- Eligibility approval & manual override with immutable audit logging
- Server-side token generation, revocation & safe preview mode
- Staff-only CSV export & clipboard email export
- Cloudflare Access header support (CF-Access-Authenticated-User-Email)
- Email safety failsafe (disabled mode strictly enforced)
"""

import os
import sys
import json
import csv
import io
import sqlite3
import datetime
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from typing import Dict, Any, List, Optional

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(PROJECT_DIR, 'database', 'sea_2026_local.db')
FRONTEND_DIR = os.path.join(PROJECT_DIR, 'frontend')
ARCHIVE_DIR = os.path.join(PROJECT_DIR, 'archive')

sys.path.insert(0, SCRIPT_DIR)
from email_safety import (
    EmailSafetyEngine,
    EmailModeDisabledError,
    RecipientNotAllowlistedError,
    LiveModeUnauthorizedError,
    MANDATORY_BCC
)
from confirmation_service import (
    AgentConfirmationService,
    ConfirmationError,
    InvalidTokenError,
    ExpiredTokenError,
    RevokedTokenError,
    ValidationError,
    RegistrationLinkNotClickedError,
    RegistrationCheckboxUncheckedError
)

# Staff Admin Authentication Tokens & Cloudflare Access Zero-Trust Domains
STAFF_AUTH_TOKENS = {
    "ccor-staff-admin-secure-token-2026": "CCOR Staff Administrator",
    "kevin-staff-token-sea2026": "Kevin (Lead Administrator)"
}
ALLOWED_CF_ACCESS_DOMAINS = ["@coconutcoastrealtors.org", "@bonitaspringsrealtors.com"]


class SEADatabaseService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.email_engine = EmailSafetyEngine(db_path)
        self.confirm_service = AgentConfirmationService(db_path)

    def get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def get_summary_stats(self, award_year: int = 2026, include_test: bool = False) -> Dict[str, Any]:
        """Fetch dashboard KPI counters, eligibility breakdown, and form metrics."""
        with self.get_conn() as conn:
            cur = conn.cursor()
            test_filter = "" if include_test else " AND r.is_test = 0"

            # Category counts
            cur.execute(f"""
                SELECT r.eligibility_category, COUNT(*) as count
                FROM sea_records r
                WHERE r.award_year = ? {test_filter}
                GROUP BY r.eligibility_category;
            """, (award_year,))
            cats = {row['eligibility_category']: row['count'] for row in cur.fetchall()}

            # Total records
            cur.execute(f"SELECT COUNT(*) as total FROM sea_records r WHERE r.award_year = ? {test_filter}", (award_year,))
            total_records = cur.fetchone()['total']

            # Test agent count
            cur.execute("SELECT COUNT(*) as count FROM sea_records r WHERE r.award_year = ? AND r.is_test = 1", (award_year,))
            test_records_count = cur.fetchone()['count']

            # Config
            cur.execute("""
                SELECT award_year, event_name, event_date, event_time, registration_url,
                       min_volume_threshold, min_sides_threshold, email_mode, mandatory_bcc_email, is_active
                FROM sea_award_years
                WHERE award_year = ?;
            """, (award_year,))
            config_row = cur.fetchone()
            config = dict(config_row) if config_row else {}

            # Registration fact counters
            cur.execute(f"""
                SELECT 
                    SUM(r.registration_link_clicked) as link_clicked,
                    SUM(r.registration_self_reported) as self_reported,
                    SUM(r.registration_independently_verified) as independently_verified
                FROM sea_records r
                WHERE r.award_year = ? {test_filter};
            """, (award_year,))
            reg_stats = dict(cur.fetchone() or {})

            # Overridden count
            cur.execute(f"SELECT COUNT(*) as count FROM sea_records r WHERE r.award_year = ? AND r.is_override = 1 {test_filter}", (award_year,))
            override_count = cur.fetchone()['count']

            # Form Tracking Metrics
            cur.execute(f"""
                SELECT 
                    COUNT(DISTINCT t.record_id) as tokens_generated,
                    SUM(CASE WHEN t.form_started = 1 THEN 1 ELSE 0 END) as forms_started,
                    SUM(CASE WHEN t.is_submitted = 1 THEN 1 ELSE 0 END) as forms_completed,
                    SUM(CASE WHEN t.revoked_at IS NOT NULL THEN 1 ELSE 0 END) as links_revoked
                FROM sea_tokens t
                JOIN sea_records r ON t.record_id = r.id
                WHERE r.award_year = ? {test_filter};
            """, (award_year,))
            form_metrics = dict(cur.fetchone() or {})

            # Award Choices & Attendance
            cur.execute(f"""
                SELECT 
                    SUM(CASE WHEN r.award_preference = 'trophy' THEN 1 ELSE 0 END) as trophies_selected,
                    SUM(CASE WHEN r.award_preference = 'certificate' THEN 1 ELSE 0 END) as certificates_selected,
                    SUM(CASE WHEN r.attendance_response = 'yes' THEN 1 ELSE 0 END) as attending_yes,
                    SUM(CASE WHEN r.attendance_response = 'no' THEN 1 ELSE 0 END) as attending_no,
                    SUM(CASE WHEN r.attendance_response = 'undecided' THEN 1 ELSE 0 END) as attending_undecided
                FROM sea_records r
                WHERE r.award_year = ? {test_filter};
            """, (award_year,))
            choice_metrics = dict(cur.fetchone() or {})

            # Contact Verification Counts
            cur.execute(f"""
                SELECT 
                    SUM(CASE WHEN r.contact_verified = 1 THEN 1 ELSE 0 END) as verified_contacts,
                    SUM(CASE WHEN r.contact_verified = 0 OR r.contact_verified IS NULL THEN 1 ELSE 0 END) as unverified_contacts,
                    SUM(CASE WHEN a.primary_email IS NULL OR TRIM(a.primary_email) = '' THEN 1 ELSE 0 END) as missing_emails,
                    SUM(CASE WHEN a.primary_email IS NOT NULL AND TRIM(a.primary_email) != '' AND r.contact_verified = 1 THEN 1 ELSE 0 END) as verified_emails
                FROM sea_records r
                JOIN sea_agents a ON r.agent_id = a.id
                WHERE r.award_year = ? {test_filter};
            """, (award_year,))
            contact_counts = dict(cur.fetchone() or {})

            # Awaiting confirmation count (Preliminary or Verified without selection)
            cur.execute(f"""
                SELECT COUNT(*) as count
                FROM sea_records r
                WHERE r.award_year = ? 
                  AND r.eligibility_category IN ('Qualified — Preliminary', 'Verified Eligible')
                  AND (r.award_preference IS NULL OR r.award_preference = '')
                  {test_filter};
            """, (award_year,))
            awaiting_confirm = cur.fetchone()['count']

            return {
                "award_year": award_year,
                "total_agents": total_records,
                "test_records_count": test_records_count,
                "is_test_included": include_test,
                "categories": {
                    "Qualified — Preliminary": cats.get("Qualified — Preliminary", 0),
                    "Verified Eligible": cats.get("Verified Eligible", 0),
                    "Potential — High Priority": cats.get("Potential — High Priority", 0),
                    "Potential — Watch List": cats.get("Potential — Watch List", 0),
                    "Needs Manual Review": cats.get("Needs Manual Review", 0),
                    "Not Eligible": cats.get("Not Eligible", 0)
                },
                "contact_metrics": {
                    "verified_contacts": contact_counts.get("verified_contacts") or 0,
                    "unverified_contacts": contact_counts.get("unverified_contacts") or 0,
                    "missing_emails": contact_counts.get("missing_emails") or 0,
                    "verified_emails": contact_counts.get("verified_emails") or 0
                },
                "registration_facts": {
                    "link_clicked": reg_stats.get("link_clicked") or 0,
                    "self_reported": reg_stats.get("self_reported") or 0,
                    "independently_verified": reg_stats.get("independently_verified") or 0
                },
                "form_metrics": {
                    "tokens_generated": form_metrics.get("tokens_generated") or 0,
                    "forms_started": form_metrics.get("forms_started") or 0,
                    "forms_completed": form_metrics.get("forms_completed") or 0,
                    "links_revoked": form_metrics.get("links_revoked") or 0,
                    "trophies_selected": choice_metrics.get("trophies_selected") or 0,
                    "certificates_selected": choice_metrics.get("certificates_selected") or 0,
                    "attending_yes": choice_metrics.get("attending_yes") or 0,
                    "attending_no": choice_metrics.get("attending_no") or 0,
                    "attending_undecided": choice_metrics.get("attending_undecided") or 0,
                    "awaiting_confirmation": awaiting_confirm
                },
                "override_count": override_count,
                "config": config,
                "policy_notice": {
                    "year_2025_logic": "OR logic (Volume threshold OR Transaction Sides threshold)",
                    "year_2026_logic": "AND logic (> $5,000,000 volume AND > 25 transaction sides)",
                    "note": "2026 preliminary working requirements use strict AND logic. Official final winners require explicit staff verification and approval."
                },
                "email_system_status": "CAMPAIGNS DISABLED — NO AGENT EMAILS WILL BE SENT"
            }

    def list_agents(
        self,
        award_year: int = 2026,
        category: Optional[str] = None,
        search_query: Optional[str] = None,
        office_filter: Optional[str] = None,
        form_status_filter: Optional[str] = None,
        verification_filter: Optional[str] = None,
        staff_filter: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_dir: str = "desc",
        include_test: bool = False
    ) -> List[Dict[str, Any]]:
        """Query agent records with brokerage mapping, verification filtering, and sorting."""
        with self.get_conn() as conn:
            cur = conn.cursor()
            query = """
                SELECT 
                    r.id as record_id,
                    r.award_year,
                    r.office,
                    COALESCE(m.brokerage_name, r.office) as office_display_name,
                    CASE WHEN m.brokerage_name IS NOT NULL THEN 1 ELSE 0 END as is_office_mapped,
                    r.total_sides,
                    r.list_sides,
                    r.sold_sides,
                    r.total_volume,
                    r.list_volume,
                    r.sold_volume,
                    r.sides_rank,
                    r.volume_rank,
                    r.projected_2026_sides,
                    r.projected_2026_volume,
                    r.sides_needed,
                    r.volume_needed,
                    r.year_end_pace,
                    r.in_report,
                    r.workbook_category,
                    r.eligibility_category,
                    r.is_override,
                    r.override_reason,
                    r.override_by,
                    r.override_at,
                    r.award_preference,
                    r.engraved_name,
                    r.attendance_response,
                    r.registration_link_clicked,
                    r.registration_link_clicked_at,
                    r.registration_self_reported,
                    r.registration_self_reported_at,
                    r.registration_independently_verified,
                    r.contact_verified,
                    r.contact_verified_by,
                    r.contact_verified_at,
                    r.assigned_staff,
                    r.outreach_status,
                    r.internal_notes,
                    r.is_test,
                    a.id as agent_id,
                    a.license_id,
                    a.first_name,
                    a.last_name,
                    a.full_name,
                    a.primary_email,
                    a.primary_phone,
                    t.token as active_token,
                    t.token_hash,
                    t.form_started,
                    t.is_submitted as form_submitted,
                    t.submitted_at as form_submitted_at,
                    t.revoked_at as token_revoked_at
                FROM sea_records r
                JOIN sea_agents a ON r.agent_id = a.id
                LEFT JOIN sea_office_mappings m ON r.office = m.office_code
                LEFT JOIN sea_tokens t ON r.id = t.record_id AND t.revoked_at IS NULL
                WHERE r.award_year = ?
            """
            params: List[Any] = [award_year]

            if not include_test:
                query += " AND r.is_test = 0"

            if category and category != "all":
                query += " AND r.eligibility_category = ?"
                params.append(category)

            if office_filter and office_filter != "all":
                query += " AND r.office = ?"
                params.append(office_filter)

            if verification_filter and verification_filter != "all":
                if verification_filter == "verified":
                    query += " AND r.contact_verified = 1"
                elif verification_filter == "unverified":
                    query += " AND (r.contact_verified = 0 OR r.contact_verified IS NULL)"
                elif verification_filter == "missing_email":
                    query += " AND (a.primary_email IS NULL OR TRIM(a.primary_email) = '')"
                elif verification_filter == "has_email":
                    query += " AND (a.primary_email IS NOT NULL AND TRIM(a.primary_email) != '')"

            if staff_filter and staff_filter != "all":
                query += " AND r.assigned_staff = ?"
                params.append(staff_filter)

            if search_query:
                term = f"%{search_query.strip()}%"
                query += " AND (a.full_name LIKE ? OR a.license_id LIKE ? OR r.office LIKE ? OR COALESCE(m.brokerage_name, '') LIKE ? OR a.primary_email LIKE ?)"
                params.extend([term, term, term, term, term])

            if form_status_filter and form_status_filter != "all":
                if form_status_filter == "completed":
                    query += " AND t.is_submitted = 1"
                elif form_status_filter == "started":
                    query += " AND t.form_started = 1 AND (t.is_submitted = 0 OR t.is_submitted IS NULL)"
                elif form_status_filter == "clicked":
                    query += " AND r.registration_link_clicked = 1"
                elif form_status_filter == "uninvited":
                    query += " AND t.token IS NULL"

            # Sorting logic
            sort_direction = "ASC" if sort_dir.lower() == "asc" else "DESC"
            if sort_by == "volume":
                query += f" ORDER BY r.total_volume {sort_direction}"
            elif sort_by == "sides":
                query += f" ORDER BY r.total_sides {sort_direction}"
            elif sort_by == "name":
                query += f" ORDER BY a.last_name {sort_direction}, a.first_name {sort_direction}"
            elif sort_by == "brokerage":
                query += f" ORDER BY office_display_name {sort_direction}"
            elif sort_by == "eligibility":
                query += f" ORDER BY r.eligibility_category {sort_direction}"
            elif sort_by == "verification":
                query += f" ORDER BY r.contact_verified {sort_direction}"
            else:
                # Default primary ordering: Qualified first, then High Priority, then Total Sides descending
                query += """
                    ORDER BY 
                        CASE r.eligibility_category
                            WHEN 'Verified Eligible' THEN 1
                            WHEN 'Qualified — Preliminary' THEN 2
                            WHEN 'Potential — High Priority' THEN 3
                            WHEN 'Potential — Watch List' THEN 4
                            WHEN 'Needs Manual Review' THEN 5
                            ELSE 6
                        END,
                        r.total_sides DESC,
                        r.total_volume DESC
                """

            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]

    def get_agent_detail(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Fetch complete agent record, office mapping, confirmation response, revisions, and audit log."""
        with self.get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    r.*,
                    COALESCE(m.brokerage_name, r.office) as office_display_name,
                    CASE WHEN m.brokerage_name IS NOT NULL THEN 1 ELSE 0 END as is_office_mapped,
                    a.id as agent_id,
                    a.license_id,
                    a.first_name,
                    a.last_name,
                    a.full_name,
                    a.primary_email,
                    a.primary_phone,
                    a.primary_office,
                    a.is_test as agent_is_test,
                    t.token as active_token,
                    t.expires_at as token_expires_at,
                    t.revoked_at as token_revoked_at,
                    t.form_started,
                    t.is_submitted,
                    t.submitted_at
                FROM sea_records r
                JOIN sea_agents a ON r.agent_id = a.id
                LEFT JOIN sea_office_mappings m ON r.office = m.office_code
                LEFT JOIN sea_tokens t ON r.id = t.record_id AND t.revoked_at IS NULL
                WHERE r.id = ?;
            """, (record_id,))
            row = cur.fetchone()
            if not row:
                return None
            detail = dict(row)

            # Completed form response
            cur.execute("SELECT * FROM sea_form_responses WHERE record_id = ?", (record_id,))
            resp = cur.fetchone()
            detail['form_response'] = dict(resp) if resp else None

            # Form revisions
            if detail['form_response']:
                cur.execute("SELECT * FROM sea_form_revisions WHERE response_id = ? ORDER BY id DESC", (detail['form_response']['id'],))
                detail['form_revisions'] = [dict(rev) for rev in cur.fetchall()]
            else:
                detail['form_revisions'] = []

            # Registration click events
            cur.execute("SELECT * FROM sea_registration_events WHERE record_id = ? ORDER BY id DESC", (record_id,))
            detail['registration_events'] = [dict(ev) for ev in cur.fetchall()]

            # Contact corrections submitted by agent
            cur.execute("SELECT * FROM sea_contact_corrections WHERE record_id = ? ORDER BY id DESC", (record_id,))
            detail['contact_corrections'] = [dict(cc) for cc in cur.fetchall()]

            # Audit logs
            cur.execute("""
                SELECT field_name, old_value, new_value, changed_by, reason, created_at
                FROM sea_audit_log
                WHERE record_id = ?
                ORDER BY id DESC;
            """, (record_id,))
            detail['audit_logs'] = [dict(log) for log in cur.fetchall()]

            # Email history
            cur.execute("""
                SELECT recipient_email, bcc_email, subject, email_type, email_mode,
                       delivery_status, error_message, triggered_by, created_at
                FROM sea_email_logs
                WHERE record_id = ?
                ORDER BY id DESC;
            """, (record_id,))
            detail['email_logs'] = [dict(el) for el in cur.fetchall()]

            return detail

    def update_agent_record(
        self,
        record_id: str,
        updates: Dict[str, Any],
        staff_user: str = "staff"
    ) -> Dict[str, Any]:
        """Update staff notes, assignments, contact information, and verification status with full audit logging."""
        with self.get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT r.*, a.id as agent_id, a.full_name, a.primary_email, a.primary_phone, a.license_id
                FROM sea_records r
                JOIN sea_agents a ON r.agent_id = a.id
                WHERE r.id = ?
            """, (record_id,))
            r = cur.fetchone()
            if not r:
                raise ValueError(f"Record {record_id} not found.")

            agent_id = r['agent_id']
            now_iso = datetime.datetime.now().isoformat()
            logged_changes = []

            # 1. Update contact fields in sea_agents
            agent_fields = ["primary_email", "primary_phone", "full_name", "license_id"]
            for field in agent_fields:
                if field in updates and updates[field] is not None:
                    new_val = str(updates[field]).strip()
                    old_val = r[field] or ""
                    if new_val != old_val:
                        cur.execute(f"UPDATE sea_agents SET {field} = ?, updated_at = datetime('now') WHERE id = ?", (new_val, agent_id))
                        cur.execute("""
                            INSERT INTO sea_audit_log (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
                            VALUES (?, ?, ?, ?, ?, 'Contact Information Update', datetime('now'));
                        """, (record_id, field, old_val, new_val, staff_user))
                        logged_changes.append(field)

            # 2. Update record fields in sea_records
            record_field_map = {
                "internal_notes": "internal_notes",
                "assigned_staff": "assigned_staff",
                "outreach_status": "outreach_status",
                "office": "office",
                "award_preference": "award_preference",
                "engraved_name": "engraved_name",
                "attendance_response": "attendance_response"
            }
            for key, col in record_field_map.items():
                if key in updates and updates[key] is not None:
                    new_val = str(updates[key]).strip()
                    old_val = str(r[col] or "")
                    if new_val != old_val:
                        cur.execute(f"UPDATE sea_records SET {col} = ?, updated_at = datetime('now') WHERE id = ?", (new_val, record_id))
                        cur.execute("""
                            INSERT INTO sea_audit_log (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
                            VALUES (?, ?, ?, ?, ?, 'Staff Operational Update', datetime('now'));
                        """, (record_id, col, old_val, new_val, staff_user))
                        logged_changes.append(col)

            # 3. Contact verification toggle
            if "contact_verified" in updates:
                new_ver = 1 if updates["contact_verified"] else 0
                old_ver = r["contact_verified"] or 0
                if new_ver != old_ver:
                    cur.execute("""
                        UPDATE sea_records SET
                            contact_verified = ?,
                            contact_verified_by = ?,
                            contact_verified_at = datetime('now'),
                            updated_at = datetime('now')
                        WHERE id = ?;
                    """, (new_ver, staff_user if new_ver else None, record_id))
                    cur.execute("""
                        INSERT INTO sea_audit_log (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
                        VALUES (?, 'contact_verified', ?, ?, ?, 'Contact Verification State Change', datetime('now'));
                    """, (record_id, str(old_ver), str(new_ver), staff_user))
                    logged_changes.append("contact_verified")

            # 4. Independent registration verification toggle
            if "registration_independently_verified" in updates:
                new_reg = 1 if updates["registration_independently_verified"] else 0
                old_reg = r["registration_independently_verified"] or 0
                if new_reg != old_reg:
                    cur.execute("""
                        UPDATE sea_records SET
                            registration_independently_verified = ?,
                            registration_independently_verified_by = ?,
                            registration_independently_verified_at = datetime('now'),
                            updated_at = datetime('now')
                        WHERE id = ?;
                    """, (new_reg, staff_user if new_reg else None, record_id))
                    cur.execute("""
                        INSERT INTO sea_audit_log (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
                        VALUES (?, 'registration_independently_verified', ?, ?, ?, 'Event Registration Audit Verification', datetime('now'));
                    """, (record_id, str(old_reg), str(new_reg), staff_user))
                    logged_changes.append("registration_independently_verified")

            conn.commit()

        return {
            "status": "success",
            "record_id": record_id,
            "updated_by": staff_user,
            "changed_fields": logged_changes,
            "timestamp": now_iso
        }

    def apply_eligibility_override(
        self,
        record_id: str,
        new_category: str,
        reason: str,
        staff_user: str
    ) -> Dict[str, Any]:
        """Manually approve or override agent eligibility with mandatory recorded audit log."""
        if not reason or not reason.strip():
            raise ValueError("Reason is mandatory for eligibility overrides and approvals.")

        valid_cats = {
            "Qualified — Preliminary",
            "Verified Eligible",
            "Potential — High Priority",
            "Potential — Watch List",
            "Needs Manual Review",
            "Not Eligible"
        }
        if new_category not in valid_cats:
            raise ValueError(f"Invalid eligibility category: {new_category}")

        with self.get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT eligibility_category, is_test FROM sea_records WHERE id = ?", (record_id,))
            existing = cur.fetchone()
            if not existing:
                raise ValueError(f"Record {record_id} not found.")

            old_category = existing['eligibility_category']
            now_iso = datetime.datetime.now().isoformat()

            cur.execute("""
                UPDATE sea_records SET
                    eligibility_category = ?,
                    is_override = 1,
                    override_reason = ?,
                    override_by = ?,
                    override_at = ?,
                    updated_at = datetime('now')
                WHERE id = ?;
            """, (new_category, reason.strip(), staff_user, now_iso, record_id))

            cur.execute("""
                INSERT INTO sea_audit_log (
                    record_id, field_name, old_value, new_value, changed_by, reason, created_at
                ) VALUES (?, 'eligibility_category', ?, ?, ?, ?, datetime('now'));
            """, (record_id, old_category, new_category, staff_user, reason.strip()))

            conn.commit()

        return {
            "status": "success",
            "record_id": record_id,
            "old_category": old_category,
            "new_category": new_category,
            "changed_by": staff_user,
            "timestamp": now_iso
        }

    def get_award_years(self) -> List[Dict[str, Any]]:
        """Fetch all configured award years."""
        with self.get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM sea_award_years ORDER BY award_year DESC")
            return [dict(row) for row in cur.fetchall()]

    def get_brokerage_mappings(self) -> List[Dict[str, Any]]:
        """Fetch all office code to brokerage mappings."""
        with self.get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM sea_office_mappings ORDER BY office_code ASC")
            return [dict(row) for row in cur.fetchall()]

    def update_brokerage_mapping(self, office_code: str, brokerage_name: str, staff_user: str) -> Dict[str, Any]:
        """Add or update an office code mapping."""
        with self.get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO sea_office_mappings (office_code, brokerage_name, is_verified, updated_by, updated_at)
                VALUES (?, ?, 1, ?, datetime('now'))
                ON CONFLICT(office_code) DO UPDATE SET
                    brokerage_name = excluded.brokerage_name,
                    updated_by = excluded.updated_by,
                    updated_at = datetime('now');
            """, (office_code.upper().strip(), brokerage_name.strip(), staff_user))
            conn.commit()
        return {"status": "success", "office_code": office_code, "brokerage_name": brokerage_name}

    def export_agents_csv(
        self,
        award_year: int = 2026,
        category: Optional[str] = None,
        verification_filter: Optional[str] = None
    ) -> str:
        """Generate staff CSV export strictly for real agents (is_test = 0)."""
        agents = self.list_agents(
            award_year=award_year,
            category=category,
            verification_filter=verification_filter,
            include_test=False
        )

        output = io.StringIO()
        fieldnames = [
            "AgentName", "LicenseID", "OfficeCode", "BrokerageName", "QualificationStatus",
            "TotalVolume", "TotalSides", "ListSides", "SoldSides", "Email",
            "ContactVerified", "VerifiedBy", "Phone", "AssignedStaff",
            "AwardPreference", "AttendanceResponse", "RegistrationIndependentlyVerified", "InternalNotes"
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for a in agents:
            writer.writerow({
                "AgentName": a.get("full_name") or "",
                "LicenseID": a.get("license_id") or "",
                "OfficeCode": a.get("office") or "",
                "BrokerageName": a.get("office_display_name") or "",
                "QualificationStatus": a.get("eligibility_category") or "",
                "TotalVolume": f"${int(a.get('total_volume', 0)):,}",
                "TotalSides": a.get("total_sides") or 0.0,
                "ListSides": a.get("list_sides") or 0.0,
                "SoldSides": a.get("sold_sides") or 0.0,
                "Email": a.get("primary_email") or "",
                "ContactVerified": "YES" if a.get("contact_verified") else "NO",
                "VerifiedBy": a.get("contact_verified_by") or "",
                "Phone": a.get("primary_phone") or "",
                "AssignedStaff": a.get("assigned_staff") or "",
                "AwardPreference": (a.get("award_preference") or "").capitalize(),
                "AttendanceResponse": (a.get("attendance_response") or "").capitalize(),
                "RegistrationIndependentlyVerified": "YES" if a.get("registration_independently_verified") else "NO",
                "InternalNotes": a.get("internal_notes") or ""
            })

        return output.getvalue()


class SEARequestHandler(BaseHTTPRequestHandler):
    db_service = SEADatabaseService()
    confirm_service = db_service.confirm_service

    def _send_json(self, status_code: int, data: Any):
        payload = json.dumps(data, default=str)
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.end_headers()
        self.wfile.write(payload.encode('utf-8'))

    def _send_error(self, status_code: int, message: str):
        self._send_json(status_code, {"error": message, "status": "error"})

    def _serve_file(self, file_path: str, content_type: str):
        if not os.path.exists(file_path):
            self._send_error(404, f"File not found: {os.path.basename(file_path)}")
            return
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        with open(file_path, 'rb') as f:
            self.wfile.write(f.read())

    def _authenticate_staff(self) -> Optional[str]:
        """Authenticate staff requests via Bearer token, custom header, or Cloudflare Access."""
        # 1. Cloudflare Access Zero-Trust Header
        cf_email = self.headers.get('CF-Access-Authenticated-User-Email')
        if cf_email:
            for domain in ALLOWED_CF_ACCESS_DOMAINS:
                if cf_email.lower().endswith(domain):
                    return f"CF-Access ({cf_email})"

        # 2. X-CCOR-Staff-Token custom header
        token = self.headers.get('X-CCOR-Staff-Token')
        if not token:
            auth_header = self.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header[7:].strip()

        if token and token in STAFF_AUTH_TOKENS:
            return STAFF_AUTH_TOKENS[token]
        return None

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CCOR-Staff-Token, X-Staff-Preview')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        # 1. Frontend Pages
        if path == "/confirm" or path == "/confirm.html":
            self._serve_file(os.path.join(FRONTEND_DIR, "confirm.html"), "text/html; charset=utf-8")
            return

        elif path == "/" or path == "/index.html":
            self._serve_file(os.path.join(FRONTEND_DIR, "index.html"), "text/html; charset=utf-8")
            return

        elif path == "/public_2026.html" or path == "/2026-sales-excellence-awards":
            self._serve_file(os.path.join(FRONTEND_DIR, "public_2026.html"), "text/html; charset=utf-8")
            return

        elif path.startswith("/archive/2025") or path == "/2025-archive":
            self._serve_file(os.path.join(ARCHIVE_DIR, "2025_public", "index.html"), "text/html; charset=utf-8")
            return

        elif path.startswith("/assets/") or path.endswith(".css") or path.endswith(".js"):
            filename = os.path.basename(path)
            full_path = os.path.join(FRONTEND_DIR, filename)
            ct = "text/css" if path.endswith(".css") else "application/javascript"
            self._serve_file(full_path, ct)
            return

        # 2. Public / Agent Confirmation Token Verification
        elif path == "/api/confirm/verify":
            token = params.get('token', [None])[0]
            if not token:
                self._send_error(400, "Confirmation token is required.")
                return
            try:
                context = self.confirm_service.verify_token(token)
                self._send_json(200, context)
            except InvalidTokenError as e:
                self._send_error(403, str(e))
            except RevokedTokenError as e:
                self._send_error(403, str(e))
            except ExpiredTokenError as e:
                self._send_error(403, str(e))
            except Exception as e:
                self._send_error(500, f"Error verifying token: {e}")
            return

        elif path == "/api/confirm/register-redirect":
            token = params.get('token', [None])[0]
            is_preview = params.get('preview', ['false'])[0].lower() == 'true'
            if not token:
                self._send_error(400, "Token required for redirect.")
                return
            try:
                ip = self.client_address[0] if self.client_address else None
                ua = self.headers.get('User-Agent', '')
                if is_preview:
                    context = self.confirm_service.verify_token(token)
                    target_url = context["registration_url"]
                else:
                    res = self.confirm_service.record_registration_click(token, ip_address=ip, user_agent=ua)
                    target_url = res["target_url"]

                self.send_response(302)
                self.send_header('Location', target_url)
                self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
                self.end_headers()
            except Exception as e:
                self._send_error(400, f"Cannot process registration redirect: {e}")
            return

        # 3. Staff Admin Authentication Gate
        staff_user = self._authenticate_staff()
        if not staff_user:
            self._send_error(401, "Unauthorized: Valid CCOR staff authentication credentials required.")
            return

        # 4. Staff Management Endpoints
        if path == "/api/sea/summary":
            year = int(params.get('year', [2026])[0])
            include_test = params.get('include_test', ['false'])[0].lower() == 'true'
            stats = self.db_service.get_summary_stats(year, include_test=include_test)
            self._send_json(200, stats)

        elif path == "/api/sea/award-years":
            years = self.db_service.get_award_years()
            self._send_json(200, {"award_years": years})

        elif path == "/api/sea/brokerage-mappings":
            mappings = self.db_service.get_brokerage_mappings()
            self._send_json(200, {"mappings": mappings})

        elif path == "/api/sea/agents":
            year = int(params.get('year', [2026])[0])
            category = params.get('category', [None])[0]
            search = params.get('search', [None])[0]
            office = params.get('office', [None])[0]
            form_status = params.get('form_status', [None])[0]
            verification = params.get('verification', [None])[0]
            staff_filter = params.get('staff', [None])[0]
            sort_by = params.get('sort_by', [None])[0]
            sort_dir = params.get('sort_dir', ['desc'])[0]
            include_test = params.get('include_test', ['false'])[0].lower() == 'true'

            agents = self.db_service.list_agents(
                award_year=year,
                category=category,
                search_query=search,
                office_filter=office,
                form_status_filter=form_status,
                verification_filter=verification,
                staff_filter=staff_filter,
                sort_by=sort_by,
                sort_dir=sort_dir,
                include_test=include_test
            )
            self._send_json(200, {"count": len(agents), "agents": agents})

        elif path == "/api/sea/agents/export":
            year = int(params.get('year', [2026])[0])
            category = params.get('category', [None])[0]
            verification = params.get('verification', [None])[0]
            csv_content = self.db_service.export_agents_csv(year, category, verification)

            self.send_response(200)
            self.send_header('Content-Type', 'text/csv; charset=utf-8')
            self.send_header('Content-Disposition', f'attachment; filename="CCOR_SEA_{year}_Staff_Roster.csv"')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(csv_content.encode('utf-8'))

        elif path.startswith("/api/sea/agents/"):
            rec_id = path.replace("/api/sea/agents/", "").strip()
            detail = self.db_service.get_agent_detail(rec_id)
            if not detail:
                self._send_error(404, f"Agent record {rec_id} not found.")
            else:
                self._send_json(200, detail)

        elif path.startswith("/api/sea/email/preview/"):
            rec_id = path.replace("/api/sea/email/preview/", "").strip()
            detail = self.db_service.get_agent_detail(rec_id)
            agent_name = detail.get('full_name', 'Fictional Agent') if detail else "Jordan Rivera"
            preview = self.db_service.email_engine.generate_email_preview(agent_name=agent_name, award_year=2026)
            self._send_json(200, preview)

        else:
            self._send_error(404, f"Endpoint {path} not found.")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            payload = json.loads(body) if body else {}
        except Exception as e:
            self._send_error(400, f"Malformed JSON request: {e}")
            return

        ip = self.client_address[0] if self.client_address else None
        ua = self.headers.get('User-Agent', '')

        # ------------------------------------------------------------------
        # Agent Confirmation Endpoints (Secured by Agent Token)
        # ------------------------------------------------------------------
        if path == "/api/confirm/track-click":
            token = payload.get("token")
            is_preview = payload.get("is_preview", False)
            if not token:
                self._send_error(400, "Agent token is required.")
                return
            if is_preview:
                self._send_json(200, {"status": "preview_acknowledged", "note": "Click tracking bypassed in staff preview mode."})
                return
            try:
                result = self.confirm_service.record_registration_click(token, ip_address=ip, user_agent=ua)
                self._send_json(200, result)
            except Exception as e:
                self._send_error(400, str(e))
            return

        elif path == "/api/confirm/save-draft":
            token = payload.get("token")
            is_preview = payload.get("is_preview", False)
            if not token:
                self._send_error(400, "Agent token is required.")
                return
            if is_preview:
                self._send_json(200, {"status": "preview_acknowledged", "note": "Draft saving bypassed in staff preview mode."})
                return
            try:
                result = self.confirm_service.save_draft(token, payload)
                self._send_json(200, result)
            except Exception as e:
                self._send_error(400, str(e))
            return

        elif path == "/api/confirm/submit":
            token = payload.get("token")
            is_preview = payload.get("is_preview", False) or (self.headers.get('X-Staff-Preview') == '1')
            if not token:
                self._send_error(400, "Agent confirmation token is required.")
                return
            if is_preview:
                self._send_json(403, {
                    "status": "blocked",
                    "error_code": "STAFF_PREVIEW_MODE",
                    "error": "Staff Preview Mode: Submissions and registration claims are disabled to protect data integrity."
                })
                return
            try:
                result = self.confirm_service.submit_confirmation(token, payload, ip_address=ip, user_agent=ua)
                self._send_json(200, result)
            except RegistrationLinkNotClickedError as e:
                self._send_json(422, {
                    "status": "blocked",
                    "error_code": "REGISTRATION_LINK_NOT_CLICKED",
                    "error": str(e)
                })
            except RegistrationCheckboxUncheckedError as e:
                self._send_json(422, {
                    "status": "blocked",
                    "error_code": "REGISTRATION_AFFIRMATION_REQUIRED",
                    "error": str(e)
                })
            except ValidationError as e:
                self._send_json(400, {
                    "status": "error",
                    "error_code": "VALIDATION_ERROR",
                    "error": str(e)
                })
            except Exception as e:
                self._send_error(400, str(e))
            return

        # ------------------------------------------------------------------
        # Staff Admin Endpoints (Secured by Staff Authentication)
        # ------------------------------------------------------------------
        staff_user = self._authenticate_staff()
        if not staff_user:
            self._send_error(401, "Unauthorized: Staff credentials required.")
            return

        # Form Token Generation / Revocation
        if path.startswith("/api/sea/agents/") and path.endswith("/generate-token"):
            rec_id = path.split("/")[4]
            try:
                raw_token, token_hash = self.confirm_service.generate_token(rec_id)
                self._send_json(200, {
                    "status": "success",
                    "record_id": rec_id,
                    "token": raw_token,
                    "url": f"/confirm.html?token={raw_token}",
                    "preview_url": f"/confirm.html?token={raw_token}&preview=true"
                })
            except Exception as e:
                self._send_error(400, str(e))

        elif path.startswith("/api/sea/agents/") and path.endswith("/revoke-token"):
            rec_id = path.split("/")[4]
            try:
                self.confirm_service.revoke_token(rec_id)
                self._send_json(200, {"status": "success", "record_id": rec_id, "revoked": True})
            except Exception as e:
                self._send_error(400, str(e))

        # Eligibility Override / Approval Endpoint
        elif path.startswith("/api/sea/records/") and path.endswith("/override"):
            rec_id = path.split("/")[4]
            new_cat = payload.get("new_category")
            reason = payload.get("reason")
            try:
                result = self.db_service.apply_eligibility_override(
                    record_id=rec_id,
                    new_category=new_cat,
                    reason=reason,
                    staff_user=staff_user
                )
                self._send_json(200, result)
            except Exception as e:
                self._send_error(400, str(e))

        # Agent Update Endpoint (Contact verification, assigned staff, notes, email)
        elif path.startswith("/api/sea/records/") and path.endswith("/update"):
            rec_id = path.split("/")[4]
            try:
                result = self.db_service.update_agent_record(
                    record_id=rec_id,
                    updates=payload,
                    staff_user=staff_user
                )
                self._send_json(200, result)
            except Exception as e:
                self._send_error(400, str(e))

        # Brokerage Mapping Update
        elif path == "/api/sea/brokerage-mappings":
            code = payload.get("office_code", "")
            name = payload.get("brokerage_name", "")
            if not code or not name:
                self._send_error(400, "office_code and brokerage_name are required.")
                return
            result = self.db_service.update_brokerage_mapping(code, name, staff_user)
            self._send_json(200, result)

        # Controlled Test Email Send (Always fails closed if mode is disabled!)
        elif path == "/api/sea/email/test-send":
            recipient = payload.get("recipient_email", "").strip()
            subject = payload.get("subject", "Official SEA Test")
            html_body = payload.get("html_body", "<p>Test message</p>")
            plain_text = payload.get("plain_text", "Test message")
            rec_id = payload.get("record_id")

            try:
                res = self.db_service.email_engine.dispatch_email_controlled(
                    recipient_email=recipient,
                    subject=subject,
                    html_content=html_body,
                    plain_text=plain_text,
                    email_type="test",
                    record_id=rec_id,
                    staff_user=staff_user,
                    force_test_mode_only=True
                )
                self._send_json(200, res)
            except EmailModeDisabledError as e:
                self._send_json(403, {
                    "status": "blocked",
                    "error_code": "EMAIL_MODE_DISABLED",
                    "message": str(e),
                    "note": "Email sending is globally disabled. System is in read-only and preview mode."
                })
            except RecipientNotAllowlistedError as e:
                self._send_json(403, {
                    "status": "blocked",
                    "error_code": "RECIPIENT_NOT_ALLOWLISTED",
                    "message": str(e),
                    "note": "Only approved staff test email addresses can be targeted in test mode."
                })
            except LiveModeUnauthorizedError as e:
                self._send_json(403, {
                    "status": "blocked",
                    "error_code": "LIVE_MODE_FORBIDDEN",
                    "message": str(e)
                })
            except Exception as e:
                self._send_error(500, f"Dispatch failed: {e}")

        else:
            self._send_error(404, f"Endpoint {path} not found.")


def run_server(port: int = 8787):
    server = HTTPServer(('127.0.0.1', port), SEARequestHandler)
    print(f"================================================================")
    print(f"2026 Sales Excellence Awards - Activated Management API Service")
    print(f"CCOR Isolated Staging Environment running on http://127.0.0.1:{port}")
    print(f"Award Year Default: 2026 (Ceremony: 2027 Sales Excellence Awards)")
    print(f"Database: {DB_PATH}")
    print(f"Email Mode: DISABLED (Mandatory BCC: {MANDATORY_BCC})")
    print(f"Historical Archives: 2025 (/archive/2025) & 2024")
    print(f"================================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down SEA service.")
        server.server_close()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
    run_server(port)
