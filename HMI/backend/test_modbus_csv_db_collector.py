import unittest
import sqlite3
import tempfile
import csv
import json
from unittest.mock import patch
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path

from data_collector.modbus_csv_db_collector import (
    import_rows_to_database, parse_points, collection_config,
    run_collection,
)


class EngineStatusCollectorTests(unittest.TestCase):
    def test_all_backend_signals_reach_csv_and_database(self):
        base = Path(__file__).resolve().parent
        backend_path = base / "backend_config.json"
        backend = json.loads(backend_path.read_text())
        collector = collection_config(backend)
        points = parse_points(collector)
        for signal_id, signal in backend["signals"].items():
            if signal["source_type"] == "discrete_input":
                self.assertTrue(any(p.get("signal_id") == signal_id for p in collector["points"]))
            else:
                self.assertTrue(any(p.address == signal["address"] and p.source_type == "holding_register" for p in points))
        self.assertEqual(len({(p.engine, p.channel_description) for p in points}), len(points))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            collector["output"].update(csv_directory=str(root / "csv"), database_path=str(root / "history.db"))
            config_path = root / "collector.json"
            backend["data_collector"]["output"] = collector["output"]
            backend["database_path"] = str(root / "history.db")
            config_path.write_text(json.dumps(backend))

            def snapshot(modbus, selected):
                timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
                return [(p.engine, p.channel_description, timestamp, 1.0, p.unit) for p in selected]

            with patch("data_collector.modbus_csv_db_collector.read_snapshot", side_effect=snapshot):
                run_collection(config_path, once=True)
            with (next((root / "csv").glob("*.csv"))).open() as file:
                self.assertEqual(len(list(csv.DictReader(file))), len(points))
            with closing(sqlite3.connect(root / "history.db")) as connection:
                self.assertEqual(connection.execute('SELECT COUNT(*) FROM "database"').fetchone()[0], len(points))

    def test_signals_are_collected_without_a_separate_point_list(self):
        backend = {
            "database_path": "database/history", "modbus": {"host": "localhost"},
            "signals": {
                "engine_1.custom": {"label": "Custom", "unit": "C", "source_type": "holding_register", "address": 40004, "scale": 0.5,
                    "history": {"aliases": [{"engine": 0, "channel_description": "Legacy custom"}]}},
                "disabled": {"source_type": "discrete_input", "address": 10001, "history": {"enabled": False}},
                "devices.new": {"source_type": "discrete_input", "address": 11638},
            },
            "data_collector": {"output": {}},
        }
        points = parse_points(collection_config(backend))
        self.assertEqual(len(points), 3)
        self.assertEqual(points[0].engine, 1)
        self.assertEqual(points[0].address, 40004)
        self.assertEqual(points[0].scale, 0.5)
        self.assertEqual(points[1].channel_description, "Legacy custom")
        self.assertEqual(points[1].engine, 0)
        self.assertEqual(points[2].unit, "state")
        backend["signals"]["engine_1.custom"]["address"] = 40005
        self.assertEqual(parse_points(collection_config(backend))[1].address, 40005)
        backend["signals"]["engine_1.custom"]["history"]["enabled"] = False
        self.assertEqual(len(parse_points(collection_config(backend))), 1)

    def test_database_import_automatically_keeps_latest_60_days(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            database = Path(temporary_directory) / "history.sqlite3"
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            old = (now - timedelta(days=61)).isoformat(sep=" ", timespec="seconds")
            recent = now.isoformat(sep=" ", timespec="seconds")
            rows = [
                (1, "Old status", old, 0.0, "state"),
                (1, "Recent status", recent, 1.0, "state"),
            ]

            import_rows_to_database(database, "database", rows, retention_days=60)

            with closing(sqlite3.connect(database)) as connection:
                channels = [row[0] for row in connection.execute(
                    'SELECT "Channel Description" FROM "database"'
                )]
            self.assertEqual(channels, ["Recent status"])


if __name__ == "__main__":
    unittest.main()
