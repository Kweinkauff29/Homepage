(() => {
  "use strict";

  const YEAR = 2026;
  const SYNC_INTERVAL_MS = 10000;
  const STAFF = ["Kevin", "Erica", "Jenna", "Meighan", "Emma", "Monica"];
  let allContacts = [];
  let currentUser = "";
  let searchTerm = "";
  let syncTimer = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
  const escapeAttr = escapeHtml;
  const bool = (value) => Number(value) === 1 || value === true;
  const initials = (contact) => `${contact.first_name?.[0] ?? ""}${contact.last_name?.[0] ?? ""}`.toUpperCase() || "?";
  const organization = (contact) => contact.office_display_name || contact.growthzone_organization_name || contact.office || "Other";
  const contactPhone = (contact) => contact.growthzone_mobile_phone || contact.primary_phone || "";
  const locationText = (contact) => [contact.manual_city || contact.office_city, contact.manual_state || contact.office_state].filter(Boolean).join(", ");
  const currency = (value) => Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

  function parseServerDate(value) {
    if (!value) return null;
    const normalized = /Z$|[+-]\d\d:\d\d$/u.test(value) ? value : `${String(value).replace(" ", "T")}Z`;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatStamp(by, at, verb = "Set") {
    if (!by) return "";
    const date = parseServerDate(at);
    const stamp = date ? date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
    return `${verb} by ${escapeHtml(by)}${stamp ? ` (${escapeHtml(stamp)})` : ""}`;
  }

  function setSync(status, message) {
    const indicator = $("#syncStatus");
    if (!indicator) return;
    indicator.className = `sync-indicator ${status}`;
    const icon = $(".sync-icon", indicator);
    const text = $(".sync-text", indicator);
    const icons = {
      syncing: "fa-solid fa-cloud-arrow-down sync-icon",
      synced: "fa-solid fa-cloud-check sync-icon",
      error: "fa-solid fa-cloud-exclamation sync-icon",
    };
    icon.className = icons[status] || "fa-solid fa-cloud sync-icon";
    text.textContent = message || (status === "syncing" ? "Syncing..." : status === "error" ? "Error" : "Synced");
  }

  async function api(path, options = {}) {
    if (!currentUser) throw new Error("Select a staff member first.");
    const headers = new Headers(options.headers || {});
    headers.set("X-Staff-User", currentUser);
    if (options.body) headers.set("Content-Type", "application/json");
    const response = await fetch(path, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
    return payload;
  }

  async function loadData({ quiet = false, preserveScroll = false } = {}) {
    if (!currentUser) return;
    if (!quiet) setSync("syncing", "Syncing...");
    const scrollY = preserveScroll ? window.scrollY : 0;
    try {
      const payload = await api(`/api/sea/agents?year=${YEAR}&sort_by=brokerage&sort_dir=asc`);
      allContacts = payload.agents || [];
      renderData();
      if (preserveScroll) window.scrollTo({ top: scrollY });
      const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      setSync("synced", time);
    } catch (error) {
      console.error(error);
      setSync("error", "Sync error");
      if (!quiet) alert(error.message);
    }
  }

  function tierFor(contact) {
    const value = Number(contact.proof_confirmed_volume || contact.total_volume || 0);
    if (value > 20000000) return { css: "tier-diamond", name: "Diamond" };
    if (value > 10000000) return { css: "tier-platinum", name: "Platinum" };
    if (value > 5000000) return { css: "tier-gold", name: "Gold" };
    return { css: "", name: "None" };
  }

  function option(value, selected, label = value) {
    return `<option value="${escapeAttr(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }

  function createContactCard(contact) {
    const checked = bool(contact.contact_verified);
    const numbers = bool(contact.proof_numbers_confirmed);
    const registered = bool(contact.proof_event_registered);
    const notAttending = bool(contact.proof_not_attending);
    const awardPreference = contact.proof_award_preference || "";
    const awardLevel = contact.proof_award_level || "";
    const confirmedVolume = contact.proof_confirmed_volume ?? "";
    const headshot = contact.proof_headshot_url || "";
    const tier = tierFor(contact);
    const name = contact.full_name || `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unknown Name";
    const email = contact.primary_email || "";
    const phone = contactPhone(contact);
    const cityState = locationText(contact);
    const recordId = escapeAttr(contact.record_id);
    const classes = ["contact-card", checked ? "is-checked" : "", notAttending ? "is-not-attending" : "", tier.css].filter(Boolean).join(" ");
    const avatar = headshot
      ? `<img decoding="async" src="${escapeAttr(headshot)}" class="avatar-small" style="object-fit:cover;background:transparent" alt="${escapeAttr(name)}">`
      : `<div class="avatar-small">${escapeHtml(initials(contact))}</div>`;
    const verification = checked
      ? `<span class="checked-by-info"><i class="fa-solid fa-check-double"></i> ${formatStamp(contact.contact_verified_by, contact.contact_verified_at, "Verified")}</span>`
      : "";
    const deleteButton = currentUser === "Kevin"
      ? `<button class="delete-contact-btn" data-action="archive" title="Remove Contact" style="margin-left:auto;background:none;border:none;color:#cbd5e1;cursor:pointer;padding:4px"><i class="fa-solid fa-trash"></i></button>`
      : "";
    const mlsVolume = contact.total_volume ? `$${currency(contact.total_volume)}` : "Add Volume";
    const confirmedDisplay = confirmedVolume !== "" && confirmedVolume !== null ? `$${currency(confirmedVolume)}` : "";

    const card = document.createElement("div");
    card.className = classes;
    card.dataset.recordId = contact.record_id;
    card.innerHTML = `
      <div class="card-checkbox-area">
        <label class="custom-checkbox">
          <input type="checkbox" class="verify-contact" data-record-id="${recordId}" ${checked ? "checked" : ""}>
          <span class="checkmark"></span>
        </label>
      </div>
      <div class="contact-name-area">
        ${avatar}
        <div style="display:flex;flex-direction:column;width:100%">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="name-text">${escapeHtml(name)}</span>${deleteButton}
          </div>
          ${verification}
        </div>
      </div>
      ${email ? `<div class="detail-item"><i class="fa-regular fa-envelope"></i> <a href="mailto:${escapeAttr(email)}" title="${escapeAttr(email)}">${escapeHtml(email.length > 30 ? `${email.slice(0, 29)}…` : email)}</a></div>` : '<div class="detail-item"></div>'}
      ${phone ? `<div class="detail-item"><i class="fa-solid fa-phone"></i> <a href="tel:${escapeAttr(phone)}">${escapeHtml(phone)}</a></div>` : '<div class="detail-item"></div>'}
      ${cityState ? `<div class="detail-item"><i class="fa-solid fa-location-dot"></i> <span>${escapeHtml(cityState)}</span></div>` : '<div class="detail-item"></div>'}
      <div style="grid-column:6;display:flex;flex-direction:column;justify-content:center;gap:2px">
        <div class="detail-item volume-icon" style="color:#0d9488;font-weight:500;${confirmedDisplay ? "text-decoration:line-through;opacity:.6" : ""}" title="MLS Volume">
          <i class="fa-solid fa-sack-dollar"></i> <span>${escapeHtml(mlsVolume)}</span>
        </div>
        ${confirmedDisplay ? `<div class="detail-item" style="color:#2563eb;font-weight:600;font-size:.95rem"><i class="fa-solid fa-calculator"></i> <span>${escapeHtml(confirmedDisplay)}</span></div>` : ""}
        <div style="color:#64748b;font-size:.75rem;white-space:normal;line-height:1.2;margin-top:2px">
          ${confirmedDisplay ? "Broker" : "MLS"} Valued at: <strong style="color:#334155">${tier.name}</strong>
        </div>
      </div>
      <div class="tracking-controls" style="grid-column:1/-1">
        <div class="tracking-item">
          <label class="tracking-label ${numbers ? "is-set" : ""}"><input type="checkbox" class="track-numbers" ${numbers ? "checked" : ""}> <i class="fa-solid fa-calculator"></i> Numbers Confirmed</label>
          <span class="tracking-attr">${formatStamp(contact.proof_numbers_confirmed_by, contact.proof_numbers_confirmed_at)}</span>
        </div>
        <div class="tracking-item">
          <label class="tracking-label ${registered ? "is-set" : ""}"><input type="checkbox" class="track-registered" ${registered ? "checked" : ""} ${notAttending ? "disabled" : ""}> <i class="fa-solid fa-calendar-check"></i> Event Registered</label>
          <span class="tracking-attr">${formatStamp(contact.proof_event_registered_by, contact.proof_event_registered_at)}</span>
        </div>
        <div class="tracking-item">
          <label class="tracking-label ${notAttending ? "is-not-attending" : ""}"><input type="checkbox" class="track-not-attending" ${notAttending ? "checked" : ""} ${registered ? "disabled" : ""}> <i class="fa-solid fa-calendar-xmark"></i> Not Attending</label>
          <span class="tracking-attr">${formatStamp(contact.proof_not_attending_by, contact.proof_not_attending_at)}</span>
        </div>
        <div class="tracking-item">
          <label class="tracking-label ${awardPreference ? "is-set" : ""}"><i class="fa-solid fa-trophy"></i> Award Preference:
            <select class="award-select">${option("", awardPreference, "Select...")}${option("trophy", awardPreference, "Trophy")}${option("certificate", awardPreference, "Paper Certificate")}${option("none", awardPreference, "Nothing")}</select>
          </label>
          <span class="tracking-attr">${formatStamp(contact.proof_award_preference_by, contact.proof_award_preference_at)}</span>
        </div>
        <div class="tracking-item" style="border-top:1px dashed #e2e8f0;margin-top:4px;padding-top:8px">
          <label class="tracking-label ${confirmedDisplay ? "is-set" : ""}" style="color:#2563eb"><i class="fa-solid fa-pen-to-square"></i> Broker Confirmed $:
            <input type="number" min="0" step="1" class="confirmed-volume-input" value="${escapeAttr(confirmedVolume)}" placeholder="Enter amount..." style="margin-left:.5rem;padding:2px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:.85rem;color:#1e293b;width:120px">
          </label>
          <span class="tracking-attr">${formatStamp(contact.proof_confirmed_volume_by, contact.proof_confirmed_volume_at)}</span>
        </div>
        <div class="tracking-item" style="padding-top:4px">
          <label class="tracking-label ${headshot ? "is-set" : ""}"><i class="fa-solid fa-image"></i> Headshot URL:
            <input type="url" class="headshot-input" value="${escapeAttr(headshot)}" placeholder="Paste https:// image link..." style="margin-left:.5rem;padding:2px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:.85rem;color:#1e293b;width:200px">
          </label>
          <span class="tracking-attr">${formatStamp(contact.proof_headshot_by, contact.proof_headshot_at)}</span>
        </div>
        <div class="tracking-item" style="flex-basis:100%;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:4px;display:flex;flex-direction:row;align-items:center;justify-content:flex-start;gap:1rem">
          <label class="tracking-label ${awardLevel ? "is-set" : ""}" style="color:#6366f1;font-weight:600"><i class="fa-solid fa-medal"></i> ACTUAL AWARD LEVEL:
            <select class="actual-award-select" style="margin-left:.5rem;padding:2px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:.85rem;color:#1e293b">${option("", awardLevel, "Select...")}${option("Diamond", awardLevel)}${option("Platinum", awardLevel)}${option("Gold", awardLevel)}${option("Does Not Qualify", awardLevel)}</select>
          </label>
          <span class="tracking-attr">${formatStamp(contact.proof_award_level_by, contact.proof_award_level_at)}</span>
        </div>
      </div>`;
    return card;
  }

  function filteredContacts() {
    if (!searchTerm) return allContacts;
    return allContacts.filter((contact) => [
      contact.first_name,
      contact.last_name,
      contact.full_name,
      contact.primary_email,
      organization(contact),
    ].some((value) => String(value || "").toLowerCase().includes(searchTerm)));
  }

  function renderData() {
    const contentArea = $("#contentArea");
    const contacts = filteredContacts();
    contentArea.innerHTML = "";
    $("#total-contacts").textContent = String(contacts.length);
    if (!contacts.length) {
      $("#total-orgs").textContent = "0";
      contentArea.innerHTML = '<div style="text-align:center;padding:4rem;color:var(--text-muted)"><p>No contacts found matching your search.</p></div>';
      return;
    }
    const groups = new Map();
    for (const contact of contacts) {
      const org = organization(contact).trim() || "Other";
      if (!groups.has(org)) groups.set(org, []);
      groups.get(org).push(contact);
    }
    const orgNames = [...groups.keys()].sort((a, b) => a.localeCompare(b));
    $("#total-orgs").textContent = String(orgNames.length);
    for (const orgName of orgNames) {
      const orgContacts = groups.get(orgName).sort((a, b) => String(a.last_name || "").localeCompare(String(b.last_name || "")));
      const section = document.createElement("div");
      section.className = "org-group";
      const sample = orgContacts[0];
      const officeBits = [sample.office_main_phone, [sample.office_address, sample.office_city, sample.office_state, sample.office_zip].filter(Boolean).join(", ")].filter(Boolean);
      const orgId = `org-${crypto.randomUUID()}`;
      section.innerHTML = `<div class="org-header">
        <div class="org-title-row"><h2 class="org-title">${escapeHtml(orgName)}</h2><span class="org-count">${orgContacts.length}</span></div>
        ${officeBits.length ? `<div class="broker-info"><i class="fa-solid fa-building"></i><span class="broker-label">Office:</span><span class="broker-name">${escapeHtml(officeBits.join(" · "))}</span></div>` : ""}
        <div class="org-actions">
          <button class="copy-btn copy-org" type="button"><i class="fa-regular fa-copy"></i> Copy Names</button>
          <label class="filter-toggle"><input type="checkbox" id="${orgId}" checked><span>Unverified only</span></label>
        </div>
      </div>`;
      const grid = document.createElement("div");
      grid.className = "contacts-grid";
      for (const contact of orgContacts) grid.appendChild(createContactCard(contact));
      section.appendChild(grid);
      $(".copy-org", section).addEventListener("click", async (event) => {
        const unverifiedOnly = $(`#${orgId}`, section).checked;
        const lines = orgContacts
          .filter((contact) => !unverifiedOnly || !bool(contact.contact_verified))
          .map((contact) => `${contact.full_name}${contact.total_volume ? ` - $${currency(contact.total_volume)}` : ""}`);
        await navigator.clipboard.writeText(lines.join("\n"));
        const button = event.currentTarget;
        button.classList.add("copied");
        button.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(() => { button.classList.remove("copied"); button.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Names'; }, 1800);
      });
      contentArea.appendChild(section);
    }
  }

  async function saveRecord(recordId, updates) {
    setSync("syncing", "Saving...");
    try {
      await api(`/api/sea/records/${encodeURIComponent(recordId)}/update`, {
        method: "POST",
        body: JSON.stringify(updates),
      });
      await loadData({ quiet: true, preserveScroll: true });
    } catch (error) {
      setSync("error", "Save failed");
      alert(error.message);
      await loadData({ quiet: true, preserveScroll: true });
    }
  }

  async function handleCardChange(event) {
    const card = event.target.closest(".contact-card");
    if (!card) return;
    const recordId = card.dataset.recordId;
    const target = event.target;
    if (target.classList.contains("verify-contact")) {
      if (!target.checked && !confirm("Are you sure you want to remove this verification?")) {
        target.checked = true;
        return;
      }
      await saveRecord(recordId, { contact_verified: target.checked });
    } else if (target.classList.contains("track-numbers")) {
      await saveRecord(recordId, { proof_numbers_confirmed: target.checked });
    } else if (target.classList.contains("track-registered")) {
      await saveRecord(recordId, { proof_event_registered: target.checked, proof_not_attending: false });
    } else if (target.classList.contains("track-not-attending")) {
      await saveRecord(recordId, { proof_not_attending: target.checked, proof_event_registered: false });
    } else if (target.classList.contains("award-select")) {
      await saveRecord(recordId, { proof_award_preference: target.value });
    } else if (target.classList.contains("confirmed-volume-input")) {
      await saveRecord(recordId, { proof_confirmed_volume: target.value });
    } else if (target.classList.contains("headshot-input")) {
      await saveRecord(recordId, { proof_headshot_url: target.value });
    } else if (target.classList.contains("actual-award-select")) {
      await saveRecord(recordId, { proof_award_level: target.value });
    }
  }

  async function handleCardClick(event) {
    const button = event.target.closest('[data-action="archive"]');
    if (!button) return;
    const card = button.closest(".contact-card");
    const name = $(".name-text", card)?.textContent || "this contact";
    if (!confirm(`Remove ${name} from the 2026 working list? The audit history will be retained.`)) return;
    try {
      await api(`/api/sea/records/${encodeURIComponent(card.dataset.recordId)}/archive`, { method: "POST", body: "{}" });
      await loadData({ preserveScroll: true });
    } catch (error) {
      alert(error.message);
    }
  }

  function generateFinalProof() {
    const proofArea = $("#finalProofArea");
    const confirmed = allContacts
      .filter((contact) => ["Diamond", "Platinum", "Gold"].includes(contact.proof_award_level))
      .map((contact) => ({
        firstName: contact.first_name || "",
        lastName: contact.last_name || "",
        name: contact.full_name,
        organization: organization(contact),
        tier: contact.proof_award_level,
        headshotUrl: contact.proof_headshot_url || "",
      }));

    if (!confirmed.length) {
      proofArea.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:1rem"><button class="copy-btn" type="button" onclick="window.print()"><i class="fa-solid fa-print"></i> Print / Save PDF</button></div>
        <div class="final-proof-container"><div class="proof-header"><div class="proof-year">${YEAR}</div><div class="proof-title">Sales Excellence Award Winners</div></div>
        <div class="proof-empty"><i class="fa-solid fa-medal"></i><p>No confirmed agents yet.</p><p style="font-size:.9rem">Set the “ACTUAL AWARD LEVEL” field on contacts to add them here.</p></div></div>`;
      return;
    }
    const tiers = { Diamond: {}, Platinum: {}, Gold: {} };
    for (const agent of confirmed) {
      (tiers[agent.tier][agent.organization] ||= []).push(agent);
    }
    for (const tier of Object.values(tiers)) {
      for (const agents of Object.values(tier)) agents.sort((a, b) => a.lastName.localeCompare(b.lastName));
    }
    const agentHtml = (agent) => `<div class="proof-agent">
      <div class="proof-agent-photo">${agent.headshotUrl ? `<img decoding="async" src="${escapeAttr(agent.headshotUrl)}" alt="${escapeAttr(agent.name)}">` : escapeHtml(`${agent.firstName[0] || ""}${agent.lastName[0] || ""}`.toUpperCase())}</div>
      <div class="proof-agent-name"><div class="proof-agent-first">${escapeHtml(agent.firstName)}</div><div class="proof-agent-last">${escapeHtml(agent.lastName)}</div></div>
    </div>`;
    const tierHtml = (name, icon, sectionClass, headerClass, description) => {
      const orgs = Object.keys(tiers[name]).sort((a, b) => a.localeCompare(b));
      if (!orgs.length) return "";
      return `<div class="tier-section ${sectionClass}"><div class="tier-header ${headerClass}"><div class="tier-icon"><i class="${icon}"></i></div><div><div class="tier-title">${name}</div><div class="tier-desc">${description}</div></div></div>
        <div class="tier-offices">${orgs.map((org) => `<div class="office-group"><div class="office-name">${escapeHtml(org)}</div><div class="office-agents">${tiers[name][org].map(agentHtml).join("")}</div></div>`).join("")}</div></div>`;
    };
    proofArea.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:1rem" class="proof-actions"><button class="copy-btn" type="button" onclick="window.print()"><i class="fa-solid fa-print"></i> Print / Save PDF</button></div>
      <div class="final-proof-container"><div class="proof-header"><div class="proof-year">${YEAR}</div><div class="proof-title">Sales Excellence Award Winners</div>
      <div class="proof-subtitle">Bonita Springs-Estero REALTORS® is proud to recognize our top-producing agents who excel in their profession.</div>
      <div style="margin-top:1rem;display:flex;justify-content:center;gap:2rem;font-size:.85rem;color:rgba(255,255,255,.9)">
        <span><i class="fa-solid fa-gem"></i> Diamond: ${Object.values(tiers.Diamond).flat().length}</span>
        <span><i class="fa-solid fa-star"></i> Platinum: ${Object.values(tiers.Platinum).flat().length}</span>
        <span><i class="fa-solid fa-trophy"></i> Gold: ${Object.values(tiers.Gold).flat().length}</span>
      </div></div>
      ${tierHtml("Diamond", "fa-solid fa-gem", "diamond-section", "diamond-header", "20 Million or More in Total Sales Volume")}
      ${tierHtml("Platinum", "fa-solid fa-star", "platinum-section", "platinum-header", "10 Million or More in Total Sales Volume")}
      ${tierHtml("Gold", "fa-solid fa-trophy", "gold-section", "gold-header", "5 Million or More in Total Sales Volume")}
      </div>`;
  }

  function setupTabs() {
    for (const button of document.querySelectorAll(".tab-btn")) {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        const proof = button.dataset.tab === "finalproof";
        $("#contactsTab").classList.toggle("active", !proof);
        $("#finalProofTab").classList.toggle("active", proof);
        if (proof) generateFinalProof();
      });
    }
  }

  function setupUserPicker() {
    const userSelect = $("#userSelect");
    userSelect.innerHTML = '<option value="" disabled selected>Select User...</option>' + STAFF.map((name) => `<option value="${name}">${name}</option>`).join("");
    userSelect.addEventListener("change", () => {
      const button = $("#confirmUserBtn");
      button.disabled = !userSelect.value;
      button.style.opacity = userSelect.value ? "1" : ".5";
    });
    $("#confirmUserBtn").addEventListener("click", async () => {
      if (!userSelect.value) return;
      currentUser = userSelect.value;
      $("#userModal").classList.add("hidden");
      await loadData();
      clearInterval(syncTimer);
      syncTimer = setInterval(() => {
        if (!document.hidden && !$("#contentArea input:focus, #contentArea select:focus")) loadData({ quiet: true, preserveScroll: true });
      }, SYNC_INTERVAL_MS);
    });
    $("#changeUserBtn").addEventListener("click", () => $("#userModal").classList.remove("hidden"));
  }

  function setupAddContact() {
    const modal = $("#addContactModal");
    $("#addContactBtn").addEventListener("click", () => {
      const orgs = [...new Set(allContacts.map(organization))].sort((a, b) => a.localeCompare(b));
      $("#orgList").innerHTML = orgs.map((org) => `<option value="${escapeAttr(org)}"></option>`).join("");
      modal.classList.remove("hidden");
    });
    $("#closeAddContactBtn").addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", (event) => { if (event.target === modal) modal.classList.add("hidden"); });
    $("#addContactForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = new FormData(form);
      try {
        await api("/api/sea/records/add", {
          method: "POST",
          body: JSON.stringify({
            first_name: values.get("firstName"),
            last_name: values.get("lastName"),
            organization: values.get("organization"),
            email: values.get("email"),
            total_volume: values.get("salesVolume"),
            phone: values.get("priPhone"),
            city: values.get("city"),
            state: values.get("state"),
          }),
        });
        form.reset();
        form.elements.city.value = "Bonita Springs";
        form.elements.state.value = "FL";
        modal.classList.add("hidden");
        await loadData();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupUserPicker();
    setupTabs();
    setupAddContact();
    $("#search-input").addEventListener("input", (event) => {
      searchTerm = event.target.value.trim().toLowerCase();
      renderData();
    });
    $("#contentArea").addEventListener("change", handleCardChange);
    $("#contentArea").addEventListener("click", handleCardClick);
    $("#copyUnverifiedBtn").addEventListener("click", async (event) => {
      const emails = [...new Set(allContacts.filter((contact) => !bool(contact.contact_verified) && contact.primary_email).map((contact) => contact.primary_email))];
      await navigator.clipboard.writeText(emails.join("; "));
      const button = event.currentTarget;
      button.classList.add("copied");
      button.innerHTML = `<i class="fa-solid fa-check"></i> Copied ${emails.length} Emails`;
      setTimeout(() => { button.classList.remove("copied"); button.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Unverified Emails'; }, 2000);
    });
  });
})();
