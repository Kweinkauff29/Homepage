/**
 * Cloudflare Worker: REALTOR® Directory & SEO / AI Indexing Engine
 * 
 * Features:
 * 1. Cron Sync: Daily sync from GrowthZone API to Cloudflare D1 (agents_directory)
 * 2. Dynamic XML Sitemap: Serves /sitemap-agents.xml for Google & Bing submission
 * 3. Schema.org JSON-LD & SSR: Edge-renders full HTML + RealEstateAgent microdata for search bots
 * 4. High-performance JSON API: Fast paginated search & filter endpoint for browser UI
 */

const GZ_API_BASE = "https://coconutcoastrealtors.growthzoneapp.com/api";
const GZ_API_KEY = (typeof process !== 'undefined' && process.env.GZ_API_KEY) ? process.env.GZ_API_KEY : '';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Known Search Engine & AI Web Crawler User-Agents
const CRAWLER_USER_AGENTS = [
  "googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider", "yandexbot",
  "sogou", "exabot", "facebot", "facebookexternalhit", "ia_archiver",
  "gptbot", "chatgpt-user", "perplexitybot", "claudebot", "anthropic-ai",
  "cohere-ai", "omgilibot", "bytespider", "applebot", "twitterbot"
];

function isCrawler(userAgent) {
  const ua = (userAgent || "").toLowerCase();
  return CRAWLER_USER_AGENTS.some(bot => ua.includes(bot));
}

