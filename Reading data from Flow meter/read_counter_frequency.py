#!/usr/bin/env python3
"""
Read counter from Modbus TCP Function 3 registers E/F.

Counter = F * 65536 + E
Frequency = delta counter / 10 seconds

Example:
    python read_counter_frequency.py 192.168.1.100 502
"""

from __future__ import annotations

import argparse
import socket
import struct
import time
from collections import deque


FUNC_READ_HOLDING = 3
REGISTER_E = 0x000E
REGISTER_COUNT = 2
COUNTER_MAX = 2**32
SAMPLE_SECONDS = 5
PRINT_SECONDS = 2


def read_exact(sock: socket.socket, size: int) -> bytes:
    data = b""
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk:
            raise ConnectionError("Connection closed")
        data += chunk
    return data


class ModbusClient:
    def __init__(self, ip: str, port: int, unit_id: int, timeout: float) -> None:
        self.ip = ip
        self.port = port
        self.unit_id = unit_id
        self.timeout = timeout
        self.sock: socket.socket | None = None
        self.tx_id = 0

    def connect(self) -> None:
        self.close()
        self.sock = socket.create_connection((self.ip, self.port), self.timeout)
        self.sock.settimeout(self.timeout)

    def close(self) -> None:
        if self.sock:
            self.sock.close()
            self.sock = None

    def read_ef(self) -> tuple[int, int]:
        if self.sock is None:
            self.connect()

        self.tx_id = (self.tx_id + 1) & 0xFFFF
        pdu = struct.pack(">BHH", FUNC_READ_HOLDING, REGISTER_E, REGISTER_COUNT)
        mbap = struct.pack(">HHHB", self.tx_id, 0, len(pdu) + 1, self.unit_id)

        assert self.sock is not None
        self.sock.sendall(mbap + pdu)

        rx_tx_id, protocol, length, unit_id = struct.unpack(">HHHB", read_exact(self.sock, 7))
        if (rx_tx_id, protocol, unit_id) != (self.tx_id, 0, self.unit_id):
            raise RuntimeError("Invalid Modbus TCP response header")

        response = read_exact(self.sock, length - 1)
        func = response[0]
        if func & 0x80:
            raise RuntimeError(f"Modbus exception code {response[1]}")
        if func != FUNC_READ_HOLDING or response[1] != REGISTER_COUNT * 2:
            raise RuntimeError("Invalid Modbus Function 3 response")

        register_e, register_f = struct.unpack(">HH", response[2:6])
        return register_e, register_f


def make_counter(register_e: int, register_f: int) -> int:
    return (register_f << 16) | register_e


def delta_counter(new_value: int, old_value: int) -> int:
    return new_value - old_value if new_value >= old_value else COUNTER_MAX - old_value + new_value


def get_frequency(samples: deque[tuple[float, int]], now: float, counter: int) -> int | None:
    for sample_time, sample_counter in samples:
        if sample_time <= now - SAMPLE_SECONDS:
            elapsed = now - sample_time
            return round(delta_counter(counter, sample_counter) / elapsed)
    return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read Modbus counter from Function 3 registers E/F.")
    parser.add_argument("ip", nargs="?")
    parser.add_argument("port", nargs="?", type=int)
    parser.add_argument("--unit-id", type=int, default=1)
    parser.add_argument("--timeout", type=float, default=3.0)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ip = args.ip or input("Nhap IP address: ").strip()
    port = args.port or int(input("Nhap port: ").strip())

    client = ModbusClient(ip, port, args.unit_id, args.timeout)
    samples: deque[tuple[float, int]] = deque()

    print("Reading counter. Press Ctrl+C to stop.")
    print(f"IP={ip}, port={port}, unit_id={args.unit_id}, registers=E/F, sample=10s")

    try:
        while True:
            start = time.monotonic()
            try:
                register_e, register_f = client.read_ef()
                counter = make_counter(register_e, register_f)
                samples.append((start, counter))

                while samples and start - samples[0][0] > SAMPLE_SECONDS * 2:
                    samples.popleft()

                frequency = get_frequency(samples, start, counter)
                frequency_text = "waiting" if frequency is None else f"{frequency} Hz"
                timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
                print(
                    f"{timestamp} | E: {register_e} | F: {register_f} | "
                    f"Counter: {counter} | Frequency: {frequency_text}",
                    flush=True,
                )
            except Exception as exc:
                client.close()
                print(f"{time.strftime('%Y-%m-%d %H:%M:%S')} | Read error: {exc}")

            time.sleep(max(0, PRINT_SECONDS - (time.monotonic() - start)))
    except KeyboardInterrupt:
        print("\nStopped by user.")
    finally:
        client.close()


if __name__ == "__main__":
    main()
