from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from flask import Blueprint, jsonify, request


database_api = Blueprint("database_api", __name__)
BASE_DIR = Path(__file__).resolve().parent

with (BASE_DIR / "backend_config.json").open("r", encoding="utf-8") as config_file:
    CONFIG = json.load(config_file)

FO_CONFIG = CONFIG.get("fo_consumption", {})
DATABASE_PATH = (
    BASE_DIR / FO_CONFIG.get("database_path", "database/flow_meter_history.db")
).resolve()
TABLE_NAME = FO_CONFIG.get("table_name", "flow_meter_history").replace('"', '""')
DEFAULT_WINDOW_MINUTES = int(FO_CONFIG.get("default_window_minutes", 1440))
DEFAULT_ENGINE_COUNT = int(FO_CONFIG.get("default_end_engine_count", 4))


def build_payload(
    window_minutes: int | None = None,
    start_time: str | None = None,
    end_time: str | None = None,
) -> dict[str, Any]:
    """Read F.O. consumption data from SQLite and return it as-is for the frontend."""
    if not DATABASE_PATH.exists():
        raise FileNotFoundError(f"F.O. consumption database not found: {DATABASE_PATH}")
    if (start_time and not end_time) or (end_time and not start_time):
        raise ValueError("Both startTime and endTime are required when using an absolute range.")

    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row

        if start_time and end_time:
            range_row = connection.execute(
                """
                SELECT
                    CAST(unixepoch(MIN(datetime(?, 'utc'), datetime(?, 'utc'))) * 1000 AS INTEGER) AS rangeStartMs,
                    CAST(unixepoch(MAX(datetime(?, 'utc'), datetime(?, 'utc'))) * 1000 AS INTEGER) AS rangeEndMs
                """,
                (start_time, end_time, start_time, end_time),
            ).fetchone()
            records = connection.execute(
                f"""
                SELECT
                    "Engine" AS engine,
                    "Channel Description" AS channelDescription,
                    CAST(unixepoch("Timestamp") * 1000 AS INTEGER) AS timestampMs,
                    substr(strftime('%Y', "Timestamp"), 3, 2) || '-' ||
                    strftime('%m', "Timestamp") || '.' ||
                    strftime('%d', "Timestamp") || ' ' ||
                    strftime('%H', "Timestamp") || '-' ||
                    strftime('%M', "Timestamp") || '-' ||
                    strftime('%S', "Timestamp") AS timestampLabel,
                    "Value" AS value,
                    "Unit" AS unit
                FROM "{TABLE_NAME}"
                WHERE "Timestamp" BETWEEN MIN(datetime(?, 'utc'), datetime(?, 'utc'))
                                      AND MAX(datetime(?, 'utc'), datetime(?, 'utc'))
                ORDER BY "Engine", "Timestamp"
                """,
                (start_time, end_time, start_time, end_time),
            ).fetchall()
        else:
            minutes = max(1, int(window_minutes or DEFAULT_WINDOW_MINUTES))
            range_row = connection.execute(
                f"""
                SELECT
                    CAST(unixepoch(MAX("Timestamp"), '-{minutes} minutes') * 1000 AS INTEGER) AS rangeStartMs,
                    CAST(unixepoch(MAX("Timestamp")) * 1000 AS INTEGER) AS rangeEndMs
                FROM "{TABLE_NAME}"
                """
            ).fetchone()
            records = connection.execute(
                f"""
                SELECT
                    "Engine" AS engine,
                    "Channel Description" AS channelDescription,
                    CAST(unixepoch("Timestamp") * 1000 AS INTEGER) AS timestampMs,
                    substr(strftime('%Y', "Timestamp"), 3, 2) || '-' ||
                    strftime('%m', "Timestamp") || '.' ||
                    strftime('%d', "Timestamp") || ' ' ||
                    strftime('%H', "Timestamp") || '-' ||
                    strftime('%M', "Timestamp") || '-' ||
                    strftime('%S', "Timestamp") AS timestampLabel,
                    "Value" AS value,
                    "Unit" AS unit
                FROM "{TABLE_NAME}"
                WHERE "Timestamp" BETWEEN datetime((SELECT MAX("Timestamp") FROM "{TABLE_NAME}"), '-{minutes} minutes')
                                      AND (SELECT MAX("Timestamp") FROM "{TABLE_NAME}")
                ORDER BY "Engine", "Timestamp"
                """
            ).fetchall()

        engines = connection.execute(
            f"""
            SELECT DISTINCT "Engine" AS engine
            FROM "{TABLE_NAME}"
            ORDER BY "Engine"
            LIMIT ?
            """,
            (DEFAULT_ENGINE_COUNT,),
        ).fetchall()

    return {
        "page": "fo-consumption",
        "records": [dict(row) for row in records],
        "engines": [int(row["engine"]) for row in engines],
        "meta": {
            "rangeStartMs": range_row["rangeStartMs"],
            "rangeEndMs": range_row["rangeEndMs"],
        },
    }


@database_api.get("/api/fo-consumption")
def get_fo_consumption_route() -> Any:
    """Return F.O. consumption data for the selected time range."""
    try:
        return jsonify(
            build_payload(
                window_minutes=request.args.get(
                    "windowMinutes", default=DEFAULT_WINDOW_MINUTES, type=int
                ),
                start_time=request.args.get("startTime", default=None, type=str),
                end_time=request.args.get("endTime", default=None, type=str),
            )
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # pragma: no cover - runtime error surface
        return jsonify({"error": str(exc)}), 500
