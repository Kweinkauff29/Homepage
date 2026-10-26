import { classifyCoeCourse, normalizeLicenseNumber, parseDbprLine } from "./dbpr.mjs";
import {
    coeEligibility,
    editionIsActive,
    editionLicenseNumber,
    editionSyncsToM1,
    latestCoeDate,
    newGrowthZoneCoeRecord,
} from "./coe.mjs";

const JSON_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
};
const DBPR_CHUNK_BYTES = 2 * 1024 * 1024;
const MAX_LOOKUP_LICENSES = 250;
const MAX_SYNC_RECORDS = 25;

function json(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...JSON_HEADERS, ...extraHeaders },
    });
}

function allowedOrigin(request, env) {
    const origin = request.headers.get("Origin");
    if (!origin) return null;
    try {
        const hostname = new URL(origin).hostname;
        const configured = new URL(env.ALLOWED_ORIGIN).origin;
        if (origin === configured || hostname.endsWith(".ccor-license-checker.pages.dev")) return origin;
        if (hostname === "localhost" || hostname === "127.0.0.1") return origin;
    } catch {
        return null;
    }
    return null;
}

function corsHeaders(request, env) {
    const origin = allowedOrigin(request, env);
    return origin ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
    } : {};
}

function withCors(response, request, env) {
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders(request, env))) headers.set(key, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function readJson(request) {
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 64 * 1024) throw new Error("Request body is too large.");
    return request.json();
}

function publicCoeRecord(row) {
    if (!row) return null;
    const eligibility = coeEligibility(row);
    return {
        licenseNumber: row.license_number,
        dbprName: row.person_name,
        licenseExpirationDate: row.license_expiration_date,
        verifiedDate: row.verified_date,
        verifiedCourseNumber: row.verified_course_number,
        verifiedCourseName: row.verified_course_name,
        reviewDate: row.review_date,
        reviewCourseNumber: row.review_course_number,
        reviewCourseName: row.review_course_name,
        autoEligible: eligibility.eligible,
        eligibilityReason: eligibility.reason,
        cycle: eligibility.cycle ?? null,
    };
}

async function lookupCoe(env, licenseNumber) {
    const normalized = normalizeLicenseNumber(licenseNumber);
    if (!normalized) return null;
    return env.DB.prepare("SELECT * FROM dbpr_coe WHERE license_number = ?").bind(normalized).first();
}

async function lookupCoeMany(env, licenseNumbers) {
    const normalized = [...new Set(licenseNumbers.map(normalizeLicenseNumber).filter(Boolean))];
    const output = new Map();
    for (let offset = 0; offset < normalized.length; offset += 75) {
        const batch = normalized.slice(offset, offset + 75);
        const placeholders = batch.map(() => "?").join(",");
        const result = await env.DB.prepare(
            `SELECT * FROM dbpr_coe WHERE license_number IN (${placeholders})`,
        ).bind(...batch).all();
        for (const row of result.results || []) output.set(row.license_number, row);
    }
    return normalized.map((licenseNumber) => publicCoeRecord(output.get(licenseNumber)) || {
        licenseNumber,
        verifiedDate: null,
        reviewDate: null,
        autoEligible: false,
        eligibilityReason: "no_coe_candidate",
        cycle: null,
    });
}

async function recordAudit(env, values) {
    await env.DB.prepare(
        "INSERT INTO sync_audit (contact_id, license_number, existing_coe_date, dbpr_coe_date, action, reason, upstream_status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(
        values.contactId,
        values.licenseNumber,
        values.existingDate || null,
        values.dbprDate || null,
        values.action,
        values.reason,
        values.upstreamStatus || null,
    ).run();
}

