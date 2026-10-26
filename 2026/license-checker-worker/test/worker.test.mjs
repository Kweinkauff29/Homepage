import assert from "node:assert/strict";
import test from "node:test";

import {
    classifyCoeCourse,
    normalizeLicenseNumber,
    parseCsvLine,
    parseDbprLine,
} from "../src/dbpr.mjs";
import {
    coeEligibility,
    editionIsActive,
    editionLicenseNumber,
    editionSyncsToM1,
    latestCoeDate,
    narCycleForDate,
    newGrowthZoneCoeRecord,
} from "../src/coe.mjs";

test("parses DBPR quoted CSV fields and normalizes licenses", () => {
    const line = '"SL","Sales Associate","SL03317954","BERGER, ANA PAULA","","","NAPLES FL","09/30/2027","123","(DISTANCE) NAR ETHICS","3","09/14/2026"';
    const fields = parseCsvLine(line);
    assert.equal(fields[3], "BERGER, ANA PAULA");
    const record = parseDbprLine(line);
    assert.equal(record.licenseNumber, "3317954");
    assert.equal(record.courseDate, "2026-09-14");
    assert.equal(classifyCoeCourse(record), "verified");
    assert.equal(normalizeLicenseNumber("BK 003552181"), "3552181");
});

test("only explicit COE titles are auto-eligible", () => {
    const generic = parseDbprLine('"SL","Sales Associate","SL1","DOE, JANE","","","NAPLES FL","09/30/2027","124","ETHICS AT WORK","3","02/02/2026"');
    const packageCourse = parseDbprLine('"SL","Sales Associate","SL1","DOE, JANE","","","NAPLES FL","09/30/2027","125","(DISTANCE) CONTINUING EDUCATION","14","03/02/2026"');
    assert.equal(classifyCoeCourse(generic), "review");
    assert.equal(classifyCoeCourse(packageCourse), "not_coe");
});

test("blocks stale or ambiguous COE candidates", () => {
    assert.deepEqual(coeEligibility({ verified_date: "2024-05-02", review_date: null }, new Date("2026-10-26T00:00:00Z")), {
        eligible: false,
        reason: "verified_coe_outside_current_cycle",
        cycle: 7,
    });
    assert.equal(coeEligibility({ verified_date: "2026-01-02", review_date: "2026-02-02" }).reason, "newer_ambiguous_ethics_record");
    assert.equal(coeEligibility({ verified_date: "2026-09-14", review_date: null }).eligible, true);
    assert.equal(narCycleForDate("2026-09-14"), 8);
});

test("creates the GrowthZone COEC Cycle 8 record shape", () => {
    const record = newGrowthZoneCoeRecord(
        { verified_date: "2026-09-14" },
        { AssociationId: 2515 },
        8,
    );
    assert.equal(record.EducationCourseCode, 1);
    assert.equal(record.Cycle, 8);
    assert.equal(record.EducationCourseNumber, "2026C8");
    assert.equal(record.EthicsTrainingDate, "2026-09-14T00:00:00Z");
});

test("finds the latest GrowthZone COE date", () => {
    assert.equal(latestCoeDate([
        { EthicsTrainingDate: "2023-10-24T00:00:00Z" },
        { EthicsTrainingDate: "2026-09-14T00:00:00Z" },
    ]), "2026-09-14");
});

test("requires the active M1-linked GrowthZone license", () => {
    const edition = {
        NRDSInformation: {
            NRDSStatusName: "Active",
            NRDSLicenseNumber: "SL3317954",
            SyncWithNRDS: "Yes",
        },
    };
    assert.equal(editionIsActive(edition), true);
    assert.equal(editionSyncsToM1(edition), true);
    assert.equal(editionLicenseNumber(edition), "3317954");
});
