const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function findAllSqliteFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch (e) {
        return fileList;
    }

    for (const file of files) {
        const fullPath = path.join(dir, file);
        let stat;
        try {
            stat = fs.statSync(fullPath);
        } catch (e) {
            continue;
        }

        if (stat.isDirectory()) {
            if (file === 'node_modules' || file === '.git' || file === '.vscode') continue;
            findAllSqliteFiles(fullPath, fileList);
        } else if (file.endsWith('.sqlite')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

console.log("Scanning for ALL .sqlite files...");
const allDbs = findAllSqliteFiles(process.cwd());
console.log(`Found ${allDbs.length} candidates.`);

for (const dbPath of allDbs) {
    console.log(`\nChecking DB: ${dbPath}`);
    try {
        const db = new Database(dbPath, { readonly: false });
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const tableNames = tables.map(t => t.name);
        console.log(`Tables (${tableNames.length}):`, tableNames.join(", "));

        if (tableNames.includes('weekly_entries')) {
            const count = db.prepare("SELECT count(*) as count FROM weekly_entries").get();
            console.log(`weekly_entries count: ${count.count}`);
        } else {
            console.log("!!! weekly_entries table MISSING !!!");
        }
    } catch (e) {
        console.log("  Failed to read:", e.message);
    }
}
