            (function () {
                'use strict';

                const DIRECTORY_API = 'https://ccor-member-hub-prototype.bonitaspringsrealtors.workers.dev/api/public/directory';
                const API_PAGE_SIZE = 100;
                const ITEMS_PER_PAGE = 50;
                const CACHE_KEY = 'CCOR_AFFILIATE_DIRECTORY_INDEX_V2';
                const CACHE_TTL_MS = 15 * 60 * 1000;
                const REQUEST_TIMEOUT_MS = 15000;

                const searchInput = document.getElementById('searchInput');
                const directoryGrid = document.getElementById('directoryGrid');
                const statusLine = document.getElementById('statusLine');
                const loadingBar = document.getElementById('loadingBar');
                const paginationDiv = document.getElementById('pagination');
                const loadingContainer = document.getElementById('loadingContainer');
                const filterCategoryInput = document.getElementById('filterCategoryInput');
                const filterCategoryList = document.getElementById('categoryList');
                const filterLanguageInput = document.getElementById('filterLanguageInput');
                const filterLanguageList = document.getElementById('languageList');
                const modal = document.getElementById('agentModal');
                const modalBody = document.getElementById('modalBody');
                const modalClose = document.getElementById('modalClose');

                let allContacts = [];
                let displayedContacts = [];
                let currentPage = 1;
                let lastFocusedElement = null;
                let directoryMeta = { version: 1, updatedAt: null, refreshedAt: null };

                const META_CATEGORIES = {
                    'Title & Escrow': ['title', 'escrow', 'transaction service', 'closing service'],
                    'Mortgage & Finance': ['mortgage', 'lender', 'loan', 'bank', 'finance', 'accountant', 'wealth', 'credit union'],
                    'Legal': ['lawyer', 'attorney', 'legal', 'law office', 'law firm'],
                    'Insurance': ['insurance'],
                    'Property Inspections': ['inspection', 'inspector', 'appraisal', 'appraiser', 'mold', 'radon'],
                    'Construction & Roofing': ['construction', 'contractor', 'builder', 'renovation', 'roof', 'window', 'shutter'],
                    'Home Maintenance': ['air conditioning', 'hvac', 'plumbing', 'painter', 'painting', 'pest', 'exterminator', 'locksmith', 'cleaning', 'restoration'],
                    'Moving & Interiors': ['moving', 'packing', 'storage', 'furnishing', 'interior', 'appliance', 'staging'],
                    'Marketing & Technology': ['photography', 'drone', 'marketing', 'advertising', 'technology', 'internet', 'wifi', 'coaching', 'school', 'education', 'media'],
                    'Lifestyle & Property': ['rental', 'vacation', 'country club', 'home watch', 'property management', 'landscape', 'pool']
                };

                const SPONSOR_CATEGORY_OVERRIDES = {
                    'law office of sam saad iii': ['Legal'],
                    'samuel saad iii': ['Legal'],
                    'woods, weidenmiller, michetti & rudnick': ['Legal'],
                    'state insurance usa': ['Insurance'],
                    'chapman insurance group': ['Insurance'],
                    'lane insurance group': ['Insurance'],
                    'sunrise insurance group': ['Insurance'],
                    'john galt insurance': ['Insurance'],
                    'cottrell title': ['Title & Escrow'],
                    'venture title services': ['Title & Escrow'],
                    'first source title': ['Title & Escrow'],
                    'heights title services': ['Title & Escrow'],
                    'movement mortgage': ['Mortgage & Finance'],
                    'premium mortgage corporation': ['Mortgage & Finance'],
                    'revolution mortgage': ['Mortgage & Finance'],
                    'lower mortgage': ['Mortgage & Finance'],
                    'motto mortgage': ['Mortgage & Finance'],
                    'breh funding': ['Mortgage & Finance'],
                    'loan depot': ['Mortgage & Finance'],
                    'wells fargo': ['Mortgage & Finance'],
                    'centennial mortgage': ['Mortgage & Finance'],
                    'hilton moving & storage': ['Moving & Interiors'],
                    'housemaster': ['Property Inspections'],
                    'joe the home pro': ['Property Inspections'],
                    '239 inspection services': ['Property Inspections'],
                    'the appraisal shoppe': ['Property Inspections'],
                    'hughes exterminators': ['Home Maintenance'],
                    'david meiser locksmith': ['Home Maintenance'],
                    'frame & form studio': ['Marketing & Technology'],
                    'leverage 365': ['Marketing & Technology'],
                    'wbn marketing': ['Marketing & Technology'],
                    'larson educational services': ['Marketing & Technology'],
                    'photography by david michael': ['Marketing & Technology']
                };

                const LEGACY_SPONSORS = [
                    { match: ['saad', 'state insurance', 'movement mortgage', 'chapman insurance', 'weidenmiller'], type: 'diamond', label: 'Diamond Partner', class: 'sponsor-diamond', weight: 5 },
                    { match: ['cottrell', 'housemaster'], type: 'platinum', label: 'Platinum Partner', class: 'sponsor-platinum', weight: 4 },
                    { match: ['premium mortgage', 'lane insurance'], type: 'gold', label: 'Gold Partner', class: 'sponsor-gold', weight: 3 },
                    { match: ['hilton moving', 'lower mortgage', 'revolution mortgage'], type: 'silver', label: 'Silver Partner', class: 'sponsor-silver', weight: 2 },
                    { match: ['frame & form', 'frame form', 'frame and form'], type: 'photo', label: 'Photography Partner', class: 'sponsor-photo', weight: 1 }
                ];

                function escapeHtml(value) {
                    return String(value ?? '').replace(/[&<>"']/g, char => ({
                        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
                    })[char]);
                }

                function normalize(value) {
                    return String(value || '')
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, ' ')
                        .trim();
                }

                function safeUrl(value) {
                    const text = String(value || '').trim();
                    if (!text) return '';
                    try {
                        const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
                        return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
                    } catch {
                        return '';
                    }
                }

                function safeEmail(value) {
                    const email = String(value || '').trim();
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
                }

                function safePhone(value) {
                    return String(value || '').replace(/[^+()\-.\s\d]/g, '').trim().slice(0, 40);
                }

                function arrayValue(value) {
                    return Array.isArray(value) ? value : [];
                }

                function safeArray(value) {
                    return Array.isArray(value)
                        ? [...new Set(value.map(item => String(item || '').trim()).filter(Boolean))]
                        : [];
                }

                function sponsorFromTier(tier) {
                    const type = normalize(tier).replace(/\s+/g, '');
                    const map = {
                        diamond: { type: 'diamond', label: 'Diamond Partner', class: 'sponsor-diamond', weight: 5 },
                        platinum: { type: 'platinum', label: 'Platinum Partner', class: 'sponsor-platinum', weight: 4 },
                        gold: { type: 'gold', label: 'Gold Partner', class: 'sponsor-gold', weight: 3 },
                        silver: { type: 'silver', label: 'Silver Partner', class: 'sponsor-silver', weight: 2 },
                        photo: { type: 'photo', label: 'Photography Partner', class: 'sponsor-photo', weight: 1 },
                        photography: { type: 'photo', label: 'Photography Partner', class: 'sponsor-photo', weight: 1 },
                        partner: { type: 'partner', label: 'CCOR Partner', class: 'sponsor-photo', weight: 1 }
                    };
                    return map[type] || null;
                }

                function determineSponsor(name, tier) {
                    const configured = sponsorFromTier(tier);
                    if (configured) return configured;
                    const lowerName = normalize(name);
                    return LEGACY_SPONSORS.find(entry => entry.match.some(term => lowerName.includes(normalize(term)))) || null;
                }

                function inferCategories(item) {
                    const name = String(item.displayName || item.companyName || item.organization || '').trim();
                    const normalizedName = normalize(name);
                    for (const [organization, categories] of Object.entries(SPONSOR_CATEGORY_OVERRIDES)) {
                        if (normalizedName.includes(normalize(organization))) return categories;
                    }
                    const rawCategories = safeArray(item.categories);
                    const sourceText = normalize([
                        name,
                        item.headline,
                        ...rawCategories,
                        ...safeArray(item.services),
                        ...safeArray(item.offers)
                    ].join(' '));
                    const mapped = new Set();
                    for (const category of rawCategories) {
                        const normalizedCategory = normalize(category);
                        const exactMeta = Object.keys(META_CATEGORIES).find(meta => normalize(meta) === normalizedCategory);
                        if (exactMeta) mapped.add(exactMeta);
                    }
                    for (const [meta, terms] of Object.entries(META_CATEGORIES)) {
                        if (terms.some(term => sourceText.includes(normalize(term)))) mapped.add(meta);
                    }
                    return [...mapped];
                }

                function toLegacyContact(item) {
                    const name = String(item.displayName || item.companyName || item.organization || 'Affiliate Member').trim();
                    const categories = inferCategories(item);
                    const languages = safeArray(item.languages);
                    const services = safeArray(item.services);
                    const offers = safeArray(item.offers);
                    const headline = String(item.headline || '').trim();
                    const city = String(item.city || '').trim();
                    const state = String(item.state || '').trim();
                    const primaryContact = String(item.representativeName || '').trim();
                    const searchIndex = normalize([
                        name, primaryContact, city, state, headline,
                        ...categories, ...languages, ...services, ...offers
                    ].join(' '));
                    return {
                        ContactId: Number(item.contactId) || 0,
                        Name: name,
                        PrimaryContact: primaryContact,
                        City: city,
                        State: state,
                        Phone: safePhone(item.phone),
                        EmailAddress: safeEmail(item.email),
                        Website: safeUrl(item.website),
                        ImageUrl: safeUrl(item.photoUrl),
                        _categories: categories,
                        _languages: languages,
                        _services: services,
                        _offers: offers,
                        _headline: headline,
                        _sponsor: determineSponsor(name, item.sponsorTier),
                        _updatedAt: item.updatedAt || null,
                        _searchIndex: searchIndex
                    };
                }

                async function fetchWithTimeout(url, options = {}) {
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
                    try {
                        return await fetch(url, { ...options, signal: controller.signal });
                    } finally {
                        clearTimeout(timer);
                    }
                }

                async function fetchApiPage(page) {
                    const url = new URL(DIRECTORY_API);
                    url.searchParams.set('type', 'affiliate');
                    url.searchParams.set('page', String(page));
                    url.searchParams.set('pageSize', String(API_PAGE_SIZE));
                    const response = await fetchWithTimeout(url.toString(), {
                        headers: { Accept: 'application/json' },
                        cache: 'no-store'
                    });
                    if (!response.ok) throw new Error(`The directory service returned ${response.status}.`);
                    return response.json();
                }

                async function fetchAffiliateIndex() {
                    statusLine.textContent = 'Loading indexed Affiliate memberships...';
                    loadingBar.style.width = '15%';
                    const first = await fetchApiPage(1);
                    const pages = Math.max(1, Number(first.pages) || 1);
                    const results = [...arrayValue(first.items)];
                    directoryMeta = {
                        version: Number(first.version) || 1,
                        updatedAt: first.updatedAt || null,
                        refreshedAt: first.refreshedAt || null
                    };
                    if (pages > 1) {
                        const remaining = Array.from({ length: pages - 1 }, (_, index) => index + 2);
                        for (let offset = 0; offset < remaining.length; offset += 4) {
                            const batchNumbers = remaining.slice(offset, offset + 4);
                            const batch = await Promise.all(batchNumbers.map(fetchApiPage));
                            batch.forEach(page => results.push(...arrayValue(page.items)));
                            loadingBar.style.width = `${20 + Math.round(((offset + batchNumbers.length) / remaining.length) * 70)}%`;
                            statusLine.textContent = `Building search index… ${results.length} records`;
                        }
                    }
                    const contacts = results.map(toLegacyContact).filter(item => item.ContactId && item.Name);
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), meta: directoryMeta, contacts }));
                    return contacts;
                }

                function readCachedIndex() {
                    try {
                        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
                        if (!cached || !Array.isArray(cached.contacts) || Date.now() - Number(cached.savedAt || 0) > CACHE_TTL_MS) return null;
                        directoryMeta = cached.meta || directoryMeta;
                        return cached.contacts;
                    } catch {
                        return null;
                    }
                }

                function sortAndPrioritizeContacts(contacts) {
                    return contacts.slice().sort((first, second) => {
                        const firstSponsor = first._sponsor?.weight || 0;
                        const secondSponsor = second._sponsor?.weight || 0;
                        if (secondSponsor !== firstSponsor) return secondSponsor - firstSponsor;
                        if (Boolean(second.ImageUrl) !== Boolean(first.ImageUrl)) return Number(Boolean(second.ImageUrl)) - Number(Boolean(first.ImageUrl));
                        return first.Name.localeCompare(second.Name, undefined, { sensitivity: 'base' });
                    });
                }

                function applyIndex(contacts, fromCache = false) {
                    allContacts = sortAndPrioritizeContacts(contacts);
                    displayedContacts = allContacts;
                    searchInput.disabled = false;
                    populateFilters(allContacts);
                    renderPage(1);
                    const suffix = fromCache ? ' · refreshing in background' : directoryMeta.updatedAt ? ` · updated ${formatDate(directoryMeta.updatedAt)}` : '';
                    statusLine.textContent = `Showing ${allContacts.length} indexed business partners${suffix}.`;
                }

                function formatDate(value) {
                    const date = new Date(value);
                    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                }

                async function initialize() {
                    document.querySelectorAll('.category-tile').forEach(tile => {
                        tile.setAttribute('role', 'button');
                        tile.setAttribute('tabindex', '0');
                        tile.addEventListener('keydown', event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                tile.click();
                            }
                        });
                    });
                    const cached = readCachedIndex();
                    if (cached) applyIndex(cached, true);
                    try {
                        const contacts = await fetchAffiliateIndex();
                        applyIndex(contacts, false);
                    } catch (error) {
                        loadingBar.style.width = '100%';
                        if (!cached) {
                            statusLine.textContent = 'Error loading directory. Please refresh the page.';
                            directoryGrid.innerHTML = `<div class="skeleton-card" style="height:auto;padding:2rem;grid-column:1/-1;"><strong>Directory temporarily unavailable.</strong><br>${escapeHtml(error.message)}</div>`;
                        } else {
                            statusLine.textContent = `Showing ${cached.length} cached business partners. Live refresh is temporarily unavailable.`;
                        }
                        console.error('Affiliate Directory error', error);
                    }
                }

                function populateFilters(contacts) {
                    const categories = new Set();
                    const languages = new Set();
                    contacts.forEach(contact => {
                        safeArray(contact._categories).forEach(category => categories.add(category));
                        safeArray(contact._languages).forEach(language => languages.add(language));
                    });
                    buildDropdown(filterCategoryList, filterCategoryInput, categories);
                    buildDropdown(filterLanguageList, filterLanguageInput, languages);
                }

                function buildDropdown(listElement, inputElement, values) {
                    listElement.innerHTML = '';
                    const all = document.createElement('div');
                    all.className = 'dropdown-item';
                    all.textContent = 'All';
                    all.setAttribute('role', 'option');
                    all.onclick = () => selectDropdownValue(inputElement, listElement, '');
                    listElement.appendChild(all);
                    [...values].sort((a, b) => a.localeCompare(b)).forEach(value => {
                        const option = document.createElement('div');
                        option.className = 'dropdown-item';
                        option.textContent = value;
                        option.setAttribute('role', 'option');
                        option.onclick = () => selectDropdownValue(inputElement, listElement, value);
                        listElement.appendChild(option);
                    });
                    listElement.setAttribute('role', 'listbox');
                }

                function selectDropdownValue(input, list, value) {
                    input.value = value;
                    list.classList.remove('open');
                    input.setAttribute('aria-expanded', 'false');
                    applyFilters();
                }

                function setupDropdown(input, list) {
                    input.setAttribute('aria-haspopup', 'listbox');
                    input.setAttribute('aria-expanded', 'false');
                    input.addEventListener('focus', () => openDropdown(input, list));
                    input.addEventListener('click', () => openDropdown(input, list));
                    input.addEventListener('input', () => {
                        openDropdown(input, list);
                        filterDropdown(input, list);
                        applyFilters();
                    });
                    input.addEventListener('keydown', event => {
                        if (event.key === 'Escape') {
                            list.classList.remove('open');
                            input.setAttribute('aria-expanded', 'false');
                        }
                    });
                }

                function openDropdown(input, list) {
                    document.querySelectorAll('.dropdown-list.open').forEach(open => {
                        if (open !== list) open.classList.remove('open');
                    });
                    list.classList.add('open');
                    input.setAttribute('aria-expanded', 'true');
                    filterDropdown(input, list);
                }

                function filterDropdown(input, list) {
                    const term = normalize(input.value);
                    Array.from(list.children).forEach(child => {
                        child.style.display = !term || normalize(child.textContent).includes(term) || child.textContent === 'All' ? 'block' : 'none';
                    });
                }

                window.selectTileCategory = (category, element) => {
                    const wasActive = element.classList.contains('active');
                    document.querySelectorAll('.category-tile').forEach(tile => tile.classList.remove('active'));
                    filterCategoryInput.value = wasActive ? '' : category;
                    if (!wasActive) element.classList.add('active');
                    searchInput.value = '';
                    filterCategoryList.classList.remove('open');
                    applyFilters();
                };

                function applyFilters() {
                    const term = normalize(searchInput.value);
                    const category = normalize(filterCategoryInput.value);
                    const language = normalize(filterLanguageInput.value);
                    document.querySelectorAll('.category-tile').forEach(tile => {
                        const label = normalize(tile.querySelector('.category-tile-label')?.textContent);
                        tile.classList.toggle('active', Boolean(category) && label === category);
                    });
                    displayedContacts = allContacts.filter(contact => {
                        if (term && !contact._searchIndex.includes(term)) return false;
                        if (category && !safeArray(contact._categories).some(value => normalize(value) === category)) return false;
                        if (language && !safeArray(contact._languages).some(value => normalize(value).includes(language))) return false;
                        return true;
                    });
                    statusLine.textContent = `Showing ${displayedContacts.length} of ${allContacts.length} indexed business partners.`;
                    renderPage(1);
                }

                function renderPage(page) {
                    currentPage = Math.max(1, page);
                    const start = (currentPage - 1) * ITEMS_PER_PAGE;
                    const contacts = displayedContacts.slice(start, start + ITEMS_PER_PAGE);
                    loadingBar.style.width = '100%';
                    loadingContainer.style.display = 'none';
                    directoryGrid.innerHTML = '';
                    if (!contacts.length) {
                        directoryGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;background:#fff;border:1px solid var(--border-color);border-radius:12px;"><h3>No business partners match these filters.</h3><p>Try a broader search or choose All.</p></div>';
                        paginationDiv.innerHTML = '';
                        return;
                    }
                    contacts.forEach((contact, index) => {
                        const card = document.createElement('article');
                        card.className = 'agent-card';
                        card.style.animationDelay = `${Math.min(index, 12) * 30}ms`;
                        const categoryHtml = safeArray(contact._categories).map(category => `<div class="category-badge">${escapeHtml(category)}</div>`).join(' ');
                        const badgeHtml = contact._sponsor ? `<div class="sponsor-badge ${escapeHtml(contact._sponsor.class)}">${escapeHtml(contact._sponsor.label)}</div>` : '';
                        const cityState = [contact.City || 'Bonita Springs', contact.State || 'FL'].filter(Boolean).join(', ');
                        card.innerHTML = `<div class="card-header"><div class="avatar">${contact.ImageUrl ? `<img src="${escapeHtml(contact.ImageUrl)}" alt="${escapeHtml(contact.Name)}" loading="lazy" decoding="async">` : ''}</div><div class="info">${badgeHtml}<h3 class="agent-name">${escapeHtml(contact.Name)}</h3><div class="category-list">${categoryHtml}</div></div></div><div class="card-body"><div class="detail-row"><i class="fas fa-map-marker-alt" aria-hidden="true"></i><span>${escapeHtml(cityState)}</span></div>${contact.Phone ? `<div class="detail-row"><i class="fas fa-phone" aria-hidden="true"></i><a href="tel:${escapeHtml(contact.Phone.replace(/[^+\d]/g, ''))}" class="contact-link">${escapeHtml(contact.Phone)}</a></div>` : ''}${contact.EmailAddress ? `<div class="detail-row"><i class="fas fa-envelope" aria-hidden="true"></i><a href="mailto:${escapeHtml(contact.EmailAddress)}" class="contact-link">${escapeHtml(contact.EmailAddress)}</a></div>` : ''}</div><div class="card-actions"><button class="btn btn-primary" type="button" data-open-affiliate="${contact.ContactId}" aria-label="View details for ${escapeHtml(contact.Name)}">View Details</button></div>`;
                        directoryGrid.appendChild(card);
                    });
                    directoryGrid.querySelectorAll('[data-open-affiliate]').forEach(button => {
                        button.addEventListener('click', () => openModal(Number(button.dataset.openAffiliate), button));
                    });
                    renderPagination(Math.ceil(displayedContacts.length / ITEMS_PER_PAGE));
                }

                function renderPagination(totalPages) {
                    paginationDiv.innerHTML = '';
                    if (totalPages <= 1) return;
                    const pages = [{ label: 'Previous', page: currentPage - 1, disabled: currentPage === 1 }];
                    for (let page = 1; page <= totalPages; page += 1) pages.push({ label: String(page), page, current: page === currentPage });
                    pages.push({ label: 'Next', page: currentPage + 1, disabled: currentPage === totalPages });
                    pages.forEach(item => {
                        const button = document.createElement('button');
                        button.className = `page-btn ${item.current ? 'active' : ''}`;
                        button.textContent = item.label;
                        button.disabled = Boolean(item.disabled);
                        if (item.current) button.setAttribute('aria-current', 'page');
                        button.onclick = () => {
                            renderPage(item.page);
                            document.querySelector('.controls')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        };
                        paginationDiv.appendChild(button);
                    });
                }

                function modalTags(values) {
                    return safeArray(values).map(value => `<span class="modal-tag">${escapeHtml(value)}</span>`).join('');
                }

                function youtubeEmbed(value) {
                    try {
                        const url = new URL(safeUrl(value));
                        let id = '';
                        if (url.hostname.includes('youtu.be')) id = url.pathname.split('/').filter(Boolean)[0] || '';
                        else if (url.hostname.includes('youtube.com')) id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop() || '';
                        return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : '';
                    } catch {
                        return '';
                    }
                }

                function mediaSections(profile) {
                    const sections = [];
                    const services = safeArray(profile.services);
                    const offers = safeArray(profile.offers);
                    const gallery = arrayValue(profile.gallery);
                    const documents = arrayValue(profile.documents);
                    const videos = arrayValue(profile.youtube);
                    if (services.length) sections.push(`<div class="modal-section"><div class="modal-section-title">Services</div><div class="modal-tags">${modalTags(services)}</div></div>`);
                    if (offers.length) sections.push(`<div class="modal-section"><div class="modal-section-title">Offers and Member Benefits</div><div class="modal-bio">${offers.map(item => `<div style="margin-bottom:.4rem;">${escapeHtml(item)}</div>`).join('')}</div></div>`);
                    if (gallery.length) {
                        const images = gallery.map(item => {
                            const url = safeUrl(item.url);
                            if (!url) return '';
                            return `<figure style="display:inline-block;margin:.25rem;vertical-align:top;max-width:150px;"><a href="${escapeHtml(url)}" target="_blank" rel="noopener"><img src="${escapeHtml(url)}" alt="${escapeHtml(item.altText || item.title || profile.displayName || 'Affiliate image')}" loading="lazy" style="width:140px;height:96px;object-fit:cover;border-radius:8px;"></a>${item.caption ? `<figcaption style="font-size:.75rem;color:var(--text-secondary);margin-top:.25rem;">${escapeHtml(item.caption)}</figcaption>` : ''}</figure>`;
                        }).join('');
                        if (images) sections.push(`<div class="modal-section"><div class="modal-section-title">Gallery</div>${images}</div>`);
                    }
                    const embeds = videos.map(item => youtubeEmbed(item.url || item)).filter(Boolean).map(src => `<iframe src="${escapeHtml(src)}" title="Affiliate video" loading="lazy" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:10px;margin-bottom:.75rem;"></iframe>`).join('');
                    if (embeds) sections.push(`<div class="modal-section"><div class="modal-section-title">Videos</div>${embeds}</div>`);
                    if (documents.length) {
                        const links = documents.map(item => ({ label: item.title || 'Affiliate resource (PDF)', url: safeUrl(item.url) })).filter(item => item.url).map(item => `<div class="modal-detail-item full"><i class="fas fa-file-pdf" aria-hidden="true"></i><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.label)}</a></div>`).join('');
                        if (links) sections.push(`<div class="modal-section"><div class="modal-section-title">Resources</div><div class="modal-detail-grid">${links}</div></div>`);
                    }
                    return sections.join('');
                }

                async function openModal(id, trigger) {
                    const basic = allContacts.find(contact => contact.ContactId === id);
                    lastFocusedElement = trigger || document.activeElement;
                    modal.classList.add('open');
                    modal.setAttribute('role', 'dialog');
                    modal.setAttribute('aria-modal', 'true');
                    modal.setAttribute('aria-label', basic ? `Affiliate profile for ${basic.Name}` : 'Affiliate profile');
                    document.body.style.overflow = 'hidden';
                    modalBody.innerHTML = '<div class="modal-spinner" aria-label="Loading Affiliate profile"></div>';
                    modalClose.focus();
                    try {
                        const response = await fetchWithTimeout(`${DIRECTORY_API}/${encodeURIComponent(id)}?type=affiliate`, {
                            headers: { Accept: 'application/json' },
                            cache: 'no-store'
                        });
                        if (!response.ok) throw new Error('The Affiliate profile could not be loaded.');
                        const payload = await response.json();
                        const profile = payload.profile || {};
                        const name = profile.displayName || basic?.Name || 'Affiliate Member';
                        const photo = safeUrl(profile.photoUrl || basic?.ImageUrl);
                        const categories = inferCategories({ ...profile, displayName: name, categories: profile.categories?.length ? profile.categories : basic?._categories });
                        const badge = determineSponsor(name, profile.sponsorTier) || basic?._sponsor;
                        const representative = String(profile.representativeName || basic?.PrimaryContact || '').trim();
                        const phone = safePhone(profile.phone || basic?.Phone);
                        const email = safeEmail(profile.email || basic?.EmailAddress);
                        const website = safeUrl(profile.website || basic?.Website);
                        const bio = String(profile.bio || '').trim();
                        const badgeHtml = badge ? `<div class="sponsor-badge ${escapeHtml(badge.class)}" style="margin-bottom:0.5rem;">${escapeHtml(badge.label)}</div>` : '';
                        const professional = representative ? `<div class="modal-section"><div class="modal-section-title">Affiliated Professionals</div><div class="directory-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));margin-top:1rem;"><div class="agent-card" style="animation:none;opacity:1;transform:none;min-width:250px;"><div class="card-header" style="flex:1;"><div class="avatar"></div><div class="info"><div class="sponsor-badge" style="background:var(--secondary);margin-bottom:0.5rem;font-size:0.75rem;">Primary Contact</div><h3 class="agent-name" style="font-size:1.1rem;margin-bottom:0.5rem;">${escapeHtml(representative)}</h3><div class="category-list">${categories.map(category => `<div class="category-badge">${escapeHtml(category)}</div>`).join(' ')}</div></div></div></div></div></div>` : '';
                        modalBody.innerHTML = `<div class="modal-hero"><div class="modal-avatar">${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" style="width:100%;height:100%;object-fit:contain;">` : ''}</div><div class="modal-hero-info">${badgeHtml}<h2>${escapeHtml(name)}</h2><div class="office-label">${categories.map(escapeHtml).join(' · ')}</div></div></div>${bio ? `<div class="modal-section"><div class="modal-section-title">About</div><div class="modal-bio">${escapeHtml(bio).replace(/\n/g, '<br>')}</div></div>` : ''}${professional}${mediaSections(profile)}<div class="modal-section"><div class="modal-section-title">Contact Information</div><div class="modal-detail-grid">${phone ? `<div class="modal-detail-item"><i class="fas fa-phone" aria-hidden="true"></i><a href="tel:${escapeHtml(phone.replace(/[^+\d]/g, ''))}">${escapeHtml(phone)}</a></div>` : ''}${email ? `<div class="modal-detail-item"><i class="fas fa-envelope" aria-hidden="true"></i><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div>` : ''}${website ? `<div class="modal-detail-item full"><i class="fas fa-globe" aria-hidden="true"></i><a href="${escapeHtml(website)}" target="_blank" rel="noopener">${escapeHtml(website)}</a></div>` : ''}</div></div><div class="modal-actions">${email ? `<a href="mailto:${escapeHtml(email)}" class="btn btn-primary">Send Message</a>` : ''}<button class="btn-outline" type="button" data-close-affiliate style="flex:1;">Close</button></div>`;
                        modalBody.querySelector('[data-close-affiliate]')?.addEventListener('click', closeModal);
                    } catch (error) {
                        modalBody.innerHTML = `<div style="padding:4rem 2rem;text-align:center;"><strong>Error loading details.</strong><br>${escapeHtml(error.message)}<br><button class="btn btn-primary" type="button" data-retry-affiliate style="margin-top:1rem;">Try Again</button></div>`;
                        modalBody.querySelector('[data-retry-affiliate]')?.addEventListener('click', () => openModal(id, trigger));
                    }
                }

                function closeModal() {
                    modal.classList.remove('open');
                    modal.removeAttribute('aria-modal');
                    document.body.style.overflow = '';
                    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
                }

                modalClose.onclick = closeModal;
                modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
                document.addEventListener('click', event => {
                    if (!event.target.closest('.dropdown-container')) {
                        document.querySelectorAll('.dropdown-list.open').forEach(list => list.classList.remove('open'));
                        [filterCategoryInput, filterLanguageInput].forEach(input => input.setAttribute('aria-expanded', 'false'));
                    }
                });
                document.addEventListener('keydown', event => {
                    if (event.key === 'Escape' && modal.classList.contains('open')) closeModal();
                });
                searchInput.addEventListener('input', applyFilters);
                setupDropdown(filterCategoryInput, filterCategoryList);
                setupDropdown(filterLanguageInput, filterLanguageList);
                document.addEventListener('DOMContentLoaded', initialize, { once: true });
                if (document.readyState !== 'loading') initialize();
            })();