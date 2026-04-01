// ===================== SETTINGS =====================
const DEFAULTS = {
  orgName: 'Bonita Springs–Estero REALTORS®',
  orgAddr: '25300 Bernwood Drive, Suite 1 · Bonita Springs, FL 34135',
  supportEmail: 'Support@BERealtors.org',
  heroW: 730, heroH: 315,
  heroPrompt: 'Create a professional promotional email hero banner image. Style: clean, modern, corporate. Include bold headline text overlay. No photographic people unless they are stylized corporate illustrations or cartoon-style. Vibrant yet professional palette. Sharp edges, no blurry elements.',
  noPeople: true,
  emailMaxW: 730,
  mergeTag: '{{CFirstName}}',
  fontFamily: 'Arial, Helvetica, sans-serif',
  preheaderLen: 200,
  ctaShape: 'pill',
  c1a:'#008080',c1b:'#02aae1',
  c2a:'#1a237e',c2b:'#c5a44e',
  c3a:'#c62828',c3b:'#f57c00'
};

function getSettings() {
  try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('ebg_settings'))); }
  catch(e) { return {...DEFAULTS}; }
}

function saveSettings() {
  const s = {
    orgName: gv('sOrgName'), orgAddr: gv('sOrgAddr'), supportEmail: gv('sSupportEmail'),
    heroW: +gv('sHeroW'), heroH: +gv('sHeroH'), heroPrompt: gv('sHeroPrompt'),
    noPeople: document.getElementById('sNoPeople').classList.contains('on'),
    emailMaxW: +gv('sEmailMaxW'), mergeTag: gv('sMergeTag'),
    fontFamily: gv('sFontFamily'), preheaderLen: +gv('sPreheaderLen'),
    ctaShape: gv('sCtaShape'),
    c1a:gv('sC1a'),c1b:gv('sC1b'),c2a:gv('sC2a'),c2b:gv('sC2b'),c3a:gv('sC3a'),c3b:gv('sC3b')
  };
  localStorage.setItem('ebg_settings', JSON.stringify(s));
  toast('Settings saved!');
}

function resetSettings() {
  localStorage.removeItem('ebg_settings');
  loadSettingsUI();
  toast('Settings reset to defaults');
}

function loadSettingsUI() {
  const s = getSettings();
  sv('sOrgName',s.orgName);sv('sOrgAddr',s.orgAddr);sv('sSupportEmail',s.supportEmail);
  sv('sHeroW',s.heroW);sv('sHeroH',s.heroH);sv('sHeroPrompt',s.heroPrompt);
  const np=document.getElementById('sNoPeople');s.noPeople?np.classList.add('on'):np.classList.remove('on');
  sv('sEmailMaxW',s.emailMaxW);sv('sMergeTag',s.mergeTag);sv('sFontFamily',s.fontFamily);
  sv('sPreheaderLen',s.preheaderLen);sv('sCtaShape',s.ctaShape);
  sv('sC1a',s.c1a);sv('sC1b',s.c1b);sv('sC2a',s.c2a);sv('sC2b',s.c2b);sv('sC3a',s.c3a);sv('sC3b',s.c3b);
  sv('sC1aHex',s.c1a);sv('sC1bHex',s.c1b);sv('sC2aHex',s.c2a);sv('sC2bHex',s.c2b);sv('sC3aHex',s.c3a);sv('sC3bHex',s.c3b);
  // sync color pickers with text
  ['sC1a','sC1b','sC2a','sC2b','sC3a','sC3b'].forEach(id=>{
    document.getElementById(id).addEventListener('input',()=>{document.getElementById(id+'Hex').value=document.getElementById(id).value});
  });
}

function gv(id){return document.getElementById(id).value}
function sv(id,v){document.getElementById(id).value=v}

function toggleSettings(){
  document.getElementById('settingsPanel').classList.toggle('open');
  document.getElementById('backdrop').classList.toggle('open');
}

function toast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

// ===================== ADDITIONAL LINKS =====================
let additionalLinks = [];

function addLink(){
  additionalLinks.push({label:'',url:''});
  renderLinks();
}

