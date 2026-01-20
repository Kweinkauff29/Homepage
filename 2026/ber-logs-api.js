/**
 * BER LOGS API Worker
 * 
 * Existing endpoints:
 * - POST /api/upload-members - Upload member data
 * - GET /api/member - Get member by NRDS
 * - GET /api/search-members - Search members
 * - POST /api/logs-request - Submit LOGS request
 * 
 * NEW Admin endpoints:
 * - GET /api/logs-requests - List all submissions
 * - GET /api/logs-requests/stats - Get aggregated stats
 * - PATCH /api/logs-requests/:id - Update a submission
 * - DELETE /api/logs-requests/:id - Delete a submission
 */

const ADMIN_PASSWORD = "BSER1966";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const pathname = url.pathname.replace(/\/+/g, "/"); // normalize // -> /
        const searchParams = url.searchParams;

        // CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS_HEADERS });
        }

        // ============ EXISTING ENDPOINTS ============

        if (pathname === "/api/upload-members" && request.method === "POST") {
            return handleUploadMembers(request, env);
        }

        if (pathname === "/api/member" && request.method === "GET") {
            return handleGetMember(request, env);
        }

        if (pathname === "/api/search-members" && request.method === "GET") {
            return handleSearchMembers(request, env);
        }

        // front-end LOGS request form endpoint
        if (pathname === "/api/logs-request" && request.method === "POST") {
            return handleLogsRequest(request, env);
        }

        // ============ NEW ADMIN ENDPOINTS ============

        if (pathname === "/api/logs-requests" && request.method === "GET") {
            return listLogsRequests(env, searchParams);
        }

        if (pathname === "/api/logs-requests/stats" && request.method === "GET") {
            return getLogsStats(env, searchParams);
        }

        // Match /api/logs-requests/:id
        const logsRequestMatch = pathname.match(/^\/api\/logs-requests\/(\d+)$/);
        if (logsRequestMatch) {
            const id = logsRequestMatch[1];

            if (request.method === "PATCH") {
                return updateLogsRequest(request, env, id);
            }

            if (request.method === "DELETE") {
                return deleteLogsRequest(request, env, id);
            }
        }

        return new Response("Not found", {
            status: 404,
            headers: CORS_HEADERS,
        });
    },
};

// ============ EXISTING HANDLERS ============