async function syncOneCoe(env, candidate) {
    const contactId = String(candidate?.contactId || "").trim();
    const licenseNumber = normalizeLicenseNumber(candidate?.licenseNumber);
    if (!/^\d+$/.test(contactId) || !licenseNumber) {
        return { contactId, licenseNumber, action: "blocked", reason: "invalid_contact_or_license" };
    }

    const dbprRecord = await lookupCoe(env, licenseNumber);
    const eligibility = coeEligibility(dbprRecord);
    if (!eligibility.eligible) {
        const result = { contactId, licenseNumber, action: "skipped", reason: eligibility.reason };
        await recordAudit(env, { ...result, dbprDate: dbprRecord?.verified_date });
        return result;
    }

    const [edition, current] = await Promise.all([
        env.GZ_REAL_ESTATE.getEditionFields(contactId),
        env.GZ_REAL_ESTATE.getCodeOfEthics(contactId),
    ]);
    if (!edition.ok || !current.ok || !current.data) {
        const status = [edition.status, current.status].find((value) => value >= 400) || 502;
        console.error(JSON.stringify({
            message: "GrowthZone validation read failed",
            editionStatus: edition.status,
            coeStatus: current.status,
        }));
        const result = { contactId, licenseNumber, action: "blocked", reason: "growthzone_read_failed" };
        await recordAudit(env, { ...result, dbprDate: dbprRecord.verified_date, upstreamStatus: status });
        return result;
    }

    if (!editionIsActive(edition.data)) {
        const result = { contactId, licenseNumber, action: "blocked", reason: "growthzone_contact_not_active" };
        await recordAudit(env, { ...result, dbprDate: dbprRecord.verified_date });
        return result;
    }

    if (!editionSyncsToM1(edition.data)) {
        const result = { contactId, licenseNumber, action: "blocked", reason: "growthzone_m1_sync_disabled" };
        await recordAudit(env, { ...result, dbprDate: dbprRecord.verified_date });
        return result;
    }

    const growthZoneLicense = editionLicenseNumber(edition.data);
    if (!growthZoneLicense || growthZoneLicense !== licenseNumber) {
        const result = { contactId, licenseNumber, action: "blocked", reason: "growthzone_license_mismatch" };
        await recordAudit(env, { ...result, dbprDate: dbprRecord.verified_date });
        return result;
    }

    const existingDate = latestCoeDate(current.data.CodeOfEthicsList);
    if (existingDate && existingDate >= dbprRecord.verified_date) {
        const result = { contactId, licenseNumber, action: "skipped", reason: "growthzone_already_current", existingDate };
        await recordAudit(env, { ...result, dbprDate: dbprRecord.verified_date });
        return result;
    }

    const record = newGrowthZoneCoeRecord(dbprRecord, current.data, eligibility.cycle);
    const model = {
        ...current.data,
        CodeOfEthicsList: [...current.data.CodeOfEthicsList, record],
    };
    const saved = await env.GZ_REAL_ESTATE.saveCodeOfEthics(contactId, model);
    if (!saved.ok) {
        const result = { contactId, licenseNumber, action: "blocked", reason: "growthzone_save_failed", existingDate };
        await recordAudit(env, {
            ...result,
            dbprDate: dbprRecord.verified_date,
            upstreamStatus: saved.status,
        });
        return result;
    }

    const savedDate = latestCoeDate(saved.data?.CodeOfEthicsList);
    if (savedDate !== dbprRecord.verified_date) {
        const result = { contactId, licenseNumber, action: "blocked", reason: "growthzone_save_not_verified", existingDate };
        await recordAudit(env, {
            ...result,
            dbprDate: dbprRecord.verified_date,
            upstreamStatus: saved.status,
        });
        return result;
    }

    const result = {
        contactId,
        licenseNumber,
        action: "updated",
        reason: "verified_current_cycle",
        previousDate: existingDate,
        savedDate,
        cycle: eligibility.cycle,
    };
    await recordAudit(env, { ...result, existingDate, dbprDate: dbprRecord.verified_date, upstreamStatus: saved.status });
    return result;
}

