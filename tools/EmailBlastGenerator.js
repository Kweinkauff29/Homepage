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
    const el = document.getElementById(id);
    if(el) el.addEventListener('input',()=>{document.getElementById(id+'Hex').value=document.getElementById(id).value});
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

function esc(s){return s ? s.toString().replace(/"/g,'&quot;').replace(/</g,'&lt;') : ''}
function escHtml(s){return s ? s.toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''}

// ===================== TAB SWITCHING =====================
let currentTab = 0;
function switchTab(idx,btn){
  currentTab=idx;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  
  // Hide all panels
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  
  if(idx === 3) {
    // Composer
    document.getElementById('composerPanel').classList.add('active');
    return;
  }
  
  const panel=document.getElementById('panel-'+idx);
  if(panel) panel.classList.add('active');
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
let currentMode = 'single'; // 'single' or 'friday'
let fridaySections = []; // array of {id, title, dateTime, instructor, cost, credits, regLink, description, heroUrl, links:[]}
let composerPicks = {}; // sectionId -> variationIndex (0,1,2)

let _genData = null;
let _genVariations = [];
let _genPreheaders = [];
let _genSettings = null;

function setMode(mode){
  currentMode = mode;
  document.getElementById('modeSingle').classList.toggle('active', mode==='single');
  document.getElementById('modeFriday').classList.toggle('active', mode==='friday');
  document.getElementById('singleModeFields').style.display = mode==='single' ? 'block' : 'none';
  document.getElementById('fridayModeFields').style.display = mode==='friday' ? 'block' : 'none';
  if(mode==='friday' && fridaySections.length===0) addFridaySection();
}

function addFridaySection(){
  const id = Date.now();
  fridaySections.push({id, title:'', dateTime:'', location:'', instructor:'', cost:'', credits:'', regLink:'', description:'', heroUrl:'', variationIndex: 0, customColor: '', links:[]});
  renderFridaySections();
}

function removeFridaySection(id){
  fridaySections = fridaySections.filter(s=>s.id!==id);
  renderFridaySections();
}

function renderFridaySections(){
  const container = document.getElementById('fridaySections');
  if(!container) return;
  
  // Safety: Ensure variations are populated or use defaults
  const defaultVars = [
    {tone:'professional', colorA:'#008080', colorB:'#02aae1'},
    {tone:'energetic', colorA:'#1a237e', colorB:'#c5a44e'},
    {tone:'urgency', colorA:'#c62828', colorB:'#f57c00'}
  ];
  const activeVars = (_genVariations && _genVariations.length >= 3) ? _genVariations : defaultVars;

  container.innerHTML = fridaySections.map((sec, idx) => {
    const vIdx = sec.variationIndex || 0;
    const activeColor = sec.customColor || activeVars[vIdx].colorA;
    
    return `
    <div class="card" style="margin-bottom:16px;border-color:var(--border);background:var(--bg);position:relative">
      <div class="card-header" style="font-size:13px;padding:8px 16px;justify-content:space-between;border-bottom:2px solid ${activeColor}">
        <span>Section #${idx+1}: ${truncate(sec.title, 30) || '(New Event)'}</span>
        <div style="display:flex;gap:4px">
          <div class="tabs" style="margin-bottom:0;padding:2px">
            <button class="tab ${vIdx===0?'active':''}" onclick="updateFSec(${sec.id},'variationIndex',0)" style="padding:2px 8px;font-size:10px">A</button>
            <button class="tab ${vIdx===1?'active':''}" onclick="updateFSec(${sec.id},'variationIndex',1)" style="padding:2px 8px;font-size:10px">B</button>
            <button class="tab ${vIdx===2?'active':''}" onclick="updateFSec(${sec.id},'variationIndex',2)" style="padding:2px 8px;font-size:10px">C</button>
          </div>
          <button class="btn-sm btn-danger" onclick="removeFridaySection(${sec.id})" style="padding:2px 8px;font-size:10px">✕</button>
        </div>
      </div>
      <div class="card-body" style="padding:16px">
        <div class="form-group"><label>Event Title</label><input type="text" value="${esc(sec.title)}" onchange="updateFSec(${sec.id},'title',this.value)"></div>
        <div class="form-row">
          <div class="form-group"><label>Date/Time</label><input type="text" value="${esc(sec.dateTime)}" onchange="updateFSec(${sec.id},'dateTime',this.value)"></div>
          <div class="form-group"><label>Location</label><input type="text" value="${esc(sec.location)}" onchange="updateFSec(${sec.id},'location',this.value)" placeholder="e.g. BER Office / Zoom"></div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:2"><label>Registration Link</label><input type="url" value="${esc(sec.regLink)}" onchange="updateFSec(${sec.id},'regLink',this.value)"></div>
          <div class="form-group"><label>Custom Color (Hex)</label><input type="text" value="${esc(sec.customColor)}" onchange="updateFSec(${sec.id},'customColor',this.value)" placeholder="#000000"></div>
        </div>
        <div class="form-group"><label>Credits/Cost</label><input type="text" value="${esc(sec.credits)}" onchange="updateFSec(${sec.id},'credits',this.value)" placeholder="e.g. 3CE / FREE"></div>
        <div class="form-group"><label>Detailed Sales Copy</label><textarea style="min-height:100px;font-size:12px" onchange="updateFSec(${sec.id},'description',this.value)" placeholder="Write a compelling description that sells this event to agents...">${esc(sec.description)}</textarea></div>
        
        <div class="form-group">
          <label style="display:flex;justify-content:space-between">Additional Buttons <button class="btn-sm" onclick="addFSecLink(${sec.id})" style="font-size:10px">+ Add Link</button></label>
          <div id="fLinks-${sec.id}">
            ${(sec.links||[]).map((l, lIdx) => `
              <div class="form-row" style="margin-bottom:4px">
                <input type="text" value="${esc(l.label)}" placeholder="Label" style="flex:1;font-size:11px" onchange="updateFSecLink(${sec.id},${lIdx},'label',this.value)">
                <input type="url" value="${esc(l.url)}" placeholder="URL" style="flex:2;font-size:11px" onchange="updateFSecLink(${sec.id},${lIdx},'url',this.value)">
                <button class="btn-sm btn-danger" onclick="removeFSecLink(${sec.id},${lIdx})" style="padding:0 8px">✕</button>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="background:rgba(0,191,165,0.05);padding:12px;border-radius:8px;border:1px solid var(--border);margin-top:8px">
          <label style="color:var(--accent);margin-bottom:8px;display:flex;justify-content:space-between">
            🖼️ Hero Image 
            <button class="btn-sm" onclick="copySectionHeroPrompt(${sec.id})" style="font-size:10px">📋 Copy AI Prompt</button>
          </label>
          <input type="url" value="${esc(sec.heroUrl)}" onchange="updateFSec(${sec.id},'heroUrl',this.value)" placeholder="Paste image URL here" style="font-size:12px">
        </div>
      </div>
    </div>
  `}).join('');
}

function addFSecLink(id){
  const s = fridaySections.find(x=>x.id===id);
  if(s){
    if(!s.links) s.links = [];
    s.links.push({label:'', url:''});
    renderFridaySections();
  }
}

function updateFSecLink(id, lIdx, field, val){
  const s = fridaySections.find(x=>x.id===id);
  if(s && s.links[lIdx]){
    s.links[lIdx][field] = val;
  }
}

function removeFSecLink(id, lIdx){
  const s = fridaySections.find(x=>x.id===id);
  if(s){
    s.links.splice(lIdx, 1);
    renderFridaySections();
  }
}


function updateFSec(id, field, val){
  const s = fridaySections.find(x=>x.id===id);
  if(s) {
    s[field] = val;
    if(field === "variationIndex") renderFridaySections();
  }
}

// ===================== AI INTEGRATION =====================
function generateAIPrompt(){
  const raw = gv('aiRawInput');
  if(!raw){toast('Paste some raw event details first!');return;}
  const prompt = `I am using an Email Blast Generator for a REALTOR association. Please parse the following raw input and return a JSON array of event objects. 

Each object MUST have exactly these fields: "title", "dateTime", "location", "instructor", "cost", "credits", "regLink", "description". 

PARSING RULES:
1. "title": Catchy, short event name.
2. "dateTime": Full date and time string.
3. "cost" & "credits": If multiple, combine them or put them in the credits field.
4. "description": This is the MOST IMPORTANT field. Write compelling, detailed "sales copy" that sells this event or class to real estate agents. Use 1-2 punchy paragraphs, then 3-5 bold bullet points highlighting the key benefits. The goal is to make them want to register NOW.
5. "regLink": The registration URL found in the text.

RAW INPUT TO PARSE:
${raw}

RETURN ONLY THE JSON ARRAY. NO MARKDOWN BLOCK, NO PREAMBLE. JUST THE [ ... ] CONTENT.`;
  navigator.clipboard.writeText(prompt);
  document.getElementById('importBox').style.display = 'block';
  toast('AI Prompt copied! Paste into Gemini, then paste response below.');
}

function importAIResponse(){
  try {
    const data = JSON.parse(gv('aiResponse'));
    if(!Array.isArray(data)){toast('Invalid format: Expected an array');return;}
    fridaySections = data.map(item => ({
      id: Date.now() + Math.random(),
      title: item.title||'',
      dateTime: item.dateTime||'',
      location: item.location||'',
      instructor: item.instructor||'',
      cost: item.cost||'',
      credits: item.credits||'',
      regLink: item.regLink||'',
      description: item.description||'',
      heroUrl: '',
      variationIndex: 0,
      customColor: '',
      links: []
    }));
    renderFridaySections();
    toast(`Imported ${data.length} sections!`);
  } catch(e) {
    toast('Error parsing JSON. Make sure you copy/pasted only the JSON array.');
  }
}

// ===================== EMAIL GENERATION =====================
function generateAll(){
  const s=getSettings();
  _genSettings = s;
  
  if(currentMode === 'single') {
    // sync link inputs
    document.querySelectorAll('#singleModeFields .link-repeater-item input').forEach((inp,i)=>{
      const idx=Math.floor(i/2);const field=i%2===0?'label':'url';
      if(additionalLinks[idx])additionalLinks[idx][field]=inp.value;
    });

    const data={
      title:gv('eventTitle'),dateTime:gv('eventDateTime'),instructor:gv('instructor'),
      cost:gv('cost'),credits:gv('ceCredits'),regLink:gv('regLink'),
      description:gv('description'),links:[...additionalLinks]
    };

    if(!data.title){toast('Please enter an event title');return;}

    const variations=[
      {name:'A — Professional',tone:'professional',colorA:s.c1a,colorB:s.c1b,badge:'#008080'},
      {name:'B — Energetic',tone:'energetic',colorA:s.c2a,colorB:s.c2b,badge:'#1a237e'},
      {name:'C — Urgency',tone:'urgency',colorA:s.c3a,colorB:s.c3b,badge:'#c62828'}
    ];

    _genData = data;
    _genVariations = variations;
    _genPreheaders = variations.map(v => generatePreheader(data, v, s));

    const container=document.getElementById('tabContent');
    container.innerHTML='';

    variations.forEach((v,i)=>{
      const preheader = _genPreheaders[i];
      const emailHtml = generateEmailHTML(data, v, s, preheader, '');
      const heroPrompt = generateHeroPrompt(data, v, s);
      renderVariationTab(i, v, preheader, emailHtml, heroPrompt, container);
    });
    
    document.getElementById('composerTabBtn').style.display = 'none';
  } else {
    // FRIDAY BLAST MODE
    if(fridaySections.length === 0){toast('Add at least one section');return;}
    
    _genData = { sections: [...fridaySections], intro: gv('fridayIntro') };
    _genVariations = [
      {name:'A — Professional',tone:'professional',colorA:s.c1a,colorB:s.c1b},
      {name:'B — Energetic',tone:'energetic',colorA:s.c2a,colorB:s.c2b},
      {name:'C — Urgency',tone:'urgency',colorA:s.c3a,colorB:s.c3b}
    ];
    
    const container=document.getElementById('tabContent');
    container.innerHTML='';
    
    _genVariations.forEach((v, i) => {
      const emailHtml = generateFridayBlastHTML(_genData, v, s);
      renderVariationTab(i, v, "Friday Update", emailHtml, "Prompt not applicable for multi-section", container);
    });
    
    document.getElementById('composerTabBtn').style.display = 'block';
    renderComposer();
  }

  document.getElementById('emptyState').style.display='none';
  document.getElementById('outputArea').style.display='block';
  switchTab(0, document.querySelectorAll('.tab')[0]);
  toast('Variations generated!');
}

function renderVariationTab(i, v, preheader, emailHtml, heroPrompt, container){
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
    ${currentMode==='single' ? `
    <div class="output-section">
      <div class="output-label">🖼️ Hero Image URL</div>
      <div style="display:flex;gap:8px;margin-bottom:4px">
        <input type="url" id="heroUrl-${i}" placeholder="https://..." style="flex:1">
        <button class="copy-btn" style="padding:8px 16px" onclick="applyHeroImage(${i})">🖼️ Apply</button>
      </div>
    </div>
    <div class="output-section">
      <div class="output-label">🎨 Hero Image AI Prompt <button class="copy-btn" onclick="copyText('hero-${i}')">Copy</button></div>
      <div class="output-box" id="hero-${i}">${escHtml(heroPrompt)}</div>
    </div>` : ''}
    <div class="output-section">
      <div class="output-label">📋 Raw HTML Code <button class="copy-btn" onclick="copyText('code-${i}')">Copy</button></div>
      <div class="output-box" id="code-${i}" style="max-height:400px">${escHtml(emailHtml)}</div>
    </div>`;
  container.appendChild(panel);

  setTimeout(()=>{
    const frame=document.getElementById('frame-'+i);
    const doc=frame.contentDocument||frame.contentWindow.document;
    doc.open();doc.write(emailHtml);doc.close();
  },50);
}

// ===================== COMPOSER =====================
function renderComposer(){
  const container = document.getElementById('composerSections');
  composerPicks = {};
  _genData.sections.forEach(s => composerPicks[s.id] = 0); // Default to Variation A
  
  container.innerHTML = _genData.sections.map(s => `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-weight:600;font-size:14px">${truncate(s.title, 40)}</span>
      <div class="tabs" style="margin-bottom:0;padding:2px">
        <button class="tab active" onclick="pickVar(${s.id},0,this)">A</button>
        <button class="tab" onclick="pickVar(${s.id},1,this)">B</button>
        <button class="tab" onclick="pickVar(${s.id},2,this)">C</button>
      </div>
    </div>
  `).join('');
  updateComposerPreview();
}

function pickVar(secId, varIdx, btn){
  composerPicks[secId] = varIdx;
  btn.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  updateComposerPreview();
}

function updateComposerPreview(){
  const html = generateFridayBlastHTML(_genData, null, _genSettings, true);
  document.getElementById('composerCode').textContent = html;
  const frame = document.getElementById('composerFrame');
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
}

// Apply a hosted hero image URL to a specific variation
function applyHeroImage(idx) {
  const url = gv('heroUrl-' + idx);
  if (!url) { toast('Please paste a hero image URL first'); return; }

  const v = _genVariations[idx];
  const preheader = _genPreheaders[idx];
  const emailHtml = generateEmailHTML(_genData, v, _genSettings, preheader, url);

  document.getElementById('code-' + idx).textContent = emailHtml;
  const frame = document.getElementById('frame-' + idx);
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open(); doc.write(emailHtml); doc.close();

  toast('Hero image applied to Variation ' + ['A','B','C'][idx] + '!');
}

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
  if(!desc) return [];
  const lines=desc.split(/[•\n]/g).map(l=>l.trim()).filter(l=>l.length>3);
  return lines;
}

// ===================== BODY COPY =====================
function generateBodyCopy(data,v,s){
  const tag=s.mergeTag;
  const bullets=parseBullets(data.description);
  const objectives=bullets.filter(b=>b.length<200);
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

function truncate(s,n){if(!s) return ''; return s.length>n?s.substring(0,n)+'...':s}

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

// ===================== FRIDAY BLAST HTML =====================
function generateFridayBlastHTML(data, v, s, isComposer = false){
  const hColor = gv('fridayHeaderCol') || '#004a32';
  const hTitle = gv('fridayHeaderTitle') || 'Upcoming at BER';
  const preText = gv('fridayIntro') || '';

  const sectionsHtml = data.sections.map(sec => {
    let activeV = v;
    let vIdx = sec.variationIndex || 0;
    
    if(isComposer) {
      const pickIdx = composerPicks[sec.id];
      activeV = _genVariations[pickIdx];
    } else if (v === null) {
      activeV = _genVariations[vIdx];
    }
    
    const themeColor = sec.customColor || activeV.colorA;
    const descHtml = sec.description ? sec.description.split('\n').join('<br>') : '';
    
    let extraBtnsHtml = '';
    if(sec.links && sec.links.length > 0) {
      sec.links.forEach(l => {
        if(l.url) {
          extraBtnsHtml += `
          <tr><td align="center" style="padding:4px 0">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto">
              <tr><td align="center" style="border:2px solid ${themeColor};border-radius:50px;padding:8px 30px">
                <a href="${l.url}" target="_blank" style="color:${themeColor};text-decoration:none;font-weight:700;font-size:14px;display:block">${l.label||'Learn More'}</a>
              </td></tr>
            </table>
          </td></tr>`;
        }
      });
    }

    return `
    <!-- Section: ${sec.title} -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;margin-bottom:40px">
      ${sec.heroUrl ? `<tr><td style="padding:0 0 16px">
        <img src="${sec.heroUrl}" width="${s.emailMaxW}" style="width:100%;max-width:${s.emailMaxW}px;height:auto;display:block" alt="${sec.title}">
      </td></tr>` : ''}
      <tr><td style="padding:0 32px">
        <p style="margin:0 0 12px;color:${themeColor};font-size:22px;font-weight:800;line-height:1.2;text-transform:uppercase;letter-spacing:.5px">
          ${sec.title}
        </p>
        <div style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333333">
          ${descHtml}
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#f9f9f9;border-left:4px solid ${themeColor};border-radius:0 4px 4px 0">
          <tr><td style="padding:12px 16px">
            <p style="margin:0;font-size:14px;color:#444444">📅 <strong>${sec.dateTime}</strong></p>
            ${sec.location ? `<p style="margin:4px 0 0;font-size:14px;color:#444444">📍 ${sec.location}</p>` : ''}
            ${sec.credits ? `<p style="margin:4px 0 0;font-size:14px;color:#666666">🏷️ ${sec.credits}</p>` : ''}
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding:8px 0 12px">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto">
              <tr><td align="center" style="background-color:${themeColor};border-radius:50px;padding:14px 40px">
                <a href="${sec.regLink||'#'}" target="_blank" style="color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;display:block">Register Here</a>
              </td></tr>
            </table>
          </td></tr>
          ${extraBtnsHtml}
        </table>
      </td></tr>
    </table>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Friday Blast</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:${s.fontFamily};line-height:1.6;color:#333333">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4">
<tr><td align="center" style="padding:0">
  <table width="${s.emailMaxW}" cellpadding="0" cellspacing="0" style="max-width:${s.emailMaxW}px;background-color:#ffffff">
    <tr><td align="center" style="background-color:${hColor};padding:32px 24px;color:#ffffff">
      <p style="margin:0;font-size:24px;font-weight:800;text-transform:uppercase;letter-spacing:1px">${hTitle}</p>
      ${preText ? `
      <div style="margin:16px auto 0;width:80%;max-width:400px;border-top:1px solid rgba(255,255,255,0.4);padding-top:16px;font-size:14px;opacity:0.9;line-height:1.4">
        ${preText}
      </div>` : ''}
    </td></tr>
    <tr><td style="padding:32px 24px 0">
      ${sectionsHtml}
    </td></tr>
    <tr><td style="padding:24px 48px;background-color:#ffffff;text-align:center;font-size:12px;color:#999999">
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}


// ===================== SINGLE EMAIL HTML =====================
function generateEmailHTML(data, v, s, preheader, heroImageUrl){
  const ctaRadius = s.ctaShape==='pill'?'50px':s.ctaShape==='rounded'?'8px':'0px';
  const bodyCopy=generateBodyCopy(data,v,s);

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

<!-- Footer Space -->
<table width="${s.emailMaxW}" cellpadding="0" cellspacing="0" style="max-width:${s.emailMaxW}px">
<tr><td style="padding:20px 40px"></td></tr>
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

  // Default to professional if v is null (for section-level prompts)
  const activeTone = v ? v.tone : 'professional';
  const activeColorA = v ? v.colorA : s.c1a;
  const activeColorB = v ? v.colorB : s.c1b;

  // Extract theme keywords from title
  const keywords=data.title.replace(/[()]/g,'').split(/\s+/).filter(w=>w.length>3).slice(0,5).join(', ');

  return `${s.heroPrompt}

EXACT DIMENSIONS: ${s.heroW}px wide × ${s.heroH}px tall.
ASPECT RATIO: ${s.heroW}:${s.heroH} (wide banner format).

COLOR PALETTE: Primary: ${activeColorA}, Secondary: ${activeColorB}. Use these as the dominant colors with complementary accents.

DESIGN STYLE: ${themeMap[activeTone]}

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

// Generate prompt for a specific Friday Blast section
function copySectionHeroPrompt(id) {
  const s = getSettings();
  const sec = fridaySections.find(x => x.id === id);
  if(!sec) return;
  
  const vIdx = sec.variationIndex || 0;
  const activeV = Object.assign({}, _genVariations[vIdx]);
  if(sec.customColor) activeV.colorA = sec.customColor;
  
  const prompt = generateHeroPrompt(sec, activeV, s);
  
  // New: Show in Preview
  const preview = document.getElementById('heroPromptPreview');
  const box = document.getElementById('promptPreviewBox');
  if(preview && box){
    preview.value = prompt;
    box.style.display = 'block';
    preview.scrollIntoView({behavior:'smooth', block:'center'});
  }

  navigator.clipboard.writeText(prompt);
  toast(`AI Hero Prompt (Theme ${['A','B','C'][vIdx]}) for "${truncate(sec.title, 20)}" copied!`);
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded',()=>{
  loadSettingsUI();
});
