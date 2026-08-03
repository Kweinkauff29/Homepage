(() => {
  'use strict';

  const API_URL = 'https://www.ccreschool.com/api/public-events?page=education';
  const DEFAULT_LOGO = 'https://res.cloudinary.com/micronetonline/image/upload/f_auto/q_auto/v1776694258/tenants/6c24b0da-8a6e-4f2b-8547-26a8c1dc4581/fd6f25e9e9464f66992bbb929f9e3df9/CCOR-Horz-Logo-no-tag-clr.png';
  const PAGE_SIZE = 18;
  const DAY_MS = 86400000;

  const state = {
    events: [],
    upcomingEvents: [],
    featured: [],
    featuredKeys: new Set(),
    instructors: [],
    years: [],
    selectedYear: new Date().getFullYear(),
    view: 'year',
    format: 'all',
    instructor: 'all',
    selectedMonth: null,
    selectedDate: null,
    dateStart: null,
    dateEnd: null,
    visibleCount: PAGE_SIZE,
    logoUrl: DEFAULT_LOGO,
    loading: true
  };

  const dom = {};

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function plain(value) {
    return String(value || '')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&#39;/gi, "'")
      .replace(/&rsquo;/gi, '’')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function asDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function eventDate(event) {
    return asDate(event.startDate || event.start || event.StartDate);
  }

  function dateKey(value) {
    const date = asDate(value);
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function normalizeEvent(raw) {
    const start = asDate(raw.startDate || raw.start || raw.StartDate);
    const end = asDate(raw.endDate || raw.end || raw.EndDate);
    const eventId = raw.eventId || raw.EventId || raw.id || null;
    const key = String(raw.key || raw.eventDetailId || raw.EventDetailId || eventId || `${raw.name || raw.Name}|${start?.toISOString() || ''}`);
    const name = plain(raw.name || raw.Name || raw.title || 'CCOR Education class');
    const flyerUrl = raw.flyerUrl || raw.EnrichedFlyerUrl || raw.EventLogoUrl || '';
    const instructors = Array.isArray(raw.instructors) ? raw.instructors.map(normalizeInstructor) : [];
    return {
      ...raw,
      key,
      eventId,
      name,
      description: plain(raw.description || raw.Description || ''),
      start,
      end,
      startDate: start?.toISOString() || raw.startDate || raw.StartDate || '',
      endDate: end?.toISOString() || raw.endDate || raw.EndDate || '',
      location: plain(raw.location || raw.Location || raw.LocationName || ''),
      publicUrl: raw.publicUrl || raw.PublicUrl || raw.url || '',
      flyerUrl,
      displayImageUrl: raw.displayImageUrl || flyerUrl || state.logoUrl,
      usesLogoFallback: Boolean(raw.usesLogoFallback || !flyerUrl),
      categories: plain(raw.categories || raw.Categories || ''),
      category: raw.category || 'education',
      ce: Boolean(raw.ce || raw.IsCE || /(?:\d+\s*)?CE\b|continuing education/i.test(`${name} ${raw.description || ''} ${raw.categories || ''}`)),
      format: raw.format || inferFormat(raw),
      instructors
    };
  }

  function normalizeInstructor(raw) {
    const name = plain(raw?.name || raw?.Name || 'Instructor');
    return {
      ...raw,
      name,
      slug: raw?.slug || slugify(name),
      title: plain(raw?.title || 'Instructor'),
      organization: plain(raw?.organization || ''),
      profileUrl: raw?.profileUrl || '',
      headshotUrl: raw?.headshotUrl || '',
      upcoming: Array.isArray(raw?.upcoming) ? raw.upcoming.map(item => normalizeEvent({ ...item, instructors: [] })) : [],
      recent: Array.isArray(raw?.recent) ? raw.recent.map(item => normalizeEvent({ ...item, instructors: [] })) : [],
      upcomingCount: Number(raw?.upcomingCount || raw?.upcoming?.length || 0),
      recentCount: Number(raw?.recentCount || raw?.recent?.length || 0)
    };
  }

  function inferFormat(raw) {
    const source = plain(`${raw.name || raw.Name || ''} ${raw.description || raw.Description || ''} ${raw.location || raw.Location || ''}`).toLowerCase();
    if (/hybrid|in[- ]person\s*(?:and|&|\+)\s*(?:zoom|virtual|online)/.test(source)) return 'hybrid';
    if (/\bzoom\b|webinar|virtual|online|remote/.test(source)) return 'online';
    return 'in-person';
  }

  function slugify(value) {
    return plain(value).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function initials(name) {
    return plain(name).split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'CC';
  }

  function formatDate(date, options = {}) {
    const parsed = asDate(date);
    if (!parsed) return 'Date to be announced';
    return parsed.toLocaleDateString('en-US', options.short
      ? { month: 'short', day: 'numeric', year: options.year === false ? undefined : 'numeric' }
      : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTime(date) {
    const parsed = asDate(date);
    if (!parsed) return '';
    return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function isPast(event) {
    const date = eventDate(event);
    return Boolean(date && date.getTime() < Date.now() - 3600000);
  }

  function eventMatchesInstructor(event, slug) {
    if (!slug || slug === 'all') return true;
    return (event.instructors || []).some(instructor => instructor.slug === slug);
  }

  function buildShell() {
    const header = document.getElementById('eduTop');
    const status = document.querySelector('.swiss-status');
    const grid = document.getElementById('eventsGrid');
    if (!header || !status || !grid) throw new Error('Education page shell is incomplete.');

    dom.search = document.getElementById('searchInput');
    dom.dateFilter = document.getElementById('dateFilter');
    dom.ceToggle = document.getElementById('ceToggle');
    dom.statusText = document.getElementById('sysStatus');
    dom.linkStatus = document.querySelector('.swiss-status-glitch');
    dom.modal = document.getElementById('eventModal');
    dom.modalBody = document.getElementById('modalBody');
    dom.modalClose = document.getElementById('modalClose');
    dom.grid = grid;

    const app = document.createElement('div');
    app.id = 'ccorEducationApp';
    app.className = 'ccor-education';
    app.innerHTML = `
      <section class="ccor-edu-hero" aria-labelledby="ccorEduHeroTitle">
        <div>
          <span class="ccor-kicker">CCOR EDUCATION / PROFESSIONAL DEVELOPMENT</span>
          <h2 id="ccorEduHeroTitle">Learn today.<br>Lead tomorrow.</h2>
          <p>Explore a complete year of CCOR education, meet the instructors behind each class, and review both upcoming opportunities and classes taught during the past year.</p>
        </div>
        <div class="ccor-edu-stats" id="ccorEduStats" aria-label="Education calendar summary">
          ${Array.from({ length: 4 }, () => '<div class="ccor-stat"><strong>—</strong><span>Loading calendar</span></div>').join('')}
        </div>
      </section>

      <section class="ccor-section" id="ccorFeaturedSection" aria-labelledby="ccorFeaturedTitle">
        <div class="ccor-section-heading">
          <div><span class="ccor-section-kicker">★ STAFF PICKS + NEXT BEST CLASSES</span><h2 id="ccorFeaturedTitle">Featured education</h2></div>
          <p>Staff-starred classes appear first. When no class is starred, the nearest in-person CE opportunities are prioritized automatically.</p>
        </div>
        <div class="ccor-featured-grid" id="ccorFeaturedGrid">
          ${Array.from({ length: 3 }, () => '<div class="ccor-skeleton" aria-hidden="true"></div>').join('')}
        </div>
      </section>

      <section class="ccor-section" id="ccorCalendarSection" aria-labelledby="ccorCalendarTitle">
        <div class="ccor-section-heading">
          <div><span class="ccor-section-kicker">12-MONTH VIEW</span><h2 id="ccorCalendarTitle">Education calendar</h2></div>
          <p>Select a month or class date to narrow the class tiles below. Use the year controls to review the complete schedule.</p>
        </div>
        <div class="ccor-year-controls">
          <div class="ccor-segmented" id="ccorViewTabs" role="group" aria-label="Class time period">
            <button type="button" data-view="upcoming">Upcoming</button>
            <button type="button" data-view="past">Past 12 months</button>
            <button type="button" data-view="year" class="active">Selected year</button>
            <button type="button" data-view="all">All records</button>
          </div>
          <div class="ccor-year-switcher">
            <button type="button" id="ccorPreviousYear" aria-label="Previous calendar year">←</button>
            <select id="ccorYearSelect" class="ccor-select" aria-label="Education calendar year"></select>
            <button type="button" id="ccorNextYear" aria-label="Next calendar year">→</button>
          </div>
        </div>
        <div class="ccor-year-calendar" id="ccorYearCalendar"></div>
      </section>

      <section class="ccor-section" id="ccorClassSection" aria-labelledby="ccorClassTitle">
        <div class="ccor-section-heading">
          <div><span class="ccor-section-kicker">FULL CLASS DIRECTORY</span><h2 id="ccorClassTitle">Classes</h2></div>
          <p>Every tile includes its flyer when available. Classes without a flyer automatically use the official CCOR logo.</p>
        </div>
        <div class="ccor-results-toolbar">
          <div class="ccor-filter-row">
            <select id="ccorFormatFilter" class="ccor-select" aria-label="Filter by class format">
              <option value="all">All formats</option>
              <option value="in-person">In person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <select id="ccorInstructorFilter" class="ccor-select" aria-label="Filter by instructor"><option value="all">All instructors</option></select>
            <button type="button" class="ccor-button secondary" id="ccorClearFilters">Clear filters</button>
          </div>
          <button type="button" class="ccor-button ghost" id="ccorJumpInstructors">Meet the instructors ↓</button>
        </div>
        <div class="ccor-results-meta" id="ccorResultsMeta" aria-live="polite"></div>
      </section>

      <section class="ccor-section" id="ccorInstructorSection" aria-labelledby="ccorInstructorTitle">
        <div class="ccor-section-heading">
          <div><span class="ccor-section-kicker">FACULTY + SUBJECT-MATTER EXPERTS</span><h2 id="ccorInstructorTitle">Meet the instructors</h2></div>
          <p>Instructor names are matched from class descriptions using a verified alias directory and explicit teaching phrases. Each profile connects recent and upcoming classes.</p>
        </div>
        <div class="ccor-instructor-grid" id="ccorInstructorGrid"></div>
      </section>
    `;

    header.insertAdjacentElement('afterend', app);
    app.querySelector('.ccor-edu-hero').insertAdjacentElement('afterend', status);
    const classSection = app.querySelector('#ccorClassSection');
    classSection.appendChild(grid);
    grid.className = 'ccor-class-grid';
    const loadWrap = document.createElement('div');
    loadWrap.className = 'ccor-load-more-wrap';
    loadWrap.innerHTML = '<button type="button" class="ccor-button secondary" id="ccorLoadMore">Load more classes</button>';
    classSection.appendChild(loadWrap);

    dom.app = app;
    dom.stats = document.getElementById('ccorEduStats');
    dom.featuredGrid = document.getElementById('ccorFeaturedGrid');
    dom.yearCalendar = document.getElementById('ccorYearCalendar');
    dom.viewTabs = document.getElementById('ccorViewTabs');
    dom.yearSelect = document.getElementById('ccorYearSelect');
    dom.previousYear = document.getElementById('ccorPreviousYear');
    dom.nextYear = document.getElementById('ccorNextYear');
    dom.formatFilter = document.getElementById('ccorFormatFilter');
    dom.instructorFilter = document.getElementById('ccorInstructorFilter');
    dom.clearFilters = document.getElementById('ccorClearFilters');
    dom.jumpInstructors = document.getElementById('ccorJumpInstructors');
    dom.resultsMeta = document.getElementById('ccorResultsMeta');
    dom.instructorGrid = document.getElementById('ccorInstructorGrid');
    dom.instructorSection = document.getElementById('ccorInstructorSection');
    dom.loadMore = document.getElementById('ccorLoadMore');
  }

  function populateControls() {
    dom.yearSelect.innerHTML = state.years.map(year => `<option value="${year}"${year === state.selectedYear ? ' selected' : ''}>${year}</option>`).join('');
    dom.instructorFilter.innerHTML = '<option value="all">All instructors</option>' + state.instructors
      .map(instructor => `<option value="${escapeHtml(instructor.slug)}">${escapeHtml(instructor.name)}</option>`)
      .join('');
    dom.instructorFilter.value = state.instructor;
  }

  function attachListeners() {
    dom.search?.addEventListener('input', () => {
      state.visibleCount = PAGE_SIZE;
      renderResults();
      renderCalendar();
    });
    dom.ceToggle?.addEventListener('change', () => {
      state.visibleCount = PAGE_SIZE;
      renderResults();
      renderCalendar();
    });
    dom.formatFilter.addEventListener('change', () => {
      state.format = dom.formatFilter.value;
      state.visibleCount = PAGE_SIZE;
      renderResults();
      renderCalendar();
    });
    dom.instructorFilter.addEventListener('change', () => {
      state.instructor = dom.instructorFilter.value;
      state.visibleCount = PAGE_SIZE;
      renderResults();
      renderCalendar();
      renderInstructors();
    });
    dom.viewTabs.addEventListener('click', event => {
      const button = event.target.closest('[data-view]');
      if (!button) return;
      state.view = button.dataset.view;
      state.selectedMonth = null;
      state.selectedDate = null;
      state.visibleCount = PAGE_SIZE;
      syncViewTabs();
      renderCalendar();
      renderResults();
    });
    dom.yearSelect.addEventListener('change', () => selectYear(Number(dom.yearSelect.value)));
    dom.previousYear.addEventListener('click', () => shiftYear(-1));
    dom.nextYear.addEventListener('click', () => shiftYear(1));
    dom.clearFilters.addEventListener('click', clearFilters);
    dom.jumpInstructors.addEventListener('click', () => dom.instructorSection.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    dom.loadMore.addEventListener('click', () => {
      state.visibleCount += PAGE_SIZE;
      renderResults();
    });
    dom.modalClose?.addEventListener('click', closeModal);
    dom.modal?.addEventListener('click', event => { if (event.target === dom.modal) closeModal(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && dom.modal?.classList.contains('open')) closeModal(); });

    if (window.flatpickr && dom.dateFilter) {
      window.flatpickr(dom.dateFilter, {
        mode: 'range',
        dateFormat: 'Y-m-d',
        onChange(selectedDates) {
          state.dateStart = selectedDates[0] ? startOfDay(selectedDates[0]) : null;
          state.dateEnd = selectedDates[1] ? endOfDay(selectedDates[1]) : selectedDates[0] ? endOfDay(selectedDates[0]) : null;
          state.visibleCount = PAGE_SIZE;
          renderResults();
          renderCalendar();
        }
      });
    }
  }

  function startOfDay(date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  function endOfDay(date) {
    const value = new Date(date);
    value.setHours(23, 59, 59, 999);
    return value;
  }

  function selectYear(year) {
    if (!state.years.includes(year)) return;
    state.selectedYear = year;
    state.view = 'year';
    state.selectedMonth = null;
    state.selectedDate = null;
    state.visibleCount = PAGE_SIZE;
    dom.yearSelect.value = String(year);
    syncViewTabs();
    renderCalendar();
    renderResults();
    renderStats();
  }

  function shiftYear(direction) {
    const index = state.years.indexOf(state.selectedYear);
    const next = state.years[index + direction];
    if (next) selectYear(next);
  }

  function syncViewTabs() {
    dom.viewTabs.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === state.view));
  }

  function clearFilters() {
    if (dom.search) dom.search.value = '';
    if (dom.ceToggle) dom.ceToggle.checked = false;
    if (dom.dateFilter?._flatpickr) dom.dateFilter._flatpickr.clear();
    state.dateStart = null;
    state.dateEnd = null;
    state.format = 'all';
    state.instructor = 'all';
    state.selectedMonth = null;
    state.selectedDate = null;
    state.visibleCount = PAGE_SIZE;
    dom.formatFilter.value = 'all';
    dom.instructorFilter.value = 'all';
    renderCalendar();
    renderResults();
    renderInstructors();
  }

  function baseEventsForView() {
    const now = Date.now();
    const oneYearAgo = now - 366 * DAY_MS;
    if (state.view === 'upcoming') return state.events.filter(event => eventDate(event)?.getTime() >= now - 3600000);
    if (state.view === 'past') return state.events.filter(event => {
      const time = eventDate(event)?.getTime();
      return time && time < now && time >= oneYearAgo;
    });
    if (state.view === 'year') return state.events.filter(event => eventDate(event)?.getFullYear() === state.selectedYear);
    return [...state.events];
  }

  function filteredEvents({ ignoreCalendarSelection = false } = {}) {
    const query = plain(dom.search?.value || '').toLowerCase();
    const ceOnly = Boolean(dom.ceToggle?.checked);
    const selectedMonth = ignoreCalendarSelection ? null : state.selectedMonth;
    const selectedDate = ignoreCalendarSelection ? null : state.selectedDate;

    const results = baseEventsForView().filter(event => {
      const date = eventDate(event);
      if (!date) return false;
      if (query && !`${event.name} ${event.description} ${event.location} ${(event.instructors || []).map(item => item.name).join(' ')}`.toLowerCase().includes(query)) return false;
      if (ceOnly && !event.ce) return false;
      if (state.format !== 'all' && event.format !== state.format) return false;
      if (!eventMatchesInstructor(event, state.instructor)) return false;
      if (state.dateStart && date < state.dateStart) return false;
      if (state.dateEnd && date > state.dateEnd) return false;
      if (selectedMonth !== null && (date.getFullYear() !== state.selectedYear || date.getMonth() !== selectedMonth)) return false;
      if (selectedDate && dateKey(date) !== selectedDate) return false;
      return true;
    });

    return results.sort((a, b) => {
      const diff = eventDate(a) - eventDate(b);
      return state.view === 'past' ? -diff : diff;
    });
  }

  function renderStats() {
    const yearEvents = state.events.filter(event => eventDate(event)?.getFullYear() === state.selectedYear);
    const upcoming = state.events.filter(event => eventDate(event)?.getTime() >= Date.now() - 3600000);
    const ce = yearEvents.filter(event => event.ce);
    const activeInstructors = state.instructors.filter(instructor => instructor.upcomingCount || instructor.recentCount);
    const items = [
      [yearEvents.length, `${state.selectedYear} classes`],
      [upcoming.length, 'Upcoming classes'],
      [ce.length, `${state.selectedYear} CE classes`],
      [activeInstructors.length, 'Matched instructors']
    ];
    dom.stats.innerHTML = items.map(([value, label]) => `<div class="ccor-stat"><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`).join('');
  }

  function renderFeatured() {
    const featured = state.featured.filter(event => !isPast(event)).slice(0, 3);
    if (!featured.length) {
      dom.featuredGrid.innerHTML = '<div class="ccor-empty"><strong>No featured classes are available.</strong>The upcoming class directory is still available below.</div>';
      return;
    }
    dom.featuredGrid.innerHTML = featured.map(event => featuredCard(event)).join('');
    bindCardActions(dom.featuredGrid);
    bindImageFallbacks(dom.featuredGrid);
  }

  function mediaMarkup(event, tag = '') {
    const image = event.displayImageUrl || event.flyerUrl || state.logoUrl;
    const logo = event.usesLogoFallback || !event.flyerUrl;
    const start = eventDate(event);
    return `
      <div class="ccor-card-media${logo ? ' is-logo' : ''}">
        ${tag ? `<span class="ccor-media-tag">${escapeHtml(tag)}</span>` : ''}
        <img src="${escapeHtml(image)}" data-event-image data-logo-url="${escapeHtml(state.logoUrl)}" alt="${escapeHtml(logo ? 'Coconut Coast Organization of REALTORS logo' : `${event.name} class flyer`)}" loading="lazy">
        ${start ? `<div class="ccor-date-block"><span>${start.toLocaleDateString('en-US', { month: 'short' })}</span><strong>${start.getDate()}</strong></div>` : ''}
      </div>`;
  }

  function badgesMarkup(event, { includePast = true, featured = false } = {}) {
    const badges = [];
    if (featured) badges.push('<span class="ccor-badge featured">Featured</span>');
    if (event.ce) badges.push('<span class="ccor-badge ce">CE credit</span>');
    badges.push(`<span class="ccor-badge ${escapeHtml(event.format)}">${escapeHtml(event.format.replace('-', ' '))}</span>`);
    if (includePast && isPast(event)) badges.push('<span class="ccor-badge past">Past class</span>');
    return `<div class="ccor-badges">${badges.join('')}</div>`;
  }

  function instructorChipsMarkup(event) {
    if (!event.instructors?.length) return '';
    return `<div class="ccor-instructor-chips">${event.instructors.map(instructor => `
      <button type="button" class="ccor-instructor-chip" data-instructor-filter="${escapeHtml(instructor.slug)}" title="Show classes taught by ${escapeHtml(instructor.name)}">
        ${avatarMarkup(instructor, 'ccor-avatar')}
        <span>${escapeHtml(instructor.name)}</span>
      </button>`).join('')}</div>`;
  }

  function avatarMarkup(instructor, className = 'ccor-headshot') {
    const image = instructor.headshotUrl
      ? `<img src="${escapeHtml(instructor.headshotUrl)}" alt="${escapeHtml(instructor.name)}" loading="lazy" data-headshot-image>`
      : `<span>${escapeHtml(initials(instructor.name))}</span>`;
    return `<span class="${className}" data-avatar-fallback="${escapeHtml(initials(instructor.name))}">${image}</span>`;
  }

  function featuredCard(event) {
    return `<article class="ccor-featured-card" data-event-key="${escapeHtml(event.key)}">
      ${mediaMarkup(event, state.featuredKeys.has(String(event.key)) ? 'Staff featured' : 'Coming soon')}
      <div class="ccor-card-body">
        <h3>${escapeHtml(event.name)}</h3>
        <div class="ccor-meta"><span>▣ ${escapeHtml(formatDate(event.start, { short: true }))}</span><span>◷ ${escapeHtml(formatTime(event.start))}</span></div>
        ${badgesMarkup(event, { featured: true })}
        ${instructorChipsMarkup(event)}
        <p class="ccor-description ccor-line-clamp">${escapeHtml(event.description || 'Open the class record for details and registration information.')}</p>
        ${cardActions(event)}
      </div>
    </article>`;
  }

  function classCard(event) {
    return `<article class="ccor-class-card" data-event-key="${escapeHtml(event.key)}">
      ${mediaMarkup(event, isPast(event) ? 'Class archive' : 'Education')}
      <div class="ccor-card-body">
        <h3>${escapeHtml(event.name)}</h3>
        <div class="ccor-meta">
          <span>▣ ${escapeHtml(formatDate(event.start))}</span>
          <span>◷ ${escapeHtml(formatTime(event.start))}</span>
          ${event.location ? `<span>⌖ ${escapeHtml(event.location)}</span>` : ''}
        </div>
        ${badgesMarkup(event)}
        ${instructorChipsMarkup(event)}
        <p class="ccor-description ccor-line-clamp">${escapeHtml(event.description || 'Open the class record for more information.')}</p>
        ${cardActions(event)}
      </div>
    </article>`;
  }

  function cardActions(event) {
    const label = isPast(event) ? 'View class record' : 'Class details';
    const register = !isPast(event) && event.publicUrl
      ? `<a class="ccor-button" href="${escapeHtml(event.publicUrl)}" target="_blank" rel="noopener">Register ↗</a>`
      : event.publicUrl
        ? `<a class="ccor-button secondary" href="${escapeHtml(event.publicUrl)}" target="_blank" rel="noopener">Event page ↗</a>`
        : '';
    return `<div class="ccor-card-actions"><button type="button" class="ccor-button secondary" data-open-event="${escapeHtml(event.key)}">${label}</button>${register}</div>`;
  }

  function renderCalendar() {
    const calendarEvents = filteredEvents({ ignoreCalendarSelection: true }).filter(event => eventDate(event)?.getFullYear() === state.selectedYear);
    const byDate = new Map();
    for (const event of calendarEvents) {
      const key = dateKey(event.start);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(event);
    }

    dom.yearCalendar.innerHTML = Array.from({ length: 12 }, (_, month) => monthMarkup(state.selectedYear, month, byDate)).join('');
    dom.yearCalendar.querySelectorAll('[data-calendar-month]').forEach(button => button.addEventListener('click', () => {
      const month = Number(button.dataset.calendarMonth);
      state.selectedMonth = state.selectedMonth === month && !state.selectedDate ? null : month;
      state.selectedDate = null;
      state.view = 'year';
      state.visibleCount = PAGE_SIZE;
      syncViewTabs();
      renderCalendar();
      renderResults();
      document.getElementById('ccorClassSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    dom.yearCalendar.querySelectorAll('[data-calendar-date]').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      state.selectedDate = button.dataset.calendarDate;
      const selected = asDate(`${state.selectedDate}T12:00:00`);
      state.selectedMonth = selected?.getMonth() ?? null;
      state.view = 'year';
      state.visibleCount = PAGE_SIZE;
      syncViewTabs();
      renderCalendar();
      renderResults();
      document.getElementById('ccorClassSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }

  function monthMarkup(year, month, byDate) {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay.getDay();
    const monthCount = [...byDate.entries()].reduce((sum, [key, events]) => key.startsWith(`${year}-${String(month + 1).padStart(2, '0')}-`) ? sum + events.length : sum, 0);
    const empty = Array.from({ length: offset }, () => '<span class="ccor-day" aria-hidden="true"></span>').join('');
    const today = dateKey(new Date());
    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const events = byDate.get(key) || [];
      const classes = [
        'ccor-day',
        events.length ? 'has-event' : '',
        key === today ? 'is-today' : '',
        key === state.selectedDate ? 'selected' : ''
      ].filter(Boolean).join(' ');
      return events.length
        ? `<button type="button" class="${classes}" data-calendar-date="${key}" title="${events.length} class${events.length === 1 ? '' : 'es'} on ${formatDate(key)}">${day}</button>`
        : `<span class="${classes}">${day}</span>`;
    }).join('');
    const active = state.selectedMonth === month;
    return `<article class="ccor-month-card${active ? ' active' : ''}">
      <button type="button" class="ccor-month-header" data-calendar-month="${month}" aria-pressed="${active}">
        <strong>${firstDay.toLocaleDateString('en-US', { month: 'long' })}</strong>
        <span class="ccor-month-count">${monthCount}</span>
      </button>
      <div class="ccor-mini-weekdays"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
      <div class="ccor-mini-days">${empty}${days}</div>
    </article>`;
  }

  function renderResults() {
    const events = filteredEvents();
    const visible = events.slice(0, state.visibleCount);
    dom.resultsMeta.textContent = resultSummary(events.length);
    dom.grid.innerHTML = visible.length
      ? visible.map(classCard).join('')
      : '<div class="ccor-empty"><strong>No matching classes.</strong>Clear one or more filters, choose another month, or switch the calendar year.</div>';
    dom.loadMore.hidden = events.length <= state.visibleCount;
    bindCardActions(dom.grid);
    bindImageFallbacks(dom.grid);
  }

  function resultSummary(count) {
    const pieces = [`${count} class${count === 1 ? '' : 'es'}`];
    if (state.selectedDate) pieces.push(formatDate(state.selectedDate));
    else if (state.selectedMonth !== null) pieces.push(new Date(state.selectedYear, state.selectedMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    else if (state.view === 'year') pieces.push(String(state.selectedYear));
    else if (state.view === 'upcoming') pieces.push('upcoming');
    else if (state.view === 'past') pieces.push('past 12 months');
    if (state.instructor !== 'all') pieces.push(state.instructors.find(item => item.slug === state.instructor)?.name || 'selected instructor');
    return pieces.join(' / ');
  }

  function renderInstructors() {
    const profiles = state.instructors.filter(instructor => instructor.upcomingCount || instructor.recentCount);
    if (!profiles.length) {
      dom.instructorGrid.innerHTML = '<div class="ccor-empty"><strong>No instructor profiles were matched.</strong>Classes remain available in the calendar above.</div>';
      return;
    }
    dom.instructorGrid.innerHTML = profiles.map(instructorCard).join('');
    dom.instructorGrid.querySelectorAll('[data-instructor-select]').forEach(button => button.addEventListener('click', () => {
      state.instructor = button.dataset.instructorSelect;
      dom.instructorFilter.value = state.instructor;
      state.visibleCount = PAGE_SIZE;
      renderResults();
      renderCalendar();
      renderInstructors();
      document.getElementById('ccorClassSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    dom.instructorGrid.querySelectorAll('[data-open-event]').forEach(button => button.addEventListener('click', () => openEvent(button.dataset.openEvent)));
    bindImageFallbacks(dom.instructorGrid);
  }

  function instructorCard(instructor) {
    const upcoming = instructor.upcoming.slice(0, 4);
    const recent = instructor.recent.slice(0, 4);
    const selected = state.instructor === instructor.slug;
    return `<article class="ccor-instructor-card${selected ? ' selected' : ''}" id="instructor-${escapeHtml(instructor.slug)}">
      <div class="ccor-instructor-top">
        ${avatarMarkup(instructor)}
        <div>
          <h3>${escapeHtml(instructor.name)}</h3>
          <p class="ccor-instructor-role">${escapeHtml(instructor.title || 'Instructor')}</p>
          ${instructor.organization ? `<p class="ccor-instructor-org">${escapeHtml(instructor.organization)}</p>` : ''}
        </div>
        <div class="ccor-instructor-counts"><strong>${instructor.upcomingCount + instructor.recentCount}</strong><span>Classes connected</span></div>
      </div>
      <div class="ccor-instructor-detail">
        <div class="ccor-instructor-column">
          <h4>Upcoming (${instructor.upcomingCount})</h4>
          ${instructorClassList(upcoming, false)}
        </div>
        <div class="ccor-instructor-column">
          <h4>Past year (${instructor.recentCount})</h4>
          ${instructorClassList(recent, true)}
        </div>
      </div>
      <div class="ccor-instructor-footer">
        <button type="button" class="ccor-button secondary" data-instructor-select="${escapeHtml(instructor.slug)}">${selected ? 'Showing classes' : 'View their classes'}</button>
        ${instructor.profileUrl ? `<a class="ccor-button ghost" href="${escapeHtml(instructor.profileUrl)}" target="_blank" rel="noopener">Profile ↗</a>` : ''}
      </div>
    </article>`;
  }

  function instructorClassList(events, past) {
    if (!events.length) return `<p class="ccor-description">No ${past ? 'classes recorded during the past year' : 'upcoming classes currently scheduled'}.</p>`;
    return `<ul class="ccor-instructor-class-list">${events.map(event => `
      <li><button type="button" data-open-event="${escapeHtml(event.key)}"><time>${escapeHtml(formatDate(event.start, { short: true, year: false }))}</time><span>${escapeHtml(event.name)}</span></button></li>`).join('')}</ul>`;
  }

  function bindCardActions(root) {
    root.querySelectorAll('[data-open-event]').forEach(button => button.addEventListener('click', () => openEvent(button.dataset.openEvent)));
    root.querySelectorAll('[data-instructor-filter]').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      state.instructor = button.dataset.instructorFilter;
      dom.instructorFilter.value = state.instructor;
      state.visibleCount = PAGE_SIZE;
      renderResults();
      renderCalendar();
      renderInstructors();
    }));
  }

  function bindImageFallbacks(root) {
    root.querySelectorAll('[data-event-image]').forEach(image => image.addEventListener('error', () => {
      if (image.dataset.fallbackApplied === '1') return;
      image.dataset.fallbackApplied = '1';
      image.src = image.dataset.logoUrl || state.logoUrl;
      image.closest('.ccor-card-media')?.classList.add('is-logo');
      image.alt = 'Coconut Coast Organization of REALTORS logo';
    }));
    root.querySelectorAll('[data-headshot-image]').forEach(image => image.addEventListener('error', () => {
      const avatar = image.closest('[data-avatar-fallback]');
      if (!avatar) return;
      avatar.innerHTML = `<span>${escapeHtml(avatar.dataset.avatarFallback || 'CC')}</span>`;
    }));
  }

  function openEvent(key) {
    const event = state.events.find(item => String(item.key) === String(key)) || state.featured.find(item => String(item.key) === String(key));
    if (!event || !dom.modal || !dom.modalBody) return;
    const image = event.displayImageUrl || event.flyerUrl || state.logoUrl;
    dom.modalBody.innerHTML = `
      <div class="ccor-modal-hero">
        <div class="ccor-modal-image"><img src="${escapeHtml(image)}" alt="${escapeHtml(event.usesLogoFallback ? 'Coconut Coast Organization of REALTORS logo' : `${event.name} class flyer`)}" data-event-image data-logo-url="${escapeHtml(state.logoUrl)}"></div>
        <div>
          <span class="ccor-section-kicker">${isPast(event) ? 'CLASS ARCHIVE' : 'UPCOMING EDUCATION'}</span>
          <h2 class="ccor-modal-title">${escapeHtml(event.name)}</h2>
          <div class="ccor-meta">
            <span>▣ ${escapeHtml(formatDate(event.start))}</span>
            <span>◷ ${escapeHtml(formatTime(event.start))}${event.end ? `–${escapeHtml(formatTime(event.end))}` : ''}</span>
            ${event.location ? `<span>⌖ ${escapeHtml(event.location)}</span>` : ''}
          </div>
          ${badgesMarkup(event)}
          <div class="ccor-modal-instructors">${instructorChipsMarkup(event)}</div>
        </div>
      </div>
      <div class="ccor-modal-description">${escapeHtml(event.description || 'Additional class information is available on the event page.')}</div>
      <div class="m-footer">
        <button type="button" class="ccor-button secondary" data-close-modal>Close</button>
        ${event.publicUrl ? `<a class="ccor-button" href="${escapeHtml(event.publicUrl)}" target="_blank" rel="noopener">${isPast(event) ? 'View event page' : 'Register'} ↗</a>` : ''}
      </div>`;
    dom.modalBody.querySelector('[data-close-modal]')?.addEventListener('click', closeModal);
    bindCardActions(dom.modalBody);
    bindImageFallbacks(dom.modalBody);
    dom.modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    dom.modal?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function updateStatus(message, ok = true) {
    if (dom.statusText) dom.statusText.textContent = message;
    if (dom.linkStatus) {
      dom.linkStatus.textContent = ok ? 'DATASTREAM LINK: SECURE' : 'DATASTREAM LINK: ERROR';
      dom.linkStatus.style.color = ok ? 'var(--accent-cyan)' : 'var(--accent-alert)';
      dom.linkStatus.style.animation = 'none';
    }
  }

  async function load() {
    updateStatus('SYNCHRONIZING FULL-YEAR EDUCATION FEED…');
    const response = await fetch(API_URL, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Education API returned ${response.status}`);
    const payload = await response.json();
    state.logoUrl = payload.logoFallbackUrl || DEFAULT_LOGO;
    state.events = (payload.events || []).map(normalizeEvent).filter(event => event.start);
    state.upcomingEvents = (payload.upcomingEvents || []).map(normalizeEvent).filter(event => event.start);
    state.featured = (payload.featured || []).map(normalizeEvent).filter(event => event.start);
    state.featuredKeys = new Set((payload.featuredKeys || []).map(String));
    state.instructors = (payload.instructors || []).map(normalizeInstructor);
    state.years = (payload.availableYears || [...new Set(state.events.map(event => event.start.getFullYear()))]).map(Number).filter(Boolean).sort((a, b) => a - b);
    if (!state.years.length) state.years = [new Date().getFullYear()];
    const currentYear = new Date().getFullYear();
    state.selectedYear = state.years.includes(currentYear) ? currentYear : state.years[0];
    state.loading = false;

    populateControls();
    renderStats();
    renderFeatured();
    renderCalendar();
    renderResults();
    renderInstructors();
    updateStatus(`SYSTEM ACTIVE: ${state.events.length} CLASSES / ${state.instructors.length} INSTRUCTORS / ${state.years.length} CALENDAR YEARS.`);
  }

  async function init() {
    try {
      buildShell();
      attachListeners();
      await load();
    } catch (error) {
      console.error('CCOR Education page failed:', error);
      updateStatus('SYS_ERROR: EDUCATION CALENDAR COULD NOT LOAD.', false);
      if (dom.featuredGrid) dom.featuredGrid.innerHTML = '<div class="ccor-empty"><strong>The Education feed is temporarily unavailable.</strong>Please refresh the page or contact CCOR support.</div>';
      if (dom.grid) dom.grid.innerHTML = '<div class="ccor-empty"><strong>Classes could not be loaded.</strong>Please try again shortly.</div>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
