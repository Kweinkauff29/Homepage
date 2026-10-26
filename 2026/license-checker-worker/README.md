# CCOR License & Code of Ethics Checker

This Worker backs `https://ccor-license-checker.pages.dev/`.

## What it does

- Proxies the existing WrapSheet DBPR license lookup through a service binding.
- Looks up the latest explicit Code of Ethics completion from a D1 index of DBPR's `re_salesperson.csv` extract.
- Checks DBPR's source timestamp and size every 15 minutes. When DBPR publishes a new extract, a Queue immediately processes all byte-range chunks and atomically swaps the completed staging index into production.
- Adds a GrowthZone `COEC` record only when the contact is Active, synced to M1, has the same license number, the DBPR course is explicit and in the current NAR cycle, and GrowthZone does not already have the same or a newer date.
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

The GrowthZone credential remains in the existing `gz-realestate-proxy` Worker secret. The checker calls its named `GrowthZoneRealEstate` RPC entrypoint; no GrowthZone key is sent to the browser.
