import unittest
import sqlite3
import tempfile
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path

from data_collector.modbus_csv_db_collector import (
    import_rows_to_database, parse_points, sync_engine_status_points,
)


class EngineStatusCollectorTests(unittest.TestCase):
    def test_engine_status_discrete_inputs_are_added_as_unique_points(self):
        collector = {
            "points": [{
                "engine": 1,
                "channel_description": "Engine Power",
                "source_type": "holding_register",
                "address": 40001,
                "unit": "kW",
            }]
        }
        backend = {
            "signals": {
                "alarm.engine_1_signal_1": {
                    "label": "Switch",
                    "source_type": "discrete_input",
                    "address": 10001,
                },
                "alarm.engine_1_signal_2": {
                    "label": "Switch",
                    "source_type": "discrete_input",
                    "address": 10002,
                },
            },
            "pages": {"alarm": {"engines": [{
                "key": "engine_1",
                "bits": [
                    {"signal": "alarm.engine_1_signal_1", "label": "Switch"},
                    {"signal": "alarm.engine_1_signal_2", "label": "Switch"},
                ],
            }] }},
        }

        count = sync_engine_status_points(collector, backend)

        self.assertEqual(count, 2)
        self.assertEqual(len(collector["points"]), 3)
        self.assertEqual(collector["points"][1]["channel_description"], "Switch [DI 10001]")
        self.assertEqual(collector["points"][2]["channel_description"], "Switch [DI 10002]")
        parsed = parse_points(collector)
        self.assertEqual(parsed[1].source_type, "discrete_input")
        self.assertEqual(parsed[1].unit, "state")

    def test_resync_replaces_old_managed_points(self):
        collector = {"points": [{
            "engine": 1,
            "channel_description": "Old [DI 10001]",
            "source_type": "discrete_input",
            "address": 10001,
            "unit": "state",
            "managed_by": "backend_engine_status",
        }]}
        backend = {
            "signals": {"alarm.engine_1_signal_1": {
                "source_type": "discrete_input", "address": 10005, "label": "New"
            }},
            "pages": {"alarm": {"engines": [{
                "key": "engine_1",
                "bits": [{"signal": "alarm.engine_1_signal_1", "label": "New"}],
            }] }},
        }

        sync_engine_status_points(collector, backend)

        self.assertEqual(len(collector["points"]), 1)
        self.assertEqual(collector["points"][0]["address"], 10005)

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
