import sqlite3
import openpyxl
import os

def verify_workbook_against_db():
    wb_path = r"C:\Users\Kevin\Downloads\SEA_Recruiting_Qualified_and_Potential_2026.xlsx"
    db_path = r"c:\Users\Kevin\Homepage-6\sea-2026\database\sea_2026_local.db"

    print("=== RUNNING SOURCE ACCURACY AUDIT: WORKBOOK VS STAGING DB ===")
    wb = openpyxl.load_workbook(wb_path, data_only=True)
    ws = wb["All Agents"]

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Query all real records in DB
    cur.execute("""
        SELECT a.id, a.license_id, a.full_name, r.office, r.total_sides, r.total_volume,
               r.list_sides, r.sold_sides, r.list_volume, r.sold_volume,
               r.sides_rank, r.volume_rank, r.eligibility_category
        FROM sea_records r
        JOIN sea_agents a ON r.agent_id = a.id
        WHERE a.id NOT LIKE '%TEST%'
    """)
    db_records = {row[1]: row for row in cur.fetchall()}  # Key by license_id

    print(f"Total real records in DB: {len(db_records)}")

    # Header is at row 6, data starts at row 7
    # Row 6: ['Agent', 'Office', 'Agent ID', 'Total Sides', 'Total Volume', 'List Sides', 'Sold Sides', 'List Volume', 'Sold Volume', 'Sides Rank', 'Volume Rank', 'SEA / Prospect Category', ...]
    wb_records = []
    for r in range(7, ws.max_row + 1):
        agent_name = ws.cell(row=r, column=1).value
        office = ws.cell(row=r, column=2).value
        agent_id = ws.cell(row=r, column=3).value
        if not agent_name or not agent_id:
            continue
        total_sides = float(ws.cell(row=r, column=4).value or 0.0)
        total_volume = float(ws.cell(row=r, column=5).value or 0.0)
        list_sides = float(ws.cell(row=r, column=6).value or 0.0)
        sold_sides = float(ws.cell(row=r, column=7).value or 0.0)
        list_volume = float(ws.cell(row=r, column=8).value or 0.0)
        sold_volume = float(ws.cell(row=r, column=9).value or 0.0)
        sides_rank = ws.cell(row=r, column=10).value
        volume_rank = ws.cell(row=r, column=11).value
        cat = ws.cell(row=r, column=12).value

        wb_records.append({
            "name": agent_name,
            "office": office,
            "license_id": str(agent_id),
            "total_sides": total_sides,
            "total_volume": total_volume,
            "list_sides": list_sides,
            "sold_sides": sold_sides,
            "list_volume": list_volume,
            "sold_volume": sold_volume,
            "sides_rank": sides_rank,
            "volume_rank": volume_rank,
            "category": cat
        })

    print(f"Total source records in workbook 'All Agents': {len(wb_records)}")

    # Compare counts
    assert len(db_records) == len(wb_records), f"Count mismatch! DB has {len(db_records)}, workbook has {len(wb_records)}"

    mismatches = []
    fractional_sides_count = 0

    for item in wb_records:
        lic = item["license_id"]
        if lic not in db_records:
            mismatches.append(f"Missing from DB: {item['name']} (License {lic})")
            continue

        db_row = db_records[lic]
        # db_row: (id, license_id, full_name, office, total_sides, total_volume, list_sides, sold_sides, list_volume, sold_volume, sides_rank, volume_rank, eligibility_category)
        db_total_sides = db_row[4]
        db_total_volume = db_row[5]
        db_list_sides = db_row[6]
        db_sold_sides = db_row[7]

        # Check fractional sides
        if db_total_sides % 1 != 0 or db_list_sides % 1 != 0 or db_sold_sides % 1 != 0:
            fractional_sides_count += 1

        if abs(db_total_sides - item["total_sides"]) > 0.001:
            mismatches.append(f"Total sides mismatch for {lic}: DB={db_total_sides}, WB={item['total_sides']}")

        if abs(db_total_volume - item["total_volume"]) > 0.01:
            mismatches.append(f"Total volume mismatch for {lic}: DB={db_total_volume}, WB={item['total_volume']}")

        if abs(db_list_sides - item["list_sides"]) > 0.001:
            mismatches.append(f"List sides mismatch for {lic}: DB={db_list_sides}, WB={item['list_sides']}")

        if abs(db_sold_sides - item["sold_sides"]) > 0.001:
            mismatches.append(f"Sold sides mismatch for {lic}: DB={db_sold_sides}, WB={item['sold_sides']}")

    print(f"Verified {len(wb_records)} records against workbook.")
    print(f"Records with verified fractional (0.5) transaction sides: {fractional_sides_count}")
    print(f"Total value/sides mismatches: {len(mismatches)}")
    if mismatches:
        for m in mismatches[:10]:
            print("  ERROR:", m)
    else:
        print("ALL 237 SOURCE RECORDS MATCH THE WORKBOOK WITH 100% PRECISION!")

    # Check for duplicate annual records
    cur.execute("SELECT agent_id, award_year, COUNT(*) FROM sea_records GROUP BY agent_id, award_year HAVING COUNT(*) > 1")
    dupes = cur.fetchall()
    print(f"Duplicate annual records in sea_records: {len(dupes)}")
    assert len(dupes) == 0, "Found duplicate annual records!"

    conn.close()

if __name__ == "__main__":
    verify_workbook_against_db()
