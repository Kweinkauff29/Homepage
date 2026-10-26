'use strict';

function toIsoDate(value) {
    const text = String(value || '').trim();
    let match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if (match) return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
    match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function usDate(value) {
    const iso = toIsoDate(value);
    if (!iso) return '';
    const [year, month, day] = iso.split('-');
    return `${Number(month)}/${Number(day)}/${year}`;
}

function normalizeLicenseNumber(value) {
    const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return compact.replace(/^[A-Z]+/, '').replace(/^0+/, '') || compact;
}

function enabled(value) {
    return value === true || /^(1|true|yes)$/i.test(String(value || '').trim());
}

function normalizeJobRecord(record) {
    if (!record || typeof record !== 'object') return null;
    const contactId = String(record.contactId || '').trim();
    const licenseNumber = normalizeLicenseNumber(record.licenseNumber);
    const updateLicense = enabled(record.updateLicense);
    const updateCoe = enabled(record.updateCoe);
    const expirationDate = toIsoDate(record.expirationDate);
    const coeDate = toIsoDate(record.coeDate);
    const coeCycle = Number(record.coeCycle);

    if (!/^\d+$/.test(contactId) || !/^\d{1,20}$/.test(licenseNumber)) return null;
    if (!updateLicense && !updateCoe) return null;
    if (updateLicense && !expirationDate) return null;
    if (updateCoe && (!coeDate || !Number.isInteger(coeCycle) || coeCycle < 1 || coeCycle > 25)) return null;

    return {
        name: String(record.name || '').trim(),
        contactId,
        licenseNumber,
        updateLicense,
        updateCoe,
        expirationDate,
        coeDate,
        coeCycle: updateCoe ? coeCycle : null,
        coeCourseNumber: String(record.coeCourseNumber || '').trim(),
        coeCourseName: String(record.coeCourseName || '').trim(),
    };
}

module.exports = { enabled, normalizeJobRecord, normalizeLicenseNumber, toIsoDate, usDate };
