import { createRemoteJWKSet, jwtVerify } from "jose";

import type { AppEnv, AuthResult } from "./types";

function configuredDomains(env: AppEnv): string[] {
  return env.ALLOWED_STAFF_DOMAINS.split(",")
    .map((domain) => domain.trim().toLowerCase().replace(/^@/u, ""))
    .filter(Boolean);
}

function allowedEmail(email: string, domains: string[]): boolean {
  const normalized = email.trim().toLowerCase();
  return domains.some((domain) => normalized.endsWith(`@${domain}`));
}

function configuredStaffUsers(env: AppEnv): string[] {
  return String(env.ALLOWED_STAFF_USERS ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

export async function authenticateStaff(request: Request, env: AppEnv): Promise<AuthResult> {
  if (String(env.ALLOW_LOCALHOST_AUTH) === "true") {
    return {
      ok: true,
      identity: { email: "local-dev@localhost", displayName: "Local development" },
    };
  }

  if (String(env.REQUIRE_ACCESS_JWT) !== "true") {
    const selected = request.headers.get("x-staff-user")?.trim() ?? "";
    if (!selected) {
      return { ok: false, status: 401, message: "Select a staff member to continue." };
    }
    const staff = configuredStaffUsers(env);
    const canonical = staff.find((name) => name.toLowerCase() === selected.toLowerCase());
    if (!canonical) {
      return { ok: false, status: 403, message: "The selected staff member is not authorized." };
    }
    return {
      ok: true,
      identity: { email: `${canonical.toLowerCase()}@staff-selector.local`, displayName: canonical },
    };
  }

  if (!env.TEAM_DOMAIN || !env.POLICY_AUD) {
    return {
      ok: false,
      status: 503,
      message: "Cloudflare Access is not fully configured for this staging application.",
    };
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) {
    return { ok: false, status: 401, message: "Cloudflare Access authentication is required." };
  }

  try {
    const issuer = String(env.TEAM_DOMAIN).replace(/\/$/u, "");
    const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: env.POLICY_AUD,
    });
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!email || !allowedEmail(email, configuredDomains(env))) {
      return { ok: false, status: 403, message: "This account is not authorized for CCOR SEA staging." };
    }
    return { ok: true, identity: { email, displayName: `Cloudflare Access (${email})` } };
  } catch (error) {
    console.error(JSON.stringify({
      message: "Cloudflare Access JWT validation failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    return { ok: false, status: 403, message: "Cloudflare Access token validation failed." };
  }
}
