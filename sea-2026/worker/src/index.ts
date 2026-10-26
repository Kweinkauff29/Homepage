import { authenticateStaff } from "./auth";
import {
  addManualAgent,
  applyEligibilityOverride,
  archiveAgentRecord,
  ConfirmationValidationError,
  exportAgentsCsv,
  generateToken,
  getAgentDetail,
  getAwardYearConfig,
  getAwardYears,
  getBrokerageMappings,
  getSummaryStats,
  listAgents,
  logBlockedEmailAttempt,
  recordRegistrationClick,
  revokeToken,
  saveDraft,
  submitConfirmation,
  updateAgentRecord,
  updateBrokerageMapping,
  verifyToken,
} from "./db";
import { generateEmailPreview } from "./email";
import type { AppEnv, JsonObject, StaffIdentity } from "./types";
import {
  asBoolean,
  asTrimmedString,
  csvResponse,
  errorResponse,
  jsonResponse,
  readJsonBody,
  withSecurityHeaders,
} from "./utils";

function queryBoolean(url: URL, name: string): boolean {
  return url.searchParams.get(name)?.toLowerCase() === "true";
}

function queryYear(url: URL): number {
  const value = Number(url.searchParams.get("year") ?? "2026");
  return Number.isInteger(value) && value >= 2024 && value <= 2100 ? value : 2026;
}

async function requireStaff(request: Request, env: AppEnv): Promise<StaffIdentity | Response> {
  const auth = await authenticateStaff(request, env);
  return auth.ok ? auth.identity : errorResponse(auth.status, auth.message, "STAFF_AUTH_REQUIRED");
}

async function requireConfirmationAccess(
  request: Request,
  env: AppEnv,
  context: JsonObject,
): Promise<Response | null> {
  if (String(env.PUBLIC_CONFIRMATION_ENABLED) === "true" || Number(context.is_test) === 1) return null;
  const auth = await authenticateStaff(request, env);
  if (auth.ok) return null;
  return errorResponse(
    403,
    "Real-agent confirmation links are disabled in staging. Use an authenticated staff preview.",
    "STAGING_CONFIRMATION_RESTRICTED",
  );
}

function clientIp(request: Request): string | null {
  return request.headers.get("cf-connecting-ip");
}

async function serveAsset(request: Request, env: AppEnv, pathOverride?: string): Promise<Response> {
  const url = new URL(request.url);
  if (pathOverride) url.pathname = pathOverride;
  const assetRequest = new Request(url, request);
  return withSecurityHeaders(await env.ASSETS.fetch(assetRequest));
}

async function handlePublicGet(request: Request, env: AppEnv, url: URL): Promise<Response | null> {
  if (url.pathname === "/health") {
    return jsonResponse({ status: "ok", service: "ccor-sea-2026", environment: env.ENVIRONMENT });
  }
  if (url.pathname === "/confirm" || url.pathname === "/confirm.html") {
    return serveAsset(request, env, "/confirm.html");
  }
  if (url.pathname === "/api/confirm/verify") {
    const token = url.searchParams.get("token")?.trim() ?? "";
    if (!token) return errorResponse(400, "Confirmation token is required.", "TOKEN_REQUIRED");
    const preview = queryBoolean(url, "preview");
    const initialContext = await verifyToken(env.DB, token, true);
    const restricted = await requireConfirmationAccess(request, env, initialContext);
    if (restricted) return restricted;
    const context = preview ? initialContext : await verifyToken(env.DB, token, false);
    return jsonResponse(context);
  }
  if (url.pathname === "/api/confirm/register-redirect") {
    const token = url.searchParams.get("token")?.trim() ?? "";
    if (!token) return errorResponse(400, "Token required for redirect.", "TOKEN_REQUIRED");
    const preview = queryBoolean(url, "preview");
    const context = await verifyToken(env.DB, token, true);
    const restricted = await requireConfirmationAccess(request, env, context);
    if (restricted) return restricted;
    let targetUrl = asTrimmedString(context.registration_url);
    if (!preview) {
      const tracked = await recordRegistrationClick(
        env.DB,
        context,
        clientIp(request),
        request.headers.get("user-agent") ?? "",
      );
      targetUrl = asTrimmedString(tracked.target_url);
    }
    return withSecurityHeaders(new Response(null, { status: 302, headers: { Location: targetUrl } }));
  }
  if (!url.pathname.startsWith("/api/")) {
    if (url.pathname === "/") return serveAsset(request, env, "/index.html");
    if (url.pathname === "/2026-sales-excellence-awards") {
      return serveAsset(request, env, "/public_2026.html");
    }
    if (url.pathname === "/archive/2025" || url.pathname === "/archive/2025/" || url.pathname === "/2025-archive") {
      return serveAsset(request, env, "/archive/2025/index.html");
    }
    return serveAsset(request, env);
  }
  return null;
}