function generateSlug(name, contactId) {
  const cleanName = String(name || "agent")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${cleanName}-${contactId}`;
}

function generateSchemaJsonLd(agent, baseUrl = "https://coconutcoastrealtors.org/realtor-directory/") {
  const permalink = `${baseUrl}?agent=${encodeURIComponent(agent.slug)}`;
  const specialties = safeParseJson(agent.specialties, []);
  const languages = safeParseJson(agent.languages, []);
  const serviceAreas = safeParseJson(agent.service_areas, []);

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": permalink,
    "url": permalink,
    "name": agent.display_name,
    "jobTitle": "REALTOR®",
    "description": agent.headline || agent.bio || `CCOR REALTOR® serving ${agent.city || "Southwest Florida"}.`,
    "image": agent.photo_url || undefined,
    "telephone": agent.phone || undefined,
    "email": agent.email || undefined,
    "worksFor": agent.organization ? {
      "@type": "Organization",
      "name": agent.organization
    } : undefined,
    "address": (agent.city || agent.state) ? {
      "@type": "PostalAddress",
      "addressLocality": agent.city || "Bonita Springs",
      "addressRegion": agent.state || "FL",
      "addressCountry": "US"
    } : undefined,
    "areaServed": serviceAreas.length ? serviceAreas : [agent.city || "Southwest Florida"],
    "knowsLanguage": languages.length ? languages : ["English"],
    "knowsAbout": specialties
  };
}

function renderAgentSsrHtml(agent, baseUrl = "https://coconutcoastrealtors.org/realtor-directory/") {
  const schema = generateSchemaJsonLd(agent, baseUrl);
  const permalink = `${baseUrl}?agent=${encodeURIComponent(agent.slug)}`;
  const title = `${agent.display_name} - CCOR REALTOR® | ${agent.organization || "Coconut Coast Organization of REALTORS®"}`;
  const description = agent.headline || `${agent.display_name} is an active REALTOR® member in ${agent.city || "Southwest Florida"}. View contact details, specialties, and listings.`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapeHtml(permalink)}">
  
  <!-- Open Graph / Social / AI -->
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${escapeHtml(agent.display_name)} - REALTOR®">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(permalink)}">
  ${agent.photo_url ? `<meta property="og:image" content="${escapeHtml(agent.photo_url)}">` : ''}

  <!-- Schema.org JSON-LD Structured Data for Search & AI Indexing -->
  <script type="application/ld+json">
    ${JSON.stringify(schema, null, 2)}
  </script>

  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #173747; background: #f4f8fa; margin: 0; padding: 20px; }
    .card { max-width: 800px; margin: 40px auto; background: #fff; border-radius: 12px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
    h1 { color: #123f65; margin-top: 0; }
    .meta { color: #5d7280; font-weight: 600; font-size: 1.1rem; }
    .bio { margin: 20px 0; font-size: 1rem; color: #334e5e; }
    .contact-info p { margin: 6px 0; }
    a.button { display: inline-block; background: #123f65; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; margin-top: 20px; }
  </style>
</head>
<body>
  <main class="card">
    ${agent.photo_url ? `<img src="${escapeHtml(agent.photo_url)}" alt="${escapeHtml(agent.display_name)}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;float:right;">` : ''}
    <h1>${escapeHtml(agent.display_name)}</h1>
    <div class="meta">${escapeHtml(agent.organization || 'CCOR REALTOR® Member')} · ${escapeHtml(agent.city || 'Southwest Florida')}, ${escapeHtml(agent.state || 'FL')}</div>
    
    ${agent.headline ? `<p><strong>${escapeHtml(agent.headline)}</strong></p>` : ''}
    ${agent.bio ? `<div class="bio">${escapeHtml(agent.bio)}</div>` : ''}
    
    <div class="contact-info">
      <h3>Contact Information</h3>
      ${agent.phone ? `<p><strong>Phone:</strong> <a href="tel:${escapeHtml(agent.phone)}">${escapeHtml(agent.phone)}</a></p>` : ''}
      ${agent.email ? `<p><strong>Email:</strong> <a href="mailto:${escapeHtml(agent.email)}">${escapeHtml(agent.email)}</a></p>` : ''}
      ${agent.website ? `<p><strong>Website:</strong> <a href="${escapeHtml(agent.website)}" target="_blank" rel="noopener">${escapeHtml(agent.website)}</a></p>` : ''}
    </div>

    <a class="button" href="${escapeHtml(baseUrl)}">← Return to Full REALTOR® Directory</a>
  </main>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function safeParseJson(str, fallback = []) {
  try { return JSON.parse(str || "[]"); } catch (e) { return fallback; }
}

export default {
  // =================== HTTP REQUEST HANDLER ===================
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+/g, "/");
    const userAgent = request.headers.get("User-Agent") || "";

    // 1. Dynamic XML Sitemap (/sitemap-agents.xml)
    if (pathname === "/sitemap-agents.xml" || pathname === "/sitemaps/agents.xml") {
      return handleSitemap(env, url);
    }

    // 2. Paginated Directory Endpoint (/api/public/directory)
    if (pathname === "/api/public/directory" || pathname === "/api/public/directory/") {
      return handleDirectoryList(env, url);
    }

    // 3. Single Agent Search / SSR Route (/api/public/directory/:slug or /api/public/directory/agent/:slug)
    const agentMatch = pathname.match(/\/api\/public\/directory\/(?:agent\/)?([^\/]+)/);
    const queryAgent = url.searchParams.get("agent");

    if (agentMatch || queryAgent) {
      const slugOrId = agentMatch ? agentMatch[1] : queryAgent;
      return handleSingleAgent(env, request, slugOrId, isCrawler(userAgent));
    }

    // 4. Trigger Sync Endpoint (/api/sync-agents or /api/admin/sync-agents)
    if (pathname === "/api/sync-agents" || pathname === "/api/admin/sync-agents") {
      try {
        await syncGrowthZoneToD1(env);
        return new Response(JSON.stringify({ success: true, message: "GrowthZone to D1 Agent Sync Completed." }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
    }

    return new Response(JSON.stringify({ error: "Endpoint not found" }), { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  },

  // =================== CRON TRIGGER HANDLER ===================
  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncGrowthZoneToD1(env));
  }
};

/**
 * Handle dynamic XML Sitemap generation for search crawlers
 */
async function handleSitemap(env, url) {
  const db = env.WRAP_DB;
  const baseUrl = "https://coconutcoastrealtors.org/realtor-directory/";

  let agents = [];
  if (db) {
    const { results } = await db.prepare(
      "SELECT slug, updated_at FROM agents_directory WHERE status = 'Active' ORDER BY display_name ASC"
    ).all();
    agents = results || [];
  }

  const xmlUrls = agents.map(agent => `  <url>
    <loc>${baseUrl}?agent=${encodeURIComponent(agent.slug)}</loc>
    <lastmod>${new Date(agent.updated_at || Date.now()).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${xmlUrls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      ...CORS_HEADERS
    }
  });
}

/**
 * Handle fetching single agent profile & returning JSON or SSR HTML
 */
