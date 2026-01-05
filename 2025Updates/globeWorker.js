/**
 * Globe Pins Cloudflare Worker with D1 Database
 * 
 * Requires a D1 database binding named "DB" in your wrangler.toml:
 * 
 * [[d1_databases]]
 * binding = "DB"
 * database_name = "globe-pins"
 * database_id = "<your-database-id>"
 * 
 * Create the table with this SQL:
 * CREATE TABLE IF NOT EXISTS pins (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   name TEXT NOT NULL UNIQUE COLLATE NOCASE,
 *   city TEXT NOT NULL,
 *   lat REAL NOT NULL,
 *   lng REAL NOT NULL,
 *   created_at TEXT DEFAULT (datetime('now'))
 * );
 */

const CORS_HEADERS = {
    // You can tighten this to "https://bonitaesterorealtors.com" in production
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

/**
 * Initialize the pins table if it doesn't exist
 */
async function ensureTable(db) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS pins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE COLLATE NOCASE,
            city TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `).run();
}

/**
 * Get all pins from D1 database
 */
async function getPins(db) {
    try {
        const result = await db.prepare(
            "SELECT id, name, city, lat, lng, created_at FROM pins ORDER BY created_at ASC"
        ).all();
        return result.results || [];
    } catch (err) {
        console.error("Error fetching pins:", err);
        return [];
    }
}

/**
 * Add a new pin to D1 database
 * Returns the newly created pin or throws if name already exists
 */
async function addPin(db, name, city, lat, lng) {
    const stmt = await db.prepare(
        "INSERT INTO pins (name, city, lat, lng) VALUES (?, ?, ?, ?)"
    ).bind(name, city, lat, lng);

    const result = await stmt.run();

    if (!result.success) {
        throw new Error("Failed to insert pin");
    }

    return { id: result.meta.last_row_id, name, city, lat, lng };
}

/**
 * Check if a name already has a pin (case-insensitive)
 */
async function findPinByName(db, name) {
    const result = await db.prepare(
        "SELECT id, name, city, lat, lng FROM pins WHERE LOWER(name) = LOWER(?)"
    ).bind(name).first();
    return result || null;
}

export default {
    async fetch(request, env) {
        // Handle CORS preflight early
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS_HEADERS });
        }

        try {
            // Check if D1 database is bound
            if (!env.GLOBE) {
                console.error("D1 database not bound! Add [[d1_databases]] to wrangler.toml");
                return new Response(
                    JSON.stringify({
                        error: "database_not_configured",
                        message: "Database is not configured. Please bind a D1 database."
                    }),
                    {
                        status: 500,
                        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
                    }
                );
            }

            // Ensure the table exists (runs only once effectively)
            await ensureTable(env.GLOBE);

            const url = new URL(request.url);
            const path = url.pathname;

            // GET /pins - Retrieve all pins
            if (path === "/pins" && request.method === "GET") {
                const pins = await getPins(env.GLOBE);
                return new Response(JSON.stringify(pins), {
                    status: 200,
                    headers: {
                        ...CORS_HEADERS,
                        "Content-Type": "application/json",
                        "Cache-Control": "no-cache"
                    }
                });
            }

            // POST /pins - Add a new pin
            if (path === "/pins" && request.method === "POST") {
                let body;
                try {
                    body = await request.json();
                } catch {
                    return new Response(
                        JSON.stringify({
                            error: "invalid_json",
                            message: "Invalid JSON body"
                        }),
                        {
                            status: 400,
                            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
                        }
                    );
                }

                let { name, city, lat, lng } = body || {};

                // Validate required fields
                if (
                    !name ||
                    !city ||
                    typeof lat !== "number" ||
                    typeof lng !== "number"
                ) {
                    return new Response(
                        JSON.stringify({
                            error: "invalid_data",
                            message: "name, city, lat, lng are required"
                        }),
                        {
                            status: 400,
                            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
                        }
                    );
                }

                name = String(name).trim();
                city = String(city).trim();

                // Check if name already has a pin
                const existingPin = await findPinByName(env.GLOBE, name);
                if (existingPin) {
                    return new Response(
                        JSON.stringify({
                            error: "name_exists",
                            message: `The name "${existingPin.name}" already has a pin. Each name can only place one pin.`
                        }),
                        {
                            status: 409,
                            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
                        }
                    );
                }

                // Insert the new pin
                try {
                    await addPin(env.GLOBE, name, city, lat, lng);
                } catch (err) {
                    // Handle unique constraint violation (race condition fallback)
                    if (err.message && err.message.includes("UNIQUE constraint failed")) {
                        return new Response(
                            JSON.stringify({
                                error: "name_exists",
                                message: `The name "${name}" already has a pin. Each name can only place one pin.`
                            }),
                            {
                                status: 409,
                                headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
                            }
                        );
                    }
                    throw err;
                }

                // Return the updated list of all pins
                const allPins = await getPins(env.GLOBE);
                return new Response(
                    JSON.stringify({ ok: true, pins: allPins }),
                    {
                        status: 200,
                        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
                    }
                );
            }

            // Fallback - not found
            return new Response("Not found", {
                status: 404,
                headers: CORS_HEADERS
            });

        } catch (err) {
            // Catch any unexpected error so we still send CORS headers
            console.error("Worker error:", err);
            return new Response(
                JSON.stringify({
                    error: "internal_error",
                    message: "Unexpected error in pins worker.",
                    details: err.message
                }),
                {
                    status: 500,
                    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
                }
            );
        }
    }
};
