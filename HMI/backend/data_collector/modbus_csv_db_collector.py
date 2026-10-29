from __future__ import annotations

import argparse
import csv
import json
import sqlite3
import time
from contextlib import closing
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
    data_type: str = "uint16"
    register_count: int = 1
    enabled: bool = True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Read Modbus points from a JSON configuration, write each snapshot to a new CSV, "
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
    parser.add_argument(
        "--backend-config",
        type=Path,
        help=(
            "Optional backend_config.json whose Modbus connection settings "
            "override the collector config."
        ),
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
    """Convert a visible Modbus-style address like 10001/40001 into zero-based wire offset."""
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


def get_point_register_count(point: PointConfig) -> int:
    return max(1, int(point.register_count))


def expand_point_addresses(point: PointConfig) -> list[int]:
    """
    Return register addresses in high-word to low-word order.

    The configured address identifies the high-word register; any lower-order
    words are stored at the following addresses.
    """
    return [
        point.address + offset for offset in range(get_point_register_count(point))
    ]


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
                data_type=str(item.get("data_type", "uint16")).strip().lower(),
                register_count=int(item.get("register_count", 1)),
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
    addresses = [
        address
        for point in points
        if point.source_type == "holding_register"
        for address in expand_point_addresses(point)
    ]

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


def resolve_holding_register_value(
    point: PointConfig,
    holding_registers: dict[int, int],
) -> int:
    register_count = get_point_register_count(point)
    raw_words = [
        holding_registers[register_address]
        for register_address in expand_point_addresses(point)
    ]

    if register_count == 1:
        return raw_words[0]

    if register_count == 2 and point.data_type in {"int32", "uint32"}:
        raw_value = (raw_words[0] << 16) | raw_words[1]
        if point.data_type == "int32" and raw_value >= 0x80000000:
            raw_value -= 0x100000000
        return raw_value

    raise ValueError(
        f"Unsupported holding register point: address={point.address}, "
        f"register_count={register_count}, data_type={point.data_type}"
    )


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
            raw_value = resolve_holding_register_value(point, holding_registers)
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


def write_rows_to_new_csv(
    csv_directory: Path,
    rows: list[tuple[int, str, str, float, str]],
    filename_prefix: str = "modbus_history",
) -> Path:
    csv_directory.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    csv_path = csv_directory / f"{filename_prefix}_{timestamp}.csv"
    sequence = 1
    while csv_path.exists():
        csv_path = csv_directory / f"{filename_prefix}_{timestamp}_{sequence:02d}.csv"
        sequence += 1
    with csv_path.open("x", encoding="utf-8-sig", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(CSV_COLUMNS)
        writer.writerows(rows)
    return csv_path


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
    retention_days: int | None = 60,
) -> tuple[int, int]:
    ensure_parent_directory(database_path)

    inserted_count = 0
    updated_count = 0
    quoted_table = quote_identifier(table_name)

    with closing(sqlite3.connect(database_path)) as connection:
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

        if retention_days is not None and retention_days > 0:
            connection.execute(
                f'DELETE FROM {quoted_table} WHERE "Timestamp" < datetime(?, ?)',
                ("now", f"-{int(retention_days)} days"),
            )

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


def apply_backend_modbus_config(
    config: dict[str, Any], backend_config_path: Path | None
) -> None:
    if backend_config_path is None:
        return

    backend_config_path = backend_config_path.resolve()
    with backend_config_path.open("r", encoding="utf-8") as config_file:
        backend_config = json.load(config_file)

    backend_modbus = backend_config.get("modbus")
    if not isinstance(backend_modbus, dict):
        raise ValueError(f"Modbus settings not found in {backend_config_path}")

    collector_modbus = config.setdefault("modbus", {})
    for key in ("host", "port", "unit_id", "timeout_seconds"):
        if key in backend_modbus:
            collector_modbus[key] = backend_modbus[key]

    sync_engine_status_points(config, backend_config)


def sync_engine_status_points(
    collector_config: dict[str, Any], backend_config: dict[str, Any]
) -> int:
    """Mirror the Engine Status digital inputs into the collector point list."""
    signals = backend_config.get("signals", {})
    alarm_engines = backend_config.get("pages", {}).get("alarm", {}).get("engines", [])
    if not isinstance(signals, dict) or not isinstance(alarm_engines, list):
        raise ValueError("Engine Status signal configuration is missing or invalid.")

    existing_points = [
        point
        for point in collector_config.get("points", [])
        if point.get("managed_by") != "backend_engine_status"
    ]
    digital_points: list[dict[str, Any]] = []
    seen: set[tuple[int, str]] = set()

    for engine_index, engine_config in enumerate(alarm_engines, start=1):
        if not isinstance(engine_config, dict):
            continue
        engine_key = str(engine_config.get("key", ""))
        try:
            engine_number = int(engine_key.rsplit("_", 1)[-1])
        except ValueError:
            engine_number = engine_index

        for bit in engine_config.get("bits", []):
            if not isinstance(bit, dict):
                continue
            signal_id = str(bit.get("signal", ""))
            signal = signals.get(signal_id)
            if not isinstance(signal, dict) or signal.get("source_type") != "discrete_input":
                continue
            identity = (engine_number, signal_id)
            if identity in seen:
                continue
            seen.add(identity)
            address = int(signal["address"])
            label = str(bit.get("label") or signal.get("label") or signal_id).strip()
            digital_points.append({
                "engine": engine_number,
                "channel_description": f"{label} [DI {address}]",
                "source_type": "discrete_input",
                "address": address,
                "scale": 1,
                "unit": "state",
                "enabled": True,
                "managed_by": "backend_engine_status",
                "signal_id": signal_id,
            })

    if not digital_points:
        raise ValueError("No Engine Status digital inputs were found in backend config.")
    collector_config["points"] = existing_points + digital_points
    return len(digital_points)


def run_collection(
    config_path: Path, once: bool, backend_config_path: Path | None = None
) -> None:
    config_path = config_path.resolve()
    if not config_path.exists():
        raise FileNotFoundError(f"Collector config not found: {config_path}")

    config = load_json_config(config_path)
    apply_backend_modbus_config(config, backend_config_path)
    base_dir = config_path.parent
    points = parse_points(config)

    output_config = config["output"]
    legacy_csv_path = str(output_config.get("csv_path", "../database/modbus_history.csv"))
    csv_directory = resolve_path(
        base_dir,
        str(output_config.get("csv_directory", Path(legacy_csv_path).parent)),
    )
    csv_filename_prefix = str(output_config.get("csv_filename_prefix", "modbus_history"))
    database_path = resolve_path(base_dir, str(config["output"]["database_path"]))
    table_name = str(config["output"].get("table_name", "database"))
    retention_days = int(config["output"].get("retention_days", 60))
    poll_interval_seconds = max(0.1, float(config["modbus"].get("poll_interval_seconds", 5)))
    retry_interval_seconds = 60.0

    while True:
        collection_started_at = time.monotonic()
        try:
            rows = read_snapshot(config["modbus"], points)
        except (ConnectionError, TimeoutError, OSError, RuntimeError) as exc:
            if once:
                raise
            print(
                f"Modbus collection failed: {exc}. Retrying in 60 seconds.",
                flush=True,
            )
            time.sleep(retry_interval_seconds)
            continue
        csv_path = write_rows_to_new_csv(csv_directory, rows, csv_filename_prefix)
        inserted_count, updated_count = import_rows_to_database(
            database_path,
            table_name,
            rows,
            retention_days,
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

        collection_duration = time.monotonic() - collection_started_at
        time.sleep(max(0.0, poll_interval_seconds - collection_duration))


def main() -> None:
    args = parse_args()
    run_collection(args.config, args.once, args.backend_config)


if __name__ == "__main__":
    main()
