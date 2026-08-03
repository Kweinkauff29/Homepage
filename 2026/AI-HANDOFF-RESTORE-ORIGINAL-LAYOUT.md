# Required final step: preserve the original page layouts

Work only on branch `agent/restore-calendar-layout`.

## Non-negotiable scope

The four HTML files on this branch have been restored byte-for-byte to their pre-PR-#10 versions:

- `2026/Education.html`
- `2026/Events.html`
- `2026/Committees.html`
- `2026/AllEvents.html`

Do **not** replace their markup, inline CSS, existing JavaScript, card renderer, filters, modal, sponsor widget, wave background, navigation or page shell. Do not reformat the files.

The new `2026/assets/ccor-events.js` is a non-destructive injector. It:

- keeps the existing `.swiss-card` cards and original design
- moves staff-starred cards to the beginning of the existing grid
- marks the computed first row as featured
- inserts the interactive calendar as a full-width grid item immediately after that first row
- observes the original renderer so search/date/CE filtering continues to work
- loads only the scoped additions in `2026/assets/ccor-events.css`

## Make exactly one HTML insertion per file

Immediately before the final `</body>` tag, add the matching line below.

### Education.html

```html
<script src="https://kweinkauff29.github.io/Homepage/2026/assets/ccor-events.js" data-ccor-page="education"></script>
```

### Events.html

```html
<script src="https://kweinkauff29.github.io/Homepage/2026/assets/ccor-events.js" data-ccor-page="event"></script>
```

### Committees.html

```html
<script src="https://kweinkauff29.github.io/Homepage/2026/assets/ccor-events.js" data-ccor-page="committee"></script>
```

### AllEvents.html

```html
<script src="https://kweinkauff29.github.io/Homepage/2026/assets/ccor-events.js" data-ccor-page="all"></script>
```

Do not add a separate stylesheet line. The script derives and loads `ccor-events.css` from its own URL.

## Required diff check

After editing, run:

```bash
git diff --stat origin/main...HEAD
git diff --word-diff=porcelain origin/main...HEAD -- 2026/Education.html 2026/Events.html 2026/Committees.html 2026/AllEvents.html
```

Each HTML file should show the restored pre-#10 content plus only its single new script tag. There must not be another shell rewrite or large deletion of original page code.

## Browser checks

Verify on all four pages:

1. Sponsor banner, header, navigation, filters, original cards, details modal and wave background look exactly as before.
2. The first row contains the staff-starred items in saved order when matching cards are present.
3. Education falls back to the closest upcoming in-person CE classes.
4. A `★ FEATURED` marker appears on the first-row cards.
5. The calendar appears immediately below the first row, not above the page and not in place of the existing list.
6. Remaining original cards continue beneath the calendar.
7. Original search, date range and CE filtering still rerender the cards.
8. The injected calendar responds to those filters.
9. Previous/next month and selected-day agenda work.
10. Mobile and desktop retain the original layout.

Do not merge until screenshots show the old layout with only the requested featured/calendar additions.
