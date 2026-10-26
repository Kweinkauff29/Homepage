export const VERIFIED_COE_TITLE_PATTERNS = [
    /\bCODE\s+OF\s+ETHICS\b/i,
    /\bNAR\s+ETHICS\b/i,
    /\bUSING\s+THE\s+CODE\s+TO\s+SOLVE\s+ETHICAL\s+DILEMMAS\b/i,
    /\bADHERING\s+TO\s+A\s+HIGHER\s+STANDARD\b/i,
];

export const REVIEW_ETHICS_TITLE_PATTERN = /\bETHIC(?:S|AL)\b/i;

export function normalizeLicenseNumber(value) {
    const compact = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const digits = compact.replace(/^[A-Z]+/, "").replace(/^0+/, "");
    return digits || compact;
}

export function parseCsvLine(line) {
    const fields = [];
    let field = "";
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
        const character = line[index];
        if (character === '"') {
            if (quoted && line[index + 1] === '"') {
                field += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
        } else if (character === "," && !quoted) {
            fields.push(field);
            field = "";
        } else {
            field += character;
        }
    }
    fields.push(field);
    return fields;
}

export function parseUsDate(value) {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(value || "").trim());
    if (!match) return null;
    const [, month, day, year] = match;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
        parsed.getUTCFullYear() !== Number(year) ||
        parsed.getUTCMonth() !== Number(month) - 1 ||
        parsed.getUTCDate() !== Number(day)
    ) return null;
    return parsed.toISOString().slice(0, 10);
}

export function parseDbprLine(line) {
    const fields = parseCsvLine(line);
    if (fields.length < 12) return null;
    const courseDate = parseUsDate(fields[11]);
    const licenseNumber = normalizeLicenseNumber(fields[2]);
    if (!courseDate || !licenseNumber) return null;
    return {
        rank: fields[0].trim(),
        licenseNumber,
        licenseNumberRaw: fields[2].trim(),
        personName: fields[3].trim(),
        licenseExpirationDate: parseUsDate(fields[7]),
        courseNumber: fields[8].trim(),
        courseName: fields[9].trim(),
        courseCreditHours: Number(fields[10]),
        courseDate,
    };
}

export function classifyCoeCourse(record) {
    if (!record) return "not_coe";
    if (VERIFIED_COE_TITLE_PATTERNS.some((pattern) => pattern.test(record.courseName))) {
        return "verified";
    }
    if (REVIEW_ETHICS_TITLE_PATTERN.test(record.courseName)) return "review";
    return "not_coe";
}
