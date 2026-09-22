import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from flask import Flask

import admin_api
import modbus_api
from signal_config import mapping_nodes, reference_nodes, resolve_signals


class SharedSignalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "config.json"
        self.config = {
            "modbus": {"host": "localhost", "port": 502, "unit_id": 1, "poll_interval_ms": 1000},
            "signals": {
                "engine_1.engine_power": {"label": "Engine Power", "source_type": "holding_register", "address": 40038, "scale": 1},
                "engine_2.engine_power": {"label": "Engine Power", "source_type": "holding_register", "address": 40138, "scale": 1},
            },
            "pages": {
                "overview": {"gauge": {"signal": "engine_1.engine_power", "key": "engine_power", "title": "Engine 1", "max": 800}},
                "engine": {"metrics": [
                    {"signal": "engine_1.engine_power", "key": "engine_power", "label": "Engine Power", "unit": "kW"},
                    {"signal": "engine_2.engine_power", "key": "engine_power", "label": "Engine Power", "unit": "kW"},
                ]},
            },
        }
        self.path.write_text(json.dumps(self.config), encoding="utf-8")
        for module, name, value in (
            (admin_api, "CONFIG_PATH", self.path),
            (admin_api, "BASE_DIR", self.path.parent),
            (modbus_api, "CONFIG_PATH", self.path),
        ):
            patcher = patch.object(module, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        app = Flask(__name__)
        app.secret_key = "test"
        app.register_blueprint(admin_api.admin_api)
        self.client = app.test_client()
        with self.client.session_transaction() as session:
            session["is_admin"] = True

    def save(self, address=40040, previous=40038):
        return self.client.put("/api/admin/addresses", json={"changes": [{
            "path": "signals/engine_1.engine_power", "previous_address": previous, "address": address,
        }]})

    def test_admin_lists_shared_signal_once_with_all_page_usages(self):
        rows = self.client.get("/api/admin/addresses").json["addresses"]
        self.assertEqual(len(rows), 2)
        power = next(row for row in rows if row["signal_id"] == "engine_1.engine_power")
        self.assertEqual(power["pages"], ["engine", "overview"])
        self.assertEqual({usage["path"] for usage in power["usages"]}, {"pages/overview/gauge", "pages/engine/metrics/0"})

    def test_save_persists_once_and_updates_both_pages_on_next_poll(self):
        self.assertEqual(self.save().status_code, 200)
        stored = json.loads(self.path.read_text(encoding="utf-8"))
        expected = copy.deepcopy(self.config)
        expected["signals"]["engine_1.engine_power"]["address"] = 40040
        self.assertEqual(stored, expected)
        self.assertEqual(modbus_api.get_page_config("overview")["gauge"]["address"], 40040)
        metrics = modbus_api.get_page_config("engine")["metrics"]
        self.assertEqual([metric["address"] for metric in metrics], [40040, 40138])
        reads = []

        def fake_reads(mappings):
            reads.append([mapping["address"] for mapping in mappings])
            return {40040: 500, 40138: 600}, {}

        with patch.object(modbus_api, "read_modbus_maps", side_effect=fake_reads):
            overview = modbus_api.build_page_payload("overview")["sections"]
            engine = modbus_api.build_page_payload("engine")["sections"]
        self.assertEqual(reads, [[40040], [40040, 40138]])
        self.assertEqual(overview["gauge"], {"key": "engine_power", "title": "Engine 1", "max": 800, "value": 500})
        self.assertEqual(engine["metrics"][0], {"key": "engine_power", "label": "Engine Power", "unit": "kW", "value": 500})
        self.assertEqual(engine["metrics"][1]["value"], 600)
        self.assertEqual(self.client.get("/api/admin/addresses").json["addresses"][0]["address"], 40040)

    def test_stale_shared_edit_is_rejected_without_overwriting(self):
        self.assertEqual(self.save().status_code, 200)
        self.assertEqual(self.save(address=40042).status_code, 409)
        self.assertEqual(admin_api.load_config()["signals"]["engine_1.engine_power"]["address"], 40040)

    def test_invalid_shared_batch_does_not_save_any_signal(self):
        response = self.client.put("/api/admin/addresses", json={"changes": [
            {"path": "signals/engine_1.engine_power", "previous_address": 40038, "address": 40040},
            {"path": "signals/engine_2.engine_power", "previous_address": 40138, "address": 12},
        ]})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(admin_api.load_config(), self.config)

    def test_unknown_reference_and_local_address_override_fail_clearly(self):
        for node in ({"signal": "missing"}, {"signal": []}, {"signal": "engine_1.engine_power", "address": 40099}):
            with self.subTest(node=node), self.assertRaises(ValueError):
                resolve_signals(node, self.config["signals"])

    def test_resolving_keeps_source_and_page_metadata_independent(self):
        original = copy.deepcopy(self.config)
        resolved = resolve_signals(self.config["pages"], self.config["signals"])
        resolved["overview"]["gauge"]["address"] = 49999
        self.assertEqual(resolved["engine"]["metrics"][0]["address"], 40038)
        self.assertEqual(self.config, original)


class RuntimeSignalConfigurationTests(unittest.TestCase):
    def test_every_page_mapping_uses_a_valid_shared_definition(self):
        config = json.loads(Path(__file__).with_name("backend_config.json").read_text(encoding="utf-8"))
        self.assertFalse(list(mapping_nodes(config["pages"])))
        references = list(reference_nodes(config["pages"]))
        self.assertEqual({node["signal"] for _, node in references}, set(config["signals"]))
        resolved = resolve_signals(config["pages"], config["signals"])
        self.assertEqual(len(list(mapping_nodes(resolved))), len(references))
        for index in range(4):
            signal_id = f"engine_{index + 1}.engine_power"
            self.assertEqual(config["pages"]["overview"]["engines"][index]["gauge"]["signal"], signal_id)
            engine_signals = [node["signal"] for _, node in reference_nodes(config["pages"]["engine"]["engines"][index])]
            self.assertIn(signal_id, engine_signals)


if __name__ == "__main__":
    unittest.main()