async function handleStaffGet(
  request: Request,
  env: AppEnv,
  url: URL,
  identity: StaffIdentity,
): Promise<Response> {
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return serveAsset(request, env, "/index.html");
  }
  if (url.pathname === "/public_2026.html" || url.pathname === "/2026-sales-excellence-awards") {
    return serveAsset(request, env, "/public_2026.html");
  }
  if (url.pathname === "/archive/2025" || url.pathname === "/archive/2025/" || url.pathname === "/2025-archive") {
    return serveAsset(request, env, "/archive/2025/index.html");
  }
  if (!url.pathname.startsWith("/api/")) return serveAsset(request, env);

  if (url.pathname === "/api/sea/summary") {
    return jsonResponse(await getSummaryStats(env.DB, queryYear(url), queryBoolean(url, "include_test")));
  }
  if (url.pathname === "/api/sea/award-years") {
    return jsonResponse({ award_years: await getAwardYears(env.DB) });
  }
  if (url.pathname === "/api/sea/brokerage-mappings") {
    return jsonResponse({ mappings: await getBrokerageMappings(env.DB) });
  }
  if (url.pathname === "/api/sea/agents") {
    const agents = await listAgents(env.DB, {
      awardYear: queryYear(url),
      category: url.searchParams.get("category"),
      search: url.searchParams.get("search"),
      office: url.searchParams.get("office"),
      formStatus: url.searchParams.get("form_status"),
      verification: url.searchParams.get("verification"),
      staff: url.searchParams.get("staff"),
      sortBy: url.searchParams.get("sort_by"),
      sortDir: url.searchParams.get("sort_dir"),
      includeTest: queryBoolean(url, "include_test"),
    });
    return jsonResponse({ count: agents.length, agents });
  }
  if (url.pathname === "/api/sea/agents/export") {
    const year = queryYear(url);
    const csv = await exportAgentsCsv(
      env.DB,
      year,
      url.searchParams.get("category"),
      url.searchParams.get("verification"),
    );
    return csvResponse(csv, `CCOR_SEA_${year}_Staff_Roster.csv`);
  }

  const agentMatch = url.pathname.match(/^\/api\/sea\/agents\/([^/]+)$/u);
  if (agentMatch?.[1]) {
    const detail = await getAgentDetail(env.DB, decodeURIComponent(agentMatch[1]));
    return detail ? jsonResponse(detail) : errorResponse(404, `Agent record ${agentMatch[1]} not found.`);
  }

  const previewMatch = url.pathname.match(/^\/api\/sea\/email\/preview\/([^/]+)$/u);
  if (previewMatch?.[1]) {
    const detail = await getAgentDetail(env.DB, decodeURIComponent(previewMatch[1]));
    const agentName = detail && typeof detail.full_name === "string" ? detail.full_name : "Agent";
    const config = await getAwardYearConfig(env.DB, 2026);
    return jsonResponse(generateEmailPreview(agentName, config, env.MANDATORY_BCC_EMAIL));
  }

  console.log(JSON.stringify({ message: "staff endpoint not found", path: url.pathname, staff: identity.email }));
  return errorResponse(404, `Endpoint ${url.pathname} not found.`);
}

async function handleGet(request: Request, env: AppEnv): Promise<Response> {
  const url = new URL(request.url);
  try {
    const publicResponse = await handlePublicGet(request, env, url);
    if (publicResponse) return publicResponse;
    const identity = await requireStaff(request, env);
    if (identity instanceof Response) return identity;
    return await handleStaffGet(request, env, url, identity);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(JSON.stringify({ message: "GET request failed", path: url.pathname, error: message }));
    if (url.pathname.startsWith("/api/confirm/")) return errorResponse(403, message, "CONFIRMATION_ACCESS_ERROR");
    return errorResponse(500, "Internal server error.");
  }
}

async function handleConfirmationPost(
  request: Request,
  env: AppEnv,
  url: URL,
  payload: JsonObject,
): Promise<Response | null> {
  if (!url.pathname.startsWith("/api/confirm/")) return null;
  const token = asTrimmedString(payload.token);
  if (!token) return errorResponse(400, "Agent token is required.", "TOKEN_REQUIRED");
  const preview = asBoolean(payload.is_preview) || request.headers.get("x-staff-preview") === "1";
  const context = await verifyToken(env.DB, token, true);
  const restricted = await requireConfirmationAccess(request, env, context);
  if (restricted) return restricted;

  if (url.pathname === "/api/confirm/track-click") {
    if (preview) {
      return jsonResponse({ status: "preview_acknowledged", note: "Click tracking bypassed in staff preview mode." });
    }
    return jsonResponse(await recordRegistrationClick(
      env.DB,
      context,
      clientIp(request),
      request.headers.get("user-agent") ?? "",
    ));
  }
  if (url.pathname === "/api/confirm/save-draft") {
    if (preview) {
      return jsonResponse({ status: "preview_acknowledged", note: "Draft saving bypassed in staff preview mode." });
    }
    return jsonResponse(await saveDraft(env.DB, asTrimmedString(context.record_id), payload));
  }
  if (url.pathname === "/api/confirm/submit") {
    if (preview) {
      return jsonResponse({
        status: "blocked",
        error_code: "STAFF_PREVIEW_MODE",
        error: "Staff Preview Mode: Submissions and registration claims are disabled to protect data integrity.",
      }, 403);
    }
    return jsonResponse(await submitConfirmation(
      env.DB,
      token,
      context,
      payload,
      clientIp(request),
      request.headers.get("user-agent") ?? "",
    ));
  }
  return errorResponse(404, `Endpoint ${url.pathname} not found.`);
}

