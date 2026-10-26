import type {
  AgentDetailRow,
  AgentListRow,
  AwardYearConfig,
  JsonObject,
  TokenContextRow,
} from "./types";
import { asBoolean, asTrimmedString, escapeCsv, isoInDays, randomToken, sha256Hex } from "./utils";

export const CATEGORIES = {
  qualified: "Qualified — Preliminary",
  verified: "Verified Eligible",
  priority: "Potential — High Priority",
  watch: "Potential — Watch List",
  review: "Needs Manual Review",
  ineligible: "Not Eligible",
} as const;

const VALID_CATEGORIES = new Set<string>(Object.values(CATEGORIES));
type BindValue = string | number | null | ArrayBuffer;

async function first<T>(db: D1Database, sql: string, bindings: BindValue[] = []): Promise<T | null> {
  return db.prepare(sql).bind(...bindings).first<T>();
}

async function all<T>(db: D1Database, sql: string, bindings: BindValue[] = []): Promise<T[]> {
  const result = await db.prepare(sql).bind(...bindings).all<T>();
  return result.results;
}

type SummaryRow = {
  total_agents: number;
  qualified: number;
  verified: number;
  priority: number;
  watch: number;
  review: number;
  ineligible: number;
  verified_contacts: number;
  unverified_contacts: number;
  missing_emails: number;
  verified_emails: number;
  growthzone_matched: number;
  growthzone_probable: number;
  growthzone_non_active: number;
  link_clicked: number;
  self_reported: number;
  independently_verified: number;
  override_count: number;
  trophies_selected: number;
  certificates_selected: number;
  attending_yes: number;
  attending_no: number;
  attending_undecided: number;
  awaiting_confirmation: number;
};

type FormMetricsRow = {
  tokens_generated: number;
  forms_started: number;
  forms_completed: number;
  links_revoked: number;
};

export async function getSummaryStats(
  db: D1Database,
  awardYear = 2026,
  includeTest = false,
): Promise<JsonObject> {
  const includeTestValue = includeTest ? 1 : 0;
  const summary = await first<SummaryRow>(
    db,
    `
      SELECT
        COUNT(*) AS total_agents,
        SUM(CASE WHEN r.eligibility_category = ? THEN 1 ELSE 0 END) AS qualified,
        SUM(CASE WHEN r.eligibility_category = ? THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN r.eligibility_category = ? THEN 1 ELSE 0 END) AS priority,
        SUM(CASE WHEN r.eligibility_category = ? THEN 1 ELSE 0 END) AS watch,
        SUM(CASE WHEN r.eligibility_category = ? THEN 1 ELSE 0 END) AS review,
        SUM(CASE WHEN r.eligibility_category = ? THEN 1 ELSE 0 END) AS ineligible,
        SUM(CASE WHEN r.contact_verified = 1 THEN 1 ELSE 0 END) AS verified_contacts,
        SUM(CASE WHEN r.contact_verified = 0 OR r.contact_verified IS NULL THEN 1 ELSE 0 END) AS unverified_contacts,
        SUM(CASE WHEN a.primary_email IS NULL OR TRIM(a.primary_email) = '' THEN 1 ELSE 0 END) AS missing_emails,
        SUM(CASE WHEN a.primary_email IS NOT NULL AND TRIM(a.primary_email) <> '' AND r.contact_verified = 1 THEN 1 ELSE 0 END) AS verified_emails,
        SUM(CASE WHEN gz.agent_id IS NOT NULL THEN 1 ELSE 0 END) AS growthzone_matched,
        SUM(CASE WHEN gz.match_status = 'Probable' THEN 1 ELSE 0 END) AS growthzone_probable,
        SUM(CASE WHEN gz.membership_status IS NOT NULL AND gz.membership_status <> 'Active' THEN 1 ELSE 0 END) AS growthzone_non_active,
        SUM(COALESCE(r.registration_link_clicked, 0)) AS link_clicked,
        SUM(COALESCE(r.registration_self_reported, 0)) AS self_reported,
        SUM(COALESCE(r.registration_independently_verified, 0)) AS independently_verified,
        SUM(CASE WHEN r.is_override = 1 THEN 1 ELSE 0 END) AS override_count,
        SUM(CASE WHEN r.award_preference = 'trophy' THEN 1 ELSE 0 END) AS trophies_selected,
        SUM(CASE WHEN r.award_preference = 'certificate' THEN 1 ELSE 0 END) AS certificates_selected,
        SUM(CASE WHEN r.attendance_response = 'yes' THEN 1 ELSE 0 END) AS attending_yes,
        SUM(CASE WHEN r.attendance_response = 'no' THEN 1 ELSE 0 END) AS attending_no,
        SUM(CASE WHEN r.attendance_response = 'undecided' THEN 1 ELSE 0 END) AS attending_undecided,
        SUM(CASE WHEN r.eligibility_category IN (?, ?) AND (r.award_preference IS NULL OR r.award_preference = '') THEN 1 ELSE 0 END) AS awaiting_confirmation
      FROM sea_records r
      JOIN sea_agents a ON a.id = r.agent_id
      LEFT JOIN sea_growthzone_contacts gz ON gz.agent_id = a.id
      WHERE r.award_year = ? AND r.is_archived = 0 AND (? = 1 OR r.is_test = 0)
    `,
    [
      CATEGORIES.qualified,
      CATEGORIES.verified,
      CATEGORIES.priority,
      CATEGORIES.watch,
      CATEGORIES.review,
      CATEGORIES.ineligible,
      CATEGORIES.qualified,
      CATEGORIES.verified,
      awardYear,
      includeTestValue,
    ],
  );

  const forms = await first<FormMetricsRow>(
    db,
    `
      SELECT
        COUNT(DISTINCT t.record_id) AS tokens_generated,
        SUM(CASE WHEN t.form_started = 1 THEN 1 ELSE 0 END) AS forms_started,
        SUM(CASE WHEN t.is_submitted = 1 THEN 1 ELSE 0 END) AS forms_completed,
        SUM(CASE WHEN t.revoked_at IS NOT NULL THEN 1 ELSE 0 END) AS links_revoked
      FROM sea_tokens t
      JOIN sea_records r ON r.id = t.record_id
      WHERE r.award_year = ? AND r.is_archived = 0 AND (? = 1 OR r.is_test = 0)
    `,
    [awardYear, includeTestValue],
  );

  const config = await first<AwardYearConfig>(
    db,
    `
      SELECT award_year, event_name, event_date, event_time, registration_url,
             min_volume_threshold, min_sides_threshold, email_mode,
             mandatory_bcc_email, is_active
      FROM sea_award_years
      WHERE award_year = ?
    `,
    [awardYear],
  );

  const testCount = await first<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM sea_records WHERE award_year = ? AND is_test = 1",
    [awardYear],
  );
  const s = summary ?? ({} as SummaryRow);
  const f = forms ?? ({} as FormMetricsRow);

  return {
    award_year: awardYear,
    total_agents: s.total_agents ?? 0,
    test_records_count: testCount?.count ?? 0,
    is_test_included: includeTest,
    categories: {
      [CATEGORIES.qualified]: s.qualified ?? 0,
      [CATEGORIES.verified]: s.verified ?? 0,
      [CATEGORIES.priority]: s.priority ?? 0,
      [CATEGORIES.watch]: s.watch ?? 0,
      [CATEGORIES.review]: s.review ?? 0,
      [CATEGORIES.ineligible]: s.ineligible ?? 0,
    },
    contact_metrics: {
      verified_contacts: s.verified_contacts ?? 0,
      unverified_contacts: s.unverified_contacts ?? 0,
      missing_emails: s.missing_emails ?? 0,
      verified_emails: s.verified_emails ?? 0,
      growthzone_matched: s.growthzone_matched ?? 0,
      growthzone_probable: s.growthzone_probable ?? 0,
      growthzone_non_active: s.growthzone_non_active ?? 0,
    },
    registration_facts: {
      link_clicked: s.link_clicked ?? 0,
      self_reported: s.self_reported ?? 0,
      independently_verified: s.independently_verified ?? 0,
    },
    form_metrics: {
      tokens_generated: f.tokens_generated ?? 0,
      forms_started: f.forms_started ?? 0,
      forms_completed: f.forms_completed ?? 0,
      links_revoked: f.links_revoked ?? 0,
      trophies_selected: s.trophies_selected ?? 0,
      certificates_selected: s.certificates_selected ?? 0,
      attending_yes: s.attending_yes ?? 0,
      attending_no: s.attending_no ?? 0,
      attending_undecided: s.attending_undecided ?? 0,
      awaiting_confirmation: s.awaiting_confirmation ?? 0,
    },
    override_count: s.override_count ?? 0,
    config: config ?? {},
    policy_notice: {
      year_2025_logic: "OR logic (Volume threshold OR Transaction Sides threshold)",
      year_2026_logic: "AND logic (> $5,000,000 volume AND > 25 transaction sides)",
      note: "2026 preliminary working requirements use strict AND logic. Official final winners require explicit staff verification and approval.",
    },
    email_system_status: "CAMPAIGNS DISABLED — NO AGENT EMAILS WILL BE SENT",
  };
}

