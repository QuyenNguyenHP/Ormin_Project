from __future__ import annotations

import argparse
import csv
import io
import json
import random
import socket
import struct
import threading
import time
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


HOLDING_REGISTER_START = 40000
DISCRETE_INPUT_START = 10000

# Embedded directly from "Modbus_simulation/modbus list.xlsx".
# Notes from the workbook:
# - The initial_value column below follows the Excel "Value" column for the Digital rows.
# - Analog values updated later in the workbook are applied through ANALOG_INITIAL_VALUE_OVERRIDES below.
# - Addresses below are stored using the simulator's visible addresses.
# - The digital section includes duplicate address 10000 rows from the original workbook.
REGISTER_TABLE_CSV = """source_type,address,description,initial_value,function_code
Digital,10000,DO transfer pump 1,1,1
Digital,10001,DO transfer pump 2,0,1
Digital,10002,HO transfer pump 1,1,1
Digital,10003,HO transfer pump 2,0,1
Digital,10004,Pump 5,1,1
Digital,10005,Pump 6,0,1
Digital,10006,Pump 7,1,1
Digital,10007,Pump 8,0,1
Digital,10008,Pump 9,1,1
Digital,10009,Pump 10,0,1
Digital,10010,Pump 11,1,1
Digital,10011,Pump 12,0,1
Digital,10012,LC_D.O.service.tank,1,1
Digital,10013,LC_H.O.settling.tank,0,1
Digital,10014,LH_D.O.service.tank,1,1
Digital,10015,LH_F.O. drain tank,0,1
Digital,10016,LH_H.O.settling.tank,1,1
Digital,10017,LL_D.O.service.tank,0,1
Digital,10018,LL_F.O. drain tank,1,1
Digital,10019,LL_H.O.service.tank,0,1
Digital,10020,LL_H.O.settling.tank,1,1
Digital,10021,LS_Sludge.tank,0,1
Digital,10022,TS_D.O.service.tank,1,1
Digital,10023,TS_F.O. drain tank,0,1
Digital,10024,TS_H.O.purifier.No1,1,1
Digital,10025,TS_H.O.purifier.No2,0,1
Digital,10026,TS_H.O.purifier.No3,1,1
Digital,10027,TS_H.O.settling.tank,0,1
Digital,10028,TS1_H.O.service.tank,1,1
Digital,10029,TS2_H.O.service.tank,0,1
Digital,10030,TSH_D.O.service.tank,1,1
Digital,10031,TSH_F.O. drain tank,0,1
Digital,10032,TSH_H.O.service.tank,1,1
Digital,10033,TSH_H.O.settling.tank,0,1
Digital,10034,Viscosity-Controller,1,1
Digital,10035,DO-line,0,1
Digital,10036,HO-line,1,1
Digital,10000,DO feed pump 1,0,1
Digital,10000,DO feed pump 2,1,1
Analog,40000,Flow 1,0,3
Analog,40001,Flow 2,0,3
Analog,40002,Flow 3,0,3
Analog,40003,Flow 4,0,3
Analog,40004,Flow 5,0,3
Analog,40005,Flow 6,0,3
Analog,40006,Flow 7,0,3
Analog,40007,Flow 8,0,3
Analog,40008,Flow 9,0,3
Analog,40009,Flow 10,0,3
Analog,40010,Flow 11,0,3
Analog,40011,Flow 12,0,3
Analog,40012,Flow 13,0,3
Analog,40013,Flow 14,0,3
Analog,40014,Flow 15,0,3
Analog,40015,Flow 16,0,3
Analog,40016,Flow 17,0,3
Analog,40017,Flow 18,0,3

Analog,40092,Intake Air Pressure DG#1,0,3
Analog,40093,Air Receiver Pressure DG#1,0,3
Analog,40094,Stator Winding Temp U DG#1,0,3
Analog,40095,Stator Winding Temp V DG#1,0,3
Analog,40096,Stator Winding Temp W DG#1,0,3
Analog,40097,DE Bearing Temp DG#1,0,3
Analog,40098,NDE Bearing Temp DG#1,0,3
Analog,40099,Engine Running Hours DG#1,0,3
Analog,40100,Engine Power DG#1,0,3
Analog,40101,Engine Speed DG#1,0,3
Analog,40102,T/C Outlet Temp DG#1,0,3
Analog,40103,Cyl 1 Exhaust Temp DG#1,0,3
Analog,40104,Cyl 2 Exhaust Temp DG#1,0,3
Analog,40105,Cyl 3 Exhaust Temp DG#1,0,3
Analog,40106,Cyl 4 Exhaust Temp DG#1,0,3
Analog,40107,Cyl 5 Exhaust Temp DG#1,0,3
Analog,40108,Cyl 6 Exhaust Temp DG#1,0,3
Analog,40109,T/C Inlet Temp DG#1,0,3
Analog,40110,Fuel Oil Pressure DG#1,0,3
Analog,40111,DO Engine Inlet Temp DG#1,0,3
Analog,40112,DO Engine Return Temp DG#1,0,3
Analog,40113,HO Engine Inlet Temp DG#1,0,3
Analog,40114,HO Engine Return Temp DG#1,0,3
Analog,40115,DO Transfer Flow DG#1,0,3
Analog,40116,D.O Inlet Flow DG#1,0,3
Analog,40117,D.O Outlet Flow DG#1,0,3
Analog,40118,HO Transfer Flow DG#1,0,3
Analog,40119,H.O Inlet Flow DG#1,0,3
Analog,40120,H.O Outlet Flow DG#1,0,3
Analog,40121,Engine LO Pressure DG#1,0,3
Analog,40122,Turbo LO Pressure DG#1,0,3
Analog,40123,LO Cooler Inlet Temp DG#1,0,3
Analog,40124,LO Cooler Outlet Temp DG#1,0,3
Analog,40125,Oil Mist Level DG#1,0,3
Analog,40126,OMD Analog Signal DG#1,0,3
Analog,40127,Generator Voltage DG#1,0,3
Analog,40128,Generator Frequency DG#1,0,3
Analog,40129,Generator Power Factor DG#1,0,3
Analog,40130,Generator Current DG#1,0,3
Analog,40131,Jacket Water Pressure DG#1,0,3
Analog,40132,Cooler Water Pressure DG#1,0,3
Analog,40133,Jacket Water Inlet Temp DG#1,0,3
Analog,40134,Jacket Water Outlet Temp DG#1,0,3
Analog,40135,Cooler Water Inlet Temp DG#1,0,3
Analog,40136,Cooler Water Outlet Temp DG#1,0,3
Analog,40137,CW Before LO Cooler Temp DG#1,0,3
Analog,40138,Intake Air Pressure DG#2,0,3
Analog,40139,Air Receiver Pressure DG#2,0,3
Analog,40140,Stator Winding Temp U DG#2,0,3
Analog,40141,Stator Winding Temp V DG#2,0,3
Analog,40142,Stator Winding Temp W DG#2,0,3
Analog,40143,DE Bearing Temp DG#2,0,3
Analog,40144,NDE Bearing Temp DG#2,0,3
Analog,40145,Engine Running Hours DG#2,0,3
Analog,40146,Engine Power DG#2,0,3
Analog,40147,Engine Speed DG#2,0,3
Analog,40148,T/C Outlet Temp DG#2,0,3
Analog,40149,Cyl 1 Exhaust Temp DG#2,0,3
Analog,40150,Cyl 2 Exhaust Temp DG#2,0,3
Analog,40151,Cyl 3 Exhaust Temp DG#2,0,3
Analog,40152,Cyl 4 Exhaust Temp DG#2,0,3
Analog,40153,Cyl 5 Exhaust Temp DG#2,0,3
Analog,40154,Cyl 6 Exhaust Temp DG#2,0,3
Analog,40155,T/C Inlet Temp DG#2,0,3
Analog,40156,Fuel Oil Pressure DG#2,0,3
Analog,40157,DO Engine Inlet Temp DG#2,0,3
Analog,40158,DO Engine Return Temp DG#2,0,3
Analog,40159,HO Engine Inlet Temp DG#2,0,3
Analog,40160,HO Engine Return Temp DG#2,0,3
Analog,40161,DO Transfer Flow DG#2,0,3
Analog,40162,DO Engine Inlet Flow DG#2,0,3
Analog,40163,DO Engine Return Flow DG#2,0,3
Analog,40164,HO Transfer Flow DG#2,0,3
Analog,40165,HO Engine Inlet Flow DG#2,0,3
Analog,40166,HO Engine Return Flow DG#2,0,3
Analog,40167,Engine LO Pressure DG#2,0,3
Analog,40168,Turbo LO Pressure DG#2,0,3
Analog,40169,LO Cooler Inlet Temp DG#2,0,3
Analog,40170,LO Cooler Outlet Temp DG#2,0,3
Analog,40171,Oil Mist Level DG#2,0,3
Analog,40172,OMD Analog Signal DG#2,0,3
Analog,40173,Generator Voltage DG#2,0,3
Analog,40174,Generator Frequency DG#2,0,3
Analog,40175,Generator Power Factor DG#2,0,3
Analog,40176,Generator Current DG#2,0,3
Analog,40177,Jacket Water Pressure DG#2,0,3
Analog,40178,Cooler Water Pressure DG#2,0,3
Analog,40179,Jacket Water Inlet Temp DG#2,0,3
Analog,40180,Jacket Water Outlet Temp DG#2,0,3
Analog,40181,Cooler Water Inlet Temp DG#2,0,3
Analog,40182,Cooler Water Outlet Temp DG#2,0,3
Analog,40183,CW Before LO Cooler Temp DG#2,0,3
Analog,40184,Intake Air Pressure DG#3,0,3
Analog,40185,Air Receiver Pressure DG#3,0,3
Analog,40186,Stator Winding Temp U DG#3,0,3
Analog,40187,Stator Winding Temp V DG#3,0,3
Analog,40188,Stator Winding Temp W DG#3,0,3
Analog,40189,DE Bearing Temp DG#3,0,3
Analog,40190,NDE Bearing Temp DG#3,0,3
Analog,40191,Engine Running Hours DG#3,0,3
Analog,40192,Engine Power DG#3,0,3
Analog,40193,Engine Speed DG#3,0,3
Analog,40194,T/C Outlet Temp DG#3,0,3
Analog,40195,Cyl 1 Exhaust Temp DG#3,0,3
Analog,40196,Cyl 2 Exhaust Temp DG#3,0,3
Analog,40197,Cyl 3 Exhaust Temp DG#3,0,3
Analog,40198,Cyl 4 Exhaust Temp DG#3,0,3
Analog,40199,Cyl 5 Exhaust Temp DG#3,0,3
Analog,40200,Cyl 6 Exhaust Temp DG#3,0,3
Analog,40201,T/C Inlet Temp DG#3,0,3
Analog,40202,Fuel Oil Pressure DG#3,0,3
Analog,40203,DO Engine Inlet Temp DG#3,0,3
Analog,40204,DO Engine Return Temp DG#3,0,3
Analog,40205,HO Engine Inlet Temp DG#3,0,3
Analog,40206,HO Engine Return Temp DG#3,0,3
Analog,40207,DO Transfer Flow DG#3,0,3
Analog,40208,DO Engine Inlet Flow DG#3,0,3
Analog,40209,DO Engine Return Flow DG#3,0,3
Analog,40210,HO Transfer Flow DG#3,0,3
Analog,40211,HO Engine Inlet Flow DG#3,0,3
Analog,40212,HO Engine Return Flow DG#3,0,3
Analog,40213,Engine LO Pressure DG#3,0,3
Analog,40214,Turbo LO Pressure DG#3,0,3
Analog,40215,LO Cooler Inlet Temp DG#3,0,3
Analog,40216,LO Cooler Outlet Temp DG#3,0,3
Analog,40217,Oil Mist Level DG#3,0,3
Analog,40218,OMD Analog Signal DG#3,0,3
Analog,40219,Generator Voltage DG#3,0,3
Analog,40220,Generator Frequency DG#3,0,3
Analog,40221,Generator Power Factor DG#3,0,3
Analog,40222,Generator Current DG#3,0,3
Analog,40223,Jacket Water Pressure DG#3,0,3
Analog,40224,Cooler Water Pressure DG#3,0,3
Analog,40225,Jacket Water Inlet Temp DG#3,0,3
Analog,40226,Jacket Water Outlet Temp DG#3,0,3
Analog,40227,Cooler Water Inlet Temp DG#3,0,3
Analog,40228,Cooler Water Outlet Temp DG#3,0,3
Analog,40229,CW Before LO Cooler Temp DG#3,0,3
Analog,40230,Intake Air Pressure DG#4,0,3
Analog,40231,Air Receiver Pressure DG#4,0,3
Analog,40232,Stator Winding Temp U DG#4,0,3
Analog,40233,Stator Winding Temp V DG#4,0,3
Analog,40234,Stator Winding Temp W DG#4,0,3
Analog,40235,DE Bearing Temp DG#4,0,3
Analog,40236,NDE Bearing Temp DG#4,0,3
Analog,40237,Engine Running Hours DG#4,0,3
Analog,40238,Engine Power DG#4,0,3
Analog,40239,Engine Speed DG#4,0,3
Analog,40240,T/C Outlet Temp DG#4,0,3
Analog,40241,Cyl 1 Exhaust Temp DG#4,0,3
Analog,40242,Cyl 2 Exhaust Temp DG#4,0,3
Analog,40243,Cyl 3 Exhaust Temp DG#4,0,3
Analog,40244,Cyl 4 Exhaust Temp DG#4,0,3
Analog,40245,Cyl 5 Exhaust Temp DG#4,0,3
Analog,40246,Cyl 6 Exhaust Temp DG#4,0,3
Analog,40247,T/C Inlet Temp DG#4,0,3
Analog,40248,Fuel Oil Pressure DG#4,0,3
Analog,40249,DO Engine Inlet Temp DG#4,0,3
Analog,40250,DO Engine Return Temp DG#4,0,3
Analog,40251,HO Engine Inlet Temp DG#4,0,3
Analog,40252,HO Engine Return Temp DG#4,0,3
Analog,40253,DO Transfer Flow DG#4,0,3
Analog,40254,DO Engine Inlet Flow DG#4,0,3
Analog,40255,DO Engine Return Flow DG#4,0,3
Analog,40256,HO Transfer Flow DG#4,0,3
Analog,40257,HO Engine Inlet Flow DG#4,0,3
Analog,40258,HO Engine Return Flow DG#4,0,3
Analog,40259,Engine LO Pressure DG#4,0,3
Analog,40260,Turbo LO Pressure DG#4,0,3
Analog,40261,LO Cooler Inlet Temp DG#4,0,3
Analog,40262,LO Cooler Outlet Temp DG#4,0,3
Analog,40263,Oil Mist Level DG#4,0,3
Analog,40264,OMD Analog Signal DG#4,0,3
Analog,40265,Generator Voltage DG#4,0,3
Analog,40266,Generator Frequency DG#4,0,3
Analog,40267,Generator Power Factor DG#4,0,3
Analog,40268,Generator Current DG#4,0,3
Analog,40269,Jacket Water Pressure DG#4,0,3
Analog,40270,Cooler Water Pressure DG#4,0,3
Analog,40271,Jacket Water Inlet Temp DG#4,0,3
Analog,40272,Jacket Water Outlet Temp DG#4,0,3
Analog,40273,Cooler Water Inlet Temp DG#4,0,3
Analog,40274,Cooler Water Outlet Temp DG#4,0,3
Analog,40275,CW Before LO Cooler Temp DG#4,0,3"""


