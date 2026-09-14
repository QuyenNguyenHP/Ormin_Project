from __future__ import annotations

import hmac
import json
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any
from threading import RLock

from flask import Blueprint, jsonify, request, session

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "backend_config.json"
admin_api = Blueprint("admin_api", __name__)
config_lock = RLock()


def load_config() -> dict[str, Any]:
    with CONFIG_PATH.open("r", encoding="utf-8") as config_file:
        return json.load(config_file)


def write_config(config: dict[str, Any]) -> None:
    """Atomically replace the JSON file so readers never see a partial config."""
    with NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=BASE_DIR, delete=False, suffix=".json"
    ) as temporary_file:
        temporary_file.write(format_config(config))
        temporary_file.write("\n")
        temporary_path = Path(temporary_file.name)
    temporary_path.replace(CONFIG_PATH)


def format_config(value: Any, depth: int = 0) -> str:
    """Keep each signal on one line while indenting page/group structure."""
    if isinstance(value, dict) and value:
        if "source_type" in value and all(not isinstance(item, (dict, list)) for item in value.values()):
            return json.dumps(value, ensure_ascii=False)
        items = [f'{json.dumps(key, ensure_ascii=False)}: {format_config(item, depth + 1)}' for key, item in value.items()]
        opening, closing = "{", "}"
    elif isinstance(value, list) and value:
        items = [format_config(item, depth + 1) for item in value]
        opening, closing = "[", "]"
    else:
        return json.dumps(value, ensure_ascii=False)
    indent = "  " * (depth + 1)
    return opening + "\n" + indent + (",\n" + indent).join(items) + "\n" + "  " * depth + closing


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

    with config_lock:
        config = load_config()
        config["modbus"] = modbus_config
        write_config(config)
    return jsonify({"modbus": modbus_config, "message": "Modbus configuration saved."})


def address_nodes(node: Any, path: str = "pages"):
    """Expose stable paths so equal keys on different engines stay independent."""
    if isinstance(node, dict):
        if "source_type" in node and "address" in node:
            yield path, node
        else:
            for key, value in node.items():
                yield from address_nodes(value, f"{path}/{key}")
    elif isinstance(node, list):
        for index, value in enumerate(node):
            yield from address_nodes(value, f"{path}/{index}")


def address_rows(config):
    return [
        {"path": path, "page": path.split("/")[1],
         "label": node.get("label", node.get("key", path)),
         "key": node.get("key", ""), "source_type": node["source_type"],
         "address": node["address"], "register_count": node.get("register_count", 1)}
        for path, node in address_nodes(config.get("pages", {}))
    ]


@admin_api.get("/api/admin/addresses")
def get_addresses():
    denied = require_admin()
    if denied:
        return denied
    return jsonify({"addresses": address_rows(load_config())})


@admin_api.put("/api/admin/addresses")
def update_addresses():
    denied = require_admin()
    if denied:
        return denied
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("changes"), list) or not payload["changes"]:
        return jsonify({"error": "Provide a non-empty changes list."}), 400
    with config_lock:
        config = load_config()
        nodes = dict(address_nodes(config.get("pages", {})))
        seen = set()
        for change in payload["changes"]:
            if not isinstance(change, dict) or not isinstance(change.get("path"), str):
                return jsonify({"error": "Each change requires a mapping path."}), 400
            path = change["path"]
            if path not in nodes or path in seen:
                return jsonify({"error": f"Unknown or duplicate mapping: {path}"}), 400
            seen.add(path)
            node = nodes[path]
            if change.get("previous_address") != node["address"]:
                return jsonify({"error": "Addresses changed since loading. Reload before saving."}), 409
            address = change.get("address")
            start = {"holding_register": 40001, "discrete_input": 10001}.get(node["source_type"])
            count = int(node.get("register_count", 1)) if node["source_type"] == "holding_register" else 1
            if start is None or type(address) is not int or not start <= address <= start + 65536 - count:
                return jsonify({"error": f"Invalid address for {path}; use visible Modbus notation and a valid register span."}), 400
            node["address"] = address
        write_config(config)
    return jsonify({"addresses": address_rows(config), "message": "Addresses saved. Changes apply on the next data poll."})
