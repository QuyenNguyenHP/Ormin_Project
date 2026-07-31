from __future__ import annotations

import hmac
import json
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any

from flask import Blueprint, jsonify, request, session

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "backend_config.json"
admin_api = Blueprint("admin_api", __name__)


def load_config() -> dict[str, Any]:
    with CONFIG_PATH.open("r", encoding="utf-8") as config_file:
        return json.load(config_file)


def write_config(config: dict[str, Any]) -> None:
    """Atomically replace the JSON file so readers never see a partial config."""
    with NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=BASE_DIR, delete=False, suffix=".json"
    ) as temporary_file:
        json.dump(config, temporary_file, indent=2, ensure_ascii=False)
        temporary_file.write("\n")
        temporary_path = Path(temporary_file.name)
    temporary_path.replace(CONFIG_PATH)


def current_credentials() -> tuple[str, str]:
    credentials = load_config().get("admin_credentials", {})
    username = credentials.get("username")
    password = credentials.get("password")
    if not isinstance(username, str) or not isinstance(password, str):
        raise RuntimeError("admin_credentials must define username and password.")
    return username, password


def is_admin() -> bool:
    return bool(session.get("is_admin"))


def require_admin() -> tuple[Any, int] | None:
    if not is_admin():
        return jsonify({"error": "Admin login is required."}), 401
    return None


def validate_modbus(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object.")

    host = str(payload.get("host", "")).strip()
    if not host or len(host) > 255 or any(character.isspace() for character in host):
        raise ValueError("Host must be a valid IP address or hostname.")

    def integer(name: str, minimum: int, maximum: int) -> int:
        value = payload.get(name)
        if isinstance(value, bool):
            raise ValueError(f"{name} must be a number.")
        try:
            parsed = int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{name} must be a number.") from exc
        if parsed < minimum or parsed > maximum:
            raise ValueError(f"{name} must be between {minimum} and {maximum}.")
        return parsed

    def decimal(name: str, minimum: float, maximum: float) -> float:
        value = payload.get(name)
        if isinstance(value, bool):
            raise ValueError(f"{name} must be a number.")
        try:
            parsed = float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{name} must be a number.") from exc
        if not minimum <= parsed <= maximum:
            raise ValueError(f"{name} must be between {minimum} and {maximum}.")
        return parsed

    return {
        "host": host,
        "port": integer("port", 1, 65535),
        "unit_id": integer("unit_id", 0, 247),
        "timeout_seconds": decimal("timeout_seconds", 0.1, 120),
        "poll_interval_ms": integer("poll_interval_ms", 100, 3_600_000),
    }


@admin_api.post("/api/admin/login")
def login() -> Any:
    payload = request.get_json(silent=True) or {}
    username, password = current_credentials()
    submitted_username = str(payload.get("username", ""))
    submitted_password = str(payload.get("password", ""))

    valid = hmac.compare_digest(submitted_username, username) and hmac.compare_digest(
        submitted_password, password
    )
    if not valid:
        return jsonify({"error": "Invalid username or password."}), 401

    session.clear()
    session["is_admin"] = True
    return jsonify({"authenticated": True, "username": username})


@admin_api.get("/api/admin/session")
def get_session() -> Any:
    username, _ = current_credentials()
    return jsonify({"authenticated": is_admin(), "username": username if is_admin() else None})


@admin_api.delete("/api/admin/session")
def logout() -> Any:
    session.clear()
    return jsonify({"authenticated": False})


@admin_api.get("/api/admin/modbus")
def get_modbus_config() -> Any:
    denied = require_admin()
    if denied:
        return denied
    return jsonify({"modbus": load_config()["modbus"]})


@admin_api.put("/api/admin/modbus")
def update_modbus_config() -> Any:
    denied = require_admin()
    if denied:
        return denied
    try:
        modbus_config = validate_modbus(request.get_json(silent=True))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    config = load_config()
    config["modbus"] = modbus_config
    write_config(config)
    return jsonify({"modbus": modbus_config, "message": "Modbus configuration saved."})
