import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from flask import Flask
import admin_api


class AddressApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "config.json"
        self.config = {"modbus": {"host": "localhost"}, "pages": {"engine": [
            {"key": "power", "source_type": "holding_register", "address": 40001, "register_count": 2},
            {"key": "running", "source_type": "discrete_input", "address": 10001},
        ]}}
        self.path.write_text(json.dumps(self.config), encoding="utf-8")
        for name, value in (("CONFIG_PATH", self.path), ("BASE_DIR", self.path.parent)):
            patcher = patch.object(admin_api, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        app = Flask(__name__)
        app.secret_key = "test"
        app.register_blueprint(admin_api.admin_api)
        self.client = app.test_client()

    def authenticate(self):
        with self.client.session_transaction() as session:
            session["is_admin"] = True

    def change(self, address=40020, previous=40001, path="pages/engine/0"):
        return {"path": path, "address": address, "previous_address": previous}

    def save(self, changes):
        return self.client.put("/api/admin/addresses", json={"changes": changes})

    def test_auth_required(self):
        self.assertEqual(self.client.get("/api/admin/addresses").status_code, 401)
        self.assertEqual(self.save([self.change()]).status_code, 401)

    def test_save_round_trip_preserves_other_fields(self):
        self.authenticate()
        self.assertEqual(len(self.client.get("/api/admin/addresses").json["addresses"]), 2)
        self.assertEqual(self.save([self.change()]).status_code, 200)
        self.config["pages"]["engine"][0]["address"] = 40020
        self.assertEqual(admin_api.load_config(), self.config)
        self.assertIn('"source_type": "holding_register", "address": 40020', self.path.read_text())

    def test_invalid_batch_never_partially_saves(self):
        self.authenticate()
        for invalid in (True, 40001.5, "40001", 40000, 105536, None):
            self.assertEqual(self.save([self.change(address=invalid)]).status_code, 400)
        self.assertEqual(self.save([self.change(), self.change(path="missing")]).status_code, 400)
        self.assertEqual(self.save([self.change(), self.change()]).status_code, 400)
        self.assertEqual(admin_api.load_config(), self.config)

    def test_stale_address_rejected(self):
        self.authenticate()
        self.assertEqual(self.save([self.change(previous=40002)]).status_code, 409)
        self.assertEqual(admin_api.load_config(), self.config)

    def test_discrete_range(self):
        self.authenticate()
        self.assertEqual(self.save([self.change(10000, 10001, "pages/engine/1")]).status_code, 400)
        self.assertEqual(self.save([self.change(10020, 10001, "pages/engine/1")]).status_code, 200)


if __name__ == "__main__":
    unittest.main()
