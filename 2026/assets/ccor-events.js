(() => {
  'use strict';
  const API = 'https://www.ccreschool.com/api/public-events';
  const FALLBACK = 'https://gz-realestate-proxy.bonitaspringsrealtors.workers.dev/events/all?enriched=true';
  const PAGE = document.body.dataset.ccorEventsPage || 'all';
  const PAGE_LABELS = { education: 'Education', event: 'Events', committee: 'Committees', all: 'All events' };
  const PAGE_COPY = {
    education: 'Staff-featured classes appear first. When no classes are starred, the nearest in-person CE classes are selected automatically.',
    event: 'Staff-featured association events appear first, followed by the complete upcoming event calendar.',
    committee: 'Staff-featured committee meetings appear first, followed by the complete committee calendar.',
    all: 'Staff-featured opportunities appear first, followed by education, events and committee meetings in one calendar.'
  };
  const state = { events: [], featuredKeys: [], filtered: [], month: new Date(new Date().getFullYear(), new Date().getMonth(), 1), selectedDate: null, visible: 12, source: '' };
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = v => String(v || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const first = (o, keys, fallback='') => { for (const k of keys) if (o && o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; return fallback; };
  const date = v => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };
  const eventKey = e => String(first(e, ['key','EventDetailId','eventDetailId','EventId','eventId','Id','id'], `${first(e,['Name','name','title'])}|${first(e,['StartDate','startDate'])}`));
  function hasCe(e) { return /(?:\(|\b)(?:\d+(?:\.\d+)?\s*(?:hr\s*)?)?ce(?:\)|\b)|continuing education/i.test(`${e.name} ${e.description} ${e.categories}`); }
  function formatOf(e) { const s = `${e.name} ${e.description} ${e.location}`.toLowerCase(); if (/hybrid|in[- ]person\s*(?:and|&|\+)\s*(?:zoom|virtual|online)/.test(s)) return 'hybrid'; if (/\bzoom\b|webinar|virtual|online|remote/.test(s)) return 'online'; return 'in-person'; }
  function categoryOf(raw) {
    const name = text(first(raw,['name','title','Name','EventName']));
    const desc = text(first(raw,['description','Description','ShortDescription']));
    const categories = text(first(raw,['categories','Categories','CategoryName','CalendarName']));
    const source = `${name} ${desc} ${categories}`.toLowerCase();
    if (/committee|advisory council|board of directors|task force/.test(source)) return 'committee';
    if (first(raw,['isClass','IsClass'],false) || /education|class|course|webinar|seminar|training|matrix|rpr|cubi|core law|contract|gri|\bce\b|cips|hecm/.test(source)) return 'education';
    return 'event';
  }
  function normalize(raw) {
    const startDate = first(raw,['startDate','StartDate','StartDateLocal','EventStartDate']);
    const endDate = first(raw,['endDate','EndDate','EndDateLocal','EventEndDate']);
    const name = text(first(raw,['name','title','Name','EventName'],'CCOR class or event'));
    const description = text(first(raw,['description','Description','LongDescription','ShortDescription']));
    const location = text(first(raw,['location','Location','LocationName','AddressString']));
    const flyerUrl = first(raw,['flyerUrl','EnrichedFlyerUrl','EventLogoUrl','ImageUrl']);
    const publicUrl = first(raw,['publicUrl','url','PublicUrl','PublicRegisterUrl','RegistrationUrl'],'https://coconutcoastrealtors.org/all-upcoming-events/');
    const ev = { key:eventKey(raw), eventId:Number(first(raw,['eventId','EventId','Id'],0))||null, name, description, start:date(startDate), end:date(endDate), startDate, endDate, location, flyerUrl, publicUrl, categories:text(first(raw,['categories','Categories','CategoryName'],'')), category:raw.category || categoryOf(raw) };
    ev.ce = raw.ce === true || hasCe(ev); ev.format = raw.format || formatOf(ev); return ev;
  }
  function pageEvents(events) { return events.filter(e => PAGE === 'all' || e.category === PAGE); }
  function autoFeatured(events) {
    const sorted = [...events].sort((a,b)=>(a.start?.getTime()||9e15)-(b.start?.getTime()||9e15));
    if (PAGE !== 'education') return sorted.slice(0,3);
    const chosen = []; const take = list => list.forEach(e => { if (chosen.length < 3 && !chosen.some(x=>x.key===e.key)) chosen.push(e); });
    take(sorted.filter(e => e.ce && e.format === 'in-person'));
    take(sorted.filter(e => e.ce));
    take(sorted);
    return chosen;
  }
  function featured(events) {
    const manual = state.featuredKeys.map(k => events.find(e => e.key === String(k))).filter(Boolean).slice(0,3);
    if (manual.length) { const fill = autoFeatured(events).filter(e => !manual.some(m=>m.key===e.key)); return [...manual,...fill].slice(0,3); }
    return autoFeatured(events);
  }
  const dateLabel = d => d ? d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}) : 'Date TBD';
  const timeLabel = d => d ? d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) : 'Time TBD';
  function card(e, isFeatured=false) {
    const badges = [isFeatured?'<span class="ccor-badge star">Featured</span>':'', e.ce?'<span class="ccor-badge ce">CE</span>':'', `<span class="ccor-badge">${esc(e.format)}</span>`].join('');
    const media = e.flyerUrl ? `<img src="${esc(e.flyerUrl)}" alt="${esc(e.name)} flyer" loading="lazy">` : `<div class="fallback">${esc(PAGE_LABELS[e.category] || 'CCOR')}<br>UPCOMING</div>`;
    return `<article class="ccor-card ${isFeatured?'featured':''}" data-event-key="${esc(e.key)}"><div class="ccor-card-badges">${badges}</div><h3>${esc(e.name)}</h3><div class="ccor-card-media">${media}</div><ul class="ccor-meta"><li><span>Date</span><span>${esc(dateLabel(e.start))}</span></li><li><span>Time</span><span>${esc(timeLabel(e.start))}</span></li><li><span>Location</span><span>${esc(e.location || (e.format==='online'?'Online':'See details'))}</span></li></ul><div class="ccor-actions"><a class="ccor-button" href="${esc(e.publicUrl)}" target="_blank" rel="noopener">Details</a><a class="ccor-button primary" href="${esc(e.publicUrl)}" target="_blank" rel="noopener">Register</a></div></article>`;
  }
  function renderFeatured() { const list=featured(state.events); $('#featuredGrid').innerHTML=list.length?list.map(e=>card(e,true)).join(''):'<div class="ccor-empty">No featured items are available yet.</div>'; $('#featuredRule').textContent=state.featuredKeys.length?'Staff curated':'Automatic fallback'; }
  function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function filtersActive() { return Boolean($('#eventSearch').value || $('#formatFilter').value !== 'all' || $('#ceOnly').checked || $('#dateRange').value); }
  function calendarEvents() { return filtersActive() ? state.filtered : state.events; }
  function renderCalendar() {
    const month=state.month, firstDay=new Date(month.getFullYear(),month.getMonth(),1), start=new Date(firstDay); start.setDate(start.getDate()-start.getDay());
    $('#monthLabel').textContent=month.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    const events=calendarEvents(); let html='';
    for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const key=dateKey(d);const dayEvents=events.filter(e=>e.start&&dateKey(e.start)===key);const outside=d.getMonth()!==month.getMonth();const selected=state.selectedDate===key;html+=`<button class="ccor-day ${outside?'outside':''} ${dayEvents.length?'has-events':''} ${selected?'selected':''}" data-date="${key}" type="button"><span class="ccor-day-num">${d.getDate()}</span>${dayEvents.length?`<span class="ccor-day-count">${dayEvents.length}</span><span class="ccor-day-dots">${dayEvents.slice(0,6).map(()=>'<i></i>').join('')}</span>`:''}</button>`;}
    $('#calendarGrid').innerHTML=html; $('#calendarGrid').querySelectorAll('[data-date]').forEach(b=>b.addEventListener('click',()=>{state.selectedDate=b.dataset.date;renderCalendar();renderAgenda();})); renderAgenda();
  }
  function renderAgenda(){const key=state.selectedDate||dateKey(new Date());const d=new Date(`${key}T12:00:00`);const list=calendarEvents().filter(e=>e.start&&dateKey(e.start)===key);$('#agendaDate').textContent=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});$('#agendaList').innerHTML=list.length?list.map(e=>`<a class="ccor-agenda-item" href="${esc(e.publicUrl)}" target="_blank" rel="noopener"><strong>${esc(e.name)}</strong><span>${esc(timeLabel(e.start))} · ${esc(e.location||e.format)}</span></a>`).join(''):'<div class="ccor-empty">No items on this date. Select another highlighted day.</div>';}
  function applyFilters(){const q=$('#eventSearch').value.trim().toLowerCase(),range=$('#dateRange')._flatpickr?.selectedDates||[],format=$('#formatFilter').value,ceOnly=$('#ceOnly').checked;state.filtered=state.events.filter(e=>{const hay=`${e.name} ${e.description} ${e.location}`.toLowerCase();if(q&&!hay.includes(q))return false;if(format!=='all'&&e.format!==format)return false;if(ceOnly&&!e.ce)return false;if(range[0]){const start=new Date(range[0]);start.setHours(0,0,0,0);if(!e.start||e.start<start)return false;}if(range[1]){const end=new Date(range[1]);end.setHours(23,59,59,999);if(!e.start||e.start>end)return false;}return true;});state.visible=12;renderUpcoming();renderCalendar();}
  function renderUpcoming(){const list=filtersActive()?state.filtered:state.events;$('#upcomingGrid').innerHTML=list.length?list.slice(0,state.visible).map(e=>card(e,false)).join(''):'<div class="ccor-empty">No matching upcoming items.</div>';$('#loadMore').hidden=list.length<=state.visible;$('#resultCount').textContent=`${list.length} upcoming ${PAGE_LABELS[PAGE].toLowerCase()} loaded`;}
  async function load(){
    $('#statusText').textContent='Synchronizing current GrowthZone feed…'; let payload=null;
    try{const res=await fetch(`${API}?page=${encodeURIComponent(PAGE)}`,{headers:{Accept:'application/json'}});if(res.ok)payload=await res.json();}catch(e){console.warn('Curation API unavailable',e);}
    if(payload?.events?.length){state.events=payload.events.map(normalize);state.featuredKeys=(payload.featuredKeys||[]).map(String);state.source=payload.source||'Matrix curation API';}
    else{const res=await fetch(FALLBACK);if(!res.ok)throw new Error(`Event feed returned ${res.status}`);const raw=await res.json();state.events=pageEvents((raw.Results||raw.events||[]).map(normalize));state.source='GrowthZone fallback';}
    const cutoff=Date.now()-86400000;state.events=pageEvents(state.events).filter(e=>!e.start||e.start.getTime()>=cutoff).sort((a,b)=>(a.start?.getTime()||9e15)-(b.start?.getTime()||9e15));state.filtered=[...state.events];$('#statusText').textContent=`Live: ${state.events.length} upcoming items`;$('#sourceText').textContent=state.source;renderFeatured();renderUpcoming();renderCalendar();
  }
  function init(){
    $('#pageTitle').textContent=PAGE_LABELS[PAGE];$('#pageCopy').textContent=PAGE_COPY[PAGE];document.querySelectorAll('.ccor-nav a').forEach(a=>a.toggleAttribute('aria-current',a.dataset.page===PAGE));
    $('#prevMonth').addEventListener('click',()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1);state.selectedDate=null;renderCalendar();});$('#nextMonth').addEventListener('click',()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()+1,1);state.selectedDate=null;renderCalendar();});$('#eventSearch').addEventListener('input',applyFilters);$('#formatFilter').addEventListener('change',applyFilters);$('#ceOnly').addEventListener('change',applyFilters);$('#loadMore').addEventListener('click',()=>{state.visible+=12;renderUpcoming();});
    if(PAGE!=='education')$('#ceToggleWrap').hidden=true;
    if(window.flatpickr)flatpickr('#dateRange',{mode:'range',dateFormat:'Y-m-d',onChange:applyFilters});
    load().catch(err=>{$('#statusText').textContent='Feed unavailable';$('#sourceText').textContent='Offline';$('#featuredGrid').innerHTML=`<div class="ccor-error"><strong>Unable to load current classes and events.</strong><br>${esc(err.message)}</div>`;$('#upcomingGrid').innerHTML='';console.error(err);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
