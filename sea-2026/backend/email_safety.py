"""
2026 Sales Excellence Awards - Server-Enforced Email Safety Architecture
Coconut Coast Organization of REALTORS® (CCOR)

STRICT SAFETY CONSTRAINTS:
1. Default Mode: 'disabled'. No email delivery permitted under any circumstance.
2. Mode 'test': Outbound delivery permitted ONLY to explicit server-side allowlisted recipients.
3. Mode 'live': Strictly forbidden during Stage 2. Fails closed.
4. Mandatory BCC: Every outbound message MUST have BCC set to 'tech@coconutcoastrealtors.org' (never CC).
5. Test Subject Prefix: All test mode messages MUST include '[TEST — SEA 2026]'.
6. Full Audit Trail: Every attempt (sent, blocked, failed) is permanently logged to sea_email_logs.
"""

import os
import re
import sqlite3
import datetime
from typing import Dict, Any, List, Optional, Tuple

MANDATORY_BCC = "tech@coconutcoastrealtors.org"
STAGE2_LIVE_LOCKED = True  # Hard-lock preventing live email sending in Stage 2

# Server-side allowlist for test mode (only authorized test mailboxes)
AUTHORIZED_TEST_RECIPIENTS = {
    "tech@coconutcoastrealtors.org",
    "kevin@coconutcoastrealtors.org",
    "admin@coconutcoastrealtors.org"
}

class EmailSafetyError(Exception):
    """Base exception for email safety violations."""
    pass

class EmailModeDisabledError(EmailSafetyError):
    """Raised when email dispatch is attempted while email mode is 'disabled'."""
    pass

class RecipientNotAllowlistedError(EmailSafetyError):
    """Raised when test email is addressed to an address not on the server allowlist."""
    pass

class LiveModeUnauthorizedError(EmailSafetyError):
    """Raised when live email dispatch is attempted without authorization."""
    pass

