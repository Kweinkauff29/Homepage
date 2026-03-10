// gz-realestate-proxy.js

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "X-Cache-Status": "MISS"
    };
}

function withCors(res, cacheStatus = "MISS") {
    const h = new Headers(res.headers);
    const cors = corsHeaders();
    for (const [k, v] of Object.entries(cors)) h.set(k, v);
    h.set("X-Cache-Status", cacheStatus);
    return new Response(res.body, { status: res.status, headers: h });
}

function json(body, status = 200, cacheStatus = "MISS") {
    const headers = { "Content-Type": "application/json" };
    if (cacheStatus === "MISS") {
        headers["Cache-Control"] = "no-store";
    }
    return withCors(
        new Response(JSON.stringify(body), {
            status,
            headers,
        }),
        cacheStatus
    );
}

async function getCache(db, key) {
    try {
        const result = await db.prepare("SELECT data FROM event_cache WHERE cacheKey = ?").bind(key).first();
        return result ? JSON.parse(result.data) : null;
    } catch (e) {
        console.error("D1 Get Cache Error:", e);
        return null;
    }
}

async function setCache(db, key, data) {
    try {
        await db.prepare("INSERT OR REPLACE INTO event_cache (cacheKey, data, lastUpdated) VALUES (?, ?, CURRENT_TIMESTAMP)")
            .bind(key, JSON.stringify(data))
            .run();
    } catch (e) {
        console.error("D1 Set Cache Error:", e);
    }
}

async function proxyGetUpstream(url, apiKey) {
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };
    if (apiKey) {
        headers["Authorization"] = `ApiKey ${apiKey}`;
    }
    const res = await fetch(url, { headers });
    const contentType = res.headers.get("Content-Type");
    const text = await res.text();
    return { res, text, contentType };
}