# Non-zero Analog values re-read from the updated Excel workbook.
# Keys below use the simulator's visible addresses.
ANALOG_INITIAL_VALUE_OVERRIDES = {
    40000: 15,  # Flow 1
    40001: 33,  # Flow 2
    40002: 2,  # Flow 3
    40003: 12,  # Flow 4
    40004: 200,  # Flow 5
    40005: 90,  # Flow 6
    40006: 10000,  # Flow 7
    40007: 500,  # Flow 8
    40011: 1500,  # Flow 12
    40012: 12,  # Flow 13
    40092: 1,  # Intake Air Pressure DG#1
    40093: 2,  # Air Receiver Pressure DG#1
    40094: 300,  # Stator Winding Temp U DG#1
    40095: 600,  # Stator Winding Temp V DG#1
    40096: 1,  # Stator Winding Temp W DG#1
    40097: 2,  # DE Bearing Temp DG#1
    40098: 3,  # NDE Bearing Temp DG#1
    40099: 490,  # Engine Running Hours DG#1
    40100: 500,  # Engine Power DG#1
    40103: 400,  # Cyl 1 Exhaust Temp DG#1
    40105: 44,  # Cyl 3 Exhaust Temp DG#1
    40106: 600,  # Cyl 4 Exhaust Temp DG#1
    40109: 600,  # T/C Inlet Temp DG#1
    40121: 23232,  # Engine LO Pressure DG#1
    40122: 1111,  # Turbo LO Pressure DG#1
    40136: 1111,  # Cooler Water Outlet Temp DG#1
    40137: 3000,  # CW Before LO Cooler Temp DG#1
    40138: 1,  # Intake Air Pressure DG#2
    40139: 5000,  # Air Receiver Pressure DG#2
    40140: 222,  # Stator Winding Temp U DG#2
    40145: 333,  # Engine Running Hours DG#2
    40146: 333,  # Engine Power DG#2
    40147: 750,  # Engine Speed DG#2
    40155: 2222,  # T/C Inlet Temp DG#2
    40156: 555,  # Fuel Oil Pressure DG#2
    40157: 500,  # DO Engine Inlet Temp DG#2
    40158: 99,  # DO Engine Return Temp DG#2
    40159: 1111,  # HO Engine Inlet Temp DG#2
    40178: 1000,  # Cooler Water Pressure DG#2
    40179: 999,  # Jacket Water Inlet Temp DG#2
    40183: 987,  # CW Before LO Cooler Temp DG#2
    40184: 5679,  # Intake Air Pressure DG#3
    40185: 123,  # Air Receiver Pressure DG#3
    40191: 11111,  # Engine Running Hours DG#3
    40192: 500,  # Engine Power DG#3
    40194: 1000,  # T/C Outlet Temp DG#3
    40229: 1111,  # CW Before LO Cooler Temp DG#3
    40230: 12345,  # Intake Air Pressure DG#4
    40231: 2,  # Air Receiver Pressure DG#4
    40232: 3,  # Stator Winding Temp U DG#4
    40233: 1,  # Stator Winding Temp V DG#4
    40234: 2,  # Stator Winding Temp W DG#4
    40235: 5,  # DE Bearing Temp DG#4
    40236: 6,  # NDE Bearing Temp DG#4
    40237: 1000,  # Engine Running Hours DG#4
    40238: 600,  # Engine Power DG#4
    40239: 3,  # Engine Speed DG#4
    40275: 9987,  # CW Before LO Cooler Temp DG#4
}


