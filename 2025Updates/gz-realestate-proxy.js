// gz-realestate-proxy.js

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

function withCors(res) {
    const h = new Headers(res.headers);
    const cors = corsHeaders();
    for (const [k, v] of Object.entries(cors)) h.set(k, v);
    return new Response(res.body, { status: res.status, headers: h });
}

function json(body, status = 200) {
    return withCors(
        new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
        })
    );
}

function formatUtcIsoZ(dt) {
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = dt.getUTCFullYear();
    const mm = pad(dt.getUTCMonth() + 1);
    const dd = pad(dt.getUTCDate());
    const hh = pad(dt.getUTCHours());
    const mi = pad(dt.getUTCMinutes());
    const ss = pad(dt.getUTCSeconds());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}Z`;
}

function looksLikeDateTimeFormatException(body) {
    if (!body) return false;

    if (typeof body === "string") {
        return (
            body.includes("String was not recognized as a valid DateTime") ||
            body.includes("System.FormatException")
        );
    }

    const msg = String(body.ExceptionMessage || body.Message || "");
    const type = String(body.ExceptionType || "");
    return (
        msg.includes("String was not recognized as a valid DateTime") ||
        type.includes("FormatException")
    );
}

function buildUtcSinceCandidates(sinceRaw) {
    if (typeof sinceRaw !== "string") return null;
    const raw = sinceRaw.trim();
    if (!raw) return null;

    const candidates = [];

    const isSafePathSegment = (s) =>
        typeof s === "string" &&
        s.length > 0 &&
        !s.includes(":") &&
        !s.includes("/") &&
        !s.includes("\\") &&
        /^[0-9A-Za-z+\-._TZ]+$/.test(s);

    // If user already gave a colon-free safe value, try it first.
    if (isSafePathSegment(raw)) {
        candidates.push(raw);
    }

    const pad = (n) => String(n).padStart(2, "0");
    const fmtDash = (dt) => {
        // yyyy-MM-ddTHHmmssZ (no colons)
        const yyyy = dt.getUTCFullYear();
        const mm = pad(dt.getUTCMonth() + 1);
        const dd = pad(dt.getUTCDate());
        const hh = pad(dt.getUTCHours());
        const mi = pad(dt.getUTCMinutes());
        const ss = pad(dt.getUTCSeconds());
        return `${yyyy}-${mm}-${dd}T${hh}${mi}${ss}Z`;
    };
    const fmtDashNoZ = (dt) => fmtDash(dt).replace(/Z$/, "");
    const fmtBasic = (dt) => {
        // yyyyMMddTHHmmssZ (no dashes, no colons)
        const yyyy = dt.getUTCFullYear();
        const mm = pad(dt.getUTCMonth() + 1);
        const dd = pad(dt.getUTCDate());
        const hh = pad(dt.getUTCHours());
        const mi = pad(dt.getUTCMinutes());
        const ss = pad(dt.getUTCSeconds());
        return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
    };
    const fmtBasicNoZ = (dt) => fmtBasic(dt).replace(/Z$/, "");

    let dt = null;

    // ISO with colons: 2025-12-16T18:24:25Z (or ms)
    const isoWithColons = raw.match(
        /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/i
    );
    if (isoWithColons) {
        const [y, m, d] = isoWithColons[1].split("-").map(Number);
        const hh = Number(isoWithColons[2]);
        const mi = Number(isoWithColons[3]);
        const ss = Number(isoWithColons[4]);
        dt = new Date(Date.UTC(y, m - 1, d, hh, mi, ss));
    }

    // yyyy-MM-ddTHHmmssZ
    if (!dt) {
        const dashNoColons = raw.match(
            /^(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})(\d{2})Z$/i
        );
        if (dashNoColons) {
            dt = new Date(
                Date.UTC(
                    Number(dashNoColons[1]),
                    Number(dashNoColons[2]) - 1,
                    Number(dashNoColons[3]),
                    Number(dashNoColons[4]),
                    Number(dashNoColons[5]),
                    Number(dashNoColons[6])
                )
            );
        }
    }

    // yyyyMMddTHHmmssZ
    if (!dt) {
        const basic = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/i);
        if (basic) {
            dt = new Date(
                Date.UTC(
                    Number(basic[1]),
                    Number(basic[2]) - 1,
                    Number(basic[3]),
                    Number(basic[4]),
                    Number(basic[5]),
                    Number(basic[6])
                )
            );
        }
    }

    // Fallback: Date parsing, normalize to UTC seconds
    if (!dt) {
        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) {
            dt = new Date(
                Date.UTC(
                    parsed.getUTCFullYear(),
                    parsed.getUTCMonth(),
                    parsed.getUTCDate(),
                    parsed.getUTCHours(),
                    parsed.getUTCMinutes(),
                    parsed.getUTCSeconds()
                )
            );
        }
    }

    if (!dt || Number.isNaN(dt.getTime())) return candidates.length ? candidates : null;

    const computed = [fmtDash(dt), fmtDashNoZ(dt), fmtBasic(dt), fmtBasicNoZ(dt)];
    for (const c of computed) {
        if (!isSafePathSegment(c)) continue;
        if (!candidates.includes(c)) candidates.push(c);
    }

    return candidates.length ? candidates : null;
}

async function proxyGetUpstream(upstreamUrl, apiKey) {
    const res = await fetch(upstreamUrl, {
        method: "GET",
        headers: {
            Authorization: `ApiKey ${apiKey}`,
            Accept: "*/*",
        },
    });

    const text = await res.text().catch(() => "");
    const contentType = res.headers.get("content-type") || "text/plain";
    return { res, text, contentType };
}

function getUpstreamBase(env) {
    const fromEnv = env && env.GZ_BASE_URL ? String(env.GZ_BASE_URL).trim() : "";
    if (fromEnv) return fromEnv.replace(/\/+$/, "");
    return "https://bonitaspringsesterorealtorsfl.growthzoneapp.com";
}

function buildIntegrationsAccountsUrl(upstreamBase, forwardParams) {
    const base = String(upstreamBase || "").trim().replace(/\/+$/, "");
    if (!base) return null;

    const qs =
        forwardParams && typeof forwardParams.toString === "function"
            ? forwardParams.toString()
            : "";

    return `${base}/api/integrations/accounts` + (qs ? `?${qs}` : "");
}

export default {
    async fetch(request, env) {
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders() });
        }

        const url = new URL(request.url);

        const apiKey = env && env.GZ_API_KEY ? String(env.GZ_API_KEY).trim() : "";
        if (!apiKey) {
            return json({ ok: false, error: "Worker is missing secret env.GZ_API_KEY" }, 500);
        }

        const upstreamBase = getUpstreamBase(env);

        // Optional sanity check
        if (url.pathname === "/claims") {
            const upstreamUrl = `${upstreamBase}/api/contacts/root/claims`;
            const { res, text, contentType } = await proxyGetUpstream(upstreamUrl, apiKey);

            let parsed = null;
            try {
                parsed = text ? JSON.parse(text) : null;
            } catch {
                parsed = text;
            }

            return json(
                { ok: res.ok, upstreamBase, upstreamUrl, status: res.status, body: parsed, contentType },
                res.ok ? 200 : res.status
            );
        }

        // NEW: Custom Fields proxy
        // GET /customfields - returns all custom fields defined in GrowthZone
        if (url.pathname === "/customfields") {
            const upstreamUrl = `${upstreamBase}/api/customfields`;
            const { res, text, contentType } = await proxyGetUpstream(upstreamUrl, apiKey);

            return withCors(
                new Response(text, {
                    status: res.status,
                    headers: { "Content-Type": contentType || "application/json" },
                })
            );
        }

        // NEW: Applications proxy
        // GET /applications - returns all applications
        if (url.pathname === "/applications") {
            const upstreamUrl = `${upstreamBase}/api/applications`;
            const { res, text, contentType } = await proxyGetUpstream(upstreamUrl, apiKey);

            return withCors(
                new Response(text, {
                    status: res.status,
                    headers: { "Content-Type": contentType || "application/json" },
                })
            );
        }

        // NEW: Calendars Items proxy
        // GET /calendars/items
        if (url.pathname === "/calendars/items") {
            const upstreamUrl = `${upstreamBase}/api/calendars/items`;
            const { res, text, contentType } = await proxyGetUpstream(upstreamUrl, apiKey);

            return withCors(
                new Response(text, {
                    status: res.status,
                    headers: { "Content-Type": contentType || "application/json" },
                })
            );
        }

        // NEW: Specific Calendar Details proxy
        // GET /calendars/{id}
        const calendarIdMatch = url.pathname.match(/^\/calendars\/(\d+)$/);
        if (calendarIdMatch) {
            const id = calendarIdMatch[1];
            const upstreamUrl = `${upstreamBase}/api/calendars/${id}`;
            const { res, text, contentType } = await proxyGetUpstream(upstreamUrl, apiKey);

            return withCors(
                new Response(text, {
                    status: res.status,
                    headers: { "Content-Type": contentType || "application/json" },
                })
            );
        }

        // NEW: Calendars Lookup proxy
        // GET /calendars/lookup
        if (url.pathname === "/calendars/lookup") {
            const upstreamUrl = `${upstreamBase}/api/calendars/lookup`;
            const { res, text, contentType } = await proxyGetUpstream(upstreamUrl, apiKey);

            return withCors(
                new Response(text, {
                    status: res.status,
                    headers: { "Content-Type": contentType || "application/json" },
                })
            );
        }

        // NEW: Connection All proxy
        // GET /connection/all
        if (url.pathname === "/connection/all") {
            const upstreamUrl = `${upstreamBase}/api/connection/all`;
            const { res, text, contentType } = await proxyGetUpstream(upstreamUrl, apiKey);

            return withCors(
                new Response(text, {
                    status: res.status,
                    headers: { "Content-Type": contentType || "application/json" },
                })
            );
        }

        // NEW: ThirdParty Contacts proxy
        // GET /thirdparty/contacts
        if (url.pathname === "/thirdparty/contacts") {
            const upstreamUrl = `${upstreamBase}/api/thirdparty/contacts`;
            const { res, text, contentType } = await proxyGetUpstream(upstreamUrl, apiKey);

            return withCors(
                new Response(text, {
                    status: res.status,
                    headers: { "Content-Type": contentType || "application/json" },
                })
            );
        }

        // NEW: MIC AccountContactInfo proxy
        // GET /mic/accountcontactinfo
        if (url.pathname === "/mic/accountcontactinfo") {
            const upstreamUrl = `${upstreamBase}/api/mic/accountcontactinfo`;
            const { res, text, contentType } = await proxyGetUpstream(upstreamUrl, apiKey);

            return withCors(
                new Response(text, {
                    status: res.status,
                    headers: { "Content-Type": contentType || "application/json" },
                })
            );
        }

        // Integrations Accounts proxy
        // GET /integrations/accounts (forwards any query params, e.g. hideinactive=true)
        if (url.pathname === "/integrations/accounts") {
            const forwardParams = new URLSearchParams(url.searchParams);
            const upstreamUrl = buildIntegrationsAccountsUrl(upstreamBase, forwardParams);

            if (!upstreamUrl) {
                return json({ ok: false, error: "Invalid upstream URL construction." }, 400);
            }

            const { res, text, contentType } = await proxyGetUpstream(upstreamUrl, apiKey);

            return withCors(
                new Response(text, {
                    status: res.status,
                    headers: { "Content-Type": contentType || "application/json" },
                })
            );
        }

        // RealEstate changes proxy
        // GET /changes?since=<UTC_ISO>&options=<optional>
        if (url.pathname === "/changes") {
            const sinceRaw = url.searchParams.get("since");
            const options = url.searchParams.get("options");

            const candidates = buildUtcSinceCandidates(sinceRaw);
            if (!candidates) {
                return json(
                    {
                        ok: false,
                        error: "Missing/invalid ?since. Example: 2025-12-16T18:24:25Z",
                        received: sinceRaw ?? null,
                    },
                    400
                );
            }

            const attempted = [];

            for (const candidate of candidates) {
                const upstreamUrl =
                    `${upstreamBase}/api/realestate/contacts/getchangessince/${encodeURIComponent(candidate)}` +
                    (options ? `?options=${encodeURIComponent(options)}` : "");

                attempted.push({ candidate, upstreamUrl });

                const { res, text, contentType } = await proxyGetUpstream(upstreamUrl, apiKey);

                if (res.ok) {
                    return withCors(
                        new Response(text, {
                            status: res.status,
                            headers: { "Content-Type": contentType || "application/json" },
                        })
                    );
                }

                let parsed = null;
                try {
                    parsed = text ? JSON.parse(text) : null;
                } catch {
                    parsed = text;
                }

                // Try next datetime format only when it's the upstream DateTime parse issue
                if (res.status === 500 && looksLikeDateTimeFormatException(parsed)) {
                    continue;
                }

                return json(
                    {
                        ok: false,
                        upstreamBase,
                        upstreamUrl,
                        status: res.status,
                        body: parsed,
                        attempted,
                    },
                    res.status
                );
            }

            return json(
                {
                    ok: false,
                    upstreamBase,
                    status: 500,
                    body: { Message: "All datetime formats failed upstream." },
                    attempted,
                },
                500
            );
        }

        return withCors(new Response("Not Found", { status: 404 }));
    },
};
