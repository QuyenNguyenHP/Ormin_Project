from __future__ import annotations

import argparse
import csv
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Iterable


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "flow_meter_history.db"
DEFAULT_CSV_PATH = BASE_DIR / "mock_do_flow_meter_data.csv"
DEFAULT_TABLE_NAME = "flow_meter_history"
CSV_TIMESTAMP_FORMAT = "%d/%m/%Y %H:%M"
DATABASE_TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"

REQUIRED_COLUMNS = [
    "Engine",
    "Channel Description",
    "Timestamp",
    "Value",
    "Unit",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a SQLite database and import flow meter history data."
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"SQLite database path. Default: {DEFAULT_DB_PATH}",
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_CSV_PATH,
        help=f"CSV source path. Default: {DEFAULT_CSV_PATH}",
    )
    parser.add_argument(
        "--table",
        default=DEFAULT_TABLE_NAME,
        help=f"Target SQLite table name. Default: {DEFAULT_TABLE_NAME}",
    )
    parser.add_argument(
        "--append",
        action="store_true",
        help="Append into the existing table instead of clearing it first.",
    )
    return parser.parse_args()


def quote_identifier(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def ensure_parent_directory(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def create_table(connection: sqlite3.Connection, table_name: str) -> None:
    quoted_table = quote_identifier(table_name)
    connection.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {quoted_table} (
            "Engine" INTEGER NOT NULL,
            "Channel Description" TEXT NOT NULL,
            "Timestamp" DATETIME NOT NULL,
            "Value" REAL NOT NULL,
            "Unit" TEXT NOT NULL
        )
        """
    )


def truncate_table(connection: sqlite3.Connection, table_name: str) -> None:
    quoted_table = quote_identifier(table_name)
    connection.execute(f"DELETE FROM {quoted_table}")


def drop_table(connection: sqlite3.Connection, table_name: str) -> None:
    quoted_table = quote_identifier(table_name)
    connection.execute(f"DROP TABLE IF EXISTS {quoted_table}")


def normalize_row(row: dict[str, str], row_number: int) -> tuple[int, str, str, float, str]:
    missing_columns = [column for column in REQUIRED_COLUMNS if column not in row]
    if missing_columns:
        raise ValueError(
            f"Row {row_number} is missing required columns: {', '.join(missing_columns)}"
        )

    try:
        engine = int(str(row["Engine"]).strip())
    except ValueError as exc:
        raise ValueError(f"Row {row_number} has invalid Engine value: {row['Engine']}") from exc

    channel_description = str(row["Channel Description"]).strip()
    raw_timestamp = str(row["Timestamp"]).strip()
    unit = str(row["Unit"]).strip()

    try:
        value = float(str(row["Value"]).strip())
    except ValueError as exc:
        raise ValueError(f"Row {row_number} has invalid Value: {row['Value']}") from exc

    if not channel_description:
        raise ValueError(f"Row {row_number} has an empty Channel Description")
    if not raw_timestamp:
        raise ValueError(f"Row {row_number} has an empty Timestamp")
    if not unit:
        raise ValueError(f"Row {row_number} has an empty Unit")

    try:
        timestamp = datetime.strptime(raw_timestamp, CSV_TIMESTAMP_FORMAT).strftime(
            DATABASE_TIMESTAMP_FORMAT
        )
    except ValueError as exc:
        raise ValueError(
            f"Row {row_number} has invalid Timestamp: {row['Timestamp']}"
        ) from exc

    return engine, channel_description, timestamp, value, unit


def read_csv_rows(source_path: Path) -> Iterable[tuple[int, str, str, float, str]]:
    with source_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for row_number, row in enumerate(reader, start=2):
            yield normalize_row(row, row_number)


def import_rows(
    connection: sqlite3.Connection,
    table_name: str,
    rows: Iterable[tuple[int, str, str, float, str]],
) -> int:
    quoted_table = quote_identifier(table_name)
    cursor = connection.cursor()
    inserted_count = 0

    for row in rows:
        cursor.execute(
            f"""
            INSERT INTO {quoted_table} (
                "Engine",
                "Channel Description",
                "Timestamp",
                "Value",
                "Unit"
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            row,
        )
        inserted_count += 1

    return inserted_count


def main() -> None:
    args = parse_args()
    db_path = args.db.resolve()
    source_path = args.source.resolve()

    if not source_path.exists():
        raise FileNotFoundError(f"Source CSV not found: {source_path}")

    ensure_parent_directory(db_path)

    with sqlite3.connect(db_path) as connection:
        if args.append:
            create_table(connection, args.table)
        else:
            drop_table(connection, args.table)
            create_table(connection, args.table)
        inserted_count = import_rows(connection, args.table, read_csv_rows(source_path))
        connection.commit()

    print(f"Database: {db_path}")
    print(f"Table: {args.table}")
    print(f"Source: {source_path}")
    print(f"Inserted rows: {inserted_count}")


if __name__ == "__main__":
    main()
