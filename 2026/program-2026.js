'use strict';
(() => {
  const data = JSON.parse(document.getElementById('program-data').textContent);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isSyntheticDOM = Boolean(window.happyDOM);
  const CHART_YEARS = ['2021', '2022', '2023', '2024', '2025', '2026'];

  function formatMetric(value, fmt, suffix = '') {
    const num = Number(value);
    if (fmt === 'percent1') {
      return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(num) + suffix;
    }
    if (fmt === 'decimal1') {
      return num.toFixed(1) + suffix;
    }
    if (fmt === 'currency0') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num) + suffix;
    }
    return new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(num) + suffix;
  }

  function formatCompact(value, fmt, suffix = '') {
    const v = Number(value);
    if (fmt === 'currency0') {
      if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
      if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
      if (v >= 1e4) return '$' + Math.round(v / 1e3) + 'K';
      return '$' + Math.round(v).toLocaleString('en-US');
    }
    if (fmt === 'percent1') return (v * 100).toFixed(1) + '%';
    if (fmt === 'decimal1') return v.toFixed(1) + suffix;
    return Math.round(v).toLocaleString('en-US') + suffix;
  }

  function animateMetricValue(el, fromVal, toVal, fmt, suffix = '', duration = 680) {
    if (!el) return;
    if (el._rafId) {
      window.cancelAnimationFrame(el._rafId);
      el._rafId = null;
    }
    const target = Number(toVal);
    if (isSyntheticDOM || reducedMotion.matches || typeof window.requestAnimationFrame !== 'function') {
      el.textContent = formatMetric(target, fmt, suffix);
      return;
    }
    const startVal = Math.abs(Number(fromVal) - target) < 1e-9 ? 0 : Number(fromVal);
    const startTime = performance.now();
    el.classList.remove('is-popping');
    void el.offsetWidth;
    el.classList.add('is-popping');

    function tick(now) {
      const elapsed = now - startTime;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = startVal + (target - startVal) * eased;
      el.textContent = formatMetric(p < 1 ? current : target, fmt, suffix);
      if (p < 1) {
        el._rafId = window.requestAnimationFrame(tick);
      } else {
        el._rafId = null;
      }
    }
    el._rafId = window.requestAnimationFrame(tick);
  }

  function animatePulseCard(pulseBtn, duration = 850) {
    const valEl = pulseBtn.querySelector('[data-pulse-value]');
    if (!valEl) return;
    const target = Number(pulseBtn.dataset.pulseTarget || 0);
    const prefix = pulseBtn.dataset.pulsePrefix || '';
    const suffix = pulseBtn.dataset.pulseSuffix || '';
    const decimals = Number(pulseBtn.dataset.pulseDecimals || 0);
    if (!target || isSyntheticDOM || reducedMotion.matches || typeof window.requestAnimationFrame !== 'function') return;

    if (valEl._rafId) window.cancelAnimationFrame(valEl._rafId);
    const startTime = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const curr = target * eased;
      const formatted = decimals > 0
        ? curr.toFixed(decimals)
        : Math.round(curr).toLocaleString('en-US');
      valEl.textContent = `${prefix}${formatted}${suffix}`;
      if (p < 1) {
        valEl._rafId = window.requestAnimationFrame(tick);
      } else {
        valEl._rafId = null;
      }
    }
    valEl._rafId = window.requestAnimationFrame(tick);
  }

  function drawMarketCanvas(card, metric, selectedYear, progress = 1) {
    const canvas = card.querySelector('[data-market-canvas]');
    if (!canvas || typeof canvas.getContext !== 'function') return;
    let ctx = null;
    try { ctx = canvas.getContext('2d'); } catch { return; }
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width > 40 ? rect.width : 320;
    const cssH = rect.height > 40 ? rect.height : 145;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    const vals = CHART_YEARS.map(y => Number(metric.values[y] || 0));
    const maxVal = Math.max(...vals, 0.0001);
    const padL = 10, padR = 10, padT = 26, padB = 24;
    const plotW = cssW - padL - padR;
    const plotH = cssH - padT - padB;
    const slotW = plotW / CHART_YEARS.length;
    const barW = Math.min(34, slotW * 0.62);

    ctx.strokeStyle = 'rgba(2, 128, 143, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 2; i++) {
      const gy = padT + (plotH * i) / 2;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(cssW - padR, gy);
      ctx.stroke();
    }

    const suffix = metric.suffix || card.dataset.suffix || '';
    CHART_YEARS.forEach((yr, idx) => {
      const v = vals[idx];
      const ratio = Math.max(0.08, v / maxVal);
      const h = ratio * plotH * progress;
      const x = padL + idx * slotW + (slotW - barW) / 2;
      const y = padT + plotH - h;
      const isSel = Number(yr) === Number(selectedYear);

      ctx.beginPath();
      const r = Math.min(6, barW / 2, h / 2);
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, y + h);
      ctx.closePath();

      if (isSel) {
        const grad = ctx.createLinearGradient(0, y, 0, y + h);
        grad.addColorStop(0, '#002054');
        grad.addColorStop(1, '#02808f');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#c99321';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        const grad = ctx.createLinearGradient(0, y, 0, y + h);
        grad.addColorStop(0, '#57c7d4');
        grad.addColorStop(1, '#9ad9e2');
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.fillStyle = isSel ? '#002054' : '#35576b';
      ctx.font = (isSel ? '700 ' : '600 ') + '10.5px Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(yr, x + barW / 2, cssH - 7);

      if (isSel || Number(yr) === 2026) {
        ctx.fillStyle = isSel ? '#002054' : '#006371';
        ctx.font = (isSel ? '700 ' : '600 ') + '10px Oswald, Arial, sans-serif';
        ctx.fillText(formatCompact(v, metric.format, suffix), x + barW / 2, Math.max(12, y - 5));
      }
    });
    ctx.restore();
  }

  function animateCanvas(card, metric, selectedYear) {
    if (isSyntheticDOM || reducedMotion.matches || typeof window.requestAnimationFrame !== 'function') {
      drawMarketCanvas(card, metric, selectedYear, 1);
      return;
    }
    const start = performance.now();
    const dur = 480;
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      drawMarketCanvas(card, metric, selectedYear, eased);
      if (t < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  const rawMetrics = data.market?.metrics || [];
  const metricsArray = Array.isArray(rawMetrics)
    ? rawMetrics
    : Object.entries(rawMetrics).map(([k, v]) => ({ key: k, ...v }));

  document.querySelectorAll('[data-market-key]').forEach(card => {
    const metric = metricsArray.find(m => m.key === card.dataset.marketKey);
    if (!metric) return;
    const baselineYear = data.market.baselineYear || 2026;
    const baseline = metric.values[baselineYear];
    const suffix = metric.suffix || card.dataset.suffix || '';
    const goodDir = metric.goodDirection || card.dataset.goodDirection || 'up';
    let currentVal = Number(baseline);

    card._countUpFromZero = (duration = 900) => {
      const activeBtn = card.querySelector('[data-market-year][aria-pressed="true"]');
      const yr = activeBtn ? Number(activeBtn.dataset.marketYear) : baselineYear;
      const targetVal = Number(metric.values[yr]);
      currentVal = targetVal;
      animateMetricValue(card.querySelector('.market-value'), 0, targetVal, metric.format, suffix, duration);
      animateCanvas(card, metric, yr);
    };

    const selectYear = (year) => {
      const value = metric.values[year];
      const valueEl = card.querySelector('.market-value');
      const prevVal = currentVal;
      currentVal = Number(value);

      animateMetricValue(valueEl, prevVal, currentVal, metric.format, suffix, 680);

      const yearTag = card.querySelector('[data-market-year-tag]');
      if (yearTag) yearTag.textContent = `${year} YTD`;

      let comparison = `${year} · comparison year`;
      let tone = 'neutral';
      if (year !== baselineYear) {
        const difference = value - baseline;
        const direction = difference > 0 ? 'higher' : difference < 0 ? 'lower' : 'unchanged';
        if (!difference) {
          comparison = `${year} · unchanged from ${baselineYear}`;
        } else if (metric.format === 'percent1') {
          comparison = `${year} · ${Math.abs(difference * 100).toFixed(1)} percentage points ${direction} than ${baselineYear}`;
        } else if (baseline === 0) {
          comparison = `${year} · ${formatMetric(Math.abs(difference), metric.format, suffix)} ${direction} than ${baselineYear}`;
        } else {
          comparison = `${year} · ${Math.abs((difference / baseline) * 100).toFixed(1)}% ${direction} than ${baselineYear}`;
        }
        const changeTo2026 = baseline - value;
        if (changeTo2026 !== 0) {
          const isGood = (changeTo2026 > 0 && goodDir === 'up') || (changeTo2026 < 0 && goodDir === 'down');
          tone = isGood ? 'good' : 'caution';
        }
      } else if (metric.values['2025'] !== undefined && metric.source && !String(metric.source).includes('Synthetic')) {
        const v25 = Number(metric.values['2025']);
        const diff26 = Number(value) - v25;
        if (Math.abs(diff26) > 1e-9) {
          const up = diff26 > 0;
          const arrow = up ? '▲' : '▼';
          if (metric.format === 'percent1') {
            comparison = `${arrow} ${up ? '+' : '-'}${Math.abs(diff26 * 100).toFixed(1)} percentage points vs. 2025 (${formatMetric(v25, metric.format)})`;
          } else {
            comparison = `${arrow} ${up ? '+' : '-'}${Math.abs((diff26 / v25) * 100).toFixed(1)}% vs. 2025 (${formatCompact(v25, metric.format, suffix)})`;
          }
          tone = (up && goodDir === 'up') || (!up && goodDir === 'down') ? 'good' : 'caution';
        }
      }

      const compEl = card.querySelector('.market-comparison');
      compEl.textContent = comparison;
      compEl.className = `market-comparison is-${tone}`;

      card.querySelectorAll('[data-market-year]').forEach(b => {
        b.setAttribute('aria-pressed', String(Number(b.dataset.marketYear) === year));
      });
      card.querySelectorAll('[data-market-bar]').forEach(b => {
        b.dataset.selected = String(Number(b.dataset.marketBar) === year);
      });

      animateCanvas(card, metric, year);
    };

    card.querySelectorAll('[data-market-year]').forEach(button => {
      button.addEventListener('click', () => selectYear(Number(button.dataset.marketYear)));
    });

    card.querySelectorAll('[data-market-bar]').forEach(barRow => {
      barRow.addEventListener('click', () => selectYear(Number(barRow.dataset.marketBar)));
    });

    const canvas = card.querySelector('[data-market-canvas]');
    if (canvas) {
      canvas.addEventListener('click', ev => {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width) return;
        const relX = ev.clientX - rect.left;
        const idx = Math.min(CHART_YEARS.length - 1, Math.max(0, Math.floor((relX / rect.width) * CHART_YEARS.length)));
        selectYear(Number(CHART_YEARS[idx]));
      });
    }

    drawMarketCanvas(card, metric, baselineYear, 1);
  });

  // Scroll-triggered count-up when cards enter viewport inside #market
  if (!isSyntheticDOM && !reducedMotion.matches && typeof window.IntersectionObserver === 'function') {
    const seenCards = new WeakSet();
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !seenCards.has(entry.target)) {
          seenCards.add(entry.target);
          if (typeof entry.target._countUpFromZero === 'function') {
            entry.target._countUpFromZero(900);
          }
        }
      });
    }, { threshold: 0.2 });
    document.querySelectorAll('[data-market-key]').forEach(card => cardObserver.observe(card));

    const seenPulse = new WeakSet();
    const pulseObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !seenPulse.has(entry.target)) {
          seenPulse.add(entry.target);
          animatePulseCard(entry.target, 900);
        }
      });
    }, { threshold: 0.2 });
    document.querySelectorAll('.market-pulse-card').forEach(p => pulseObserver.observe(p));
  }

  // Category filter buttons in Market Stats
  document.querySelectorAll('[data-market-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.marketFilter;
      document.querySelectorAll('[data-market-filter]').forEach(b => b.classList.toggle('is-active', b === btn));
      document.querySelectorAll('.market-card[data-market-cat]').forEach(card => {
        card.hidden = cat !== 'all' && card.dataset.marketCat !== cat;
        if (!card.hidden && typeof card._countUpFromZero === 'function') {
          card._countUpFromZero(700);
        }
      });
    });
  });

  // Global year switcher in Market Stats
  document.querySelectorAll('[data-market-global-year]').forEach(btn => {
    btn.addEventListener('click', () => {
      const yr = btn.dataset.marketGlobalYear;
      document.querySelectorAll('[data-market-global-year]').forEach(b => b.classList.toggle('is-active', b === btn));
      document.querySelectorAll('.market-card').forEach(card => {
        const yearBtn = card.querySelector(`[data-market-year="${yr}"]`);
        if (yearBtn) yearBtn.click();
      });
    });
  });

  // Executive Market Pulse KPI cards jump to metric card and trigger count-up
  document.querySelectorAll('[data-pulse-jump]').forEach(pulseBtn => {
    pulseBtn.addEventListener('click', () => {
      const key = pulseBtn.dataset.pulseJump;
      const targetCard = document.getElementById(`market-card-${key}`);
      if (!targetCard) return;
      if (targetCard.hidden) {
        const allFilter = document.querySelector('[data-market-filter="all"]');
        if (allFilter) allFilter.click();
      }
      targetCard.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
      targetCard.classList.add('is-highlight-flash');
      if (typeof targetCard._countUpFromZero === 'function') targetCard._countUpFromZero(800);
      setTimeout(() => targetCard.classList.remove('is-highlight-flash'), 1600);
    });
  });

  // Count up numbers & animate charts whenever #market section is opened
  const marketSection = document.getElementById('market');
  if (marketSection) {
    marketSection.addEventListener('toggle', () => {
      if (marketSection.open) {
        document.querySelectorAll('.market-pulse-card').forEach(p => animatePulseCard(p, 850));
        document.querySelectorAll('[data-market-key]').forEach(card => {
          if (typeof card._countUpFromZero === 'function') card._countUpFromZero(850);
        });
      }
    });
  }

  // Expand / Collapse All Sections on One Page button
  const expandAllBtn = document.getElementById('toggle-all-sections');
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
      const sections = [...document.querySelectorAll('details.program-section')];
      const allOpen = sections.every(s => s.open);
      const nextState = !allOpen;
      sections.forEach(s => { s.open = nextState; });
      expandAllBtn.setAttribute('aria-pressed', String(nextState));
      expandAllBtn.textContent = nextState ? 'Collapse All Sections ▴' : 'Expand All Sections on One Page ▾';
    });
  }

  // Quick-nav pills open their target accordion immediately on click
  document.querySelectorAll('.quick-pill[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
      const id = link.getAttribute('href').slice(1);
      const sec = document.getElementById(id);
      if (sec?.matches('details.program-section')) sec.open = true;
    });
  });

  const dialog = document.getElementById('photo-dialog');
  const image = document.getElementById('viewer-image');
  const playButton = document.getElementById('play-slideshow');
  const counter = document.getElementById('photo-counter');
  const allPhotos = [...document.querySelectorAll('[data-photo]')];
  const galleryAds = document.querySelectorAll('.gallery > .editorial-ad');
  const ocean = document.getElementById('ocean-video');
  const oceanMotion = document.getElementById('ocean-motion');
  let oceanWanted = !reducedMotion.matches && !navigator.connection?.saveData;
  let oceanFailed = false;
  function oceanButton(playing) {
    oceanMotion.textContent = playing ? 'Pause ocean background' : 'Play ocean background';
    oceanMotion.setAttribute('aria-pressed', String(playing));
  }
  async function updateOceanPlayback() {
    if (oceanFailed) return;
    if (!oceanWanted || document.hidden || dialog.open) {
      ocean.pause(); oceanButton(false); return;
    }
    const source = ocean.querySelector('source');
    if (!source.getAttribute('src')) {
      ocean.muted = true; ocean.defaultMuted = true;
      source.src = source.dataset.src;
      ocean.load();
    }
    try {
      await ocean.play();
      if (!oceanWanted || document.hidden || dialog.open) { ocean.pause(); oceanButton(false); }
    } catch {
      if (!document.hidden && !dialog.open) oceanWanted = false;
      oceanButton(false);
    }
  }
  oceanMotion.hidden = false;
  oceanMotion.addEventListener('click', () => {
    oceanWanted = !oceanWanted;
    updateOceanPlayback();
  });
  ocean.addEventListener('playing', () => {
    ocean.parentElement.classList.add('has-frame');
    oceanButton(true);
  });
  ocean.addEventListener('pause', () => oceanButton(false));
  function oceanError() {
    oceanFailed = true; oceanMotion.hidden = true;
    ocean.parentElement.classList.remove('has-frame');
  }
  ocean.addEventListener('error', oceanError);
  ocean.querySelector('source').addEventListener('error', oceanError);
  reducedMotion.addEventListener('change', event => {
    oceanWanted = !event.matches && !navigator.connection?.saveData;
    updateOceanPlayback();
  });
  let filter = 'all', active = 0, sequence = data.photos.map((_, i) => i), timer = null, opener = null;
  const asset = src => `program-2026-assets/${src}`;
  function stop() {
    clearInterval(timer); timer = null;
    playButton.textContent = 'Play'; playButton.setAttribute('aria-pressed', 'false');
  }
  function show() {
    const p = data.photos[sequence[active]];
    if (!p) return;
    const album = data.albums.find(a => a.id === p.album);
    document.getElementById('viewer-error').style.display = 'none';
    image.src = asset(p.src); image.alt = p.alt;
    document.getElementById('viewer-caption').textContent = p.alt;
    document.getElementById('viewer-album').textContent = album.title;
    document.getElementById('viewer-credit').textContent = album.credit;
    counter.textContent = `${active + 1} / ${sequence.length}`;
    document.getElementById('previous-photo').disabled = sequence.length < 2;
    document.getElementById('next-photo').disabled = sequence.length < 2;
    playButton.disabled = sequence.length < 2;
    const next = data.photos[sequence[(active + 1) % sequence.length]];
    if (next) { const preload = new Image(); preload.src = asset(next.src); }
  }
  function move(delta) { active = (active + delta + sequence.length) % sequence.length; show(); }
  function open(index, trigger) {
    stop(); opener = trigger;
    document.getElementById('photos').open = true;
    sequence = data.photos.map((_, i) => i).filter(i => filter === 'all' || data.photos[i].album === filter);
    if (!sequence.length) return;
    active = Math.max(0, sequence.indexOf(index)); show(); dialog.showModal();
    updateOceanPlayback();
    document.body.style.overflow = 'hidden'; document.getElementById('close-viewer').focus();
  }
  allPhotos.forEach(button => button.addEventListener('click', () => open(Number(button.dataset.photo), button)));
  document.getElementById('start-slideshow').addEventListener('click', event => open(-1, event.currentTarget));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    let count = 0;
    allPhotos.forEach(b => { b.hidden = filter !== 'all' && b.dataset.album !== filter; if (!b.hidden) count++; });
    galleryAds.forEach(ad => { ad.hidden = filter !== 'all'; });
    document.getElementById('gallery-status').textContent = `${count} selected photos`;
  }));
  document.getElementById('close-viewer').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    stop(); document.body.style.overflow = '';
    if (document.fullscreenElement === dialog) document.exitFullscreen().catch(() => {});
    opener?.focus();
    updateOceanPlayback();
  });
  document.getElementById('previous-photo').addEventListener('click', () => { stop(); move(-1); });
  document.getElementById('next-photo').addEventListener('click', () => { stop(); move(1); });
  playButton.addEventListener('click', () => {
    if (timer) { stop(); return; }
    playButton.textContent = 'Pause'; playButton.setAttribute('aria-pressed', 'true');
    timer = setInterval(() => move(1), 5000);
  });
  const fullscreen = document.getElementById('fullscreen');
  if (!dialog.requestFullscreen) fullscreen.hidden = true;
  fullscreen.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else dialog.requestFullscreen().catch(() => { fullscreen.hidden = true; });
  });
  document.addEventListener('fullscreenchange', () => fullscreen.setAttribute('aria-label', document.fullscreenElement ? 'Exit full screen' : 'Enter full screen'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    updateOceanPlayback();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); stop(); move(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); stop(); move(-1); }
  });
  image.addEventListener('error', () => { document.getElementById('viewer-error').style.display = 'block'; });
  let touchX = null, touchY = null;
  const figure = document.getElementById('viewer-figure');
  figure.addEventListener('touchstart', event => { touchX = event.changedTouches[0].clientX; touchY = event.changedTouches[0].clientY; }, {passive:true});
  figure.addEventListener('touchend', event => {
    if (touchX === null) return;
    const dx = event.changedTouches[0].clientX - touchX;
    const dy = event.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { stop(); move(dx < 0 ? 1 : -1); }
    touchX = null; touchY = null;
  }, {passive:true});
  function openHashSection() {
    const section = document.getElementById(location.hash.slice(1));
    if (section?.matches('details.program-section')) section.open = true;
  }
  openHashSection();
  window.addEventListener('hashchange', openHashSection);
  if (new URLSearchParams(location.search).get('slideshow') === '1') open(0, document.getElementById('start-slideshow'));
  updateOceanPlayback();
})();
