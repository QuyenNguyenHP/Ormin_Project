from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from flask import Blueprint, jsonify
from pymodbus.client import ModbusTcpClient

HOLDING_REGISTER_START = 40001
DISCRETE_INPUT_START = 10001
BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "backend_config.json"

modbus_api = Blueprint("modbus_api", __name__)


def load_config() -> dict[str, Any]:
    """Load the backend configuration once at startup."""
    with CONFIG_PATH.open("r", encoding="utf-8") as config_file:
        return json.load(config_file)


CONFIG = load_config()
MODBUS_CONFIG = CONFIG["modbus"]
PAGE_CONFIGS = CONFIG["pages"]


def build_meta() -> dict[str, Any]:
    """Return shared metadata included in every API response."""
    return {
        "host": MODBUS_CONFIG["host"],
        "port": MODBUS_CONFIG["port"],
        "unitId": MODBUS_CONFIG["unit_id"],
        "pollIntervalMs": MODBUS_CONFIG["poll_interval_ms"],
    }


def modbus_address_to_offset(address: int, family_start: int) -> int:
    """Convert a human-readable Modbus address into the zero-based pymodbus offset."""
    return address - family_start


def group_contiguous_addresses(addresses: list[int]) -> list[tuple[int, int]]:
    """
    Group adjacent addresses so the backend can read them in larger batches.

    Example:
    [40001, 40002, 40003, 40010] -> [(40001, 40003), (40010, 40010)]
    """
    unique_addresses = sorted(set(addresses))
    if not unique_addresses:
        return []

    groups: list[tuple[int, int]] = []
    group_start = unique_addresses[0]
    group_end = unique_addresses[0]

    for address in unique_addresses[1:]:
        if address == group_end + 1:
            group_end = address
            continue

        groups.append((group_start, group_end))
        group_start = address
        group_end = address

    groups.append((group_start, group_end))
    return groups


def is_mapping_node(node: Any) -> bool:
    """Return True when a config node describes one Modbus-backed value."""
    return isinstance(node, dict) and "source_type" in node and "address" in node


def flatten_mapping_nodes(config_node: Any) -> list[dict[str, Any]]:
    """Recursively collect every Modbus mapping node from a config tree."""
    if is_mapping_node(config_node):
        return [config_node]

    if isinstance(config_node, list):
        mappings: list[dict[str, Any]] = []
        for item in config_node:
            mappings.extend(flatten_mapping_nodes(item))
        return mappings

    if isinstance(config_node, dict):
        mappings: list[dict[str, Any]] = []
        for value in config_node.values():
            mappings.extend(flatten_mapping_nodes(value))
        return mappings

    return []


