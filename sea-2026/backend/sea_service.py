"""
2026 Sales Excellence Awards - Administrative API Service & Backend Controller
Coconut Coast Organization of REALTORS® (CCOR)

Features:
- Bearer/Token Server-Side Authentication
- Zero exposure of unauthenticated write endpoints
- Multi-year database queries
- Manual eligibility override with immutable audit logging
- Controlled test email gateway with server-enforced safety
- JSON REST API for Staff Dashboard
"""

import os
import sys
import json
import sqlite3
import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from typing import Dict, Any, List, Optional

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(PROJECT_DIR, 'database', 'sea_2026_local.db')
FRONTEND_DIR = os.path.join(PROJECT_DIR, 'frontend')

sys.path.insert(0, SCRIPT_DIR)
from email_safety import (
    EmailSafetyEngine,
    EmailModeDisabledError,
    RecipientNotAllowlistedError,
    LiveModeUnauthorizedError,
    MANDATORY_BCC
)

# Staff Admin API Authentication Token (Server-Side Enforced)
STAFF_AUTH_TOKENS = {
    "ccor-staff-admin-secure-token-2026": "CCOR Staff Administrator",
    "kevin-staff-token-sea2026": "Kevin (Lead Administrator)"
}

class SEADatabaseService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.email_engine = EmailSafetyEngine(db_path)

    def get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def get_summary_stats(self, award_year: int = 2026) -> Dict[str, Any]:
        """Fetch dashboard KPI counters and system status."""
        with self.get_conn() as conn:
            cur = conn.cursor()
            
            # Category counts
            cur.execute("""
                SELECT eligibility_category, COUNT(*) as count
                FROM sea_records
                WHERE award_year = ?
                GROUP BY eligibility_category;
            """, (award_year,))
            cats = {row['eligibility_category']: row['count'] for row in cur.fetchall()}
            
            # Total agents
            cur.execute("SELECT COUNT(*) as total FROM sea_records WHERE award_year = ?", (award_year,))
            total_records = cur.fetchone()['total']

            # Config
            cur.execute("""
                SELECT event_name, event_date, event_time, registration_url,
                       min_volume_threshold, min_sides_threshold, email_mode, mandatory_bcc_email
                FROM sea_award_years
                WHERE award_year = ?;
            """, (award_year,))
            config_row = cur.fetchone()
            config = dict(config_row) if config_row else {}

            # Registration fact counters
            cur.execute("""
                SELECT 
                    SUM(registration_link_clicked) as link_clicked,
                    SUM(registration_self_reported) as self_reported,
                    SUM(registration_independently_verified) as independently_verified
                FROM sea_records
                WHERE award_year = ?;
            """, (award_year,))
            reg_stats = dict(cur.fetchone() or {})

            # Overridden count
            cur.execute("SELECT COUNT(*) as count FROM sea_records WHERE award_year = ? AND is_override = 1", (award_year,))
            override_count = cur.fetchone()['count']

            return {
                "award_year": award_year,
                "total_agents": total_records,
                "categories": {
                    "Qualified — Preliminary": cats.get("Qualified — Preliminary", 0),
                    "Verified Eligible": cats.get("Verified Eligible", 0),
                    "Potential — High Priority": cats.get("Potential — High Priority", 0),
                    "Potential — Watch List": cats.get("Potential — Watch List", 0),
                    "Needs Manual Review": cats.get("Needs Manual Review", 0),
                    "Not Eligible": cats.get("Not Eligible", 0)
                },
                "registration_facts": reg_stats,
                "override_count": override_count,
                "config": config,
                "email_system_status": "CAMPAIGNS DISABLED — TESTING ONLY"
            }

    def list_agents(
        self,
        award_year: int = 2026,
        category: Optional[str] = None,
        search_query: Optional[str] = None,
        office_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Query agent records with multi-dimensional filtering."""
        with self.get_conn() as conn:
            cur = conn.cursor()
            query = """
                SELECT 
                    r.id as record_id,
                    r.award_year,
                    r.office,
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
                    r.registration_self_reported,
                    r.registration_independently_verified,
                    r.contact_verified,
                    r.assigned_staff,
                    r.outreach_status,
                    r.internal_notes,
                    a.id as agent_id,
                    a.license_id,
                    a.first_name,
                    a.last_name,
                    a.full_name,
                    a.primary_email,
                    a.primary_phone
                FROM sea_records r
                JOIN sea_agents a ON r.agent_id = a.id
                WHERE r.award_year = ?
            """
            params: List[Any] = [award_year]

            if category and category != "all":
                query += " AND r.eligibility_category = ?"
                params.append(category)

            if office_filter and office_filter != "all":
                query += " AND r.office = ?"
                params.append(office_filter)

            if search_query:
                term = f"%{search_query.strip()}%"
                query += " AND (a.full_name LIKE ? OR a.license_id LIKE ? OR r.office LIKE ? OR a.primary_email LIKE ?)"
                params.extend([term, term, term, term])

            # Primary ordering: Qualified first, then High Priority, then by Total Sides descending
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
        """Fetch complete agent record, history, and audit log."""
        with self.get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    r.*,
                    a.id as agent_id,
                    a.license_id,
                    a.first_name,
                    a.last_name,
                    a.full_name,
                    a.primary_email,
                    a.primary_phone,
                    a.primary_office
                FROM sea_records r
                JOIN sea_agents a ON r.agent_id = a.id
                WHERE r.id = ?;
            """, (record_id,))
            row = cur.fetchone()
            if not row:
                return None
            detail = dict(row)

            # Fetch audit logs
            cur.execute("""
                SELECT field_name, old_value, new_value, changed_by, reason, created_at
                FROM sea_audit_log
                WHERE record_id = ?
                ORDER BY id DESC;
            """, (record_id,))
            detail['audit_logs'] = [dict(log) for log in cur.fetchall()]

            # Fetch email history
            cur.execute("""
                SELECT recipient_email, bcc_email, subject, email_type, email_mode,
                       delivery_status, error_message, triggered_by, created_at
                FROM sea_email_logs
                WHERE record_id = ?
                ORDER BY id DESC;
            """, (record_id,))
            detail['email_logs'] = [dict(el) for el in cur.fetchall()]

            return detail

    def apply_eligibility_override(
        self,
        record_id: str,
        new_category: str,
        reason: str,
        staff_user: str
    ) -> Dict[str, Any]:
        """Manually override agent eligibility with mandatory recorded audit log."""
        if not reason or not reason.strip():
            raise ValueError("Reason is mandatory for manual eligibility overrides.")
        
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
            cur.execute("SELECT eligibility_category FROM sea_records WHERE id = ?", (record_id,))
            existing = cur.fetchone()
            if not existing:
                raise ValueError(f"Record {record_id} not found.")

            old_category = existing['eligibility_category']
            now_iso = datetime.datetime.now().isoformat()

            # Update record
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

            # Insert immutable audit log
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

    def update_staff_notes(
        self,
        record_id: str,
        notes: Optional[str] = None,
        assigned_staff: Optional[str] = None,
        outreach_status: Optional[str] = None,
        contact_verified: Optional[int] = None,
        primary_email: Optional[str] = None,
        primary_phone: Optional[str] = None,
        staff_user: str = "staff"
    ) -> Dict[str, Any]:
        """Update staff notes, assignment, and contact info."""
        with self.get_conn() as conn:
            cur = conn.cursor()
            
            # Fetch agent_id
            cur.execute("SELECT agent_id FROM sea_records WHERE id = ?", (record_id,))
            r = cur.fetchone()
            if not r:
                raise ValueError("Record not found")
            agent_id = r['agent_id']

            if notes is not None:
                cur.execute("UPDATE sea_records SET internal_notes = ?, updated_at = datetime('now') WHERE id = ?", (notes, record_id))
            if assigned_staff is not None:
                cur.execute("UPDATE sea_records SET assigned_staff = ?, updated_at = datetime('now') WHERE id = ?", (assigned_staff, record_id))
            if outreach_status is not None:
                cur.execute("UPDATE sea_records SET outreach_status = ?, updated_at = datetime('now') WHERE id = ?", (outreach_status, record_id))
            if contact_verified is not None:
                cur.execute("""
                    UPDATE sea_records SET 
                        contact_verified = ?, 
                        contact_verified_by = ?, 
                        contact_verified_at = datetime('now'),
                        updated_at = datetime('now')
                    WHERE id = ?;
                """, (contact_verified, staff_user, record_id))

            # Update permanent profile contact info if provided
            if primary_email is not None or primary_phone is not None:
                cur.execute("""
                    UPDATE sea_agents SET
                        primary_email = COALESCE(?, primary_email),
                        primary_phone = COALESCE(?, primary_phone),
                        updated_at = datetime('now')
                    WHERE id = ?;
                """, (primary_email, primary_phone, agent_id))

            conn.commit()

        return {"status": "success", "record_id": record_id}