async function handleSingleAgent(env, request, slugOrId, forceHtml = false) {
  const db = env.WRAP_DB;
  const acceptHeader = request.headers.get("Accept") || "";

  let agent = null;
  if (db) {
    const isId = /^\d+$/.test(slugOrId);
    if (isId) {
      agent = await db.prepare("SELECT * FROM agents_directory WHERE contact_id = ?").bind(slugOrId).first();
    } else {
      const cleanSearch = slugOrId.replace(/-/g, " ");
      agent = await db.prepare(
        "SELECT * FROM agents_directory WHERE slug = ? OR slug LIKE ? OR display_name LIKE ? LIMIT 1"
      ).bind(slugOrId, `${slugOrId}%`, `%${cleanSearch}%`).first();
    }
  }

  if (!agent) {
    return new Response(JSON.stringify({ error: "Agent profile not found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  // If Crawler, HTML requested, or forced: return SSR HTML
  if (forceHtml || acceptHeader.includes("text/html")) {
    const html = renderAgentSsrHtml(agent);
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", ...CORS_HEADERS }
    });
  }

  // Otherwise return structured JSON API response
  const profile = {
    contactId: agent.contact_id,
    slug: agent.slug,
    displayName: agent.display_name,
    organization: agent.organization,
    headline: agent.headline,
    bio: agent.bio,
    city: agent.city,
    state: agent.state,
    phone: agent.phone,
    email: agent.email,
    website: agent.website,
    photoUrl: agent.photo_url,
    bannerUrl: agent.banner_url,
    specialties: safeParseJson(agent.specialties),
    languages: safeParseJson(agent.languages),
    serviceAreas: safeParseJson(agent.service_areas),
    highlights: safeParseJson(agent.highlights),
    featuredListings: safeParseJson(agent.listings_json),
    youtube: safeParseJson(agent.youtube_json),
    gallery: safeParseJson(agent.gallery_json),
    documents: safeParseJson(agent.documents_json),
    schemaJsonLd: generateSchemaJsonLd(agent)
  };

  return new Response(JSON.stringify({ profile }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}

/**
 * Handle paginated directory list for frontend hydration
 */
async function handleDirectoryList(env, url) {
  const db = env.WRAP_DB;
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "36", 10), 2000);
  const offset = (page - 1) * pageSize;

  const q = (url.searchParams.get("q") || "").trim();
  const office = (url.searchParams.get("office") || "").trim();
  const city = (url.searchParams.get("city") || "").trim();

  let whereClauses = ["status = 'Active'"];
  let params = [];

  if (q) {
    whereClauses.push("(display_name LIKE ? OR organization LIKE ? OR city LIKE ? OR bio LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (office) {
    whereClauses.push("organization = ?");
    params.push(office);
  }
  if (city) {
    whereClauses.push("city = ?");
    params.push(city);
  }

  const whereSql = whereClauses.join(" AND ");

  let items = [], total = 0;
  if (db) {
    const countRes = await db.prepare(`SELECT COUNT(*) as count FROM agents_directory WHERE ${whereSql}`).bind(...params).first();
    total = countRes ? countRes.count : 0;

    const listRes = await db.prepare(
      `SELECT contact_id, slug, display_name, organization, headline, bio, city, state, phone, email, website, photo_url, banner_url, specialties, languages, service_areas, highlights
       FROM agents_directory WHERE ${whereSql} ORDER BY display_name ASC LIMIT ? OFFSET ?`
    ).bind(...params, pageSize, offset).all();

    items = (listRes.results || []).map(row => ({
      contactId: row.contact_id,
      slug: row.slug,
      displayName: row.display_name,
      organization: row.organization,
      headline: row.headline,
      bio: row.bio,
      city: row.city,
      state: row.state,
      phone: row.phone,
      email: row.email,
      website: row.website,
      photoUrl: row.photo_url,
      bannerUrl: row.banner_url,
      specialties: safeParseJson(row.specialties),
      languages: safeParseJson(row.languages),
      serviceAreas: safeParseJson(row.service_areas),
      highlights: safeParseJson(row.highlights)
    }));
  }

  const pages = Math.ceil(total / pageSize) || 1;

  return new Response(JSON.stringify({
    page, pageSize, total, pages, items, refreshedAt: new Date().toISOString()
  }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}

/**
 * GrowthZone -> Cloudflare D1 Batch Sync Task
 */
async function syncGrowthZoneToD1(env) {
  const db = env.WRAP_DB;
  if (!db) return;

  const apiKey = env.GZ_API_KEY || GZ_API_KEY;
  console.log("Starting GrowthZone to D1 Agent Sync...");
  const response = await fetch(`${GZ_API_BASE}/contacts?\$skip=0&\$top=11000`, {
    headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" }
  });

  if (!response.ok) throw new Error(`GrowthZone API Error: ${response.status}`);
  const data = await response.json();
  const contacts = data.Results || [];

  console.log(`Processing ${contacts.length} raw contacts from GrowthZone...`);
  
  for (const c of contacts) {
    if (!c.Id || !c.DisplayName) continue;

    const slug = generateSlug(c.DisplayName, c.Id);
    const phone = c.Phone || (c.Phones && (c.Phones[0]?.Number || c.Phones[0]?.Value)) || null;
    const email = c.Email || c.EmailAddress || (c.Emails && (c.Emails[0]?.Address || c.Emails[0]?.Value)) || null;
    const city = c.City || (c.Addresses && c.Addresses[0]?.City) || "Bonita Springs";
    const state = c.State || (c.Addresses && c.Addresses[0]?.State) || "FL";
    const org = c.CompanyName || c.OrganizationName || c.PrimaryContact || null;

    const bio = c.Bio || c.Description || c.About || c.Biography || (c.AddlInfo && c.AddlInfo.Bio) || null;
    const headline = c.Headline || c.Tagline || c.Title || null;
    const photoUrl = c.PhotoUrl || c.ImageUrl || c.PictureUrl || c.ProfileImage || null;
    const bannerUrl = c.BannerUrl || c.CoverImageUrl || null;
    const website = c.Website || c.WebAddress || c.WebsiteUrl || (c.WebAddresses && c.WebAddresses[0]?.Value) || null;

    // Parse Languages
    let languages = [];
    if (Array.isArray(c.Languages)) languages = c.Languages;
    else if (typeof c.Languages === 'string' && c.Languages.trim()) languages = c.Languages.split(',').map(s => s.trim()).filter(Boolean);
    else if (c.SpokenLanguages) languages = Array.isArray(c.SpokenLanguages) ? c.SpokenLanguages : String(c.SpokenLanguages).split(',').map(s => s.trim()).filter(Boolean);

    // Parse Specialties
    let specialties = [];
    if (Array.isArray(c.Specialties)) specialties = c.Specialties;
    else if (Array.isArray(c.Designations)) specialties = c.Designations;
    else if (typeof c.Specialties === 'string' && c.Specialties.trim()) specialties = c.Specialties.split(',').map(s => s.trim()).filter(Boolean);
    else if (typeof c.Designations === 'string' && c.Designations.trim()) specialties = c.Designations.split(',').map(s => s.trim()).filter(Boolean);

    // Parse Service Areas
    let serviceAreas = [];
    if (Array.isArray(c.ServiceAreas)) serviceAreas = c.ServiceAreas;
    else if (typeof c.ServiceAreas === 'string' && c.ServiceAreas.trim()) serviceAreas = c.ServiceAreas.split(',').map(s => s.trim()).filter(Boolean);
    else if (c.FarmingArea) serviceAreas = [String(c.FarmingArea).trim()];

    // Parse Highlights / Committees
    let highlights = [];
    if (Array.isArray(c.Committees)) highlights = c.Committees;
    else if (Array.isArray(c.Groups)) highlights = c.Groups.map(g => typeof g === 'string' ? g : (g.Name || '')).filter(Boolean);

    // Parse Custom Fields
    const fields = c.CustomFields || c.Fields || [];
    if (Array.isArray(fields)) {
      fields.forEach(f => {
        const fieldName = (f.DisplayName || f.Name || '').toLowerCase();
        const val = (f.Value || '').trim();
        if (!val) return;

        if (fieldName.includes('language')) {
          languages = [...new Set([...languages, ...val.split(',').map(s => s.trim()).filter(Boolean)])];
        }
        if (fieldName.includes('expertise') || fieldName.includes('specialt') || fieldName.includes('designation')) {
          specialties = [...new Set([...specialties, ...val.split(',').map(s => s.trim()).filter(Boolean)])];
        }
        if (fieldName.includes('neighborhood') || fieldName.includes('farming') || fieldName.includes('area')) {
          serviceAreas = [...new Set([...serviceAreas, ...val.split(',').map(s => s.trim()).filter(Boolean)])];
        }
      });
    }

    await db.prepare(`
      INSERT INTO agents_directory (
        contact_id, slug, display_name, first_name, last_name, organization,
        headline, bio, city, state, phone, email, website, photo_url, banner_url,
        specialties, languages, service_areas, highlights, status, updated_at, indexed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', datetime('now'), datetime('now'))
      ON CONFLICT(contact_id) DO UPDATE SET
        slug = excluded.slug,
        display_name = excluded.display_name,
        organization = excluded.organization,
        headline = COALESCE(excluded.headline, agents_directory.headline),
        bio = COALESCE(excluded.bio, agents_directory.bio),
        city = excluded.city,
        state = excluded.state,
        phone = excluded.phone,
        email = excluded.email,
        website = COALESCE(excluded.website, agents_directory.website),
        photo_url = COALESCE(excluded.photo_url, agents_directory.photo_url),
        banner_url = COALESCE(excluded.banner_url, agents_directory.banner_url),
        specialties = COALESCE(excluded.specialties, agents_directory.specialties),
        languages = COALESCE(excluded.languages, agents_directory.languages),
        service_areas = COALESCE(excluded.service_areas, agents_directory.service_areas),
        highlights = COALESCE(excluded.highlights, agents_directory.highlights),
        status = 'Active',
        updated_at = datetime('now')
    `).bind(
      c.Id, slug, c.DisplayName, c.FirstName || null, c.LastName || null, org,
      headline, bio, city, state, phone, email, website, photoUrl, bannerUrl,
      JSON.stringify(specialties), JSON.stringify(languages), JSON.stringify(serviceAreas), JSON.stringify(highlights)
    ).run();
  }

  console.log("GrowthZone to D1 Agent Sync Complete.");
}