async function handleUploadMembers(request, env) {
    try {
        const body = await request.json();
        const { adminKey, rows } = body || {};

        if (!adminKey || adminKey !== env.ADMIN_UPLOAD_KEY) {
            return jsonResponse({ success: false, error: "Unauthorized" }, 401);
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            return jsonResponse({ success: false, error: "No rows provided" }, 400);
        }

        const db = env.BER_MEMBERS;
        if (!db) {
            return jsonResponse(
                { success: false, error: "Database binding BER_MEMBERS is not configured." },
                500
            );
        }

        // Clear existing
        await db.exec("DELETE FROM members;");

        const statements = [];

        for (const row of rows) {
            statements.push(
                db
                    .prepare(
                        `INSERT OR REPLACE INTO members (
              contact_id,
              nrds_id,
              full_name,
              contact_type,
              membership_status,
              office_name,
              coe_latest_date,
              primary_address1,
              primary_address2,
              memberships,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
                    )
                    .bind(
                        row.contactId ?? null,
                        row.nrdsId ?? null,
                        row.fullName ?? null,
                        row.contactType ?? null,
                        row.membershipStatus ?? null,
                        row.officeName ?? null,
                        row.coeLatestDate ?? null,
                        row.primaryAddress1 ?? null,
                        row.primaryAddress2 ?? null,
                        row.memberships ?? null
                    )
            );
        }

        await db.batch(statements);

        return jsonResponse({ success: true, inserted: rows.length });
    } catch (err) {
        console.error(err);
        return jsonResponse(
            { success: false, error: err.message || "Server error" },
            500
        );
    }
}

async function handleGetMember(request, env) {
    try {
        const url = new URL(request.url);
        const nrdsId = url.searchParams.get("nrdsId");

        if (!nrdsId) {
            return jsonResponse(
                { success: false, error: "nrdsId is required" },
                400
            );
        }

        const db = env.BER_MEMBERS;
        if (!db) {
            return jsonResponse(
                { success: false, error: "Database binding BER_MEMBERS is not configured." },
                500
            );
        }

        const { results } = await db
            .prepare("SELECT * FROM members WHERE nrds_id = ? LIMIT 1")
            .bind(nrdsId)
            .all();

        if (!results || results.length === 0) {
            return jsonResponse(
                { success: false, error: "Member not found" },
                404
            );
        }

        const member = results[0];
        return jsonResponse({ success: true, member });
    } catch (err) {
        console.error(err);
        return jsonResponse(
            { success: false, error: err.message || "Server error" },
            500
        );
    }
}

async function handleSearchMembers(request, env) {
    try {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") || "").trim();

        // Require at least 3 chars; front end enforces this too
        if (q.length < 3) {
            return jsonResponse({ success: true, results: [] });
        }

        const db = env.BER_MEMBERS;
        if (!db) {
            return jsonResponse(
                { success: false, error: "Database binding BER_MEMBERS is not configured." },
                500
            );
        }

        const like = `%${q}%`;

        const { results } = await db
            .prepare(
                `SELECT full_name, nrds_id, office_name, membership_status
         FROM members
         WHERE full_name LIKE ?
         ORDER BY full_name
         LIMIT 20`
            )
            .bind(like)
            .all();

        return jsonResponse({ success: true, results: results || [] });
    } catch (err) {
        console.error(err);
        return jsonResponse(
            { success: false, error: err.message || "Server error" },
            500
        );
    }
}

/**
 * Handle Letter of Good Standing request form.
 * - Validates required fields
 * - Tries to match member by NRDS or First+Last
 * - Emails Tech + Membership with full request details
 * - Saves request to logs_requests table (NEW)
 * - Returns member on success so front end can build the letter
 */
async function handleLogsRequest(request, env) {
    try {
        const body = await request.json();
        const {
            firstName,
            lastName,
            organization,
            nrdsId,
            dropMemberships,
            dropWhen,
            leavingFeedback,
            otherWhy,
            changeReasons,
            newContact,
            newBrokerInterested,
            needsLetter,
            cancelSupra,
            hasListings,
        } = body || {};

        // Basic validation (front-end should also enforce)
        if (!firstName || !lastName) {
            return jsonResponse(
                { success: false, error: "First and last name are required." },
                400
            );
        }
        if (!Array.isArray(dropMemberships) || dropMemberships.length === 0) {
            return jsonResponse(
                { success: false, error: "At least one membership to drop is required." },
                400
            );
        }
        if (!dropWhen) {
            return jsonResponse(
                { success: false, error: "Drop timing is required." },
                400
            );
        }
        if (!Array.isArray(changeReasons) || changeReasons.length === 0) {
            return jsonResponse(
                { success: false, error: "At least one change reason is required." },
                400
            );
        }
        if (!newBrokerInterested || !needsLetter || !cancelSupra || !hasListings) {
            return jsonResponse(
                { success: false, error: "Please complete all required questions." },
                400
            );
        }

        const db = env.BER_MEMBERS;
        let member = null;
        let matchStatus = "not_searched";

        if (db) {
            if (nrdsId && nrdsId.trim()) {
                const { results } = await db
                    .prepare("SELECT * FROM members WHERE nrds_id = ? LIMIT 1")
                    .bind(nrdsId.trim())
                    .all();
                if (results && results.length) {
                    member = results[0];
                    matchStatus = "matched_by_nrds";
                } else {
                    matchStatus = "nrds_not_found";
                }
            } else {
                const fullName = `${firstName.trim()} ${lastName.trim()}`;
                const { results } = await db
                    .prepare(
                        "SELECT * FROM members WHERE full_name = ? COLLATE NOCASE LIMIT 1"
                    )
                    .bind(fullName)
                    .all();
                if (results && results.length) {
                    member = results[0];
                    matchStatus = "matched_by_name";
                } else {
                    matchStatus = "name_not_found";
                }
            }
        } else {
            matchStatus = "db_not_configured";
        }

        // Save request to logs_requests table (NEW)
        await saveLogsRequest(env, {
            firstName,
            lastName,
            organization,
            nrdsId,
            dropMemberships,
            dropWhen,
            leavingFeedback,
            otherWhy,
            changeReasons,
            newContact,
            newBrokerInterested,
            needsLetter,
            cancelSupra,
            hasListings,
        }, !!member);

        // Always email staff with the request (success or not)
        await sendLogsRequestEmail(env, {
            form: {
                firstName,
                lastName,
                organization,
                nrdsId,
                dropMemberships,
                dropWhen,
                leavingFeedback,
                otherWhy,
                changeReasons,
                newContact,
                newBrokerInterested,
                needsLetter,
                cancelSupra,
                hasListings,
            },
            member,
            matchStatus,
        });

        if (!member) {
            const fullName = `${firstName || ""} ${lastName || ""}`.trim();
            return jsonResponse({
                success: false,
                submitted: true,
                errorCode: "MEMBER_NOT_FOUND",
                message:
                    `We submitted your request, but could not automatically locate a member record for "${fullName}". ` +
                    `Please double-check that your name matches exactly as it appears in our MLS (just first and last name) ` +
                    `or provide your NRDS ID. If you still have trouble, please contact support@berealtors.org.`,
            });
        }

        // Success: return member so the front end can display the Letter of Good Standing
        return jsonResponse({
            success: true,
            submitted: true,
            member,
        });
    } catch (err) {
        console.error(err);
        return jsonResponse(
            { success: false, error: err.message || "Server error" },
            500
        );
    }
}

// ============ NEW: SAVE REQUEST TO DATABASE ============

async function saveLogsRequest(env, data, matched = false) {
    const db = env.BER_MEMBERS;
    if (!db) {
        console.warn("Cannot save logs request: BER_MEMBERS not configured");
        return;
    }

    const now = new Date().toISOString();

    try {
        await db.prepare(`
      INSERT INTO logs_requests (
        first_name, last_name, organization, nrds_id,
        drop_memberships, drop_when, leaving_feedback,
        change_reasons, other_why, new_contact,
        new_broker_interested, needs_letter, cancel_supra,
        has_listings, member_matched, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
            data.firstName || "",
            data.lastName || "",
            data.organization || "",
            data.nrdsId || "",
            JSON.stringify(data.dropMemberships || []),
            data.dropWhen || "",
            data.leavingFeedback || "",
            JSON.stringify(data.changeReasons || []),
            data.otherWhy || "",
            data.newContact || "",
            data.newBrokerInterested || "",
            data.needsLetter || "",
            data.cancelSupra || "",
            data.hasListings || "",
            matched ? 1 : 0,
            now
        ).run();
    } catch (err) {
        console.error("Failed to save logs request:", err);
    }
}

// ============ NEW: ADMIN ENDPOINTS ============

function checkAdminAuth(request) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return false;

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return false;

    return parts[1] === ADMIN_PASSWORD;
}

async function listLogsRequests(env, searchParams) {
    const db = env.BER_MEMBERS;
    if (!db) {
        return jsonResponse({ error: "Database not configured" }, 500);
    }

    let sql = `
    SELECT id, first_name, last_name, organization, nrds_id,
           drop_memberships, drop_when, leaving_feedback,
           change_reasons, other_why, new_contact,
           new_broker_interested, needs_letter, cancel_supra,
           has_listings, member_matched, created_at
    FROM logs_requests
    WHERE 1=1
  `;
    const params = [];

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (startDate) {
        sql += ` AND created_at >= ?`;
        params.push(startDate);
    }
    if (endDate) {
        sql += ` AND created_at <= ?`;
        params.push(endDate + "T23:59:59");
    }

    sql += ` ORDER BY created_at DESC`;

    const limit = Math.min(parseInt(searchParams.get("limit") || "500"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    try {
        const { results } = await db.prepare(sql).bind(...params).all();

        // Parse JSON fields
        const parsed = (results || []).map(row => ({
            ...row,
            drop_memberships: safeJsonParse(row.drop_memberships, []),
            change_reasons: safeJsonParse(row.change_reasons, []),
        }));

        return jsonResponse(parsed);
    } catch (err) {
        console.error("listLogsRequests error:", err);
        return jsonResponse({ error: err.message }, 500);
    }
}

async function getLogsStats(env, searchParams) {
    const db = env.BER_MEMBERS;
    if (!db) {
        return jsonResponse({ error: "Database not configured" }, 500);
    }

    let whereClause = "WHERE 1=1";
    const params = [];

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (startDate) {
        whereClause += ` AND created_at >= ?`;
        params.push(startDate);
    }
    if (endDate) {
        whereClause += ` AND created_at <= ?`;
        params.push(endDate + "T23:59:59");
    }

    try {
        const { results } = await db.prepare(`
      SELECT change_reasons, new_broker_interested, needs_letter, cancel_supra, has_listings
      FROM logs_requests ${whereClause}
    `).bind(...params).all();

        // Aggregate stats
        const stats = {
            total: results.length,
            changeReasons: {},
            newBrokerInterested: {},
            needsLetter: {},
            cancelSupra: {},
            hasListings: {},
        };

        (results || []).forEach(row => {
            // Count change reasons (can be multiple per submission)
            const reasons = safeJsonParse(row.change_reasons, []);
            reasons.forEach(r => {
                stats.changeReasons[r] = (stats.changeReasons[r] || 0) + 1;
            });

            // Count single-value fields
            const nbi = row.new_broker_interested || "N/A";
            stats.newBrokerInterested[nbi] = (stats.newBrokerInterested[nbi] || 0) + 1;

            const nl = row.needs_letter || "N/A";
            stats.needsLetter[nl] = (stats.needsLetter[nl] || 0) + 1;

            const cs = row.cancel_supra || "N/A";
            stats.cancelSupra[cs] = (stats.cancelSupra[cs] || 0) + 1;

            const hl = row.has_listings || "N/A";
            stats.hasListings[hl] = (stats.hasListings[hl] || 0) + 1;
        });

        return jsonResponse(stats);
    } catch (err) {
        console.error("getLogsStats error:", err);
        return jsonResponse({ error: err.message }, 500);
    }
}

async function updateLogsRequest(request, env, id) {
    if (!checkAdminAuth(request)) {
        return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const db = env.BER_MEMBERS;
    if (!db) {
        return jsonResponse({ error: "Database not configured" }, 500);
    }

    try {
        const body = await request.json();
        const updates = [];
        const params = [];

        const allowedFields = [
            "first_name", "last_name", "organization", "nrds_id",
            "drop_memberships", "drop_when", "leaving_feedback",
            "change_reasons", "other_why", "new_contact",
            "new_broker_interested", "needs_letter", "cancel_supra", "has_listings"
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates.push(`${field} = ?`);
                // JSON stringify arrays
                if (field === "drop_memberships" || field === "change_reasons") {
                    params.push(JSON.stringify(body[field]));
                } else {
                    params.push(body[field]);
                }
            }
        }

        if (!updates.length) {
            return jsonResponse({ error: "No valid fields to update" }, 400);
        }

        params.push(id);

        await db.prepare(`
      UPDATE logs_requests SET ${updates.join(", ")} WHERE id = ?
    `).bind(...params).run();

        return jsonResponse({ success: true });
    } catch (err) {
        console.error("updateLogsRequest error:", err);
        return jsonResponse({ error: err.message }, 500);
    }
}

async function deleteLogsRequest(request, env, id) {
    if (!checkAdminAuth(request)) {
        return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const db = env.BER_MEMBERS;
    if (!db) {
        return jsonResponse({ error: "Database not configured" }, 500);
    }

    try {
        await db.prepare(`DELETE FROM logs_requests WHERE id = ?`).bind(id).run();
        return jsonResponse({ success: true });
    } catch (err) {
        console.error("deleteLogsRequest error:", err);
        return jsonResponse({ error: err.message }, 500);
    }
}

// ============ EMAIL ============

async function sendLogsRequestEmail(env, payload) {
    const { form, member, matchStatus } = payload;

    const fromEmail = env.LOGS_FROM_EMAIL || "no-reply@ccorealtors.org";
    const mjApiKey = env.MJ_API_KEY;
    const mjApiSecret = env.MJ_API_SECRET;

    if (!mjApiKey || !mjApiSecret) {
        console.error("Mailjet API key/secret not set in environment");
        return false;
    }

    const lines = [
        "A new Letter of Good Standing / membership change request was submitted:",
        "",
        `Name: ${form.firstName || ""} ${form.lastName || ""}`,
        `Organization: ${form.organization || "(none given)"}`,
        `NRDS entered: ${form.nrdsId || "(none)"}`,
        "",
        `Drop membership(s): ${(form.dropMemberships || []).join(", ") || "(none selected)"}`,
        `When to drop: ${form.dropWhen || "(not provided)"}`,
        "",
        `Change reason(s): ${(form.changeReasons || []).join(", ") || "(none selected)"}`,
        `Other (why): ${form.otherWhy || "(not provided)"}`,
        "",
        `Feedback (if leaving for another association): ${form.leavingFeedback || "(not provided)"}`,
        `New contact (if changing brokers/boards): ${form.newContact || "(not provided)"}`,
        "",
        `New broker interested in secondary membership: ${form.newBrokerInterested || "(not given)"}`,
        `Needs Letter of Good Standing: ${form.needsLetter || "(not given)"}`,
        `Cancel Supra eKey: ${form.cancelSupra || "(not given)"}`,
        `Listings to transfer: ${form.hasListings || "(not given)"}`,
        "",
        `Member match status: ${member ? "FOUND" : "NOT FOUND"} (${matchStatus})`,
    ];

    if (member) {
        lines.push(
            "",
            "Matched member record:",
            `  NRDS: ${member.nrds_id || ""}`,
            `  Full name: ${member.full_name || ""}`,
            `  Memberships: ${member.memberships || ""}`,
            `  Office: ${member.office_name || ""}`,
            `  Status: ${member.membership_status || ""}`
        );
    }

    const text = lines.join("\n");
    const subject =
        `LOGS / Membership Change Request – ${form.firstName || ""} ${form.lastName || ""}`.trim() ||
        "LOGS / Membership Change Request";

    // Mailjet Send API v3.1 – HTTP Basic auth
    const auth = "Basic " + btoa(`${mjApiKey}:${mjApiSecret}`);

    const body = {
        Messages: [
            {
                From: {
                    Email: fromEmail,
                    Name: "BER LOGS Requests",
                },
                To: [
                    { Email: "Tech@BERealtors.org", Name: "BER Tech" },
                    { Email: "Membership@BERealtors.org", Name: "BER Membership" },
                    { Email: "CEO@BERealtors.org", Name: "BER CEO" }
                ],
                Subject: subject,
                TextPart: text,
            },
        ],
    };

    console.log("Sending LOGS email via Mailjet from", fromEmail);

    const res = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: auth,
        },
        body: JSON.stringify(body),
    });

    console.log("Mailjet response status", res.status, "ok:", res.ok);

    if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("Mailjet error", res.status, errText);
        return false;
    }

    return true;
}

// ============ HELPERS ============

function jsonResponse(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
        },
    });
}

function safeJsonParse(str, fallback = []) {
    try {
        return JSON.parse(str) || fallback;
    } catch {
        return fallback;
    }
}
