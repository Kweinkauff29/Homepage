# AI handoff: public featured calendars

Work on branch `agent/featured-calendars` and PR #10. The companion backend is `Kweinkauff29/New-Member-Mandatory-Matrix-Test` PR #140.

## Prerequisite

Do not publish the public pages until PR #140's `featured-events-worker` has been deployed and its D1 migration has been applied.

## Public pages in this change

- `2026/Education.html`
- `2026/Events.html`
- `2026/Committees.html`
- `2026/AllEvents.html`
- `2026/assets/ccor-events.css`
- `2026/assets/ccor-events.js`

## Browser validation

Test each page as a standalone file and inside its actual WordPress page/embed container.

Confirm:

- three featured cards render above the interactive calendar
- staff-starred selections from PR #140 appear in saved order
- Education with no manual stars selects the nearest upcoming in-person CE classes first
- the month calendar displays event counts on the correct dates
- selecting a date updates the daily agenda
- search, date-range and format filters update both the cards and calendar
- Education's CE-only toggle works
- an empty filter result shows no events rather than reverting the calendar to the full feed
- Load More adds additional upcoming cards
- details and registration links open the correct GrowthZone event
- GrowthZone flyer images use contain sizing and do not crop important text
- mobile layouts work at approximately 375px width
- the GrowthZone sponsor widget remains present and does not overlap the page

## Failure and fallback test

Temporarily block or change the curation API endpoint and verify the pages fall back to:

`https://gz-realestate-proxy.bonitaspringsrealtors.workers.dev/events/all?enriched=true`

The fallback must still categorize Education, Events and Committees and apply automatic Education featured selection.

## WordPress rollout

Map the four repository files to their current Coconut Coast WordPress pages:

- Education: `/upcoming-education/`
- Events: `/upcoming-events/`
- Committees: `/committee-meetings/`
- All Events: `/all-upcoming-events/`

Confirm the live WordPress environment permits the external shared CSS, JavaScript, Flatpickr CDN and `ccreschool.com` API requests. Clear WordPress/CDN caches after publishing.

## Merge order

1. Complete, deploy and smoke-test Matrix PR #140.
2. Validate this PR against the deployed API.
3. Publish/test the WordPress embeds.
4. Mark this PR ready only after those tests pass.
5. Merge Matrix PR #140 before Homepage PR #10.

No CI statuses were attached when this handoff was written. Do not merge based only on source review.
