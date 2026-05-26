from __future__ import annotations

import argparse
import csv
import json
import sqlite3
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pymodbus.client import ModbusTcpClient


HOLDING_REGISTER_START = 40001
DISCRETE_INPUT_START = 10001
DEFAULT_CONFIG_PATH = Path(__file__).resolve().with_name("modbus_csv_db_collector_config.json")
DEFAULT_TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"
CSV_COLUMNS = ["Engine", "Channel Description", "Timestamp", "Value", "Unit"]


@dataclass(frozen=True)
class PointConfig:
    engine: int
    channel_description: str
    source_type: str
    address: int
    unit: str
    scale: float = 1.0
    precision: int | None = None
    enabled: bool = True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Read Modbus points from a JSON configuration, append them to CSV, "
            "and upsert them into the SQLite database used by the backend."
        )
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG_PATH,
        help=f"Collector JSON config path. Default: {DEFAULT_CONFIG_PATH}",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Collect one snapshot only, then exit.",
    )
    return parser.parse_args()


def load_json_config(config_path: Path) -> dict[str, Any]:
    with config_path.open("r", encoding="utf-8") as config_file:
        return json.load(config_file)


def quote_identifier(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def ensure_parent_directory(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def resolve_path(base_dir: Path, raw_path: str) -> Path:
    candidate = Path(raw_path)
    if candidate.is_absolute():
        return candidate
    return (base_dir / candidate).resolve()


def modbus_address_to_offset(address: int, family_start: int) -> int:
    return address - family_start


def group_contiguous_addresses(addresses: list[int]) -> list[tuple[int, int]]:
    unique_addresses = sorted(set(addresses))
    if not unique_addresses:
        return []

    groups: list[tuple[int, int]] = []
    group_start = unique_addresses[0]
    group_end = unique_addresses[0]

    for address in unique_addresses[1:]:
        if address == group_end + 1:
            group_end = address
            continue

        groups.append((group_start, group_end))
        group_start = address
        group_end = address

    groups.append((group_start, group_end))
    return groups


def split_address_group(
    group_start: int, group_end: int, max_count: int
) -> list[tuple[int, int]]:
    chunks: list[tuple[int, int]] = []
    chunk_start = group_start

    while chunk_start <= group_end:
        chunk_end = min(chunk_start + max_count - 1, group_end)
        chunks.append((chunk_start, chunk_end))
        chunk_start = chunk_end + 1

    return chunks


def parse_points(config: dict[str, Any]) -> list[PointConfig]:
    points: list[PointConfig] = []
    for index, item in enumerate(config.get("points", []), start=1):
        try:
            point = PointConfig(
                engine=int(item["engine"]),
                channel_description=str(item["channel_description"]).strip(),
                source_type=str(item["source_type"]).strip(),
                address=int(item["address"]),
                unit=str(item.get("unit", "")).strip(),
                scale=float(item.get("scale", 1)),
                precision=(
                    int(item["precision"])
                    if item.get("precision") is not None
                    else None
                ),
                enabled=bool(item.get("enabled", True)),
            )
        except KeyError as exc:
            raise ValueError(f"Point #{index} is missing required field: {exc}") from exc

        if point.source_type not in {"holding_register", "discrete_input"}:
            raise ValueError(
                f"Point #{index} has unsupported source_type: {point.source_type}"
            )
        if not point.channel_description:
            raise ValueError(f"Point #{index} has empty channel_description")
        if not point.unit and point.source_type == "holding_register":
            raise ValueError(f"Point #{index} has empty unit")

        if point.enabled:
            points.append(point)

    if not points:
        raise ValueError("Config does not contain any enabled points.")

    return points


def create_modbus_client(modbus_config: dict[str, Any]) -> ModbusTcpClient:
    client = ModbusTcpClient(
        host=str(modbus_config["host"]),
        port=int(modbus_config.get("port", 502)),
        timeout=float(modbus_config.get("timeout_seconds", 3)),
    )
    if not client.connect():
        raise ConnectionError(
            f"Unable to connect to Modbus server {modbus_config['host']}:{modbus_config.get('port', 502)}"
        )
    return client


def read_holding_register_map(
    client: ModbusTcpClient,
    unit_id: int,
    points: list[PointConfig],
) -> dict[int, int]:
    register_map: dict[int, int] = {}
    addresses = [point.address for point in points if point.source_type == "holding_register"]

    for group_start, group_end in group_contiguous_addresses(addresses):
        for chunk_start, chunk_end in split_address_group(group_start, group_end, 125):
            count = chunk_end - chunk_start + 1
            response = client.read_holding_registers(
                address=modbus_address_to_offset(chunk_start, HOLDING_REGISTER_START),
                count=count,
                slave=unit_id,
            )
            if response.isError():
                raise RuntimeError(
                    f"Failed to read holding registers {chunk_start}-{chunk_end}"
                )
            for index, value in enumerate(response.registers):
                register_map[chunk_start + index] = value

    return register_map


def read_discrete_input_map(
    client: ModbusTcpClient,
    unit_id: int,
    points: list[PointConfig],
) -> dict[int, int]:
    bit_map: dict[int, int] = {}
    addresses = [point.address for point in points if point.source_type == "discrete_input"]

    for group_start, group_end in group_contiguous_addresses(addresses):
        count = group_end - group_start + 1
        response = client.read_discrete_inputs(
            address=modbus_address_to_offset(group_start, DISCRETE_INPUT_START),
            count=count,
            slave=unit_id,
        )
        if response.isError():
            raise RuntimeError(f"Failed to read discrete inputs {group_start}-{group_end}")
        for index, value in enumerate(response.bits[:count]):
            bit_map[group_start + index] = 1 if value else 0

    return bit_map


def apply_scale_and_precision(point: PointConfig, raw_value: int | bool) -> int | float:
    value = float(raw_value) * point.scale
    if point.precision is not None:
        value = round(value, point.precision)
    return int(value) if float(value).is_integer() else value


def read_snapshot(
    modbus_config: dict[str, Any],
    points: list[PointConfig],
) -> list[tuple[int, str, str, float, str]]:
    timestamp_format = str(modbus_config.get("timestamp_format", DEFAULT_TIMESTAMP_FORMAT))
    timestamp = datetime.now(timezone.utc).strftime(timestamp_format)
    unit_id = int(modbus_config.get("unit_id", 1))

    client = create_modbus_client(modbus_config)
    try:
        holding_registers = read_holding_register_map(client, unit_id, points)
        discrete_inputs = read_discrete_input_map(client, unit_id, points)
    finally:
        client.close()

    rows: list[tuple[int, str, str, float, str]] = []
    for point in points:
        if point.source_type == "holding_register":
            raw_value = holding_registers[point.address]
            value = apply_scale_and_precision(point, raw_value)
        else:
            raw_value = discrete_inputs[point.address]
            value = apply_scale_and_precision(point, raw_value)

        rows.append(
            (
                point.engine,
                point.channel_description,
                timestamp,
                float(value),
                point.unit,
            )
        )

    return rows


def ensure_csv_header(csv_path: Path) -> None:
    ensure_parent_directory(csv_path)
    if csv_path.exists() and csv_path.stat().st_size > 0:
        return

    with csv_path.open("w", encoding="utf-8-sig", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(CSV_COLUMNS)


def append_rows_to_csv(
    csv_path: Path, rows: list[tuple[int, str, str, float, str]]
) -> None:
    ensure_csv_header(csv_path)
    with csv_path.open("a", encoding="utf-8-sig", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerows(rows)


def create_table(connection: sqlite3.Connection, table_name: str) -> None:
    quoted_table = quote_identifier(table_name)
    connection.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {quoted_table} (
            "Engine" INTEGER NOT NULL,
            "Channel Description" TEXT NOT NULL,
            "Timestamp" DATETIME NOT NULL,
            "Value" REAL NOT NULL,
            "Unit" TEXT NOT NULL,
            UNIQUE ("Engine", "Channel Description", "Timestamp")
        )
        """
    )
    connection.execute(
        f"""
        CREATE INDEX IF NOT EXISTS {quote_identifier(f'idx_{table_name}_engine_timestamp')}
        ON {quoted_table} ("Engine", "Timestamp")
        """
    )


def import_rows_to_database(
    database_path: Path,
    table_name: str,
    rows: list[tuple[int, str, str, float, str]],
) -> tuple[int, int]:
    ensure_parent_directory(database_path)

    inserted_count = 0
    updated_count = 0
    quoted_table = quote_identifier(table_name)

    with sqlite3.connect(database_path) as connection:
        create_table(connection, table_name)
        cursor = connection.cursor()

        for row in rows:
            existing_row = connection.execute(
                f"""
                SELECT "Value", "Unit"
                FROM {quoted_table}
                WHERE "Engine" = ?
                  AND "Channel Description" = ?
                  AND "Timestamp" = ?
                """,
                row[:3],
            ).fetchone()

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
                ON CONFLICT("Engine", "Channel Description", "Timestamp")
                DO UPDATE SET
                    "Value" = excluded."Value",
                    "Unit" = excluded."Unit"
                """,
                row,
            )

            if existing_row is None:
                inserted_count += 1
                continue

            if float(existing_row[0]) != row[3] or str(existing_row[1]) != row[4]:
                updated_count += 1

        connection.commit()

    return inserted_count, updated_count


def print_snapshot_summary(
    rows: list[tuple[int, str, str, float, str]],
    inserted_count: int,
    updated_count: int,
    csv_path: Path,
    database_path: Path,
    table_name: str,
) -> None:
    print(f"Collected rows: {len(rows)}")
    if rows:
        print(f"Timestamp: {rows[0][2]}")
    print(f"CSV file: {csv_path}")
    print(f"Database: {database_path}")
    print(f"Table: {table_name}")
    print(f"Inserted rows: {inserted_count}")
    print(f"Updated rows: {updated_count}")


def run_collection(config_path: Path, once: bool) -> None:
    config_path = config_path.resolve()
    if not config_path.exists():
        raise FileNotFoundError(f"Collector config not found: {config_path}")

    config = load_json_config(config_path)
    base_dir = config_path.parent
    points = parse_points(config)

    csv_path = resolve_path(base_dir, str(config["output"]["csv_path"]))
    database_path = resolve_path(base_dir, str(config["output"]["database_path"]))
    table_name = str(config["output"].get("table_name", "database"))
    poll_interval_seconds = max(1.0, float(config["modbus"].get("poll_interval_seconds", 5)))

    while True:
        rows = read_snapshot(config["modbus"], points)
        append_rows_to_csv(csv_path, rows)
        inserted_count, updated_count = import_rows_to_database(
            database_path,
            table_name,
            rows,
        )
        print_snapshot_summary(
            rows,
            inserted_count,
            updated_count,
            csv_path,
            database_path,
            table_name,
        )

        if once:
            return

        time.sleep(poll_interval_seconds)


def main() -> None:
    args = parse_args()
    run_collection(args.config, args.once)


if __name__ == "__main__":
    main()