function removeLink(i){
  additionalLinks.splice(i,1);
  renderLinks();
}

function renderLinks(){
  const c=document.getElementById('linkRepeater');
  c.innerHTML=additionalLinks.map((l,i)=>`
    <div class="link-repeater-item">
      <div><input type="text" placeholder="Label (e.g. Watch Video)" value="${esc(l.label)}" onchange="additionalLinks[${i}].label=this.value"></div>
      <div><input type="url" placeholder="https://..." value="${esc(l.url)}" onchange="additionalLinks[${i}].url=this.value"></div>
      <button class="remove-link" onclick="removeLink(${i})">✕</button>
    </div>`).join('');
}

function esc(s){return s.replace(/"/g,'&quot;').replace(/</g,'&lt;')}

// ===================== TAB SWITCHING =====================
let currentTab = 0;
function switchTab(idx,btn){
  currentTab=idx;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  const panel=document.getElementById('panel-'+idx);
  if(panel)panel.classList.add('active');
}

// ===================== COPY =====================
function copyText(id){
  const el=document.getElementById(id);
  const text=el.innerText||el.textContent;
  navigator.clipboard.writeText(text).then(()=>{
    const btn=el.parentElement.querySelector('.copy-btn');
    if(btn){btn.textContent='✓ Copied!';btn.classList.add('copied');setTimeout(()=>{btn.textContent='Copy';btn.classList.remove('copied')},2000);}
    toast('Copied to clipboard!');
  });
}

// ===================== YOUTUBE HELPERS =====================
function getYouTubeId(url){
  const m=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m?m[1]:null;
}

// ===================== EMAIL GENERATION =====================
// Store state globally so hero image can be applied after generation
let _genData = null;
let _genVariations = [];
let _genPreheaders = [];
let _genSettings = null;

function generateAll(){
  // sync link inputs
  document.querySelectorAll('.link-repeater-item input').forEach((inp,i)=>{
    const idx=Math.floor(i/2);const field=i%2===0?'label':'url';
    if(additionalLinks[idx])additionalLinks[idx][field]=inp.value;
  });

  const data={
    title:gv('eventTitle'),dateTime:gv('eventDateTime'),instructor:gv('instructor'),
    cost:gv('cost'),credits:gv('ceCredits'),regLink:gv('regLink'),
    description:gv('description'),links:[...additionalLinks]
  };

  if(!data.title){toast('Please enter an event title');return;}

  const s=getSettings();
  const variations=[
    {name:'A — Professional',tone:'professional',colorA:s.c1a,colorB:s.c1b,badge:'#008080'},
    {name:'B — Energetic',tone:'energetic',colorA:s.c2a,colorB:s.c2b,badge:'#1a237e'},
    {name:'C — Urgency',tone:'urgency',colorA:s.c3a,colorB:s.c3b,badge:'#c62828'}
  ];

  // Generate preheaders once so they stay consistent
  _genData = data;
  _genVariations = variations;
  _genSettings = s;
  _genPreheaders = variations.map(v => generatePreheader(data, v, s));

  const container=document.getElementById('tabContent');
  container.innerHTML='';

  variations.forEach((v,i)=>{
    const preheader = _genPreheaders[i];
    const emailHtml = generateEmailHTML(data, v, s, preheader, '');
    const heroPrompt = generateHeroPrompt(data, v, s);

    const panel=document.createElement('div');
    panel.className='tab-panel'+(i===0?' active':'');
    panel.id='panel-'+i;
    panel.innerHTML=`
      <div class="output-section">
        <div class="output-label">📝 Preheader Text <button class="copy-btn" onclick="copyText('pre-${i}')">Copy</button></div>
        <div class="output-box" id="pre-${i}">${escHtml(preheader)}</div>
      </div>
      <div class="output-section">
        <div class="output-label">👁️ Email Preview</div>
        <iframe class="preview-frame" id="frame-${i}" sandbox="allow-same-origin"></iframe>
      </div>
      <div class="output-section">
        <div class="output-label">🖼️ Hero Image URL <span style="font-size:11px;color:var(--text2);font-weight:400;text-transform:none;letter-spacing:0">(paste your hosted image URL after generating in Gemini)</span></div>
        <div style="display:flex;gap:8px;margin-bottom:4px">
          <input type="url" id="heroUrl-${i}" placeholder="https://yourdomain.com/path/to/hero-image.png" style="flex:1">
          <button class="copy-btn" style="padding:8px 16px;font-size:13px;font-weight:600" onclick="applyHeroImage(${i})">🖼️ Apply</button>
        </div>
      </div>
      <div class="output-section">
        <div class="output-label">🎨 Hero Image AI Prompt (Gemini) <button class="copy-btn" onclick="copyText('hero-${i}')">Copy</button></div>
        <div class="output-box" id="hero-${i}">${escHtml(heroPrompt)}</div>
      </div>
      <div class="output-section">
        <div class="output-label">📋 Raw HTML Code <button class="copy-btn" onclick="copyText('code-${i}')">Copy</button></div>
        <div class="output-box" id="code-${i}" style="max-height:400px">${escHtml(emailHtml)}</div>
      </div>`;
    container.appendChild(panel);

    // write preview
    setTimeout(()=>{
      const frame=document.getElementById('frame-'+i);
      const doc=frame.contentDocument||frame.contentWindow.document;
      doc.open();doc.write(emailHtml);doc.close();
    },50);
  });

  document.getElementById('emptyState').style.display='none';
  document.getElementById('outputArea').style.display='block';
  // reset tabs
  document.querySelectorAll('.tab').forEach((t,i)=>{t.classList.toggle('active',i===0)});
  currentTab=0;
  toast('3 variations generated!');
}

// Apply a hosted hero image URL to a specific variation
function applyHeroImage(idx) {
  const url = gv('heroUrl-' + idx);
  if (!url) { toast('Please paste a hero image URL first'); return; }

  const v = _genVariations[idx];
  const preheader = _genPreheaders[idx];
  const emailHtml = generateEmailHTML(_genData, v, _genSettings, preheader, url);

  // Update the raw HTML code block
  document.getElementById('code-' + idx).textContent = emailHtml;

  // Update the preview iframe
  const frame = document.getElementById('frame-' + idx);
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open(); doc.write(emailHtml); doc.close();

  toast('Hero image applied to Variation ' + ['A','B','C'][idx] + '!');
}

function escHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

// ===================== PREHEADER =====================
function generatePreheader(data,v,s){
  const templates = {
    professional:[
      `${data.title} — ${data.dateTime}. Register now to earn your CE credits.`,
      `Advance your career: ${data.title} with ${data.instructor||'expert instruction'}. Spots are limited.`
    ],
    energetic:[
      `Don't miss out! ${data.title} is coming ${data.dateTime}. Secure your seat today!`,
      `Level up your skills! Join ${data.instructor||'us'} for an unforgettable session on ${data.title}.`
    ],
    urgency:[
      `⏰ Time is running out! ${data.title} — ${data.dateTime}. Register before it's full!`,
      `Last chance: ${data.title} seats are filling fast. Don't get left behind!`
    ]
  };
  const options=templates[v.tone]||templates.professional;
  let pre=options[Math.floor(Math.random()*options.length)];
  return pre.substring(0,s.preheaderLen);
}

// ===================== PARSE BULLETS =====================
function parseBullets(desc){
  const lines=desc.split(/[•\n]/g).map(l=>l.trim()).filter(l=>l.length>3);
  return lines;
}

// ===================== BODY COPY =====================
function generateBodyCopy(data,v,s){
  const tag=s.mergeTag;
  const bullets=parseBullets(data.description);
  const hasLearning=bullets.length>2;

  // Extract learning objectives (shorter ones that start with a verb)
  const objectives=bullets.filter(b=>b.length<200);
  // Long paragraph = first bullet or anything really long
  const introParts=bullets.filter(b=>b.length>=200);
  const introText=introParts.length?introParts[0]:'';

  if(v.tone==='professional'){
    let body=`<p style="margin:0 0 16px">Hi ${tag},</p>`;
    body+=`<p style="margin:0 0 16px">${s.orgName} is pleased to present an important educational opportunity:</p>`;
    body+=`<p style="margin:0 0 8px"><strong style="font-size:16px">${data.title}</strong></p>`;
    if(introText)body+=`<p style="margin:0 0 16px;color:#555555;font-size:14px">${introText}</p>`;
    body+=generateDetailsBlock(data,v);
    if(objectives.length>1) body+=generateLearnBlock(objectives,'What You Will Learn:',v);
    body+=`<p style="margin:16px 0">Don't miss this opportunity to enhance your professional knowledge and stay ahead of the curve. Secure your spot today — space is limited.</p>`;
    return body;
  }
  if(v.tone==='energetic'){
    let body=`<p style="margin:0 0 16px">Hi ${tag},</p>`;
    body+=`<p style="margin:0 0 16px">Are you ready to <strong>power up</strong> your real estate expertise? ${s.orgName} is bringing you a can't-miss class that will transform how you approach your business!</p>`;
    body+=`<p style="margin:0 0 8px"><strong style="font-size:18px">${data.title}</strong></p>`;
    if(introText)body+=`<p style="margin:0 0 16px;color:#555555;font-size:14px">${introText}</p>`;
    body+=generateDetailsBlock(data,v);
    if(objectives.length>1) body+=generateLearnBlock(objectives,'Here\'s what you\'ll walk away knowing:',v);
    body+=`<p style="margin:16px 0">This is YOUR chance to level up. Led by the incredible <strong>${data.instructor||'our expert instructor'}</strong>, this session is packed with actionable insights you can use <em>immediately</em>.</p>`;
    body+=`<p style="margin:8px 0"><strong>Seats are limited — grab yours now!</strong></p>`;
    return body;
  }
  // urgency
  let body=`<p style="margin:0 0 16px">Hi ${tag},</p>`;
  body+=`<p style="margin:0 0 16px"><strong>⚠️ Don't risk falling behind.</strong> This critical class is designed to keep you sharp, compliant, and ahead of the competition.</p>`;
  body+=`<p style="margin:0 0 8px"><strong style="font-size:17px">${data.title}</strong></p>`;
  if(introText)body+=`<p style="margin:0 0 16px;color:#555555;font-size:14px">${introText}</p>`;
  body+=generateDetailsBlock(data,v);
  if(objectives.length>1) body+=generateLearnBlock(objectives,'Why You NEED to Be There:',v);
  body+=`<p style="margin:16px 0">Learn from the best! <strong>${data.instructor||'Our expert instructor'}</strong> will break down complex topics into actionable knowledge, making sure you leave confident and prepared.</p>`;
  body+=`<p style="margin:8px 0;font-weight:bold;color:${v.colorA}">Spots are filling up FAST! Grab your seat now:</p>`;
  return body;
}

function truncate(s,n){return s.length>n?s.substring(0,n)+'...':s}

function generateDetailsBlock(data,v){
  let html=`<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-left:4px solid ${v.colorA};padding-left:12px"><tr><td>`;
  html+=`<p style="font-weight:700;font-size:15px;margin:0 0 8px;color:${v.colorA}">Event At-A-Glance:</p>`;
  html+=`<table cellpadding="4" cellspacing="0" style="font-size:14px">`;
  html+=`<tr><td style="font-weight:700;vertical-align:top;padding-right:8px">WHAT:</td><td>${data.title}</td></tr>`;
  html+=`<tr><td style="font-weight:700;vertical-align:top;padding-right:8px">WHEN:</td><td>${data.dateTime}</td></tr>`;
  if(data.instructor)html+=`<tr><td style="font-weight:700;vertical-align:top;padding-right:8px">WHO:</td><td>${data.instructor}</td></tr>`;
  if(data.cost)html+=`<tr><td style="font-weight:700;vertical-align:top;padding-right:8px">COST:</td><td>${data.cost}</td></tr>`;
  if(data.credits)html+=`<tr><td style="font-weight:700;vertical-align:top;padding-right:8px">CREDITS:</td><td>${data.credits}</td></tr>`;
  html+=`</table></td></tr></table>`;
  return html;
}

function generateLearnBlock(objectives,heading,v){
  const display=objectives.slice(0,10);
  let html=`<p style="font-weight:700;margin:16px 0 8px;color:${v.colorA}">${heading}</p><ul style="padding-left:20px;margin:0 0 16px">`;
  display.forEach(o=>{html+=`<li style="margin-bottom:6px;font-size:14px;color:#333333">${o}</li>`});
  html+=`</ul>`;
  return html;
}

// ===================== EMAIL HTML =====================
function generateEmailHTML(data, v, s, preheader, heroImageUrl){
  const ctaRadius = s.ctaShape==='pill'?'50px':s.ctaShape==='rounded'?'8px':'0px';
  const bodyCopy=generateBodyCopy(data,v,s);
  // preheader is now passed in so it stays consistent

  let ytSection='';
  let extraButtons='';
  const links=data.links.filter(l=>l.url);

  links.forEach(link=>{
    const ytId=getYouTubeId(link.url);
    if(ytId){
      ytSection+=`
      <tr><td style="padding:16px 0">
        <p style="font-weight:700;margin:0 0 8px;font-size:14px">${link.label||'Watch the Video:'}</p>
        <a href="${link.url}" target="_blank" style="display:block;text-decoration:none">
          <img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" width="100%" style="max-width:480px;border-radius:8px;border:1px solid #dddddd" alt="${link.label||'Watch Video'}">
        </a>
      </td></tr>`;
    } else {
      extraButtons+=`
      <tr><td style="padding:6px 0" align="center">
        <table cellpadding="0" cellspacing="0" width="100%" style="max-width:400px"><tr><td align="center" style="background:transparent;border:2px solid ${v.colorA};border-radius:${ctaRadius};padding:12px 24px">
          <a href="${link.url}" target="_blank" style="color:${v.colorA};text-decoration:none;font-weight:700;font-size:15px;display:block">${link.label||'Learn More'}</a>
        </td></tr></table>
      </td></tr>`;
    }
  });

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${data.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:${s.fontFamily};font-size:15px;line-height:1.6;color:#333333">
<!-- Preheader -->
<span style="display:none!important;font-size:1px;color:#f4f4f4;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</span>

<!-- Outer wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4">
<tr><td align="center" style="padding:0">

<!-- Preheader bar -->
<table width="${s.emailMaxW}" cellpadding="0" cellspacing="0" style="max-width:${s.emailMaxW}px">
<tr><td style="background:linear-gradient(135deg,${v.colorA},${v.colorB});padding:12px 24px;text-align:center;font-style:italic;color:#ffffff;font-size:14px">
${preheader}
</td></tr>
</table>

<!-- Hero image area -->
<table width="${s.emailMaxW}" cellpadding="0" cellspacing="0" style="max-width:${s.emailMaxW}px">
${heroImageUrl ? `<tr><td style="text-align:center;padding:0;background-color:#ffffff">
<img src="${heroImageUrl}" width="${s.emailMaxW}" style="width:100%;max-width:${s.emailMaxW}px;height:auto;display:block" alt="${data.title}">
</td></tr>` : `<tr><td style="background:linear-gradient(135deg,${v.colorA},${v.colorB});text-align:center;padding:0">
<div style="width:100%;height:${s.heroH}px;background:linear-gradient(135deg,${v.colorA}dd,${v.colorB}dd);display:flex;align-items:center;justify-content:center;text-align:center;">
<!--[if mso]>
<v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:${s.emailMaxW}px;height:${s.heroH}px;">
<v:fill type="gradient" color="${v.colorA}" color2="${v.colorB}" angle="135"/>
<v:textbox inset="0,0,0,0">
<![endif]-->
<table width="100%" cellpadding="0" cellspacing="0" style="height:${s.heroH}px"><tr><td align="center" valign="middle" style="padding:24px;color:#ffffff">
<p style="font-size:28px;font-weight:800;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;text-shadow:0 2px 8px rgba(0,0,0,0.3)">${data.title}</p>
<p style="font-size:16px;margin:0 0 4px;opacity:.9">📅 ${data.dateTime}</p>
${data.instructor?`<p style="font-size:13px;margin:0;opacity:.8">Instructor: ${data.instructor}</p>`:''}
<p style="font-size:12px;margin:12px 0 0;opacity:.7;font-style:italic">[Replace with generated hero image]</p>
</td></tr></table>
<!--[if mso]>
</v:textbox></v:rect>
<![endif]-->
</div>
</td></tr>`}
</table>

<!-- Body -->
<table width="${s.emailMaxW}" cellpadding="0" cellspacing="0" style="max-width:${s.emailMaxW}px;background-color:#ffffff">
<tr><td style="padding:32px 40px">

${bodyCopy}

</td></tr>

<!-- Primary CTA -->
<tr><td style="padding:8px 40px 16px" align="center">
<table cellpadding="0" cellspacing="0" width="100%" style="max-width:440px"><tr><td align="center" style="background:${v.colorA};border-radius:${ctaRadius};padding:16px 32px">
<a href="${data.regLink||'#'}" target="_blank" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;display:block;letter-spacing:.5px">Register Here</a>
</td></tr></table>
</td></tr>

${extraButtons}
${ytSection}

<!-- Contact -->
<tr><td style="padding:16px 40px 32px">
<p style="font-size:13px;color:#777777">Have Questions? Reach out to <a href="mailto:${s.supportEmail}" style="color:${v.colorA};text-decoration:underline">${s.supportEmail}</a></p>
</td></tr>
</table>

<!-- Footer -->
<table width="${s.emailMaxW}" cellpadding="0" cellspacing="0" style="max-width:${s.emailMaxW}px">
<tr><td style="border-top:3px solid ${v.colorA};padding:20px 40px;text-align:center;font-size:12px;color:#999999">
${s.orgName} · ${s.orgAddr}
</td></tr>
</table>

</td></tr>
</table>
</body>
</html>`;
}

// ===================== HERO IMAGE PROMPT =====================
function generateHeroPrompt(data,v,s){
  const peopleRule=s.noPeople?'Do NOT include any photographic or realistic human faces or figures. Only use stylized corporate illustrations, icons, or abstract human silhouettes if needed.':'People may be included as professional corporate figures.';

  const themeMap={
    professional:'Clean, sophisticated, and trustworthy. Use a balanced composition with structured layout elements like geometric shapes, subtle gradients, and professional iconography.',
    energetic:'Dynamic, vibrant, and exciting. Use bold angles, energetic visual elements like arrows or bursts, and high-contrast design with strong visual movement.',
    urgency:'Bold, urgent, and attention-grabbing. Use strong diagonal compositions, countdown-style elements, and warning-inspired visual cues with high-impact typography.'
  };

  // Extract theme keywords from title
  const keywords=data.title.replace(/[()]/g,'').split(/\s+/).filter(w=>w.length>3).slice(0,5).join(', ');

  return `${s.heroPrompt}

EXACT DIMENSIONS: ${s.heroW}px wide × ${s.heroH}px tall.
ASPECT RATIO: ${s.heroW}:${s.heroH} (wide banner format).

COLOR PALETTE: Primary: ${v.colorA}, Secondary: ${v.colorB}. Use these as the dominant colors with complementary accents.

DESIGN STYLE: ${themeMap[v.tone]}

CONTENT TO INCLUDE:
- Large, bold headline text: "${data.title}"
- Date and time: "${data.dateTime}"
- A subtle tag/badge area for: "${data.credits||''}" 
${data.instructor?`- Instructor credit line: "Instructor: ${data.instructor}"`:``}
- Organization branding area for "${s.orgName}"

THEME KEYWORDS: ${keywords}

${peopleRule}

ADDITIONAL RULES:
- Text must be easily readable against the background
- Use modern, clean sans-serif typography in the image
- Include relevant thematic icons or illustrations (e.g. for Fair Housing: houses, scales of justice, keys, community; for tax classes: documents, globe, currency symbols)
- Add a clear call-to-action element like "Register Now" or "Reserve Your Spot"
- The banner should look like a premium, professionally-designed email header
- Ensure all elements have sharp edges and high contrast
- Do not use stock photo aesthetics — aim for a designed, illustrated look`;
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded',()=>{
  loadSettingsUI();
});
