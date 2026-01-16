import re

with open('/Users/kevinweinkauff/Homepage/2025Updates/MLS-Membership-Information-2025.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Map of tool names to their logo domains
logos = {
    'Agent 3000': 'agent3000.com',
    "Builder's Update": 'buildersupdate.com',
    'BrokerBay': 'brokerbay.com',
    'Domus Analytics': 'domusanalytics.com',
    'ShowingTime+': 'showingtimeplus.com',
    'Realtor.com Professional': 'realtor.com',
    'MLS Advantage': 'floridarealtors.org',
    'RPR': 'narrpr.com',
    'InfoSparks': 'showingtimeplus.com',
    'FOREWARN': 'forewarn.com',
    'Member Portal': 'growthzone.com',
    'FR Tech Helpline': 'floridarealtors.org',
    'RentSpree': 'rentspree.com',
    'CubiCasa': 'cubi.casa',
    'TrustedOnly': 'trustedonly.com',
    'Market Reports': 'bonitaesterorealtors.com'
}

# Pattern to find tool divs that don't already have logos
pattern = r'(<div class="tool reveal reveal-up">)\s*\n(\s*)(<h4>)(.*?)(</h4>)'

def replace_tool(match):
    opening_div = match.group(1)
    indent = match.group(2)
    h4_open = match.group(3)
    tool_name = match.group(4)
    h4_close = match.group(5)
    
    domain = logos.get(tool_name, '')
    if domain:
        logo_html = f'{indent}<div class="tool-logo"><img src="https://logo.clearbit.com/{domain}" alt="{tool_name}" loading="lazy"></div>\n{indent}<div class="tool-content">\n{indent}{h4_open}{tool_name}{h4_close}'
        return f'{opening_div}\n{logo_html}'
    return match.group(0)

content = re.sub(pattern, replace_tool, content)

# Now close the tool-content divs
content = re.sub(
    r'(</a></p>)\n(\s+)(</div>)',
    r'\1\n\2</div>\n\2\3',
    content
)

with open('/Users/kevinweinkauff/Homepage/2025Updates/MLS-Membership-Information-2025.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated successfully")
