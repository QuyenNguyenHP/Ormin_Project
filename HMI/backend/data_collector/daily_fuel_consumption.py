"""Calculate daily D.O/H.O consumption from paired flow readings in SQLite.

The collector stores timestamps in UTC and flow values in L/H. Consumption
is the mean (inlet - outlet) flow for each UTC day multiplied by 24 hours.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import date, timedelta
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
COLLECTOR_CONFIG = BASE_DIR / "modbus_csv_db_collector_config.json"
BACKEND_CONFIG = BASE_DIR.parent / "backend_config.json"
DESTINATION_TABLE = "fuel_consumption"
LEGACY_TABLE = "Fuel_Consumpotion"
CONSUMPTION_COLUMN = "Consumption (L)"
INLET_COLUMN = "Average_inlet_flow (L/H)"
OUTLET_COLUMN = "Average_outlet_flow (L/H)"
CONSUMPTION_DECIMALS = 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--day",
        type=date.fromisoformat,
        metavar="YYYY-MM-DD",
        help="Recalculate one UTC day; omit to recalculate all available days.",
    )
    return parser.parse_args()


def read_configuration() -> tuple[Path, str, list[tuple[int, str, int, str, str]]]:
    with COLLECTOR_CONFIG.open(encoding="utf-8") as file:
        collector = json.load(file)
    with BACKEND_CONFIG.open(encoding="utf-8") as file:
        backend = json.load(file)

    output = collector["output"]
    database_path = (BASE_DIR / output["database_path"]).resolve()
    source_table = str(output["table_name"])
    mappings: list[tuple[int, str, int, str, str]] = []
    for fuel_type, config_key in (("D.O", "fo_consumption"), ("H.O", "ho_consumption")):
        for engine in backend[config_key]["display_engines"]:
            mappings.append(
                (
                    int(engine["display_engine"]),
                    fuel_type,
                    int(engine["source_engine"]),
                    str(engine["inlet_channel_description"]),
                    str(engine["outlet_channel_description"]),
                )
            )
    return database_path, source_table, mappings


def quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def create_destination_table(connection: sqlite3.Connection) -> bool:
    old_table = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (LEGACY_TABLE,),
    ).fetchone()
    new_table = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (DESTINATION_TABLE,),
    ).fetchone()
    if old_table and not new_table:
        connection.execute(
            f"ALTER TABLE {quote_identifier(LEGACY_TABLE)} RENAME TO {quote_identifier(DESTINATION_TABLE)}"
        )

    connection.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {quote_identifier(DESTINATION_TABLE)} (
            "Engine" INTEGER NOT NULL,
            "Day" TEXT NOT NULL,
            "Fuel_type" TEXT NOT NULL,
            {quote_identifier(CONSUMPTION_COLUMN)} INTEGER NOT NULL,
            {quote_identifier(INLET_COLUMN)} REAL,
            {quote_identifier(OUTLET_COLUMN)} REAL,
            PRIMARY KEY ("Engine", "Day", "Fuel_type")
        )
        """
    )
    columns = {
        row[1] for row in connection.execute(f"PRAGMA table_info({quote_identifier(DESTINATION_TABLE)})")
    }
    migrated = old_table is not None
    for old_name, new_name, declaration in (
        ("Consumption", CONSUMPTION_COLUMN, "INTEGER NOT NULL"),
        ("Average_inlet_flow", INLET_COLUMN, "REAL"),
        ("Average_outlet_flow", OUTLET_COLUMN, "REAL"),
    ):
        if new_name in columns:
            continue
        if old_name in columns:
            connection.execute(
                f"ALTER TABLE {quote_identifier(DESTINATION_TABLE)} "
                f"RENAME COLUMN {quote_identifier(old_name)} TO {quote_identifier(new_name)}"
            )
        else:
            connection.execute(
                f"ALTER TABLE {quote_identifier(DESTINATION_TABLE)} "
                f"ADD COLUMN {quote_identifier(new_name)} {declaration}"
            )
        migrated = True

    for unit_column in ("Flow_unit", "Unit"):
        if unit_column in columns:
            connection.execute(
                f"ALTER TABLE {quote_identifier(DESTINATION_TABLE)} "
                f"DROP COLUMN {quote_identifier(unit_column)}"
            )
            migrated = True

    if old_table and new_table:
        connection.execute(
            f"""
            INSERT INTO {quote_identifier(DESTINATION_TABLE)}
                ("Engine", "Day", "Fuel_type", {quote_identifier(CONSUMPTION_COLUMN)})
            SELECT "Engine", "Day", "Fuel_type", CAST(ROUND("Consumption", 0) AS INTEGER)
            FROM {quote_identifier(LEGACY_TABLE)}
            WHERE 1 = 1
            ON CONFLICT("Engine", "Day", "Fuel_type") DO NOTHING
            """
        )
        connection.execute(f"DROP TABLE {quote_identifier(LEGACY_TABLE)}")
    return migrated


