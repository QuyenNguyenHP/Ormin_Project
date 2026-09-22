import csv
import io
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from flask import Flask

import admin_api
import sqlite_admin_api


class SqliteAdminApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.database = Path(self.temp.name) / "history.sqlite3"
        with closing(sqlite3.connect(self.database)) as connection:
            connection.execute('CREATE TABLE "database" ("Engine" INTEGER, "Channel Description" TEXT, "Timestamp" DATETIME, "Value" REAL, "Unit" TEXT)')
            connection.execute('CREATE INDEX "history_time" ON "database" ("Timestamp")')
            connection.executemany('INSERT INTO "database" VALUES (?, ?, ?, ?, ?)', [
                (1, "Engine Power", "2026-09-15 10:00:00", 100.0, "kW"),
                (2, "Engine Power", "2026-09-15 11:00:00", 200.0, "kW"),
                (1, "=unsafe CSV", "2026-09-15 12:00:00", 300.0, "kW"),
            ])
            connection.commit()
        paths = (
            "SHARED_DATABASE_PATH", "DATABASE_PATH", "HO_DATABASE_PATH",
            "PRESSURE_TREND_DATABASE_PATH", "EXH_TEMP_TREND_DATABASE_PATH",
        )
        for name in paths:
            patcher = patch.object(sqlite_admin_api.history, name, self.database)
            patcher.start()
            self.addCleanup(patcher.stop)
        patcher = patch.object(sqlite_admin_api.history, "BASE_DIR", Path(self.temp.name))
        patcher.start()
        self.addCleanup(patcher.stop)
        app = Flask(__name__)
        app.secret_key = "test"
        app.register_blueprint(sqlite_admin_api.sqlite_admin_api)
        self.client = app.test_client()
        self.database_id = sqlite_admin_api.databases()[0]["id"]

    def authenticate(self):
        with self.client.session_transaction() as session:
            session["is_admin"] = True

    def test_authentication_is_required_for_every_endpoint(self):
        for method, path in (
            ("get", "/api/admin/sqlite"),
            ("get", "/api/admin/sqlite/tables"),
            ("get", "/api/admin/sqlite/options"),
            ("get", "/api/admin/sqlite/rows"),
            ("get", "/api/admin/sqlite/export"),
            ("post", "/api/admin/sqlite/check"),
            ("get", "/api/admin/sqlite/backup"),
        ):
            with self.subTest(path=path):
                self.assertEqual(getattr(self.client, method)(path).status_code, 401)

    def test_overview_deduplicates_database_and_lists_consumers(self):
        self.authenticate()
        item = self.client.get("/api/admin/sqlite").json["databases"][0]
        self.assertTrue(item["exists"])
        self.assertEqual(item["size_bytes"], self.database.stat().st_size)
        self.assertEqual(len(item["used_by"]), 5)

    def test_table_rows_filters_and_paginates_with_bound_parameters(self):
        self.authenticate()
        response = self.client.get("/api/admin/sqlite/rows", query_string={
            "db": self.database_id, "table": "database", "engine": "1",
            "channel": "Engine Power", "start": "2026-09-15T09:00", "end": "2026-09-15T10:30",
            "limit": 1, "offset": 0,
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["total"], 1)
        self.assertEqual(response.json["rows"][0][1], "Engine Power")
        self.assertEqual(response.json["earliest"], "2026-09-15 10:00:00")
        self.assertEqual(response.json["latest"], "2026-09-15 10:00:00")
        self.assertEqual(response.json["indexes"][0]["name"], "history_time")
        injected = self.client.get("/api/admin/sqlite/rows", query_string={
            "db": self.database_id, "table": 'database"; DROP TABLE database;--',
        })
        self.assertEqual(injected.status_code, 400)
        with closing(sqlite3.connect(self.database)) as connection:
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM "database"').fetchone()[0], 3)

    def test_export_escapes_spreadsheet_formulas_and_respects_filter(self):
        self.authenticate()
        response = self.client.get("/api/admin/sqlite/export", query_string={
            "db": self.database_id, "table": "database", "channel": "=unsafe CSV",
        })
        self.assertEqual(response.status_code, 200)
        rows = list(csv.reader(io.StringIO(response.data.decode("utf-8-sig"))))
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[1][1], "'=unsafe CSV")

    def test_filter_options_are_read_from_existing_rows(self):
        self.authenticate()
        response = self.client.get("/api/admin/sqlite/options", query_string={
            "db": self.database_id, "table": "database",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["engines"], [1, 2])
        self.assertEqual(response.json["channels"], ["=unsafe CSV", "Engine Power"])

    def test_integrity_check_and_consistent_backup(self):
        self.authenticate()
        check = self.client.post("/api/admin/sqlite/check", query_string={"db": self.database_id})
        self.assertEqual(check.status_code, 200)
        self.assertEqual(check.json, {"messages": ["ok"], "ok": True})
        backup = self.client.get("/api/admin/sqlite/backup", query_string={"db": self.database_id})
        self.assertEqual(backup.status_code, 200)
        copied = Path(self.temp.name) / "copy.sqlite3"
        copied.write_bytes(backup.data)
        with closing(sqlite3.connect(copied)) as connection:
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM "database"').fetchone()[0], 3)

    def test_invalid_ranges_and_limits_are_rejected(self):
        self.authenticate()
        base = {"db": self.database_id, "table": "database"}
        for values in (
            {"limit": 201}, {"offset": -1}, {"engine": "one"},
            {"start": "2026-09-16", "end": "2026-09-15"},
        ):
            with self.subTest(values=values):
                response = self.client.get("/api/admin/sqlite/rows", query_string={**base, **values})
                self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
