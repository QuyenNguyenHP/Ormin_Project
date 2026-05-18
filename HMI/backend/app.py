from __future__ import annotations

from flask import Flask
from flask_cors import CORS

from database_api import database_api
from modbus_api import modbus_api


app = Flask(__name__)
CORS(app)

# Register the static database route first, then the generic page-based Modbus route.
app.register_blueprint(database_api)
app.register_blueprint(modbus_api)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001, debug=True)
