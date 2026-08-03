(() => {
  'use strict';

  const loader = document.currentScript;
  const API_URL = 'https://www.ccreschool.com/api/public-events';
  const FALLBACK_URL = 'https://gz-realestate-proxy.bonitaspringsrealtors.workers.dev/events/all?enriched=true';
  const CSS_URL = loader?.src ? new URL('ccor-events.css', loader.src).href : './assets/ccor-events.css';
  const PAGE_LABELS = {
    education: ['FEATURED CLASSES', 'Closest upcoming in-person CE classes appear first unless staff stars other classes.'],
    event: ['FEATURED EVENTS', 'Staff-starred events appear first.'],
    committee: ['FEATURED COMMITTEE MEETINGS', 'Staff-starred committee meetings appear first.'],
    all: ['FEATURED AT CCOR', 'Staff-starred classes, events and meetings appear first.']
  };

  const state = {
    page: 'all',
    events: [],
    featured: [],
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDate: null,
    calendar: null,
    observer: null,
    applying: false,
    timer: null
  };

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
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const normalizedName = value => text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  function detectPage() {
    const declared = loader?.dataset.ccorPage;
    if (['education', 'event', 'committee', 'all'].includes(declared)) return declared;
    const heading = text(document.querySelector('.swiss-h1, h1')?.textContent).toLowerCase();
    if (heading.includes('education')) return 'education';
    if (heading.includes('committee')) return 'committee';
    if (heading.includes('all')) return 'all';
    return 'event';
  }

  function categoryOf(raw, source) {
    const declared = String(raw.category || '').toLowerCase();
    if (['education', 'event', 'committee'].includes(declared)) return declared;
    if (first(raw, ['isClass', 'IsClass'], false)) return 'education';
    if (/committee|advisory council|board of directors|task force/i.test(source)) return 'committee';
    if (/education|class|course|webinar|seminar|training|matrix|rpr|cubi|core law|contract|gri|\bce\b|cips|hecm/i.test(source)) return 'education';
    return 'event';
  }

  function formatOf(source) {
    if (/hybrid|in[- ]person\s*(?:and|&|\+)\s*(?:zoom|virtual|online)/i.test(source)) return 'hybrid';
    if (/\bzoom\b|webinar|virtual|online|remote/i.test(source)) return 'online';
    return 'in-person';
  }

  function normalize(raw) {
    const name = text(first(raw, ['name', 'title', 'Name', 'EventName'], 'CCOR class or event'));
    const description = text(first(raw, ['description', 'Description', 'LongDescription', 'ShortDescription']));
    const location = text(first(raw, ['location', 'Location', 'LocationName', 'AddressString']));
    const categories = text(first(raw, ['categories', 'Categories', 'CategoryName', 'CalendarName']));
    const start = asDate(first(raw, ['startDate', 'StartDate', 'StartDateLocal', 'EventStartDate']));
    const id = Number(first(raw, ['eventId', 'EventId', 'Id', 'id'], 0)) || null;
    const source = `${name} ${description} ${location} ${categories}`;
    return {
      id,
      key: String(first(raw, ['key', 'EventDetailId', 'eventDetailId', 'EventId', 'eventId', 'Id', 'id'], `${name}|${start?.toISOString() || ''}`)),
      name,
      description,
      location,
      start,
      url: first(raw, ['publicUrl', 'url', 'PublicUrl', 'PublicRegisterUrl', 'RegistrationUrl'], '#'),
      ce: raw.ce === true || /(?:\(|\b)(?:\d+(?:\.\d+)?\s*(?:hr\s*)?)?ce(?:\)|\b)|continuing education/i.test(source),
      category: categoryOf(raw, source),
      format: raw.format || formatOf(source)
    };
  }

  function automaticFeatured(events) {
    const sorted = [...events].sort((a, b) => (a.start?.getTime() || 9e15) - (b.start?.getTime() || 9e15));
    if (state.page !== 'education') return sorted.slice(0, 3);
    const selected = [];
    const take = list => list.forEach(event => {
      if (selected.length < 3 && !selected.some(item => item.key === event.key)) selected.push(event);
    });
    take(sorted.filter(event => event.ce && event.format === 'in-person'));
    take(sorted.filter(event => event.ce));
    take(sorted);
    return selected;
  }

  function loadStyles() {
    if (document.querySelector('link[data-ccor-calendar-injection]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_URL;
    link.dataset.ccorCalendarInjection = 'true';
    document.head.appendChild(link);
  }

  function cardEventId(card) {
    const explicit = Number(card.dataset.eventId || 0);
    if (explicit) return explicit;
    const action = card.querySelector('[onclick*="openDetails"]')?.getAttribute('onclick') || '';
    const actionMatch = action.match(/openDetails\((\d+)\)/);
    if (actionMatch) return Number(actionMatch[1]);
    const hrefs = [...card.querySelectorAll('a[href]')].map(link => link.href).join(' ');
    const urlMatch = hrefs.match(/(?:Event|event|Details|details|register|Register)[^0-9]{0,20}(\d{3,})/);
    return urlMatch ? Number(urlMatch[1]) : null;
  }

  function currentFilterState() {
    const query = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    const ceOnly = Boolean(document.getElementById('ceToggle')?.checked);
    const selectedDates = document.getElementById('dateFilter')?._flatpickr?.selectedDates || [];
    return { query, ceOnly, selectedDates, active: Boolean(query || ceOnly || selectedDates.length) };
  }

  function visibleCalendarEvents() {
    const { query, ceOnly, selectedDates } = currentFilterState();
    return state.events.filter(event => {
      if (query && !`${event.name} ${event.description} ${event.location}`.toLowerCase().includes(query)) return false;
      if (ceOnly && !event.ce) return false;
      if (selectedDates[0]) {
        const start = new Date(selectedDates[0]);
        start.setHours(0, 0, 0, 0);
        if (!event.start || event.start < start) return false;
      }
      if (selectedDates[1]) {
        const end = new Date(selectedDates[1]);
        end.setHours(23, 59, 59, 999);
        if (!event.start || event.start > end) return false;
      }
      return true;
    });
  }

  function gridColumnCount(grid) {
    const template = getComputedStyle(grid).gridTemplateColumns;
    if (!template || template === 'none') return 1;
    return Math.max(1, template.split(' ').filter(Boolean).length);
  }

  function ensureFeaturedHeading(grid, filtered) {
    let heading = document.getElementById('ccorFeaturedHeading');
    if (!heading) {
      heading = document.createElement('div');
      heading.id = 'ccorFeaturedHeading';
      heading.className = 'ccor-featured-heading';
      grid.parentNode.insertBefore(heading, grid);
    }
    const [label, copy] = PAGE_LABELS[state.page];
    heading.innerHTML = filtered
      ? '<div><span class="ccor-featured-code">FILTERED RESULTS</span><strong>Matching upcoming items</strong></div>'
      : `<div><span class="ccor-featured-code">★ CURATED FIRST ROW</span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(copy)}</small></div>`;
  }

  function clearFeaturedMarks(cards) {
    cards.forEach(card => {
      card.classList.remove('ccor-is-featured');
      card.querySelector('.ccor-feature-star')?.remove();
    });
  }

  function markFeatured(card) {
    card.classList.add('ccor-is-featured');
    const target = card.querySelector('.card-meta-top, .card-content') || card;
    if (!target.querySelector('.ccor-feature-star')) {
      const badge = document.createElement('span');
      badge.className = 'ccor-feature-star';
      badge.textContent = '★ FEATURED';
      target.appendChild(badge);
    }
  }

  function orderedCards(cards, filtered) {
    if (filtered || !state.featured.length) return cards;
    const byId = new Map(cards.map(card => [cardEventId(card), card]).filter(([id]) => id));
    const selected = [];
    for (const event of state.featured) {
      let card = event.id ? byId.get(event.id) : null;
      if (!card) {
        const target = normalizedName(event.name);
        card = cards.find(candidate => {
          if (selected.includes(candidate)) return false;
          const candidateName = normalizedName(candidate.querySelector('.card-title')?.textContent || '');
          return candidateName === target || candidateName.startsWith(target) || target.startsWith(candidateName);
        });
      }
      if (card && !selected.includes(card)) selected.push(card);
    }
    return [...selected, ...cards.filter(card => !selected.includes(card))];
  }

  function createCalendar() {
    const root = document.createElement('section');
    root.id = 'ccorCalendarInjection';
    root.className = 'ccor-calendar-injection';
    root.innerHTML = `
      <div class="ccor-calendar-header">
        <div>
          <span class="ccor-calendar-code">INTERACTIVE CALENDAR</span>
          <h2>Explore by date</h2>
        </div>
        <div class="ccor-calendar-controls">
          <button type="button" data-calendar-prev aria-label="Previous month">←</button>
          <strong data-calendar-month></strong>
          <button type="button" data-calendar-next aria-label="Next month">→</button>
        </div>
      </div>
      <div class="ccor-calendar-layout">
        <div class="ccor-calendar-panel">
          <div class="ccor-calendar-weekdays" aria-hidden="true">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>
          <div class="ccor-calendar-days" data-calendar-days></div>
        </div>
        <aside class="ccor-calendar-agenda">
          <span class="ccor-calendar-code">SELECTED DATE</span>
          <h3 data-agenda-date></h3>
          <div data-agenda-list></div>
        </aside>
      </div>`;
    root.querySelector('[data-calendar-prev]').addEventListener('click', () => {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
      state.selectedDate = null;
      renderCalendar();
    });
    root.querySelector('[data-calendar-next]').addEventListener('click', () => {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
      state.selectedDate = null;
      renderCalendar();
    });
    return root;
  }

  function chooseSelectedDate(events) {
    if (state.selectedDate) return;
    const inMonth = events.find(event => event.start && event.start.getFullYear() === state.month.getFullYear() && event.start.getMonth() === state.month.getMonth());
    state.selectedDate = dateKey(inMonth?.start || new Date(state.month.getFullYear(), state.month.getMonth(), 1));
  }

  function renderAgenda(events) {
    const agendaDate = state.calendar.querySelector('[data-agenda-date]');
    const agendaList = state.calendar.querySelector('[data-agenda-list]');
    const selected = new Date(`${state.selectedDate}T12:00:00`);
    const list = events.filter(event => event.start && dateKey(event.start) === state.selectedDate);
    agendaDate.textContent = selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    agendaList.innerHTML = list.length
      ? list.map(event => `<a class="ccor-agenda-link" href="${escapeHtml(event.url)}" target="_blank" rel="noopener"><strong>${escapeHtml(event.name)}</strong><span>${escapeHtml(event.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))}${event.location ? ` · ${escapeHtml(event.location)}` : ''}</span></a>`).join('')
      : '<p class="ccor-calendar-empty">No items are scheduled for this date.</p>';
  }

  function renderCalendar() {
    if (!state.calendar) return;
    const events = visibleCalendarEvents();
    chooseSelectedDate(events);
    state.calendar.querySelector('[data-calendar-month]').textContent = state.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const monthStart = new Date(state.month.getFullYear(), state.month.getMonth(), 1);
    const gridStart = new Date(monthStart);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());
    let markup = '';
    for (let index = 0; index < 42; index += 1) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      const key = dateKey(day);
      const count = events.filter(event => event.start && dateKey(event.start) === key).length;
      markup += `<button type="button" class="ccor-calendar-day${day.getMonth() !== state.month.getMonth() ? ' is-outside' : ''}${count ? ' has-events' : ''}${key === state.selectedDate ? ' is-selected' : ''}" data-calendar-date="${key}"><span>${day.getDate()}</span>${count ? `<b>${count}</b>` : ''}</button>`;
    }
    const days = state.calendar.querySelector('[data-calendar-days]');
    days.innerHTML = markup;
    days.querySelectorAll('[data-calendar-date]').forEach(button => button.addEventListener('click', () => {
      state.selectedDate = button.dataset.calendarDate;
      renderCalendar();
    }));
    renderAgenda(events);
  }

  function observeGrid(grid) {
    if (state.observer) state.observer.disconnect();
    state.observer = new MutationObserver(() => scheduleApply());
    state.observer.observe(grid, { childList: true });
  }

  function applyInjection() {
    if (state.applying || !state.events.length) return;
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;
    const cards = [...grid.children].filter(element => element.classList.contains('swiss-card'));

    state.applying = true;
    state.observer?.disconnect();
    try {
      state.calendar ||= createCalendar();
      state.calendar.remove();
      clearFeaturedMarks(cards);

      const filterState = currentFilterState();
      ensureFeaturedHeading(grid, filterState.active);

      if (!cards.length) {
        const anchor = grid.lastElementChild;
        if (anchor) anchor.after(state.calendar);
        else grid.appendChild(state.calendar);
        renderCalendar();
        return;
      }

      const ordered = orderedCards(cards, filterState.active);
      ordered.forEach(card => grid.appendChild(card));

      const featuredCount = filterState.active
        ? Math.min(gridColumnCount(grid), ordered.length)
        : Math.min(3, ordered.length);
      if (!filterState.active) ordered.slice(0, featuredCount).forEach(markFeatured);
      const anchor = ordered[Math.max(0, featuredCount - 1)];
      anchor.after(state.calendar);
      renderCalendar();
    } finally {
      state.applying = false;
      observeGrid(grid);
    }
  }

  function scheduleApply() {
    clearTimeout(state.timer);
    state.timer = setTimeout(applyInjection, 80);
  }

  function attachFilterListeners() {
    ['searchInput', 'ceToggle', 'dateFilter'].forEach(id => {
      const control = document.getElementById(id);
      if (!control) return;
      control.addEventListener('input', scheduleApply);
      control.addEventListener('change', scheduleApply);
    });
    window.addEventListener('resize', scheduleApply, { passive: true });
  }

  async function loadData() {
    let payload = null;
    try {
      const response = await fetch(`${API_URL}?page=${encodeURIComponent(state.page)}`, { headers: { Accept: 'application/json' } });
      if (response.ok) payload = await response.json();
    } catch (error) {
      console.warn('Featured calendar API unavailable; using GrowthZone fallback.', error);
    }

    if (payload?.events?.length) {
      state.events = payload.events.map(normalize).filter(event => event.start);
      state.featured = (payload.featured || []).map(normalize).filter(event => event.start);
    } else {
      const response = await fetch(FALLBACK_URL, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`GrowthZone fallback returned ${response.status}`);
      const fallback = await response.json();
      state.events = (fallback.Results || fallback.events || [])
        .map(normalize)
        .filter(event => event.start)
        .filter(event => state.page === 'all' || event.category === state.page);
      state.featured = [];
    }

    state.events.sort((a, b) => (a.start?.getTime() || 9e15) - (b.start?.getTime() || 9e15));
    if (!state.featured.length) state.featured = automaticFeatured(state.events);

    const firstEvent = state.events[0]?.start;
    if (firstEvent && firstEvent > new Date(state.month.getFullYear(), state.month.getMonth() + 1, 0)) {
      state.month = new Date(firstEvent.getFullYear(), firstEvent.getMonth(), 1);
    }
  }

  async function init() {
    state.page = detectPage();
    loadStyles();
    attachFilterListeners();
    const grid = document.getElementById('eventsGrid');
    if (grid) observeGrid(grid);
    try {
      await loadData();
      scheduleApply();
    } catch (error) {
      console.error('CCOR calendar injection failed:', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