def flatten_page_mappings(page_config: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten all Modbus mapping nodes from one page config into one list."""
    return flatten_mapping_nodes(page_config)


def filter_mappings_by_source_type(
    mappings: list[dict[str, Any]], source_type: str
) -> list[dict[str, Any]]:
    """Return only mappings that belong to one Modbus source family."""
    return [mapping for mapping in mappings if mapping["source_type"] == source_type]


def open_modbus_client() -> ModbusTcpClient:
    """Create and connect a Modbus client using the configured connection settings."""
    client = ModbusTcpClient(
        host=MODBUS_CONFIG["host"],
        port=MODBUS_CONFIG["port"],
        timeout=MODBUS_CONFIG["timeout_seconds"],
    )

    if not client.connect():
        raise ConnectionError(
            f"Unable to connect to Modbus server {MODBUS_CONFIG['host']}:{MODBUS_CONFIG['port']}"
        )

    return client


def read_holding_register_map(
    client: ModbusTcpClient, mappings: list[dict[str, Any]]
) -> dict[int, int]:
    """Read all holding registers needed by the current payload."""
    register_map: dict[int, int] = {}
    addresses = [int(mapping["address"]) for mapping in mappings]

    for group_start, group_end in group_contiguous_addresses(addresses):
        count = group_end - group_start + 1
        response = client.read_holding_registers(
            address=modbus_address_to_offset(group_start, HOLDING_REGISTER_START),
            count=count,
            slave=MODBUS_CONFIG["unit_id"],
        )
        if response.isError():
            raise RuntimeError(f"Failed to read holding registers {group_start}-{group_end}")

        for index, value in enumerate(response.registers):
            register_map[group_start + index] = value

    return register_map


def read_discrete_input_map(
    client: ModbusTcpClient, mappings: list[dict[str, Any]]
) -> dict[int, int]:
    """Read all discrete inputs needed by the current payload."""
    bit_map: dict[int, int] = {}
    addresses = [int(mapping["address"]) for mapping in mappings]

    for group_start, group_end in group_contiguous_addresses(addresses):
        count = group_end - group_start + 1
        response = client.read_discrete_inputs(
            address=modbus_address_to_offset(group_start, DISCRETE_INPUT_START),
            count=count,
            slave=MODBUS_CONFIG["unit_id"],
        )
        if response.isError():
            raise RuntimeError(f"Failed to read discrete inputs {group_start}-{group_end}")

        for index, value in enumerate(response.bits[:count]):
            bit_map[group_start + index] = 1 if value else 0

    return bit_map


def read_modbus_maps(mappings: list[dict[str, Any]]) -> tuple[dict[int, int], dict[int, int]]:
    """
    Read all Modbus data required by a set of mappings.

    The result is split into:
    - holding register values
    - discrete input values
    """
    holding_mappings = filter_mappings_by_source_type(mappings, "holding_register")
    discrete_mappings = filter_mappings_by_source_type(mappings, "discrete_input")

    client = open_modbus_client()
    try:
        holding_registers = read_holding_register_map(client, holding_mappings)
        discrete_inputs = read_discrete_input_map(client, discrete_mappings)
    finally:
        client.close()

    return holding_registers, discrete_inputs


def transform_mapping_value(
    mapping: dict[str, Any],
    holding_registers: dict[int, int],
    discrete_inputs: dict[int, int],
) -> Any:
    """Convert one raw Modbus value into the UI-friendly value declared in config."""
    address = int(mapping["address"])
    source_type = mapping["source_type"]

    if source_type == "holding_register":
        raw_value = holding_registers[address]
        scale = mapping.get("scale", 1)
        value = raw_value * scale
        if "precision" in mapping:
            value = round(value, int(mapping["precision"]))
        return int(value) if isinstance(value, float) and value.is_integer() else value

    if source_type == "discrete_input":
        return bool(discrete_inputs[address])

    raise ValueError(f"Unsupported source_type: {source_type}")


def build_config_payload(
    config_node: Any,
    holding_registers: dict[int, int],
    discrete_inputs: dict[int, int],
) -> Any:
    """Recursively build a payload tree from a config tree."""
    if is_mapping_node(config_node):
        payload_item = {
            key: value
            for key, value in config_node.items()
            if key not in {"address", "source_type", "scale"}
        }
        payload_item["value"] = transform_mapping_value(
            config_node, holding_registers, discrete_inputs
        )
        return payload_item

    if isinstance(config_node, list):
        return [
            build_config_payload(item, holding_registers, discrete_inputs)
            for item in config_node
        ]

    if isinstance(config_node, dict):
        return {
            key: build_config_payload(value, holding_registers, discrete_inputs)
            for key, value in config_node.items()
        }

    return config_node


def get_page_config(page_name: str) -> dict[str, Any]:
    """Fetch one page config and raise a readable error if it does not exist."""
    page_config = PAGE_CONFIGS.get(page_name)
    if page_config is None:
        raise KeyError(f"Unknown page configuration: {page_name}")
    return page_config


def build_page_payload(page_name: str) -> dict[str, Any]:
    """
    Build the frontend payload for one page.

    This is the main API path used by page-based frontend screens such as:
    - /api/overview
    - /api/engine
    """
    page_config = get_page_config(page_name)
    page_mappings = flatten_page_mappings(page_config)
    holding_registers, discrete_inputs = read_modbus_maps(page_mappings)

    sections = build_config_payload(page_config, holding_registers, discrete_inputs)

    return {
        "page": page_name,
        "sections": sections,
        "meta": build_meta(),
    }


def collect_all_page_mappings() -> list[dict[str, Any]]:
    """Flatten mappings from every configured page for debug inspection."""
    all_mappings: list[dict[str, Any]] = []
    for page_config in PAGE_CONFIGS.values():
        all_mappings.extend(flatten_page_mappings(page_config))
    return all_mappings


def build_debug_modbus_snapshot() -> dict[str, Any]:
    """
    Build a raw Modbus snapshot for debugging.

    This endpoint is useful when you want to verify:
    - which raw addresses are being read
    - whether the PLC/Modbus server is responding
    - whether page-level mapping errors come from raw data or mapping logic
    """
    all_mappings = collect_all_page_mappings()
    holding_registers, discrete_inputs = read_modbus_maps(all_mappings)

    return {
        "holdingRegisters": holding_registers,
        "discreteInputs": discrete_inputs,
        "meta": build_meta(),
    }


@modbus_api.get("/api/debug/modbus-snapshot")
def get_debug_modbus_snapshot_route() -> Any:
    """Serve a raw Modbus snapshot for debugging and integration checks."""
    try:
        return jsonify(build_debug_modbus_snapshot())
    except Exception as exc:  # pragma: no cover - runtime error surface
        return jsonify({"error": str(exc)}), 500


@modbus_api.get("/api/<page_name>")
def get_page_payload_route(page_name: str) -> Any:
    """Serve one frontend page payload using the page name as the API key."""
    try:
        return jsonify(build_page_payload(page_name))
    except KeyError as exc:
        return jsonify({"error": str(exc)}), 404
    except Exception as exc:  # pragma: no cover - runtime error surface
        return jsonify({"error": str(exc)}), 500
