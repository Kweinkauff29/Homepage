# CCOR GrowthZone Update Helper

The Cloudflare checker uses this local helper for all GrowthZone writes: **DBPR license expiration**, **confirmed Code of Ethics**, or **both**. The helper opens a visible Chrome or Edge window and uses the signed-in GrowthZone interface, so the same workflow works on Windows and macOS without sending GrowthZone credentials to Cloudflare.

## Windows

1. Install Node.js 20 or newer and Google Chrome or Microsoft Edge.
2. Double-click `start-windows.cmd`.
3. Keep the terminal window open while using the checker.

## macOS

1. Install Node.js 20 or newer and Google Chrome or Microsoft Edge.
2. Double-click `start-mac.command`. If macOS blocks it, right-click it and choose **Open**.
3. Keep the Terminal window open while using the checker.

The helper first reuses its separate signed-in browser profile. If `GZ_USERNAME` (or `GZ_EMAIL`) and `GZ_PASSWORD` are present in a local `.env` file beside `server.js`, it can also sign in automatically when GrowthZone requests a new login. Credentials stay on that computer: they are not sent to the Cloudflare page or stored in GitHub. Without a local credential file, sign in once in the browser window and the helper will reuse that profile whenever GrowthZone allows it.

The checker verifies that the helper can open child browser processes before enabling an update. If it reports that the browser runtime is blocked, close the existing helper and start the Windows or macOS launcher directly from File Explorer or Finder.

## Safety checks

- The helper listens only on `127.0.0.1:3001` and accepts requests only from the CCOR checker or local development.
- License mode updates only one exact matching Professional license record. It never creates or deletes license rows and verifies the saved expiration date.
- COE mode requires an active contact, M1 sync enabled, and an exact M1 license match. It skips an equal-or-newer COE record, adds only a confirmed DBPR date with the COEC code/current cycle, and verifies the new row on the Real Estate tab.
- Both mode combines those guarded actions in one visible browser job.