@dataclass
class RegisterDefinition:
    address: int
    source_type: str
    name: str
    initial_value: int
    function_code: int


def parse_int(value: Any, default: int = 0) -> int:
    if value in (None, ""):
        return default
    return int(str(value).strip())


def parse_source_type(value: str) -> str:
    lowered = value.strip().lower()
    if lowered == "digital":
        return "discrete_input"
    if lowered == "analog":
        return "holding_register"
    raise ValueError(f"Unsupported source type: {value}")


def load_embedded_registers() -> tuple[list[RegisterDefinition], list[dict[str, Any]]]:
    definitions: list[RegisterDefinition] = []
    duplicates: list[dict[str, Any]] = []
    seen: dict[tuple[str, int], RegisterDefinition] = {}

    reader = csv.DictReader(io.StringIO(REGISTER_TABLE_CSV.strip()))
    for row in reader:
        source_type = parse_source_type(row["source_type"])
        address = parse_int(row["address"])
        initial_value = parse_int(row["initial_value"], default=0)
        if source_type == "holding_register" and address in ANALOG_INITIAL_VALUE_OVERRIDES:
            initial_value = ANALOG_INITIAL_VALUE_OVERRIDES[address]

        definition = RegisterDefinition(
            address=address,
            source_type=source_type,
            name=(row["description"] or "").strip(),
            initial_value=initial_value,
            function_code=parse_int(row["function_code"]),
        )
        key = (definition.source_type, definition.address)
        if key in seen:
            duplicates.append(
                {
                    "source_type": definition.source_type,
                    "address": definition.address,
                    "previous_name": seen[key].name,
                    "new_name": definition.name,
                }
            )
        seen[key] = definition

    definitions = list(seen.values())
    return definitions, duplicates


