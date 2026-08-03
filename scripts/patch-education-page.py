#!/usr/bin/env python3
from pathlib import Path

path = Path('2026/Education.html')
text = path.read_text(encoding='utf-8')

build_marker = '<!-- CCOR EDUCATION YEAR + INSTRUCTOR DIRECTORY BUILD: 2026-08-03a -->\n'
if build_marker not in text:
    text = text.replace('<!DOCTYPE html>\n', '<!DOCTYPE html>\n' + build_marker, 1)

css_link = '    <link rel="stylesheet" href="https://kweinkauff29.github.io/Homepage/2026/assets/ccor-education.css?v=20260803a">\n'
if css_link not in text:
    anchor = '    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">\n'
    if anchor not in text:
        raise RuntimeError('Flatpickr stylesheet anchor missing')
    text = text.replace(anchor, anchor + css_link, 1)

legacy_renderer = '    <script>\n        const BASE_URL = \'https://gz-realestate-proxy.bonitaspringsrealtors.workers.dev\';'
legacy_renderer_disabled = '    <script type="text/plain" data-legacy-education-renderer>\n        const BASE_URL = \'https://gz-realestate-proxy.bonitaspringsrealtors.workers.dev\';'
if legacy_renderer_disabled not in text:
    if legacy_renderer not in text:
        raise RuntimeError('Legacy Education renderer anchor missing')
    text = text.replace(legacy_renderer, legacy_renderer_disabled, 1)

legacy_calendar = '<script data-ccor-page="education">'
legacy_calendar_disabled = '<script type="text/plain" data-legacy-education-calendar data-ccor-page="education">'
if legacy_calendar_disabled not in text:
    if legacy_calendar not in text:
        raise RuntimeError('Legacy Education calendar anchor missing')
    text = text.replace(legacy_calendar, legacy_calendar_disabled, 1)

js_tag = '<script src="https://kweinkauff29.github.io/Homepage/2026/assets/ccor-education.js?v=20260803a" defer></script>\n'
if js_tag not in text:
    anchor = '<!-- CCOR INLINE HIGHLIGHTS + CALENDAR END -->\n</body>'
    if anchor not in text:
        raise RuntimeError('Education page closing anchor missing')
    text = text.replace(anchor, '<!-- CCOR INLINE HIGHLIGHTS + CALENDAR END -->\n' + js_tag + '</body>', 1)

# The unified renderer now provides instructor details. Keep the contact CTA but use the established support address.
text = text.replace('mailto:education@coconutcoastrealtors.org', 'mailto:support@berealtors.org')

path.write_text(text, encoding='utf-8')
print(f'Patched {path}')
