import fs from "node:fs";
import readline from "node:readline";

const VERIFIED_PATTERNS = [
    /\bCODE\s+OF\s+ETHICS\b/i,
    /\bNAR\s+ETHICS\b/i,
    /\bUSING\s+THE\s+CODE\s+TO\s+SOLVE\s+ETHICAL\s+DILEMMAS\b/i,
    /\bADHERING\s+TO\s+A\s+HIGHER\s+STANDARD\b/i,
];
const REVIEW_PATTERN = /\bETHIC(?:S|AL)\b/i;

function parseCsvLine(line) {
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

function normalizeLicense(value) {
    const compact = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const digits = compact.replace(/^[A-Z]+/, "").replace(/^0+/, "");
    return digits || compact;
}

function isoDate(value) {
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

function sql(value) {
    return value === null || value === undefined
        ? "NULL"
        : `'${String(value).replaceAll("'", "''")}'`;
}

const [inputPath, outputPath, sourceLastModified = ""] = process.argv.slice(2);
if (!inputPath || !outputPath) {
    throw new Error("Usage: node build-coe-seed.mjs <input.csv> <output.sql> [source-last-modified]");
}

const latest = new Map();
let rows = 0;
const lines = readline.createInterface({
    input: fs.createReadStream(inputPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
});

for await (const line of lines) {
    rows += 1;
    const fields = parseCsvLine(line);
    if (fields.length < 12) continue;

    const courseName = fields[9].trim();
    const verified = VERIFIED_PATTERNS.some((pattern) => pattern.test(courseName));
    const review = !verified && REVIEW_PATTERN.test(courseName);
    if (!verified && !review) continue;

    const courseDate = isoDate(fields[11]);
    const licenseNumber = normalizeLicense(fields[2]);
    if (!courseDate || !licenseNumber) continue;

    const current = latest.get(licenseNumber) || {
        licenseNumber,
        licenseNumberRaw: fields[2].trim(),
        rank: fields[0].trim(),
        personName: fields[3].trim(),
        expiration: isoDate(fields[7]),
        verified: null,
        review: null,
    };
    const candidate = {
        date: courseDate,
        number: fields[8].trim(),
        name: courseName,
        hours: Number(fields[10]),
    };
    if (verified && (!current.verified || candidate.date > current.verified.date)) current.verified = candidate;
    if (review && (!current.review || candidate.date > current.review.date)) current.review = candidate;
    latest.set(licenseNumber, current);
}

const output = fs.createWriteStream(outputPath, { encoding: "utf8" });
output.write("DELETE FROM dbpr_coe;\n");
for (const record of latest.values()) {
    const values = [
        record.licenseNumber,
        record.licenseNumberRaw,
        record.rank,
        record.personName,
        record.expiration,
        record.verified?.date,
        record.verified?.number,
        record.verified?.name,
        record.verified?.hours,
        record.review?.date,
        record.review?.number,
        record.review?.name,
        record.review?.hours,
        sourceLastModified,
    ];
    output.write(
        "INSERT INTO dbpr_coe (license_number, license_number_raw, rank, person_name, " +
        "license_expiration_date, verified_date, verified_course_number, verified_course_name, " +
        "verified_credit_hours, review_date, review_course_number, review_course_name, " +
        "review_credit_hours, source_last_modified) VALUES (" +
        values.map(sql).join(",") + ");\n",
    );
}
output.write(
    "UPDATE ingest_state SET status='complete', cursor=0, carry='', completed_at=CURRENT_TIMESTAMP, " +
    `source_last_modified=${sql(sourceLastModified)}, rows_processed=${rows}, verified_count=` +
    `(SELECT COUNT(*) FROM dbpr_coe WHERE verified_date IS NOT NULL), review_count=` +
    "(SELECT COUNT(*) FROM dbpr_coe WHERE review_date IS NOT NULL), last_error=NULL WHERE id=1;\n" +
    "",
);
output.end();
await new Promise((resolve, reject) => {
    output.on("finish", resolve);
    output.on("error", reject);
});

process.stdout.write(JSON.stringify({ sourceRows: rows, indexedLicenses: latest.size }) + "\n");