const STAGING_UPSERT_SQL = `
INSERT INTO dbpr_coe_staging (
    license_number, license_number_raw, rank, person_name, license_expiration_date,
    verified_date, verified_course_number, verified_course_name, verified_credit_hours,
    review_date, review_course_number, review_course_name, review_credit_hours,
    source_last_modified, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
ON CONFLICT(license_number) DO UPDATE SET
    license_number_raw = excluded.license_number_raw,
    rank = excluded.rank,
    person_name = excluded.person_name,
    license_expiration_date = excluded.license_expiration_date,
    verified_course_number = CASE WHEN excluded.verified_date IS NOT NULL AND (dbpr_coe_staging.verified_date IS NULL OR excluded.verified_date > dbpr_coe_staging.verified_date) THEN excluded.verified_course_number ELSE dbpr_coe_staging.verified_course_number END,
    verified_course_name = CASE WHEN excluded.verified_date IS NOT NULL AND (dbpr_coe_staging.verified_date IS NULL OR excluded.verified_date > dbpr_coe_staging.verified_date) THEN excluded.verified_course_name ELSE dbpr_coe_staging.verified_course_name END,
    verified_credit_hours = CASE WHEN excluded.verified_date IS NOT NULL AND (dbpr_coe_staging.verified_date IS NULL OR excluded.verified_date > dbpr_coe_staging.verified_date) THEN excluded.verified_credit_hours ELSE dbpr_coe_staging.verified_credit_hours END,
    verified_date = CASE WHEN excluded.verified_date IS NOT NULL AND (dbpr_coe_staging.verified_date IS NULL OR excluded.verified_date > dbpr_coe_staging.verified_date) THEN excluded.verified_date ELSE dbpr_coe_staging.verified_date END,
    review_course_number = CASE WHEN excluded.review_date IS NOT NULL AND (dbpr_coe_staging.review_date IS NULL OR excluded.review_date > dbpr_coe_staging.review_date) THEN excluded.review_course_number ELSE dbpr_coe_staging.review_course_number END,
    review_course_name = CASE WHEN excluded.review_date IS NOT NULL AND (dbpr_coe_staging.review_date IS NULL OR excluded.review_date > dbpr_coe_staging.review_date) THEN excluded.review_course_name ELSE dbpr_coe_staging.review_course_name END,
    review_credit_hours = CASE WHEN excluded.review_date IS NOT NULL AND (dbpr_coe_staging.review_date IS NULL OR excluded.review_date > dbpr_coe_staging.review_date) THEN excluded.review_credit_hours ELSE dbpr_coe_staging.review_credit_hours END,
    review_date = CASE WHEN excluded.review_date IS NOT NULL AND (dbpr_coe_staging.review_date IS NULL OR excluded.review_date > dbpr_coe_staging.review_date) THEN excluded.review_date ELSE dbpr_coe_staging.review_date END,
    source_last_modified = excluded.source_last_modified,
    updated_at = CURRENT_TIMESTAMP`;

async function runStatementBatches(env, statements) {
    for (let offset = 0; offset < statements.length; offset += 75) {
        await env.DB.batch(statements.slice(offset, offset + 75));
    }
}

async function enqueueDbprChunk(env, sourceLastModified, sourceLength, cursor) {
    await env.DBPR_REFRESH_QUEUE.send({ sourceLastModified, sourceLength, cursor });
    await env.DB.prepare("UPDATE ingest_state SET queued_at=CURRENT_TIMESTAMP WHERE id=1").run();
}

async function pollDbprSource(env) {
    const head = await fetch(env.DBPR_CSV_URL, {
        method: "HEAD",
        headers: { "Accept-Encoding": "identity", "User-Agent": "CCOR-License-Checker/3.0" },
    });
    if (!head.ok) throw new Error(`DBPR HEAD failed with HTTP ${head.status}.`);
    const sourceLastModified = head.headers.get("Last-Modified") || "unknown";
    const sourceLength = Number(head.headers.get("Content-Length") || 0);
    if (!sourceLength) throw new Error("DBPR did not provide a content length.");

    let state = await env.DB.prepare("SELECT * FROM ingest_state WHERE id=1").first();
    if (state?.source_last_modified === sourceLastModified
        && Number(state?.source_length || 0) === sourceLength
        && state?.status === "complete") {
        await env.DB.prepare("UPDATE ingest_state SET checked_at=CURRENT_TIMESTAMP, last_error=NULL WHERE id=1").run();
        return { status: "current", sourceLastModified };
    }

    if (state?.source_last_modified !== sourceLastModified || Number(state?.source_length || 0) !== sourceLength) {
        await env.DB.batch([
            env.DB.prepare("DELETE FROM dbpr_coe_staging"),
            env.DB.prepare("UPDATE ingest_state SET source_last_modified=?, source_length=?, cursor=0, carry='', status='processing', checked_at=CURRENT_TIMESTAMP, queued_at=NULL, started_at=CURRENT_TIMESTAMP, completed_at=NULL, rows_processed=0, verified_count=0, review_count=0, last_error=NULL WHERE id=1").bind(sourceLastModified, sourceLength),
        ]);
        await enqueueDbprChunk(env, sourceLastModified, sourceLength, 0);
        return { status: "queued", sourceLastModified, sourceLength, cursor: 0 };
    }

    if (state?.status === "error") {
        await env.DB.prepare("UPDATE ingest_state SET status='processing', checked_at=CURRENT_TIMESTAMP, queued_at=NULL, last_error=NULL WHERE id=1").run();
        await enqueueDbprChunk(env, sourceLastModified, sourceLength, Number(state.cursor || 0));
        return { status: "resumed", sourceLastModified, sourceLength, cursor: Number(state.cursor || 0) };
    }

    await env.DB.prepare("UPDATE ingest_state SET checked_at=CURRENT_TIMESTAMP WHERE id=1").run();
    const queuedAt = state?.queued_at ? Date.parse(`${state.queued_at}Z`) : 0;
    if (state?.status === "processing" && (!queuedAt || Date.now() - queuedAt > 5 * 60 * 1000)) {
        await enqueueDbprChunk(env, sourceLastModified, sourceLength, Number(state.cursor || 0));
        return { status: "resumed", sourceLastModified, sourceLength, cursor: Number(state.cursor || 0) };
    }
    return { status: state?.status || "idle", sourceLastModified, sourceLength, cursor: Number(state?.cursor || 0) };
}

