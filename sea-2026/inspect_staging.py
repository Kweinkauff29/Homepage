import sqlite3

db_path = r"c:\Users\Kevin\Homepage-6\sea-2026\database\sea_2026_local.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM sea_agents")
print("Total agents in sea_agents:", cur.fetchone()[0])

cur.execute("SELECT COUNT(*) FROM sea_records")
print("Total records in sea_records:", cur.fetchone()[0])

cur.execute("SELECT id, full_name, primary_email FROM sea_agents WHERE id LIKE '%TEST%'")
print("Test agents in sea_agents:", cur.fetchall())

cur.execute("SELECT eligibility_category, COUNT(*) FROM sea_records GROUP BY eligibility_category")
print("All records eligibility breakdown:", cur.fetchall())

cur.execute("SELECT eligibility_category, COUNT(*) FROM sea_records WHERE agent_id NOT LIKE '%TEST%' GROUP BY eligibility_category")
print("Real records eligibility breakdown:", cur.fetchall())

cur.execute("SELECT * FROM sea_award_years")
print("Award years config:", cur.fetchall())

conn.close()
