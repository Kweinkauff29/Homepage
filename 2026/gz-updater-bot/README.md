# CCOR GrowthZone License Helper

The Cloudflare checker uses this local helper only for **DBPR license-expiration updates**. GrowthZone's published API exposes Professional license records for reading but not writing, so this helper safely updates the signed-in GrowthZone page in Chrome or Edge. COE updates do not require the helper.

## Windows

1. Install Node.js 20 or newer and Google Chrome or Microsoft Edge.
2. Double-click `start-windows.cmd`.
3. Keep the terminal window open while using the checker.

## macOS

1. Install Node.js 20 or newer and Google Chrome or Microsoft Edge.
2. Double-click `start-mac.command`. If macOS blocks it, right-click it and choose **Open**.
3. Keep the Terminal window open while using the checker.

The first license run opens a separate browser profile. Sign in to GrowthZone there once; the profile is then reused locally. Credentials are not sent to the Cloudflare page or stored in GitHub.

The helper listens only on `127.0.0.1:3001`, accepts requests only from the CCOR checker (plus local development), validates every record, and updates only one exact matching license. It never creates or deletes license rows. After saving, it reopens the record and verifies the expiration date.
