// ===================== SETTINGS =====================
const ORGS = {
  ber: {
    id: 'ber',
    name: 'Bonita Springs–EsterO REALTORS®',
    shortName: 'BER',
    addr: '25300 Bernwood Drive, Suite 1 · Bonita Springs, FL 34135',
    email: 'Support@BERealtors.org',
    logo: 'https://res.cloudinary.com/micronetonline/image/upload/q_auto/f_auto/c_crop,h_503,w_2954,x_0,y_0/v1573591630/tenants/6c24b0da-8a6e-4f2b-8547-26a8c1dc4581/98b2cd4b19a748e0be424cae2a868161/BonitaSpringsEsteroRealtors-Logo-Horizontal.png',
    colors: ['#004a32', '#006847'] // Green
  },
  wcr: {
    id: 'wcr',
    name: "Women's Council of REALTORS® Bonita Springs–Estero",
    shortName: 'WCR',
    addr: '25300 Bernwood Drive, Suite 1 · Bonita Springs, FL 34135',
    email: 'WCR@BERealtors.org',
    logo: 'https://www.wcr.org/wp-content/uploads/2025/03/wcrlogo.png.webp',
    colors: ['#002b4c', '#005a8c'] // Navy flow
  }
};

let currentOrgId = localStorage.getItem('ebg_org') || 'ber';

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
  const org = ORGS[currentOrgId];
  
  // Use current org defaults if no manual override
  const orgName = s.orgName || org.name;
  const orgAddr = s.orgAddr || org.addr;
  const supportEmail = s.supportEmail || org.email;

  sv('sOrgName', orgName);
  sv('sOrgAddr', orgAddr);
  sv('sSupportEmail', supportEmail);
  sv('sHeroW',s.heroW);sv('sHeroH',s.heroH);sv('sHeroPrompt',s.heroPrompt);
  const np=document.getElementById('sNoPeople');s.noPeople?np.classList.add('on'):np.classList.remove('on');
  sv('sEmailMaxW',s.emailMaxW);sv('sMergeTag',s.mergeTag);sv('sFontFamily',s.fontFamily);
  sv('sPreheaderLen',s.preheaderLen);sv('sCtaShape',s.ctaShape);
  sv('sC1a',s.c1a);sv('sC1b',s.c1b);sv('sC2a',s.c2a);sv('sC2b',s.c2b);sv('sC3a',s.c3a);sv('sC3b',s.c3b);
  sv('sC1aHex',s.c1a);sv('sC1bHex',s.c1b);sv('sC2aHex',s.c2a);sv('sC2bHex',s.c2b);sv('sC3aHex',s.c3a);sv('sC3bHex',s.c3b);
  
  updateBrandingUI();
}

function setBranding(orgId) {
  currentOrgId = orgId;
  localStorage.setItem('ebg_org', orgId);
  const org = ORGS[orgId];
  
  // Update UI and prompts
  updateBrandingUI();
  toast(`Designing for: ${org.name}`);
  
  // Auto-fill settings with org defaults if user hasn't customized them manually yet
  // Or just refresh them anyway to make the transition clear
  const s = getSettings();
  s.orgName = org.name;
  s.orgAddr = org.addr;
  s.supportEmail = org.email;
  // If WCR, swap default green gradients for navy blue flow
  if(orgId === 'wcr') {
    s.c1a = '#002b4c'; s.c1b = '#005a8c';
  } else {
    s.c1a = '#004a32'; s.c1b = '#006847';
  }
  
  localStorage.setItem('ebg_settings', JSON.stringify(s));
  loadSettingsUI();
  updateTuesdayPreview();
}

function updateBrandingUI() {
  const org = ORGS[currentOrgId];
  document.querySelectorAll('.branding-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.org === currentOrgId);
  });
  
  // Update header text/title if needed
  const header = document.querySelector('.header p');
  if(header) {
    header.innerHTML = `Email Blast & Flyer Generator <span style="font-size:12px;opacity:0.6"> — Designing for: ${org.shortName}</span> `;
  }
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
  currentTab = idx;
  document.querySelectorAll('#outputTabs .tab').forEach(t => t.classList.remove('active'));
  if(btn) btn.classList.add('active');

  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

  if(idx === 3) {
    const composerPanel = document.getElementById('composerPanel');
    if(composerPanel) composerPanel.classList.add('active');
    return;
  }

  const panel = document.getElementById('panel-' + idx);
  if(panel) panel.classList.add('active');
}

function configureOutputTabs(options = {}){
  const config = Object.assign({
    tab0: 'Variation A',
    tab1: 'Variation B',
    tab2: 'Variation C',
    showTab1: true,
    showTab2: true,
    showComposer: false,
    composerLabel: 'THE COMPOSER'
  }, options);

  const tab0 = document.getElementById('outputTab0');
  const tab1 = document.getElementById('outputTab1');
  const tab2 = document.getElementById('outputTab2');
  const composer = document.getElementById('composerTabBtn');
  if(!tab0 || !tab1 || !tab2 || !composer) return;

  tab0.textContent = config.tab0;
  tab1.textContent = config.tab1;
  tab2.textContent = config.tab2;
  composer.textContent = config.composerLabel;

  tab0.style.display = '';
  tab1.style.display = config.showTab1 ? '' : 'none';
  tab2.style.display = config.showTab2 ? '' : 'none';
  composer.style.display = config.showComposer ? '' : 'none';
}

function openOutputTab(idx){
  const btn = document.getElementById('outputTab' + idx);
  if(btn && btn.style.display !== 'none') switchTab(idx, btn);
}

function setOutputVisible(){
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('outputArea').style.display = 'block';
}

// ===================== COPY =====================
function copyText(id){
  const el = document.getElementById(id);
  if(!el) return;
  const text = typeof el.value === 'string' ? el.value : (el.innerText || el.textContent || '');
  navigator.clipboard.writeText(text).then(() => {
    const btn = el.parentElement ? el.parentElement.querySelector('.copy-btn') : null;
    if(btn){
      const original = btn.dataset.originalText || btn.textContent;
      btn.dataset.originalText = original;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = btn.dataset.originalText || 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    }
    toast('Copied to clipboard!');
  });
}

// ===================== YOUTUBE HELPERS =====================
function getYouTubeId(url){
  const m=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m?m[1]:null;
}

