import unittest
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
