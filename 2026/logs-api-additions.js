/**
 * LOGS API - Additions for Admin Dashboard
 * Add these endpoints to the existing ber-logs-api worker
 * 
 * Required D1 binding: LOGS_DB (or whatever the existing DB binding is)
 */

const ADMIN_PASSWORD = "BSER1966";

// ==================== HELPERS ====================

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}

function handleCors(request) {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }
    return null;
}

function checkAdminAuth(request) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return false;

    // Expect: "Bearer BSER1966"
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return false;

    return parts[1] === ADMIN_PASSWORD;
}

// ==================== MODIFY EXISTING /api/logs-request ====================

/**
 * Modify the existing POST /api/logs-request handler to also save to the database.
 * Add this at the end of the existing handler, before returning the response:
 */
async function saveLogsRequest(env, data, matched = false) {
    const now = new Date().toISOString();

    await env.LOGS_DB.prepare(`
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
}

// ==================== NEW ADMIN ENDPOINTS ====================

/**
 * GET /api/logs-requests
 * List all LOGS requests with optional filtering
 * Query params: startDate, endDate, limit, offset
 */
async function listLogsRequests(env, searchParams) {
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

    const { results } = await env.LOGS_DB.prepare(sql).bind(...params).all();

    // Parse JSON fields
    const parsed = results.map(row => ({
        ...row,
        drop_memberships: JSON.parse(row.drop_memberships || "[]"),
        change_reasons: JSON.parse(row.change_reasons || "[]"),
    }));

    return json(parsed);
}

/**
 * GET /api/logs-requests/stats
 * Get aggregated statistics for pie charts
 */
async function getLogsStats(env, searchParams) {
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

    // Get all rows for the period to aggregate
    const { results } = await env.LOGS_DB.prepare(`
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

    results.forEach(row => {
        // Count change reasons (can be multiple per submission)
        const reasons = JSON.parse(row.change_reasons || "[]");
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

    return json(stats);
}

/**
 * PATCH /api/logs-requests/:id
 * Update a LOGS request (admin only)
 */
async function updateLogsRequest(request, env, id) {
    if (!checkAdminAuth(request)) {
        return json({ error: "Unauthorized" }, 401);
    }

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
        return json({ error: "No valid fields to update" }, 400);
    }

    params.push(id);

    await env.LOGS_DB.prepare(`
    UPDATE logs_requests SET ${updates.join(", ")} WHERE id = ?
  `).bind(...params).run();

    return json({ success: true });
}

/**
 * DELETE /api/logs-requests/:id
 * Delete a LOGS request (admin only)
 */
async function deleteLogsRequest(request, env, id) {
    if (!checkAdminAuth(request)) {
        return json({ error: "Unauthorized" }, 401);
    }

    await env.LOGS_DB.prepare(`DELETE FROM logs_requests WHERE id = ?`).bind(id).run();

    return json({ success: true });
}

// ==================== ROUTER ADDITIONS ====================

/**
 * Add these routes to the existing worker's fetch handler:
 */
/*
// In the fetch handler, add after existing routes:

if (pathname === "/api/logs-requests" && request.method === "GET") {
  return await listLogsRequests(env, searchParams);
}

if (pathname === "/api/logs-requests/stats" && request.method === "GET") {
  return await getLogsStats(env, searchParams);
}

if (pathname.match(/^\/api\/logs-requests\/\d+$/)) {
  const id = pathname.split("/").pop();
  
  if (request.method === "PATCH") {
    return await updateLogsRequest(request, env, id);
  }
  
  if (request.method === "DELETE") {
    return await deleteLogsRequest(request, env, id);
  }
}

// Also modify the existing POST /api/logs-request handler to call saveLogsRequest()
// at the end before returning the response.
*/

export {
    saveLogsRequest,
    listLogsRequests,
    getLogsStats,
    updateLogsRequest,
    deleteLogsRequest,
    checkAdminAuth,
    ADMIN_PASSWORD
};
