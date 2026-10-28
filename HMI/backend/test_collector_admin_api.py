import unittest
import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from flask import Flask

import collector_admin_api


class FakeProcess:
    def __init__(self):
        self.command = None
        self.running = False

    def start(self, command):
        self.command = command
        self.running = True

    def stop(self):
        was_running = self.running
        self.running = False
        return was_running

    def status(self):
        return {
            "running": self.running,
            "pid": 123 if self.running else None,
            "started_at": None,
            "finished_at": None,
            "last_exit_code": None,
            "output": [],
        }


class CollectorAdminApiTests(unittest.TestCase):
    def setUp(self):
        self.collector = FakeProcess()
        self.fuel = FakeProcess()
        collector_patch = patch.object(
            collector_admin_api, "history_collector", self.collector
        )
        fuel_patch = patch.object(
            collector_admin_api, "fuel_calculator", self.fuel
        )
        collector_patch.start()
        fuel_patch.start()
        self.addCleanup(collector_patch.stop)
        self.addCleanup(fuel_patch.stop)

        self.temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary_directory.cleanup)
        self.collector_config = Path(self.temporary_directory.name) / "collector.json"
        self.collector_config.write_text(json.dumps({
            "modbus": {"poll_interval_seconds": 30},
            "output": {"csv_directory": "../database/csv_history"},
            "points": [],
        }), encoding="utf-8")
        config_patch = patch.object(
            collector_admin_api, "COLLECTOR_CONFIG", self.collector_config
        )
        config_patch.start()
        self.addCleanup(config_patch.stop)

        app = Flask(__name__)
        app.secret_key = "test"
        app.register_blueprint(collector_admin_api.collector_admin_api)
        self.client = app.test_client()

    def authenticate(self):
        with self.client.session_transaction() as session:
            session["is_admin"] = True

    def test_authentication_is_required(self):
        for method, path in (
            ("get", "/api/admin/data-collector/status"),
            ("put", "/api/admin/data-collector/settings"),
            ("post", "/api/admin/data-collector/start"),
            ("delete", "/api/admin/data-collector"),
            ("post", "/api/admin/fuel-calculation/start"),
            ("delete", "/api/admin/fuel-calculation"),
        ):
            with self.subTest(path=path):
                self.assertEqual(getattr(self.client, method)(path).status_code, 401)

    def test_start_collector_uses_backend_modbus_config(self):
        self.authenticate()
        response = self.client.post("/api/admin/data-collector/start")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(self.collector.running)
        self.assertIn("--backend-config", self.collector.command)
        self.assertTrue(self.collector.command[-1].endswith("backend_config.json"))

    def test_collector_settings_are_validated_and_saved(self):
        self.authenticate()
        invalid = self.client.put(
            "/api/admin/data-collector/settings",
            json={"collection_interval_seconds": 10, "csv_directory": "history"},
        )
        self.assertEqual(invalid.status_code, 400)

        response = self.client.put(
            "/api/admin/data-collector/settings",
            json={"collection_interval_seconds": 15, "csv_directory": "D:/history"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["settings"]["collection_interval_seconds"], 15)
        saved = json.loads(self.collector_config.read_text(encoding="utf-8"))
        self.assertEqual(saved["modbus"]["poll_interval_seconds"], 15)
        self.assertEqual(saved["output"]["csv_directory"], "D:/history")

    def test_collector_settings_cannot_change_while_running(self):
        self.authenticate()
        self.collector.running = True
        response = self.client.put(
            "/api/admin/data-collector/settings",
            json={"collection_interval_seconds": 30, "csv_directory": "history"},
        )
        self.assertEqual(response.status_code, 409)

    def test_fuel_calculation_validates_and_passes_day(self):
        self.authenticate()
        invalid = self.client.post(
            "/api/admin/fuel-calculation/start", json={"day": "23-09-2026"}
        )
        self.assertEqual(invalid.status_code, 400)

        response = self.client.post(
            "/api/admin/fuel-calculation/start", json={"day": "2026-09-23"}
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.fuel.command[-2:], ["--day", "2026-09-23"])


if __name__ == "__main__":
    unittest.main()