function formatDateForInput(value){
  const date = value instanceof Date ? value : new Date(value);
  if(Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatLongDate(value){
  if(!value) return '';
  const date = new Date(value + 'T12:00:00');
  if(Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function diffDays(fromValue, toValue){
  const from = new Date(fromValue + 'T12:00:00');
  const to = new Date(toValue + 'T12:00:00');
  if(Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function initCampaignPlannerDefaults(){
  if(!gv('campaignStartDate')) sv('campaignStartDate', formatDateForInput(new Date()));
  if(!gv('campaignGoal')) sv('campaignGoal', 'Maximize registrations and attendance');
}

// ===================== EMAIL GENERATION =====================
let currentMode = 'single'; // 'single', 'campaign', 'friday', 'tuesday', 'flyer'
let fridaySections = []; // array of {id, title, ...}
let tuesdaySections = []; // array of sections for tuesday affiliate blast
let composerPicks = {}; // sectionId -> variationIndex (0,1,2)
let campaignPlanData = null;
let campaignPlanImported = false;

let _genData = null;
let _genVariations = [];
let _genPreheaders = [];
let _genSettings = null;

function updateGenerateButtonLabel(){
  const btn = document.getElementById('generateBtn');
  if(!btn) return;
  if(currentMode === 'campaign'){
    btn.textContent = 'Review Imported Campaign Plan';
    return;
  }
  if(currentMode === 'tuesday' && tuesdayBlocksImported && tuesdayBlocks.length > 0){
    btn.textContent = 'Generate Final Email';
    return;
  }
  if(currentMode === 'flyer'){
    btn.textContent = 'Use Flyer Prompt Above';
    return;
  }
  btn.textContent = 'Generate 3 Variations';
}

function setMode(mode){
  currentMode = mode;
  document.getElementById('modeSingle').classList.toggle('active', mode==='single');
  document.getElementById('modeCampaign').classList.toggle('active', mode==='campaign');
  document.getElementById('modeFriday').classList.toggle('active', mode==='friday');
  document.getElementById('modeTuesday').classList.toggle('active', mode==='tuesday');
  document.getElementById('modeFlyer').classList.toggle('active', mode==='flyer');

  document.getElementById('singleModeFields').style.display = mode==='single' ? 'block' : 'none';
  document.getElementById('campaignModeFields').style.display = mode==='campaign' ? 'block' : 'none';
  document.getElementById('fridayModeFields').style.display = mode==='friday' ? 'block' : 'none';
  document.getElementById('tuesdayModeFields').style.display = mode==='tuesday' ? 'block' : 'none';
  document.getElementById('flyerModeFields').style.display = mode==='flyer' ? 'block' : 'none';

  if(mode==='friday' && fridaySections.length===0) addFridaySection();
  if(mode==='tuesday' && tuesdaySections.length===0) addTuesdaySection();
  updateGenerateButtonLabel();
}

function addFridaySection(){
  const id = Date.now();
  fridaySections.push({
    id, 
    title:'', 
    dateTime:'', 
    location:'', 
    instructor:'', 
    cost:'', 
    credits:'', 
    regLink:'', 
    variationIndex: 0, 
    customColor: '', 
    links:[],
    variations: [
      { description: '', heroUrl: '' }, // A: Professional
      { description: '', heroUrl: '' }, // B: Energetic
      { description: '', heroUrl: '' }  // C: Benefit-Led
    ]
  });
  renderFridaySections();
}

function removeFridaySection(id){
  fridaySections = fridaySections.filter(s=>s.id!==id);
  renderFridaySections();
}

function moveFSec(id, dir){
  const idx = fridaySections.findIndex(x=>x.id===id);
  if(idx===-1) return;
  const newIdx = idx + dir;
  if(newIdx < 0 || newIdx >= fridaySections.length) return;
  [fridaySections[idx], fridaySections[newIdx]] = [fridaySections[newIdx], fridaySections[idx]];
  renderFridaySections();
}

function parseFridayDate(str){
  if(!str) return 9999999999999;
  const part = str.split('|')[0].trim();
  const d = new Date(part);
  return isNaN(d.getTime()) ? 9999999999999 : d.getTime();
}

function sortFridaySectionsByDate(){
  fridaySections.sort((a,b) => parseFridayDate(a.dateTime) - parseFridayDate(b.dateTime));
  renderFridaySections();
  toast('Sections sorted by date!');
}

function renderFridaySections(){
  const container = document.getElementById('fridaySections');
  if(!container) return;
  
  // Safety: Ensure variations are populated or use defaults
  const defaultVars = buildLegacyToneVariations(getSettings(), fridayDesign);
  const activeVars = (_genVariations && _genVariations.length >= 3) ? _genVariations : defaultVars;

  container.innerHTML = fridaySections.map((sec, idx) => {
    const vIdx = sec.variationIndex || 0;
    const activeColor = sec.customColor || activeVars[vIdx].colorA;
    
    // Safety check for variations array
    if(!sec.variations || sec.variations.length < 3) {
      sec.variations = [
        { description: sec.description || '', heroUrl: sec.heroUrl || '' },
        { description: sec.description || '', heroUrl: sec.heroUrl || '' },
        { description: sec.description || '', heroUrl: sec.heroUrl || '' }
      ];
    }

    const currentV = sec.variations[vIdx];

    return `
    <div class="card" style="margin-bottom:16px;border-color:var(--border);background:var(--bg);position:relative">
      <div class="card-header" style="font-size:13px;padding:8px 16px;justify-content:space-between;border-bottom:2px solid ${activeColor}">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="display:flex;flex-direction:column;gap:2px">
            <button class="move-btn" onclick="moveFSec(${sec.id},-1)" ${idx===0?'disabled':''} title="Move Up">▲</button>
            <button class="move-btn" onclick="moveFSec(${sec.id},1)" ${idx===fridaySections.length-1?'disabled':''} title="Move Down">▼</button>
          </div>
          <span>Section #${idx+1}: ${truncate(sec.title, 30) || '(New Event)'}</span>
        </div>
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
        
        <div class="variation-slot" style="background:rgba(0,0,0,0.02);padding:12px;border-radius:8px;border:1px dashed var(--border);margin-bottom:12px">
          <div class="form-group">
            <label style="color:var(--accent);font-weight:700">✍️ Sales Copy (Variation ${['A','B','C'][vIdx]})</label>
            <textarea style="min-height:100px;font-size:12px" onchange="updateFSecV(${sec.id}, ${vIdx}, 'description', this.value)" placeholder="Marketing copy for this specific variation...">${esc(currentV.description)}</textarea>
          </div>
          
          <div style="background:rgba(0,191,165,0.05);padding:12px;border-radius:8px;border:1px solid var(--border)">
            <label style="color:var(--accent);margin-bottom:8px;display:flex;justify-content:space-between">
              🖼️ Hero Image (Variation ${['A','B','C'][vIdx]})
              <button class="btn-sm" onclick="copySectionHeroPrompt(${sec.id})" style="font-size:10px">📋 Copy Prompt</button>
            </label>
            <input type="url" value="${esc(currentV.heroUrl)}" onchange="updateFSecV(${sec.id}, ${vIdx}, 'heroUrl', this.value)" placeholder="Paste image URL here" style="font-size:12px">
          </div>
        </div>

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

function updateFSecV(id, vIdx, field, val){
  const s = fridaySections.find(x=>x.id===id);
  if(s && s.variations[vIdx]) {
    s.variations[vIdx][field] = val;
  }
}

// ===================== TUESDAY AFFILIATE — DYNAMIC BLOCK-BASED SYSTEM =====================
let tuesdayBlocks = []; // Array of layout blocks after AI import
let tuesdaySubject = '';
let tuesdayPreheaderText = '';
let tuesdayBlocksImported = false; // tracks whether we've done an AI import

// Block type icons for display
const BLOCK_ICONS = {
  hero: '🖼️', text: '📝', imageRow: '🏞️', cta: '🔘',
  infoCard: '📊', specs: '📋', bulletList: '📌', divider: '➖'
};

// Legacy section-based functions (kept for backward-compat but hidden when blocks are active)
function addTuesdaySection(){
  const id = Date.now();
  tuesdaySections.push({
    id, title:'', dateTime:'', location:'', regLink:'', variationIndex:0, customColor:'', links:[],
    variations: [{description:'',heroUrl:''},{description:'',heroUrl:''},{description:'',heroUrl:''}]
  });
  renderTuesdaySections();
}
function removeTuesdaySection(id){ tuesdaySections=tuesdaySections.filter(s=>s.id!==id); renderTuesdaySections(); }
function moveTSec(id,dir){
  const idx=tuesdaySections.findIndex(x=>x.id===id); if(idx===-1)return;
  const n=idx+dir; if(n<0||n>=tuesdaySections.length)return;
  [tuesdaySections[idx],tuesdaySections[n]]=[tuesdaySections[n],tuesdaySections[idx]];
  renderTuesdaySections();
}
function renderTuesdaySections(){
  const c=document.getElementById('tuesdaySections'); if(!c)return;
  // If blocks are imported, show block editor instead
  if(tuesdayBlocksImported && tuesdayBlocks.length > 0){ renderTuesdayBlockEditor(); return; }
  c.innerHTML='<p style="font-size:12px;color:var(--text2);text-align:center;padding:20px">Use the AI Content Assistant below to generate a dynamic email layout, or add manual sections.</p>';
}
function addTSecLink(id){const s=tuesdaySections.find(x=>x.id===id);if(s){if(!s.links)s.links=[];s.links.push({label:'',url:''});renderTuesdaySections();}}
function updateTSecLink(id,lIdx,field,val){const s=tuesdaySections.find(x=>x.id===id);if(s&&s.links[lIdx])s.links[lIdx][field]=val;}
function removeTSecLink(id,lIdx){const s=tuesdaySections.find(x=>x.id===id);if(s){s.links.splice(lIdx,1);renderTuesdaySections();}}
function updateTSec(id,field,val){const s=tuesdaySections.find(x=>x.id===id);if(s){s[field]=val;if(field==="variationIndex")renderTuesdaySections();}}
function updateTSecV(id,vIdx,field,val){const s=tuesdaySections.find(x=>x.id===id);if(s&&s.variations[vIdx])s.variations[vIdx][field]=val;}

// ===================== DYNAMIC BLOCK EDITOR =====================
function renderTuesdayBlockEditor(){
  const c = document.getElementById('tuesdaySections');
  if(!c) return;

  let html = `<div style="margin-bottom:12px;padding:10px;background:rgba(0,191,165,0.08);border:1px solid var(--accent);border-radius:8px">
    <p style="font-size:12px;color:var(--accent);font-weight:700;margin-bottom:6px">✅ ${tuesdayBlocks.length} blocks imported — Edit below, then click Generate</p>
    <div class="form-row">
      <div class="form-group"><label>Subject Line</label><input type="text" value="${esc(tuesdaySubject)}" oninput="tuesdaySubject=this.value; updateTuesdayPreview()"></div>
      <div class="form-group"><label>Preheader</label><input type="text" value="${esc(tuesdayPreheaderText)}" oninput="tuesdayPreheaderText=this.value; updateTuesdayPreview()"></div>
    </div>
  </div>`;

  tuesdayBlocks.forEach((block, idx) => {
    const icon = BLOCK_ICONS[block.type] || '📦';
    html += `<div class="card" style="margin-bottom:10px;background:var(--bg);border-color:var(--border)">
      <div class="card-header" style="font-size:12px;padding:6px 12px;justify-content:space-between;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="display:flex;flex-direction:column;gap:1px">
            <button class="move-btn" onclick="moveTBlock(${idx},-1)" ${idx===0?'disabled':''}>▲</button>
            <button class="move-btn" onclick="moveTBlock(${idx},1)" ${idx===tuesdayBlocks.length-1?'disabled':''}>▼</button>
          </div>
          <span>${icon} <strong>${block.type.toUpperCase()}</strong></span>
        </div>
        <button class="btn-sm btn-danger" onclick="removeTBlock(${idx})" style="padding:2px 6px;font-size:9px">✕</button>
      </div>
      <div class="card-body" style="padding:10px">
        ${renderBlockFields(block, idx)}
      </div>
    </div>`;
  });

  html += `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px">
    <button class="btn-sm" onclick="addTBlock('text')" style="font-size:10px">+ Text</button>
    <button class="btn-sm" onclick="addTBlock('hero')" style="font-size:10px">+ Hero</button>
    <button class="btn-sm" onclick="addTBlock('imageRow')" style="font-size:10px">+ Images</button>
    <button class="btn-sm" onclick="addTBlock('cta')" style="font-size:10px">+ CTA</button>
    <button class="btn-sm" onclick="addTBlock('infoCard')" style="font-size:10px">+ Info Card</button>
    <button class="btn-sm" onclick="addTBlock('specs')" style="font-size:10px">+ Specs</button>
    <button class="btn-sm" onclick="addTBlock('bulletList')" style="font-size:10px">+ List</button>
    <button class="btn-sm" onclick="addTBlock('divider')" style="font-size:10px">+ Divider</button>
  </div>`;

  c.innerHTML = html;
}

function renderBlockFields(block, idx){
  switch(block.type){
    case 'hero':
      return `
        <div class="form-group"><label>Hero Image (${block.width||730}×${block.height||315})</label>
          <input type="url" value="${esc(block.imageUrl||'')}" oninput="tuesdayBlocks[${idx}].imageUrl=this.value; updateTuesdayPreview()" placeholder="Paste generated image URL here">
        </div>
        ${renderImagePrompts(block, idx)}
        ${block.overlayText ? `<div class="form-group"><label>Overlay Text</label><input type="text" value="${esc(block.overlayText)}" oninput="tuesdayBlocks[${idx}].overlayText=this.value; updateTuesdayPreview()"></div>` : ''}
        ${block.link ? `<div class="form-group"><label>Link</label><input type="url" value="${esc(block.link)}" oninput="tuesdayBlocks[${idx}].link=this.value; updateTuesdayPreview()"></div>` : ''}`;

    case 'text':
      return `
        ${block.heading ? `<div class="form-group"><label>Heading</label><input type="text" value="${esc(block.heading)}" oninput="tuesdayBlocks[${idx}].heading=this.value; updateTuesdayPreview()"></div>` : ''}
        <div class="form-group"><label>Body (Markdown OK)</label><textarea style="min-height:80px;font-size:12px" oninput="tuesdayBlocks[${idx}].body=this.value; updateTuesdayPreview()">${esc(block.body||'')}</textarea></div>`;

    case 'imageRow':
      return (block.images||[]).map((img, iIdx) => `
        <div style="background:var(--surface2);padding:8px;border-radius:6px;margin-bottom:6px">
          <label style="font-size:10px">Image ${iIdx+1} (${img.width||350}×${img.height||200})</label>
          <input type="url" value="${esc(img.url||'')}" oninput="tuesdayBlocks[${idx}].images[${iIdx}].url=this.value; updateTuesdayPreview()" placeholder="Image URL" style="font-size:11px;margin-bottom:4px">
          ${img.link ? `<input type="url" value="${esc(img.link)}" oninput="tuesdayBlocks[${idx}].images[${iIdx}].link=this.value; updateTuesdayPreview()" placeholder="Link URL" style="font-size:11px;margin-bottom:4px">` : ''}
          ${renderImagePromptsInline(img, idx, iIdx)}
        </div>`).join('');

    case 'cta':
      return `
        <div class="form-row">
          <div class="form-group"><label>Button Label</label><input type="text" value="${esc(block.label||'')}" oninput="tuesdayBlocks[${idx}].label=this.value; updateTuesdayPreview()"></div>
          <div class="form-group"><label>URL</label><input type="url" value="${esc(block.url||'')}" oninput="tuesdayBlocks[${idx}].url=this.value; updateTuesdayPreview()"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Style</label><select oninput="tuesdayBlocks[${idx}].style=this.value; updateTuesdayPreview()"><option value="filled" ${block.style==='filled'?'selected':''}>Filled</option><option value="outlined" ${block.style==='outlined'?'selected':''}>Outlined</option></select></div>
          <div class="form-group"><label>Color</label><input type="text" value="${esc(block.color||'#02aae1')}" oninput="tuesdayBlocks[${idx}].color=this.value; updateTuesdayPreview()" placeholder="#02aae1"></div>
        </div>`;

    case 'infoCard':
      return (block.columns||[]).map((col, cIdx) => `
        <div style="background:var(--surface2);padding:8px;border-radius:6px;margin-bottom:6px">
          <label style="font-size:10px">Column ${cIdx+1}</label>
          <input type="text" value="${esc(col.heading||'')}" oninput="tuesdayBlocks[${idx}].columns[${cIdx}].heading=this.value; updateTuesdayPreview()" placeholder="Heading" style="font-size:11px;margin-bottom:4px">
          <textarea style="min-height:60px;font-size:11px" oninput="tuesdayBlocks[${idx}].columns[${cIdx}].body=this.value; updateTuesdayPreview()" placeholder="Content (markdown OK)">${esc(col.body||'')}</textarea>
        </div>`).join('');

    case 'specs':
      return `
        ${block.heading ? `<div class="form-group"><label>Heading</label><input type="text" value="${esc(block.heading)}" oninput="tuesdayBlocks[${idx}].heading=this.value; updateTuesdayPreview()"></div>` : ''}
        <div style="font-size:11px;color:var(--text2)">${(block.items||[]).map((item, sIdx) =>
          `<div class="form-row" style="margin-bottom:4px">
            <input type="text" value="${esc(item.label||'')}" oninput="tuesdayBlocks[${idx}].items[${sIdx}].label=this.value; updateTuesdayPreview()" style="font-size:11px" placeholder="Label">
            <input type="text" value="${esc(item.value||'')}" oninput="tuesdayBlocks[${idx}].items[${sIdx}].value=this.value; updateTuesdayPreview()" style="font-size:11px" placeholder="Value">
          </div>`).join('')}
        </div>`;

    case 'bulletList':
      return `
        ${block.heading ? `<div class="form-group"><label>Heading</label><input type="text" value="${esc(block.heading)}" oninput="tuesdayBlocks[${idx}].heading=this.value; updateTuesdayPreview()"></div>` : ''}
        <div class="form-group"><label>Items (one per line)</label><textarea style="min-height:60px;font-size:11px" onchange="tuesdayBlocks[${idx}].items=this.value.split('\\n').filter(x=>x.trim())">${(block.items||[]).join('\n')}</textarea></div>
        <div class="form-group"><label>Style</label><select oninput="tuesdayBlocks[${idx}].listStyle=this.value; updateTuesdayPreview()"><option value="bullet" ${block.listStyle!=='numbered'?'selected':''}>Bullets</option><option value="numbered" ${block.listStyle==='numbered'?'selected':''}>Numbered</option></select></div>`;

    case 'divider':
      return `<div class="form-group"><label>Color</label><input type="text" value="${esc(block.color||'#e0e0e0')}" oninput="tuesdayBlocks[${idx}].color=this.value; updateTuesdayPreview()" placeholder="#e0e0e0"></div>`;

    default:
      return `<p style="font-size:11px;color:var(--text2)">Unknown block type: ${block.type}</p>`;
  }
}

function renderImagePrompts(block, bIdx){
  if(!block.imagePrompts || block.imagePrompts.length === 0) return '';
  return `<div style="background:rgba(124,77,255,0.08);padding:8px;border-radius:6px;margin-top:6px">
    <label style="color:var(--accent2);font-size:10px;margin-bottom:4px">🎨 AI Image Prompt Ideas (${block.width||730}×${block.height||315})</label>
    ${block.imagePrompts.map((p, pIdx) => `
      <div style="display:flex;gap:4px;margin-bottom:4px;align-items:start">
        <span style="font-size:10px;color:var(--text2);min-width:16px">${pIdx+1}.</span>
        <p style="font-size:10px;color:var(--text2);flex:1;line-height:1.4;margin:0">${esc(p)}</p>
        <button class="btn-sm" onclick="copyBlockPrompt(${bIdx},${pIdx})" style="font-size:9px;padding:2px 6px;white-space:nowrap">Copy</button>
      </div>`).join('')}
  </div>`;
}

function renderImagePromptsInline(img, bIdx, iIdx){
  if(!img.imagePrompts || img.imagePrompts.length === 0) return '';
  return `<div style="background:rgba(124,77,255,0.06);padding:6px;border-radius:4px;margin-top:4px">
    <label style="color:var(--accent2);font-size:9px">🎨 Image Ideas (${img.width||350}×${img.height||200})</label>
    ${img.imagePrompts.map((p, pIdx) => `
      <div style="display:flex;gap:4px;margin-bottom:2px;align-items:start">
        <span style="font-size:9px;color:var(--text2);min-width:14px">${pIdx+1}.</span>
        <p style="font-size:9px;color:var(--text2);flex:1;line-height:1.3;margin:0">${esc(p)}</p>
        <button class="btn-sm" onclick="copyInlinePrompt(${bIdx},${iIdx},${pIdx})" style="font-size:8px;padding:1px 4px">Copy</button>
      </div>`).join('')}
  </div>`;
}

function copyBlockPrompt(bIdx, pIdx){
  const p = tuesdayBlocks[bIdx]?.imagePrompts?.[pIdx];
  if(p){ navigator.clipboard.writeText(p); toast('Image prompt copied!'); }
}
function copyInlinePrompt(bIdx, iIdx, pIdx){
  const p = tuesdayBlocks[bIdx]?.images?.[iIdx]?.imagePrompts?.[pIdx];
  if(p){ navigator.clipboard.writeText(p); toast('Image prompt copied!'); }
}

function moveTBlock(idx, dir){
  const n = idx + dir;
  if(n < 0 || n >= tuesdayBlocks.length) return;
  [tuesdayBlocks[idx], tuesdayBlocks[n]] = [tuesdayBlocks[n], tuesdayBlocks[idx]];
  renderTuesdayBlockEditor();
}

function removeTBlock(idx){
  tuesdayBlocks.splice(idx, 1);
  renderTuesdayBlockEditor();
}

function addTBlock(type){
  const defaults = {
    hero: {type:'hero', width:730, height:315, imageUrl:'', imagePrompts:[], overlayText:'', link:''},
    text: {type:'text', heading:'', body:''},
    imageRow: {type:'imageRow', images:[{url:'',width:350,height:200,link:'',altText:'',imagePrompts:[]},{url:'',width:350,height:200,link:'',altText:'',imagePrompts:[]}]},
    cta: {type:'cta', label:'Learn More', url:'', style:'filled', color:'#02aae1'},
    infoCard: {type:'infoCard', columns:[{heading:'Column 1',body:''},{heading:'Column 2',body:''}]},
    specs: {type:'specs', heading:'Details', items:[{label:'',value:''}]},
    bulletList: {type:'bulletList', heading:'', items:['Item 1'], listStyle:'bullet'},
    divider: {type:'divider', color:'#e0e0e0'}
  };
  tuesdayBlocks.push(JSON.parse(JSON.stringify(defaults[type] || defaults.text)));
  renderTuesdayBlockEditor();
}

// ===================== DYNAMIC EMAIL HTML RENDERER =====================
function generateDynamicEmailHTML(blocks, settings, headerColor, headerTitle, preText, variation){
  const s = settings || getSettings();
  const org = ORGS[currentOrgId];
  const hColor = headerColor || '#02aae1';
  const v = variation || {};
  const hTitle = v.headerTitle || headerTitle || 'Upcoming Affiliate Opportunities';
  const fontName = v.fontFamily || 'Montserrat';
  const hGrad = v.headerGradient || [hColor, hColor];
  const introText = firstNonEmpty(v.headerSummary, preText);
  const preheaderText = firstNonEmpty(v.preheader, preText);
  const showHeaderLogo = v.logoPlacement !== 'none';
  const headerEyebrow = firstNonEmpty(v.headerEyebrow);
  
  const blocksHtml = blocks.map(block => {
    switch(block.type){
      case 'hero': return renderHeroBlock(block, s, v);
      case 'text': return renderTextBlock(block, s, v);
      case 'imageRow': return renderImageRowBlock(block, s, v);
      case 'cta': return renderCtaBlock(block, s, v);
      case 'infoCard': return renderInfoCardBlock(block, s, v);
      case 'specs': return renderSpecsBlock(block, s, v);
      case 'bulletList': return renderBulletListBlock(block, s, v);
      case 'divider': return renderDividerBlock(block, s, v);
      case 'instructor': return renderInstructorBlock(block, s, v);
      default: return '';
    }
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g,'+')}:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  body { font-family: '${fontName}', 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  @media only screen and (max-width: 600px) {
    .content-table { width: 100% !important; }
    .section-inner { padding: 0 20px !important; }
    .img-col { display: block !important; width: 100% !important; padding: 0 0 16px 0 !important; }
    .info-col { display: block !important; width: 100% !important; padding: 20px !important; margin-bottom: 15px !important; }
    .header-text { font-size: 26px !important; }
  }
</style>
<!--[if mso]>
<style type="text/css">
  body, table, td, p, a { font-family: Helvetica, Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:20px 0;background-color:#f4f7f9;font-family:'${fontName}', Helvetica, Arial, sans-serif">
<span style="display:none!important;font-size:1px;color:#f4f7f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheaderText}</span>
<table width="100%" cellpadding="0" cellspacing="0" border="0" class="content-table" style="width:100%;max-width:${s.emailMaxW}px;background-color:#ffffff;margin:0 auto;table-layout:fixed;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05)">
  ${showHeaderLogo ? `<tr><td align="center" style="padding:20px 0;background-color:#ffffff">
    <img src="${org.logo}" height="50" style="height:50px;width:auto;display:block" alt="${org.name}">
  </td></tr>` : ''}
  <!-- Header -->
  <tr><td align="center" style="background:${hGrad[0]};background:linear-gradient(135deg, ${hGrad[0]} 0%, ${hGrad[1]} 100%);">
    <!--[if mso]>
    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:${s.emailMaxW}px;height:140px;">
    <v:fill type="gradient" color="${hGrad[0]}" color2="${hGrad[1]}" angle="135" />
    <v:textbox inset="0,0,0,0">
    <![endif]-->
    <div style="padding:40px 24px;color:#ffffff">
      ${headerEyebrow ? `<p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:0.88">${headerEyebrow}</p>` : ''}
      <p class="header-text" style="margin:0;font-size:32px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;text-shadow:0 2px 10px rgba(0,0,0,0.2)">${hTitle}</p>
      ${introText ? `<div style="margin:15px auto 0;width:85%;border-top:1px solid rgba(255,255,255,0.3);padding-top:15px;font-size:15px;opacity:0.95;line-height:1.5;font-weight:500">${introText}</div>` : ''}
    </div>
    <!--[if mso]>
    </v:textbox>
    </v:rect>
    <![endif]-->
  </td></tr>
  <tr><td style="padding:0">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed">
      ${blocksHtml}
    </table>
  </td></tr>
  <tr><td style="padding:40px 24px 30px;background-color:#ffffff;text-align:center;font-size:12px;color:#999999;border-top:1px solid #eeeeee">
    <p style="margin:0">© ${new Date().getFullYear()} ${s.orgName}</p>
    <p style="margin:5px 0 0">${s.orgAddr}</p>
  </td></tr>
</table>
</body>
</html>`.trim();
}

function renderHeroBlock(block, s, v){
  const w = block.width || s.emailMaxW || 730;
  const h = block.height || 315;
  const url = block.imageUrl || v.heroImageUrl;
  if(url){
    const imgTag = `<img src="${url}" width="${w}" style="width:100%;max-width:${w}px;height:auto;display:block" alt="${block.altText||block.overlayText||'Hero Image'}">`;
    const linked = block.link ? `<a href="${block.link}" target="_blank" style="display:block">${imgTag}</a>` : imgTag;
    return `<tr><td style="padding:0">${linked}</td></tr>`;
  }
  const g = v.headerGradient || ['#02aae1','#004a8f'];
  const badges = (block.detailBadges || []).filter(Boolean).slice(0, 4);
  const badgesHtml = badges.length ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:16px 0 0">
    ${badges.map(item => `<span style="display:inline-block;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.24);font-size:11px;font-weight:700;letter-spacing:0.4px">${escHtml(item)}</span>`).join('')}
  </div>` : '';
  return `<tr><td style="background:${g[0]};background:linear-gradient(135deg,${g[0]},${g[1]});text-align:center;padding:60px 24px;color:#ffffff">
    <!--[if mso]>
    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:${s.emailMaxW}px;height:200px;">
    <v:fill type="gradient" color="${g[0]}" color2="${g[1]}" angle="135" />
    <v:textbox inset="0,0,0,0">
    <![endif]-->
    <div style="padding:40px 0">
      <p style="font-size:24px;font-weight:800;margin:0">${block.overlayText||'[Hero Image Placeholder]'}</p>
      ${badgesHtml}
      <p style="font-size:13px;margin:10px 0 0;opacity:.8;font-style:italic">Generate your teaser image with the event details baked into the concept, then paste the hosted URL above to preview it here.</p>
    </div>
    <!--[if mso]>
    </v:textbox></v:rect>
    <![endif]-->
  </td></tr>`;
}

function renderTextBlock(block, s, v){
  const headingColor = block.color || v.accentColor || '#333333';
  let html = '<tr><td class="section-inner" style="padding:24px 40px">';
  if(block.heading) html += `<p style="margin:0 0 12px;font-size:22px;font-weight:800;color:${headingColor};line-height:1.2">${block.heading}</p>`;
  if(block.body) html += `<div style="font-size:16px;line-height:1.6;color:#444444">${mdToHtml(block.body)}</div>`;
  html += '</td></tr>';
  return html;
}

function renderImageRowBlock(block, s){
  const images = block.images || [];
  if(images.length === 0) return '';
  const maxW = s.emailMaxW || 730;
  const innerSpace = maxW - 56;
  const colW = Math.floor(innerSpace / images.length) - 8;
  const cols = images.map(img => {
    const imgTag = img.url
      ? `<img src="${img.url}" width="${colW}" style="width:100%;max-width:${colW}px;height:auto;display:block;border-radius:4px" alt="${img.altText||''}">`
      : `<div style="background:#f0f0f0;width:100%;height:${img.height||200}px;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:11px;color:#999">${colW}×${img.height||200}</div>`;
    const linked = img.link ? `<a href="${img.link}" target="_blank" style="display:block;text-decoration:none">${imgTag}</a>` : imgTag;
    return `<td class="img-col" width="${Math.floor(100/images.length)}%" style="padding:4px;vertical-align:top">${linked}${img.caption ? `<p style="font-size:11px;color:#666;margin:4px 0 0;text-align:center">${img.caption}</p>` : ''}</td>`;
  }).join('');
  return `<tr><td style="padding:12px 28px"><table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed"><tr>${cols}</tr></table></td></tr>`;
}

function renderCtaBlock(block, s, v){
  const g = v.buttonGradient || ['#02aae1', '#004a8f'];
  const textColor = '#ffffff';
  const radius = s.ctaShape==='pill'?'50px':s.ctaShape==='rounded'?'10px':'0px';
  
  return `<tr><td align="center" style="padding:15px 40px 25px">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;width:100%;max-width:300px">
      <tr><td align="center" style="background:${g[0]};background:linear-gradient(135deg,${g[0]},${g[1]});border-radius:${radius};">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${block.url||'#'}" style="height:55px;v-text-anchor:middle;width:300px;" arcsize="50%" stroke="f" fillcolor="${g[0]}">
        <v:fill type="gradient" color="${g[0]}" color2="${g[1]}" angle="135" />
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:18px;font-weight:bold;">${block.label||'Register Now'}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${block.url||'#'}" target="_blank" style="color:${textColor};text-decoration:none;font-weight:800;font-size:18px;display:block;padding:16px 30px;letter-spacing:1px">${block.label||'Register Now'}</a>
        <!--<![endif]-->
      </td></tr>
    </table>
  </td></tr>`;
}

function renderInfoCardBlock(block, s, v){
  const columns = block.columns || [];
  if(columns.length === 0) return '';
  const bgColors = [block.surfaceColor || v.surfaceColor || '#f8fafc', '#f4f7fb', '#f9f7f2', '#f5f3ff'];
  const accentColors = normalizeColorArray(block.colors).length ? normalizeColorArray(block.colors) : (normalizeColorArray(v.supportingColors).length ? normalizeColorArray(v.supportingColors) : [v.accentColor || '#02aae1']);
  const cols = columns.map((col, i) =>
    `<td class="info-col" width="${Math.floor(100/columns.length)}%" style="padding:16px;vertical-align:top;background-color:${col.backgroundColor || bgColors[i%bgColors.length]};border-radius:6px;border-top:4px solid ${col.accentColor || accentColors[i%accentColors.length]}">
      ${col.heading ? `<p style="font-weight:800;font-size:16px;margin:0 0 8px;color:${col.accentColor || accentColors[i%accentColors.length]}">${col.heading}</p>` : ''}
      <div style="font-size:14px;line-height:1.5;color:#444">${mdToHtml(col.body||'')}</div>
    </td>`).join('');
  return `<tr><td style="padding:12px 28px"><table width="100%" cellpadding="0" cellspacing="8"><tr>${cols}</tr></table></td></tr>`;
}

function renderSpecsBlock(block, s, v){
  const color = block.color || (v.supportingColors || [])[0] || v.accentColor || '#02aae1';
  let rows = (block.items||[]).map(item =>
    `<tr><td style="font-weight:700;padding:6px 12px;color:${color};font-size:14px;vertical-align:top;white-space:nowrap">${item.label}</td><td style="padding:6px 12px;font-size:14px;color:#333">${item.value}</td></tr>`
  ).join('');
  return `<tr><td style="padding:12px 32px">
    ${block.heading ? `<p style="font-weight:800;font-size:18px;margin:0 0 10px;color:${color}">${block.heading}</p>` : ''}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${color};background:${block.backgroundColor || v.surfaceColor || '#f9f9f9'};border-radius:0 4px 4px 0">${rows}</table>
  </td></tr>`;
}

function renderBulletListBlock(block, s, v){
  const items = block.items || [];
  const numbered = block.listStyle === 'numbered';
  const tag = numbered ? 'ol' : 'ul';
  const color = block.color || (v.supportingColors || [])[1] || v.accentColor || '#333';
  const listHtml = items.map(item => `<li style="margin-bottom:6px;font-size:14px;color:#333">${mdToHtml(item)}</li>`).join('');
  return `<tr><td style="padding:8px 32px">
    ${block.heading ? `<p style="font-weight:700;font-size:16px;margin:0 0 8px;color:${color}">${block.heading}</p>` : ''}
    <${tag} style="padding-left:20px;margin:0">${listHtml}</${tag}>
  </td></tr>`;
}

function renderDividerBlock(block, s){
  return `<tr><td style="padding:16px 32px"><hr style="border:none;border-top:2px solid ${block.color||'#e0e0e0'};margin:0"></td></tr>`;
}

// ===================== AI INTEGRATION =====================
function generateAIPrompt(){
  const raw = gv('aiRawInput');
  if(!raw){toast('Paste some raw event details first!');return;}
  const s = getSettings();
  const fontGuide = SINGLE_CLASS_FONT_OPTIONS.join(', ');
  const themeGuide = getSingleClassThemeGuide();
  const prompt = `You are an expert design-focused email marketer for "${s.orgName}". Parse the raw input and return a COMPLETE marketing JSON object.

### CRITICAL RULES:
1. NO CITATIONS: Do not include source links or references in any text.
2. RICH MARKETING: Write 3 distinct descriptions for each event:
   - copyA: Professional & factual.
   - copyB: Energetic & FOMO.
   - copyC: Urgency & Benefit-led.
3. Make the design direction feel intentional. External AI is allowed to choose rich fonts, gradients, supporting colors, and a more editorial look.
4. Use this theme library as inspiration:
${themeGuide}
5. Choose the fontFamily from: ${fontGuide}

RETURN A JSON OBJECT (not an array) with this exact structure:
{
  "design": {
    "themeName": "Coastal Authority",
    "themeDescription": "Short explanation of the creative direction",
    "fontFamily": "Outfit",
    "headerEyebrow": "Upcoming Education",
    "logoPlacement": "header", // Use "none" for a logo-free editorial header
    "headerGradient": ["#004a32", "#006847"],
    "buttonGradient": ["#006847", "#008a5e"],
    "accentColor": "#008a5e",
    "supportingColors": ["#0f766e", "#d9f99d", "#ecfeff"],
    "surfaceColor": "#f7fbfa",
    "variationAccents": ["#0f766e", "#1d4ed8", "#d97706"]
  },
  "sections": [
    {
       "title": "Short catchy title",
       "dateTime": "Full string",
       "location": "...",
       "instructor": "...",
       "regLink": "...",
       "copyA": "Detailed sales copy with **bold** highlights",
       "copyB": "...",
       "copyC": "..."
    },
    ...
  ]
}

RAW INPUT:
${raw}

RETURN ONLY THE JSON OBJECT. NO MARKDOWN, NO PREAMBLE. JUST { ... }`;

  navigator.clipboard.writeText(prompt);
  document.getElementById('importBox').style.display = 'block';
  toast('AI Prompt copied! Paste into Gemini, then paste response below.');
}

let fridayDesign = null;

function importAIResponse(){
  try {
    let rawText = gv('aiResponse').trim();
    if(rawText.startsWith('```')) rawText = rawText.replace(/^```[a-z]*\n?/,'').replace(/\n?```$/,'').trim();
    rawText = rawText.replace(/,\s*([\]}])/g, '$1');
    
    const data = JSON.parse(rawText);
    const sections = Array.isArray(data) ? data : (data.sections || []);
    
    if(data.design) fridayDesign = normalizeCreativeDesign(data.design, 0, gv('fridayHeaderCol') || '#004a32');
    
    fridaySections = sections.map((item, idx) => ({
      id: Date.now() + Math.random() + idx,
      title: item.title||'',
      dateTime: item.dateTime||'',
      location: item.location||'',
      instructor: item.instructor||'',
      cost: item.cost||'',
      credits: item.credits||'',
      regLink: item.regLink||'',
      variationIndex: 0,
      customColor: '',
      links: [],
      variations: [
        { description: item.copyA || '', heroUrl: '' },
        { description: item.copyB || '', heroUrl: '' },
        { description: item.copyC || '', heroUrl: '' }
      ]
    }));
    sortFridaySectionsByDate();
    toast(`Imported ${fridaySections.length} sections with advanced design!`);
  } catch(e) {
    console.error('Import error:', e);
    toast('Error parsing JSON. Check your input.');
  }
}

function generateAIPromptTuesday(){
  const raw = gv('aiRawInputTuesday');
  if(!raw){toast('Paste some raw details first!');return;}
  const s = getSettings();
  const org = ORGS[currentOrgId];
  const maxW = s.emailMaxW || 730;
  const fontGuide = SINGLE_CLASS_FONT_OPTIONS.join(', ');
  const themeGuide = getSingleClassThemeGuide();

  const prompt = `You are an expert email marketing designer for ${org.name}. I need you to design a COMPLETE, DYNAMIC email layout for our Tuesday Affiliate Blast targeting our affiliates and sponsors.
  
  ${currentOrgId === 'wcr' ? 'CONTEXT: This is for the Women\'s Council of REALTORS®. The tone should be empowering, collaborative, and professional.' : 'CONTEXT: This is for the local REALTOR® association affiliate members.'}

IMPORTANT: If I provide any URLs or links below, please visit/review them thoroughly and extract ALL relevant information (event details, pricing, dates, images, descriptions, sponsorship tiers, etc.) to use in the email content. Do NOT leave placeholders — fill in EVERY detail from the source material.

YOUR TASK: Design a rich, dynamic email layout using content blocks. Think like a professional email designer — use multi-image rows, side-by-side info cards, spec tables, bold CTAs, etc. Do NOT just stack identical sections. Make it visually interesting and varied.

RETURN A SINGLE JSON OBJECT (not an array) with this exact structure:
{
  "design": {
    "themeName": "Coastal Authority",
    "themeDescription": "Short explanation of the creative direction",
    "fontFamily": "Outfit", // Choose from: ${fontGuide}
    "headerEyebrow": "Affiliate Opportunities",
    "logoPlacement": "header", // Use "none" if the editorial header should stand on its own
    "headerGradient": ["#002b4c", "#005a8c"],
    "buttonGradient": ["#005a8c", "#02aae1"],
    "accentColor": "#02aae1",
    "supportingColors": ["#f59e0b", "#dbeafe", "#ecfeff"],
    "surfaceColor": "#f8fbff"
  },
  "subject": "Catchy email subject line",
  "preheader": "Preview text for email clients (max 200 chars)",
  "blocks": [
    // Array of content blocks — each block is one of the types below
  ]
}

CREATIVE DIRECTION LIBRARY:
${themeGuide}

BLOCK TYPES AVAILABLE:

1. HERO — Full-width banner image
   {"type":"hero", "width":${maxW}, "height":315, "imageUrl":"", "overlayText":"Optional text on image", "link":"https://...", "imagePrompts":["prompt 1","prompt 2","prompt 3"]}

2. TEXT — Heading + body copy
   {"type":"text", "heading":"Section Title", "body":"Body text with **bold** and *italic* markdown supported. Use \\n for line breaks."}

3. IMAGE ROW — 1 to 3 images side-by-side (great for showcasing multiple items)
   {"type":"imageRow", "images":[
     {"url":"", "width":${Math.floor(maxW/2)-10}, "height":200, "link":"https://...", "altText":"Description", "caption":"Optional caption", "imagePrompts":["prompt 1","prompt 2","prompt 3"]},
     {"url":"", "width":${Math.floor(maxW/2)-10}, "height":200, "link":"https://...", "altText":"Description", "caption":"Optional caption", "imagePrompts":["prompt 1","prompt 2","prompt 3"]}
   ]}

4. CTA — Call-to-action button
   {"type":"cta", "label":"Reserve Your Spot!", "url":"https://...", "style":"filled", "color":"#02aae1"}

5. INFO CARD — Side-by-side info columns (great for "Benefits | Steps" or "Before | After")
   {"type":"infoCard", "columns":[
     {"heading":"Column 1 Title", "body":"Content with **markdown**"},
     {"heading":"Column 2 Title", "body":"Content with **markdown**"}
   ]}

6. SPECS — Key-value table (great for pricing tiers, dates, dimensions)
   {"type":"specs", "heading":"Available Opportunities:", "color":"#02aae1", "items":[
     {"label":"Full Page", "value":"$700/issue or $2,600 for 4-issue bundle (SPECS: 8×10.25)"},
     {"label":"Half Page", "value":"$500/issue (SPECS: 8×5)"}
   ]}

7. BULLET LIST — Numbered or bulleted list
   {"type":"bulletList", "heading":"Why Sponsor?", "items":["Reason 1","Reason 2","Reason 3"], "listStyle":"numbered"}

8. DIVIDER — Visual separator
   {"type":"divider", "color":"#e0e0e0"}

IMAGE PROMPT RULES:
- For EVERY image slot (hero and imageRow images), provide exactly 3 "imagePrompts" — these are AI image generation prompts I'll paste into an image generator.
- STRICT: No photographic or realistic human faces/figures. Use stylized illustrations, icons, abstract graphics, or photo-realistic scenes WITHOUT people.
- No generated logos. Leave logo space blank/placeholder.
- Hero images: ${maxW}×315 px. Match the email's color scheme.
- Row images: dimensions should match the layout (half-width ≈ ${Math.floor(maxW/2)-10}px, third-width ≈ ${Math.floor(maxW/3)-10}px).
- Prompts should be detailed, specifying style, colors, composition, and content.

DESIGN PRINCIPLES:
- Mix block types for visual variety — don't just stack text blocks
- Theme Colors: Determine a vibrant, cohesive color theme for the email. Do NOT just use the default #02aae1 everywhere. Assign distinct, complementary hex colors to CTA buttons, dividers, and specs blocks to clearly separate different features/sponsors (e.g. use #2e7d32 for one sponsor CTA, #f57c00 for a divider, #1a237e for specs, etc).
- Use imageRow blocks to show multiple related visuals side-by-side
- Use infoCard blocks for comparative or step-by-step content
- Use specs blocks for pricing tiers, dates, or technical details
- Every major section should have at least one CTA button
- Write ALL copy fully — do not leave any placeholder text
- Target audience: Real estate affiliates, sponsors, and business partners
- Tone: Professional but warm, emphasizing networking value and business ROI

CRITICAL JSON FORMATTING RULES (TO PREVENT PARSING ERRORS):
1. Output MUST be 100% strictly valid JSON.
2. You MUST perfectly escape ALL internal double quotes inside strings (e.g. use \\" for inside quotes).
3. Do NOT use actual newlines inside strings; use \\n.
4. Do NOT leave trailing commas at the end of objects or arrays.

RAW INPUT TO ANALYZE:
${raw}

RETURN ONLY THE JSON OBJECT. NO MARKDOWN BLOCK, NO BACKTICKS, NO PREAMBLE. JUST THE { ... } CONTENT.`;

  navigator.clipboard.writeText(prompt);
  document.getElementById('importBoxTuesday').style.display = 'block';
  toast('AI Prompt copied! Paste into Gemini, then paste response below.');
}

let tuesdayDesign = null;

function importAIResponseTuesday(){
  try {
    let rawText = gv('aiResponseTuesday').trim();
    if(rawText.startsWith('```')) rawText = rawText.replace(/^```[a-z]*\n?/,'').replace(/\n?```$/,'').trim();
    rawText = rawText.replace(/,\s*([\]}])/g, '$1');
    
    const data = JSON.parse(rawText);

    if(data.design) tuesdayDesign = normalizeCreativeDesign(data.design, 1, gv('tuesdayHeaderCol') || '#02aae1');
    if(data.blocks && Array.isArray(data.blocks)){
      tuesdayBlocks = data.blocks;
      tuesdaySubject = data.subject || '';
      tuesdayPreheaderText = data.preheader || '';
      tuesdayBlocksImported = true;
      renderTuesdayBlockEditor();
      updateGenerateButtonLabel();
      toast(`Imported ${data.blocks.length} layout blocks! Review and click Generate.`);
    } else if(Array.isArray(data)){
      // Legacy array format fallback
      tuesdaySections = data.map(item => ({
        id: Date.now() + Math.random(), title: item.title||'', dateTime: item.dateTime||'',
        location: item.location||'', regLink: item.regLink||'', variationIndex:0, customColor:'', links:[],
        variations: [{description:item.copyA||'',heroUrl:''},{description:item.copyB||'',heroUrl:''},{description:item.copyC||'',heroUrl:''}]
      }));
      tuesdayBlocksImported = false;
      renderTuesdaySections();
      updateGenerateButtonLabel();
      toast(`Imported ${data.length} sections (legacy format).`);
    } else {
      toast('Invalid format: Expected an object with "blocks" array.');
    }
  } catch(e) {
    console.error('Import error:', e);
    toast('Error parsing JSON. Make sure you pasted only the JSON content.');
  }
}

// ===================== FLYER GENERATOR =====================
function generateFlyerAIPrompt() {
  const link = gv('flyerLink');
  const details = gv('flyerDetails');
  if(!link && !details){ toast('Add some flyer details first!'); return; }
  
  const skipInstructor = document.getElementById('flyerNoInstructor').classList.contains('on');
  const bioSpot = !skipInstructor ? "\n- LEAVE A CLEAR BOX/SPOT FOR: Instructor Name & Bio (I will fill this in manually later)" : "";
  const org = ORGS[currentOrgId];

  const commonRules = `
STRICT DESIGN RULES:
1. ASPECT RATIO: 8.5 x 11 inches (Portrait).
2. STYLE: "Swiss-Tech" Aesthetic. Clean, authoritative, and modern.
3. TYPOGRAPHY: Use only bold, heavy-weight sans-serif fonts for titles. Clean medium-weight for body.
4. BRANDING: Do NOT generate actual logos. Leave a clear 3-inch wide placeholder at the top for the "${org.name}" logo.
5. CONTEXT: This is for ${org.name}. ${currentOrgId === 'wcr' ? "The flyer should feel empowering, leadership-focused, and professional." : "The flyer should feel authoritative, educational, and service-oriented."}
6. NO PHOTOGRAPHIC PEOPLE: Only use the provided instructor headshot if available. Otherwise, use icons or abstract geometric human silhouettes.
7. GRID ELEMENTS: Include subtle 6x6 dot grid patterns (plus signs) in the background of primary color blocks.
8. DIVIDERS: Use curved diagonal "wave" lines to separate major sections (e.g., Hero Image to Title, Title to Body).
9. HIGHLIGHTS: Place Price/Location/CE Credits in high-contrast "pill" shapes or rectangular boxes with thick borders.
10. COLOR PALETTE: Dominant Navy Blue (#001F3F or similar), vibrant Red accents (#FF0000), and crisp White.
`;

  const prompt = `Create a strict, structured image generation prompt for 3 DIFFERENT 8.5x11 printable flyers based on the following details:
EVENT/TITLE: ${link}
DETAILS: ${details}
${instructorSection}

${commonRules}

VARIATION 1: "Strict Swiss Grid"
- Focus on mathematical alignment and the dot grid pattern.
- High use of Navy Blue blocks and white text.
- Very minimal, high-end technical feel.

VARIATION 2: "Modern Wave"
- Focus on the curved diagonal dividers and vibrant Red accents.
- Larger, more dynamic hero area.
- Energetic and bold, intended for high-engagement networking events.

VARIATION 3: "Premium Corporate"
- Focus on clean whitespace and elegant typography hierarchy.
- Subtle background textures.
- Professional, sophisticated, and balanced.

RETURN THE 3 PROMPTS CLEARLY LABELED.`;

  navigator.clipboard.writeText(prompt);
  document.getElementById('flyerCodeBox').style.display = 'block';
  sv('flyerGeneratedCode', prompt);
  toast('3 Flyer Variations copied to clipboard!');
}

// ===================== SINGLE CLASS AI PROMPT WORKFLOW =====================

let singleClassBlocks = []; // imported blocks per variation
let singleClassData = null; // parsed AI response
let singleClassImported = false;

function toggleInstructorFields(){
  const on = document.getElementById('singleInstructorToggle').classList.contains('on');
  document.getElementById('singleInstructorFields').style.display = on ? 'block' : 'none';
}

function toggleCampaignInstructorFields(){
  const on = document.getElementById('campaignInstructorToggle').classList.contains('on');
  document.getElementById('campaignInstructorFields').style.display = on ? 'block' : 'none';
}


const SINGLE_CLASS_FONT_OPTIONS = [
  'Montserrat',
  'Outfit',
  'Playfair Display',
  'Inter',
  'Manrope',
  'DM Sans',
  'Libre Baskerville',
  'Space Grotesk'
];

const SINGLE_CLASS_THEME_OPTIONS = [
  {name:'Coastal Authority', notes:'Atlantic blues, sea-glass teal, sharp editorial spacing', colors:['#0B3954','#087E8B','#F59E0B','#E0FBFC','#F8FAFC']},
  {name:'Sunrise Momentum', notes:'Terracotta, amber, and warm sand with a high-energy sunrise feel', colors:['#8C1C13','#BF4342','#F79D65','#F5CDA7','#FFF7F0']},
  {name:'Evergreen Leadership', notes:'Deep green, civic sage, and polished gold for confident credibility', colors:['#123524','#3E7C59','#A7C957','#F4C95D','#F6FBF7']},
  {name:'Slate and Brass', notes:'Architectural slate, brass, and refined neutral panels', colors:['#243B53','#486581','#D9A441','#E5E7EB','#F8FAFC']},
  {name:'Coral Energy', notes:'Coral, berry, and soft blush with strong movement', colors:['#A63A50','#F26A8D','#5F0F40','#F7CAD0','#FFF7FA']},
  {name:'Civic Indigo', notes:'Indigo, electric blue, and gold for an institutional feel', colors:['#1F3C88','#5893D4','#F2C14E','#D9E2EC','#F7FAFF']},
  {name:'Sand and Sage', notes:'Natural sand, sage, and clay for warm authority', colors:['#6B705C','#A5A58D','#CB997E','#FFE8D6','#FDFBF7']},
  {name:'Luxe Noir', notes:'Near-black, graphite, and metallic gold with premium restraint', colors:['#111827','#374151','#D4AF37','#E5E7EB','#FAFAFA']}
];

function firstNonEmpty(){
  for(let i=0;i<arguments.length;i++){
    const value = arguments[i];
    if(typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function cloneJson(value){
  return JSON.parse(JSON.stringify(value));
}

function normalizeStringArray(value){
  if(Array.isArray(value)){
    return value.map(item => typeof item === 'string' ? item.trim() : '').filter(Boolean);
  }
  if(typeof value === 'string' && value.trim()){
    return value.split(/\n+|\u2022|;+/).map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeColorArray(value){
  return Array.isArray(value)
    ? value.map(item => typeof item === 'string' ? item.trim() : '').filter(Boolean)
    : [];
}

function findBlockIndex(blocks, type){
  return (blocks || []).findIndex(block => block && block.type === type);
}

function insertBeforeCta(blocks, block){
  const ctaIndex = findBlockIndex(blocks, 'cta');
  blocks.splice(ctaIndex === -1 ? blocks.length : ctaIndex, 0, block);
}

function getSingleClassThemeGuide(){
  return SINGLE_CLASS_THEME_OPTIONS.map((theme, index) =>
    `${index + 1}. ${theme.name}: ${theme.notes}. Core colors ${theme.colors.join(', ')}`
  ).join('\n');
}

function getSingleClassThemeFallback(index){
  const theme = SINGLE_CLASS_THEME_OPTIONS[index % SINGLE_CLASS_THEME_OPTIONS.length];
  return {
    themeName: theme.name,
    themeDescription: theme.notes,
    headerGradient: [theme.colors[0], theme.colors[1]],
    buttonGradient: [theme.colors[1], theme.colors[2]],
    accentColor: theme.colors[2],
    supportingColors: [theme.colors[1], theme.colors[2], theme.colors[3]],
    surfaceColor: theme.colors[4]
  };
}

function getThemeFallbackByName(name){
  const match = SINGLE_CLASS_THEME_OPTIONS.find(theme => theme.name.toLowerCase() === firstNonEmpty(name).toLowerCase());
  return match ? {
    themeName: match.name,
    themeDescription: match.notes,
    headerGradient: [match.colors[0], match.colors[1]],
    buttonGradient: [match.colors[1], match.colors[2]],
    accentColor: match.colors[2],
    supportingColors: [match.colors[1], match.colors[2], match.colors[3]],
    surfaceColor: match.colors[4]
  } : null;
}

function normalizeCreativeDesign(design, fallbackIndex = 0, fallbackHeaderColor = ''){
  const theme = getThemeFallbackByName(design && design.themeName) || getSingleClassThemeFallback(fallbackIndex);
  const normalized = Object.assign({}, design || {});

  normalized.themeName = firstNonEmpty(normalized.themeName, theme.themeName);
  normalized.themeDescription = firstNonEmpty(normalized.themeDescription, theme.themeDescription);
  normalized.fontFamily = firstNonEmpty(normalized.fontFamily, SINGLE_CLASS_FONT_OPTIONS[fallbackIndex % SINGLE_CLASS_FONT_OPTIONS.length], 'Montserrat');
  normalized.headerEyebrow = firstNonEmpty(normalized.headerEyebrow);
  normalized.logoPlacement = firstNonEmpty(normalized.logoPlacement, 'header');

  normalized.headerGradient = normalizeColorArray(normalized.headerGradient).slice(0, 2);
  if(normalized.headerGradient.length < 2){
    normalized.headerGradient = [firstNonEmpty(fallbackHeaderColor, theme.headerGradient[0]), theme.headerGradient[1]];
  }

  normalized.buttonGradient = normalizeColorArray(normalized.buttonGradient).slice(0, 2);
  if(normalized.buttonGradient.length < 2){
    normalized.buttonGradient = theme.buttonGradient.slice();
  }

  normalized.supportingColors = normalizeColorArray(normalized.supportingColors);
  if(normalized.supportingColors.length < 3){
    normalized.supportingColors = theme.supportingColors.slice();
  }

  normalized.accentColor = firstNonEmpty(normalized.accentColor, normalized.supportingColors[0], theme.accentColor);
  normalized.surfaceColor = firstNonEmpty(normalized.surfaceColor, theme.surfaceColor);
  normalized.variationAccents = normalizeColorArray(normalized.variationAccents);
  if(normalized.variationAccents.length < 3){
    normalized.variationAccents = [
      firstNonEmpty(normalized.variationAccents[0], normalized.accentColor, normalized.headerGradient[0]),
      firstNonEmpty(normalized.variationAccents[1], normalized.supportingColors[0], normalized.buttonGradient[0]),
      firstNonEmpty(normalized.variationAccents[2], normalized.supportingColors[1], normalized.buttonGradient[1])
    ];
  }

  return normalized;
}

function buildLegacyToneVariations(settings, design){
  const s = settings || getSettings();
  const d = normalizeCreativeDesign(design, 0, s.c1a);
  return [
    {
      name:'A - Professional',
      tone:'professional',
      colorA:firstNonEmpty(d.variationAccents[0], s.c1a),
      colorB:firstNonEmpty(d.headerGradient[1], d.buttonGradient[0], s.c1b)
    },
    {
      name:'B - Energetic',
      tone:'energetic',
      colorA:firstNonEmpty(d.variationAccents[1], d.supportingColors[0], s.c2a),
      colorB:firstNonEmpty(d.supportingColors[1], d.buttonGradient[1], s.c2b)
    },
    {
      name:'C - Urgency',
      tone:'urgency',
      colorA:firstNonEmpty(d.variationAccents[2], d.supportingColors[1], s.c3a),
      colorB:firstNonEmpty(d.buttonGradient[1], d.supportingColors[2], s.c3b)
    }
  ];
}

function buildSingleClassDetailItems(parsed, variation){
  const items = [];
  const seen = new Set();
  const add = (label, value) => {
    const cleanLabel = firstNonEmpty(label).toUpperCase();
    const cleanValue = firstNonEmpty(value);
    if(!cleanLabel || !cleanValue || seen.has(cleanLabel)) return;
    seen.add(cleanLabel);
    items.push({label: cleanLabel, value: cleanValue});
  };

  (Array.isArray(parsed.eventDetails) ? parsed.eventDetails : []).forEach(item => {
    add(item && item.label, item && item.value);
  });

  add('WHAT', firstNonEmpty(parsed.shortTitle, parsed.title));
  add('WHEN', firstNonEmpty(parsed.dateTime, [firstNonEmpty(parsed.eventDate), firstNonEmpty(parsed.eventTime)].filter(Boolean).join(' | ')));
  add('WHERE', firstNonEmpty(parsed.location));
  add('COST', firstNonEmpty(parsed.cost));
  add('CREDITS', firstNonEmpty(parsed.credits));
  add('INSTRUCTOR', firstNonEmpty(parsed.instructor));
  add('AUDIENCE', firstNonEmpty(variation && variation.audience, parsed.audience));

  return items.slice(0, 8);
}

function buildSingleClassInfoColumns(parsed, variation){
  const columns = [];
  const push = (heading, body) => {
    const cleanBody = firstNonEmpty(body);
    if(cleanBody) columns.push({heading, body: cleanBody});
  };

  push('Professional Overview', firstNonEmpty(variation && variation.professionalOverview, parsed.professionalOverview, parsed.description));
  push('Who Should Attend', firstNonEmpty(variation && variation.audience, parsed.audience));
  push('Why It Matters Now', firstNonEmpty(variation && variation.whyAttend, parsed.whyAttend));

  return columns.slice(0, 3);
}

function buildSingleClassTakeawayItems(parsed, variation){
  const takeaways = normalizeStringArray(
    (variation && variation.keyTakeaways) ||
    parsed.keyTakeaways ||
    parsed.learningOutcomes ||
    parsed.takeaways
  );

  if(takeaways.length) return takeaways.slice(0, 6);

  return [
    'Understand the practical implications of this topic for active real estate professionals.',
    'Leave with talking points, next steps, and client-facing value you can use immediately.',
    'Identify the biggest risk areas, opportunities, and takeaways tied to this class topic.'
  ];
}

function buildSingleClassHeroBadges(parsed){
  return [
    firstNonEmpty(parsed.dateTime),
    firstNonEmpty(parsed.location),
    firstNonEmpty(parsed.credits),
    firstNonEmpty(parsed.cost)
  ].filter(Boolean).slice(0, 4);
}

function buildSingleClassHeroPromptEntry(entry, variation, parsed, index){
  const defaultTitle = `Variation ${String.fromCharCode(65 + index)} Hero Prompt`;
  const source = entry || (variation && (variation.heroImagePrompt || variation.heroPrompt)) || null;

  if(typeof source === 'string'){
    return {title: defaultTitle, prompt: source};
  }

  if(source && typeof source === 'object'){
    return {
      title: firstNonEmpty(source.title, defaultTitle),
      prompt: firstNonEmpty(source.prompt, source.text),
      eventDetailsToFeature: normalizeStringArray(source.eventDetailsToFeature || source.eventDetails),
      visualFocus: firstNonEmpty(source.visualFocus),
      reservedTextAreas: normalizeStringArray(source.reservedTextAreas || source.reservedText),
      altText: firstNonEmpty(source.altText)
    };
  }

  return {
    title: defaultTitle,
    prompt: '',
    eventDetailsToFeature: [],
    visualFocus: '',
    reservedTextAreas: [],
    altText: ''
  };
}

function buildSingleClassHeroPrompts(data){
  const prompts = [];
  const parsed = data.parsed || {};
  const rootPrompts = Array.isArray(data.heroImagePrompts) ? data.heroImagePrompts : [];
  const variations = Array.isArray(data.variations) ? data.variations : [];
  const total = Math.max(rootPrompts.length, variations.length);

  for(let i=0;i<total;i++){
    const prompt = buildSingleClassHeroPromptEntry(rootPrompts[i], variations[i] || {}, parsed, i);
    if(prompt.prompt) prompts.push(prompt);
  }

  return prompts;
}

function ensureSingleClassVariationBlocks(variation, parsed, options){
  const index = options.index || 0;
  const theme = getSingleClassThemeFallback(index);
  const v = Object.assign({}, variation || {});

  v.themeName = firstNonEmpty(v.themeName, theme.themeName);
  v.themeDescription = firstNonEmpty(v.themeDescription, theme.themeDescription);
  v.fontFamily = firstNonEmpty(v.fontFamily, SINGLE_CLASS_FONT_OPTIONS[index % SINGLE_CLASS_FONT_OPTIONS.length], 'Montserrat');

  v.headerGradient = normalizeColorArray(v.headerGradient).slice(0, 2);
  if(v.headerGradient.length < 2) v.headerGradient = theme.headerGradient.slice();

  v.buttonGradient = normalizeColorArray(v.buttonGradient).slice(0, 2);
  if(v.buttonGradient.length < 2) v.buttonGradient = theme.buttonGradient.slice();

  v.supportingColors = normalizeColorArray(v.supportingColors);
  if(!v.supportingColors.length) v.supportingColors = theme.supportingColors.slice();

  v.accentColor = firstNonEmpty(v.accentColor, v.supportingColors[0], v.buttonGradient[0], theme.accentColor);
  v.surfaceColor = firstNonEmpty(v.surfaceColor, theme.surfaceColor);
  v.headerEyebrow = firstNonEmpty(v.headerEyebrow, parsed.credits ? `PROFESSIONAL EDUCATION | ${parsed.credits}` : 'PROFESSIONAL EDUCATION');
  v.headerTitle = firstNonEmpty(v.headerTitle, parsed.shortTitle, parsed.title, 'Professional Education');
  v.logoPlacement = firstNonEmpty(v.logoPlacement, 'none');
  v.subject = firstNonEmpty(v.subject, parsed.title, v.headerTitle);
  v.preheader = firstNonEmpty(v.preheader, parsed.description, parsed.professionalOverview);
  v.heroImagePrompt = buildSingleClassHeroPromptEntry(v.heroImagePrompt || v.heroPrompt, v, parsed, index);

  const blocks = Array.isArray(v.blocks) ? cloneJson(v.blocks) : [];
  const detailItems = buildSingleClassDetailItems(parsed, v);
  const infoColumns = buildSingleClassInfoColumns(parsed, v);
  const takeaways = buildSingleClassTakeawayItems(parsed, v);
  const heroBadges = buildSingleClassHeroBadges(parsed);
  const ctaUrl = firstNonEmpty(options.regLink, parsed.registrationUrl, parsed.regLink, '#');

  let heroIndex = findBlockIndex(blocks, 'hero');
  if(heroIndex === -1){
    blocks.unshift({type:'hero'});
    heroIndex = 0;
  }

  const heroBlock = blocks[heroIndex];
  heroBlock.width = heroBlock.width || options.maxW || 730;
  heroBlock.height = heroBlock.height || options.heroH || 315;
  heroBlock.overlayText = firstNonEmpty(heroBlock.overlayText, parsed.shortTitle, parsed.title, v.headerTitle);
  heroBlock.altText = firstNonEmpty(heroBlock.altText, v.heroImagePrompt.altText, parsed.title, 'Event hero image');
  heroBlock.detailBadges = Array.isArray(heroBlock.detailBadges) && heroBlock.detailBadges.length ? heroBlock.detailBadges : heroBadges;
  heroBlock.imagePrompts = Array.isArray(heroBlock.imagePrompts) && heroBlock.imagePrompts.length
    ? heroBlock.imagePrompts
    : (v.heroImagePrompt.prompt ? [v.heroImagePrompt.prompt] : []);

  const specsIndex = findBlockIndex(blocks, 'specs');
  if(specsIndex === -1){
    blocks.splice(heroIndex + 1, 0, {
      type:'specs',
      heading:'Event Details',
      color:v.supportingColors[0] || v.accentColor,
      items:detailItems
    });
  } else {
    blocks[specsIndex].heading = firstNonEmpty(blocks[specsIndex].heading, 'Event Details');
    blocks[specsIndex].color = firstNonEmpty(blocks[specsIndex].color, v.supportingColors[0], v.accentColor);
    if(!Array.isArray(blocks[specsIndex].items) || !blocks[specsIndex].items.length){
      blocks[specsIndex].items = detailItems;
    }
  }

  const overviewBody = firstNonEmpty(v.professionalOverview, parsed.professionalOverview, parsed.description);
  const textIndex = findBlockIndex(blocks, 'text');
  if(textIndex === -1 && overviewBody){
    insertBeforeCta(blocks, {
      type:'text',
      heading:'Professional Overview',
      color:v.accentColor,
      body:overviewBody
    });
  } else if(textIndex !== -1){
    blocks[textIndex].heading = firstNonEmpty(blocks[textIndex].heading, 'Professional Overview');
    blocks[textIndex].color = firstNonEmpty(blocks[textIndex].color, v.accentColor);
    blocks[textIndex].body = firstNonEmpty(blocks[textIndex].body, overviewBody);
  }

  const infoCardIndex = findBlockIndex(blocks, 'infoCard');
  if(infoCardIndex === -1 && infoColumns.length >= 2){
    insertBeforeCta(blocks, {
      type:'infoCard',
      columns: infoColumns,
      colors: v.supportingColors
    });
  } else if(infoCardIndex !== -1){
    if(!Array.isArray(blocks[infoCardIndex].columns) || !blocks[infoCardIndex].columns.length){
      blocks[infoCardIndex].columns = infoColumns;
    }
    if(!Array.isArray(blocks[infoCardIndex].colors) || !blocks[infoCardIndex].colors.length){
      blocks[infoCardIndex].colors = v.supportingColors;
    }
  }

  const bulletIndex = findBlockIndex(blocks, 'bulletList');
  if(bulletIndex === -1){
    insertBeforeCta(blocks, {
      type:'bulletList',
      heading:'Key Takeaways',
      color:v.supportingColors[1] || v.accentColor,
      items:takeaways,
      listStyle:'bullet'
    });
  } else {
    blocks[bulletIndex].heading = firstNonEmpty(blocks[bulletIndex].heading, 'Key Takeaways');
    blocks[bulletIndex].color = firstNonEmpty(blocks[bulletIndex].color, v.supportingColors[1], v.accentColor);
    if(!Array.isArray(blocks[bulletIndex].items) || !blocks[bulletIndex].items.length){
      blocks[bulletIndex].items = takeaways;
    }
  }

  if(options.includeInstructor){
    const instructorIndex = findBlockIndex(blocks, 'instructor');
    const instructorBlock = {
      type:'instructor',
      name:firstNonEmpty(options.instructorName, parsed.instructor, 'Instructor'),
      headshotUrl:firstNonEmpty(options.instructorHeadshot),
      title:firstNonEmpty(v.instructorTitle, parsed.instructorTitle, 'Instructor'),
      bio:firstNonEmpty(v.instructorBio, parsed.instructorBio, parsed.professionalOverview)
    };

    if(instructorIndex === -1){
      insertBeforeCta(blocks, instructorBlock);
    } else {
      blocks[instructorIndex] = Object.assign(instructorBlock, blocks[instructorIndex]);
      blocks[instructorIndex].name = firstNonEmpty(blocks[instructorIndex].name, instructorBlock.name);
      blocks[instructorIndex].headshotUrl = firstNonEmpty(blocks[instructorIndex].headshotUrl, instructorBlock.headshotUrl);
      blocks[instructorIndex].title = firstNonEmpty(blocks[instructorIndex].title, instructorBlock.title);
      blocks[instructorIndex].bio = firstNonEmpty(blocks[instructorIndex].bio, instructorBlock.bio);
    }
  }

  const ctaIndex = findBlockIndex(blocks, 'cta');
  if(ctaIndex === -1){
    blocks.push({
      type:'cta',
      label:firstNonEmpty(v.ctaLabel, 'Reserve Your Seat'),
      url:ctaUrl
    });
  } else {
    blocks[ctaIndex].label = firstNonEmpty(blocks[ctaIndex].label, v.ctaLabel, 'Reserve Your Seat');
    blocks[ctaIndex].url = firstNonEmpty(blocks[ctaIndex].url, ctaUrl);
  }

  v.blocks = blocks;
  return v;
}

function buildSingleClassPromptText(options = {}){
  const raw = options.raw || '';
  const s = options.settings || getSettings();
  const org = ORGS[options.orgId || currentOrgId];
  const regLink = firstNonEmpty(options.regLink);
  const includeInstructor = !!options.includeInstructor;
  const instructorName = includeInstructor ? firstNonEmpty(options.instructorName) : '';
  const instructorHeadshot = includeInstructor ? firstNonEmpty(options.instructorHeadshot) : '';
  const maxW = options.maxW || s.emailMaxW || 730;
  const heroH = options.heroH || s.heroH || 315;
  const fontGuide = SINGLE_CLASS_FONT_OPTIONS.join(', ');
  const themeGuide = getSingleClassThemeGuide();
  const mission = firstNonEmpty(
    options.mission,
    'Design a complete, high-end single-class promotional email blast. Use your thinking capabilities to research the topic deeply and provide rich, compelling marketing copy.'
  );
  const strategyLines = normalizeStringArray(options.strategyLines);
  const additionalRules = normalizeStringArray(options.additionalRules);
  const strategyBlock = strategyLines.length
    ? `\n### SEND-SPECIFIC STRATEGY:\n${strategyLines.map(line => `- ${line}`).join('\n')}\n`
    : '';
  const additionalRuleBlock = additionalRules.length
    ? `\n### ADDITIONAL CAMPAIGN RULES:\n${additionalRules.map(line => `- ${line}`).join('\n')}\n`
    : '';

  const instructorSection = includeInstructor ? `
INSTRUCTOR SECTION (REQUIRED):
- Include an instructor block in each email variation.
- Instructor Name: "${instructorName}"
- Instructor Headshot URL: "${instructorHeadshot || 'Not provided - use a polished initials placeholder if needed'}"
- Write a professional bio for this instructor (2-3 sentences). Research who "${instructorName}" is in the real estate education space. The bio should mention expertise relevant to the class topic, any certifications, and teaching approach. If specific info is not available, create a plausible, polished bio based on the class subject matter.
- Place the instructor block after the main overview copy and before the CTA button.
- Layout: circular headshot on the left (or top on mobile), name + title + bio text on the right.
` : `
INSTRUCTOR SECTION: Not required for this email.
`;

  return `You are an expert email marketing designer and copywriter for ${org.name} located at ${org.addr}.

${currentOrgId === 'wcr' ? 'CONTEXT: This is for the Women\'s Council of REALTORS. Ensure the copy reflects their mission of professional networking and leadership development.' : 'CONTEXT: This is for the local REALTOR association audience and should feel credible, professional, and genuinely useful.'}

YOUR MISSION: ${mission}${strategyBlock}
### CRITICAL RULES:
1. No citations: do not include citations, references, footnotes, or source tags.
2. Research the class topic deeply enough to write for real estate professionals with specificity.
3. Each variation should feel distinct through palette, typography direction, and layout emphasis.
4. Every variation must include BOTH:
   - a concrete event-details section with logistics and specifics
   - a professional overview section that explains why the topic matters to agents, brokers, or affiliates right now
5. Do NOT place the Bonita Estero REALTORS or WCR logo above the header. Use an editorial header with no logo row.
6. Return more detail, not less. Write full sections, not thin placeholder copy.
7. Make each variation feel like a finished campaign, not a quick mockup.${additionalRuleBlock}

### HERO IMAGE RULES:
Generate one hero image prompt for each variation at ${maxW}x${heroH}px.
- Each hero image prompt MUST visually reference the actual event details: topic, date/time, credits, location context, instructor expertise, and the main business outcome of the class.
- Use symbolic objects, architectural forms, charts, contract details, map cues, legal motifs, negotiation cues, or market-specific visual devices tied to the class topic.
- Match the specific color theme of each variation.
- No realistic human faces. Stylized silhouettes or editorial illustration are acceptable only if they support the event topic.
- Reserve clean text zones for: eyebrow/kicker, title, date-time strip, and CTA badge.
- The prompt must describe the visual mood, composition, featured objects, and exactly which event details should appear as design cues.

### FONT DIRECTIONS:
Choose from: ${fontGuide}

### THEME DIRECTIONS:
Choose a distinct direction for each variation or intelligently adapt from this library:
${themeGuide}

RAW CLASS DETAILS:
${raw}

${regLink ? `REGISTRATION LINK: ${regLink}` : 'No registration link provided - use #'}

${instructorSection}
RETURN A JSON OBJECT (strictly valid) with this structure:
{
  "parsed": {
    "title": "Short, catchy title",
    "shortTitle": "Condensed hero-friendly title",
    "dateTime": "Readable date/time",
    "eventDate": "Readable event date",
    "eventTime": "Readable event time",
    "cost": "Price",
    "credits": "CE info",
    "instructor": "Name",
    "location": "Location",
    "audience": "Who should attend",
    "professionalOverview": "Why this topic matters in professional practice",
    "whyAttend": "Why this class is timely and valuable right now",
    "description": "Engaging summary",
    "keyTakeaways": ["Outcome 1", "Outcome 2", "Outcome 3"],
    "eventDetails": [
      {"label":"WHAT","value":"..."},
      {"label":"WHEN","value":"..."},
      {"label":"WHERE","value":"..."},
      {"label":"CREDITS","value":"..."}
    ]
  },
  "variations": [
    {
      "name": "A - Professional",
      "themeName": "Coastal Authority",
      "themeDescription": "Short explanation of the visual direction",
      "fontFamily": "Montserrat",
      "headerEyebrow": "PROFESSIONAL EDUCATION | 4 CE CREDITS",
      "headerTitle": "Variation-specific headline",
      "logoPlacement": "none",
      "headerGradient": ["#002b4c", "#005a8c"],
      "buttonGradient": ["#005a8c", "#02aae1"],
      "accentColor": "#02aae1",
      "supportingColors": ["#f59e0b", "#dbeafe", "#ecfeff"],
      "surfaceColor": "#f8fbff",
      "subject": "Factual and authoritative subject line",
      "preheader": "Max 200 chars",
      "professionalOverview": "2-4 sentence overview written for real estate professionals",
      "audience": "Ideal attendee profile",
      "whyAttend": "Why this is urgent or valuable now",
      "keyTakeaways": ["...", "...", "..."],
      "heroImagePrompt": {
        "title": "Variation A Hero Prompt",
        "prompt": "Complete image prompt here",
        "eventDetailsToFeature": ["topic", "date/time", "credits", "location cue"],
        "visualFocus": "What the image should emphasize",
        "reservedTextAreas": ["eyebrow", "headline", "date-time strip", "cta badge"],
        "altText": "Accessible description of the hero concept"
      },
      "blocks": [
        {"type":"hero", "width":${maxW}, "height":${heroH}, "imageUrl":"", "overlayText":"Hero-ready short title"},
        {"type":"specs", "heading":"Event Details", "color":"#02aae1", "items":[{"label":"WHEN","value":"..."},{"label":"WHERE","value":"..."}]},
        {"type":"text", "heading":"Professional Overview", "body":"Rich overview copy with **bold**, *italic*, and standard markdown. Use \\n for line breaks."},
        {"type":"infoCard", "columns":[
          {"heading":"Who Should Attend","body":"..."},
          {"heading":"Why It Matters Now","body":"..."},
          {"heading":"What You Will Walk Away With","body":"..."}
        ]},
        {"type":"bulletList", "heading":"Key Takeaways", "items":["...","...","..."]},
        ${includeInstructor ? `{"type":"instructor", "name":"${instructorName}", "headshotUrl":"${instructorHeadshot}", "bio":"Refined AI bio", "title":"Instructor"},` : ''}
        {"type":"cta", "label":"Reserve Your Seat", "url":"${regLink || '#'}"}
      ]
    }
  ],
  "heroImagePrompts": [
    {
      "title": "Variation A Hero Prompt",
      "prompt": "Complete image prompt here",
      "eventDetailsToFeature": ["topic", "date/time", "credits", "location cue"],
      "visualFocus": "What the image should emphasize",
      "reservedTextAreas": ["eyebrow", "headline", "date-time strip", "cta badge"],
      "altText": "Accessible description of the hero concept"
    }
  ]
}

REQUIRED CONTENT RULES FOR EACH VARIATION:
- Return exactly 3 variation objects using the shape above.
- Each variation must contain at minimum: hero, event details specs, professional overview text, a multi-column benefits/proof section, a key takeaways list, and a CTA.
- Each variation must clearly surface the event details and the professional overview instead of hiding them in one paragraph.
- Each variation must use a noticeably different theme direction and color palette.
- The JSON must contain real, specific sections and details - not placeholders like "..." or "[insert copy]".

RETURN ONLY THE JSON OBJECT. NO MARKDOWN BLOCK, NO BACKTICKS, NO PREAMBLE. JUST THE { ... } CONTENT.`;
}

function generateSingleClassAIPrompt(){
  const raw = gv('singleRawInput');
  if(!raw){ toast('Paste the class details first!'); return; }

  const prompt = buildSingleClassPromptText({
    raw,
    regLink: gv('regLink'),
    includeInstructor: document.getElementById('singleInstructorToggle').classList.contains('on'),
    instructorName: gv('singleInstructorName'),
    instructorHeadshot: gv('singleInstructorHeadshot'),
    settings: getSettings()
  });

  navigator.clipboard.writeText(prompt);
  document.getElementById('singleImportBox').style.display = 'block';
  document.getElementById('singlePromptPreviewBox').style.display = 'block';
  document.getElementById('singlePromptPreview').textContent = prompt;
  toast('AI Prompt copied to clipboard! Paste into Gemini or ChatGPT, then paste the response below.');
}

function buildCampaignEmailPrompt(email){
  if(!email) return '';
  const campaign = campaignPlanData ? (campaignPlanData.campaign || {}) : {};
  const eventDate = firstNonEmpty(campaign.eventDate, gv('campaignEventDate'));
  const sendDateLabel = firstNonEmpty(formatLongDate(email.sendDate), email.sendDate);
  const eventDateLabel = firstNonEmpty(formatLongDate(eventDate), eventDate);
  const daysBeforeEvent = eventDate && email.sendDate ? diffDays(email.sendDate, eventDate) : null;
  const design = normalizeCreativeDesign(email.designDirection, 0, currentOrgId === 'wcr' ? '#002b4c' : '#004a32');
  const heroDetails = buildSingleClassHeroPromptEntry(email.heroImagePrompt, {}, {}, 0);
  const strategyLines = [
    firstNonEmpty(campaign.campaignName) ? `Campaign: ${campaign.campaignName}` : '',
    sendDateLabel ? `This email is scheduled to send on ${sendDateLabel}.` : '',
    eventDateLabel ? `The event takes place on ${eventDateLabel}.` : '',
    firstNonEmpty(email.relativeTiming, daysBeforeEvent !== null ? `${daysBeforeEvent} days before the event` : '') ? `Campaign timing: ${firstNonEmpty(email.relativeTiming, daysBeforeEvent !== null ? `${daysBeforeEvent} days before the event` : '')}.` : '',
    firstNonEmpty(email.stage) ? `Campaign stage: ${email.stage}.` : '',
    firstNonEmpty(email.purpose) ? `Primary purpose: ${email.purpose}.` : '',
    firstNonEmpty(email.angle) ? `Marketing angle to emphasize: ${email.angle}.` : '',
    firstNonEmpty(email.targetAudience) ? `Target audience for this send: ${email.targetAudience}.` : '',
    firstNonEmpty(email.subjectLineIdea) ? `Subject line territory to honor: ${email.subjectLineIdea}.` : '',
    firstNonEmpty(email.preheaderIdea) ? `Preheader direction to honor: ${email.preheaderIdea}.` : '',
    firstNonEmpty(email.ctaLabel) ? `Preferred CTA label: ${email.ctaLabel}.` : '',
    email.mustIncludeDetails && email.mustIncludeDetails.length ? `Must-include details: ${email.mustIncludeDetails.join('; ')}.` : '',
    email.recommendedSections && email.recommendedSections.length ? `Sections to emphasize: ${email.recommendedSections.join(', ')}.` : '',
    design.themeName ? `Design direction: ${design.themeName} - ${design.themeDescription}.` : '',
    design.fontFamily ? `Use ${design.fontFamily} as the leading font direction.` : '',
    design.headerEyebrow ? `Suggested header eyebrow: ${design.headerEyebrow}.` : '',
    heroDetails.visualFocus ? `Hero focus: ${heroDetails.visualFocus}.` : '',
    heroDetails.eventDetailsToFeature && heroDetails.eventDetailsToFeature.length ? `Hero details to feature: ${heroDetails.eventDetailsToFeature.join(', ')}.` : ''
  ].filter(Boolean);

  const additionalRules = [
    'The subject line and preheader must feel specific to this campaign stage rather than generic launch copy.',
    'Honor the timing of the send: early emails should educate and build value, while later emails should increase urgency and specificity.',
    design.logoPlacement === 'none' ? 'Do not place the BER or WCR logo above the header for this send.' : 'If you use a logo row, keep it subordinate to the main editorial header.',
    `Lean into this palette: header gradient ${design.headerGradient.join(' to ')}, button gradient ${design.buttonGradient.join(' to ')}, accent ${design.accentColor}.`,
    email.mustIncludeDetails && email.mustIncludeDetails.length ? `Explicitly surface these details inside the event-details section: ${email.mustIncludeDetails.join('; ')}.` : '',
    firstNonEmpty(email.ctaLabel) ? `Use "${email.ctaLabel}" as the preferred CTA language unless the content demands a stronger equivalent.` : ''
  ].filter(Boolean);

  return buildSingleClassPromptText({
    raw: gv('campaignRawInput').trim(),
    regLink: firstNonEmpty(gv('campaignRegLink'), campaign.registrationLink),
    includeInstructor: document.getElementById('campaignInstructorToggle').classList.contains('on'),
    instructorName: gv('campaignInstructorName'),
    instructorHeadshot: gv('campaignInstructorHeadshot'),
    settings: getSettings(),
    mission: 'Design one polished send inside a larger campaign for this class or event. Return 3 high-end email variations tailored to this specific send timing, audience, and campaign objective.',
    strategyLines,
    additionalRules
  });
}

function normalizeCampaignPlanEmail(email, index, campaign){
  const item = Object.assign({}, email || {});
  const designDirection = normalizeCreativeDesign(item.designDirection || item.design || {}, index, currentOrgId === 'wcr' ? '#002b4c' : '#004a32');
  const sendDate = firstNonEmpty(item.sendDate, item.date, item.postDate);
  const relativeTiming = firstNonEmpty(item.relativeTiming, item.timing, item.sendWindow);
  return {
    sendDate,
    relativeTiming: firstNonEmpty(relativeTiming, sendDate && campaign.eventDate ? `${diffDays(sendDate, campaign.eventDate)} days before event` : ''),
    stage: firstNonEmpty(item.stage, item.phase, `Send ${index + 1}`),
    targetAudience: firstNonEmpty(item.targetAudience, item.audience, campaign.audienceSummary),
    purpose: firstNonEmpty(item.purpose, item.goal, item.objective),
    angle: firstNonEmpty(item.angle, item.messageAngle, item.focus),
    subjectLineIdea: firstNonEmpty(item.subjectLineIdea, item.subject),
    preheaderIdea: firstNonEmpty(item.preheaderIdea, item.preheader),
    ctaLabel: firstNonEmpty(item.ctaLabel, 'Reserve Your Seat'),
    mustIncludeDetails: normalizeStringArray(item.mustIncludeDetails || item.keyDetails || item.mustSurface),
    recommendedSections: normalizeStringArray(item.recommendedSections || item.sectionsToEmphasize || item.sectionFocus),
    designDirection,
    heroImagePrompt: buildSingleClassHeroPromptEntry(item.heroImagePrompt || item.heroPrompt, {}, {}, index)
  };
}

function heroDetailsToMarkup(heroPrompt){
  const focus = heroPrompt && heroPrompt.visualFocus
    ? `<div style="font-size:11px;color:var(--text2);line-height:1.5;margin-bottom:6px"><strong style="color:var(--text)">Visual focus:</strong> ${escHtml(heroPrompt.visualFocus)}</div>`
    : '';
  const details = heroPrompt && heroPrompt.eventDetailsToFeature && heroPrompt.eventDetailsToFeature.length
    ? `<div style="font-size:11px;color:var(--text2);line-height:1.5"><strong style="color:var(--text)">Feature details:</strong> ${escHtml(heroPrompt.eventDetailsToFeature.join(' • '))}</div>`
    : '';
  const zones = heroPrompt && heroPrompt.reservedTextAreas && heroPrompt.reservedTextAreas.length
    ? `<div style="font-size:11px;color:var(--text2);line-height:1.5;margin-top:6px"><strong style="color:var(--text)">Reserved text zones:</strong> ${escHtml(heroPrompt.reservedTextAreas.join(' • '))}</div>`
    : '';
  const promptText = heroPrompt && heroPrompt.prompt
    ? `<div style="font-size:11px;color:var(--text2);line-height:1.5;margin-top:6px">${escHtml(heroPrompt.prompt)}</div>`
    : '';
  return `${focus}${details}${zones}${promptText}`;
}

function renderCampaignPlanOutput(){
  if(!campaignPlanData || !campaignPlanData.emails || !campaignPlanData.emails.length){
    toast('Import a campaign plan first.');
    return;
  }

  const campaign = campaignPlanData.campaign || {};
  const container = document.getElementById('tabContent');
  const firstDesign = campaignPlanData.emails[0].designDirection || {};
  const overviewSwatches = [
    ...(firstDesign.headerGradient || []).slice(0, 2),
    firstDesign.accentColor,
    ...((firstDesign.supportingColors || []).slice(0, 2))
  ].filter(Boolean).map(color => `<div style="width:16px;height:16px;border-radius:999px;background:${color};border:1px solid rgba(255,255,255,0.08)"></div>`).join('');

  const timelineHtml = campaignPlanData.emails.map((email, index) => {
    const prompt = buildCampaignEmailPrompt(email);
    const design = email.designDirection;
    const swatches = [
      ...(design.headerGradient || []).slice(0, 2),
      design.accentColor,
      ...((design.supportingColors || []).slice(0, 2))
    ].filter(Boolean).map(color => `<div style="width:16px;height:16px;border-radius:999px;background:${color};border:1px solid rgba(255,255,255,0.08)"></div>`).join('');
    const mustInclude = email.mustIncludeDetails.length ? `<div style="font-size:11px;color:var(--text2);line-height:1.5"><strong style="color:var(--text)">Must include:</strong> ${escHtml(email.mustIncludeDetails.join(' • '))}</div>` : '';
    const sections = email.recommendedSections.length ? `<div style="font-size:11px;color:var(--text2);line-height:1.5;margin-top:6px"><strong style="color:var(--text)">Section focus:</strong> ${escHtml(email.recommendedSections.join(' • '))}</div>` : '';

    return `
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap">
          <div>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--accent2)">Send ${index + 1}</div>
            <div style="font-size:18px;font-weight:800;color:var(--text)">${escHtml(firstNonEmpty(email.stage, `Send ${index + 1}`))}</div>
            <div style="font-size:12px;color:var(--text2);margin-top:4px">${escHtml(firstNonEmpty(formatLongDate(email.sendDate), email.sendDate))}${email.relativeTiming ? ` • ${escHtml(email.relativeTiming)}` : ''}</div>
          </div>
          <div style="min-width:240px;max-width:320px;background:rgba(255,255,255,0.04);border-radius:10px;padding:10px">
            <div style="font-size:10px;text-transform:uppercase;color:var(--text2)">Design Direction</div>
            <div style="font-weight:700;color:var(--accent2)">${escHtml(design.themeName || 'Custom Theme')}</div>
            ${design.themeDescription ? `<div style="font-size:11px;color:var(--text2);line-height:1.4;margin-top:4px">${escHtml(design.themeDescription)}</div>` : ''}
            <div style="font-size:11px;color:var(--text2);margin-top:8px">Font: <strong style="color:var(--text)">${escHtml(design.fontFamily || 'Montserrat')}</strong></div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px">${swatches}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:12px">
          <div style="background:rgba(255,255,255,0.04);padding:10px;border-radius:8px"><span style="font-size:10px;text-transform:uppercase;color:var(--text2)">Audience</span><div style="font-size:13px;line-height:1.45;color:var(--text)">${escHtml(firstNonEmpty(email.targetAudience, 'General audience'))}</div></div>
          <div style="background:rgba(255,255,255,0.04);padding:10px;border-radius:8px"><span style="font-size:10px;text-transform:uppercase;color:var(--text2)">Purpose</span><div style="font-size:13px;line-height:1.45;color:var(--text)">${escHtml(firstNonEmpty(email.purpose, 'Drive registrations'))}</div></div>
          <div style="background:rgba(255,255,255,0.04);padding:10px;border-radius:8px"><span style="font-size:10px;text-transform:uppercase;color:var(--text2)">Angle</span><div style="font-size:13px;line-height:1.45;color:var(--text)">${escHtml(firstNonEmpty(email.angle, 'Promote the event with a clear value proposition'))}</div></div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-bottom:12px">
          <div style="background:rgba(0,0,0,0.18);padding:10px;border-radius:8px">
            <div class="output-label" style="margin-bottom:6px">Subject Idea <button class="copy-btn" onclick="copyText('campaign-subject-${index}')">Copy</button></div>
            <div class="output-box" id="campaign-subject-${index}" style="max-height:none;min-height:auto">${escHtml(firstNonEmpty(email.subjectLineIdea, 'Use the imported campaign subject suggestion.'))}</div>
          </div>
          <div style="background:rgba(0,0,0,0.18);padding:10px;border-radius:8px">
            <div class="output-label" style="margin-bottom:6px">Preheader Idea <button class="copy-btn" onclick="copyText('campaign-preheader-${index}')">Copy</button></div>
            <div class="output-box" id="campaign-preheader-${index}" style="max-height:none;min-height:auto">${escHtml(firstNonEmpty(email.preheaderIdea, 'Use the imported campaign preheader suggestion.'))}</div>
          </div>
        </div>

        ${mustInclude || sections ? `<div style="background:rgba(255,255,255,0.04);padding:10px;border-radius:8px;margin-bottom:12px">${mustInclude}${sections}</div>` : ''}

        <div style="background:rgba(255,255,255,0.04);padding:10px;border-radius:8px;margin-bottom:12px">
          <div style="font-size:10px;text-transform:uppercase;color:var(--text2);margin-bottom:6px">Hero Direction</div>
          ${heroDetailsToMarkup(email.heroImagePrompt)}
        </div>

        <div class="output-section" style="margin-bottom:0">
          <div class="output-label">Single Email Prompt <button class="copy-btn" onclick="copyText('campaign-prompt-${index}')">Copy</button></div>
          <div class="output-box" id="campaign-prompt-${index}" style="max-height:360px">${escHtml(prompt)}</div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="tab-panel active" id="panel-0">
      <div class="output-section">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:16px">
          <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:10px">
            <span style="font-size:10px;text-transform:uppercase;color:var(--text2)">Campaign</span>
            <div style="font-size:18px;font-weight:800;color:var(--accent2)">${escHtml(firstNonEmpty(campaign.campaignName, 'Campaign Email Planner'))}</div>
            <div style="font-size:12px;color:var(--text2);line-height:1.5;margin-top:6px">${escHtml(firstNonEmpty(campaign.strategySummary, campaign.campaignObjective, 'Imported campaign strategy ready for execution.'))}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:10px">
            <span style="font-size:10px;text-transform:uppercase;color:var(--text2)">Dates</span>
            <div style="font-size:13px;color:var(--text);line-height:1.6;margin-top:6px">Start: ${escHtml(firstNonEmpty(formatLongDate(campaign.todayDate), campaign.todayDate, gv('campaignStartDate')))}<br>Event: ${escHtml(firstNonEmpty(formatLongDate(campaign.eventDate), campaign.eventDate, gv('campaignEventDate')))}<br>Sends planned: ${campaignPlanData.emails.length}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:10px">
            <span style="font-size:10px;text-transform:uppercase;color:var(--text2)">Audience & Tone</span>
            <div style="font-size:12px;color:var(--text2);line-height:1.5;margin-top:6px">${escHtml(firstNonEmpty(campaign.audienceSummary, gv('campaignTargetAudience'), 'General audience'))}</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:10px">${overviewSwatches}</div>
          </div>
        </div>
      </div>
      ${timelineHtml}
    </div>`;

  configureOutputTabs({ tab0: 'Campaign Plan', showTab1: false, showTab2: false, showComposer: false });
  setOutputVisible();
  openOutputTab(0);
}

function importCampaignPlannerResponse(){
  try {
    let rawText = gv('campaignPlannerAIResponse').trim();
    if(rawText.startsWith('```')) rawText = rawText.replace(/^```[a-z]*\n?/,'').replace(/\n?```$/,'').trim();
    rawText = rawText.replace(/,\s*([\]}])/g, '$1');

    const data = JSON.parse(rawText);
    const campaign = Object.assign({}, data.campaign || data.plan || {});
    campaign.todayDate = firstNonEmpty(campaign.todayDate, gv('campaignStartDate'), formatDateForInput(new Date()));
    campaign.eventDate = firstNonEmpty(campaign.eventDate, gv('campaignEventDate'));
    campaign.campaignName = firstNonEmpty(campaign.campaignName, campaign.name, 'Campaign Email Planner');
    campaign.campaignObjective = firstNonEmpty(campaign.campaignObjective, campaign.goal, gv('campaignGoal'));
    campaign.audienceSummary = firstNonEmpty(campaign.audienceSummary, campaign.targetAudience, gv('campaignTargetAudience'));
    campaign.strategySummary = firstNonEmpty(campaign.strategySummary, campaign.recommendedCadence, campaign.campaignObjective);
    campaign.registrationLink = firstNonEmpty(campaign.registrationLink, gv('campaignRegLink'));

    let emails = [];
    if(Array.isArray(data.emails)) emails = data.emails;
    else if(Array.isArray(data.timeline)) emails = data.timeline;
    else if(Array.isArray(data.schedule)) emails = data.schedule;

    emails = emails
      .map((email, index) => normalizeCampaignPlanEmail(email, index, campaign))
      .filter(email => email.sendDate || email.stage || email.purpose);

    emails.sort((a, b) => firstNonEmpty(a.sendDate).localeCompare(firstNonEmpty(b.sendDate)));

    if(!emails.length){
      toast('Campaign JSON needs an emails, timeline, or schedule array.');
      return;
    }

    campaignPlanData = { campaign, emails };
    campaignPlanImported = true;
    updateGenerateButtonLabel();
    renderCampaignPlanOutput();
    toast(`Imported campaign plan with ${emails.length} scheduled emails.`);
  } catch(e) {
    console.error('Campaign planner import error:', e);
    toast('Error parsing campaign planner JSON: ' + e.message);
  }
}

function generateCampaignPlannerPrompt(){
  const raw = gv('campaignRawInput').trim();
  if(!raw){ toast('Paste the event or class details first!'); return; }

  const todayDate = firstNonEmpty(gv('campaignStartDate'), formatDateForInput(new Date()));
  const eventDate = firstNonEmpty(gv('campaignEventDate'));
  if(!eventDate){ toast('Add the event or due date first.'); return; }

  const org = ORGS[currentOrgId];
  const targetAudience = firstNonEmpty(gv('campaignTargetAudience'), 'General audience');
  const goal = firstNonEmpty(gv('campaignGoal'), 'Maximize registrations and attendance');
  const cadence = firstNonEmpty(gv('campaignCadence'), 'recommended');
  const regLink = firstNonEmpty(gv('campaignRegLink'), 'Not provided');
  const fontGuide = SINGLE_CLASS_FONT_OPTIONS.join(', ');
  const themeGuide = getSingleClassThemeGuide();
  const includeInstructor = document.getElementById('campaignInstructorToggle').classList.contains('on');
  const instructorLines = includeInstructor ? `
INSTRUCTOR DATA TO USE IN THE PLANNING:
- Instructor name: ${firstNonEmpty(gv('campaignInstructorName'), 'Not provided')}
- Instructor headshot URL: ${firstNonEmpty(gv('campaignInstructorHeadshot'), 'Not provided')}
- Include instructor credibility touches in the send plans when relevant.
` : '';

  const prompt = `You are an expert lifecycle email strategist and editorial email designer for ${org.name}.

${currentOrgId === 'wcr' ? 'CONTEXT: This campaign is for the Women\'s Council of REALTORS. Make the sequencing feel leadership-focused, polished, collaborative, and highly relevant to members and affiliates.' : 'CONTEXT: This campaign is for a REALTOR association audience. Make the sequencing feel practical, high-value, timely, and professionally credible.'}

TODAY'S DATE: ${todayDate}
EVENT / DUE DATE: ${eventDate}
TARGET AUDIENCE: ${targetAudience}
PRIMARY GOAL: ${goal}
CADENCE PREFERENCE: ${cadence}
REGISTRATION LINK: ${regLink}
${instructorLines}
THEME LIBRARY YOU MAY DRAW FROM:
${themeGuide}

FONT OPTIONS:
${fontGuide}

TASK:
Plan a full campaign of promotional email blasts from today's date through the event date. Decide how many sends are appropriate based on the runway, the audience, the urgency, and the likely objections. Then plan each email so it can later be generated as a rich single-email blast with multiple variations.

REQUIREMENTS:
- Plan between 2 and 7 total sends depending on the runway.
- Every send must have an intentional date, purpose, audience focus, and creative angle.
- The earlier sends should build awareness, value, and credibility.
- Mid-campaign sends should deepen urgency, professional relevance, and proof.
- Final sends should become more specific, urgent, and conversion-focused.
- Each send should specify a design direction that an external AI can follow, including font, gradients, accent colors, supporting colors, surface color, header eyebrow, and logo placement.
- Each send should also specify a hero image direction that bakes in the event details.
- Think carefully about timing gaps. Do not cluster everything at the end unless the runway is genuinely short.
- Return valid JSON only.

RETURN A SINGLE JSON OBJECT with this exact structure:
{
  "campaign": {
    "campaignName": "Short internal campaign name",
    "todayDate": "${todayDate}",
    "eventDate": "${eventDate}",
    "campaignObjective": "One-sentence goal",
    "audienceSummary": "Who we are trying to move and why",
    "recommendedCadence": "Short explanation of spacing and sequencing",
    "strategySummary": "Overall campaign strategy in 2-4 sentences",
    "keyVariables": ["urgency factor", "audience need", "timing note"]
  },
  "emails": [
    {
      "sendDate": "YYYY-MM-DD",
      "relativeTiming": "e.g. 21 days before event",
      "stage": "Launch / Value Proof / Urgency / Last Chance",
      "targetAudience": "Specific audience segment for this send",
      "purpose": "What this email needs to accomplish",
      "angle": "Core narrative or hook for the send",
      "subjectLineIdea": "Suggested subject direction",
      "preheaderIdea": "Suggested preheader direction",
      "ctaLabel": "Preferred CTA copy",
      "mustIncludeDetails": ["detail 1", "detail 2", "detail 3"],
      "recommendedSections": ["Professional Overview", "Event Details", "Why It Matters Now", "Key Takeaways"],
      "designDirection": {
        "themeName": "Theme name",
        "themeDescription": "Short creative explanation",
        "fontFamily": "Outfit",
        "headerEyebrow": "EDITORIAL EYEBROW COPY",
        "logoPlacement": "none",
        "headerGradient": ["#002b4c", "#005a8c"],
        "buttonGradient": ["#005a8c", "#02aae1"],
        "accentColor": "#02aae1",
        "supportingColors": ["#f59e0b", "#dbeafe", "#ecfeff"],
        "surfaceColor": "#f8fbff"
      },
      "heroImagePrompt": {
        "title": "Hero prompt label",
        "prompt": "Detailed hero direction",
        "eventDetailsToFeature": ["topic", "date/time", "credits", "location cue"],
        "visualFocus": "What the image should emphasize",
        "reservedTextAreas": ["eyebrow", "headline", "date strip", "cta badge"],
        "altText": "Accessible description"
      }
    }
  ]
}

RAW EVENT / CLASS DETAILS:
${raw}

RETURN ONLY THE JSON OBJECT. NO MARKDOWN BLOCK, NO BACKTICKS, NO PREAMBLE.`;

  navigator.clipboard.writeText(prompt);
  document.getElementById('campaignPlannerImportBox').style.display = 'block';
  document.getElementById('campaignPlannerPromptPreviewBox').style.display = 'block';
  document.getElementById('campaignPlannerPromptPreview').textContent = prompt;
  toast('Campaign planner prompt copied to clipboard!');
}

function importSingleClassAIResponse(){
  try {
    let rawText = gv('singleAIResponse').trim();
    if(rawText.startsWith('```')) rawText = rawText.replace(/^```[a-z]*\n?/,'').replace(/\n?```$/,'').trim();
    rawText = rawText.replace(/,\s*([\]}])/g, '$1');

    const data = JSON.parse(rawText);
    const s = getSettings();
    const includeInstructor = document.getElementById('singleInstructorToggle').classList.contains('on');
    const parsed = data.parsed || {};
    const regLink = gv('regLink') || parsed.registrationUrl || parsed.regLink || '#';

    data.variations = (Array.isArray(data.variations) ? data.variations : []).slice(0, 3).map((variation, index) =>
      ensureSingleClassVariationBlocks(variation, parsed, {
        index,
        includeInstructor,
        instructorName: gv('singleInstructorName'),
        instructorHeadshot: gv('singleInstructorHeadshot'),
        regLink,
        maxW: s.emailMaxW || 730,
        heroH: s.heroH || 315
      })
    );

    data.heroImagePrompts = buildSingleClassHeroPrompts(data);
    singleClassData = data;
    singleClassImported = true;
    updateGenerateButtonLabel();

    if(data.heroImagePrompts && data.heroImagePrompts.length > 0){
      const box = document.getElementById('singleHeroPromptsBox');
      const list = document.getElementById('singleHeroPromptsList');
      box.style.display = 'block';
      list.innerHTML = data.heroImagePrompts.map((p, i) => `
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:12px">
            <span style="font-size:11px;font-weight:700;color:var(--accent2)">${escHtml(p.title || `Prompt ${i+1}`)}</span>
            <button class="btn-sm" onclick="navigator.clipboard.writeText(singleClassData.heroImagePrompts[${i}].prompt);toast('Hero prompt ${i+1} copied!')" style="font-size:10px;padding:3px 8px">?? Copy</button>
          </div>
          ${p.visualFocus ? `<p style="font-size:10px;color:var(--accent);line-height:1.4;margin:0 0 6px"><strong>Visual Focus:</strong> ${escHtml(p.visualFocus)}</p>` : ''}
          ${p.eventDetailsToFeature && p.eventDetailsToFeature.length ? `<p style="font-size:10px;color:var(--text2);line-height:1.4;margin:0 0 6px"><strong>Event Details:</strong> ${escHtml(p.eventDetailsToFeature.join(' ? '))}</p>` : ''}
          ${p.reservedTextAreas && p.reservedTextAreas.length ? `<p style="font-size:10px;color:var(--text2);line-height:1.4;margin:0 0 6px"><strong>Reserved Text Zones:</strong> ${escHtml(p.reservedTextAreas.join(' ? '))}</p>` : ''}
          <p style="font-size:11px;color:var(--text2);line-height:1.4;margin:0">${escHtml(p.prompt)}</p>
        </div>
      `).join('');
    } else {
      document.getElementById('singleHeroPromptsBox').style.display = 'none';
    }

    _genSettings = s;

    const container = document.getElementById('tabContent');
    container.innerHTML = '';

    if(data.variations && data.variations.length > 0){
      _genVariations = data.variations.map(v => ({
        name: v.name,
        tone: v.tone,
        colorA: v.accentColor || (v.headerGradient || [])[0] || s.c1a,
        colorB: (v.buttonGradient || [])[1] || (v.headerGradient || [])[1] || s.c1b
      }));
      _genPreheaders = data.variations.map(v => v.preheader || '');

      data.variations.forEach((v, i) => {
        const processedBlocks = v.blocks || [];

        const emailHtml = generateDynamicEmailHTML(
          processedBlocks, s,
          v.accentColor || (v.headerGradient || [])[0] || s.c1a,
          v.headerTitle || data.parsed?.title || 'Class Announcement',
          `Hi ${s.mergeTag} - ${v.preheader || ''}`,
          v
        );

        const panel = document.createElement('div');
        panel.className = 'tab-panel' + (i === 0 ? ' active' : '');
        panel.id = 'panel-' + i;
        const themeSwatches = [ ...(v.headerGradient || []).slice(0, 2), v.accentColor, ...((v.supportingColors || []).slice(0, 2)) ]
          .filter(Boolean)
          .map(color => `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:1px solid rgba(255,255,255,0.08)"></div>`)
          .join('');
        panel.innerHTML = `
          <div class="output-section">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
              <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px">
                <span style="font-size:10px;text-transform:uppercase;color:var(--text2)">Variation Theme</span>
                <div style="font-weight:700;color:var(--accent2)">${escHtml(v.themeName || v.name || 'Custom Theme')}</div>
                ${v.themeDescription ? `<div style="font-size:11px;color:var(--text2);line-height:1.4;margin-top:4px">${escHtml(v.themeDescription)}</div>` : ''}
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px">
                <span style="font-size:10px;text-transform:uppercase;color:var(--text2)">Selected Font</span>
                <div style="font-weight:700;color:var(--accent2)">${v.fontFamily || 'Default'}</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px">${themeSwatches}</div>
              </div>
            </div>

            <div class="form-group" style="margin-bottom:16px">
              <label style="font-size:11px;color:var(--accent2)">?? Hero Image URL (Paste here after generating)</label>
              <input type="url" id="hero-url-${i}" placeholder="https://... (URL from your image host)" oninput="updateHeroUrl(${i}, this.value)">
            </div>

            <div class="output-label">?? Subject Line <button class="copy-btn" onclick="copyText('subj-${i}')">Copy</button></div>
            <div class="output-box" id="subj-${i}">${escHtml(v.subject || '')}</div>
          </div>
          <div class="output-section">
            <div class="output-label">?? Preheader Text <button class="copy-btn" onclick="copyText('pre-${i}')">Copy</button></div>
            <div class="output-box" id="pre-${i}">${escHtml(v.preheader || '')}</div>
          </div>
          <div class="output-section">
            <div class="output-label">??? Email Preview</div>
            <iframe class="preview-frame" id="frame-${i}" sandbox="allow-same-origin"></iframe>
          </div>
          <div class="output-section">
            <div class="output-label">?? Raw HTML Code <button class="copy-btn" onclick="copyText('code-${i}')">Copy</button></div>
            <div class="output-box" id="code-${i}" style="max-height:400px">${escHtml(emailHtml)}</div>
          </div>`;
        container.appendChild(panel);

        setTimeout(() => {
          const frame = document.getElementById('frame-' + i);
          if(frame){
            const doc = frame.contentDocument || frame.contentWindow.document;
            doc.open(); doc.write(emailHtml); doc.close();
          }
        }, 50);
      });

      document.getElementById('composerTabBtn').style.display = 'none';
    }

    configureOutputTabs({ tab0: 'Variation A', tab1: 'Variation B', tab2: 'Variation C', showTab1: true, showTab2: true, showComposer: false });
    setOutputVisible();
    openOutputTab(0);
    toast(`Imported ${data.variations?.length || 0} email variations with hero prompts!`);
  } catch(e) {
    console.error('Import error:', e);
    toast('Error parsing JSON: ' + e.message + '. Make sure you pasted only the JSON.');
  }
}

// Handle "instructor" block type in dynamic renderer
function renderInstructorBlock(block, s){
  const headshotHtml = block.headshotUrl 
    ? `<img src="${block.headshotUrl}" width="120" height="120" style="width:120px;height:120px;border-radius:50%;display:block;object-fit:cover;border:3px solid #e0e0e0" alt="${block.name}">`
    : `<div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:36px;font-weight:800">${(block.name||'?').split(' ').map(w=>w[0]).join('').substring(0,2)}</div>`;
  
  return `<tr><td class="section-inner" style="padding:20px 32px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;overflow:hidden">
      <tr>
        <td style="padding:20px;width:140px;vertical-align:top;text-align:center">
          ${headshotHtml}
        </td>
        <td style="padding:20px 20px 20px 0;vertical-align:top">
          <p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#333">${block.name || 'Instructor'}</p>
          ${block.title ? `<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.5px">${block.title}</p>` : ''}
          <p style="margin:0;font-size:14px;line-height:1.5;color:#444">${block.bio || ''}</p>
        </td>
      </tr>
    </table>
  </td></tr>`;
}

// ===================== EMAIL GENERATION =====================
function generateAll(){
  const s=getSettings();
  _genSettings = s;

  if(currentMode === 'single') {
    if(singleClassImported && singleClassData){
      configureOutputTabs({ tab0: 'Variation A', tab1: 'Variation B', tab2: 'Variation C', showTab1: true, showTab2: true, showComposer: false });
      setOutputVisible();
      openOutputTab(0);
      toast('Showing imported AI variations!');
      return;
    }

    const raw = gv('singleRawInput');
    if(raw) {
      toast('Click "Generate AI Prompt" first, then paste the AI response and import it.');
      return;
    }
    toast('Paste class details and use the AI prompt workflow to generate emails.');
    return;

  } else if (currentMode === 'campaign') {
    if(campaignPlanImported && campaignPlanData){
      renderCampaignPlanOutput();
      toast('Showing imported campaign plan.');
      return;
    }
    toast('Generate the campaign planner prompt first, then import the JSON response.');
    return;

  } else if (currentMode === 'tuesday' && tuesdayBlocksImported && tuesdayBlocks.length > 0) {
    const hColor = gv('tuesdayHeaderCol') || '#02aae1';
    const hTitle = gv('tuesdayHeaderTitle') || 'Upcoming Affiliate Opportunities';
    const preText = gv('tuesdayIntro') || '';

    const emailHtml = generateDynamicEmailHTML(tuesdayBlocks, s, hColor, hTitle, preText, tuesdayDesign);
    const container = document.getElementById('tabContent');
    container.innerHTML = '';

    const panel = document.createElement('div');
    panel.className = 'tab-panel active';
    panel.id = 'panel-0';
    panel.innerHTML = `
      <div class="output-section">
        <div class="output-label">Subject Line <button class="copy-btn" onclick="copyText('subj-0')">Copy</button></div>
        <div class="output-box" id="subj-0">${escHtml(tuesdaySubject)}</div>
      </div>
      <div class="output-section">
        <div class="output-label">Preheader Text <button class="copy-btn" onclick="copyText('pre-0')">Copy</button></div>
        <div class="output-box" id="pre-0">${escHtml(tuesdayPreheaderText)}</div>
      </div>
      <div class="output-section">
        <div class="output-label">Email Preview</div>
        <iframe class="preview-frame" id="frame-0" sandbox="allow-same-origin"></iframe>
      </div>
      <div class="output-section">
        <div class="output-label">Raw HTML Code <button class="copy-btn" onclick="copyText('code-0')">Copy</button></div>
        <div class="output-box" id="code-0" style="max-height:400px">${escHtml(emailHtml)}</div>
      </div>`;
    container.appendChild(panel);

    setTimeout(() => {
      const frame = document.getElementById('frame-0');
      const doc = frame.contentDocument || frame.contentWindow.document;
      doc.open(); doc.write(emailHtml); doc.close();
    }, 50);

    configureOutputTabs({ tab0: 'Final Email', showTab1: false, showTab2: false, showComposer: false });

  } else if (currentMode === 'friday' || currentMode === 'tuesday') {
    const isTuesday = currentMode === 'tuesday';
    const activeSections = isTuesday ? tuesdaySections : fridaySections;
    const activeIntro = isTuesday ? gv('tuesdayIntro') : gv('fridayIntro');

    if(activeSections.length === 0){toast('Add at least one section');return;}

    _genData = { sections: [...activeSections], intro: activeIntro };
    _genVariations = buildLegacyToneVariations(s, isTuesday ? tuesdayDesign : fridayDesign);

    const container=document.getElementById('tabContent');
    container.innerHTML='';

    _genVariations.forEach((v, i) => {
      const emailHtml = generateMultiSectionHTML(_genData, v, s, isTuesday, false, (isTuesday ? tuesdayDesign : fridayDesign));
      renderVariationTab(i, v, (isTuesday ? 'Tuesday Update' : 'Friday Update'), emailHtml, 'Prompt not applicable for multi-section', container);
    });

    configureOutputTabs({ tab0: 'Variation A', tab1: 'Variation B', tab2: 'Variation C', showTab1: true, showTab2: true, showComposer: true, composerLabel: 'THE COMPOSER' });
    renderComposer(isTuesday);
  } else {
    toast('Use the generate prompt button above in Flyer Creator.');
    return;
  }

  setOutputVisible();
  openOutputTab(0);
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
function renderComposer(isTuesday = false){
  const container = document.getElementById('composerSections');
  composerPicks = {};
  _genData.sections.forEach(s => composerPicks[s.id] = 0); // Default to Variation A
  
  container.innerHTML = _genData.sections.map(s => `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-weight:600;font-size:14px">${truncate(s.title, 40)}</span>
      <div class="tabs" style="margin-bottom:0;padding:2px">
        <button class="tab active" onclick="pickVar(${s.id},0,this,${isTuesday})">A</button>
        <button class="tab" onclick="pickVar(${s.id},1,this,${isTuesday})">B</button>
        <button class="tab" onclick="pickVar(${s.id},2,this,${isTuesday})">C</button>
      </div>
    </div>
  `).join('');
  updateComposerPreview(isTuesday);
}

function pickVar(secId, varIdx, btn, isTuesday){
  composerPicks[secId] = varIdx;
  btn.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  updateComposerPreview(isTuesday);
}

function updateComposerPreview(isTuesday = false){
  const emailHtml = generateMultiSectionHTML(_genData, null, _genSettings, isTuesday, true, (isTuesday ? tuesdayDesign : fridayDesign));
  const frame=document.getElementById('composerFrame');
  const doc=frame.contentDocument||frame.contentWindow.document;
  doc.open();doc.write(emailHtml);doc.close();
  document.getElementById('composerCode').textContent = emailHtml;
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

function updateHeroUrl(idx, url){
  if(!singleClassData || !singleClassData.variations) return;
  singleClassData.variations[idx].heroImageUrl = url;
  
  const v = singleClassData.variations[idx];
  const s = getSettings();
  const processedBlocks = v.blocks || [];
  
  const emailHtml = generateDynamicEmailHTML(
    processedBlocks, s, 
    v.accentColor || s.c1a, 
    singleClassData.parsed?.title || 'Class Announcement',
    `Hi ${s.mergeTag} — ${v.preheader || ''}`,
    v
  );

  document.getElementById('code-' + idx).textContent = emailHtml;
  const frame = document.getElementById('frame-' + idx);
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open(); doc.write(emailHtml); doc.close();
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

function mdToHtml(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[color:(#[0-9a-fA-F]{6})\](.*?)\[\/color\]/g, '<span style="color:$1">$2</span>')
    .replace(/^\* (.*?)$/gm, '&bull; $1')
    .split('\n').join('<br>');
}

// ===================== BODY COPY =====================
function generateBodyCopy(data,v,s){
  const tag=s.mergeTag;
  const bullets=parseBullets(data.description);
  const objectives=bullets.filter(b=>b.length<200);
  const introParts=bullets.filter(b=>b.length>=200);
  const introText=introParts.length?mdToHtml(introParts[0]):'';

  if(v.tone==='professional'){
    let body=`<p style="margin:0 0 16px">Hi ${tag},</p>`;
    body+=`<p style="margin:0 0 16px">${s.orgName} is pleased to present an important educational opportunity:</p>`;
    if(introText)body+=`<p style="margin:0 0 16px;color:#555555;font-size:14px">${introText}</p>`;
    body+=generateDetailsBlock(data,v);
    if(objectives.length>1) body+=generateLearnBlock(objectives,'What You Will Learn:',v);
    body+=`<p style="margin:16px 0">Don't miss this opportunity to enhance your professional knowledge and stay ahead of the curve. Secure your spot today — space is limited.</p>`;
    return body;
  }
  if(v.tone==='energetic'){
    let body=`<p style="margin:0 0 16px">Hi ${tag},</p>`;
    body+=`<p style="margin:0 0 16px">Are you ready to <strong>power up</strong> your real estate expertise? ${s.orgName} is bringing you a can't-miss class that will transform how you approach your business!</p>`;
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
  if(introText)body+=`<p style="margin:0 0 16px;color:#555555;font-size:14px">${introText}</p>`;
  body+=generateDetailsBlock(data,v);
  if(objectives.length>1) body+=generateLearnBlock(objectives,'Why You NEED to Be There:',v);
  body+=`<p style="margin:16px 0">Learn from the best! <strong>${data.instructor||'Our expert instructor'}</strong> will break down complex topics into actionable knowledge, making sure you leave confident and prepared.</p>`;
  body+=`<p style="margin:8px 0;font-weight:bold;color:${v.colorA}">Spots are filling up FAST! Grab your seat now:</p>`;
  return body;
}

function truncate(s,n){if(!s) return ''; return s.length>n?s.substring(0,n)+'...':s}

function generateDetailsBlock(data,v){
  let html=`<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f9f9f9;border-radius:8px;border:1px solid #e0e0e0"><tr><td style="padding:20px">`;
  html+=`<p style="font-weight:800;font-size:16px;margin:0 0 16px;color:${v.colorA};text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e0e0e0;padding-bottom:10px">Event At-A-Glance</p>`;
  html+=`<table cellpadding="0" cellspacing="0" style="font-size:14px;width:100%">`;
  html+=`<tr><td style="font-weight:700;vertical-align:top;padding:8px 10px 12px 0;width:90px;color:${v.colorA}">WHAT:</td><td style="padding:8px 0 12px;color:#333;font-weight:600">${data.title}</td></tr>`;
  html+=`<tr><td style="font-weight:700;vertical-align:top;padding:8px 10px 12px 0;width:90px;color:${v.colorA}">WHEN:</td><td style="padding:8px 0 12px;color:#333">${data.dateTime}</td></tr>`;
  if(data.instructor)html+=`<tr><td style="font-weight:700;vertical-align:top;padding:8px 10px 12px 0;width:90px;color:${v.colorA}">WHO:</td><td style="padding:8px 0 12px;color:#333">${data.instructor}</td></tr>`;
  if(data.cost)html+=`<tr><td style="font-weight:700;vertical-align:top;padding:8px 10px 12px 0;width:90px;color:${v.colorA}">COST:</td><td style="padding:8px 0 12px;color:#333">${data.cost}</td></tr>`;
  if(data.credits)html+=`<tr><td style="font-weight:700;vertical-align:top;padding:8px 10px 12px 0;width:90px;color:${v.colorA}">CREDITS:</td><td style="padding:8px 0 12px;color:#333">${data.credits}</td></tr>`;
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

// ===================== MULTI-SECTION HTML (FRIDAY & TUESDAY) =====================
function generateMultiSectionHTML(data, v, s, isTuesday = false, isComposer = false, design = null){
  const org = ORGS[currentOrgId];
  const hColorStr = isTuesday ? (gv('tuesdayHeaderCol') || '#02aae1') : (gv('fridayHeaderCol') || '#004a32');
  const hTitle = isTuesday ? (gv('tuesdayHeaderTitle') || 'Upcoming Affiliate Opportunities') : (gv('fridayHeaderTitle') || 'Upcoming at BER');
  const preText = isTuesday ? (gv('tuesdayIntro') || '') : (gv('fridayIntro') || '');
  const d = normalizeCreativeDesign(design || (isTuesday ? tuesdayDesign : fridayDesign) || {}, isTuesday ? 1 : 0, hColorStr);
  const fontName = d.fontFamily || 'Montserrat';
  const hGrad = d.headerGradient || [hColorStr, hColorStr];
  const btnGrad = d.buttonGradient || [hGrad[0], hGrad[1]];
  const headerEyebrow = firstNonEmpty(d.headerEyebrow);
  const surfaceColor = firstNonEmpty(d.surfaceColor, '#ffffff');
  const showHeaderLogo = d.logoPlacement !== 'none';

  const sectionsHtml = data.sections.map((sec, idx) => {
    let activeV = v;
    let vIdx = sec.variationIndex || 0;
    
    if(isComposer) {
      const pickIdx = composerPicks[sec.id];
      activeV = _genVariations[pickIdx];
    } else if (v === null) {
      activeV = _genVariations[vIdx];
    }
    
    const themeColor = sec.customColor || activeV.colorA;
    const sectionSupport = (d.supportingColors || [])[idx % Math.max((d.supportingColors || []).length, 1)] || btnGrad[1];
    const currentV = sec.variations[vIdx] || { description: '', heroUrl: '' };
    const descHtml = mdToHtml(currentV.description);
    const heroUrl = currentV.heroUrl || '';
    
    let extraBtnsHtml = '';
    if(sec.links && sec.links.length > 0) {
      sec.links.forEach(l => {
        if(l.url) {
          extraBtnsHtml += `
          <tr><td align="center" style="padding:4px 0">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${l.url}" style="height:36px;v-text-anchor:middle;width:180px;" arcsize="50%" stroke="f" fill="t">
              <v:fill type="gradient" color="${btnGrad[0]}" color2="${btnGrad[1]}" />
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">${l.label||'Learn More'}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto">
              <tr><td align="center" style="background:${btnGrad[0]};background:linear-gradient(135deg, ${btnGrad[0]} 0%, ${btnGrad[1]} 100%);border-radius:50px;padding:8px 30px">
                <a href="${l.url}" target="_blank" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;display:block">${l.label||'Learn More'}</a>
              </td></tr>
            </table>
            <!--<![endif]-->
          </td></tr>`;
        }
      });
    }

    const marginBottom = idx === data.sections.length - 1 ? '10px' : '35px';
    
    return `
    <!-- Section: ${sec.title} -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${surfaceColor};margin-bottom:${marginBottom};table-layout:fixed;border:1px solid rgba(15,23,42,0.06);border-radius:14px;overflow:hidden;">
      ${heroUrl ? `<tr><td style="padding:0">
        <img src="${heroUrl}" width="100%" style="width:100%;max-width:${s.emailMaxW}px;height:auto;display:block" alt="${sec.title}">
      </td></tr>` : ''}
      <tr><td class="section-inner" style="padding:18px 32px 4px">
        <p style="margin:0 0 12px;color:${themeColor};font-size:22px;font-weight:800;line-height:1.2;text-transform:uppercase;letter-spacing:.5px">
          ${sec.title}
        </p>
        <div style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333333">
          ${descHtml}
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:${surfaceColor};border-left:4px solid ${themeColor};border-top:1px solid ${sectionSupport};border-right:1px solid rgba(15,23,42,0.06);border-bottom:1px solid rgba(15,23,42,0.06);border-radius:0 10px 10px 0">
          <tr><td style="padding:12px 16px">
            <p style="margin:0;font-size:14px;color:#444444">📅 <strong>${sec.dateTime}</strong></p>
            ${sec.location ? `<p style="margin:4px 0 0;font-size:14px;color:#444444">📍 ${sec.location}</p>` : ''}
            ${sec.credits ? `<p style="margin:4px 0 0;font-size:14px;color:#666666">🏷️ ${sec.credits}</p>` : ''}
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding:8px 0 12px">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${sec.regLink||'#'}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="50%" stroke="f" fill="t">
              <v:fill type="gradient" color="${btnGrad[0]}" color2="${btnGrad[1]}" />
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Register Here</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto">
              <tr><td align="center" style="background:${btnGrad[0]};background:linear-gradient(135deg, ${btnGrad[0]} 0%, ${btnGrad[1]} 100%);border-radius:50px;padding:14px 40px">
                <a href="${sec.regLink||'#'}" target="_blank" style="color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;display:block">Register Here</a>
              </td></tr>
            </table>
            <!--<![endif]-->
          </td></tr>
          ${extraBtnsHtml}
        </table>
      </td></tr>
    </table>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g,'+')}:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  body { font-family: '${fontName}', 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  @media only screen and (max-width: 600px) {
    .content-table { width: 100% !important; }
    .header-cell { padding: 22px 15px !important; }
    .section-container { padding: 20px 15px 0 !important; }
    .section-inner { padding: 0 15px !important; }
    .intro-box { width: 95% !important; }
    .header-text { font-size: 26px !important; }
  }
</style>
<!--[if mso]>
<style type="text/css">
  body, table, td, p, a { font-family: Helvetica, Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f7f9;font-family:'${fontName}', Helvetica, Arial, sans-serif">
<span style="display:none!important;font-size:1px;color:#f4f7f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preText}</span>
<table width="100%" cellpadding="0" cellspacing="0" border="0" class="content-table" style="width:100%;max-width:${s.emailMaxW}px;background-color:#ffffff;margin:0 auto;table-layout:fixed;border-radius:16px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,0.08)">
  ${showHeaderLogo ? `<tr><td align="center" style="padding:20px 0;background-color:#ffffff">
    <img src="${org.logo}" height="50" style="height:50px;width:auto;display:block" alt="${org.name}">
  </td></tr>` : ''}
  <tr><td align="center" style="background:${hGrad[0]};background:linear-gradient(135deg, ${hGrad[0]} 0%, ${hGrad[1]} 100%);padding:40px 0;color:#ffffff">
    <!--[if mso]>
    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:${s.emailMaxW}px;height:120px;">
    <v:fill type="gradient" color="${hGrad[0]}" color2="${hGrad[1]}" angle="135" />
    <v:textbox inset="0,0,0,0">
    <![endif]-->
    <div style="padding:0 24px">
      ${headerEyebrow ? `<p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:0.9">${headerEyebrow}</p>` : ''}
      <p class="header-text" style="margin:0;font-size:32px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;text-shadow:0 2px 10px rgba(0,0,0,0.2)">${hTitle}</p>
      ${preText ? `
      <div class="intro-box" style="margin:15px auto 0;width:90%;max-width:600px;border-top:1px solid rgba(255,255,255,0.3);padding-top:15px;font-size:15px;opacity:0.95;line-height:1.5;font-weight:500">
        ${preText}
      </div>` : ''}
    </div>
    <!--[if mso]>
    </v:textbox></v:rect>
    <![endif]-->
  </td></tr>
  <tr><td class="section-container" style="padding:24px 0 0">
    <div style="width:100%;max-width:${s.emailMaxW}px;margin:0 auto">
      ${sectionsHtml}
    </div>
  </td></tr>
  <tr><td style="padding:40px 24px 30px;background-color:#ffffff;text-align:center;font-size:12px;color:#999999;border-top:1px solid #eeeeee">
    <p style="margin:0">© ${new Date().getFullYear()} ${s.orgName}</p>
    <p style="margin:5px 0 0">${s.orgAddr}</p>
  </td></tr>
</table>
</body></html>`.trim();
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
  
  const angles = [
    "Professional, clean, and corporate. Highlighting facts and reliability.",
    "Energetic, vibrant, and high-hype. Focused on community and networking.",
    "Benefit-led, career-growth, and professional advancement focused."
  ];
  
  const currentV = sec.variations[vIdx];
  const marketingContext = angles[vIdx];
  
  // Use generateHeroPrompt logic but with current variation's copy
  const prompt = generateHeroPrompt({
    title: sec.title,
    dateTime: sec.dateTime,
    credits: sec.credits,
    instructor: sec.instructor,
    description: currentV.description
  }, activeV, s) + "\n\nMARKETING ANGLE: " + marketingContext;

  // Show in Preview
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
  initCampaignPlannerDefaults();
  updateGenerateButtonLabel();
});
