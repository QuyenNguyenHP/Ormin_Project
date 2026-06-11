# Modbus Simulator

`modbus_simulator.py` runs a local Modbus TCP server that matches the register style used by the HMI backend.

It does three things:

1. Loads register definitions from `modbus list.xlsx`
2. Falls back to `HMI/backend/backend_config.json` for any addresses not found in the workbook
3. Lets you change live values while the backend is polling

## Run

From the project root:

```powershell
python Modbus_simulation\modbus_simulator.py
```

If your Python executable is not named `python`, use your local Python command instead.

Default runtime settings:

- Modbus TCP: `0.0.0.0:502`
- Unit ID: `16`
- Control API: `http://127.0.0.1:8052`

## Make The Backend Read The Simulator

Update the Modbus block in `HMI/backend/backend_config.json` to point to the simulator host, for example:

```json
"modbus": {
  "host": "127.0.0.1",
  "port": 502,
  "unit_id": 16,
  "timeout_seconds": 3,
  "poll_interval_ms": 2000
}
```

## Change Values While Running

### Option 1: Console commands

When the simulator starts, you can type commands into the same terminal:

```text
set hr 40101 550
set di 10001 1
show hr
show di
randomize
```

### Option 2: HTTP control API

Set a holding register:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8052/set `
  -ContentType "application/json" `
  -Body '{"source_type":"holding_register","address":40101,"value":550}'
```

Set a discrete input:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8052/set `
  -ContentType "application/json" `
  -Body '{"source_type":"discrete_input","address":10001,"value":true}'
```

List points:

```powershell
Invoke-RestMethod http://127.0.0.1:8052/points
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8052/health
```

## Helpful Flags

```powershell
python Modbus_simulation\modbus_simulator.py --port 1502 --control-port 18052
python Modbus_simulation\modbus_simulator.py --auto-randomize-seconds 2
python Modbus_simulation\modbus_simulator.py --no-console
```

## Create A systemd Service

For a Linux host, run the simulator as a background service with `systemd`.

1. Find the full paths for your project and Python executable.
2. Create `/etc/systemd/system/modbus-simulator.service`:

```ini
[Unit]
Description=Modbus Simulator
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/opt/Ormin_Project_V5
ExecStart=/usr/bin/python3 /opt/Ormin_Project_V5/Modbus_simulation/modbus_simulator.py --no-console
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Replace `your-user`, `/opt/Ormin_Project_V5`, and `/usr/bin/python3` with the correct values for your machine.

3. Reload `systemd` and enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now modbus-simulator.service
```

4. Check status and logs:

```bash
sudo systemctl status modbus-simulator.service
journalctl -u modbus-simulator.service -f
```

If you need to bind to privileged port `502`, run the service with a user that has permission for that port, or start the simulator on a non-privileged port such as `1502` and point the backend to that port instead.