class EmailSafetyEngine:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def get_award_year_config(self, award_year: int = 2026) -> Dict[str, Any]:
        """Fetch current email mode and settings from database."""
        with self.get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT award_year, event_name, event_date, event_time, 
                       registration_url, email_mode, mandatory_bcc_email
                FROM sea_award_years 
                WHERE award_year = ?
            """, (award_year,))
            row = cursor.fetchone()
            if not row:
                # Fail closed if config is missing
                return {
                    "award_year": award_year,
                    "email_mode": "disabled",
                    "mandatory_bcc_email": MANDATORY_BCC
                }
            return dict(row)

    def log_email_attempt(
        self,
        record_id: Optional[str],
        recipient_email: str,
        bcc_email: str,
        subject: str,
        email_type: str,
        email_mode: str,
        delivery_status: str,
        response_payload: Optional[str] = None,
        error_message: Optional[str] = None,
        triggered_by: str = "system"
    ):
        """Record every email interaction into immutable audit log."""
        try:
            with self.get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO sea_email_logs (
                        record_id, recipient_email, bcc_email, subject,
                        email_type, email_mode, delivery_status,
                        response_payload, error_message, triggered_by, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));
                """, (
                    record_id, recipient_email, bcc_email, subject,
                    email_type, email_mode, delivery_status,
                    response_payload, error_message, triggered_by
                ))
                conn.commit()
        except Exception as e:
            print(f"CRITICAL: Failed to write to sea_email_logs: {e}")

    def generate_email_preview(
        self,
        agent_name: str,
        award_year: int = 2026,
        email_type: str = "invitation",
        token: str = "PREVIEW-TOKEN-XYZ123",
        is_test: bool = True
    ) -> Dict[str, Any]:
        """
        Generate pure in-memory preview of an invitation or reminder email.
        Performs ZERO network calls or external dispatch.
        """
        config = self.get_award_year_config(award_year)
        event_name = config.get("event_name", "2027 Sales Excellence Awards")
        event_date = config.get("event_date", "February 11, 2027")
        event_time = config.get("event_time", "9:00 AM–11:30 AM Eastern")
        reg_url = config.get("registration_url", "")
        
        # Confirmation portal link (to be used in Stage 3)
        portal_link = f"https://coconutcoastrealtors.org/sea-confirm/?token={token}"

        raw_subject = f"Official Invitation & Award Preference: {event_name}"
        subject = f"[TEST — SEA {award_year}] {raw_subject}" if is_test else raw_subject

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc; }}
    .card {{ max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }}
    .header {{ background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid #38bdf8; }}
    .header h1 {{ margin: 0; color: #f8fafc; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }}
    .header p {{ margin: 8px 0 0; color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; }}
    .content {{ padding: 32px 28px; line-height: 1.6; color: #cbd5e1; font-size: 15px; }}
    .content h2 {{ color: #38bdf8; font-size: 18px; margin-top: 0; }}
    .event-box {{ background: #0f172a; border-left: 4px solid #38bdf8; padding: 16px 20px; border-radius: 4px; margin: 24px 0; }}
    .event-box div {{ margin-bottom: 6px; font-size: 14px; }}
    .event-box strong {{ color: #f8fafc; }}
    .btn {{ display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: 600; padding: 12px 28px; border-radius: 8px; margin: 16px 0; text-align: center; font-size: 15px; }}
    .footer {{ background: #0f172a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <p>Coconut Coast Organization of REALTORS®</p>
      <h1>{event_name}</h1>
    </div>
    <div class="content">
      <h2>Congratulations, {agent_name}!</h2>
      <p>On behalf of the CCOR Board of Directors, we are thrilled to recognize your exceptional achievement in production for 2026. You have achieved qualified candidate standing for the upcoming <strong>{event_name}</strong>.</p>
      
      <div class="event-box">
        <div><strong>Date:</strong> {event_date}</div>
        <div><strong>Time:</strong> {event_time}</div>
        <div><strong>Honoring:</strong> Top Producing REALTORS® Across Southwest Florida</div>
      </div>

      <p>To ensure your personalized physical award is prepared accurately and your seating is reserved, please complete your confidential Award Confirmation Form below:</p>
      
      <div style="text-align: center;">
        <a href="{portal_link}" class="btn">Confirm Award Preference & RSVP</a>
      </div>

      <p style="font-size: 13px; color: #94a3b8;"><em>Note: Agents attending the ceremony must also complete complimentary registration via the official portal at <a href="{reg_url}" style="color: #38bdf8;">GrowthZone Event Portal</a>.</em></p>
    </div>
    <div class="footer">
      This is an official communication from the Coconut Coast Organization of REALTORS®.<br>
      Automated Monitoring BCC: {MANDATORY_BCC}
    </div>
  </div>
</body>
</html>"""

        plain_text = f"""Coconut Coast Organization of REALTORS®
{event_name}

Congratulations, {agent_name}!

On behalf of the CCOR Board of Directors, we are thrilled to recognize your exceptional achievement in production for 2026. You have achieved qualified candidate standing for the upcoming {event_name}.

Event Details:
- Date: {event_date}
- Time: {event_time}
- Honoring: Top Producing REALTORS® Across Southwest Florida

Please complete your confidential Award Confirmation Form at:
{portal_link}

GrowthZone Event Registration:
{reg_url}

Automated Monitoring BCC: {MANDATORY_BCC}
"""
        return {
            "from": "Coconut Coast REALTORS® <awards@coconutcoastrealtors.org>",
            "to": f"{agent_name} <preview-only@ccor-staging.internal>",
            "bcc": MANDATORY_BCC,
            "subject": subject,
            "html": html_body,
            "plain_text": plain_text,
            "email_mode_active": config.get("email_mode", "disabled"),
            "is_test_preview": is_test
        }

    def dispatch_email_controlled(
        self,
        recipient_email: str,
        subject: str,
        html_content: str,
        plain_text: str,
        email_type: str = "test",
        record_id: Optional[str] = None,
        staff_user: str = "unauthenticated",
        force_test_mode_only: bool = True
    ) -> Dict[str, Any]:
        """
        Controlled email sending gateway enforcing all safety invariants:
        - Rejects any send if email_mode != 'test'
        - Rejects any recipient not in AUTHORIZED_TEST_RECIPIENTS
        - Injects server-enforced BCC
        - Enforces [TEST — SEA 2026] prefix
        - Logs all attempts to database
        """
        config = self.get_award_year_config(2026)
        mode = config.get("email_mode", "disabled").lower().strip()
        bcc_address = config.get("mandatory_bcc_email", MANDATORY_BCC).strip()

        # Invariant 1: Fail closed if mode is disabled
        if mode == "disabled":
            err_msg = "Outbound email blocked: System email_mode is 'disabled'. Real agent emails and automated campaigns are strictly prohibited."
            self.log_email_attempt(
                record_id=record_id,
                recipient_email=recipient_email,
                bcc_email=bcc_address,
                subject=subject,
                email_type=email_type,
                email_mode=mode,
                delivery_status="blocked_disabled",
                error_message=err_msg,
                triggered_by=staff_user
            )
            raise EmailModeDisabledError(err_msg)

        # Invariant 2: Live mode is hard-locked during Stage 2
        if mode == "live" or not force_test_mode_only:
            err_msg = "CRITICAL: Live email sending is hard-locked during Stage 2. Explicit client authorization required for future stages."
            self.log_email_attempt(
                record_id=record_id,
                recipient_email=recipient_email,
                bcc_email=bcc_address,
                subject=subject,
                email_type=email_type,
                email_mode=mode,
                delivery_status="blocked_unauthorized",
                error_message=err_msg,
                triggered_by=staff_user
            )
            raise LiveModeUnauthorizedError(err_msg)

        # Invariant 3: Test mode recipient allowlist enforcement
        clean_recipient = recipient_email.lower().strip()
        if clean_recipient not in AUTHORIZED_TEST_RECIPIENTS:
            err_msg = (
                f"Outbound email blocked: Recipient '{recipient_email}' is not on the server-enforced "
                f"test allowlist. Real agents may NOT be contacted during testing."
            )
            self.log_email_attempt(
                record_id=record_id,
                recipient_email=recipient_email,
                bcc_email=bcc_address,
                subject=subject,
                email_type=email_type,
                email_mode=mode,
                delivery_status="blocked_unauthorized",
                error_message=err_msg,
                triggered_by=staff_user
            )
            raise RecipientNotAllowlistedError(err_msg)

        # Invariant 4: Subject line prefix enforcement
        test_prefix = "[TEST — SEA 2026]"
        if not subject.startswith(test_prefix):
            subject = f"{test_prefix} {subject}"

        # Invariant 5: Mandatory BCC enforcement
        # Notice: BCC is added directly to envelope, never CC
        envelope_bcc = [bcc_address]

        # Simulation/Execution of approved test message
        # In Stage 2, this is the controlled test-email facility.
        delivery_result = {
            "status": "success",
            "message_id": f"TEST-MSG-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}",
            "recipient": clean_recipient,
            "bcc": envelope_bcc,
            "subject": subject,
            "timestamp": datetime.datetime.now().isoformat(),
            "note": "Test email simulation executed. Mandatory BCC attached. No real agents contacted."
        }

        self.log_email_attempt(
            record_id=record_id,
            recipient_email=clean_recipient,
            bcc_email=bcc_address,
            subject=subject,
            email_type=email_type,
            email_mode=mode,
            delivery_status="sent_test",
            response_payload=str(delivery_result),
            triggered_by=staff_user
        )

        return delivery_result