async function processDbprChunk(env, message) {
    const sourceLastModified = String(message?.sourceLastModified || "");
    const sourceLength = Number(message?.sourceLength || 0);
    const expectedCursor = Number(message?.cursor || 0);
    const state = await env.DB.prepare("SELECT * FROM ingest_state WHERE id=1").first();
    if (state?.status !== "processing"
        || state?.source_last_modified !== sourceLastModified
        || Number(state?.source_length || 0) !== sourceLength
        || Number(state?.cursor || 0) !== expectedCursor) {
        return { status: "stale", cursor: expectedCursor };
    }

    const start = expectedCursor;
    const end = Math.min(start + DBPR_CHUNK_BYTES - 1, sourceLength - 1);
    const response = await fetch(env.DBPR_CSV_URL, {
        headers: {
            "Accept": "text/csv",
            "Accept-Encoding": "identity",
            "Range": `bytes=${start}-${end}`,
            "User-Agent": "CCOR-License-Checker/3.0",
        },
    });
    if (response.status !== 206) throw new Error(`DBPR range request failed with HTTP ${response.status}.`);

    const chunk = new TextDecoder().decode(await response.arrayBuffer());
    const combined = `${state?.carry || ""}${chunk}`;
    const finalChunk = end >= sourceLength - 1;
    const lastNewline = finalChunk ? combined.length : combined.lastIndexOf("\n");
    if (lastNewline < 0) throw new Error("DBPR chunk did not contain a complete row.");
    const completeText = combined.slice(0, lastNewline);
    const carry = finalChunk ? "" : combined.slice(lastNewline + 1);
    const lines = completeText.split(/\r?\n/).filter(Boolean);
    const statements = [];

    for (const line of lines) {
        const record = parseDbprLine(line);
        const kind = classifyCoeCourse(record);
        if (kind === "not_coe") continue;
        const verified = kind === "verified";
        statements.push(env.DB.prepare(STAGING_UPSERT_SQL).bind(
            record.licenseNumber,
            record.licenseNumberRaw,
            record.rank,
            record.personName,
            record.licenseExpirationDate,
            verified ? record.courseDate : null,
            verified ? record.courseNumber : null,
            verified ? record.courseName : null,
            verified ? record.courseCreditHours : null,
            verified ? null : record.courseDate,
            verified ? null : record.courseNumber,
            verified ? null : record.courseName,
            verified ? null : record.courseCreditHours,
            sourceLastModified,
        ));
    }
    await runStatementBatches(env, statements);

    if (finalChunk) {
        await env.DB.batch([
            env.DB.prepare("DELETE FROM dbpr_coe"),
            env.DB.prepare("INSERT INTO dbpr_coe SELECT * FROM dbpr_coe_staging"),
            env.DB.prepare("DELETE FROM dbpr_coe_staging"),
            env.DB.prepare("UPDATE ingest_state SET cursor=?, carry='', status='complete', queued_at=NULL, completed_at=CURRENT_TIMESTAMP, rows_processed=rows_processed+?, verified_count=(SELECT COUNT(*) FROM dbpr_coe WHERE verified_date IS NOT NULL), review_count=(SELECT COUNT(*) FROM dbpr_coe WHERE review_date IS NOT NULL), last_error=NULL WHERE id=1").bind(sourceLength, lines.length),
        ]);
    } else {
        await env.DB.prepare("UPDATE ingest_state SET cursor=?, carry=?, status='processing', queued_at=NULL, rows_processed=rows_processed+?, last_error=NULL WHERE id=1")
            .bind(end + 1, carry, lines.length)
            .run();
        await enqueueDbprChunk(env, sourceLastModified, sourceLength, end + 1);
    }

    return { status: finalChunk ? "complete" : "processing", cursor: end + 1, sourceLength };
}

