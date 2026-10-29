"""Authenticated process controls for history collection and fuel calculation."""

from __future__ import annotations

import atexit
import json
import subprocess
import sys
from collections import deque
from datetime import date, datetime, timezone
from pathlib import Path
from threading import RLock, Thread
from tempfile import NamedTemporaryFile
from typing import Any

from flask import Blueprint, jsonify, request

from admin_api import require_admin


BASE_DIR = Path(__file__).resolve().parent
COLLECTOR_DIR = BASE_DIR / "data_collector"
COLLECTOR_SCRIPT = COLLECTOR_DIR / "modbus_csv_db_collector.py"
COLLECTOR_CONFIG = COLLECTOR_DIR / "modbus_csv_db_collector_config.json"
FUEL_SCRIPT = COLLECTOR_DIR / "daily_fuel_consumption.py"
collector_admin_api = Blueprint("collector_admin_api", __name__)
collector_config_lock = RLock()


def load_collector_settings() -> dict[str, Any]:
    with COLLECTOR_CONFIG.open("r", encoding="utf-8") as config_file:
        config = json.load(config_file)
    output = config.get("output", {})
    legacy_csv_path = str(output.get("csv_path", "../database/modbus_history.csv"))
    return {
        "auto_start": bool(config.get("auto_start", False)),
        "collection_interval_seconds": int(
            config.get("modbus", {}).get("poll_interval_seconds", 30)
        ),
        "csv_directory": str(
            output.get("csv_directory", str(Path(legacy_csv_path).parent))
        ),
    }


def validate_collector_settings(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object.")
    try:
        interval = int(payload.get("collection_interval_seconds"))
    except (TypeError, ValueError) as exc:
        raise ValueError("Collection interval must be 15 or 30 seconds.") from exc
    if interval not in (15, 30):
        raise ValueError("Collection interval must be 15 or 30 seconds.")
    csv_directory = str(payload.get("csv_directory", "")).strip()
    if not csv_directory or len(csv_directory) > 2048:
        raise ValueError("CSV directory is required and must not exceed 2048 characters.")
    return {
        "collection_interval_seconds": interval,
        "csv_directory": csv_directory,
    }


def save_collector_settings(settings: dict[str, Any]) -> None:
    with collector_config_lock:
        with COLLECTOR_CONFIG.open("r", encoding="utf-8") as config_file:
            config = json.load(config_file)
        config.setdefault("modbus", {})["poll_interval_seconds"] = settings[
            "collection_interval_seconds"
        ]
        output = config.setdefault("output", {})
        output["csv_directory"] = settings["csv_directory"]
        output.pop("csv_path", None)
        with NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=COLLECTOR_CONFIG.parent, delete=False, suffix=".json"
        ) as temporary_file:
            json.dump(config, temporary_file, ensure_ascii=False, indent=2)
            temporary_file.write("\n")
            temporary_path = Path(temporary_file.name)
        temporary_path.replace(COLLECTOR_CONFIG)


def save_collector_auto_start(enabled: bool) -> None:
    """Persist whether collection should run whenever the backend starts."""
    with collector_config_lock:
        with COLLECTOR_CONFIG.open("r", encoding="utf-8") as config_file:
            config = json.load(config_file)
        config["auto_start"] = enabled
        with NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=COLLECTOR_CONFIG.parent, delete=False, suffix=".json"
        ) as temporary_file:
            json.dump(config, temporary_file, ensure_ascii=False, indent=2)
            temporary_file.write("\n")
            temporary_path = Path(temporary_file.name)
        temporary_path.replace(COLLECTOR_CONFIG)


class ManagedProcess:
    """Own one child process and retain a small, bounded output history."""

    def __init__(self, name: str) -> None:
        self.name = name
        self.lock = RLock()
        self.process: subprocess.Popen[str] | None = None
        self.started_at: str | None = None
        self.finished_at: str | None = None
        self.last_exit_code: int | None = None
        self.output: deque[str] = deque(maxlen=200)

    @staticmethod
    def timestamp() -> str:
        return datetime.now(timezone.utc).isoformat()

    def _finish(self, process: subprocess.Popen[str]) -> None:
        exit_code = process.poll()
        if exit_code is None:
            return
        with self.lock:
            if self.process is process:
                self.last_exit_code = exit_code
                self.finished_at = self.finished_at or self.timestamp()

    def _read_output(self, process: subprocess.Popen[str]) -> None:
        if process.stdout is not None:
            for line in process.stdout:
                text = line.rstrip()
                if text:
                    with self.lock:
                        if self.process is process:
                            self.output.append(text)
        process.wait()
        self._finish(process)

    def start(self, command: list[str]) -> None:
        with self.lock:
            if self.process is not None and self.process.poll() is None:
                raise RuntimeError(f"{self.name} is already running.")

            creation_flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
            self.output.clear()
            self.last_exit_code = None
            self.finished_at = None
            self.process = subprocess.Popen(
                command,
                cwd=COLLECTOR_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
                creationflags=creation_flags,
            )
            self.started_at = self.timestamp()
            process = self.process

        Thread(target=self._read_output, args=(process,), daemon=True).start()

    def stop(self) -> bool:
        with self.lock:
            process = self.process
            if process is None or process.poll() is not None:
                if process is not None:
                    self._finish(process)
                return False
            process.terminate()

        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
        self._finish(process)
        return True

    def status(self) -> dict[str, Any]:
        with self.lock:
            process = self.process
            if process is not None:
                self._finish(process)
            running = process is not None and process.poll() is None
            return {
                "running": running,
                "pid": process.pid if running else None,
                "started_at": self.started_at,
                "finished_at": self.finished_at,
                "last_exit_code": self.last_exit_code,
                "output": list(self.output),
            }


