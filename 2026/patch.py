import re

with open('Homepage2025.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('hero_css.txt', 'r', encoding='utf-16') as f:
    hero_css = f.read()
    
with open('hero_js.txt', 'r', encoding='utf-16') as f:
    hero_js = f.read()

with open('hero_html.txt', 'r', encoding='utf-16') as f:
    hero_html = f.read()

# 1. Insert CSS right before the first </style>
first_style_end = html.find('</style>')
if first_style_end != -1:
    html = html[:first_style_end] + '\n' + hero_css + '\n' + html[first_style_end:]
    print("CSS Injected")

# 2. Replace JS block
# Use regex to find the block
js_pattern = re.compile(r'let vidnum = 1;.*?changeVidNum\(\);\s*};', re.DOTALL)
if js_pattern.search(html):
    html = js_pattern.sub(hero_js, html)
    print("JS Block Replaced")
else:
    print("Could not find JS block")

# 3. Replace HTML block
html_pattern = re.compile(r'<div class="video-contain">.*?</div>.*?<div class="important-links">', re.DOTALL)
# Wait, this will match until the LAST </div> before important-links, which is correct because video-contain contains multiple divs.
# But let's be more precise
if html_pattern.search(html):
    # we need to put <div class="important-links"> back because it's part of the match
    html = html_pattern.sub(hero_html + '\n\n<div class="important-links">', html)
    print("HTML Block Replaced")
else:
    print("Could not find HTML block")

# 4. Fix image hover bug
html = html.replace('img:hover {\n    transform: scale(1.1);\n  }', '.mni-marquee-container img:hover {\n    transform: scale(1.1);\n  }')
html = html.replace('img:hover {\n      transform: scale(1.1);\n    }', '.mni-marquee-container img:hover {\n      transform: scale(1.1);\n    }')

with open('Homepage2025.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Done!")