async function handleRequest(request, env) {
    const url = new URL(request.url);
    const headers = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
        if (!allowedOrigin(request, env)) return json({ error: "Origin not allowed." }, 403);
        return new Response(null, { status: 204, headers });
    }

    if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true, service: "ccor-license-checker-api" }, 200, headers);
    }

    if (request.method === "GET" && url.pathname === "/api/status") {
        const state = await env.DB.prepare("SELECT source_last_modified, source_length, cursor, status, checked_at, queued_at, started_at, completed_at, rows_processed, verified_count, review_count, last_error FROM ingest_state WHERE id=1").first();
        return json({ ok: true, dbpr: state }, 200, headers);
    }

    if (request.method === "GET" && url.pathname === "/api/verify-license") {
        const number = url.searchParams.get("number") || "";
        const licenseNumber = normalizeLicenseNumber(number);
        if (!licenseNumber) return json({ error: "A license number is required." }, 400, headers);
        const upstreamRequest = new Request(`https://wrapsheet.internal/api/verify-license?number=${encodeURIComponent(number)}`);
        const [upstream, coe] = await Promise.all([
            env.WRAP_SHEET.fetch(upstreamRequest),
            lookupCoe(env, licenseNumber),
        ]);
        const payload = await upstream.json();
        payload.coe = publicCoeRecord(coe);
        return json(payload, upstream.status, headers);
    }

    if (request.method === "POST" && url.pathname === "/api/coe/lookup") {
        if (!allowedOrigin(request, env)) return json({ error: "Origin not allowed." }, 403, headers);
        const body = await readJson(request);
        if (!Array.isArray(body?.licenses) || body.licenses.length > MAX_LOOKUP_LICENSES) {
            return json({ error: `licenses must be an array of at most ${MAX_LOOKUP_LICENSES}.` }, 400, headers);
        }
        return json({ results: await lookupCoeMany(env, body.licenses) }, 200, headers);
    }

    if (request.method === "POST" && url.pathname === "/api/coe/sync") {
        if (!allowedOrigin(request, env)) return json({ error: "Origin not allowed." }, 403, headers);
        return json({
            error: "Direct cloud GrowthZone writes are disabled. Use the signed-in PC/Mac browser helper for confirmed COE uploads.",
            localHelperRequired: true,
        }, 410, headers);
    }

    return json({ error: "Not found." }, 404, headers);
}

export default {
    async fetch(request, env) {
        try {
            return await handleRequest(request, env);
        } catch (error) {
            console.error(JSON.stringify({
                message: "license checker request failed",
                path: new URL(request.url).pathname,
                error: error instanceof Error ? error.message : String(error),
            }));
            return withCors(json({ error: "Internal server error." }, 500), request, env);
        }
    },

    async scheduled(_controller, env, ctx) {
        ctx.waitUntil((async () => {
            try {
                const result = await pollDbprSource(env);
                console.log(JSON.stringify({ message: "DBPR COE refresh", ...result }));
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(JSON.stringify({ message: "DBPR COE refresh failed", error: message }));
                await env.DB.prepare("UPDATE ingest_state SET status='error', last_error=? WHERE id=1").bind(message).run();
            }
        })());
    },
    async queue(batch, env) {
        for (const message of batch.messages) {
            try {
                const result = await processDbprChunk(env, message.body);
                console.log(JSON.stringify({ message: "DBPR COE chunk", ...result }));
                message.ack();
            } catch (error) {
                const text = error instanceof Error ? error.message : String(error);
                console.error(JSON.stringify({ message: "DBPR COE chunk failed", error: text }));
                await env.DB.prepare("UPDATE ingest_state SET queued_at=NULL, last_error=? WHERE id=1").bind(text).run();
                message.retry({ delaySeconds: 30 });
            }
        }
    },
};