history_collector = ManagedProcess("Data collector")
fuel_calculator = ManagedProcess("Fuel calculation")


def collector_command() -> list[str]:
    return [
        sys.executable,
        "-u",
        str(COLLECTOR_SCRIPT),
        "--backend-config",
        str(BASE_DIR / "backend_config.json"),
    ]


def initialize_collector_auto_start() -> bool:
    """Start the collector after backend startup when the persisted option is enabled."""
    try:
        enabled = load_collector_settings()["auto_start"]
        if enabled and not history_collector.status()["running"]:
            history_collector.start(collector_command())
        return bool(enabled)
    except (OSError, ValueError, json.JSONDecodeError, RuntimeError) as exc:
        print(f"Unable to auto-start data collector: {exc}", flush=True)
        return False


def combined_status() -> dict[str, Any]:
    return {
        "collector": history_collector.status(),
        "fuel_calculation": fuel_calculator.status(),
        "settings": load_collector_settings(),
    }


@collector_admin_api.get("/api/data-collector/log")
def get_public_collector_log() -> Any:
    """Expose read-only collector health and recent output on the login screen."""
    collector_status = history_collector.status()
    recent_output = collector_status.get("output", [])[-200:]
    collector_status["output"] = list(reversed(recent_output))
    return jsonify({"collector": collector_status})


@collector_admin_api.get("/api/admin/data-collector/status")
def get_status() -> Any:
    denied = require_admin()
    if denied:
        return denied
    return jsonify(combined_status())


@collector_admin_api.put("/api/admin/data-collector/settings")
def update_collector_settings() -> Any:
    denied = require_admin()
    if denied:
        return denied
    if history_collector.status()["running"]:
        return jsonify({"error": "Stop data collection before changing its settings."}), 409
    try:
        settings = validate_collector_settings(request.get_json(silent=True))
        save_collector_settings(settings)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except (OSError, json.JSONDecodeError) as exc:
        return jsonify({"error": f"Unable to save collector settings: {exc}"}), 500
    return jsonify({**combined_status(), "message": "Data collection settings saved."})


@collector_admin_api.post("/api/admin/data-collector/start")
def start_collector() -> Any:
    denied = require_admin()
    if denied:
        return denied
    if not COLLECTOR_SCRIPT.is_file():
        return jsonify({"error": f"Collector script not found: {COLLECTOR_SCRIPT}"}), 500
    try:
        history_collector.start(collector_command())
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409
    except OSError as exc:
        return jsonify({"error": f"Unable to start data collector: {exc}"}), 500
    return jsonify({**combined_status(), "message": "Data collection started."}), 201


@collector_admin_api.put("/api/admin/data-collector/auto-start")
def update_collector_auto_start() -> Any:
    denied = require_admin()
    if denied:
        return denied
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("enabled"), bool):
        return jsonify({"error": "enabled must be true or false."}), 400

    enabled = payload["enabled"]
    try:
        save_collector_auto_start(enabled)
        running = history_collector.status()["running"]
        if enabled and not running:
            if not COLLECTOR_SCRIPT.is_file():
                raise OSError(f"Collector script not found: {COLLECTOR_SCRIPT}")
            history_collector.start(collector_command())
        elif not enabled and running:
            history_collector.stop()
    except (OSError, json.JSONDecodeError, RuntimeError) as exc:
        return jsonify({"error": f"Unable to update automatic collection: {exc}"}), 500

    message = (
        "Automatic collection enabled and collector started."
        if enabled
        else "Automatic collection disabled and collector stopped."
    )
    return jsonify({**combined_status(), "message": message})


@collector_admin_api.delete("/api/admin/data-collector")
def stop_collector() -> Any:
    denied = require_admin()
    if denied:
        return denied
    stopped = history_collector.stop()
    message = "Data collection stopped." if stopped else "Data collector is not running."
    return jsonify({**combined_status(), "message": message})


@collector_admin_api.post("/api/admin/fuel-calculation/start")
def start_fuel_calculation() -> Any:
    denied = require_admin()
    if denied:
        return denied
    if not FUEL_SCRIPT.is_file():
        return jsonify({"error": f"Fuel calculation script not found: {FUEL_SCRIPT}"}), 500

    payload = request.get_json(silent=True) or {}
    selected_day = str(payload.get("day", "")).strip()
    command = [sys.executable, "-u", str(FUEL_SCRIPT)]
    if selected_day:
        try:
            date.fromisoformat(selected_day)
        except ValueError:
            return jsonify({"error": "Day must use YYYY-MM-DD format."}), 400
        command.extend(["--day", selected_day])

    try:
        fuel_calculator.start(command)
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409
    except OSError as exc:
        return jsonify({"error": f"Unable to start fuel calculation: {exc}"}), 500
    return jsonify({**combined_status(), "message": "Fuel calculation started."}), 201


@collector_admin_api.delete("/api/admin/fuel-calculation")
def stop_fuel_calculation() -> Any:
    denied = require_admin()
    if denied:
        return denied
    stopped = fuel_calculator.stop()
    message = "Fuel calculation stopped." if stopped else "Fuel calculation is not running."
    return jsonify({**combined_status(), "message": message})


def stop_managed_processes() -> None:
    history_collector.stop()
    fuel_calculator.stop()


atexit.register(stop_managed_processes)
