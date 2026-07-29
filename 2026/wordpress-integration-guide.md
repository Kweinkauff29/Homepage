# REALTOR® Agent Directory: WordPress & Cloudflare D1 Indexing Setup Guide

This guide details how to deploy the Cloudflare D1 Agent Directory engine and configure WordPress so all active REALTORS® are fully indexed by Google, Bing, ChatGPT Search, Perplexity, and AI web crawlers.

---

## Step 1: Deploy Cloudflare D1 Database Schema
In your terminal within the project directory (`c:\Users\Kevin\Homepage-6\2026`), execute the D1 database migration to create the `agents_directory` table:

```bash
npx wrangler d1 execute WRAP_DB --file=./database/schema_agent_directory.sql
```

Verify that the table was created:
```bash
npx wrangler d1 execute WRAP_DB --command="SELECT count(*) FROM agents_directory;"
```

---

## Step 2: Deploy Cloudflare Worker (`agent-directory-worker.js`)
Ensure your `wrangler.toml` includes the D1 database binding and cron triggers:

```toml
name = "wrapsheet"
main = "agent-directory-worker.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "WRAP_DB"
database_name = "wrap_sheet"
database_id = "fbba489f-fc17-4472-b70f-578ce5fd9933"

[triggers]
crons = ["0 5 * * *"] # Daily sync at 5:00 AM UTC
```

Deploy the worker to Cloudflare:
```bash
npx wrangler deploy
```

---

## Step 3: Trigger Initial Agent Database Sync
Run an initial sync manually or via Wrangler to populate Cloudflare D1 with active GrowthZone REALTOR® profiles:

```bash
npx wrangler d1 execute WRAP_DB --command="SELECT count(*) FROM agents_directory WHERE status = 'Active';"
```

---

## Step 4: WordPress Embedding & Route Setup

### Option A: Cloudflare Worker Route (Recommended for Best Performance & Edge SSR)
1. Log in to your **Cloudflare Dashboard**.
2. Navigate to **Workers & Pages** -> **wrapsheet** -> **Triggers** -> **Routes**.
3. Add custom route for your WordPress domain:
   - `coconutcoastrealtors.org/sitemap-agents.xml` -> Worker: `wrapsheet`
   - `coconutcoastrealtors.org/realtor-directory/agent/*` -> Worker: `wrapsheet`

### Option B: WordPress Shortcode / Custom Page Template
If using a standard WordPress page at `coconutcoastrealtors.org/realtor-directory/`:
1. Paste the updated HTML code from [`AGENTDIRECTORY.html`](file:///c:/Users/Kevin/Homepage-6/2026/AGENTDIRECTORY.html) into a WordPress **Custom HTML Block** or Page Template.
2. Add a `robots.txt` rule to point search bots to the dynamic sitemap:
   ```text
   Sitemap: https://coconutcoastrealtors.org/sitemap-agents.xml
   ```

---

## Step 5: Submit Sitemaps to Google & Bing

1. **Google Search Console**:
   - Go to Google Search Console -> **Sitemaps**.
   - Add new sitemap URL: `https://coconutcoastrealtors.org/sitemap-agents.xml`
   - Click **Submit**.

2. **Bing Webmaster Tools**:
   - Go to Bing Webmaster Tools -> **Sitemaps**.
   - Submit `https://coconutcoastrealtors.org/sitemap-agents.xml`.

---

## Step 6: Verify SEO & AI Indexing Compliance

1. **Rich Results Test**:
   - Test an agent profile URL: `https://search.google.com/test/rich-results`
   - Verify that Google recognizes the `RealEstateAgent` Schema.org microdata type.

2. **Crawler HTML Test**:
   - Test what Googlebot sees via terminal:
     ```bash
     curl -A "Googlebot" "https://coconutcoastrealtors.org/realtor-directory/?agent=john-doe-1234"
     ```
   - Confirm that full text (Name, Office, Bio, Phone, Email) and JSON-LD script are present in the HTTP response body.