export default {
    async scheduled(event, env, ctx) {
        const apiKey = env.GZ_API_KEY;
        const upstreamBase = env.GZ_BASE_URL;

        console.log("Starting Scheduled Sync...");

        // 1. Sync All Events List via Pagination
        let allResults = [];
        let skip = 0;
        let hasMore = true;
        while (hasMore && skip < 5000) {
            const listUrl = `${upstreamBase}/api/events/all?%24top=1000&%24skip=${skip}`;
            const { res: listRes, text: listText } = await proxyGetUpstream(listUrl, apiKey);
            if (listRes.ok) {
                const listData = JSON.parse(listText);
                const results = listData.Results || [];
                allResults = allResults.concat(results);
                if (results.length < 1000) hasMore = false;
                else skip += 1000;
            } else {
                hasMore = false;
            }
        }

        if (allResults.length > 0) {
            const listData = { Results: allResults, TotalRecordAvailable: allResults.length };
            const events = allResults;

            // 2. Enrich Future Events
            const now = new Date();

            // Sort by StartDate ASC to prioritize soonest events for enrichment
            const futureEvents = events
                .filter(e => new Date(e.StartDate) >= now)
                .sort((a, b) => new Date(a.StartDate) - new Date(b.StartDate))
                .slice(0, 30);

            const enrichedList = [];

            console.log(`Enriching ${futureEvents.length} future events...`);

            let loopIndex = 0;
            for (const ev of futureEvents) {
                try {
                    const dUrl = `${env.GZ_BASE_URL}/api/events/${ev.EventId}`;
                    const { res: dRes, text: dText } = await proxyGetUpstream(dUrl, env.GZ_API_KEY);
                    if (dRes.ok) {
                        const detail = JSON.parse(dText);

                        // 1. Try EventLogoUrl from detail
                        let flyer = detail.EventLogoUrl || "";

                        // 2. Try Description regex if no logo
                        if (!flyer && detail.Description) {
                            const imgMatch = detail.Description.match(/<img[^>]+src=["']([^"']+)["']/i);
                            if (imgMatch) flyer = imgMatch[1];
                        }

                        // 3. Robust Fetch from PublicUrl (Registration Page)
                        let publicFetchSuccess = false;
                        let pTextLength = 0;
                        if (!flyer || flyer.includes('BER-Logo') || flyer.includes('default') || flyer.includes('placeholder')) {
                            const publicUrl = ev.PublicUrl || detail.PublicUrl;
                            if (publicUrl) {
                                const { res: pRes, text: pText } = await proxyGetUpstream(publicUrl, ""); // PublicUrl doesn't need API Key Usually
                                pTextLength = pText.length;
                                if (pRes.ok) {
                                    publicFetchSuccess = true;
                                    const cloudMatch = pText.match(/https:\/\/res\.cloudinary\.com\/micronetonline\/image\/upload\/[^"']+6c24b0da-8a6e-4f2b-8547-26a8c1dc4581[^"']+/i);
                                    if (cloudMatch) flyer = cloudMatch[0];
                                }
                            }
                        }

                        // Clean generic placeholders
                        if (flyer && (flyer.includes('BER-Logo') || flyer.includes('default') || flyer.includes('placeholder') || flyer.includes('growthzoneapp.com/File/Download'))) {
                            if (!flyer.includes('?')) flyer = "";
                        }

                        ev.EnrichedFlyerUrl = flyer;
                        ev.DebugInfo = {
                            idx: loopIndex,
                            hasPublic: !!(ev.PublicUrl || detail.PublicUrl),
                            pFs: publicFetchSuccess,
                            pTl: pTextLength,
                            hasFlyer: !!flyer
                        };
                        ev.IsClass = detail.CategoryItems?.some(c => (c.Name === 'CE Credit' || c.Name === 'General Education') && c.IsSelected);
                        ev.IsCE = detail.CategoryItems?.some(c => c.Name === 'CE Credit' && c.IsSelected);

                        await setCache(env.D1_DB, `detail_${ev.EventId}`, detail);
                    } else {
                        ev.DebugInfo = { idx: loopIndex, error: `Detail fetch failed: ${dRes.status}` };
                    }
                } catch (e) {
                    console.error(`Failed to enrich event ${ev.EventId}:`, e);
                    ev.DebugInfo = { idx: loopIndex, error: e.message };
                }
                enrichedList.push(ev);
                loopIndex++;
            }

            // Filter to only include recent and upcoming events (e.g., from 30 days ago onwards)
            // to avoid hitting D1 row size limits (1MB).
            const threshold = new Date();
            threshold.setDate(threshold.getDate() - 30);
            const displayEvents = allResults.filter(e => new Date(e.StartDate) >= threshold);

            const displayData = { Results: displayEvents, TotalRecordAvailable: displayEvents.length };

            // Save both specific list and enriched version
            await setCache(env.D1_DB, "list_all", displayData);
            await setCache(env.D1_DB, "list_enriched", displayData); // Now mutated with extra properties
            console.log(`Synced ${displayEvents.length} upcoming/recent events (out of ${allResults.length} total).`);
        }
    },

    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const apiKey = env.GZ_API_KEY;
        const upstreamBase = env.GZ_BASE_URL;

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders() });
        }

        // Cache-aware Events All
        if (url.pathname === "/events/all") {
            const skip = url.searchParams.get("$skip") || "0";
            const orderby = url.searchParams.get("$orderby") || "";
            const isDefaultList = skip === "0" && (orderby === "StartDate desc" || !orderby);
            const useEnriched = url.searchParams.get("enriched") === "true";
            const forceRefresh = url.searchParams.get("refresh") === "true";

            if (isDefaultList && !forceRefresh) {
                const cacheKey = useEnriched ? "list_enriched" : "list_all";
                const cached = await getCache(env.D1_DB, cacheKey);
                if (cached) return json(cached, 200, "HIT");
            }

            const forwardParams = new URLSearchParams(url.searchParams);
            forwardParams.delete("enriched");
            forwardParams.delete("refresh");

            let queryString = forwardParams.toString().replace(/\+/g, "%20");
            let upstreamUrl = `${upstreamBase}/api/events/all${queryString ? `?${queryString}` : ""}`;

            // If it's the default list, we MUST use a date filter to get upcoming events, 
            // ignoring the frontend's $top/$orderby which target the wrong end of the timeline.
            // If it's the default list, we MUST paginate to get the whole database
            // because upstream filtering and sorting are unreliable.
            let allResults = [];
            let lastText = "";
            let lastStatus = 200;

            if (isDefaultList) {
                let skip = 0;
                let hasMore = true;
                while (hasMore && skip < 5000) {
                    const upstreamUrl = `${upstreamBase}/api/events/all?%24top=1000&%24skip=${skip}`;
                    const { res, text } = await proxyGetUpstream(upstreamUrl, apiKey);
                    lastStatus = res.status;
                    lastText = text;
                    if (res.ok) {
                        const data = JSON.parse(text);
                        const results = data.Results || [];
                        allResults = allResults.concat(results);
                        if (results.length < 1000) hasMore = false;
                        else skip += 1000;
                    } else {
                        hasMore = false;
                    }
                }
            } else {
                const { res, text } = await proxyGetUpstream(upstreamUrl, apiKey);
                lastStatus = res.status;
                lastText = text;
                if (res.ok) {
                    const data = JSON.parse(text);
                    allResults = data.Results || [];
                }
            }

            if (lastStatus === 200 && isDefaultList) {
                // Filter to only include recent and upcoming events
                const threshold = new Date();
                threshold.setDate(threshold.getDate() - 30);
                const displayEvents = allResults.filter(e => new Date(e.StartDate) >= threshold);
                const listData = { Results: displayEvents, TotalRecordAvailable: displayEvents.length };

                if (useEnriched) {
                    console.log("Enriching list on-the-fly...");
                    const events = listData.Results || [];
                    const now = new Date();

                    // Sort by StartDate ASC to prioritize soonest events
                    const futureEvents = events
                        .filter(e => new Date(e.StartDate) >= now)
                        .sort((a, b) => new Date(a.StartDate) - new Date(b.StartDate))
                        .slice(0, 30);

                    let loopIndex = 0;

                    for (const ev of futureEvents) {
                        try {
                            const dUrl = `${upstreamBase}/api/events/${ev.EventId}`;
                            const { res: dRes, text: dText } = await proxyGetUpstream(dUrl, apiKey);
                            if (dRes.ok) {
                                const detail = JSON.parse(dText);

                                // 1. Try EventLogoUrl from detail
                                let flyer = detail.EventLogoUrl || "";

                                // 2. Try Description regex if no logo
                                if (!flyer && detail.Description) {
                                    const imgMatch = detail.Description.match(/<img[^>]+src=["']([^"']+)["']/i);
                                    if (imgMatch) flyer = imgMatch[1];
                                }

                                // 3. Robust Fetch from PublicUrl (Registration Page)
                                let publicFetchSuccess = false;
                                let pTextLength = 0;
                                if (!flyer || flyer.includes('BER-Logo') || flyer.includes('default') || flyer.includes('placeholder')) {
                                    const publicUrl = ev.PublicUrl || detail.PublicUrl;
                                    if (publicUrl) {
                                        const { res: pRes, text: pText } = await proxyGetUpstream(publicUrl, "");
                                        pTextLength = pText.length;
                                        if (pRes.ok) {
                                            publicFetchSuccess = true;
                                            const cloudMatch = pText.match(/https:\/\/res\.cloudinary\.com\/micronetonline\/image\/upload\/[^"']+6c24b0da-8a6e-4f2b-8547-26a8c1dc4581[^"']+/i);
                                            if (cloudMatch) flyer = cloudMatch[0];
                                        }
                                    }
                                }

                                // Clean generic placeholders
                                if (flyer && (flyer.includes('BER-Logo') || flyer.includes('default') || flyer.includes('placeholder') || flyer.includes('growthzoneapp.com/File/Download'))) {
                                    if (!flyer.includes('?')) flyer = "";
                                }

                                ev.EnrichedFlyerUrl = flyer;
                                ev.DebugInfo = {
                                    idx: loopIndex,
                                    hasPublic: !!(ev.PublicUrl || detail.PublicUrl),
                                    pFs: publicFetchSuccess,
                                    pTl: pTextLength,
                                    hasFlyer: !!flyer
                                };
                                ev.IsClass = detail.CategoryItems?.some(c => (c.Name === 'CE Credit' || c.Name === 'General Education') && c.IsSelected);
                                ev.IsCE = detail.CategoryItems?.some(c => c.Name === 'CE Credit' && c.IsSelected);
                                ctx.waitUntil(setCache(env.D1_DB, `detail_${ev.EventId}`, detail));
                            } else {
                                ev.DebugInfo = { idx: loopIndex, error: `Detail fetch failed: ${dRes.status}` };
                            }
                        } catch (e) {
                            ev.DebugInfo = { idx: loopIndex, error: e.message };
                        }
                        loopIndex++;
                    }
                    ctx.waitUntil(setCache(env.D1_DB, "list_enriched", listData));
                    return json(listData, 200, "MISS");
                } else {
                    ctx.waitUntil(setCache(env.D1_DB, "list_all", listData));
                }
            }

            return withCors(new Response(text, {
                status: res.status,
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store"
                }
            }), "MISS");
        }

        // Cache-aware Event Details
        const eventIdMatch = url.pathname.match(/^\/events\/(\d+)$/);
        if (eventIdMatch) {
            const id = eventIdMatch[1];
            const cached = await getCache(env.D1_DB, `detail_${id}`);
            if (cached) return json(cached, 200, "HIT");

            const upstreamUrl = `${upstreamBase}/api/events/${id}`;
            const { res, text } = await proxyGetUpstream(upstreamUrl, apiKey);

            if (res.ok) {
                ctx.waitUntil(setCache(env.D1_DB, `detail_${id}`, JSON.parse(text)));
            }

            return withCors(new Response(text, {
                status: res.status,
                headers: { "Content-Type": "application/json" }
            }), "MISS");
        }

        // Legacy proxies
        if (url.pathname === "/integrations/accounts") {
            const upstreamUrl = `${upstreamBase}/api/realestate/contacts/getintegrationsaccounts` + url.search;
            const { res, text } = await proxyGetUpstream(upstreamUrl, apiKey);
            return withCors(new Response(text, { status: res.status, headers: { "Content-Type": "application/json" } }));
        }

        return withCors(new Response("Not Found", { status: 404 }));
    }
};
