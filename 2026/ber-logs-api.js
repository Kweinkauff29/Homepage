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
const GZ_API_BASE = "https://coconutcoastrealtors.growthzoneapp.com/api";
const GZ_API_KEY = "cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const REALTOR_MEMBERSHIP_NAMES = [
    "primary realtor",
    "designated realtor",
    "secondary realtor",
    "secondary designated realtor",
    "realtor - out of state",
    "secondary designated realtor-out of state"
];

// ============ MEMBER CACHE (Worker Memory Persistence) ============
let contactsCache = null;
let lastSyncTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getGZContacts(env) {
    const now = Date.now();
    if (contactsCache && (now - lastSyncTime < CACHE_TTL)) {
        return contactsCache;
    }

    console.log("Fetching fresh contact list from GrowthZone...");
    // Fetch summary list of all contacts (approx 11,000 records / 7MB)
    // We use top=11000 to get the entire set in one fast request (GZ summary list is fast)
    const data = await gzRequest("/contacts?\$skip=0&\$top=11000");
    const results = data?.Results || [];
    
    if (results.length > 0) {
        contactsCache = results;
        lastSyncTime = now;
        console.log(`Success: Cached ${results.length} members`);
    } else {
        // Fallback if empty
        return contactsCache || [];
    }

    return results;
}

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

        // front-end IDX request form endpoint
        if (pathname === "/api/idx-feed-request" && request.method === "POST") {
            return handleIdxFeedRequest(request, env);
        }

        if (pathname === "/internal/send-email" && request.method === "POST") {
            return handleInternalSendEmail(request, env);
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
              tags,
              contact_balance,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
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
                        row.memberships ?? null,
                        row.tags ?? null,
                        row.contactBalance ?? null
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
            return jsonResponse({ success: false, error: "nrdsId is required" }, 400);
        }

        // Use cached full list for reliable lookup (fixes OData filter issues)
        const allContacts = await getGZContacts(env);
        const match = allContacts.find(c => c.AccountNumber === nrdsId);

        if (!match) {
            return jsonResponse({ success: false, error: "Member not found" }, 404);
        }

        // mapGZContactToMember handles the discrete /moreinfo and /contactinfos fetches
        const member = await mapGZContactToMember(match, env);

        return jsonResponse({ success: true, member });
    } catch (err) {
        console.error(err);
        return jsonResponse({ success: false, error: err.message || "Server error" }, 500);
    }
}

