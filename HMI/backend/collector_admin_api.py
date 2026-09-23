"""Authenticated process controls for history collection and fuel calculation."""

from __future__ import annotations

import atexit
import subprocess
import sys
from collections import deque
from datetime import date, datetime, timezone
from pathlib import Path
from threading import RLock, Thread
from typing import Any

from flask import Blueprint, jsonify, request

from admin_api import require_admin


BASE_DIR = Path(__file__).resolve().parent
COLLECTOR_DIR = BASE_DIR / "data_collector"
COLLECTOR_SCRIPT = COLLECTOR_DIR / "modbus_csv_db_collector.py"
FUEL_SCRIPT = COLLECTOR_DIR / "daily_fuel_consumption.py"
collector_admin_api = Blueprint("collector_admin_api", __name__)


class ManagedProcess:
    """Own one child process and retain a small, bounded output history."""

    def __init__(self, name: str) -> None:
        self.name = name
        self.lock = RLock()
        self.process: subprocess.Popen[str] | None = None
        self.started_at: str | None = None
        self.finished_at: str | None = None
        self.last_exit_code: int | None = None
        self.output: deque[str] = deque(maxlen=80)

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


def combined_status() -> dict[str, Any]:
    return {
        "collector": history_collector.status(),
        "fuel_calculation": fuel_calculator.status(),
    }


@collector_admin_api.get("/api/admin/data-collector/status")
def get_status() -> Any:
    denied = require_admin()
    if denied:
        return denied
    return jsonify(combined_status())


@collector_admin_api.post("/api/admin/data-collector/start")
def start_collector() -> Any:
    denied = require_admin()
    if denied:
        return denied
    if not COLLECTOR_SCRIPT.is_file():
        return jsonify({"error": f"Collector script not found: {COLLECTOR_SCRIPT}"}), 500
    try:
        history_collector.start([
            sys.executable,
            "-u",
            str(COLLECTOR_SCRIPT),
            "--backend-config",
            str(BASE_DIR / "backend_config.json"),
        ])
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409
    except OSError as exc:
        return jsonify({"error": f"Unable to start data collector: {exc}"}), 500
    return jsonify({**combined_status(), "message": "Data collection started."}), 201


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