class RegisterStore:
    def __init__(self, definitions: list[RegisterDefinition]) -> None:
        self.lock = threading.RLock()
        self.holding_registers: dict[int, int] = {}
        self.discrete_inputs: dict[int, int] = {}
        self.metadata: dict[tuple[str, int], RegisterDefinition] = {}

        for definition in definitions:
            self.metadata[(definition.source_type, definition.address)] = definition
            if definition.source_type == "holding_register":
                self.holding_registers[definition.address] = max(0, min(65535, definition.initial_value))
            else:
                self.discrete_inputs[definition.address] = 1 if definition.initial_value else 0

    def summary(self) -> dict[str, Any]:
        with self.lock:
            return {
                "holding_register_count": len(self.holding_registers),
                "discrete_input_count": len(self.discrete_inputs),
                "holding_range": [
                    min(self.holding_registers) if self.holding_registers else None,
                    max(self.holding_registers) if self.holding_registers else None,
                ],
                "discrete_range": [
                    min(self.discrete_inputs) if self.discrete_inputs else None,
                    max(self.discrete_inputs) if self.discrete_inputs else None,
                ],
            }

    def get_holding_values(self, start_offset: int, count: int) -> list[int]:
        with self.lock:
            return [
                self.holding_registers.get(HOLDING_REGISTER_START + start_offset + index, 0)
                for index in range(count)
            ]

    def get_discrete_values(self, start_offset: int, count: int) -> list[int]:
        with self.lock:
            return [
                self.discrete_inputs.get(DISCRETE_INPUT_START + start_offset + index, 0)
                for index in range(count)
            ]

    def set_holding(self, address: int, value: int) -> None:
        if not (0 <= value <= 65535):
            raise ValueError("Holding register value must be between 0 and 65535.")
        with self.lock:
            self.holding_registers[address] = value

    def set_discrete(self, address: int, value: bool | int) -> None:
        with self.lock:
            self.discrete_inputs[address] = 1 if bool(value) else 0

    def set_many_holdings(self, start_address: int, values: list[int]) -> None:
        with self.lock:
            for index, value in enumerate(values):
                self.holding_registers[start_address + index] = value

    def list_points(self, source_type: str | None = None) -> list[dict[str, Any]]:
        with self.lock:
            results: list[dict[str, Any]] = []
            for (item_source_type, address), metadata in sorted(self.metadata.items(), key=lambda item: item[0][1]):
                if source_type and item_source_type != source_type:
                    continue
                value = (
                    self.holding_registers.get(address, 0)
                    if item_source_type == "holding_register"
                    else self.discrete_inputs.get(address, 0)
                )
                results.append(
                    {
                        "source_type": item_source_type,
                        "address": address,
                        "description": metadata.name,
                        "initial_value": metadata.initial_value,
                        "value": value,
                        "function_code": metadata.function_code,
                    }
                )
            return results

    def apply_random_walk(self) -> None:
        with self.lock:
            for address, value in list(self.holding_registers.items()):
                metadata = self.metadata.get(("holding_register", address))
                label = (metadata.name if metadata else "").lower()
                step = 5 if any(token in label for token in ("flow", "power", "speed")) else 1
                if "temp" in label or "temperature" in label:
                    step = 2
                self.holding_registers[address] = max(0, min(65535, value + random.randint(-step, step)))


