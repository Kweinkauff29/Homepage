            (function () {
                'use strict';

                const DIRECTORY_API = 'https://ccor-member-hub-prototype.bonitaspringsrealtors.workers.dev/api/public/directory';
                const API_PAGE_SIZE = 100;
                const ITEMS_PER_PAGE = 50;

                const searchInput = document.getElementById('searchInput');
                const directoryGrid = document.getElementById('directoryGrid');
                const statusLine = document.getElementById('statusLine');
                const loadingBar = document.getElementById('loadingBar');
                const paginationDiv = document.getElementById('pagination');
                const filterCategoryInput = document.getElementById('filterCategoryInput');
                const filterCategoryList = document.getElementById('categoryList');
                const filterLanguageInput = document.getElementById('filterLanguageInput');
                const filterLanguageList = document.getElementById('languageList');

                let allContacts = [];
                let displayedContacts = [];
                let currentPage = 1;

                const META_CATEGORIES = {
                    "Title & Escrow": ["Title Company", "Transaction Services", "Association Only"],
                    "Mortgage & Finance": ["Mortgage Lender", "Bank", "Accountant", "Wealth Management"],
                    "Legal": ["Lawyer/Attorney"],
                    "Insurance": ["Insurance"],
                    "Property Inspections": ["Home Inspector", "Appraisers", "Mold/Radon"],
                    "Construction & Roofing": ["Construction", "Contractor", "Home Builder", "Renovation", "Roofing", "Windows/Shutters"],
                    "Home Maintenance": ["Air Conditioning", "Plumbing", "Painter", "Exterminators", "Disinfecting/Odor Removal"],
                    "Moving & Interiors": ["Moving/Packing", "Home Furnishings", "Appliances"],
                    "Marketing & Technology": ["Photography/Drone", "Marketing/Advertising", "Internet Solutions", "Wifi", "Coaching", "Real Estate Schools"],
                    "Lifestyle & Property": ["Rentals", "Vacation Rentals", "Country Clubs", "Home Watch"]
                };

                const SPONSOR_CATEGORY_OVERRIDES = {
                    "Law Office of Sam Saad III": ["Legal"],
                    "Samuel Saad III": ["Legal"],
                    "Woods, Weidenmiller, Michetti & Rudnick, LLP": ["Legal"],
                    "State Insurance USA": ["Insurance"],
                    "Chapman Insurance Group": ["Insurance"],
                    "Lane Insurance Group": ["Insurance"],
                    "Sunrise Insurance Group": ["Insurance"],
                    "John Galt Insurance": ["Insurance"],
                    "Cottrell Title": ["Title & Escrow"],
                    "Venture Title Services": ["Title & Escrow"],
                    "First Source Title": ["Title & Escrow"],
                    "Heights Title Services": ["Title & Escrow"],
                    "Movement Mortgage": ["Mortgage & Finance"],
                    "Premium Mortgage Corporation": ["Mortgage & Finance"],
                    "Revolution Mortgage": ["Mortgage & Finance"],
                    "Lower Mortgage": ["Mortgage & Finance"],
                    "Motto Mortgage": ["Mortgage & Finance"],
                    "BREH Funding": ["Mortgage & Finance"],
                    "Loan Depot": ["Mortgage & Finance"],
                    "Wells Fargo": ["Mortgage & Finance"],
                    "Centennial Mortgage": ["Mortgage & Finance"],
                    "Hilton Moving & Storage LLC": ["Moving & Interiors"],
                    "HouseMaster": ["Property Inspections"],
                    "HouseMaster Home Inspections": ["Property Inspections"],
                    "Joe the Home Pro": ["Property Inspections"],
                    "239 Inspection Services": ["Property Inspections"],
                    "The Appraisal Shoppe": ["Property Inspections"],
                    "Hughes Exterminators": ["Home Maintenance"],
                    "David Meiser Locksmith": ["Home Maintenance"],
                    "Frame & Form Studio": ["Marketing & Technology"],
                    "Leverage 365": ["Marketing & Technology"],
                    "Ares": ["Marketing & Technology"],
                    "WBN Marketing": ["Marketing & Technology"],
                    "Larson Educational Services": ["Marketing & Technology"],
                    "Photography by David Michael": ["Marketing & Technology"]
                };

                const LEGACY_SPONSORS = [
                    { match: ["saad", "state insurance", "movement mortgage", "chapman insurance", "weidenmiller"], type: "diamond", label: "Diamond Partner", class: "sponsor-diamond", weight: 5 },
                    { match: ["cottrell", "housemaster"], type: "platinum", label: "Platinum Partner", class: "sponsor-platinum", weight: 4 },
                    { match: ["premium mortgage", "lane insurance"], type: "gold", label: "Gold Partner", class: "sponsor-gold", weight: 3 },
                    { match: ["hilton moving", "lower mortgage", "revolution mortgage"], type: "silver", label: "Silver Partner", class: "sponsor-silver", weight: 2 },
                    { match: ["frame & form", "frame form", "frame and form"], type: "photo", label: "Photography Partner", class: "sponsor-photo", weight: 1 }
                ];

                function escapeHtml(value) {
                    return String(value ?? '').replace(/[&<>"']/g, char => ({
                        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
                    })[char]);
                }

                function safeUrl(value) {
                    try {
                        const url = new URL(String(value || '').trim());
                        return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
                    } catch {
                        return '';
                    }
                }

                function safeEmail(value) {
                    const email = String(value || '').trim();
                    return /^\S+@\S+\.\S+$/.test(email) ? email : '';
                }

                function safePhone(value) {
                    return String(value || '').replace(/[^+()\-.\s\d]/g, '').trim().slice(0, 40);
                }

                function safeArray(value) {
                    return Array.isArray(value) ? value.map(item => String(item || '').trim()).filter(Boolean) : [];
                }

                function sponsorFromTier(tier) {
                    const type = String(tier || '').trim().toLowerCase();
                    const map = {
                        diamond: { type, label: 'Diamond Partner', class: 'sponsor-diamond', weight: 5 },
                        platinum: { type, label: 'Platinum Partner', class: 'sponsor-platinum', weight: 4 },
                        gold: { type, label: 'Gold Partner', class: 'sponsor-gold', weight: 3 },
                        silver: { type, label: 'Silver Partner', class: 'sponsor-silver', weight: 2 },
                        photo: { type, label: 'Photography Partner', class: 'sponsor-photo', weight: 1 },
                        photography: { type: 'photo', label: 'Photography Partner', class: 'sponsor-photo', weight: 1 },
                        partner: { type, label: 'CCOR Partner', class: 'sponsor-photo', weight: 1 }
                    };
                    return map[type] || null;
                }

                function determineSponsor(name, tier) {
                    const fromTier = sponsorFromTier(tier);
                    if (fromTier) return fromTier;
                    const lowerName = String(name || '').toLowerCase();
                    return LEGACY_SPONSORS.find(entry => entry.match.some(term => lowerName.includes(term))) || null;
                }

                function mapCategories(name, categories) {
                    const source = safeArray(categories);
                    const mapped = new Set();

                    for (const [organization, overrideCategories] of Object.entries(SPONSOR_CATEGORY_OVERRIDES)) {
                        if (String(name || '').toLowerCase().includes(organization.toLowerCase())) {
                            overrideCategories.forEach(category => mapped.add(category));
                            return [...mapped];
                        }
                    }

                    source.forEach(category => {
                        if (META_CATEGORIES[category]) {
                            mapped.add(category);
                            return;
                        }
                        let matched = false;
                        for (const [meta, specific] of Object.entries(META_CATEGORIES)) {
                            if (specific.some(value => value.toLowerCase() === category.toLowerCase())) {
                                mapped.add(meta);
                                matched = true;
                                break;
                            }
                        }
                        if (!matched) {
                            const lower = category.toLowerCase();
                            if (lower.includes('inspect') || lower.includes('apprais') || lower.includes('mold') || lower.includes('radon')) mapped.add('Property Inspections');
                            else if (lower.includes('title') || lower.includes('escrow') || lower.includes('transaction')) mapped.add('Title & Escrow');
                            else if (lower.includes('mortgage') || lower.includes('bank') || lower.includes('finance') || lower.includes('account')) mapped.add('Mortgage & Finance');
                            else if (lower.includes('legal') || lower.includes('law') || lower.includes('attorney')) mapped.add('Legal');
                            else if (lower.includes('insurance')) mapped.add('Insurance');
                            else if (lower.includes('roof') || lower.includes('construction') || lower.includes('builder') || lower.includes('renovation')) mapped.add('Construction & Roofing');
                            else if (lower.includes('plumb') || lower.includes('air condition') || lower.includes('pest') || lower.includes('paint') || lower.includes('locksmith')) mapped.add('Home Maintenance');
                            else if (lower.includes('moving') || lower.includes('furnish') || lower.includes('interior')) mapped.add('Moving & Interiors');
                            else if (lower.includes('photo') || lower.includes('marketing') || lower.includes('technology') || lower.includes('internet') || lower.includes('school')) mapped.add('Marketing & Technology');
                            else mapped.add('Lifestyle & Property');
                        }
                    });

                    return [...mapped];
                }

                function toLegacyContact(item) {
                    const name = String(item.displayName || item.companyName || item.organization || 'Affiliate Member').trim();
                    return {
                        ContactId: Number(item.contactId) || 0,
                        Name: name,
                        PrimaryContact: String(item.representativeName || '').trim(),
                        City: String(item.city || '').trim(),
                        State: String(item.state || '').trim(),
                        Phone: safePhone(item.phone),
                        EmailAddress: safeEmail(item.email),
                        Website: safeUrl(item.website),
                        ImageUrl: safeUrl(item.photoUrl),
                        _categories: mapCategories(name, item.categories),
                        _languages: safeArray(item.languages).join(', '),
                        _services: safeArray(item.services),
                        _offers: safeArray(item.offers),
                        _headline: String(item.headline || '').trim(),
                        _sponsor: determineSponsor(name, item.sponsorTier),
                        _updatedAt: item.updatedAt || null
                    };
                }

                async function fetchApiPage(page) {
                    const url = new URL(DIRECTORY_API);
                    url.searchParams.set('type', 'affiliate');
                    url.searchParams.set('page', String(page));
                    url.searchParams.set('pageSize', String(API_PAGE_SIZE));
                    const response = await fetch(url.toString(), {
                        headers: { Accept: 'application/json' },
                        cache: 'no-store'
                    });
                    if (!response.ok) throw new Error(`The directory service returned ${response.status}.`);
                    return response.json();
                }

                async function fetchAffiliates() {
                    statusLine.textContent = 'Loading indexed Affiliate memberships...';
                    loadingBar.style.width = '20%';
                    const first = await fetchApiPage(1);
                    const pages = Math.max(1, Number(first.pages) || 1);
                    const results = [...(first.items || [])];

                    for (let start = 2; start <= pages; start += 4) {
                        const pageNumbers = Array.from({ length: Math.min(4, pages - start + 1) }, (_, index) => start + index);
                        const batch = await Promise.all(pageNumbers.map(fetchApiPage));
                        batch.forEach(page => results.push(...(page.items || [])));
                        const completed = Math.min(pages, start + pageNumbers.length - 1);
                        loadingBar.style.width = `${20 + Math.round((completed / pages) * 70)}%`;
                        statusLine.textContent = `Loading indexed categories and languages… ${results.length} records`;
                    }

                    return results.map(toLegacyContact).filter(item => item.ContactId && item.Name);
                }

                function sortAndPrioritizeContacts(contacts) {
                    return contacts.map(contact => {
                        let score = 10;
                        if (contact._sponsor) score = 100 + contact._sponsor.weight;
                        else if (contact.ImageUrl) score = 50;
                        return { ...contact, _score: score, _r: Math.random() };
                    }).sort((first, second) => {
                        if (second._score !== first._score) return second._score - first._score;
                        return second._r - first._r;
                    });
                }

                document.addEventListener('DOMContentLoaded', async () => {
                    try {
                        const contacts = await fetchAffiliates();
                        allContacts = sortAndPrioritizeContacts(contacts);
                        displayedContacts = allContacts;
                        statusLine.textContent = `Showing ${allContacts.length} business partners.`;
                        searchInput.disabled = false;
                        populateFilters(allContacts);
                        renderPage(1);
                        searchInput.addEventListener('input', applyFilters);
                        setupDropdown(filterCategoryInput, filterCategoryList);
                        setupDropdown(filterLanguageInput, filterLanguageList);
                    } catch (error) {
                        loadingBar.style.width = '100%';
                        statusLine.textContent = 'Error loading directory. Please refresh the page.';
                        directoryGrid.innerHTML = `<div class="skeleton-card" style="height:auto;padding:2rem;grid-column:1/-1;"><strong>Directory temporarily unavailable.</strong><br>${escapeHtml(error.message)}</div>`;
                        console.error('Affiliate Directory error', error);
                    }
                });

                function populateFilters(contacts) {
                    const categories = new Set();
                    const languages = new Set();
                    contacts.forEach(contact => {
                        (contact._categories || []).forEach(category => categories.add(category));
                        if (contact._languages) contact._languages.split(',').map(item => item.trim()).filter(Boolean).forEach(language => languages.add(language));
                    });
                    buildDropdown(filterCategoryList, filterCategoryInput, categories);
                    buildDropdown(filterLanguageList, filterLanguageInput, languages);
                }

                function buildDropdown(listElement, inputElement, values) {
                    listElement.innerHTML = '<div class="dropdown-item">All</div>';
                    [...values].sort().forEach(value => {
                        const option = document.createElement('div');
                        option.className = 'dropdown-item';
                        option.textContent = value;
                        option.onclick = () => {
                            inputElement.value = value;
                            listElement.classList.remove('open');
                            applyFilters();
                        };
                        listElement.appendChild(option);
                    });
                    listElement.firstChild.onclick = () => {
                        inputElement.value = '';
                        listElement.classList.remove('open');
                        applyFilters();
                    };
                }

                function setupDropdown(input, list) {
                    input.addEventListener('focus', () => {
                        list.classList.add('open');
                        filterDropdown(input, list);
                    });
                    input.addEventListener('input', () => {
                        filterDropdown(input, list);
                        applyFilters();
                    });
                    document.addEventListener('click', event => {
                        if (!event.target.closest('.dropdown-container')) list.classList.remove('open');
                    });
                }

                function filterDropdown(input, list) {
                    const term = input.value.toLowerCase();
                    Array.from(list.children).forEach(child => {
                        child.style.display = child.textContent.toLowerCase().includes(term) || child.textContent === 'All' ? 'block' : 'none';
                    });
                }

                window.selectTileCategory = (category, element) => {
                    const tiles = document.querySelectorAll('.category-tile');
                    const wasActive = element.classList.contains('active');
                    tiles.forEach(tile => tile.classList.remove('active'));
                    filterCategoryInput.value = wasActive ? '' : category;
                    if (!wasActive) element.classList.add('active');
                    searchInput.value = '';
                    filterCategoryList.classList.remove('open');
                    applyFilters();
                };

                function applyFilters() {
                    const term = searchInput.value.toLowerCase().trim();
                    const category = filterCategoryInput.value.toLowerCase().trim();
                    const language = filterLanguageInput.value.toLowerCase().trim();

                    document.querySelectorAll('.category-tile').forEach(tile => {
                        const label = tile.querySelector('.category-tile-label')?.textContent.toLowerCase() || '';
                        tile.classList.toggle('active', Boolean(category) && label === category);
                    });

                    displayedContacts = allContacts.filter(contact => {
                        const searchable = [
                            contact.Name,
                            contact.PrimaryContact,
                            contact._headline,
                            ...(contact._categories || []),
                            ...(contact._services || []),
                            ...(contact._offers || [])
                        ].join(' ').toLowerCase();
                        if (term && !searchable.includes(term)) return false;
                        if (category && !(contact._categories || []).some(value => value.toLowerCase() === category)) return false;
                        if (language && !String(contact._languages || '').toLowerCase().includes(language)) return false;
                        return true;
                    });

                    statusLine.textContent = `Showing ${displayedContacts.length} of ${allContacts.length} business partners.`;
                    renderPage(1);
                }

                function renderPage(page) {
                    currentPage = page;
                    const start = (page - 1) * ITEMS_PER_PAGE;
                    const contacts = displayedContacts.slice(start, start + ITEMS_PER_PAGE);
                    loadingBar.style.width = '100%';
                    document.getElementById('loadingContainer').style.display = 'none';
                    directoryGrid.innerHTML = '';

                    if (!contacts.length) {
                        directoryGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;background:#fff;border:1px solid var(--border-color);border-radius:12px;"><h3>No business partners match these filters.</h3><p>Try a broader search or choose All.</p></div>';
                        paginationDiv.innerHTML = '';
                        return;
                    }

                    contacts.forEach((contact, index) => {
                        const card = document.createElement('div');
                        card.className = 'agent-card';
                        card.style.animationDelay = `${index * 30}ms`;
                        const categoryHtml = (contact._categories || []).map(category => `<div class="category-badge">${escapeHtml(category)}</div>`).join(' ');
                        const badgeHtml = contact._sponsor ? `<div class="sponsor-badge ${escapeHtml(contact._sponsor.class)}">${escapeHtml(contact._sponsor.label)}</div>` : '';
                        const cityState = [contact.City || 'Bonita Springs', contact.State || 'FL'].filter(Boolean).join(', ');

                        card.innerHTML = `
                            <div class="card-header">
                                <div class="avatar">${contact.ImageUrl ? `<img src="${escapeHtml(contact.ImageUrl)}" alt="${escapeHtml(contact.Name)}">` : ''}</div>
                                <div class="info">
                                    ${badgeHtml}
                                    <h3 class="agent-name">${escapeHtml(contact.Name)}</h3>
                                    <div class="category-list">${categoryHtml}</div>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="detail-row"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(cityState)}</span></div>
                                ${contact.Phone ? `<div class="detail-row"><i class="fas fa-phone"></i><a href="tel:${escapeHtml(contact.Phone.replace(/[^+\d]/g, ''))}" class="contact-link">${escapeHtml(contact.Phone)}</a></div>` : ''}
                                ${contact.EmailAddress ? `<div class="detail-row"><i class="fas fa-envelope"></i><a href="mailto:${escapeHtml(contact.EmailAddress)}" class="contact-link">${escapeHtml(contact.EmailAddress)}</a></div>` : ''}
                            </div>
                            <div class="card-actions">
                                <button class="btn btn-primary" type="button" data-open-affiliate="${contact.ContactId}">View Details</button>
                            </div>`;
                        directoryGrid.appendChild(card);
                    });

                    directoryGrid.querySelectorAll('[data-open-affiliate]').forEach(button => {
                        button.addEventListener('click', () => window.openModal(Number(button.dataset.openAffiliate)));
                    });
                    renderPagination(Math.ceil(displayedContacts.length / ITEMS_PER_PAGE));
                }

                function renderPagination(totalPages) {
                    paginationDiv.innerHTML = '';
                    if (totalPages <= 1) return;
                    for (let page = 1; page <= totalPages; page += 1) {
                        const button = document.createElement('button');
                        button.className = `page-btn ${page === currentPage ? 'active' : ''}`;
                        button.textContent = page;
                        button.onclick = () => {
                            window.scrollTo(0, 0);
                            renderPage(page);
                        };
                        paginationDiv.appendChild(button);
                    }
                }

                function modalTags(values) {
                    return safeArray(values).map(value => `<span class="modal-tag">${escapeHtml(value)}</span>`).join('');
                }

                function mediaSections(profile) {
                    const sections = [];
                    const services = safeArray(profile.services);
                    const offers = safeArray(profile.offers);
                    const gallery = safeArray(profile.gallery);
                    const documents = safeArray(profile.documents);
                    const videos = safeArray(profile.youtube);

                    if (services.length) {
                        sections.push(`<div class="modal-section"><div class="modal-section-title">Services</div><div class="modal-tags">${modalTags(services)}</div></div>`);
                    }
                    if (offers.length) {
                        sections.push(`<div class="modal-section"><div class="modal-section-title">Offers and Member Benefits</div><div class="modal-bio">${offers.map(item => `<div style="margin-bottom:.4rem;">${escapeHtml(item)}</div>`).join('')}</div></div>`);
                    }
                    if (gallery.length) {
                        const images = gallery.map(item => {
                            const url = safeUrl(item.url);
                            if (!url) return '';
                            return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" style="display:inline-block;margin:.25rem;"><img src="${escapeHtml(url)}" alt="${escapeHtml(item.altText || item.title || profile.displayName || 'Affiliate image')}" style="width:92px;height:72px;object-fit:cover;border-radius:8px;"></a>`;
                        }).join('');
                        if (images) sections.push(`<div class="modal-section"><div class="modal-section-title">Gallery</div>${images}</div>`);
                    }
                    if (documents.length || videos.length) {
                        const links = [
                            ...documents.map(item => ({ label: item.title || 'Affiliate resource (PDF)', url: safeUrl(item.url) })),
                            ...videos.map(item => ({ label: item.title || 'Affiliate video', url: safeUrl(item.url || item) }))
                        ].filter(item => item.url).map(item => `<div class="modal-detail-item full"><i class="fas fa-external-link-alt"></i><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.label)}</a></div>`).join('');
                        if (links) sections.push(`<div class="modal-section"><div class="modal-section-title">Resources</div><div class="modal-detail-grid">${links}</div></div>`);
                    }
                    return sections.join('');
                }

                window.openModal = async id => {
                    const overlay = document.getElementById('agentModal');
                    const body = document.getElementById('modalBody');
                    const basic = allContacts.find(contact => contact.ContactId === id);
                    overlay.classList.add('open');
                    document.body.style.overflow = 'hidden';
                    body.innerHTML = '<div class="modal-spinner"></div>';

                    try {
                        const response = await fetch(`${DIRECTORY_API}/${encodeURIComponent(id)}?type=affiliate`, {
                            headers: { Accept: 'application/json' },
                            cache: 'no-store'
                        });
                        if (!response.ok) throw new Error('The Affiliate profile could not be loaded.');
                        const payload = await response.json();
                        const profile = payload.profile || {};
                        const name = profile.displayName || basic?.Name || 'Affiliate Member';
                        const photo = safeUrl(profile.photoUrl || basic?.ImageUrl);
                        const categories = mapCategories(name, profile.categories?.length ? profile.categories : basic?._categories);
                        const badge = determineSponsor(name, profile.sponsorTier) || basic?._sponsor;
                        const badgeHtml = badge ? `<div class="sponsor-badge ${escapeHtml(badge.class)}" style="margin-bottom:0.5rem;">${escapeHtml(badge.label)}</div>` : '';
                        const representative = String(profile.representativeName || basic?.PrimaryContact || '').trim();
                        const phone = safePhone(profile.phone || basic?.Phone);
                        const email = safeEmail(profile.email || basic?.EmailAddress);
                        const website = safeUrl(profile.website || basic?.Website);
                        const bio = String(profile.bio || '').trim();

                        let affiliatedHtml = '';
                        if (representative) {
                            affiliatedHtml = `
                                <div class="modal-section">
                                    <div class="modal-section-title">Affiliated Professionals</div>
                                    <div class="directory-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));margin-top:1rem;">
                                        <div class="agent-card" style="animation:none;opacity:1;transform:none;min-width:250px;">
                                            <div class="card-header" style="flex:1;">
                                                <div class="avatar">${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(representative)}">` : ''}</div>
                                                <div class="info">
                                                    <div class="sponsor-badge" style="background:var(--secondary);margin-bottom:0.5rem;font-size:0.75rem;">Primary Contact</div>
                                                    <h3 class="agent-name" style="font-size:1.1rem;margin-bottom:0.5rem;">${escapeHtml(representative)}</h3>
                                                    <div class="category-list">${categories.map(category => `<div class="category-badge">${escapeHtml(category)}</div>`).join(' ')}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>`;
                        }

                        body.innerHTML = `
                            <div class="modal-hero">
                                <div class="modal-avatar">${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" style="width:100%;height:100%;object-fit:contain;">` : ''}</div>
                                <div class="modal-hero-info">
                                    ${badgeHtml}
                                    <h2>${escapeHtml(name)}</h2>
                                    <div class="office-label">${categories.map(escapeHtml).join(' · ')}</div>
                                </div>
                            </div>
                            ${bio ? `<div class="modal-section"><div class="modal-section-title">About</div><div class="modal-bio">${escapeHtml(bio).replace(/\n/g, '<br>')}</div></div>` : ''}
                            ${affiliatedHtml}
                            ${mediaSections(profile)}
                            <div class="modal-section">
                                <div class="modal-section-title">Contact Information</div>
                                <div class="modal-detail-grid">
                                    ${phone ? `<div class="modal-detail-item"><i class="fas fa-phone"></i><a href="tel:${escapeHtml(phone.replace(/[^+\d]/g, ''))}">${escapeHtml(phone)}</a></div>` : ''}
                                    ${email ? `<div class="modal-detail-item"><i class="fas fa-envelope"></i><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div>` : ''}
                                    ${website ? `<div class="modal-detail-item full"><i class="fas fa-globe"></i><a href="${escapeHtml(website)}" target="_blank" rel="noopener">${escapeHtml(website)}</a></div>` : ''}
                                </div>
                            </div>
                            <div class="modal-actions">
                                ${email ? `<a href="mailto:${escapeHtml(email)}" class="btn btn-primary">Send Message</a>` : ''}
                                <button class="btn-outline" type="button" data-close-affiliate style="flex:1;">Close</button>
                            </div>`;

                        body.querySelector('[data-close-affiliate]')?.addEventListener('click', closeModal);
                    } catch (error) {
                        body.innerHTML = `<div style="padding:4rem 2rem;text-align:center;"><strong>Error loading details.</strong><br>${escapeHtml(error.message)}</div>`;
                    }
                };

                function closeModal() {
                    document.getElementById('agentModal').classList.remove('open');
                    document.body.style.overflow = '';
                }

                document.getElementById('modalClose').onclick = closeModal;
                document.getElementById('agentModal').addEventListener('click', event => {
                    if (event.target.id === 'agentModal') closeModal();
                });
                document.addEventListener('keydown', event => {
                    if (event.key === 'Escape') closeModal();
                });
            })();
        