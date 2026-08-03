#!/usr/bin/env python3
from pathlib import Path

path = Path('2026/assets/ccor-education.js')
text = path.read_text(encoding='utf-8')

old = """  function asDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
"""
new = """  function asDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);
      return Number.isNaN(localDate.getTime()) ? null : localDate;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
"""
if new not in text:
    if old not in text:
        raise RuntimeError('asDate anchor missing')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('Updated Education local-date parsing')