def pack_bits(values: list[int]) -> bytes:
    payload = bytearray()
    for chunk_start in range(0, len(values), 8):
        byte_value = 0
        for bit_index, bit in enumerate(values[chunk_start : chunk_start + 8]):
            if bit:
                byte_value |= 1 << bit_index
        payload.append(byte_value)
    return bytes(payload)


class ModbusTcpSimulator:
    def __init__(self, store: RegisterStore, host: str, port: int, unit_id: int) -> None:
        self.store = store
        self.host = host
        self.port = port
        self.unit_id = unit_id
        self._stop_event = threading.Event()
        self._server_socket: socket.socket | None = None

    def start(self) -> threading.Thread:
        thread = threading.Thread(target=self.serve_forever, name="modbus-tcp-server", daemon=True)
        thread.start()
        return thread

    def stop(self) -> None:
        self._stop_event.set()
        if self._server_socket:
            try:
                self._server_socket.close()
            except OSError:
                pass

    def serve_forever(self) -> None:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
            server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server_socket.bind((self.host, self.port))
            server_socket.listen()
            server_socket.settimeout(1.0)
            self._server_socket = server_socket
            print(f"[modbus] Listening on {self.host}:{self.port} (unit_id={self.unit_id})")

            while not self._stop_event.is_set():
                try:
                    client_socket, client_address = server_socket.accept()
                except socket.timeout:
                    continue
                except OSError:
                    break

                worker = threading.Thread(
                    target=self.handle_client,
                    args=(client_socket,),
                    name=f"modbus-client-{client_address[0]}:{client_address[1]}",
                    daemon=True,
                )
                worker.start()

    def handle_client(self, client_socket: socket.socket) -> None:
        with client_socket:
            client_socket.settimeout(5.0)
            while not self._stop_event.is_set():
                try:
                    header = self._recv_exact(client_socket, 7)
                except (socket.timeout, ConnectionError, OSError):
                    return

                transaction_id, protocol_id, length, unit_id = struct.unpack(">HHHB", header)
                if protocol_id != 0 or length < 2:
                    return

                try:
                    pdu = self._recv_exact(client_socket, length - 1)
                except (socket.timeout, ConnectionError, OSError):
                    return

                response_pdu = self.handle_pdu(unit_id, pdu)
                response = struct.pack(">HHHB", transaction_id, 0, len(response_pdu) + 1, unit_id) + response_pdu
                try:
                    client_socket.sendall(response)
                except OSError:
                    return

    def _recv_exact(self, client_socket: socket.socket, length: int) -> bytes:
        data = bytearray()
        while len(data) < length:
            chunk = client_socket.recv(length - len(data))
            if not chunk:
                raise ConnectionError("Client disconnected.")
            data.extend(chunk)
        return bytes(data)

    def handle_pdu(self, unit_id: int, pdu: bytes) -> bytes:
        if not pdu:
            return b""

        function_code = pdu[0]
        if unit_id not in {0, self.unit_id}:
            return bytes([function_code | 0x80, 0x0B])

        try:
            if function_code == 2:
                start_offset, count = struct.unpack(">HH", pdu[1:5])
                values = self.store.get_discrete_values(start_offset, count)
                packed = pack_bits(values)
                return bytes([function_code, len(packed)]) + packed

            if function_code == 3:
                start_offset, count = struct.unpack(">HH", pdu[1:5])
                values = self.store.get_holding_values(start_offset, count)
                payload = b"".join(struct.pack(">H", value) for value in values)
                return bytes([function_code, len(payload)]) + payload

            if function_code == 6:
                start_offset, value = struct.unpack(">HH", pdu[1:5])
                self.store.set_holding(HOLDING_REGISTER_START + start_offset, value)
                return pdu[:5]

            if function_code == 16:
                start_offset, count, _byte_count = struct.unpack(">HHB", pdu[1:6])
                values = list(struct.unpack(f">{count}H", pdu[6 : 6 + (count * 2)]))
                self.store.set_many_holdings(HOLDING_REGISTER_START + start_offset, values)
                return bytes([function_code]) + struct.pack(">HH", start_offset, count)

            return bytes([function_code | 0x80, 0x01])
        except Exception:
            return bytes([function_code | 0x80, 0x04])


