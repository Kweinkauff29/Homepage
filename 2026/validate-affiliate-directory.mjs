import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('./AFFILIATEDIRECTORY.html', import.meta.url), 'utf8');
const controller = readFileSync(new URL('./affiliate-directory-secure-api-v2.js', import.meta.url), 'utf8');
const combined = `${page}\n${controller}`;
const categoryTileCount = (page.match(/class="category-tile"/g) || []).length;

const checks = [
  ['preserves original heading and supporting copy', page.includes('Find an Affiliated Business Partner') && page.includes('Support the local businesses that support our REALTOR® community.')],
  ['preserves original search and dropdown ids', page.includes('id="searchInput"') && page.includes('id="filterCategoryInput"') && page.includes('id="filterLanguageInput"')],
  ['preserves all ten original category tiles', page.includes('id="categoryTiles"') && categoryTileCount === 10 && page.includes('Title & Escrow') && page.includes('Lifestyle & Property')],
  ['preserves original card presentation', page.includes('.agent-card') && page.includes('.card-header') && page.includes('.avatar') && page.includes('.category-badge') && page.includes('.card-actions')],
  ['preserves original sponsor badge styling', page.includes('.sponsor-diamond') && page.includes('.sponsor-platinum') && page.includes('.sponsor-gold') && page.includes('.sponsor-silver') && page.includes('.sponsor-photo')],
  ['preserves original modal presentation', page.includes('id="agentModal"') && page.includes('.modal-overlay') && page.includes('.modal-hero') && page.includes('.modal-detail-grid')],
  ['preserves original pagination and skeleton loading', page.includes('id="pagination"') && page.includes('.page-btn') && page.includes('.skeleton-card') && page.includes('id="loadingBar"')],
  ['preserves original Affiliate call to action', page.includes('Interested in becoming an Affiliate?') && page.includes('membership@coconutcoastrealtors.org')],
  ['preserves CCOR wave background', page.includes('id="ccor-waves-bg"') && page.includes('@keyframes waveSlide') && page.includes('initCcorWaves')],
  ['uses secured Member Hub directory API', combined.includes('ccor-member-hub-prototype.bonitaspringsrealtors.workers.dev/api/public/directory')],
  ['contains no embedded GrowthZone API key declaration', !/GROWTHZONE_API_KEY|API_KEY\s*=|apiKey\s*[:=]/i.test(combined)],
  ['contains no browser Authorization header', !/Authorization\s*:/i.test(combined) && !/ApiKey\s+/i.test(combined)],
  ['contains no direct GrowthZone request', !/growthzoneapp\.com\/api\//i.test(combined)],
  ['loads every indexed Worker page', controller.includes('fetchApiPage') && controller.includes("url.searchParams.set('pageSize'") && controller.includes('remaining.slice(offset, offset + 4)')],
  ['uses a fast versioned session index cache', controller.includes("const CACHE_KEY = 'CCOR_AFFILIATE_DIRECTORY_INDEX_V2'") && controller.includes('CACHE_TTL_MS') && controller.includes('sessionStorage.setItem') && controller.includes('readCachedIndex')],
  ['maps indexed records into original tile groups', controller.includes('META_CATEGORIES') && controller.includes('SPONSOR_CATEGORY_OVERRIDES') && controller.includes('inferCategories')],
  ['infers categories from company headline services and offers', controller.includes('item.headline') && controller.includes('...safeArray(item.services)') && controller.includes('...safeArray(item.offers)')],
  ['indexes languages and categories into original dropdowns', controller.includes('populateFilters(allContacts)') && controller.includes('buildDropdown(filterCategoryList') && controller.includes('buildDropdown(filterLanguageList')],
  ['supports original tile selection behavior', controller.includes('window.selectTileCategory') && controller.includes("tile.classList.toggle('active'")],
  ['search index includes company representative location categories services offers and languages', controller.includes('const searchIndex = normalize') && controller.includes('primaryContact') && controller.includes('...languages') && controller.includes('...services') && controller.includes('...offers')],
  ['search handles punctuation accents and case', controller.includes(".normalize('NFD')") && controller.includes("replace(/[^a-z0-9]+/g, ' ')")],
  ['supports secured list and detail routes', controller.includes("url.searchParams.set('type', 'affiliate')") && controller.includes('`${DIRECTORY_API}/${encodeURIComponent(id)}?type=affiliate`')],
  ['uses request timeouts and graceful cached fallback', controller.includes('REQUEST_TIMEOUT_MS') && controller.includes('AbortController') && controller.includes('cached business partners')],
  ['preserves deterministic sponsor and photo prioritization', controller.includes('sortAndPrioritizeContacts') && controller.includes('secondSponsor - firstSponsor') && controller.includes('first.Name.localeCompare')],
  ['supports member-managed profile media inside the original modal', controller.includes('profile.gallery') && controller.includes('profile.youtube') && controller.includes('profile.documents') && controller.includes('mediaSections(profile)')],
  ['embeds YouTube through privacy enhanced host', controller.includes('youtube-nocookie.com/embed') && controller.includes('youtubeEmbed')],
  ['uses lazy image and media loading', controller.includes('loading="lazy"') && controller.includes('decoding="async"')],
  ['escapes dynamic HTML and validates public links', controller.includes('function escapeHtml') && controller.includes('function safeUrl') && controller.includes('function safeEmail')],
  ['external links isolate opener', combined.includes('rel="noopener"')],
  ['adds accessible category tiles dropdowns cards and modal', controller.includes("tile.setAttribute('role', 'button')") && controller.includes("aria-haspopup', 'listbox") && controller.includes("aria-modal', 'true") && controller.includes('lastFocusedElement')],
  ['pagination includes previous next and current page semantics', controller.includes("label: 'Previous'") && controller.includes("label: 'Next'") && controller.includes("aria-current', 'page")],
  ['responsive layouts remain original', page.includes('@media (max-width: 1000px)') && page.includes('@media (max-width: 600px)')],
  ['error retry and empty states exist', controller.includes('Directory temporarily unavailable') && controller.includes('No business partners match these filters') && controller.includes('Try Again')]
];

const failed = checks.filter(([, passed]) => !passed).map(([label]) => label);
if (failed.length) throw new Error(`Affiliate directory checks failed: ${failed.join(', ')}`);
console.log(`Validated ${checks.length} original-layout, secured API, indexed-search, caching, accessibility, profile-media, and credential-isolation safeguards.`);