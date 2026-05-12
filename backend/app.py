from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from flask import Flask, jsonify
from flask_cors import CORS
from pymodbus.client import ModbusTcpClient


BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "pid_monitor_config.json"


def load_config() -> dict[str, Any]:
    with CONFIG_PATH.open("r", encoding="utf-8") as config_file:
        return json.load(config_file)


CONFIG = load_config()
MODBUS_CONFIG = CONFIG["modbus"]
FLOW_MAPPINGS = CONFIG["flows"]
DIGITAL_MAPPINGS = CONFIG["digitals"]

app = Flask(__name__)
CORS(app)


def modbus_address_to_offset(address: int, family_start: int) -> int:
    return address - family_start


def group_contiguous_addresses(
    mappings: list[dict[str, Any]], key: str
) -> list[tuple[int, int]]:
    addresses = sorted({int(mapping[key]) for mapping in mappings})
    if not addresses:
      return []

    groups: list[tuple[int, int]] = []
    group_start = addresses[0]
    group_end = addresses[0]

    for address in addresses[1:]:
        if address == group_end + 1:
            group_end = address
            continue

        groups.append((group_start, group_end))
        group_start = address
        group_end = address

    groups.append((group_start, group_end))
    return groups


def read_holding_register_map(client: ModbusTcpClient) -> dict[int, int]:
    register_map: dict[int, int] = {}

    for group_start, group_end in group_contiguous_addresses(FLOW_MAPPINGS, "register"):
        count = group_end - group_start + 1
        response = client.read_holding_registers(
            address=modbus_address_to_offset(group_start, 40001),
            count=count,
            slave=MODBUS_CONFIG["unit_id"],
        )
        if response.isError():
            raise RuntimeError(f"Failed to read holding registers {group_start}-{group_end}")

        for index, value in enumerate(response.registers):
            register_map[group_start + index] = value

    return register_map


def read_discrete_input_map(client: ModbusTcpClient) -> dict[int, int]:
    bit_map: dict[int, int] = {}

    for group_start, group_end in group_contiguous_addresses(DIGITAL_MAPPINGS, "bit"):
        count = group_end - group_start + 1
        response = client.read_discrete_inputs(
            address=modbus_address_to_offset(group_start, 10001),
            count=count,
            slave=MODBUS_CONFIG["unit_id"],
        )
        if response.isError():
            raise RuntimeError(f"Failed to read discrete inputs {group_start}-{group_end}")

        for index, value in enumerate(response.bits[:count]):
            bit_map[group_start + index] = 1 if value else 0

    return bit_map


def read_pid_monitor_payload() -> dict[str, Any]:
    client = ModbusTcpClient(
        host=MODBUS_CONFIG["host"],
        port=MODBUS_CONFIG["port"],
        timeout=MODBUS_CONFIG["timeout_seconds"],
    )

    if not client.connect():
        raise ConnectionError(
            f"Unable to connect to Modbus server {MODBUS_CONFIG['host']}:{MODBUS_CONFIG['port']}"
        )

    try:
        holding_registers = read_holding_register_map(client)
        discrete_inputs = read_discrete_input_map(client)
    finally:
        client.close()

    return {
        "holdingRegisters": holding_registers,
        "discreteInputs": discrete_inputs,
        "meta": {
            "host": MODBUS_CONFIG["host"],
            "port": MODBUS_CONFIG["port"],
            "unitId": MODBUS_CONFIG["unit_id"],
            "pollIntervalMs": MODBUS_CONFIG["poll_interval_ms"],
        },
    }


@app.get("/api/pid-monitor")
def get_pid_monitor() -> Any:
    try:
        return jsonify(read_pid_monitor_payload())
    except Exception as exc:  # pragma: no cover - runtime error surface
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001, debug=True)
