from pathlib import Path

path = Path(__file__).resolve().parent / 'AGENT DIRECTORY' / 'index.html'
text = path.read_text()
literal = "${'<div class=\"skeleton\"></div>'.repeat(6)}"
replacement = '<div class="skeleton"></div>' * 6
if literal in text:
    path.write_text(text.replace(literal, replacement, 1))
    print('Replaced the initial directory skeleton placeholder.')
else:
    print('Directory skeleton placeholder was already cleaned.')