class ControlRequestHandler(BaseHTTPRequestHandler):
    server: "ControlHttpServer"

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._send_json(
                {
                    "status": "ok",
                    "summary": self.server.store.summary(),
                    "modbus": {
                        "host": self.server.modbus_host,
                        "port": self.server.modbus_port,
                        "unit_id": self.server.unit_id,
                    },
                }
            )
            return

        if self.path.startswith("/points"):
            source_type = None
            if "source_type=holding_register" in self.path:
                source_type = "holding_register"
            elif "source_type=discrete_input" in self.path:
                source_type = "discrete_input"
            self._send_json({"points": self.server.store.list_points(source_type)})
            return

        self._send_json({"error": "Not found"}, status=HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:  # noqa: N802
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length) if content_length else b"{}"
        payload = json.loads(raw_body.decode("utf-8"))

        if self.path == "/set":
            source_type = str(payload.get("source_type") or "").strip()
            address = parse_int(payload.get("address"))
            value = payload.get("value")
            if source_type not in {"holding_register", "discrete_input"}:
                self._send_json({"error": "Invalid source_type."}, status=HTTPStatus.BAD_REQUEST)
                return

            if source_type == "holding_register":
                self.server.store.set_holding(address, parse_int(value))
            else:
                self.server.store.set_discrete(address, bool(parse_int(value)))

            self._send_json({"ok": True, "source_type": source_type, "address": address, "value": value})
            return

        if self.path == "/randomize":
            self.server.store.apply_random_walk()
            self._send_json({"ok": True})
            return

        self._send_json({"error": "Not found"}, status=HTTPStatus.NOT_FOUND)

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _send_json(self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status.value)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class ControlHttpServer(ThreadingHTTPServer):
    def __init__(
        self,
        server_address: tuple[str, int],
        request_handler_class: type[BaseHTTPRequestHandler],
        store: RegisterStore,
        modbus_host: str,
        modbus_port: int,
        unit_id: int,
    ) -> None:
        super().__init__(server_address, request_handler_class)
        self.store = store
        self.modbus_host = modbus_host
        self.modbus_port = modbus_port
        self.unit_id = unit_id


