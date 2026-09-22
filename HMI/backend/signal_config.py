"""Shared Modbus definitions and page references, without changing page payloads."""
from __future__ import annotations

from typing import Any


SIGNAL_FIELDS = frozenset({"source_type", "address", "scale", "data_type", "register_count"})


def mapping_nodes(node: Any, path: str = "pages"):
    if isinstance(node, dict):
        if "source_type" in node and "address" in node:
            yield path, node
        else:
            for key, value in node.items():
                yield from mapping_nodes(value, f"{path}/{key}")
    elif isinstance(node, list):
        for index, value in enumerate(node):
            yield from mapping_nodes(value, f"{path}/{index}")


def reference_nodes(node: Any, path: str = "pages"):
    if isinstance(node, dict):
        if "signal" in node:
            yield path, node
        else:
            for key, value in node.items():
                yield from reference_nodes(value, f"{path}/{key}")
    elif isinstance(node, list):
        for index, value in enumerate(node):
            yield from reference_nodes(value, f"{path}/{index}")


def resolve_signals(node: Any, signals: dict[str, Any]) -> Any:
    """Expand references into copies; display metadata remains local to each page."""
    if isinstance(node, dict):
        if "signal" in node:
            signal_id = node["signal"]
            if not isinstance(signal_id, str) or signal_id not in signals:
                raise ValueError(f"Unknown signal reference: {signal_id!r}")
            overrides = SIGNAL_FIELDS.intersection(node)
            if overrides:
                raise ValueError(f"Signal {signal_id}: define {', '.join(sorted(overrides))} only in signals.")
            definition = signals[signal_id]
            if not isinstance(definition, dict) or not {"source_type", "address"} <= definition.keys():
                raise ValueError(f"Incomplete signal definition: {signal_id}")
            return {
                **{key: value for key, value in definition.items() if key in SIGNAL_FIELDS},
                **{key: value for key, value in node.items() if key != "signal"},
            }
        return {key: resolve_signals(value, signals) for key, value in node.items()}
    if isinstance(node, list):
        return [resolve_signals(value, signals) for value in node]
    return node


def editable_address_nodes(config: dict[str, Any]):
    """Expose one editable entry per shared signal, plus legacy inline mappings."""
    yield from mapping_nodes(config.get("signals", {}), "signals")
    yield from mapping_nodes(config.get("pages", {}))
