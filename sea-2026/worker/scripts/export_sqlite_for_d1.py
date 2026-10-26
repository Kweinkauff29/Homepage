"""Create a data-only, D1-compatible staging import from the local SEA SQLite database."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path


TABLE_ORDER = [
    "sea_agents",
    "sea_award_years",
    "sea_office_mappings",
    "sea_growthzone_offices",
    "sea_growthzone_contacts",
    "sea_records",
    "sea_tokens",
    "sea_audit_log",
    "sea_email_logs",
    "sea_registration_events",
    "sea_form_drafts",
    "sea_form_responses",
    "sea_form_revisions",
    "sea_contact_corrections",
]


def sql_literal(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, bytes):
        return f"X'{value.hex()}'"
    return "'" + str(value).replace("'", "''") + "'"


def export_data(source_path: Path, output_path: Path) -> dict[str, int]:
    source = sqlite3.connect(f"file:{source_path.as_posix()}?mode=ro", uri=True)
    staged = sqlite3.connect(":memory:")
    source.backup(staged)
    source.close()

    staged.execute(
        "UPDATE sea_award_years SET email_mode='disabled', mandatory_bcc_email='tech@coconutcoastrealtors.org'"
    )
    staged.execute(
        """
        UPDATE sea_tokens
        SET revoked_at = COALESCE(revoked_at, datetime('now'))
        WHERE record_id IN (SELECT id FROM sea_records WHERE is_test = 0)
        """
    )
    # The local Stage 4 database contains one token for a legacy record that no
    # longer exists. D1 correctly enforces the declared foreign key, so omit
    # orphaned tokens from the clean staging snapshot.
    staged.execute(
        "DELETE FROM sea_tokens WHERE record_id NOT IN (SELECT id FROM sea_records)"
    )
    # Keep the deliberately blocked fictional scenario deterministic in every
    # fresh staging import, independent of any local test runs.
    staged.execute("DELETE FROM sea_form_responses WHERE record_id='REC-2026-TEST-C'")
    staged.execute("DELETE FROM sea_form_drafts WHERE record_id='REC-2026-TEST-C'")
    staged.execute(
        """
        UPDATE sea_records SET
          award_preference=NULL, engraved_name=NULL, attendance_response=NULL,
          registration_link_clicked=0, registration_link_clicked_at=NULL,
          registration_self_reported=0, registration_self_reported_at=NULL
        WHERE id='REC-2026-TEST-C'
        """
    )
    staged.execute(
        """
        UPDATE sea_tokens SET is_submitted=0, submitted_at=NULL, revoked_at=NULL,
          form_started=0, form_started_at=NULL
        WHERE token='TEST-TOKEN-SCENARIO-C-BLOCKED-VALIDATION'
        """
    )
    staged.commit()

    real_count = staged.execute(
        "SELECT COUNT(*) FROM sea_records WHERE award_year=2026 AND is_test=0"
    ).fetchone()[0]
    test_count = staged.execute(
        "SELECT COUNT(*) FROM sea_records WHERE award_year=2026 AND is_test=1"
    ).fetchone()[0]
    if real_count != 237 or test_count != 3:
        raise RuntimeError(f"Unexpected staging roster counts: real={real_count}, test={test_count}")
    foreign_key_errors = staged.execute("PRAGMA foreign_key_check").fetchall()
    if foreign_key_errors:
        raise RuntimeError(f"Staging snapshot has foreign-key violations: {foreign_key_errors}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    counts: dict[str, int] = {}
    with output_path.open("w", encoding="utf-8", newline="\n") as output:
        output.write("-- Generated staging data import. Do not commit: contains member contact data.\n")
        output.write("-- Email mode is forced disabled; every real-agent token is revoked.\n")
        for table in TABLE_ORDER:
            columns = [row[1] for row in staged.execute(f'PRAGMA table_info("{table}")')]
            quoted_columns = ", ".join(f'"{column}"' for column in columns)
            rows = staged.execute(f'SELECT * FROM "{table}"').fetchall()
            counts[table] = len(rows)
            for row in rows:
                values = ", ".join(sql_literal(value) for value in row)
                output.write(f'INSERT INTO "{table}" ({quoted_columns}) VALUES ({values});\n')
    staged.close()
    return counts


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    counts = export_data(args.source.resolve(), args.output.resolve())
    print("Generated D1 staging import:")
    for table, count in counts.items():
        print(f"  {table}: {count}")


if __name__ == "__main__":
    main()
