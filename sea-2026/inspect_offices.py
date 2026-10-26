import sqlite3

db_path = r"c:\Users\Kevin\Homepage-6\sea-2026\database\sea_2026_local.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT DISTINCT office FROM sea_records WHERE is_test = 0 ORDER BY office" if "is_test" in [c[1] for c in cur.execute("PRAGMA table_info(sea_records)").fetchall()] else "SELECT DISTINCT office FROM sea_records WHERE agent_id NOT LIKE '%TEST%' ORDER BY office")
offices = [r[0] for r in cur.fetchall()]
print(f"Distinct offices in 2026 records ({len(offices)}):")
print(offices)

conn.close()