async function handleSearchMembers(request, env) {
    try {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") || "").trim();

        // Use cached full list for reliable autocomplete (fixes OData search issues)
        const allContacts = await getGZContacts(env);
        const term = q.toLowerCase();
        
        const normalizedTerm = normalizeMemberName(term);
        const filtered = allContacts.filter(c => 
            (c.Name && c.Name.toLowerCase().includes(term)) ||
            (c.ContactName && c.ContactName.toLowerCase().includes(term)) ||
            (normalizedTerm && normalizeMemberName(c.Name || c.ContactName).includes(normalizedTerm)) ||
            (c.AccountNumber && c.AccountNumber.includes(term))
        ).slice(0, 20);

        const results = filtered.map(c => ({
            full_name: c.Name || c.ContactName,
            nrds_id: c.AccountNumber || "",
            office_name: c.OrganizationName || "",
            membership_status: c.StatusName || ""
        }));

        return jsonResponse({ success: true, results });
    } catch (err) {
        console.error(err);
        return jsonResponse({ success: false, error: err.message || "Server error" }, 500);
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

        // Validation... (same as before)
        if (!firstName || !lastName || !Array.isArray(dropMemberships) || dropMemberships.length === 0 || !dropWhen || !Array.isArray(changeReasons) || changeReasons.length === 0 || !newBrokerInterested || !needsLetter || !cancelSupra || !hasListings) {
            return jsonResponse({ success: false, error: "All required fields must be completed." }, 400);
        }

        // Fetch all contacts once and perform precise local search
        const allContacts = await getGZContacts(env);
        let contactId = null;
        let matchStatus = "not_matched";

        // 1. Try NRDS match
        if (nrdsId && nrdsId.trim()) {
            const cleanNrds = nrdsId.trim();
            const match = allContacts.find(c => c.AccountNumber === cleanNrds);
            if (match) {
                contactId = match.ContactId;
                matchStatus = "matched_by_nrds";
            }
        }

        // 2. Try Name match if no NRDS match
        if (!contactId) {
            const fullName = `${firstName} ${lastName}`.trim();
            const normalizedFullName = normalizeMemberName(fullName);
            const match = allContacts.find(c => 
                normalizeMemberName(c.Name) === normalizedFullName ||
                normalizeMemberName(c.ContactName) === normalizedFullName
            );
            if (match) {
                contactId = match.ContactId;
                matchStatus = "matched_by_name";
            }
        }

        let member = null;
        let requestStatus = "MEMBER_NOT_FOUND";

        if (contactId) {
            // Use the summary object we already found in our cached list
            const summaryMatch = allContacts.find(c => c.ContactId === contactId);
            
            if (summaryMatch) {
                // mapGZContactToMember will now handle fetching /moreinfo and /contactinfos
                member = await mapGZContactToMember(summaryMatch, env);
                
                // Check Standing
                const tags = (member.tags || "").toLowerCase();
                const balance = parseMoney(member.contact_balance);
                const status = (member.membership_status || "").toLowerCase();
                const coeDate = normalizeDateValue(member.coe_latest_date);

                if (tags.includes("no logs") || tags.includes("nologs") || tags.includes("no-logs")) {
                    requestStatus = "BLOCKED_TAGS";
                } else if (balance > 0.01 || (member.has_active_realtor_membership && member.realtor_membership_paid === false)) { // 1 cent threshold
                    requestStatus = "BLOCKED_BALANCE";
                } else if (status !== "active" || !member.has_active_realtor_membership) {
                    requestStatus = "BLOCKED_STATUS";
                } else if (!coeDate) {
                    requestStatus = "BLOCKED_COE_DATE";
                } else {
                    member.coe_latest_date = coeDate;
                    requestStatus = "SUCCESS";
                }
            }
        }

        // handleLogsRequest continues from here...
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
            requestStatus // Pass status to email
        });

        // Save request to logs_requests table
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
        }, !!member, requestStatus);

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

        // Handle BLOCKED status responses
        if (requestStatus === "BLOCKED_TAGS") {
            return jsonResponse({
                success: false,
                submitted: true, // It was saved/emailed
                errorCode: "BLOCKED_TAGS",
                message: "LOGS cannot be generated. Please contact support@BERealtors.org as there is a hold on your account."
            });
        }

        if (requestStatus === "BLOCKED_BALANCE") {
            const formattedBalance = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(member.contact_balance || 0);
            return jsonResponse({
                success: false,
                submitted: true,
                errorCode: "BLOCKED_BALANCE",
                message: `LOGS cannot be generated since you hold an unpaid balance of ${formattedBalance}. Please contact membership or billing for clarification.`
            });
        }

        if (requestStatus === "BLOCKED_STATUS") {
            return jsonResponse({
                success: false,
                submitted: true,
                errorCode: "BLOCKED_STATUS",
                message: `Your membership status is currently "${member.membership_status}". LOGS can only be generated for Active members. Please contact membership@berealtors.org.`
            });
        }

        if (requestStatus === "BLOCKED_COE_DATE") {
            return jsonResponse({
                success: false,
                submitted: true,
                errorCode: "BLOCKED_COE_DATE",
                message: "LOGS cannot be generated because we could not verify a Code of Ethics completion date in GrowthZone. Please contact membership@berealtors.org."
            });
        }

        // Success: return member so the front end can display the Letter of Good Standing
        return jsonResponse({
            success: true,
            submitted: true,
            member,
            requestStatus
        });
    } catch (err) {
        console.error(err);
        return jsonResponse(
            { success: false, error: err.message || "Server error" },
            500
        );
    }
}