export type ListAgentsOptions = {
  awardYear?: number;
  category?: string | null;
  search?: string | null;
  office?: string | null;
  formStatus?: string | null;
  verification?: string | null;
  staff?: string | null;
  sortBy?: string | null;
  sortDir?: string | null;
  includeTest?: boolean;
};

export async function listAgents(db: D1Database, options: ListAgentsOptions = {}): Promise<AgentListRow[]> {
  const conditions = ["r.award_year = ?", "r.is_archived = 0"];
  const bindings: BindValue[] = [options.awardYear ?? 2026];

  if (!options.includeTest) conditions.push("r.is_test = 0");
  if (options.category && options.category !== "all") {
    conditions.push("r.eligibility_category = ?");
    bindings.push(options.category);
  }
  if (options.office && options.office !== "all") {
    conditions.push("r.office = ?");
    bindings.push(options.office);
  }
  if (options.verification && options.verification !== "all") {
    const filters: Record<string, string> = {
      verified: "r.contact_verified = 1",
      unverified: "(r.contact_verified = 0 OR r.contact_verified IS NULL)",
      missing_email: "(a.primary_email IS NULL OR TRIM(a.primary_email) = '')",
      has_email: "(a.primary_email IS NOT NULL AND TRIM(a.primary_email) <> '')",
    };
    const filter = filters[options.verification];
    if (filter) conditions.push(filter);
  }
  if (options.staff && options.staff !== "all") {
    conditions.push("r.assigned_staff = ?");
    bindings.push(options.staff);
  }
  if (options.search) {
    const term = `%${options.search.trim()}%`;
    conditions.push("(a.full_name LIKE ? OR a.license_id LIKE ? OR r.office LIKE ? OR COALESCE(m.brokerage_name, '') LIKE ? OR a.primary_email LIKE ? OR COALESCE(gz.contact_id, '') LIKE ? OR COALESCE(gz.source_display_name, '') LIKE ? OR COALESCE(gz.business_mobile_phone, '') LIKE ?)");
    bindings.push(term, term, term, term, term, term, term, term);
  }
  if (options.formStatus && options.formStatus !== "all") {
    const filters: Record<string, string> = {
      completed: "t.is_submitted = 1",
      started: "t.form_started = 1 AND (t.is_submitted = 0 OR t.is_submitted IS NULL)",
      clicked: "r.registration_link_clicked = 1",
      uninvited: "t.token IS NULL",
    };
    const filter = filters[options.formStatus];
    if (filter) conditions.push(filter);
  }

  const direction = options.sortDir?.toLowerCase() === "asc" ? "ASC" : "DESC";
  const sortClauses: Record<string, string> = {
    volume: `r.total_volume ${direction}`,
    sides: `r.total_sides ${direction}`,
    name: `a.last_name ${direction}, a.first_name ${direction}`,
    brokerage: `office_display_name ${direction}`,
    eligibility: `r.eligibility_category ${direction}`,
    verification: `r.contact_verified ${direction}`,
  };
  const orderBy = options.sortBy && sortClauses[options.sortBy]
    ? sortClauses[options.sortBy]
    : `
      CASE r.eligibility_category
        WHEN '${CATEGORIES.verified}' THEN 1
        WHEN '${CATEGORIES.qualified}' THEN 2
        WHEN '${CATEGORIES.priority}' THEN 3
        WHEN '${CATEGORIES.watch}' THEN 4
        WHEN '${CATEGORIES.review}' THEN 5
        ELSE 6
      END,
      r.total_sides DESC,
      r.total_volume DESC
    `;

  return all<AgentListRow>(
    db,
    `
      SELECT
        r.id AS record_id, r.award_year, r.office,
        COALESCE(m.brokerage_name, r.office) AS office_display_name,
        CASE WHEN m.brokerage_name IS NOT NULL THEN 1 ELSE 0 END AS is_office_mapped,
        r.total_sides, r.list_sides, r.sold_sides, r.total_volume, r.list_volume, r.sold_volume,
        r.sides_rank, r.volume_rank, r.projected_2026_sides, r.projected_2026_volume,
        r.sides_needed, r.volume_needed, r.year_end_pace, r.in_report, r.workbook_category,
        r.eligibility_category, r.is_override, r.override_reason, r.override_by, r.override_at,
        r.award_preference, r.engraved_name, r.attendance_response,
        r.registration_link_clicked, r.registration_link_clicked_at,
        r.registration_self_reported, r.registration_self_reported_at,
        r.registration_independently_verified, r.contact_verified, r.contact_verified_by,
        r.contact_verified_at,
        r.proof_numbers_confirmed, r.proof_numbers_confirmed_by, r.proof_numbers_confirmed_at,
        r.proof_event_registered, r.proof_event_registered_by, r.proof_event_registered_at,
        r.proof_not_attending, r.proof_not_attending_by, r.proof_not_attending_at,
        r.proof_award_preference, r.proof_award_preference_by, r.proof_award_preference_at,
        r.proof_confirmed_volume, r.proof_confirmed_volume_by, r.proof_confirmed_volume_at,
        r.proof_headshot_url, r.proof_headshot_by, r.proof_headshot_at,
        r.proof_award_level, r.proof_award_level_by, r.proof_award_level_at,
        r.is_archived, r.assigned_staff, r.outreach_status, r.internal_notes, r.is_test,
        a.id AS agent_id, a.license_id, a.first_name, a.last_name, a.full_name,
        a.primary_email, a.primary_phone, a.manual_city, a.manual_state,
        gz.contact_id AS growthzone_contact_id,
        gz.source_display_name AS growthzone_display_name,
        gz.business_mobile_phone AS growthzone_mobile_phone,
        gz.organization_id AS growthzone_organization_id,
        gz.organization_name AS growthzone_organization_name,
        gz.membership_status AS growthzone_membership_status,
        gz.match_status AS growthzone_match_status,
        gz.source_last_updated_date AS growthzone_last_updated_date,
        gz.source_exported_at AS growthzone_exported_at,
        gzo.main_phone AS office_main_phone,
        gzo.address AS office_address,
        gzo.city AS office_city,
        gzo.state AS office_state,
        gzo.zip AS office_zip,
        t.token AS active_token, t.token_hash, t.form_started,
        t.is_submitted AS form_submitted, t.submitted_at AS form_submitted_at,
        t.revoked_at AS token_revoked_at
      FROM sea_records r
      JOIN sea_agents a ON a.id = r.agent_id
      LEFT JOIN sea_office_mappings m ON m.office_code = r.office
      LEFT JOIN sea_growthzone_contacts gz ON gz.agent_id = a.id
      LEFT JOIN sea_growthzone_offices gzo ON gzo.office_code = r.office
      LEFT JOIN sea_tokens t ON t.token = (
        SELECT t2.token FROM sea_tokens t2
        WHERE t2.record_id = r.id AND t2.revoked_at IS NULL
        ORDER BY t2.created_at DESC LIMIT 1
      )
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${orderBy}
    `,
    bindings,
  );
}