async function handleStaffPost(
  env: AppEnv,
  url: URL,
  payload: JsonObject,
  identity: StaffIdentity,
): Promise<Response> {
  const staffUser = identity.displayName;
  const generateMatch = url.pathname.match(/^\/api\/sea\/agents\/([^/]+)\/generate-token$/u);
  if (generateMatch?.[1]) {
    const recordId = decodeURIComponent(generateMatch[1]);
    const token = await generateToken(env.DB, recordId);
    return jsonResponse({
      status: "success",
      record_id: recordId,
      token: token.rawToken,
      url: `/confirm.html?token=${token.rawToken}`,
      preview_url: `/confirm.html?token=${token.rawToken}&preview=true`,
    });
  }
  const revokeMatch = url.pathname.match(/^\/api\/sea\/agents\/([^/]+)\/revoke-token$/u);
  if (revokeMatch?.[1]) {
    const recordId = decodeURIComponent(revokeMatch[1]);
    return jsonResponse({ status: "success", record_id: recordId, revoked: await revokeToken(env.DB, recordId) });
  }
  const overrideMatch = url.pathname.match(/^\/api\/sea\/records\/([^/]+)\/override$/u);
  if (overrideMatch?.[1]) {
    return jsonResponse(await applyEligibilityOverride(
      env.DB,
      decodeURIComponent(overrideMatch[1]),
      asTrimmedString(payload.new_category),
      asTrimmedString(payload.reason),
      staffUser,
    ));
  }
  const updateMatch = url.pathname.match(/^\/api\/sea\/records\/([^/]+)\/update$/u);
  if (updateMatch?.[1]) {
    return jsonResponse(await updateAgentRecord(env.DB, decodeURIComponent(updateMatch[1]), payload, staffUser));
  }
  if (url.pathname === "/api/sea/records/add") {
    return jsonResponse(await addManualAgent(env.DB, payload, staffUser), 201);
  }
  const archiveMatch = url.pathname.match(/^\/api\/sea\/records\/([^/]+)\/archive$/u);
  if (archiveMatch?.[1]) {
    return jsonResponse(await archiveAgentRecord(env.DB, decodeURIComponent(archiveMatch[1]), staffUser));
  }
  if (url.pathname === "/api/sea/brokerage-mappings") {
    return jsonResponse(await updateBrokerageMapping(
      env.DB,
      asTrimmedString(payload.office_code),
      asTrimmedString(payload.brokerage_name),
      staffUser,
    ));
  }
  if (url.pathname === "/api/sea/email/test-send") {
    const recipient = asTrimmedString(payload.recipient_email).slice(0, 320);
    const subject = (asTrimmedString(payload.subject) || "Official SEA Test").slice(0, 240);
    const recordId = asTrimmedString(payload.record_id) || null;
    await logBlockedEmailAttempt(
      env.DB,
      recordId,
      recipient,
      subject,
      staffUser,
      env.MANDATORY_BCC_EMAIL,
    );
    return jsonResponse({
      status: "blocked",
      error_code: "EMAIL_MODE_DISABLED",
      message: "Outbound email blocked: email_mode is disabled. No email was sent.",
      note: "The staging system is limited to in-browser previews.",
    }, 403);
  }
  return errorResponse(404, `Endpoint ${url.pathname} not found.`);
}

async function handlePost(request: Request, env: AppEnv): Promise<Response> {
  const url = new URL(request.url);
  try {
    const payload = await readJsonBody(request);
    const confirmationResponse = await handleConfirmationPost(request, env, url, payload);
    if (confirmationResponse) return confirmationResponse;

    const identity = await requireStaff(request, env);
    if (identity instanceof Response) return identity;
    return await handleStaffPost(env, url, payload, identity);
  } catch (error) {
    if (error instanceof ConfirmationValidationError) {
      const status = error.code === "VALIDATION_ERROR" ? 400 : 422;
      return jsonResponse({ status: "blocked", error_code: error.code, error: error.message }, status);
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(JSON.stringify({ message: "POST request failed", path: url.pathname, error: message }));
    if (message.includes("Request body") || message.includes("JSON")) return errorResponse(400, message, "INVALID_REQUEST");
    return errorResponse(400, message);
  }
}

export default {
  async fetch(request: Request, env: AppEnv): Promise<Response> {
    if (request.method === "GET" || request.method === "HEAD") return handleGet(request, env);
    if (request.method === "POST") return handlePost(request, env);
    if (request.method === "OPTIONS") {
      return withSecurityHeaders(new Response(null, {
        status: 204,
        headers: { Allow: "GET, HEAD, POST, OPTIONS" },
      }));
    }
    return errorResponse(405, "Method not allowed.");
  },
} satisfies ExportedHandler<AppEnv>;