def start_control_server(
    store: RegisterStore, host: str, port: int, modbus_host: str, modbus_port: int, unit_id: int
) -> ControlHttpServer:
    server = ControlHttpServer((host, port), ControlRequestHandler, store, modbus_host, modbus_port, unit_id)
    thread = threading.Thread(target=server.serve_forever, name="modbus-control-http", daemon=True)
    thread.start()
    print(f"[control] HTTP control on http://{host}:{port}")
    return server


def start_randomizer(store: RegisterStore, interval_seconds: float) -> threading.Thread:
    def worker() -> None:
        while True:
            time.sleep(interval_seconds)
            store.apply_random_walk()

    thread = threading.Thread(target=worker, name="modbus-randomizer", daemon=True)
    thread.start()
    print(f"[randomizer] Enabled every {interval_seconds:.1f}s")
    return thread


def start_console(store: RegisterStore) -> threading.Thread:
    def worker() -> None:
        print("[console] Commands: set hr <address> <value> | set di <address> <0|1> | show hr|di | randomize")
        while True:
            try:
                command = input().strip()
            except EOFError:
                return
            if not command:
                continue

            parts = command.split()
            try:
                if parts[:2] == ["show", "hr"]:
                    for point in store.list_points("holding_register")[:50]:
                        print(point)
                elif parts[:2] == ["show", "di"]:
                    for point in store.list_points("discrete_input")[:50]:
                        print(point)
                elif len(parts) == 4 and parts[0] == "set" and parts[1] == "hr":
                    store.set_holding(int(parts[2]), int(parts[3]))
                    print(f"Updated holding register {parts[2]} -> {parts[3]}")
                elif len(parts) == 4 and parts[0] == "set" and parts[1] == "di":
                    store.set_discrete(int(parts[2]), parts[3] in {"1", "true", "on"})
                    print(f"Updated discrete input {parts[2]} -> {parts[3]}")
                elif parts == ["randomize"]:
                    store.apply_random_walk()
                    print("Randomized current values.")
                else:
                    print("Unknown command.")
            except Exception as exc:
                print(f"Command failed: {exc}")

    thread = threading.Thread(target=worker, name="modbus-console", daemon=True)
    thread.start()
    return thread


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run a self-contained Modbus TCP simulator with the register list embedded from modbus list.xlsx."
    )
    parser.add_argument("--host", default="0.0.0.0", help="Bind address for the Modbus TCP server.")
    parser.add_argument("--port", type=int, default=502, help="Port for the Modbus TCP server.")
    parser.add_argument("--unit-id", type=int, default=16, help="Modbus unit id expected by the backend.")
    parser.add_argument("--control-host", default="127.0.0.1", help="Bind address for the HTTP control API.")
    parser.add_argument("--control-port", type=int, default=8052, help="Port for the HTTP control API.")
    parser.add_argument(
        "--auto-randomize-seconds",
        type=float,
        default=0,
        help="If greater than 0, apply a small random walk to holding registers on this interval.",
    )
    parser.add_argument("--no-console", action="store_true", help="Disable the interactive console command reader.")
    return parser


def main() -> None:
    parser = build_argument_parser()
    args = parser.parse_args()

    definitions, duplicates = load_embedded_registers()
    store = RegisterStore(definitions)

    print("[startup] Embedded register table loaded from script.")
    print(json.dumps(store.summary(), indent=2))
    if duplicates:
        print("[startup] Duplicate addresses detected in the original workbook:")
        print(json.dumps(duplicates, indent=2))

    modbus_server = ModbusTcpSimulator(store, args.host, args.port, args.unit_id)
    modbus_server.start()
    control_server = start_control_server(
        store,
        args.control_host,
        args.control_port,
        args.host,
        args.port,
        args.unit_id,
    )

    if args.auto_randomize_seconds > 0:
        start_randomizer(store, args.auto_randomize_seconds)

    if not args.no_console:
        start_console(store)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[shutdown] Stopping servers...")
        modbus_server.stop()
        control_server.shutdown()
        control_server.server_close()


if __name__ == "__main__":
    main()



