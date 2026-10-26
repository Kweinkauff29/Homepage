'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeJobRecord, normalizeLicenseNumber, toIsoDate, usDate } = require('../core');

test('normalizes license numbers and dates', () => {
    assert.equal(normalizeLicenseNumber('SL 003317954'), '3317954');
    assert.equal(toIsoDate('9/30/2028'), '2028-09-30');
    assert.equal(usDate('2026-09-14'), '9/14/2026');
});

test('accepts a license-only update', () => {
    const record = normalizeJobRecord({
        contactId: '32423357',
        licenseNumber: 'SL3317954',
        updateLicense: true,
        expirationDate: '2028-09-30',
    });
    assert.equal(record.updateLicense, true);
    assert.equal(record.updateCoe, false);
    assert.equal(record.expirationDate, '2028-09-30');
});

test('accepts a COE-only update', () => {
    const record = normalizeJobRecord({
        contactId: '32423357',
        licenseNumber: '3317954',
        updateCoe: 'Yes',
        coeDate: '2026-09-14',
        coeCycle: 8,
    });
    assert.equal(record.updateLicense, false);
    assert.equal(record.updateCoe, true);
    assert.equal(record.coeDate, '2026-09-14');
    assert.equal(record.coeCycle, 8);
});

test('accepts both updates on one contact', () => {
    const record = normalizeJobRecord({
        contactId: '32423357',
        licenseNumber: '3317954',
        updateLicense: true,
        expirationDate: '2028-09-30',
        updateCoe: true,
        coeDate: '2026-09-14',
        coeCycle: 8,
    });
    assert.equal(record.updateLicense, true);
    assert.equal(record.updateCoe, true);
});

test('rejects an update missing its required date or COE cycle', () => {
    assert.equal(normalizeJobRecord({ contactId: '1', licenseNumber: '2', updateLicense: true }), null);
    assert.equal(normalizeJobRecord({ contactId: '1', licenseNumber: '2', updateCoe: true, coeDate: '2026-09-14' }), null);
});