export async function getAgentDetail(db: D1Database, recordId: string): Promise<JsonObject | null> {
  const detail = await first<AgentDetailRow>(
    db,
    `
      SELECT r.*,
        COALESCE(m.brokerage_name, r.office) AS office_display_name,
        CASE WHEN m.brokerage_name IS NOT NULL THEN 1 ELSE 0 END AS is_office_mapped,
        a.id AS agent_id, a.license_id, a.first_name, a.last_name, a.full_name,
        a.primary_email, a.primary_phone, a.primary_office, a.is_test AS agent_is_test,
        gz.contact_id AS growthzone_contact_id,
        gz.source_display_name AS growthzone_display_name,
        gz.business_mobile_phone AS growthzone_mobile_phone,
        gz.organization_id AS growthzone_organization_id,
        gz.organization_name AS growthzone_organization_name,
        gz.membership_status AS growthzone_membership_status,
        gz.match_status AS growthzone_match_status,
        gz.source_last_updated_date AS growthzone_last_updated_date,
        gz.source_exported_at AS growthzone_exported_at,
        gzo.main_phone AS office_main_phone,
        gzo.address AS office_address,
        gzo.city AS office_city,
        gzo.state AS office_state,
        gzo.zip AS office_zip,
        t.token AS active_token, t.token_hash, t.expires_at AS token_expires_at,
        t.revoked_at AS token_revoked_at, t.form_started,
        t.is_submitted AS form_submitted, t.submitted_at AS form_submitted_at
      FROM sea_records r
      JOIN sea_agents a ON a.id = r.agent_id
      LEFT JOIN sea_office_mappings m ON m.office_code = r.office
      LEFT JOIN sea_growthzone_contacts gz ON gz.agent_id = a.id
      LEFT JOIN sea_growthzone_offices gzo ON gzo.office_code = r.office
      LEFT JOIN sea_tokens t ON t.token = (
        SELECT t2.token FROM sea_tokens t2
        WHERE t2.record_id = r.id AND t2.revoked_at IS NULL
        ORDER BY t2.created_at DESC LIMIT 1
      )
      WHERE r.id = ?
    `,
    [recordId],
  );
  if (!detail) return null;

  const formResponse = await first<Record<string, unknown>>(
    db,
    "SELECT * FROM sea_form_responses WHERE record_id = ?",
    [recordId],
  );
  const formRevisions = formResponse && typeof formResponse.id === "string"
    ? await all<Record<string, unknown>>(
        db,
        "SELECT * FROM sea_form_revisions WHERE response_id = ? ORDER BY id DESC",
        [formResponse.id],
      )
    : [];
  const registrationEvents = await all<Record<string, unknown>>(
    db,
    "SELECT * FROM sea_registration_events WHERE record_id = ? ORDER BY id DESC",
    [recordId],
  );
  const contactCorrections = await all<Record<string, unknown>>(
    db,
    "SELECT * FROM sea_contact_corrections WHERE record_id = ? ORDER BY id DESC",
    [recordId],
  );
  const auditLogs = await all<Record<string, unknown>>(
    db,
    `SELECT field_name, old_value, new_value, changed_by, reason, created_at
     FROM sea_audit_log WHERE record_id = ? ORDER BY id DESC`,
    [recordId],
  );
  const emailLogs = await all<Record<string, unknown>>(
    db,
    `SELECT recipient_email, bcc_email, subject, email_type, email_mode,
            delivery_status, error_message, triggered_by, created_at
     FROM sea_email_logs WHERE record_id = ? ORDER BY id DESC`,
    [recordId],
  );

  return {
    ...detail,
    form_response: formResponse,
    form_revisions: formRevisions,
    registration_events: registrationEvents,
    contact_corrections: contactCorrections,
    audit_logs: auditLogs,
    email_logs: emailLogs,
  };
}