async function handleIdxFeedRequest(request, env) {
    try {
        const body = await request.json();
        const {
            vendorName,
            contactName,
            contactEmail,
            contactPhone,
            bridgeEmail,
            feedType,
            participantName,
            agentNames,
            brokerageName,
            domainName,
            displayType,
            reportContact,
            intendedUse
        } = body || {};

        // Validation
        if (!vendorName || !contactName || !contactEmail || !contactPhone || !feedType || 
            !participantName || !brokerageName || !domainName || !displayType || 
            !reportContact || !intendedUse) {
            return jsonResponse({ success: false, error: "All required fields must be completed." }, 400);
        }

        const db = env.BER_MEMBERS;
        if (!db) {
            console.warn("Database binding BER_MEMBERS is not configured.");
        } else {
            // Save request to idx_requests table
            const now = new Date().toISOString();
            try {
                await db.prepare(`
                    INSERT INTO idx_requests (
                        vendor_name, contact_name, contact_email, contact_phone,
                        bridge_email, feed_type, participant_name, agent_names,
                        brokerage_name, domain_name, display_type, report_contact,
                        intended_use, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    vendorName,
                    contactName,
                    contactEmail,
                    contactPhone,
                    bridgeEmail || "",
                    feedType,
                    participantName,
                    agentNames || "",
                    brokerageName,
                    domainName,
                    displayType,
                    reportContact,
                    intendedUse,
                    now
                ).run();
            } catch (err) {
                console.error("Failed to save IDX request to database:", err);
            }
        }

        // Send Email
        const emailSent = await sendIdxRequestEmail(env, {
            vendorName,
            contactName,
            contactEmail,
            contactPhone,
            bridgeEmail,
            feedType,
            participantName,
            agentNames,
            brokerageName,
            domainName,
            displayType,
            reportContact,
            intendedUse
        });

        return jsonResponse({
            success: true,
            emailSent: !!emailSent,
            message: emailSent
                ? "Your IDX / Broker Back Office data feed request has been submitted successfully."
                : "Your request has been recorded in our database, but the email notification failed. Please use the fallback email option to send a copy to tech@BERealtors.org."
        });
    } catch (err) {
        console.error("handleIdxFeedRequest error:", err);
        return jsonResponse({ success: false, error: err.message || "Server error" }, 500);
    }
}

// ============ NEW: SAVE REQUEST TO DATABASE ============

async function saveLogsRequest(env, data, matched = false, requestStatus = "UNKNOWN") {
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
        has_listings, member_matched, request_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            requestStatus,
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
      SELECT change_reasons, new_broker_interested, needs_letter, cancel_supra, has_listings, request_status, leaving_feedback, other_why, member_matched
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
            requestStatus: {},
            keywords: []
        };

        const allText = [];

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

            // Count status
            const status = row.request_status || (row.member_matched ? "SUCCESS" : "MEMBER_NOT_FOUND");
            stats.requestStatus[status] = (stats.requestStatus[status] || 0) + 1;

            // Collect text for word map
            if (row.leaving_feedback) allText.push(row.leaving_feedback);
            if (row.other_why) allText.push(row.other_why);
        });

        // Generate word map
        stats.keywords = getWordFrequency(allText.join(" "));

        return jsonResponse(stats);
    } catch (err) {
        console.error("getLogsStats error:", err);
        return jsonResponse({ error: err.message }, 500);
    }
}

function getWordFrequency(text) {
    if (!text) return [];

    // Simple stop words list
    const stopWords = new Set([
        "a", "an", "the", "and", "or", "but", "is", "are", "was", "were",
        "of", "in", "on", "at", "to", "from", "with", "by", "for", "about",
        "i", "you", "he", "she", "it", "we", "they", "my", "your", "our", "their",
        "this", "that", "these", "those", "have", "has", "had", "do", "does", "did",
        "can", "could", "will", "would", "should", "not", "no", "yes", "so", "as",
        "if", "when", "where", "why", "how", "all", "any", "some", "none",
        "be", "been", "being", "me", "him", "her", "us", "them", "which", "who",
        "what", "there", "here", "just", "very", "much", "more", "less", "only",
        "than", "then", "now", "also", "too", "etc", "re", "na", "n/a", "none", "nothing"
    ]);

    const words = text
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "") // Remove punctuation
        .split(/\s+/);

    const frequency = {};

    words.forEach(word => {
        if (word.length > 2 && !stopWords.has(word)) { // Filter short words and stop words
            frequency[word] = (frequency[word] || 0) + 1;
        }
    });

    // Sort by count
    return Object.entries(frequency)
        .map(([word, count]) => ({ word, weight: count })) // wordcloud2 expects {word, weight}
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 50); // Return top 50
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
    const subject = `[TEST] LOGS / Membership Change Request – ${form.firstName || ""} ${form.lastName || ""}`.trim();

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

    const text = "[TESTING - GZ API MIGRATION]\n\n" + lines.join("\n");

    const delivery = await dispatchEmail(env, {
        fromEmail,
        fromName: "BER LOGS Requests",
        to: [
            { Email: "Tech@BERealtors.org", Name: "BER Tech" },
            { Email: "Membership@BERealtors.org", Name: "BER Membership" },
            { Email: "CEO@BERealtors.org", Name: "BER CEO" }
        ],
        subject,
        text
    });

    return delivery.success;
}

async function sendIdxRequestEmail(env, data) {
    const fromEmail = env.LOGS_FROM_EMAIL || "no-reply@ccorealtors.org";
    const subject = `IDX / BBO Feed Request: ${data.vendorName} - ${data.brokerageName || data.agentNames || ""}`.trim();
    const text = [
        "A new IDX / Broker Back Office Data Feed access request was submitted:",
        "--------------------------------------------------",
        `Vendor Company Name: ${data.vendorName}`,
        `Contact Name: ${data.contactName}`,
        `Contact Email: ${data.contactEmail}`,
        `Contact Phone: ${data.contactPhone}`,
        `Bridge API Account Email: ${data.bridgeEmail || "N/A"}`,
        `Feed Type Requested: ${data.feedType}`,
        `MLS Participant / Broker Name: ${data.participantName}`,
        `Subscriber or Agent Name(s): ${data.agentNames || "N/A"}`,
        `Brokerage / Office Name: ${data.brokerageName}`,
        `Website Domain(s) / App Name(s): ${data.domainName}`,
        `Display Scope: ${data.displayType}`,
        `Description of Intended Use: ${data.intendedUse}`,
        `Quarterly Reporting Contact: ${data.reportContact}`,
        "",
        "Confirmation: Submitter confirmed that a separate request email will be sent for each new client/user/feed addition.",
    ].join("\n");

    const delivery = await dispatchEmail(env, {
        fromEmail,
        fromName: "BER IDX Requests",
        to: [
            { Email: "Tech@BERealtors.org", Name: "BER Tech" }
        ],
        cc: [
            { Email: data.contactEmail, Name: data.contactName }
        ],
        subject,
        text
    });

    return delivery.success;
}


async function handleInternalSendEmail(request, env) {
    const relayKey = request.headers.get("X-TWS-Mail-Relay-Key");
    if (!env.TWS_MAIL_RELAY_KEY || relayKey !== env.TWS_MAIL_RELAY_KEY) {
        return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    const to = normalizeEmail(body.to);
    const subject = cleanText(body.subject, 180);
    const text = cleanText(body.text, 8000);
    const fromName = cleanText(body.fromName, 120) || "The Wrap Sheet";
    const fromEmail = normalizeEmail(body.fromEmail) || env.LOGS_FROM_EMAIL || "no-reply@ccorealtors.org";

    if (!to || !subject || !text) {
        return jsonResponse({ success: false, error: "to, subject, and text are required" }, 400);
    }

    const delivery = await dispatchEmail(env, {
        fromEmail,
        fromName,
        to: [{ Email: to }],
        subject,
        text
    });

    return jsonResponse(delivery, delivery.success ? 200 : 502);
}

async function dispatchEmail(env, { fromEmail, fromName, to, cc = [], subject, text }) {
    let errors = [];

    // Try SendGrid if configured
    if (env.SENDGRID_API_KEY) {
        console.log("Attempting email dispatch via SendGrid...");
        try {
            const success = await sendSendGridEmail(env, { fromEmail, fromName, to, cc, subject, text });
            if (success) {
                return { success: true, provider: "sendgrid" };
            }
            errors.push("SendGrid delivery failed");
        } catch (e) {
            console.error("SendGrid exception:", e);
            errors.push(`SendGrid exception: ${e.message}`);
        }
    }

    // Try Mailjet if SendGrid not configured or failed
    if (env.MJ_API_KEY && env.MJ_API_SECRET) {
        console.log("Attempting email dispatch via Mailjet...");
        try {
            const success = await sendMailjetEmail(env, { fromEmail, fromName, to, cc, subject, text });
            if (success) {
                return { success: true, provider: "mailjet" };
            }
            errors.push("Mailjet delivery failed");
        } catch (e) {
            console.error("Mailjet exception:", e);
            errors.push(`Mailjet exception: ${e.message}`);
        }
    }

    console.error("All email providers failed to dispatch:", errors.join("; "));
    return { success: false, errors };
}

async function sendSendGridEmail(env, { fromEmail, fromName, to, cc = [], subject, text }) {
    const apiKey = env.SENDGRID_API_KEY;
    
    const toMapped = to.map(t => ({ email: t.Email, name: t.Name || "" }));
    const ccMapped = cc && cc.length ? cc.map(c => ({ email: c.Email, name: c.Name || "" })) : [];

    const personalization = { to: toMapped };
    if (ccMapped.length) {
        personalization.cc = ccMapped;
    }

    const body = {
        personalizations: [personalization],
        from: { email: fromEmail, name: fromName },
        subject: subject,
        content: [{ type: "text/plain", value: text }]
    };

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    console.log("SendGrid response status", res.status, "ok:", res.ok);
    if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("SendGrid rejection error:", res.status, errText);
        return false;
    }

    return true;
}

async function sendMailjetEmail(env, { fromEmail, fromName, to, cc = [], subject, text }) {
    const mjApiKey = env.MJ_API_KEY;
    const mjApiSecret = env.MJ_API_SECRET;

    const auth = "Basic " + btoa(`${mjApiKey}:${mjApiSecret}`);
    const body = {
        Messages: [
            {
                From: {
                    Email: fromEmail,
                    Name: fromName,
                },
                To: to,
                Cc: cc,
                Subject: subject,
                TextPart: text,
            },
        ],
    };

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
        console.error("Mailjet rejection error", res.status, errText);
        return false;
    }

    return true;
}

// ============ HELPERS ============

async function gzRequest(path, method = "GET", body = null) {
    const url = `${GZ_API_BASE}${path}`;
    const options = {
        method,
        headers: {
            "Authorization": `ApiKey ${GZ_API_KEY}`,
            "Content-Type": "application/json",
        },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`GrowthZone API error (${response.status}): ${errText}`);
    }
    return response.json();
}

async function mapGZContactToMember(contact, env) {
    // 1. Fetch "More Info" for custom fields
    let fields = [];
    try {
        const moreInfo = await gzRequest(`/contacts/${contact.ContactId}/moreinfo`);
        fields = moreInfo.Fields || [];
    } catch (e) {
        console.warn(`Could not fetch moreinfo for contact ${contact.ContactId}:`, e);
    }

    // 2. Fetch OrgGeneral for memberships and contact info. The contact summary does not
    // include reliable active/inactive status, and /contactinfos is not available here.
    let orgGeneral = null;
    try {
        orgGeneral = await gzRequest(`/contacts/OrgGeneral/${contact.ContactId}`);
    } catch (e) {
        console.warn(`Could not fetch OrgGeneral for contact ${contact.ContactId}:`, e);
    }

    // 3. Fetch ContactInfos for Address (Summary list doesn't have the full address array)
    let contactInfos = contact.ContactInfos || [];
    if (contactInfos.length === 0 && orgGeneral?.ContactInfos?.length) {
        contactInfos = orgGeneral.ContactInfos;
    }
    if (contactInfos.length === 0) {
        try {
            contactInfos = await gzRequest(`/contacts/${contact.ContactId}/contactinfos`);
        } catch (e) {
            console.warn(`Could not fetch contactinfos for contact ${contact.ContactId}:`, e);
        }
    }

    function getField(id) {
        return fields.find(f => f.CustomFieldId === id || f.Id === id)?.Value || "";
    }

    function getFieldByName(patterns) {
        const match = fields.find(f => {
            const name = `${f.DisplayName || ""} ${f.Name || ""}`.toLowerCase();
            return patterns.every(pattern => name.includes(pattern));
        });
        return match?.Value || "";
    }

    const uploadedMember = await getUploadedMember(env, contact);

    const memberships = Array.isArray(orgGeneral?.Memberships) ? orgGeneral.Memberships : [];
    const primaryOrganization = Array.isArray(orgGeneral?.Organizations)
        ? orgGeneral.Organizations.find(org => org.IsPrimary) || orgGeneral.Organizations[0]
        : null;
    const activeRealtorMembership = memberships.find(isActiveRealtorMembership);
    const realtorMemberships = memberships.filter(isRealtorMembership);
    const membershipStatus = activeRealtorMembership ? "Active" : (realtorMemberships[0]?.SummaryDescription || contact.StatusName || "");
    const membershipNames = memberships.map(m => m.Name).filter(Boolean).join(", ");
    const membershipBalance = memberships.reduce((total, membership) => total + parseMoney(membership.Balance), 0);
    const contactBalance = parseMoney(contact.Balance) + membershipBalance;
    const coeLatestDate = normalizeDateValue(
        getFieldByName(["code", "ethic"]) ||
        getFieldByName(["coe"]) ||
        contact.CodeOfEthicsLatestDate ||
        contact.CodeOfEthicsDate ||
        contact.CoeLatestDate ||
        contact.COECompletionDate ||
        uploadedMember?.coe_latest_date
    );

    // 4. Extract address
    let addr1 = "";
    let addr2 = "";
    if (contactInfos && contactInfos.length) {
        const primaryAddr = contactInfos.find(i => i.Type === 3 && i.IsPrimary) || contactInfos.find(i => i.Type === 3);
        if (primaryAddr && primaryAddr.Value) {
            const parts = formatAddressLines(primaryAddr.Value);
            addr1 = parts[0] || "";
            addr2 = parts.slice(1).join("\n") || "";
        }
    }

    return {
        contact_id: contact.ContactId,
        nrds_id: getField(58303) || contact.AccountNumber || "",
        full_name: contact.Name || contact.ContactName,
        contact_type: contact.SystemContactTypeId === 1 ? "Individual" : "Company",
        membership_status: membershipStatus || "Unknown",
        has_active_realtor_membership: !!activeRealtorMembership,
        realtor_membership_paid: activeRealtorMembership ? activeRealtorMembership.IsRenewalPaid !== false : false,
        office_name: contact.OrganizationName || primaryOrganization?.Name || "",
        coe_latest_date: coeLatestDate,
        fair_housing_latest_date: "", // Field ID TBD
        primary_address1: addr1,
        primary_address2: addr2,
        memberships: membershipNames || contact.MembershipStatus || "",
        tags: uploadedMember?.tags || getField(70615),
        contact_balance: contactBalance,
    };
}

async function getUploadedMember(env, contact) {
    const db = env?.BER_MEMBERS;
    if (!db) return null;

    const contactId = contact?.ContactId;
    const nrdsId = contact?.AccountNumber;
    const fullName = normalizeMemberName(contact?.Name || contact?.ContactName);

    try {
        if (contactId) {
            const row = await db.prepare(
                `SELECT contact_id, nrds_id, full_name, coe_latest_date, tags
                 FROM members
                 WHERE CAST(contact_id AS TEXT) = ?
                 LIMIT 1`
            ).bind(String(contactId)).first();
            if (row) return row;
        }

        if (nrdsId) {
            const row = await db.prepare(
                `SELECT contact_id, nrds_id, full_name, coe_latest_date, tags
                 FROM members
                 WHERE nrds_id = ?
                 LIMIT 1`
            ).bind(String(nrdsId)).first();
            if (row) return row;
        }

        if (fullName) {
            const { results } = await db.prepare(
                `SELECT contact_id, nrds_id, full_name, coe_latest_date, tags
                 FROM members
                 WHERE full_name IS NOT NULL`
            ).all();
            return (results || []).find(row => normalizeMemberName(row.full_name) === fullName) || null;
        }
    } catch (e) {
        console.warn(`Could not fetch uploaded member row for contact ${contact?.ContactId}:`, e);
    }

    return null;
}

function isRealtorMembership(membership) {
    const name = String(membership?.Name || membership?.Type || "").toLowerCase();
    const normalized = name.replace(/[®]/g, "").replace(/\s+/g, " ").trim();
    return REALTOR_MEMBERSHIP_NAMES.some(type => normalized.includes(type));
}

function normalizeMemberName(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[.,]/g, " ")
        .replace(/\b(p\s*a|pa|pllc|llc|inc|corp|corporation|realtor|realtors)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isActiveRealtorMembership(membership) {
    if (!isRealtorMembership(membership)) return false;
    if (membership.IsInactive === true || membership.InActive === true) return false;
    if (membership.EndDate) return false;
    if (membership.Status && String(membership.Status).toLowerCase() !== "active") return false;
    if (membership.MembershipStatusTypeId && Number(membership.MembershipStatusTypeId) !== 2) return false;
    return true;
}

function parseMoney(value) {
    if (value == null || value === "") return 0;
    const n = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
}

function normalizeDateValue(value) {
    if (value == null || value === "") return "";
    if (typeof value === "number") return value;

    const str = String(value).trim();
    if (!str) return "";

    if (/^\d+(\.\d+)?$/.test(str)) return str;

    const d = new Date(str);
    if (!Number.isNaN(d.getTime())) return d.toISOString();

    return str;
}

function formatAddressLines(value) {
    const raw = String(value || "").replace(/\r/g, "").trim();
    if (!raw) return [];

    const explicit = raw.split("\n").map(part => part.trim()).filter(Boolean);
    if (explicit.length > 1) return explicit;

    const compact = raw.replace(/\s+/g, " ");
    const match = compact.match(/^(.+\b(?:St|Street|Ave|Avenue|Blvd\.?|Boulevard|Cir|Circle|Dr|Drive|Ln|Lane|Rd|Road|Ct|Court|Way|Pkwy|Parkway|Trail|Trl|Pl|Place|Ter|Terrace|Hwy|Highway)(?:\s+(?:N|S|E|W|NE|NW|SE|SW)\.?)?(?:\s+(?:Apt|Apartment|Unit|Ste\.?|Suite|#)\s*[\w-]+)?)\s+(.+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);
    if (!match) return [compact];

    return [match[1].trim(), `${match[2].trim()}, ${match[3].toUpperCase()} ${match[4]}`];
}

function cleanText(value, max = 500) {
    if (value == null) return "";
    return String(value).replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

function normalizeEmail(value) {
    const email = cleanText(value, 254).toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function jsonResponse(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
        },
    });
}

function safeJsonParse(data, fallback = []) {
    try {
        return typeof data === "string" ? JSON.parse(data) : (data || fallback);
    } catch {
        return fallback;
    }
}
