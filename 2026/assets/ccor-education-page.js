(() => {
  'use strict';

  const API = 'https://www.ccreschool.com/api/public-events';
  const FALLBACK = 'https://gz-realestate-proxy.bonitaspringsrealtors.workers.dev/events/all?enriched=true';
  const PAGE = 'education';
  const state = {
    events: [],
    featuredKeys: [],
    filtered: [],
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDate: null,
    visible: 12,
    source: ''
  };

  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const text = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const first = (object, keys, fallback = '') => {
    for (const key of keys) {
      if (object && object[key] !== undefined && object[key] !== null && object[key] !== '') return object[key];
    }
    return fallback;
  };
  const asDate = value => {
    const parsed = value ? new Date(value) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  };
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const eventKey = event => String(first(event, ['key', 'EventDetailId', 'eventDetailId', 'EventId', 'eventId', 'Id', 'id'], `${first(event, ['Name', 'name', 'title'])}|${first(event, ['StartDate', 'startDate'])}`));

  function categoryOf(raw) {
    const name = text(first(raw, ['name', 'title', 'Name', 'EventName']));
    const description = text(first(raw, ['description', 'Description', 'ShortDescription']));
    const categories = text(first(raw, ['categories', 'Categories', 'CategoryName', 'CalendarName']));
    const source = `${name} ${description} ${categories}`.toLowerCase();
    if (first(raw, ['isClass', 'IsClass'], false)) return 'education';
    if (/education|class|course|webinar|seminar|training|matrix|rpr|cubi|core law|contract|gri|\bce\b|cips|hecm/.test(source)) return 'education';
    if (/committee|advisory council|board of directors|task force/.test(source)) return 'committee';
    return 'event';
  }

  function formatOf(event) {
    const source = `${event.name} ${event.description} ${event.location}`.toLowerCase();
    if (/hybrid|in[- ]person\s*(?:and|&|\+)\s*(?:zoom|virtual|online)/.test(source)) return 'hybrid';
    if (/\bzoom\b|webinar|virtual|online|remote/.test(source)) return 'online';
    return 'in-person';
  }

  function hasCe(event) {
    return /(?:\(|\b)(?:\d+(?:\.\d+)?\s*(?:hr\s*)?)?ce(?:\)|\b)|continuing education/i.test(`${event.name} ${event.description} ${event.categories}`);
  }

  function normalize(raw) {
    const name = text(first(raw, ['name', 'title', 'Name', 'EventName'], 'CCOR class'));
    const description = text(first(raw, ['description', 'Description', 'LongDescription', 'ShortDescription']));
    const location = text(first(raw, ['location', 'Location', 'LocationName', 'AddressString']));
    const startDate = first(raw, ['startDate', 'StartDate', 'StartDateLocal', 'EventStartDate']);
    const endDate = first(raw, ['endDate', 'EndDate', 'EndDateLocal', 'EventEndDate']);
    const event = {
      key: eventKey(raw),
      eventId: Number(first(raw, ['eventId', 'EventId', 'Id', 'id'], 0)) || null,
      name,
      description,
      start: asDate(startDate),
      end: asDate(endDate),
      startDate,
      endDate,
      location,
      flyerUrl: first(raw, ['flyerUrl', 'EnrichedFlyerUrl', 'EventLogoUrl', 'ImageUrl']),
      publicUrl: first(raw, ['publicUrl', 'url', 'PublicUrl', 'PublicRegisterUrl', 'RegistrationUrl'], 'https://coconutcoastrealtors.org/upcoming-education/'),
      categories: text(first(raw, ['categories', 'Categories', 'CategoryName', 'CalendarName'])),
      category: raw.category || categoryOf(raw)
    };
    event.ce = raw.ce === true || hasCe(event);
    event.format = raw.format || formatOf(event);
    return event;
  }

  function educationEvents(events) {
    return events.filter(event => event.category === PAGE);
  }

  function automaticFeatured(events) {
    const sorted = [...events].sort((a, b) => (a.start?.getTime() || 9e15) - (b.start?.getTime() || 9e15));
    const chosen = [];
    const take = list => list.forEach(event => {
      if (chosen.length < 3 && !chosen.some(item => item.key === event.key)) chosen.push(event);
    });
    take(sorted.filter(event => event.ce && event.format === 'in-person'));
    take(sorted.filter(event => event.ce));
    take(sorted);
    return chosen;
  }

  function featured(events) {
    const manual = state.featuredKeys
      .map(key => events.find(event => event.key === String(key) || String(event.eventId || '') === String(key)))
      .filter(Boolean)
      .slice(0, 3);
    if (!manual.length) return automaticFeatured(events);
    const fill = automaticFeatured(events).filter(event => !manual.some(item => item.key === event.key));
    return [...manual, ...fill].slice(0, 3);
  }

  const dateLabel = date => date ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD';
  const timeLabel = date => date ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Time TBD';

  function card(event, isFeatured = false) {
    const badges = [
      isFeatured ? '<span class="ccor-badge star">Featured</span>' : '',
      event.ce ? '<span class="ccor-badge ce">CE</span>' : '',
      `<span class="ccor-badge">${esc(event.format)}</span>`
    ].join('');
    const media = event.flyerUrl
      ? `<img src="${esc(event.flyerUrl)}" alt="${esc(event.name)} flyer" loading="lazy">`
      : '<div class="fallback">CCOR EDUCATION<br>UPCOMING</div>';
    return `<article class="ccor-card ${isFeatured ? 'featured' : ''}" data-event-key="${esc(event.key)}">
      <div class="ccor-card-badges">${badges}</div>
      <h3>${esc(event.name)}</h3>
      <div class="ccor-card-media">${media}</div>
      <ul class="ccor-meta">
        <li><span>Date</span><span>${esc(dateLabel(event.start))}</span></li>
        <li><span>Time</span><span>${esc(timeLabel(event.start))}</span></li>
        <li><span>Location</span><span>${esc(event.location || (event.format === 'online' ? 'Online' : 'See details'))}</span></li>
      </ul>
      <div class="ccor-actions">
        <a class="ccor-button" href="${esc(event.publicUrl)}" target="_blank" rel="noopener">Details</a>
        <a class="ccor-button primary" href="${esc(event.publicUrl)}" target="_blank" rel="noopener">Register</a>
      </div>
    </article>`;
  }

  function renderFeatured() {
    const list = featured(state.events);
    $('#featuredGrid').innerHTML = list.length
      ? list.map(event => card(event, true)).join('')
      : '<div class="ccor-empty">No featured classes are available yet.</div>';
    $('#featuredRule').textContent = state.featuredKeys.length ? 'Staff curated' : 'Automatic CE fallback';
  }

  function filtersActive() {
    return Boolean($('#eventSearch').value || $('#formatFilter').value !== 'all' || $('#ceOnly').checked || $('#dateRange').value);
  }

  function calendarEvents() {
    return filtersActive() ? state.filtered : state.events;
  }

  function chooseInitialDate(events) {
    if (state.selectedDate) return;
    const today = new Date();
    const todayKey = dateKey(today);
    if (events.some(event => event.start && dateKey(event.start) === todayKey)) {
      state.selectedDate = todayKey;
      return;
    }
    const firstInMonth = events.find(event => event.start && event.start.getFullYear() === state.month.getFullYear() && event.start.getMonth() === state.month.getMonth());
    state.selectedDate = dateKey(firstInMonth?.start || new Date(state.month.getFullYear(), state.month.getMonth(), 1));
  }

  function renderCalendar() {
    const events = calendarEvents();
    chooseInitialDate(events);
    const month = state.month;
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = new Date(monthStart);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());
    $('#monthLabel').textContent = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    let html = '';
    for (let index = 0; index < 42; index += 1) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      const key = dateKey(day);
      const dayEvents = events.filter(event => event.start && dateKey(event.start) === key);
      html += `<button class="ccor-day ${day.getMonth() !== month.getMonth() ? 'outside' : ''} ${dayEvents.length ? 'has-events' : ''} ${state.selectedDate === key ? 'selected' : ''}" data-date="${key}" type="button">
        <span class="ccor-day-num">${day.getDate()}</span>
        ${dayEvents.length ? `<span class="ccor-day-count">${dayEvents.length}</span><span class="ccor-day-dots">${dayEvents.slice(0, 6).map(() => '<i></i>').join('')}</span>` : ''}
      </button>`;
    }
    $('#calendarGrid').innerHTML = html;
    $('#calendarGrid').querySelectorAll('[data-date]').forEach(button => button.addEventListener('click', () => {
      state.selectedDate = button.dataset.date;
      renderCalendar();
    }));
    renderAgenda();
  }

  function renderAgenda() {
    const key = state.selectedDate || dateKey(new Date());
    const selected = new Date(`${key}T12:00:00`);
    const list = calendarEvents().filter(event => event.start && dateKey(event.start) === key);
    $('#agendaDate').textContent = selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    $('#agendaList').innerHTML = list.length
      ? list.map(event => `<a class="ccor-agenda-item" href="${esc(event.publicUrl)}" target="_blank" rel="noopener"><strong>${esc(event.name)}</strong><span>${esc(timeLabel(event.start))} · ${esc(event.location || event.format)}</span></a>`).join('')
      : '<div class="ccor-empty">No classes on this date. Select another highlighted day.</div>';
  }

  function applyFilters() {
    const query = $('#eventSearch').value.trim().toLowerCase();
    const range = $('#dateRange')._flatpickr?.selectedDates || [];
    const format = $('#formatFilter').value;
    const ceOnly = $('#ceOnly').checked;
    state.filtered = state.events.filter(event => {
      if (query && !`${event.name} ${event.description} ${event.location}`.toLowerCase().includes(query)) return false;
      if (format !== 'all' && event.format !== format) return false;
      if (ceOnly && !event.ce) return false;
      if (range[0]) {
        const start = new Date(range[0]);
        start.setHours(0, 0, 0, 0);
        if (!event.start || event.start < start) return false;
      }
      if (range[1]) {
        const end = new Date(range[1]);
        end.setHours(23, 59, 59, 999);
        if (!event.start || event.start > end) return false;
      }
      return true;
    });
    state.visible = 12;
    state.selectedDate = null;
    renderUpcoming();
    renderCalendar();
  }

  function renderUpcoming() {
    const list = filtersActive() ? state.filtered : state.events;
    $('#upcomingGrid').innerHTML = list.length
      ? list.slice(0, state.visible).map(event => card(event)).join('')
      : '<div class="ccor-empty">No matching upcoming classes.</div>';
    $('#loadMore').hidden = list.length <= state.visible;
    $('#resultCount').textContent = `${list.length} upcoming classes loaded`;
  }

  async function load() {
    $('#statusText').textContent = 'Synchronizing current class feed…';
    let payload = null;
    try {
      const response = await fetch(`${API}?page=education`, { headers: { Accept: 'application/json' } });
      if (response.ok) payload = await response.json();
    } catch (error) {
      console.warn('Matrix curation API unavailable', error);
    }

    if (payload?.events?.length) {
      state.events = educationEvents(payload.events.map(normalize));
      const explicitKeys = Array.isArray(payload.featuredKeys) ? payload.featuredKeys : [];
      const featuredItems = Array.isArray(payload.featured) ? payload.featured : [];
      state.featuredKeys = explicitKeys.length
        ? explicitKeys.map(String)
        : featuredItems.map(item => String(first(item, ['key', 'eventId', 'EventId', 'id', 'Id'], eventKey(item))));
      state.source = payload.source || 'Matrix curation API';
    } else {
      const response = await fetch(FALLBACK, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`GrowthZone feed returned ${response.status}`);
      const raw = await response.json();
      state.events = educationEvents((raw.Results || raw.events || []).map(normalize));
      state.featuredKeys = [];
      state.source = 'GrowthZone fallback';
    }

    const cutoff = Date.now() - 86400000;
    state.events = state.events
      .filter(event => !event.start || event.start.getTime() >= cutoff)
      .sort((a, b) => (a.start?.getTime() || 9e15) - (b.start?.getTime() || 9e15));
    state.filtered = [...state.events];
    const firstEvent = state.events[0]?.start;
    if (firstEvent) state.month = new Date(firstEvent.getFullYear(), firstEvent.getMonth(), 1);
    $('#statusText').textContent = `Live: ${state.events.length} upcoming classes`;
    $('#sourceText').textContent = state.source;
    renderFeatured();
    renderUpcoming();
    renderCalendar();
  }

  function init() {
    $('#prevMonth').addEventListener('click', () => {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
      state.selectedDate = null;
      renderCalendar();
    });
    $('#nextMonth').addEventListener('click', () => {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
      state.selectedDate = null;
      renderCalendar();
    });
    $('#eventSearch').addEventListener('input', applyFilters);
    $('#formatFilter').addEventListener('change', applyFilters);
    $('#ceOnly').addEventListener('change', applyFilters);
    $('#loadMore').addEventListener('click', () => {
      state.visible += 12;
      renderUpcoming();
    });
    if (window.flatpickr) flatpickr('#dateRange', { mode: 'range', dateFormat: 'Y-m-d', onChange: applyFilters });
    load().catch(error => {
      $('#statusText').textContent = 'Feed unavailable';
      $('#sourceText').textContent = 'Offline';
      $('#featuredGrid').innerHTML = `<div class="ccor-error"><strong>Unable to load current classes.</strong><br>${esc(error.message)}</div>`;
      $('#upcomingGrid').innerHTML = '';
      console.error(error);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