class SEARequestHandler(BaseHTTPRequestHandler):
    db_service = SEADatabaseService()

    def _send_json(self, status_code: int, data: Dict[str, Any]):
        response_bytes = json.dumps(data, indent=2).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CCOR-Staff-Token')
        self.end_headers()
        self.wfile.write(response_bytes)

    def _send_error(self, status_code: int, message: str):
        self._send_json(status_code, {"error": message, "status": "error"})

    def _serve_file(self, file_path: str, content_type: str):
        if not os.path.exists(file_path):
            self._send_error(404, "File not found")
            return
        with open(file_path, 'rb') as f:
            content = f.read()
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _authenticate_staff(self) -> Optional[str]:
        """Verify server-side staff token. No public write access."""
        auth_header = self.headers.get('Authorization', '')
        token_header = self.headers.get('X-CCOR-Staff-Token', '')

        token = None
        if auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
        elif token_header:
            token = token_header.strip()

        if token and token in STAFF_AUTH_TOKENS:
            return STAFF_AUTH_TOKENS[token]
        return None

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CCOR-Staff-Token')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        # Serve Frontend Static Assets
        if path == "/" or path == "/index.html":
            self._serve_file(os.path.join(FRONTEND_DIR, "index.html"), "text/html; charset=utf-8")
            return
        elif path.startswith("/assets/") or path.endswith(".css") or path.endswith(".js"):
            filename = os.path.basename(path)
            full_path = os.path.join(FRONTEND_DIR, filename)
            ct = "text/css" if path.endswith(".css") else "application/javascript"
            self._serve_file(full_path, ct)
            return

        # Authenticate Staff for Admin API
        staff_user = self._authenticate_staff()
        if not staff_user:
            self._send_error(401, "Unauthorized: Valid staff authentication token required.")
            return

        # API Endpoints
        if path == "/api/sea/summary":
            stats = self.db_service.get_summary_stats(2026)
            self._send_json(200, stats)

        elif path == "/api/sea/agents":
            category = params.get('category', [None])[0]
            search = params.get('search', [None])[0]
            office = params.get('office', [None])[0]
            agents = self.db_service.list_agents(2026, category, search, office)
            self._send_json(200, {"count": len(agents), "agents": agents})

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
        staff_user = self._authenticate_staff()
        if not staff_user:
            self._send_error(401, "Unauthorized: Staff credentials required.")
            return

        parsed = urlparse(self.path)
        path = parsed.path

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            payload = json.loads(body) if body else {}
        except Exception as e:
            self._send_error(400, f"Malformed JSON request: {e}")
            return

        # Override Endpoint
        if path.startswith("/api/sea/records/") and path.endswith("/override"):
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

        # Notes / Update Endpoint
        elif path.startswith("/api/sea/records/") and path.endswith("/update"):
            rec_id = path.split("/")[4]
            try:
                result = self.db_service.update_staff_notes(
                    record_id=rec_id,
                    notes=payload.get("internal_notes"),
                    assigned_staff=payload.get("assigned_staff"),
                    outreach_status=payload.get("outreach_status"),
                    contact_verified=payload.get("contact_verified"),
                    primary_email=payload.get("primary_email"),
                    primary_phone=payload.get("primary_phone"),
                    staff_user=staff_user
                )
                self._send_json(200, result)
            except Exception as e:
                self._send_error(400, str(e))

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
                self._send_error(500, f"Server error: {e}")

        else:
            self._send_error(404, f"POST endpoint {path} not found.")

def run_server(port: int = 8787):
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, SEARequestHandler)
    print(f"==================================================")
    print(f"2026 SEA Admin Service listening on http://127.0.0.1:{port}")
    print(f"Email Mode: DISABLED (Testing & Previews Only)")
    print(f"Server-Enforced Auth: Active")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down SEA Admin Service.")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
