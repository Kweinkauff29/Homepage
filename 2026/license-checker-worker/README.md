# CCOR License & Code of Ethics Checker

This Worker backs `https://ccor-license-checker.pages.dev/`.

## What it does

- Proxies the existing WrapSheet DBPR license lookup through a service binding.
- Looks up the latest explicit Code of Ethics completion from a D1 index of DBPR's `re_salesperson.csv` extract.
- Checks DBPR's source timestamp and size once daily at 10:15 UTC. When DBPR publishes a new extract, a Queue processes all byte-range chunks and atomically swaps the completed staging index into production.
- Returns only explicit, current-cycle DBPR COE records as eligible. GrowthZone license and COE writes run through the signed-in PC/Mac browser helper, not through the cloud Worker.
- Writes every sync decision to `sync_audit`.

Generic ethics titles and 14-hour continuing-education packages are never auto-synced.

## Deploy

```powershell
npx wrangler@latest deploy -c wrangler.jsonc
npx wrangler@latest pages deploy ../license-checker --project-name ccor-license-checker --branch main
```

Create the Queue once before the first deployment:

```powershell
npx wrangler@latest queues create ccor-license-checker-dbpr-refresh
```

Apply D1 migrations before deploying the Worker:

```powershell
npx wrangler@latest d1 migrations apply ccor-license-checker --remote -c wrangler.jsonc
```

The checker never sends a GrowthZone key to the webpage. The desktop helper uses a separate local Chrome/Edge profile and the staff member's existing signed-in GrowthZone session.
