import type { AwardYearConfig, JsonObject } from "./types";
import { escapeHtml } from "./utils";

export function generateEmailPreview(
  agentName: string,
  config: AwardYearConfig | null,
  mandatoryBcc: string,
): JsonObject {
  const safeAgentName = escapeHtml(agentName || "Agent");
  const eventName = escapeHtml(config?.event_name ?? "2027 Sales Excellence Awards");
  const eventDate = escapeHtml(config?.event_date ?? "February 11, 2027");
  const eventTime = escapeHtml(config?.event_time ?? "9:00 AM–11:30 AM Eastern");
  const registrationUrl = escapeHtml(config?.registration_url ?? "");
  const portalLink = "https://sea-staging.coconutcoastrealtors.org/confirm.html?token=PREVIEW-TOKEN-REDACTED&preview=true";
  const subject = `[TEST — SEA 2026] Official Invitation & Award Preference: ${eventName}`;
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:Arial,sans-serif;background:#0f172a;margin:0;padding:24px;color:#f8fafc">
  <div style="max-width:600px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden">
    <div style="background:#172554;padding:30px 24px;text-align:center;border-bottom:2px solid #38bdf8">
      <div style="color:#94a3b8;font-size:13px;letter-spacing:1.2px;text-transform:uppercase">Coconut Coast Organization of REALTORS®</div>
      <h1 style="margin:8px 0 0;font-size:22px">${eventName}</h1>
    </div>
    <div style="padding:30px 28px;line-height:1.6;color:#cbd5e1;font-size:15px">
      <h2 style="color:#38bdf8;font-size:18px">Congratulations, ${safeAgentName}!</h2>
      <p>CCOR is recognizing your production for 2026 and inviting you to confirm your award preference.</p>
      <div style="background:#0f172a;border-left:4px solid #38bdf8;padding:16px 20px;margin:24px 0">
        <div><strong style="color:#fff">Date:</strong> ${eventDate}</div>
        <div><strong style="color:#fff">Time:</strong> ${eventTime}</div>
      </div>
      <div style="text-align:center"><a href="${portalLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:12px 28px;border-radius:8px">Confirm Award Preference &amp; RSVP</a></div>
      <p style="font-size:13px;color:#94a3b8">Attending agents must also complete complimentary registration through the <a href="${registrationUrl}" style="color:#38bdf8">official GrowthZone portal</a>.</p>
    </div>
    <div style="background:#0f172a;padding:20px;text-align:center;font-size:12px;color:#64748b">Preview only. Outbound email is disabled. Monitoring BCC: ${escapeHtml(mandatoryBcc)}</div>
  </div>
</body>
</html>`;

  const plainText = `Coconut Coast Organization of REALTORS®\n${config?.event_name ?? "2027 Sales Excellence Awards"}\n\nCongratulations, ${agentName || "Agent"}!\n\nDate: ${config?.event_date ?? "February 11, 2027"}\nTime: ${config?.event_time ?? "9:00 AM–11:30 AM Eastern"}\n\nPreview only. Outbound email is disabled.\nMonitoring BCC: ${mandatoryBcc}`;

  return {
    from: "Coconut Coast REALTORS® <awards@coconutcoastrealtors.org>",
    to: `${agentName || "Agent"} <preview-only@ccor-staging.internal>`,
    bcc: mandatoryBcc,
    subject,
    html,
    plain_text: plainText,
    email_mode_active: "disabled",
    is_test_preview: true,
  };
}

