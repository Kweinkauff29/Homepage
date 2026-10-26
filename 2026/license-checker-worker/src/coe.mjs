import { normalizeLicenseNumber } from "./dbpr.mjs";

const NAR_CYCLES = [
    { number: 8, start: "2025-01-01", end: "2027-12-31" },
    { number: 7, start: "2022-01-01", end: "2024-12-31" },
    { number: 6, start: "2019-01-01", end: "2021-12-31" },
];

export function narCycleForDate(value) {
    const date = String(value || "").slice(0, 10);
    return NAR_CYCLES.find((cycle) => date >= cycle.start && date <= cycle.end)?.number ?? null;
}

export function currentNarCycle(now = new Date()) {
    return narCycleForDate(now.toISOString().slice(0, 10));
}

export function coeEligibility(record, now = new Date()) {
    if (!record?.verified_date) return { eligible: false, reason: "no_verified_coe" };
    if (record.review_date && record.review_date > record.verified_date) {
        return { eligible: false, reason: "newer_ambiguous_ethics_record" };
    }
    const cycle = narCycleForDate(record.verified_date);
    if (!cycle || cycle !== currentNarCycle(now)) {
        return { eligible: false, reason: "verified_coe_outside_current_cycle", cycle };
    }
    return { eligible: true, reason: "verified_current_cycle", cycle };
}

export function latestCoeDate(records) {
    if (!Array.isArray(records)) return null;
    return records.reduce((latest, record) => {
        const date = String(record?.EthicsTrainingDate || "").slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(date) && (!latest || date > latest) ? date : latest;
    }, null);
}

export function editionLicenseNumber(data) {
    return normalizeLicenseNumber(data?.NRDSInformation?.NRDSLicenseNumber);
}

export function editionIsActive(data) {
    return String(data?.NRDSInformation?.NRDSStatusName || "").trim().toLowerCase() === "active";
}

export function editionSyncsToM1(data) {
    return String(data?.NRDSInformation?.SyncWithNRDS || "").trim().toLowerCase() === "yes";
}

export function newGrowthZoneCoeRecord(dbprRecord, model, cycle) {
    const year = Number(dbprRecord.verified_date.slice(0, 4));
    return {
        Id: "00000000-0000-0000-0000-000000000000",
        EthicsTrainingDate: `${dbprRecord.verified_date}T00:00:00Z`,
        EducationCourseCode: 1,
        Cycle: cycle,
        EducationCourseNumber: `${year}C${cycle}`,
        COEYear: year,
        AssociationId: model.AssociationId ?? null,
        EducationSponsoringAssociationId: null,
        IsDeletable: false,
        IsDeleted: false,
        CssClass: `C${cycle}`,
    };
}