export async function getAwardYears(db: D1Database): Promise<Record<string, unknown>[]> {
  return all<Record<string, unknown>>(db, "SELECT * FROM sea_award_years ORDER BY award_year DESC");
}

export async function getBrokerageMappings(db: D1Database): Promise<Record<string, unknown>[]> {
  return all<Record<string, unknown>>(db, "SELECT * FROM sea_office_mappings ORDER BY office_code ASC");
}

export async function exportAgentsCsv(
  db: D1Database,
  awardYear: number,
  category: string | null,
  verification: string | null,
): Promise<string> {
  const agents = await listAgents(db, {
    awardYear,
    category,
    verification,
    includeTest: false,
  });
  const headers = [
    "AgentName", "LicenseID", "OfficeCode", "BrokerageName", "QualificationStatus",
    "TotalVolume", "TotalSides", "ListSides", "SoldSides", "Email",
    "ContactVerified", "VerifiedBy", "Phone", "MobilePhone", "GrowthZoneContactID",
    "GrowthZoneMembershipStatus", "GrowthZoneMatchStatus", "OfficeMainPhone", "OfficeAddress",
    "AssignedStaff", "AwardPreference", "AttendanceResponse",
    "RegistrationIndependentlyVerified", "InternalNotes",
  ];
  const lines = [headers.map(escapeCsv).join(",")];
  for (const agent of agents) {
    const row = [
      agent.full_name,
      agent.license_id,
      agent.office,
      agent.office_display_name,
      agent.eligibility_category,
      agent.total_volume,
      agent.total_sides,
      agent.list_sides ?? 0,
      agent.sold_sides ?? 0,
      agent.primary_email,
      agent.contact_verified ? "YES" : "NO",
      agent.contact_verified_by,
      agent.primary_phone,
      agent.growthzone_mobile_phone,
      agent.growthzone_contact_id,
      agent.growthzone_membership_status,
      agent.growthzone_match_status,
      agent.office_main_phone,
      [agent.office_address, agent.office_city, agent.office_state, agent.office_zip].filter(Boolean).join(", "),
      agent.assigned_staff,
      agent.award_preference,
      agent.attendance_response,
      agent.registration_independently_verified ? "YES" : "NO",
      agent.internal_notes,
    ];
    lines.push(row.map(escapeCsv).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

type ExistingUpdateRow = {
  agent_id: string;
  primary_email: string | null;
  primary_phone: string | null;
  full_name: string;
  license_id: string | null;
  internal_notes: string | null;
  assigned_staff: string | null;
  outreach_status: string | null;
  office: string | null;
  award_preference: string | null;
  engraved_name: string | null;
  attendance_response: string | null;
  contact_verified: number | null;
  registration_independently_verified: number | null;
  proof_numbers_confirmed: number | null;
  proof_event_registered: number | null;
  proof_not_attending: number | null;
  proof_award_preference: string | null;
  proof_confirmed_volume: number | null;
  proof_headshot_url: string | null;
  proof_award_level: string | null;
};

export async function updateAgentRecord(
  db: D1Database,
  recordId: string,
  updates: JsonObject,
  staffUser: string,
): Promise<JsonObject> {
  const existing = await first<ExistingUpdateRow>(
    db,
    `
      SELECT r.internal_notes, r.assigned_staff, r.outreach_status, r.office,
             r.award_preference, r.engraved_name, r.attendance_response,
             r.contact_verified, r.registration_independently_verified,
             r.proof_numbers_confirmed, r.proof_event_registered, r.proof_not_attending,
             r.proof_award_preference, r.proof_confirmed_volume,
             r.proof_headshot_url, r.proof_award_level,
             a.id AS agent_id, a.primary_email, a.primary_phone, a.full_name, a.license_id
      FROM sea_records r JOIN sea_agents a ON a.id = r.agent_id
      WHERE r.id = ?
    `,
    [recordId],
  );
  if (!existing) throw new Error(`Record ${recordId} not found.`);

  const statements: D1PreparedStatement[] = [];
  const changedFields: string[] = [];
  const agentFields = ["primary_email", "primary_phone", "full_name", "license_id"] as const;
  for (const field of agentFields) {
    if (!(field in updates) || updates[field] === null || updates[field] === undefined) continue;
    const newValue = asTrimmedString(updates[field]);
    const oldValue = String(existing[field] ?? "");
    if (newValue === oldValue) continue;
    statements.push(
      db.prepare(`UPDATE sea_agents SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(newValue, existing.agent_id),
      db.prepare(`
        INSERT INTO sea_audit_log
          (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
        VALUES (?, ?, ?, ?, ?, 'Contact Information Update', datetime('now'))
      `).bind(recordId, field, oldValue, newValue, staffUser),
    );
    changedFields.push(field);
  }

  const recordFields = [
    "internal_notes",
    "assigned_staff",
    "outreach_status",
    "office",
    "award_preference",
    "engraved_name",
    "attendance_response",
  ] as const;
  for (const field of recordFields) {
    if (!(field in updates) || updates[field] === null || updates[field] === undefined) continue;
    const newValue = asTrimmedString(updates[field]);
    const oldValue = String(existing[field] ?? "");
    if (newValue === oldValue) continue;
    statements.push(
      db.prepare(`UPDATE sea_records SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(newValue, recordId),
      db.prepare(`
        INSERT INTO sea_audit_log
          (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
        VALUES (?, ?, ?, ?, ?, 'Staff Operational Update', datetime('now'))
      `).bind(recordId, field, oldValue, newValue, staffUser),
    );
    changedFields.push(field);
  }

  if ("contact_verified" in updates) {
    const next = asBoolean(updates.contact_verified) ? 1 : 0;
    const previous = existing.contact_verified ?? 0;
    if (next !== previous) {
      statements.push(
        db.prepare(`
          UPDATE sea_records SET contact_verified = ?, contact_verified_by = ?,
            contact_verified_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ?
        `).bind(next, next ? staffUser : null, recordId),
        db.prepare(`
          INSERT INTO sea_audit_log
            (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
          VALUES (?, 'contact_verified', ?, ?, ?, 'Contact Verification State Change', datetime('now'))
        `).bind(recordId, String(previous), String(next), staffUser),
      );
      changedFields.push("contact_verified");
    }
  }

  if ("registration_independently_verified" in updates) {
    const next = asBoolean(updates.registration_independently_verified) ? 1 : 0;
    const previous = existing.registration_independently_verified ?? 0;
    if (next !== previous) {
      statements.push(
        db.prepare(`
          UPDATE sea_records SET registration_independently_verified = ?,
            registration_independently_verified_by = ?,
            registration_independently_verified_at = datetime('now'),
            updated_at = datetime('now')
          WHERE id = ?
        `).bind(next, next ? staffUser : null, recordId),
        db.prepare(`
          INSERT INTO sea_audit_log
            (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
          VALUES (?, 'registration_independently_verified', ?, ?, ?,
                  'Event Registration Audit Verification', datetime('now'))
        `).bind(recordId, String(previous), String(next), staffUser),
      );
      changedFields.push("registration_independently_verified");
    }
  }

  const proofBooleanFields = [
    "proof_numbers_confirmed",
    "proof_event_registered",
    "proof_not_attending",
  ] as const;
  for (const field of proofBooleanFields) {
    if (!(field in updates)) continue;
    const next = asBoolean(updates[field]) ? 1 : 0;
    const previous = existing[field] ?? 0;
    if (next === previous) continue;
    const attributionPrefix = field.replace(/^proof_/u, "proof_");
    statements.push(
      db.prepare(`UPDATE sea_records SET ${field} = ?, ${attributionPrefix}_by = ?,
        ${attributionPrefix}_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`)
        .bind(next, staffUser, recordId),
      db.prepare(`INSERT INTO sea_audit_log
        (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
        VALUES (?, ?, ?, ?, ?, '2025-style proof workflow update', datetime('now'))`)
        .bind(recordId, field, String(previous), String(next), staffUser),
    );
    changedFields.push(field);
  }

  const proofStringFields = [
    "proof_award_preference",
    "proof_headshot_url",
    "proof_award_level",
  ] as const;
  const validAwardPreferences = new Set(["", "trophy", "certificate", "none"]);
  const validAwardLevels = new Set(["", "Diamond", "Platinum", "Gold", "Does Not Qualify"]);
  for (const field of proofStringFields) {
    if (!(field in updates) || updates[field] === undefined || updates[field] === null) continue;
    const next = asTrimmedString(updates[field]);
    if (field === "proof_award_preference" && !validAwardPreferences.has(next)) {
      throw new Error("Invalid award preference.");
    }
    if (field === "proof_award_level" && !validAwardLevels.has(next)) {
      throw new Error("Invalid actual award level.");
    }
    if (field === "proof_headshot_url" && next && !/^https:\/\//iu.test(next)) {
      throw new Error("Headshot links must begin with https://");
    }
    const previous = String(existing[field] ?? "");
    if (next === previous) continue;
    const attributionPrefix = field === "proof_headshot_url" ? "proof_headshot" : field;
    statements.push(
      db.prepare(`UPDATE sea_records SET ${field} = ?, ${attributionPrefix}_by = ?,
        ${attributionPrefix}_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`)
        .bind(next || null, staffUser, recordId),
      db.prepare(`INSERT INTO sea_audit_log
        (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
        VALUES (?, ?, ?, ?, ?, '2025-style proof workflow update', datetime('now'))`)
        .bind(recordId, field, previous, next, staffUser),
    );
    changedFields.push(field);
  }

  if ("proof_confirmed_volume" in updates) {
    const raw = String(updates.proof_confirmed_volume ?? "").replace(/[$,\s]/gu, "");
    const next = raw === "" ? null : Number(raw);
    if (next !== null && (!Number.isFinite(next) || next < 0)) {
      throw new Error("Broker confirmed volume must be a non-negative number.");
    }
    const previous = existing.proof_confirmed_volume;
    if (next !== previous) {
      statements.push(
        db.prepare(`UPDATE sea_records SET proof_confirmed_volume = ?,
          proof_confirmed_volume_by = ?, proof_confirmed_volume_at = datetime('now'),
          updated_at = datetime('now') WHERE id = ?`).bind(next, staffUser, recordId),
        db.prepare(`INSERT INTO sea_audit_log
          (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
          VALUES (?, 'proof_confirmed_volume', ?, ?, ?, '2025-style proof workflow update', datetime('now'))`)
          .bind(recordId, previous === null ? "" : String(previous), next === null ? "" : String(next), staffUser),
      );
      changedFields.push("proof_confirmed_volume");
    }
  }

  const resultingRegistered = "proof_event_registered" in updates
    ? asBoolean(updates.proof_event_registered)
    : Boolean(existing.proof_event_registered);
  const resultingNotAttending = "proof_not_attending" in updates
    ? asBoolean(updates.proof_not_attending)
    : Boolean(existing.proof_not_attending);
  if (resultingRegistered && resultingNotAttending) {
    throw new Error("A contact cannot be marked both Event Registered and Not Attending.");
  }

  if (statements.length > 0) await db.batch(statements);
  return {
    status: "success",
    record_id: recordId,
    updated_by: staffUser,
    changed_fields: changedFields,
    timestamp: new Date().toISOString(),
  };
}

export async function addManualAgent(
  db: D1Database,
  payload: JsonObject,
  staffUser: string,
): Promise<JsonObject> {
  const firstName = asTrimmedString(payload.first_name);
  const lastName = asTrimmedString(payload.last_name);
  const organization = asTrimmedString(payload.organization);
  const email = asTrimmedString(payload.email).toLowerCase();
  const phone = asTrimmedString(payload.phone);
  const city = asTrimmedString(payload.city);
  const state = asTrimmedString(payload.state);
  const rawVolume = String(payload.total_volume ?? "").replace(/[$,\s]/gu, "");
  const totalVolume = rawVolume ? Number(rawVolume) : 0;
  if (!firstName || !lastName || !organization || !email) {
    throw new Error("First name, last name, organization, and email are required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) throw new Error("Enter a valid email address.");
  if (!Number.isFinite(totalVolume) || totalVolume < 0) throw new Error("Sales volume must be a non-negative number.");

  const suffix = crypto.randomUUID();
  const agentId = `AGT-MANUAL-${suffix}`;
  const recordId = `SEA-2026-MANUAL-${suffix}`;
  const fullName = `${firstName} ${lastName}`;
  await db.batch([
    db.prepare(`INSERT INTO sea_agents
      (id, first_name, last_name, full_name, primary_email, primary_phone, primary_office,
       manual_city, manual_state, is_active, is_test, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, datetime('now'), datetime('now'))`)
      .bind(agentId, firstName, lastName, fullName, email, phone || null, organization, city || null, state || null),
    db.prepare(`INSERT INTO sea_records
      (id, agent_id, award_year, office, total_sides, total_volume, eligibility_category,
       contact_verified, is_test, created_at, updated_at)
      VALUES (?, ?, 2026, ?, 0, ?, ?, 0, 0, datetime('now'), datetime('now'))`)
      .bind(recordId, agentId, organization, totalVolume, CATEGORIES.review),
    db.prepare(`INSERT INTO sea_audit_log
      (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
      VALUES (?, 'record_created', NULL, ?, ?, 'Manual contact added from SEA interface', datetime('now'))`)
      .bind(recordId, fullName, staffUser),
  ]);
  return { status: "success", record_id: recordId, agent_id: agentId, created_by: staffUser };
}

export async function archiveAgentRecord(
  db: D1Database,
  recordId: string,
  staffUser: string,
): Promise<JsonObject> {
  if (staffUser !== "Kevin") throw new Error("Only Kevin can remove a contact from the working list.");
  const existing = await first<{ is_archived: number | null }>(
    db,
    "SELECT is_archived FROM sea_records WHERE id = ?",
    [recordId],
  );
  if (!existing) throw new Error(`Record ${recordId} not found.`);
  if (existing.is_archived === 1) return { status: "success", record_id: recordId, already_archived: true };
  await db.batch([
    db.prepare(`UPDATE sea_records SET is_archived = 1, archived_by = ?,
      archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).bind(staffUser, recordId),
    db.prepare(`INSERT INTO sea_audit_log
      (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
      VALUES (?, 'is_archived', '0', '1', ?, 'Removed from 2026 working list', datetime('now'))`)
      .bind(recordId, staffUser),
  ]);
  return { status: "success", record_id: recordId, archived_by: staffUser };
}

export async function applyEligibilityOverride(
  db: D1Database,
  recordId: string,
  newCategory: string,
  reason: string,
  staffUser: string,
): Promise<JsonObject> {
  if (!VALID_CATEGORIES.has(newCategory)) throw new Error(`Invalid eligibility category: ${newCategory}`);
  if (!reason.trim()) throw new Error("Reason is mandatory for eligibility overrides and approvals.");
  const existing = await first<{ eligibility_category: string }>(
    db,
    "SELECT eligibility_category FROM sea_records WHERE id = ?",
    [recordId],
  );
  if (!existing) throw new Error(`Record ${recordId} not found.`);
  const timestamp = new Date().toISOString();
  await db.batch([
    db.prepare(`
      UPDATE sea_records SET eligibility_category = ?, is_override = 1,
        override_reason = ?, override_by = ?, override_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(newCategory, reason.trim(), staffUser, timestamp, recordId),
    db.prepare(`
      INSERT INTO sea_audit_log
        (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
      VALUES (?, 'eligibility_category', ?, ?, ?, ?, datetime('now'))
    `).bind(recordId, existing.eligibility_category, newCategory, staffUser, reason.trim()),
  ]);
  return {
    status: "success",
    record_id: recordId,
    old_category: existing.eligibility_category,
    new_category: newCategory,
    changed_by: staffUser,
    timestamp,
  };
}

export async function updateBrokerageMapping(
  db: D1Database,
  officeCode: string,
  brokerageName: string,
  staffUser: string,
): Promise<JsonObject> {
  const code = officeCode.trim().toUpperCase();
  const name = brokerageName.trim();
  if (!code || !name) throw new Error("office_code and brokerage_name are required.");
  await db.prepare(`
    INSERT INTO sea_office_mappings
      (office_code, brokerage_name, is_verified, updated_by, updated_at)
    VALUES (?, ?, 1, ?, datetime('now'))
    ON CONFLICT(office_code) DO UPDATE SET
      brokerage_name = excluded.brokerage_name,
      is_verified = 1,
      updated_by = excluded.updated_by,
      updated_at = datetime('now')
  `).bind(code, name, staffUser).run();
  return { status: "success", office_code: code, brokerage_name: name };
}

export async function generateToken(
  db: D1Database,
  recordId: string,
  daysValid = 60,
): Promise<{ rawToken: string; tokenHash: string }> {
  const record = await first<{ id: string }>(db, "SELECT id FROM sea_records WHERE id = ?", [recordId]);
  if (!record) throw new Error(`Record ${recordId} not found.`);
  const rawToken = randomToken();
  const tokenHash = await sha256Hex(rawToken);
  await db.batch([
    db.prepare("UPDATE sea_tokens SET revoked_at = datetime('now') WHERE record_id = ? AND revoked_at IS NULL")
      .bind(recordId),
    db.prepare(`
      INSERT INTO sea_tokens
        (token, token_hash, record_id, expires_at, revoked_at, is_submitted, form_version, created_at)
      VALUES (?, ?, ?, ?, NULL, 0, 'v1', datetime('now'))
    `).bind(rawToken, tokenHash, recordId, isoInDays(daysValid)),
  ]);
  return { rawToken, tokenHash };
}

export async function revokeToken(db: D1Database, recordId: string): Promise<boolean> {
  const result = await db.prepare(`
    UPDATE sea_tokens SET revoked_at = datetime('now')
    WHERE record_id = ? AND revoked_at IS NULL
  `).bind(recordId).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function verifyToken(
  db: D1Database,
  rawToken: string,
  preview = false,
): Promise<JsonObject> {
  const cleanToken = rawToken.trim();
  if (!cleanToken) throw new Error("Confirmation token is required.");
  const tokenHash = await sha256Hex(cleanToken);
  const context = await first<TokenContextRow>(
    db,
    `
      SELECT t.token, t.token_hash, t.record_id, t.expires_at, t.revoked_at,
        t.is_submitted, t.submitted_at, t.form_started,
        r.agent_id, r.award_year, r.office, r.total_sides, r.total_volume,
        r.eligibility_category, r.award_preference, r.engraved_name,
        r.attendance_response, r.registration_link_clicked,
        r.registration_link_clicked_at, r.registration_self_reported,
        r.registration_independently_verified, r.is_test,
        a.license_id, a.first_name, a.last_name, a.full_name,
        a.primary_email, a.primary_phone,
        y.event_name, y.event_date, y.event_time, y.registration_url
      FROM sea_tokens t
      JOIN sea_records r ON r.id = t.record_id
      JOIN sea_agents a ON a.id = r.agent_id
      JOIN sea_award_years y ON y.award_year = r.award_year
      WHERE t.token_hash = ? OR t.token = ?
      ORDER BY t.created_at DESC LIMIT 1
    `,
    [tokenHash, cleanToken],
  );
  if (!context) throw new Error("Invalid or unrecognized confirmation link.");
  if (context.revoked_at) throw new Error(`This confirmation link was revoked by staff on ${context.revoked_at}.`);
  if (context.expires_at && Date.parse(context.expires_at) < Date.now()) {
    throw new Error("This confirmation link has expired. Please contact CCOR staff for assistance.");
  }

  if (!preview) {
    await db.prepare(`
      UPDATE sea_tokens SET last_accessed_at = datetime('now'), form_started = 1,
        form_started_at = COALESCE(form_started_at, datetime('now'))
      WHERE token = ?
    `).bind(context.token).run();
  }
  const draft = await first<Record<string, unknown>>(
    db,
    "SELECT * FROM sea_form_drafts WHERE record_id = ?",
    [context.record_id],
  );
  const response = await first<Record<string, unknown>>(
    db,
    "SELECT * FROM sea_form_responses WHERE record_id = ?",
    [context.record_id],
  );
  return { ...context, draft, existing_response: response };
}

export async function recordRegistrationClick(
  db: D1Database,
  context: JsonObject,
  ipAddress: string | null,
  userAgent: string,
): Promise<JsonObject> {
  const recordId = asTrimmedString(context.record_id);
  const agentId = asTrimmedString(context.agent_id);
  const awardYear = Number(context.award_year);
  const eventName = asTrimmedString(context.event_name);
  const targetUrl = asTrimmedString(context.registration_url);
  const timestamp = new Date().toISOString();
  await db.batch([
    db.prepare(`
      INSERT INTO sea_registration_events
        (record_id, agent_id, award_year, event_name, target_url, clicked_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)
    `).bind(recordId, agentId, awardYear, eventName, targetUrl, ipAddress, userAgent),
    db.prepare(`
      UPDATE sea_records SET registration_link_clicked = 1,
        registration_link_clicked_at = COALESCE(registration_link_clicked_at, datetime('now')),
        updated_at = datetime('now') WHERE id = ?
    `).bind(recordId),
  ]);
  return {
    status: "success",
    record_id: recordId,
    registration_link_clicked: 1,
    clicked_at: timestamp,
    target_url: targetUrl,
    message: "Registration link opened.",
  };
}

export async function saveDraft(
  db: D1Database,
  recordId: string,
  payload: JsonObject,
): Promise<JsonObject> {
  await db.prepare(`
    INSERT INTO sea_form_drafts
      (record_id, draft_award_preference, draft_engraved_name,
       draft_attendance_response, draft_self_reported, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(record_id) DO UPDATE SET
      draft_award_preference = excluded.draft_award_preference,
      draft_engraved_name = excluded.draft_engraved_name,
      draft_attendance_response = excluded.draft_attendance_response,
      draft_self_reported = excluded.draft_self_reported,
      updated_at = datetime('now')
  `).bind(
    recordId,
    asTrimmedString(payload.award_preference) || null,
    asTrimmedString(payload.engraved_name) || null,
    asTrimmedString(payload.attendance_response) || null,
    asBoolean(payload.registration_self_reported) ? 1 : 0,
  ).run();
  return { status: "saved", record_id: recordId };
}

export class ConfirmationValidationError extends Error {
  constructor(
    message: string,
    readonly code: "VALIDATION_ERROR" | "REGISTRATION_LINK_NOT_CLICKED" | "REGISTRATION_AFFIRMATION_REQUIRED",
  ) {
    super(message);
    this.name = "ConfirmationValidationError";
  }
}

export async function submitConfirmation(
  db: D1Database,
  rawToken: string,
  context: JsonObject,
  payload: JsonObject,
  ipAddress: string | null,
  userAgent: string,
): Promise<JsonObject> {
  const engravedName = asTrimmedString(payload.engraved_name);
  if (!engravedName) {
    throw new ConfirmationValidationError("Name to appear on the award is required.", "VALIDATION_ERROR");
  }
  const awardPreference = asTrimmedString(payload.award_preference).toLowerCase();
  if (awardPreference !== "certificate" && awardPreference !== "trophy") {
    throw new ConfirmationValidationError(
      "Please select your preferred award: Certificate or Trophy.",
      "VALIDATION_ERROR",
    );
  }
  const attendance = asTrimmedString(payload.attendance_response).toLowerCase();
  if (!new Set(["yes", "no", "undecided"]).has(attendance)) {
    throw new ConfirmationValidationError(
      "Please indicate whether you will be attending the ceremony: Yes, No, or Undecided.",
      "VALIDATION_ERROR",
    );
  }

  const recordId = asTrimmedString(context.record_id);
  const record = await first<{ registration_link_clicked: number | null; registration_link_clicked_at: string | null }>(
    db,
    "SELECT registration_link_clicked, registration_link_clicked_at FROM sea_records WHERE id = ?",
    [recordId],
  );
  if (!record?.registration_link_clicked) {
    throw new ConfirmationValidationError(
      "You must open the official event registration link at least once before completing your award confirmation.",
      "REGISTRATION_LINK_NOT_CLICKED",
    );
  }

  let selfReported = 0;
  if (attendance === "yes") {
    if (!asBoolean(payload.registration_self_reported)) {
      throw new ConfirmationValidationError(
        "Attending agents must affirmatively confirm that they have completed event registration.",
        "REGISTRATION_AFFIRMATION_REQUIRED",
      );
    }
    selfReported = 1;
  }

  const agentId = asTrimmedString(context.agent_id);
  const awardYear = Number(context.award_year);
  const licenseId = asTrimmedString(context.license_id);
  const responseId = `RESP-${awardYear}-${licenseId}`;
  const submittedAt = new Date().toISOString();
  const corrections = payload.corrections;
  const correctionObject = corrections && typeof corrections === "object" && !Array.isArray(corrections)
    ? corrections as JsonObject
    : {};
  const requestedName = asTrimmedString(correctionObject.preferred_name);
  const requestedEmail = asTrimmedString(correctionObject.corrected_email);
  const requestedPhone = asTrimmedString(correctionObject.corrected_phone);
  const requestedOffice = asTrimmedString(correctionObject.corrected_brokerage);
  const tokenHash = await sha256Hex(rawToken.trim());

  const statements: D1PreparedStatement[] = [
    db.prepare(`
      INSERT INTO sea_form_responses
        (id, record_id, agent_id, award_year, award_preference, engraved_name,
         attendance_response, registration_self_reported, registration_link_clicked,
         registration_link_clicked_at, submitted_at, ip_address, user_agent, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1)
      ON CONFLICT(record_id) DO UPDATE SET
        award_preference = excluded.award_preference,
        engraved_name = excluded.engraved_name,
        attendance_response = excluded.attendance_response,
        registration_self_reported = excluded.registration_self_reported,
        submitted_at = excluded.submitted_at,
        ip_address = excluded.ip_address,
        user_agent = excluded.user_agent,
        is_active = 1
    `).bind(
      responseId,
      recordId,
      agentId,
      awardYear,
      awardPreference,
      engravedName,
      attendance,
      selfReported,
      record.registration_link_clicked_at ?? submittedAt,
      submittedAt,
      ipAddress,
      userAgent,
    ),
    db.prepare(`
      UPDATE sea_records SET award_preference = ?, engraved_name = ?, attendance_response = ?,
        registration_self_reported = ?,
        registration_self_reported_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(awardPreference, engravedName, attendance, selfReported, selfReported, recordId),
    db.prepare(`
      UPDATE sea_tokens SET is_submitted = 1, submitted_at = datetime('now')
      WHERE token_hash = ? OR token = ?
    `).bind(tokenHash, rawToken.trim()),
    db.prepare(`
      INSERT INTO sea_audit_log
        (record_id, field_name, old_value, new_value, changed_by, reason, created_at)
      VALUES (?, 'form_submission', 'unsubmitted', ?, 'agent',
              'Agent completed personalized confirmation form', datetime('now'))
    `).bind(recordId, `Preference: ${awardPreference}, Attendance: ${attendance}`),
    db.prepare("DELETE FROM sea_form_drafts WHERE record_id = ?").bind(recordId),
  ];
  if (requestedName || requestedEmail || requestedPhone || requestedOffice) {
    statements.push(
      db.prepare(`
        INSERT INTO sea_contact_corrections
          (record_id, agent_id, requested_name, requested_email,
           requested_phone, requested_office, review_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
      `).bind(
        recordId,
        agentId,
        requestedName || null,
        requestedEmail || null,
        requestedPhone || null,
        requestedOffice || null,
      ),
    );
  }
  await db.batch(statements);

  const attendanceNote = attendance === "yes"
    ? "Your event registration has been self-confirmed. CCOR will verify event registration separately."
    : attendance === "undecided"
      ? "We have recorded your attendance as undecided. Staff will follow up closer to the event."
      : "We have recorded that you will not be attending. Your award preference has been securely saved.";
  return {
    status: "success",
    message: "Thank you! Your Sales Excellence Awards information has been received.",
    attendance_note: attendanceNote,
    award_preference: awardPreference,
    engraved_name: engravedName,
    attendance_response: attendance,
    registration_self_reported: selfReported,
    submitted_at: submittedAt,
  };
}

export async function getAwardYearConfig(db: D1Database, awardYear = 2026): Promise<AwardYearConfig | null> {
  return first<AwardYearConfig>(
    db,
    `SELECT award_year, event_name, event_date, event_time, registration_url,
            min_volume_threshold, min_sides_threshold, email_mode,
            mandatory_bcc_email, is_active
     FROM sea_award_years WHERE award_year = ?`,
    [awardYear],
  );
}

export async function logBlockedEmailAttempt(
  db: D1Database,
  recordId: string | null,
  recipientEmail: string,
  subject: string,
  staffUser: string,
  mandatoryBcc: string,
): Promise<void> {
  const message = "Outbound email blocked: System email_mode is 'disabled'. Real agent emails and automated campaigns are strictly prohibited.";
  await db.prepare(`
    INSERT INTO sea_email_logs
      (record_id, recipient_email, bcc_email, subject, email_type, email_mode,
       delivery_status, error_message, triggered_by, created_at)
    VALUES (?, ?, ?, ?, 'test', 'disabled', 'blocked_disabled', ?, ?, datetime('now'))
  `).bind(recordId, recipientEmail, mandatoryBcc, subject, message, staffUser).run();
}
