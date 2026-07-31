from __future__ import annotations

import os

from flask import Flask
from flask_cors import CORS

from database_api import database_api
from modbus_api import modbus_api
from admin_api import admin_api


app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get("HMI_SESSION_SECRET", "change-this-session-secret-before-production"),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)
CORS(app)

# Register the static database route first, then the generic page-based Modbus route.
app.register_blueprint(database_api)
app.register_blueprint(modbus_api)
app.register_blueprint(admin_api)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001, debug=True)
