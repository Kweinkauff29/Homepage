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
let currentMode = 'single'; // 'single', 'friday', 'tuesday', 'flyer'
let fridaySections = []; // array of {id, title, ...}
let tuesdaySections = []; // array of sections for tuesday affiliate blast
let composerPicks = {}; // sectionId -> variationIndex (0,1,2)

let _genData = null;
let _genVariations = [];
let _genPreheaders = [];
let _genSettings = null;

function setMode(mode){
  currentMode = mode;
  document.getElementById('modeSingle').classList.toggle('active', mode==='single');
  document.getElementById('modeFriday').classList.toggle('active', mode==='friday');
  document.getElementById('modeTuesday').classList.toggle('active', mode==='tuesday');
  document.getElementById('modeFlyer').classList.toggle('active', mode==='flyer');
  
  document.getElementById('singleModeFields').style.display = mode==='single' ? 'block' : 'none';
  document.getElementById('fridayModeFields').style.display = mode==='friday' ? 'block' : 'none';
  document.getElementById('tuesdayModeFields').style.display = mode==='tuesday' ? 'block' : 'none';
  document.getElementById('flyerModeFields').style.display = mode==='flyer' ? 'block' : 'none';
  
  if(mode==='friday' && fridaySections.length===0) addFridaySection();
  if(mode==='tuesday' && tuesdaySections.length===0) addTuesdaySection();
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
  const defaultVars = [
    {tone:'professional', colorA:'#008080', colorB:'#02aae1'},
    {tone:'energetic', colorA:'#1a237e', colorB:'#c5a44e'},
    {tone:'urgency', colorA:'#c62828', colorB:'#f57c00'}
  ];
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
function generateDynamicEmailHTML(blocks, settings, headerColor, headerTitle, preText){
  const s = settings || getSettings();
  const hColor = headerColor || '#02aae1';
  const hTitle = headerTitle || 'Upcoming Affiliate Opportunities';

  const blocksHtml = blocks.map(block => {
    switch(block.type){
      case 'hero': return renderHeroBlock(block, s);
      case 'text': return renderTextBlock(block, s);
      case 'imageRow': return renderImageRowBlock(block, s);
      case 'cta': return renderCtaBlock(block, s);
      case 'infoCard': return renderInfoCardBlock(block, s);
      case 'specs': return renderSpecsBlock(block, s);
      case 'bulletList': return renderBulletListBlock(block, s);
      case 'divider': return renderDividerBlock(block, s);
      default: return '';
    }
  }).join('\n');

  return `<style>
  @media only screen and (max-width: 600px) {
    .content-table { width: 100% !important; }
    .section-inner { padding: 0 15px !important; }
    .img-col { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 0 0 16px 0 !important; }
    .img-col img { width: 100% !important; max-width: 100% !important; }
    .info-col { display: block !important; width: 100% !important; padding: 16px !important; box-sizing: border-box !important; margin-bottom: 12px !important; }
    table[style*="table-layout:fixed"] { table-layout: auto !important; }
  }
</style>
<table width="100%" cellpadding="0" cellspacing="0" border="0" class="content-table" style="width:100%;max-width:${s.emailMaxW}px;background-color:#ffffff;margin:0 auto;table-layout:fixed">
  <tr><td align="center" style="background-color:${hColor};padding:22px 0;color:#ffffff">
    <div style="padding:0 24px">
      <p style="margin:0;font-size:24px;font-weight:800;text-transform:uppercase;letter-spacing:1px">${hTitle}</p>
      ${preText ? `<div style="margin:10px auto 0;width:90%;max-width:600px;border-top:1px solid rgba(255,255,255,0.4);padding-top:10px;font-size:14px;opacity:0.9;line-height:1.4">${preText}</div>` : ''}
    </div>
  </td></tr>
  <tr><td style="padding:0">
    ${blocksHtml}
  </td></tr>
  <tr><td style="padding:0 24px 10px;background-color:#ffffff;text-align:center;font-size:12px;color:#999999">
  </td></tr>
</table>`.trim();
}

function renderHeroBlock(block, s){
  const w = block.width || s.emailMaxW || 730;
  const h = block.height || 315;
  if(block.imageUrl){
    const imgTag = `<img src="${block.imageUrl}" width="${w}" style="width:100%;max-width:${w}px;height:auto;display:block" alt="${block.overlayText||'Hero Image'}">`;
    const linked = block.link ? `<a href="${block.link}" target="_blank" style="display:block">${imgTag}</a>` : imgTag;
    return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0">${linked}</td></tr></table>`;
  }
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#02aae1,#004a8f);text-align:center;padding:40px 24px;color:#ffffff">
    <p style="font-size:24px;font-weight:800;margin:0">${block.overlayText||'[Hero Image Placeholder]'}</p>
    <p style="font-size:12px;margin:8px 0 0;opacity:.7">${w}×${h} — Paste generated image URL above</p>
  </td></tr></table>`;
}

function renderTextBlock(block, s){
  let html = '<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:16px 32px">';
  if(block.heading) html += `<p style="margin:0 0 10px;font-size:20px;font-weight:800;color:#333333">${block.heading}</p>`;
  if(block.body) html += `<div style="font-size:15px;line-height:1.6;color:#333333">${mdToHtml(block.body)}</div>`;
  html += '</td></tr></table>';
  return html;
}

function renderImageRowBlock(block, s){
  const images = block.images || [];
  if(images.length === 0) return '';
  const maxW = s.emailMaxW || 730;
  // Calculate exact inner available space: 730 container - 56 (28px left/right padding)
  const innerSpace = maxW - 56;
  // Calculate exact pixel width for each image, subtracting 8px (4px padding on each side of the img-col cell)
  const colW = Math.floor(innerSpace / images.length) - 8;
  const cols = images.map(img => {
    const imgTag = img.url
      ? `<img src="${img.url}" width="${colW}" style="width:100%;max-width:${colW}px;height:auto;display:block;border-radius:4px" alt="${img.altText||''}">`
      : `<div style="background:#f0f0f0;width:100%;height:${img.height||200}px;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:11px;color:#999">${colW}×${img.height||200}</div>`;
    const linked = img.link ? `<a href="${img.link}" target="_blank" style="display:block;text-decoration:none">${imgTag}</a>` : imgTag;
    return `<td class="img-col" width="${Math.floor(100/images.length)}%" style="padding:4px;vertical-align:top">${linked}${img.caption ? `<p style="font-size:11px;color:#666;margin:4px 0 0;text-align:center">${img.caption}</p>` : ''}</td>`;
  }).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:12px 28px"><table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed"><tr>${cols}</tr></table></td></tr></table>`;
}

function renderCtaBlock(block, s){
  const color = block.color || '#02aae1';
  const filled = block.style !== 'outlined';
  const bg = filled ? `background-color:${color}` : 'background:transparent';
  const border = filled ? 'border:none' : `border:2px solid ${color}`;
  const textColor = filled ? '#ffffff' : color;
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:12px 32px">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td align="center" style="${bg};${border};border-radius:50px;padding:14px 40px">
      <a href="${block.url||'#'}" target="_blank" style="color:${textColor};text-decoration:none;font-weight:800;font-size:16px;display:block">${block.label||'Learn More'}</a>
    </td></tr></table>
  </td></tr></table>`;
}

function renderInfoCardBlock(block, s){
  const columns = block.columns || [];
  if(columns.length === 0) return '';
  const bgColors = ['#f0f9f4', '#f0f4f9', '#f9f4f0', '#f4f0f9'];
  const cols = columns.map((col, i) =>
    `<td class="info-col" width="${Math.floor(100/columns.length)}%" style="padding:16px;vertical-align:top;background-color:${bgColors[i%bgColors.length]};border-radius:4px">
      ${col.heading ? `<p style="font-weight:800;font-size:16px;margin:0 0 8px;color:#333">${col.heading}</p>` : ''}
      <div style="font-size:14px;line-height:1.5;color:#444">${mdToHtml(col.body||'')}</div>
    </td>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:12px 28px"><table width="100%" cellpadding="0" cellspacing="8"><tr>${cols}</tr></table></td></tr></table>`;
}

function renderSpecsBlock(block, s){
  const color = block.color || '#02aae1';
  let rows = (block.items||[]).map(item =>
    `<tr><td style="font-weight:700;padding:6px 12px;color:${color};font-size:14px;vertical-align:top;white-space:nowrap">${item.label}</td><td style="padding:6px 12px;font-size:14px;color:#333">${item.value}</td></tr>`
  ).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:12px 32px">
    ${block.heading ? `<p style="font-weight:800;font-size:18px;margin:0 0 10px;color:#333">${block.heading}</p>` : ''}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${color};background:#f9f9f9;border-radius:0 4px 4px 0">${rows}</table>
  </td></tr></table>`;
}

function renderBulletListBlock(block, s){
  const items = block.items || [];
  const numbered = block.listStyle === 'numbered';
  const tag = numbered ? 'ol' : 'ul';
  const listHtml = items.map(item => `<li style="margin-bottom:6px;font-size:14px;color:#333">${mdToHtml(item)}</li>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:8px 32px">
    ${block.heading ? `<p style="font-weight:700;font-size:16px;margin:0 0 8px;color:#333">${block.heading}</p>` : ''}
    <${tag} style="padding-left:20px;margin:0">${listHtml}</${tag}>
  </td></tr></table>`;
}

function renderDividerBlock(block, s){
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:16px 32px"><hr style="border:none;border-top:2px solid ${block.color||'#e0e0e0'};margin:0"></td></tr></table>`;
}

// ===================== AI INTEGRATION =====================
function generateAIPrompt(){
  const raw = gv('aiRawInput');
  if(!raw){toast('Paste some raw event details first!');return;}
  const prompt = `I am using an Email Blast Generator for a REALTOR association. Please parse the following raw input and return a JSON array of event objects. 
 
 For EACH event, you must provide THREE distinct marketing descriptions based on these angles:
 Angle A (Professional/Informational): Direct, factual, authoritative, and clean.
 Angle B (Energetic/FOMO): High excitement, community-focused, emphasizes networking and "don't miss out."
 Angle C (Benefit-Led/Career Growth): Focuses specifically on the realtor's professional advancement, ROI, and credits.
 
 Each object MUST have exactly these fields: "title", "dateTime", "location", "instructor", "cost", "credits", "regLink", "copyA", "copyB", "copyC". 
 
 PARSING RULES:
 1. "title": Catchy, short event name.
 2. "dateTime": Full date and time string.
 3. "regLink": The registration URL found in the text.
 4. "copyA", "copyB", "copyC": Detailed "sales copy" following the angles above. Each should be 1-2 punchy paragraphs, then 3-5 bold bullet points.
 
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
    toast(`Imported ${data.length} sections with 3 marketing angles each!`);
  } catch(e) {
    toast('Error parsing JSON. Make sure you copy/pasted only the JSON array.');
  }
}

function generateAIPromptTuesday(){
  const raw = gv('aiRawInputTuesday');
  if(!raw){toast('Paste some raw details first!');return;}
  const s = getSettings();
  const maxW = s.emailMaxW || 730;
  const prompt = `You are an expert email marketing designer for a REALTOR association called "${s.orgName}". I need you to design a COMPLETE, DYNAMIC email layout for our Tuesday Affiliate Blast targeting our affiliates and sponsors.

IMPORTANT: If I provide any URLs or links below, please visit/review them thoroughly and extract ALL relevant information (event details, pricing, dates, images, descriptions, sponsorship tiers, etc.) to use in the email content. Do NOT leave placeholders — fill in EVERY detail from the source material.

YOUR TASK: Design a rich, dynamic email layout using content blocks. Think like a professional email designer — use multi-image rows, side-by-side info cards, spec tables, bold CTAs, etc. Do NOT just stack identical sections. Make it visually interesting and varied.

RETURN A SINGLE JSON OBJECT (not an array) with this exact structure:
{
  "subject": "Catchy email subject line",
  "preheader": "Preview text for email clients (max 200 chars)",
  "blocks": [
    // Array of content blocks — each block is one of the types below
  ]
}

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

function importAIResponseTuesday(){
  try {
    let rawText = gv('aiResponseTuesday').trim();
    // Strip markdown code blocks if present
    if(rawText.startsWith('```')) rawText = rawText.replace(/^```[a-z]*\n?/,'').replace(/\n?```$/,'').trim();
    
    // Attempt basic fix for trailing commas before parsing
    rawText = rawText.replace(/,\s*([\]}])/g, '$1');
    
    const data = JSON.parse(rawText);

    if(data.blocks && Array.isArray(data.blocks)){
      tuesdayBlocks = data.blocks;
      tuesdaySubject = data.subject || '';
      tuesdayPreheaderText = data.preheader || '';
      tuesdayBlocksImported = true;
      renderTuesdayBlockEditor();
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
function generateFlyerPrompt() {
  const link = gv('flyerLink');
  const details = gv('flyerText');
  const hasInstructor = document.getElementById('flyerInstructor').classList.contains('on');

  if(!details && !link) {
    toast('Please enter some flyer details first.');
    return;
  }

  const prompt = `Create a strict image generation prompt for a flyer.
ASPECT RATIO: 8.5 x 11 inches (portrait).
STYLE: Modern corporate, clear and professional. Must feature "Swiss-tech" design elements (e.g., wavy lines, corner plus signs (+), neat geometric accents, grids). No generic borders. 

RULES:
1. Do NOT generate any actual company logos. Leave a blank placeholder space for the organizational logo.
2. Do NOT generate any photographic people or fake faces.
${hasInstructor ? '3. Leave a distinct rectangular or circular placeholder frame intended for an instructor photo.' : ''}

CONTENT TO INTEGRATE ONSCREEN:
Link / Focus: ${link}
Details: ${details}

Ensure the design cleanly incorporates a title, main body area, and clear readable typography slots. 
Return only the generated image prompt, nothing else.`;

  navigator.clipboard.writeText(prompt);
  document.getElementById('flyerCodeBox').style.display = 'block';
  sv('flyerGeneratedCode', prompt);
  toast('Prompt copied to clipboard! Paste it into your AI image generator.');
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
    
    } else if (currentMode === 'tuesday' && tuesdayBlocksImported && tuesdayBlocks.length > 0) {
    // TUESDAY BLOCK-BASED MODE
    const hColor = gv('tuesdayHeaderCol') || '#02aae1';
    const hTitle = gv('tuesdayHeaderTitle') || 'Upcoming Affiliate Opportunities';
    const preText = gv('tuesdayIntro') || '';
    
    const emailHtml = generateDynamicEmailHTML(tuesdayBlocks, s, hColor, hTitle, preText);
    
    const container = document.getElementById('tabContent');
    container.innerHTML = '';
    
    // Single output — no A/B/C variations for dynamic block mode
    const panel = document.createElement('div');
    panel.className = 'tab-panel active';
    panel.id = 'panel-0';
    panel.innerHTML = `
      <div class="output-section">
        <div class="output-label">📝 Subject Line <button class="copy-btn" onclick="copyText('subj-0')">Copy</button></div>
        <div class="output-box" id="subj-0">${escHtml(tuesdaySubject)}</div>
      </div>
      <div class="output-section">
        <div class="output-label">📝 Preheader Text <button class="copy-btn" onclick="copyText('pre-0')">Copy</button></div>
        <div class="output-box" id="pre-0">${escHtml(tuesdayPreheaderText)}</div>
      </div>
      <div class="output-section">
        <div class="output-label">👁️ Email Preview</div>
        <iframe class="preview-frame" id="frame-0" sandbox="allow-same-origin"></iframe>
      </div>
      <div class="output-section">
        <div class="output-label">📋 Raw HTML Code <button class="copy-btn" onclick="copyText('code-0')">Copy</button></div>
        <div class="output-box" id="code-0" style="max-height:400px">${escHtml(emailHtml)}</div>
      </div>`;
    container.appendChild(panel);
    
    setTimeout(() => {
      const frame = document.getElementById('frame-0');
      const doc = frame.contentDocument || frame.contentWindow.document;
      doc.open(); doc.write(emailHtml); doc.close();
    }, 50);
    
    // Hide A/B/C tabs and composer for block mode
    document.getElementById('composerTabBtn').style.display = 'none';

  } else if (currentMode === 'friday' || currentMode === 'tuesday') {
    // MULTI-SECTION MODES (Friday/Tuesday Legacy)
    const isTuesday = currentMode === 'tuesday';
    const activeSections = isTuesday ? tuesdaySections : fridaySections;
    const activeIntro = isTuesday ? gv('tuesdayIntro') : gv('fridayIntro');
    
    if(activeSections.length === 0){toast('Add at least one section');return;}
    
    _genData = { sections: [...activeSections], intro: activeIntro };
    _genVariations = [
      {name:'A — Professional',tone:'professional',colorA:s.c1a,colorB:s.c1b},
      {name:'B — Energetic',tone:'energetic',colorA:s.c2a,colorB:s.c2b},
      {name:'C — Urgency',tone:'urgency',colorA:s.c3a,colorB:s.c3b}
    ];
    
    const container=document.getElementById('tabContent');
    container.innerHTML='';
    
    _genVariations.forEach((v, i) => {
      const emailHtml = generateMultiSectionHTML(_genData, v, s, isTuesday);
      renderVariationTab(i, v, (isTuesday ? "Tuesday Update" : "Friday Update"), emailHtml, "Prompt not applicable for multi-section", container);
    });
    
    document.getElementById('composerTabBtn').style.display = 'block';
    renderComposer(isTuesday);
  } else {
    // Flyer mode doesn't generate emails here
    toast('Use the generate prompt button above in Flyer Creator.');
    return;
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

function updateComposerPreview(isTuesday){
  const html = generateMultiSectionHTML(_genData, null, _genSettings, isTuesday, true);
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

function mdToHtml(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
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
  html+=`<tr><td style="font-weight:700;vertical-align:top;padding:8px 24px 12px 0;white-space:nowrap;width:1%;color:${v.colorA}">WHAT:</td><td style="padding:8px 0 12px;color:#333;font-weight:600">${data.title}</td></tr>`;
  html+=`<tr><td style="font-weight:700;vertical-align:top;padding:8px 24px 12px 0;white-space:nowrap;width:1%;color:${v.colorA}">WHEN:</td><td style="padding:8px 0 12px;color:#333">${data.dateTime}</td></tr>`;
  if(data.instructor)html+=`<tr><td style="font-weight:700;vertical-align:top;padding:8px 24px 12px 0;white-space:nowrap;width:1%;color:${v.colorA}">WHO:</td><td style="padding:8px 0 12px;color:#333">${data.instructor}</td></tr>`;
  if(data.cost)html+=`<tr><td style="font-weight:700;vertical-align:top;padding:8px 24px 12px 0;white-space:nowrap;width:1%;color:${v.colorA}">COST:</td><td style="padding:8px 0 12px;color:#333">${data.cost}</td></tr>`;
  if(data.credits)html+=`<tr><td style="font-weight:700;vertical-align:top;padding:8px 24px 12px 0;white-space:nowrap;width:1%;color:${v.colorA}">CREDITS:</td><td style="padding:8px 0 12px;color:#333">${data.credits}</td></tr>`;
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
function generateMultiSectionHTML(data, v, s, isTuesday = false, isComposer = false){
  const hColor = isTuesday ? (gv('tuesdayHeaderCol') || '#02aae1') : (gv('fridayHeaderCol') || '#004a32');
  const hTitle = isTuesday ? (gv('tuesdayHeaderTitle') || 'Upcoming Affiliate Opportunities') : (gv('fridayHeaderTitle') || 'Upcoming at BER');
  const preText = isTuesday ? (gv('tuesdayIntro') || '') : (gv('fridayIntro') || '');

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
    const currentV = sec.variations[vIdx] || { description: '', heroUrl: '' };
    const descHtml = mdToHtml(currentV.description);
    const heroUrl = currentV.heroUrl || '';
    
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

    const marginBottom = idx === data.sections.length - 1 ? '10px' : '35px';
    
    return `
    <!-- Section: ${sec.title} -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;margin-bottom:${marginBottom};table-layout:fixed;">
      ${heroUrl ? `<tr><td style="padding:0">
        <img src="${heroUrl}" width="100%" style="width:100%;max-width:${s.emailMaxW}px;height:auto;display:block" alt="${sec.title}">
      </td></tr>` : ''}
      <tr><td class="section-inner" style="padding:16px 32px 0">
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

  return `
<style>
  @media only screen and (max-width: 600px) {
    .content-table { width: 100% !important; }
    .header-cell { padding: 22px 15px !important; }
    .section-container { padding: 20px 15px 0 !important; }
    .section-inner { padding: 0 15px !important; }
    .intro-box { width: 95% !important; }
  }
</style>
<table width="100%" cellpadding="0" cellspacing="0" border="0" class="content-table" style="width:100%;max-width:${s.emailMaxW}px;background-color:#ffffff;margin:0 auto;table-layout:fixed">
  <tr><td align="center" style="background-color:${hColor};padding:22px 0;color:#ffffff">
    <div style="padding:0 24px">
      <p style="margin:0;font-size:24px;font-weight:800;text-transform:uppercase;letter-spacing:1px">${hTitle}</p>
      ${preText ? `
      <div class="intro-box" style="margin:10px auto 0;width:90%;max-width:600px;border-top:1px solid rgba(255,255,255,0.4);padding-top:10px;font-size:14px;opacity:0.9;line-height:1.4">
        ${preText}
      </div>` : ''}
    </div>
  </td></tr>
  <tr><td class="section-container" style="padding:24px 0 0">
    <div style="width:100%;max-width:${s.emailMaxW}px;margin:0 auto">
      ${sectionsHtml}
    </div>
  </td></tr>
  <tr><td style="padding:0 24px 10px;background-color:#ffffff;text-align:center;font-size:12px;color:#999999">
  </td></tr>
</table>`.trim();
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
});
