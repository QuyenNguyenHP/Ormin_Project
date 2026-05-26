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


def resolve_database_path(*relative_candidates: str) -> Path:
    for candidate in relative_candidates:
        if not candidate:
            continue

        resolved_candidate = (BASE_DIR / candidate).resolve()
        if resolved_candidate.exists() and resolved_candidate.is_file():
            return resolved_candidate

    first_candidate = next((candidate for candidate in relative_candidates if candidate), "database")
    return (BASE_DIR / first_candidate).resolve()


SHARED_DATABASE_PATH = resolve_database_path(
    CONFIG.get("database_path", "database/database"),
    "database/database",
    "flow_meter_history.db",
)

FO_CONFIG = CONFIG.get("fo_consumption", {})
DATABASE_PATH = resolve_database_path(
    FO_CONFIG.get("database_path", ""),
    str(SHARED_DATABASE_PATH.relative_to(BASE_DIR)) if SHARED_DATABASE_PATH.is_relative_to(BASE_DIR) else "",
    "database/database",
    "flow_meter_history.db",
)
TABLE_NAME = FO_CONFIG.get("table_name", "database").replace('"', '""')
FO_TIMESTAMP_COLUMN = FO_CONFIG.get("timestamp_column", "Timestamp").replace('"', '""')
FO_ENGINE_COLUMN = FO_CONFIG.get("engine_column", "Engine").replace('"', '""')
FO_CHANNEL_DESCRIPTION_COLUMN = FO_CONFIG.get(
    "channel_description_column", "Channel Description"
).replace('"', '""')
FO_VALUE_COLUMN = FO_CONFIG.get("value_column", "Value").replace('"', '""')
FO_UNIT_COLUMN = FO_CONFIG.get("unit_column", "Unit").replace('"', '""')
DEFAULT_WINDOW_MINUTES = int(FO_CONFIG.get("default_window_minutes", 1440))
DEFAULT_ENGINE_COUNT = int(FO_CONFIG.get("default_end_engine_count", 4))
FO_ENGINE_POWER_CHANNEL_DESCRIPTION = FO_CONFIG.get(
    "engine_power_channel_description_value", "Engine Power"
)
FO_ENGINE_POWER_DEFAULT_UNIT = FO_CONFIG.get("engine_power_default_unit", "kW")
FO_INPUT_CHANNEL_KEYWORDS = [
    str(keyword).strip().lower()
    for keyword in FO_CONFIG.get("input_channel_keywords", ["input", "inlet", "flow in"])
    if str(keyword).strip()
]
FO_OUTPUT_CHANNEL_KEYWORDS = [
    str(keyword).strip().lower()
    for keyword in FO_CONFIG.get("output_channel_keywords", ["output", "outlet", "flow out"])
    if str(keyword).strip()
]
PRESSURE_TREND_CONFIG = CONFIG.get("pressure_trend_history", {})
PRESSURE_TREND_DATABASE_PATH = resolve_database_path(
    PRESSURE_TREND_CONFIG.get("database_path", ""),
    str(DATABASE_PATH.relative_to(BASE_DIR)) if DATABASE_PATH.is_relative_to(BASE_DIR) else "",
    "database/database",
    "flow_meter_history.db",
)
PRESSURE_TREND_TABLE_NAME = PRESSURE_TREND_CONFIG.get("table_name", "database").replace('"', '""')
PRESSURE_TREND_TIMESTAMP_COLUMN = PRESSURE_TREND_CONFIG.get("timestamp_column", "Timestamp").replace('"', '""')
PRESSURE_TREND_ENGINE_COLUMN = PRESSURE_TREND_CONFIG.get("engine_column", "Engine").replace('"', '""')
PRESSURE_TREND_CHANNEL_DESCRIPTION_COLUMN = PRESSURE_TREND_CONFIG.get(
    "channel_description_column", "Channel Description"
).replace('"', '""')
PRESSURE_TREND_CHANNEL_DESCRIPTION_VALUE = PRESSURE_TREND_CONFIG.get(
    "channel_description_value", "Engine Power"
)
PRESSURE_TREND_VALUE_COLUMN = PRESSURE_TREND_CONFIG.get("value_column", "Value").replace('"', '""')
PRESSURE_TREND_UNIT_COLUMN = PRESSURE_TREND_CONFIG.get("unit_column", "Unit").replace('"', '""')
PRESSURE_TREND_DEFAULT_UNIT = PRESSURE_TREND_CONFIG.get("default_unit", "kW")
PRESSURE_TREND_SERIES_LABEL = PRESSURE_TREND_CONFIG.get("series_label", "Power")
EXH_TEMP_TREND_CONFIG = CONFIG.get("exh_temp_trend_history", {})
EXH_TEMP_TREND_DATABASE_PATH = resolve_database_path(
    EXH_TEMP_TREND_CONFIG.get("database_path", ""),
    str(DATABASE_PATH.relative_to(BASE_DIR)) if DATABASE_PATH.is_relative_to(BASE_DIR) else "",
    "database/database",
    "flow_meter_history.db",
)
EXH_TEMP_TREND_TABLE_NAME = EXH_TEMP_TREND_CONFIG.get("table_name", "database").replace('"', '""')
EXH_TEMP_TREND_TIMESTAMP_COLUMN = EXH_TEMP_TREND_CONFIG.get("timestamp_column", "Timestamp").replace('"', '""')
EXH_TEMP_TREND_ENGINE_COLUMN = EXH_TEMP_TREND_CONFIG.get("engine_column", "Engine").replace('"', '""')
EXH_TEMP_TREND_CHANNEL_DESCRIPTION_COLUMN = EXH_TEMP_TREND_CONFIG.get(
    "channel_description_column", "Channel Description"
).replace('"', '""')
EXH_TEMP_TREND_CHANNEL_DESCRIPTION_VALUE = EXH_TEMP_TREND_CONFIG.get(
    "channel_description_value", "Engine Power"
)
EXH_TEMP_TREND_VALUE_COLUMN = EXH_TEMP_TREND_CONFIG.get("value_column", "Value").replace('"', '""')
EXH_TEMP_TREND_UNIT_COLUMN = EXH_TEMP_TREND_CONFIG.get("unit_column", "Unit").replace('"', '""')
EXH_TEMP_TREND_DEFAULT_UNIT = EXH_TEMP_TREND_CONFIG.get("default_unit", "kW")
EXH_TEMP_TREND_SERIES_LABEL = EXH_TEMP_TREND_CONFIG.get("series_label", "Power")
MIN_VISIBLE_ENGINE_NUMBER = 1


