"""Authenticated inspection and backup of the configured history databases."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import sqlite3
import tempfile
import time
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from flask import Blueprint, Response, jsonify, request

import database_api as history
from admin_api import require_admin

sqlite_admin_api = Blueprint("sqlite_admin_api", __name__)


def databases():
    candidates = [
        ("Shared history", history.SHARED_DATABASE_PATH),
        ("D.O consumption", history.DATABASE_PATH),
        ("H.O consumption", history.HO_DATABASE_PATH),
        ("Pressure trend", history.PRESSURE_TREND_DATABASE_PATH),
        ("Exhaust temperature trend", history.EXH_TEMP_TREND_DATABASE_PATH),
    ]
    collector = history.BASE_DIR / "data_collector/modbus_csv_db_collector_config.json"
    if collector.is_file():
        config = json.loads(collector.read_text(encoding="utf-8"))
        output = config.get("output", {}).get("database_path")
        if output:
            candidates.append(("Modbus collector (default config)", collector.parent / output))
    result = {}
    for usage, path in candidates:
        path = Path(path).resolve()
        database_id = hashlib.sha256(str(path).encode()).hexdigest()[:16]
        if database_id not in result:
            result[database_id] = {"id": database_id, "path": str(path), "used_by": []}
        result[database_id]["used_by"].append(usage)
    return list(result.values())


@sqlite_admin_api.before_request
def authenticate():
    return require_admin()


@sqlite_admin_api.errorhandler(ValueError)
def invalid_request(error):
    return jsonify(error=str(error)), 400


@sqlite_admin_api.errorhandler(sqlite3.Error)
def database_error(error):
    message = "Database query timed out. Narrow the filters and try again." if "interrupted" in str(error) else f"SQLite: {error}"
    return jsonify(error=message), 503


@sqlite_admin_api.errorhandler(OSError)
def file_error(error):
    return jsonify(error="Cannot access the database file. Check its availability and permissions."), 503


def selected_database():
    available = databases()
    database_id = request.args.get("db", available[0]["id"])
    selected = next((item for item in available if item["id"] == database_id), None)
    if selected is None:
        raise ValueError("Unknown database. Select a configured database.")
    path = Path(selected["path"])
    if not path.is_file():
        raise ValueError("Database file does not exist. Start the collector or import history first.")
    return path


@contextmanager
def connect(path, seconds=10):
    connection = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=3)
    try:
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA query_only=ON")
        deadline = time.monotonic() + seconds
        connection.set_progress_handler(lambda: int(time.monotonic() > deadline), 10000)
        yield connection
    finally:
        connection.close()


def quote(name):
    return '"' + name.replace('"', '""') + '"'


def table_names(connection):
    return [row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' ORDER BY name")]


def selected_table(connection):
    name = request.args.get("table", "")
    if name not in table_names(connection):
        raise ValueError("Unknown table. Select an existing table.")
    columns = [dict(row) for row in connection.execute(f"PRAGMA table_info({quote(name)})")]
    return name, columns


def filters(columns):
    names = {column["name"] for column in columns}
    clauses, values = [], []
    for argument, column, operator in (
        ("engine", "Engine", "="), ("channel", "Channel Description", "="),
        ("start", "Timestamp", ">="), ("end", "Timestamp", "<="),
    ):
        value = request.args.get(argument, "").strip()
        if not value:
            continue
        if column not in names:
            raise ValueError(f"This table has no {column} column.")
        if argument == "engine":
            try:
                value = int(value)
            except ValueError:
                raise ValueError("Engine must be a whole number.") from None
        elif argument in ("start", "end"):
            try:
                parsed = datetime.fromisoformat(value)
                if parsed.tzinfo is not None:
                    raise ValueError()
                value = parsed.isoformat(sep=" ", timespec="seconds")
            except ValueError:
                raise ValueError("Use a valid date/time in the database's local time.") from None
        clauses.append(f"{quote(column)} {operator} ?")
        values.append(value)
    if request.args.get("start") and request.args.get("end"):
        if datetime.fromisoformat(request.args["start"]) > datetime.fromisoformat(request.args["end"]):
            raise ValueError("Start time must not be after end time.")
    return (" WHERE " + " AND ".join(clauses) if clauses else ""), values


def order_by(columns):
    names = [column["name"] for column in columns]
    keys = [column["name"] for column in sorted(columns, key=lambda column: column["pk"]) if column["pk"]]
    order = (["Timestamp"] if "Timestamp" in names else []) + keys
    return ", ".join(quote(name) + " DESC" for name in dict.fromkeys(order or names))


def integer_arg(name, default, minimum, maximum):
    try:
        value = int(request.args.get(name, default))
    except ValueError:
        raise ValueError(f"Invalid {name}.") from None
    if not minimum <= value <= maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}.")
    return value


def json_value(value):
    return f"[BLOB: {len(value)} bytes]" if isinstance(value, bytes) else value


@sqlite_admin_api.get("/api/admin/sqlite")
def overview():
    items = databases()
    for item in items:
        path = Path(item["path"])
        item["exists"] = path.is_file()
        item["size_bytes"] = path.stat().st_size if item["exists"] else 0
        wal = Path(str(path) + "-wal")
        item["wal_bytes"] = wal.stat().st_size if wal.is_file() else 0
    return jsonify(databases=items)


@sqlite_admin_api.get("/api/admin/sqlite/tables")
def tables():
    with connect(selected_database()) as connection:
        return jsonify(tables=table_names(connection), journal_mode=connection.execute("PRAGMA journal_mode").fetchone()[0])


@sqlite_admin_api.get("/api/admin/sqlite/rows")
def rows():
    with connect(selected_database()) as connection:
        name, columns = selected_table(connection)
        where, parameters = filters(columns)
        limit = integer_arg("limit", 50, 1, 200)
        offset = integer_arg("offset", 0, 0, 10_000_000)
        connection.execute("BEGIN")
        count = connection.execute(f"SELECT COUNT(*) FROM {quote(name)}{where}", parameters).fetchone()[0]
        records = connection.execute(f"SELECT * FROM {quote(name)}{where} ORDER BY {order_by(columns)} LIMIT ? OFFSET ?", [*parameters, limit, offset]).fetchall()
        earliest = latest = None
        if "Timestamp" in {column["name"] for column in columns}:
            earliest, latest = connection.execute(f'SELECT MIN("Timestamp"), MAX("Timestamp") FROM {quote(name)}{where}', parameters).fetchone()
        indexes = [dict(row) for row in connection.execute(f"PRAGMA index_list({quote(name)})")]
        return jsonify(columns=columns, indexes=indexes, total=count, earliest=earliest, latest=latest,
                       rows=[[json_value(value) for value in row] for row in records], limit=limit, offset=offset)


@sqlite_admin_api.get("/api/admin/sqlite/options")
def options():
    with connect(selected_database()) as connection:
        name, columns = selected_table(connection)
        names = {column["name"] for column in columns}
        engines = []
        channels = []
        if "Engine" in names:
            engines = [row[0] for row in connection.execute(
                f'SELECT DISTINCT "Engine" FROM {quote(name)} WHERE "Engine" IS NOT NULL ORDER BY "Engine"'
            )]
        if "Channel Description" in names:
            channels = [row[0] for row in connection.execute(
                f'SELECT DISTINCT "Channel Description" FROM {quote(name)} '
                'WHERE "Channel Description" IS NOT NULL ORDER BY "Channel Description" COLLATE NOCASE'
            )]
        return jsonify(engines=engines, channels=channels)


@sqlite_admin_api.get("/api/admin/sqlite/export")
def export():
    with connect(selected_database()) as connection:
        name, columns = selected_table(connection)
        where, parameters = filters(columns)
        records = connection.execute(f"SELECT * FROM {quote(name)}{where} ORDER BY {order_by(columns)} LIMIT 10000", parameters).fetchall()
        output = io.StringIO(newline="")
        writer = csv.writer(output)

        def csv_value(value):
            value = json_value(value)
            if isinstance(value, str) and value.startswith(("=", "+", "-", "@", "\t", "\r", "\n")):
                return "'" + value
            return value

        writer.writerow([csv_value(column["name"]) for column in columns])
        writer.writerows([[csv_value(value) for value in row] for row in records])
    response = Response("\ufeff" + output.getvalue(), mimetype="text/csv")
    response.headers.set("Content-Disposition", "attachment", filename="sqlite-history.csv")
    return response


@sqlite_admin_api.post("/api/admin/sqlite/check")
def check():
    with connect(selected_database(), seconds=30) as connection:
        messages = [row[0] for row in connection.execute("PRAGMA quick_check(20)")]
    return jsonify(ok=messages == ["ok"], messages=messages)


@sqlite_admin_api.get("/api/admin/sqlite/backup")
def backup():
    source = selected_database()
    with tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False) as temporary:
        target = Path(temporary.name)
    try:
        deadline = time.monotonic() + 60

        def progress(status, remaining, total):
            if time.monotonic() > deadline:
                raise ValueError("Backup timed out. Try again when collection is less busy.")

        with connect(source, seconds=60) as connection:
            destination = sqlite3.connect(target)
            try:
                connection.backup(destination, pages=256, progress=progress)
            finally:
                destination.close()
        size = target.stat().st_size
    except Exception:
        target.unlink(missing_ok=True)
        raise

    def stream():
        try:
            with target.open("rb") as backup_file:
                while chunk := backup_file.read(1024 * 1024):
                    yield chunk
        finally:
            target.unlink(missing_ok=True)

    response = Response(stream(), mimetype="application/vnd.sqlite3")
    response.content_length = size
    response.headers.set("Content-Disposition", "attachment", filename=f"history-{datetime.now():%Y%m%d-%H%M%S}.sqlite3")
    response.call_on_close(lambda: target.unlink(missing_ok=True))
    return response