def calculate_daily_consumption(
    connection: sqlite3.Connection,
    source_table: str,
    source_engine: int,
    inlet_channel: str,
    outlet_channel: str,
    selected_day: date | None,
) -> list[tuple[str, int, float, float]]:
    day_filter = ""
    parameters: list[object] = [outlet_channel, source_engine, inlet_channel]
    if selected_day is not None:
        day_filter = 'AND inlet."Timestamp" >= ? AND inlet."Timestamp" < ?'
        parameters.extend((selected_day.isoformat(), (selected_day + timedelta(days=1)).isoformat()))

    # Match readings at the same timestamp so missing inlet or outlet samples
    # cannot skew the average. Both signals must use litres per hour.
    records = connection.execute(
        f"""
        SELECT substr(inlet."Timestamp", 1, 10) AS day,
               AVG(inlet."Value") AS average_inlet_flow,
               AVG(outlet."Value") AS average_outlet_flow,
               COUNT(*) AS paired_count
        FROM {quote_identifier(source_table)} AS inlet
        JOIN {quote_identifier(source_table)} AS outlet
          ON outlet."Engine" = inlet."Engine"
         AND outlet."Timestamp" = inlet."Timestamp"
         AND outlet."Channel Description" = ?
        WHERE inlet."Engine" = ?
          AND inlet."Channel Description" = ?
          AND lower(replace(inlet."Unit", ' ', '')) = 'l/h'
          AND lower(replace(outlet."Unit", ' ', '')) = 'l/h'
          {day_filter}
        GROUP BY substr(inlet."Timestamp", 1, 10)
        ORDER BY day
        """,
        parameters,
    ).fetchall()

    return [
        (
            day,
            int(round((average_inlet - average_outlet) * 24.0, CONSUMPTION_DECIMALS)),
            average_inlet,
            average_outlet,
        )
        for day, average_inlet, average_outlet, _ in records
    ]


def main() -> None:
    args = parse_args()
    database_path, source_table, mappings = read_configuration()
    if not database_path.is_file():
        raise FileNotFoundError(f"SQLite database not found: {database_path}")

    written = 0
    with sqlite3.connect(database_path) as connection:
        if connection.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
            (source_table,),
        ).fetchone() is None:
            raise ValueError(f"Source table not found: {source_table}")
        migrated = create_destination_table(connection)
        for engine, fuel_type, source_engine, inlet, outlet in mappings:
            for day, consumption, average_inlet, average_outlet in calculate_daily_consumption(
                connection, source_table, source_engine, inlet, outlet,
                None if migrated else args.day,
            ):
                connection.execute(
                    f"""
                    INSERT INTO {quote_identifier(DESTINATION_TABLE)}
                        ("Engine", "Day", "Fuel_type", {quote_identifier(CONSUMPTION_COLUMN)},
                         {quote_identifier(INLET_COLUMN)}, {quote_identifier(OUTLET_COLUMN)})
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT("Engine", "Day", "Fuel_type")
                    DO UPDATE SET
                        {quote_identifier(CONSUMPTION_COLUMN)} = excluded.{quote_identifier(CONSUMPTION_COLUMN)},
                        {quote_identifier(INLET_COLUMN)} = excluded.{quote_identifier(INLET_COLUMN)},
                        {quote_identifier(OUTLET_COLUMN)} = excluded.{quote_identifier(OUTLET_COLUMN)}
                    """,
                    (engine, day, fuel_type, consumption, average_inlet, average_outlet),
                )
                written += 1
        connection.commit()

    print(f"Database: {database_path}")
    print(f"Table: {DESTINATION_TABLE}")
    print(f"Daily rows inserted or updated: {written}")


if __name__ == "__main__":
    main()
