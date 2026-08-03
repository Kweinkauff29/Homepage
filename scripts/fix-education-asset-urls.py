#!/usr/bin/env python3
from pathlib import Path

path = Path('2026/Education.html')
text = path.read_text(encoding='utf-8')

old_css = 'https://kweinkauff29.github.io/Homepage/2026/assets/ccor-education.css?v=20260803a'
old_js = 'https://kweinkauff29.github.io/Homepage/2026/assets/ccor-education.js?v=20260803a'
commit = 'b208597b68090c4f40243078099e1f13f7cf23db'
new_css = f'https://cdn.jsdelivr.net/gh/Kweinkauff29/Homepage@{commit}/2026/assets/ccor-education.css'
new_js = f'https://cdn.jsdelivr.net/gh/Kweinkauff29/Homepage@{commit}/2026/assets/ccor-education.js'

if old_css not in text:
    raise RuntimeError('Old Education CSS URL not found')
if old_js not in text:
    raise RuntimeError('Old Education JS URL not found')

text = text.replace('CCOR EDUCATION YEAR + INSTRUCTOR DIRECTORY BUILD: 2026-08-03a',
                    'CCOR EDUCATION YEAR + INSTRUCTOR DIRECTORY BUILD: 2026-08-03b', 1)
text = text.replace(old_css, new_css, 1)
text = text.replace(old_js, new_js, 1)
path.write_text(text, encoding='utf-8')
print('Updated Education asset URLs to immutable jsDelivr assets')