def quote_identifier(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def normalize_channel_description(description: Any) -> str:
    return str(description or "").strip().lower()


def is_visible_engine_number(engine_value: Any) -> bool:
    try:
        return int(engine_value) >= MIN_VISIBLE_ENGINE_NUMBER
    except (TypeError, ValueError):
        return False


def is_fo_relevant_channel_description(description: Any) -> bool:
    normalized = normalize_channel_description(description)
    if not normalized:
        return False

    if normalized == normalize_channel_description(FO_ENGINE_POWER_CHANNEL_DESCRIPTION):
        return True

    return any(keyword in normalized for keyword in FO_INPUT_CHANNEL_KEYWORDS) or any(
        keyword in normalized for keyword in FO_OUTPUT_CHANNEL_KEYWORDS
    )


def validate_range_arguments(start_time: str | None, end_time: str | None) -> None:
    if (start_time and not end_time) or (end_time and not start_time):
        raise ValueError("Both startTime and endTime are required when using an absolute range.")


def resolve_history_range(
    connection: sqlite3.Connection,
    table_name: str,
    timestamp_column: str,
    window_minutes: int | None,
    start_time: str | None,
    end_time: str | None,
) -> sqlite3.Row:
    quoted_table = quote_identifier(table_name)
    quoted_timestamp_column = quote_identifier(timestamp_column)

    if start_time and end_time:
        return connection.execute(
            f"""
            SELECT
                CAST(unixepoch(MIN(datetime(?, 'utc'), datetime(?, 'utc'))) * 1000 AS INTEGER) AS rangeStartMs,
                CAST(unixepoch(MAX(datetime(?, 'utc'), datetime(?, 'utc'))) * 1000 AS INTEGER) AS rangeEndMs
            """,
            (start_time, end_time, start_time, end_time),
        ).fetchone()

    minutes = max(1, int(window_minutes or DEFAULT_WINDOW_MINUTES))
    return connection.execute(
        f"""
        SELECT
            CAST(unixepoch(MAX({quoted_timestamp_column}), '-{minutes} minutes') * 1000 AS INTEGER) AS rangeStartMs,
            CAST(unixepoch(MAX({quoted_timestamp_column})) * 1000 AS INTEGER) AS rangeEndMs
        FROM {quoted_table}
        """
    ).fetchone()


def build_payload(
    window_minutes: int | None = None,
    start_time: str | None = None,
    end_time: str | None = None,
) -> dict[str, Any]:
    """Read F.O. consumption data from SQLite and return it as-is for the frontend."""
    if not DATABASE_PATH.exists():
        raise FileNotFoundError(f"F.O. consumption database not found: {DATABASE_PATH}")
    validate_range_arguments(start_time, end_time)

    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row

        range_row = resolve_history_range(
            connection,
            TABLE_NAME,
            FO_TIMESTAMP_COLUMN,
            window_minutes,
            start_time,
            end_time,
        )

        quoted_table = quote_identifier(TABLE_NAME)
        quoted_engine_column = quote_identifier(FO_ENGINE_COLUMN)
        quoted_channel_description_column = quote_identifier(FO_CHANNEL_DESCRIPTION_COLUMN)
        quoted_timestamp_column = quote_identifier(FO_TIMESTAMP_COLUMN)
        quoted_value_column = quote_identifier(FO_VALUE_COLUMN)
        quoted_unit_column = quote_identifier(FO_UNIT_COLUMN)

        if start_time and end_time:
            records = connection.execute(
                f"""
                SELECT
                    {quoted_engine_column} AS engine,
                    {quoted_channel_description_column} AS channelDescription,
                    CAST(unixepoch({quoted_timestamp_column}) * 1000 AS INTEGER) AS timestampMs,
                    substr(strftime('%Y', {quoted_timestamp_column}), 3, 2) || '-' ||
                    strftime('%m', {quoted_timestamp_column}) || '.' ||
                    strftime('%d', {quoted_timestamp_column}) || ' ' ||
                    strftime('%H', {quoted_timestamp_column}) || '-' ||
                    strftime('%M', {quoted_timestamp_column}) || '-' ||
                    strftime('%S', {quoted_timestamp_column}) AS timestampLabel,
                    {quoted_value_column} AS value,
                    COALESCE({quoted_unit_column}, ?) AS unit
                FROM {quoted_table}
                WHERE {quoted_timestamp_column} BETWEEN MIN(datetime(?, 'utc'), datetime(?, 'utc'))
                                                    AND MAX(datetime(?, 'utc'), datetime(?, 'utc'))
                ORDER BY {quoted_engine_column}, {quoted_timestamp_column}
                """,
                (
                    FO_ENGINE_POWER_DEFAULT_UNIT,
                    start_time,
                    end_time,
                    start_time,
                    end_time,
                ),
            ).fetchall()
        else:
            minutes = max(1, int(window_minutes or DEFAULT_WINDOW_MINUTES))
            range_row = connection.execute(
                f"""
                SELECT
                    CAST(unixepoch(MAX({quoted_timestamp_column}), '-{minutes} minutes') * 1000 AS INTEGER) AS rangeStartMs,
                    CAST(unixepoch(MAX({quoted_timestamp_column})) * 1000 AS INTEGER) AS rangeEndMs
                FROM {quoted_table}
                """
            ).fetchone()
            records = connection.execute(
                f"""
                SELECT
                    {quoted_engine_column} AS engine,
                    {quoted_channel_description_column} AS channelDescription,
                    CAST(unixepoch({quoted_timestamp_column}) * 1000 AS INTEGER) AS timestampMs,
                    substr(strftime('%Y', {quoted_timestamp_column}), 3, 2) || '-' ||
                    strftime('%m', {quoted_timestamp_column}) || '.' ||
                    strftime('%d', {quoted_timestamp_column}) || ' ' ||
                    strftime('%H', {quoted_timestamp_column}) || '-' ||
                    strftime('%M', {quoted_timestamp_column}) || '-' ||
                    strftime('%S', {quoted_timestamp_column}) AS timestampLabel,
                    {quoted_value_column} AS value,
                    COALESCE({quoted_unit_column}, ?) AS unit
                FROM {quoted_table}
                WHERE {quoted_timestamp_column} BETWEEN datetime(
                        (SELECT MAX({quoted_timestamp_column}) FROM {quoted_table}),
                        '-{minutes} minutes'
                      )
                      AND (SELECT MAX({quoted_timestamp_column}) FROM {quoted_table})
                ORDER BY {quoted_engine_column}, {quoted_timestamp_column}
                """
                ,
                (FO_ENGINE_POWER_DEFAULT_UNIT,),
            ).fetchall()

        engines = connection.execute(
            f"""
            SELECT DISTINCT {quoted_engine_column} AS engine
            FROM {quoted_table}
            WHERE {quoted_engine_column} >= ?
            ORDER BY {quoted_engine_column}
            LIMIT ?
            """,
            (MIN_VISIBLE_ENGINE_NUMBER, DEFAULT_ENGINE_COUNT),
        ).fetchall()

    filtered_records = [
        dict(row)
        for row in records
        if is_visible_engine_number(row["engine"])
        and is_fo_relevant_channel_description(row["channelDescription"])
    ]

    return {
        "page": "fo-consumption",
        "records": filtered_records,
        "engines": [int(row["engine"]) for row in engines],
        "meta": {
            "rangeStartMs": range_row["rangeStartMs"],
            "rangeEndMs": range_row["rangeEndMs"],
            "powerChannelDescription": FO_ENGINE_POWER_CHANNEL_DESCRIPTION,
            "powerUnit": FO_ENGINE_POWER_DEFAULT_UNIT,
        },
    }


def build_pressure_trend_payload(
    engine_number: int | None = None,
    window_minutes: int | None = None,
    start_time: str | None = None,
    end_time: str | None = None,
    channel_descriptions: list[str] | None = None,
) -> dict[str, Any]:
    if not PRESSURE_TREND_DATABASE_PATH.exists():
        raise FileNotFoundError(
            f"Pressure trend database not found: {PRESSURE_TREND_DATABASE_PATH}"
        )

    validate_range_arguments(start_time, end_time)

    with sqlite3.connect(PRESSURE_TREND_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row

        quoted_table = quote_identifier(PRESSURE_TREND_TABLE_NAME)
        quoted_engine_column = quote_identifier(PRESSURE_TREND_ENGINE_COLUMN)
        quoted_channel_description_column = quote_identifier(
            PRESSURE_TREND_CHANNEL_DESCRIPTION_COLUMN
        )
        quoted_timestamp_column = quote_identifier(PRESSURE_TREND_TIMESTAMP_COLUMN)
        quoted_value_column = quote_identifier(PRESSURE_TREND_VALUE_COLUMN)
        quoted_unit_column = quote_identifier(PRESSURE_TREND_UNIT_COLUMN)

        engines = connection.execute(
            f"""
            SELECT DISTINCT {quoted_engine_column} AS engine
            FROM {quoted_table}
            WHERE {quoted_engine_column} >= ?
            ORDER BY {quoted_engine_column}
            """
            ,
            (MIN_VISIBLE_ENGINE_NUMBER,),
        ).fetchall()

        resolved_channel_descriptions = [
            channel_description
            for channel_description in (
                channel_descriptions or [PRESSURE_TREND_CHANNEL_DESCRIPTION_VALUE]
            )
            if channel_description
        ]

        if not resolved_channel_descriptions:
            resolved_channel_descriptions = [PRESSURE_TREND_CHANNEL_DESCRIPTION_VALUE]

        if not engines:
            return {
                "page": "power",
                "engine": engine_number,
                "engines": [],
                "records": [],
                "meta": {
                    "rangeStartMs": None,
                    "rangeEndMs": None,
                    "unit": PRESSURE_TREND_DEFAULT_UNIT,
                    "seriesLabel": PRESSURE_TREND_SERIES_LABEL,
                    "series": [],
                },
            }

        requested_engine_number = (
            int(engine_number)
            if engine_number is not None and is_visible_engine_number(engine_number)
            else None
        )
        resolved_engine_number = requested_engine_number or int(engines[0]["engine"])
        range_row = resolve_history_range(
            connection,
            PRESSURE_TREND_TABLE_NAME,
            PRESSURE_TREND_TIMESTAMP_COLUMN,
            window_minutes,
            start_time,
            end_time,
        )

        channel_placeholders = ", ".join(["?"] * len(resolved_channel_descriptions))

        if start_time and end_time:
            records = connection.execute(
                f"""
                SELECT
                    {quoted_engine_column} AS engine,
                    {quoted_channel_description_column} AS channelDescription,
                    CAST(unixepoch({quoted_timestamp_column}) * 1000 AS INTEGER) AS timestampMs,
                    substr(strftime('%Y', {quoted_timestamp_column}), 3, 2) || '-' ||
                    strftime('%m', {quoted_timestamp_column}) || '.' ||
                    strftime('%d', {quoted_timestamp_column}) || ' ' ||
                    strftime('%H', {quoted_timestamp_column}) || '-' ||
                    strftime('%M', {quoted_timestamp_column}) || '-' ||
                    strftime('%S', {quoted_timestamp_column}) AS timestampLabel,
                    {quoted_value_column} AS value,
                    COALESCE({quoted_unit_column}, ?) AS unit
                FROM {quoted_table}
                WHERE {quoted_engine_column} = ?
                  AND {quoted_channel_description_column} IN ({channel_placeholders})
                  AND {quoted_timestamp_column} BETWEEN MIN(datetime(?, 'utc'), datetime(?, 'utc'))
                                                    AND MAX(datetime(?, 'utc'), datetime(?, 'utc'))
                ORDER BY {quoted_timestamp_column}, {quoted_channel_description_column}
                """,
                (
                    PRESSURE_TREND_DEFAULT_UNIT,
                    resolved_engine_number,
                    *resolved_channel_descriptions,
                    start_time,
                    end_time,
                    start_time,
                    end_time,
                ),
            ).fetchall()
        else:
            minutes = max(1, int(window_minutes or DEFAULT_WINDOW_MINUTES))
            records = connection.execute(
                f"""
                SELECT
                    {quoted_engine_column} AS engine,
                    {quoted_channel_description_column} AS channelDescription,
                    CAST(unixepoch({quoted_timestamp_column}) * 1000 AS INTEGER) AS timestampMs,
                    substr(strftime('%Y', {quoted_timestamp_column}), 3, 2) || '-' ||
                    strftime('%m', {quoted_timestamp_column}) || '.' ||
                    strftime('%d', {quoted_timestamp_column}) || ' ' ||
                    strftime('%H', {quoted_timestamp_column}) || '-' ||
                    strftime('%M', {quoted_timestamp_column}) || '-' ||
                    strftime('%S', {quoted_timestamp_column}) AS timestampLabel,
                    {quoted_value_column} AS value,
                    COALESCE({quoted_unit_column}, ?) AS unit
                FROM {quoted_table}
                WHERE {quoted_engine_column} = ?
                  AND {quoted_channel_description_column} IN ({channel_placeholders})
                  AND {quoted_timestamp_column} BETWEEN datetime(
                        (SELECT MAX({quoted_timestamp_column}) FROM {quoted_table}),
                        '-{minutes} minutes'
                      )
                      AND (SELECT MAX({quoted_timestamp_column}) FROM {quoted_table})
                ORDER BY {quoted_timestamp_column}, {quoted_channel_description_column}
                """,
                (
                    PRESSURE_TREND_DEFAULT_UNIT,
                    resolved_engine_number,
                    *resolved_channel_descriptions,
                ),
            ).fetchall()

    series = []
    for channel_description in resolved_channel_descriptions:
        first_matching_record = next(
            (
                record
                for record in records
                if record["channelDescription"] == channel_description
            ),
            None,
        )
        series.append(
            {
                "channelDescription": channel_description,
                "label": channel_description,
                "unit": first_matching_record["unit"] if first_matching_record else "",
            }
        )

    return {
        "page": "pressure_trend",
        "engine": resolved_engine_number,
        "engines": [int(row["engine"]) for row in engines],
        "records": [dict(row) for row in records],
        "meta": {
            "rangeStartMs": range_row["rangeStartMs"],
            "rangeEndMs": range_row["rangeEndMs"],
            "unit": records[0]["unit"] if records else PRESSURE_TREND_DEFAULT_UNIT,
            "seriesLabel": (
                series[0]["label"] if len(series) == 1 else PRESSURE_TREND_SERIES_LABEL
            ),
            "channelDescription": series[0]["channelDescription"] if len(series) == 1 else None,
            "series": series,
        },
    }


def build_exh_temp_trend_payload(
    engine_number: int | None = None,
    window_minutes: int | None = None,
    start_time: str | None = None,
    end_time: str | None = None,
    channel_descriptions: list[str] | None = None,
) -> dict[str, Any]:
    if not EXH_TEMP_TREND_DATABASE_PATH.exists():
        raise FileNotFoundError(
            f"Exhaust temperature trend database not found: {EXH_TEMP_TREND_DATABASE_PATH}"
        )

    validate_range_arguments(start_time, end_time)

    with sqlite3.connect(EXH_TEMP_TREND_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row

        quoted_table = quote_identifier(EXH_TEMP_TREND_TABLE_NAME)
        quoted_engine_column = quote_identifier(EXH_TEMP_TREND_ENGINE_COLUMN)
        quoted_channel_description_column = quote_identifier(
            EXH_TEMP_TREND_CHANNEL_DESCRIPTION_COLUMN
        )
        quoted_timestamp_column = quote_identifier(EXH_TEMP_TREND_TIMESTAMP_COLUMN)
        quoted_value_column = quote_identifier(EXH_TEMP_TREND_VALUE_COLUMN)
        quoted_unit_column = quote_identifier(EXH_TEMP_TREND_UNIT_COLUMN)

        engines = connection.execute(
            f"""
            SELECT DISTINCT {quoted_engine_column} AS engine
            FROM {quoted_table}
            WHERE {quoted_engine_column} >= ?
            ORDER BY {quoted_engine_column}
            """
            ,
            (MIN_VISIBLE_ENGINE_NUMBER,),
        ).fetchall()

        resolved_channel_descriptions = [
            channel_description
            for channel_description in (
                channel_descriptions or [EXH_TEMP_TREND_CHANNEL_DESCRIPTION_VALUE]
            )
            if channel_description
        ]

        if not resolved_channel_descriptions:
            resolved_channel_descriptions = [EXH_TEMP_TREND_CHANNEL_DESCRIPTION_VALUE]

        if not engines:
            return {
                "page": "exh_temp_trend",
                "engine": engine_number,
                "engines": [],
                "records": [],
                "meta": {
                    "rangeStartMs": None,
                    "rangeEndMs": None,
                    "unit": EXH_TEMP_TREND_DEFAULT_UNIT,
                    "seriesLabel": EXH_TEMP_TREND_SERIES_LABEL,
                    "series": [],
                },
            }

        requested_engine_number = (
            int(engine_number)
            if engine_number is not None and is_visible_engine_number(engine_number)
            else None
        )
        resolved_engine_number = requested_engine_number or int(engines[0]["engine"])
        range_row = resolve_history_range(
            connection,
            EXH_TEMP_TREND_TABLE_NAME,
            EXH_TEMP_TREND_TIMESTAMP_COLUMN,
            window_minutes,
            start_time,
            end_time,
        )

        channel_placeholders = ", ".join(["?"] * len(resolved_channel_descriptions))

        if start_time and end_time:
            records = connection.execute(
                f"""
                SELECT
                    {quoted_engine_column} AS engine,
                    {quoted_channel_description_column} AS channelDescription,
                    CAST(unixepoch({quoted_timestamp_column}) * 1000 AS INTEGER) AS timestampMs,
                    substr(strftime('%Y', {quoted_timestamp_column}), 3, 2) || '-' ||
                    strftime('%m', {quoted_timestamp_column}) || '.' ||
                    strftime('%d', {quoted_timestamp_column}) || ' ' ||
                    strftime('%H', {quoted_timestamp_column}) || '-' ||
                    strftime('%M', {quoted_timestamp_column}) || '-' ||
                    strftime('%S', {quoted_timestamp_column}) AS timestampLabel,
                    {quoted_value_column} AS value,
                    COALESCE({quoted_unit_column}, ?) AS unit
                FROM {quoted_table}
                WHERE {quoted_engine_column} = ?
                  AND {quoted_channel_description_column} IN ({channel_placeholders})
                  AND {quoted_timestamp_column} BETWEEN MIN(datetime(?, 'utc'), datetime(?, 'utc'))
                                                    AND MAX(datetime(?, 'utc'), datetime(?, 'utc'))
                ORDER BY {quoted_timestamp_column}, {quoted_channel_description_column}
                """,
                (
                    EXH_TEMP_TREND_DEFAULT_UNIT,
                    resolved_engine_number,
                    *resolved_channel_descriptions,
                    start_time,
                    end_time,
                    start_time,
                    end_time,
                ),
            ).fetchall()
        else:
            minutes = max(1, int(window_minutes or DEFAULT_WINDOW_MINUTES))
            records = connection.execute(
                f"""
                SELECT
                    {quoted_engine_column} AS engine,
                    {quoted_channel_description_column} AS channelDescription,
                    CAST(unixepoch({quoted_timestamp_column}) * 1000 AS INTEGER) AS timestampMs,
                    substr(strftime('%Y', {quoted_timestamp_column}), 3, 2) || '-' ||
                    strftime('%m', {quoted_timestamp_column}) || '.' ||
                    strftime('%d', {quoted_timestamp_column}) || ' ' ||
                    strftime('%H', {quoted_timestamp_column}) || '-' ||
                    strftime('%M', {quoted_timestamp_column}) || '-' ||
                    strftime('%S', {quoted_timestamp_column}) AS timestampLabel,
                    {quoted_value_column} AS value,
                    COALESCE({quoted_unit_column}, ?) AS unit
                FROM {quoted_table}
                WHERE {quoted_engine_column} = ?
                  AND {quoted_channel_description_column} IN ({channel_placeholders})
                  AND {quoted_timestamp_column} BETWEEN datetime(
                        (SELECT MAX({quoted_timestamp_column}) FROM {quoted_table}),
                        '-{minutes} minutes'
                      )
                      AND (SELECT MAX({quoted_timestamp_column}) FROM {quoted_table})
                ORDER BY {quoted_timestamp_column}, {quoted_channel_description_column}
                """,
                (
                    EXH_TEMP_TREND_DEFAULT_UNIT,
                    resolved_engine_number,
                    *resolved_channel_descriptions,
                ),
            ).fetchall()

    series = []
    for channel_description in resolved_channel_descriptions:
        first_matching_record = next(
            (
                record
                for record in records
                if record["channelDescription"] == channel_description
            ),
            None,
        )
        series.append(
            {
                "channelDescription": channel_description,
                "label": channel_description,
                "unit": first_matching_record["unit"] if first_matching_record else "",
            }
        )

    return {
        "page": "exh_temp_trend",
        "engine": resolved_engine_number,
        "engines": [int(row["engine"]) for row in engines],
        "records": [dict(row) for row in records],
        "meta": {
            "rangeStartMs": range_row["rangeStartMs"],
            "rangeEndMs": range_row["rangeEndMs"],
            "unit": records[0]["unit"] if records else EXH_TEMP_TREND_DEFAULT_UNIT,
            "seriesLabel": (
                series[0]["label"] if len(series) == 1 else EXH_TEMP_TREND_SERIES_LABEL
            ),
            "channelDescription": series[0]["channelDescription"] if len(series) == 1 else None,
            "series": series,
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


@database_api.get("/api/pressure_trend")
def get_pressure_trend_route() -> Any:
    """Return pressure trend history data for the selected time range."""
    try:
        return jsonify(
            build_pressure_trend_payload(
                engine_number=request.args.get("engine", default=None, type=int),
                window_minutes=request.args.get(
                    "windowMinutes", default=DEFAULT_WINDOW_MINUTES, type=int
                ),
                start_time=request.args.get("startTime", default=None, type=str),
                end_time=request.args.get("endTime", default=None, type=str),
                channel_descriptions=request.args.getlist("channelDescription"),
            )
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # pragma: no cover - runtime error surface
        return jsonify({"error": str(exc)}), 500


@database_api.get("/api/exh_temp_trend")
def get_exh_temp_trend_route() -> Any:
    """Return exhaust temperature trend history data for the selected time range."""
    try:
        return jsonify(
            build_exh_temp_trend_payload(
                engine_number=request.args.get("engine", default=None, type=int),
                window_minutes=request.args.get(
                    "windowMinutes", default=DEFAULT_WINDOW_MINUTES, type=int
                ),
                start_time=request.args.get("startTime", default=None, type=str),
                end_time=request.args.get("endTime", default=None, type=str),
                channel_descriptions=request.args.getlist("channelDescription"),
            )
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # pragma: no cover - runtime error surface
        return jsonify({"error": str(exc)}), 500
