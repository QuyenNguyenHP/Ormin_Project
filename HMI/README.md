# DRUMS HMI Dashboard

`HMI` is a React + Vite operator dashboard backed by Flask APIs for live Modbus monitoring and SQLite-based history/trend views.

## What This Project Contains

- A Vite frontend in `src/`
- A Flask backend in `backend/`
- Public HMI assets in `public/`
- A built production bundle in `build/`

The frontend talks to the backend through `/api/*` endpoints. During local development, Vite proxies those requests to `http://127.0.0.1:8001`.

## Tech Stack

### Frontend

- React 19
- Vite 6
- React Router 7
- MUI 7
- Tailwind CSS 4
- ECharts 5
- Recharts 2

### Backend

- Flask 3
- Flask-CORS
- pymodbus 3
- SQLite

## Folder Layout

```text
HMI/
  backend/
    app.py
    modbus_api.py
    database_api.py
    backend_config.json
    requirements.txt
    database/
    data_collecting/

  public/
    Device_Status_1.png
    Device_Status_2.png
    Indicator1.svg
    Indicator2.svg
    P&IDbackground.png
    engine_image.png
    overview.png
    *.svg

  src/
    components/
    hooks/
    pages/
    services/
    utils/

  build/
  package.json
  vite.config.mjs
```

## Current Frontend Routes

These routes are registered in `src/App.jsx`.

- `/` -> `Overview`
- `/pid` -> `PAndID`
- `/engine` -> `Engine`
- `/pressure_trend` -> `PressureTrend`
- `/exh_temp_trend` -> `ExhTempTrend`
- `/consumption` -> unified `Consumption` page with D.O/H.O and 1/4 graph selectors
- `/do-consumption`, `/ho-consumption`, and `/fo-consumption` -> redirect to the unified page with the matching fuel selected
- `/alarms` -> `Alarms`
- `/device-status-1` -> `DeviceStatus1`

## Main Screens

### Overview

- High-level system summary
- Engine cards and overview visuals
- Uses live `/api/overview` data

### P&ID

- Background diagram plus dynamic values/status overlays
- Uses live `/api/pid` data

### Engine

- Detailed grouped engine metrics
- Includes selectable engine buttons
- Uses live `/api/engine` data

### Device Status

- Implemented in `src/pages/DeviceStatus1.jsx`
- Currently contains selectable tabs for:
- `Device list 1`
- `Device list 2`
- `Device list 3`
- `Device list 4`

Current asset mapping:

- `Device list 1` -> `/Device_Status_1.png` + `/Indicator1.svg`
- `Device list 2` -> `/Device_Status_2.png` + `/Indicator2.svg`
- `Device list 3` -> currently points to list 1 assets as fallback
- `Device list 4` -> currently points to list 1 assets as fallback

Current API mapping:

- `Device list 1` -> `/api/device_status_1`
- `Device list 2` -> `/api/device_status_2`
- `Device list 3` -> currently reuses `device_status_1`
- `Device list 4` -> currently reuses `device_status_1`

### Historical Pages

- `PressureTrend`
- `ExhTempTrend`
- `Consumption` (implemented in `DOConsumption.jsx`)

These pages read from SQLite-backed Flask endpoints rather than live Modbus pages.

## Frontend Data Flow

### Live pages

The common live polling hook is:

- `src/hooks/usePolledPagePayload.js`

It:

- polls `GET /api/<pageName>`
- uses `meta.pollIntervalMs` from the backend when available
- falls back to `2000ms` when requests fail
- returns `payload`, `isLoading`, `error`, `lastUpdated`, and `pollIntervalMs`

Main frontend API service:

- `src/services/pidMonitorApi.js`

Important functions:

- `fetchPagePayload(pageName)`
- `fetchModbusStatus()`
- `fetchDebugModbusSnapshot()`
- `fetchPressureTrendHistory(...)`
- `fetchExhTempTrendHistory(...)`
- `fetchDOConsumptionHistory(...)`
- `fetchHOConsumptionHistory(...)`

### Device status overlay logic

Device status indicator rendering is handled by:

- `src/utils/deviceStatusMonitor.js`

It:

- converts `payload.sections.indicators` into SVG lookup data
- updates SVG nodes by `id`
- applies colors to `fill`
- also applies colors to `stroke` for stroke-only indicator SVGs such as `Indicator2.svg`

## Backend Architecture

### App entry

- `backend/app.py`

This starts Flask on:

```text
http://0.0.0.0:8001
```

It registers:

- `database_api`
- `modbus_api`

### Live Modbus backend

- `backend/modbus_api.py`

This module:

- loads `backend/backend_config.json`
- resolves page references against the shared `signals` registry
- opens a Modbus TCP client
- groups contiguous addresses for efficient reads
- reads holding registers and discrete inputs
- transforms raw values into UI-ready payloads
- serves page payloads through `GET /api/<page_name>`

Important implementation detail:

- Modbus settings and signal definitions are reloaded for each request.
- Address changes apply on the next poll to every page referencing that signal.

### Historical backend

- `backend/database_api.py`

This module:

- reads database-related config from `backend/backend_config.json`
- resolves database paths
- queries SQLite for trend and consumption data
- returns records plus time-range metadata

### How SQLite history is used

The shared history file defaults to `backend/database/database` (it has no `.db`
extension, but it is a normal SQLite database):

1. `backend/data_collector/modbus_csv_db_collector.py` polls the configured
   Modbus points, appends a CSV snapshot, and upserts the same rows into SQLite.
2. Each history row contains `Engine`, `Channel Description`, `Timestamp`,
   `Value`, and `Unit`. The combination of engine, channel, and timestamp is
   unique, so polling the same timestamp updates that row instead of duplicating it.
3. `backend/database/import_database.py` can create/populate the same schema from
   an existing CSV file.
4. `backend/database_api.py` reads this database for D.O/H.O consumption,
   pressure trends, and exhaust-temperature trends. Live monitoring pages read
   Modbus directly and do not depend on SQLite.

### Database administration

After signing in at `/admin`, open the **Database** tab. The configured history
database and its first data table are selected automatically. It provides:

- configured database files, their consumers, file/WAL sizes, tables, columns,
  indexes, journal mode, row counts, and available timestamp range;
- Engine and Channel Description selectors populated from values currently in
  SQLite, plus start/end time filters and 50-row pagination;
- CSV export of up to 10,000 filtered rows;
- `PRAGMA quick_check` integrity verification;
- a consistent downloadable SQLite backup created with SQLite's online backup API.

The management API opens source databases in query-only mode. It deliberately
does not expose SQL execution, row deletion, table changes, vacuum, or restore.
All `/api/admin/sqlite/*` endpoints require an authenticated administrator session.

## Backend API Summary

### Live utility endpoints

- `GET /api/modbus-status`
- `GET /api/debug/modbus-snapshot`

### Live page endpoints

- `GET /api/overview`
- `GET /api/engine`
- `GET /api/pid`
- `GET /api/device_status_1`
- `GET /api/device_status_2`

### Historical endpoints

- `GET /api/do-consumption`
- `GET /api/fo-consumption`
- `GET /api/ho-consumption`
- `GET /api/pressure_trend`
- `GET /api/exh_temp_trend`

### Common history query parameters

- `windowMinutes`
- `startTime`
- `endTime`
- `engine`
- `channelDescription` as a repeated query parameter for trend endpoints

## Backend Configuration

Main config file:

- `backend/backend_config.json`

This file contains:

- Modbus connection settings
- Poll interval settings
- Shared Modbus definitions under `signals` and page references under `pages`
- Device status indicator definitions
- Consumption history settings
- Pressure trend history settings
- Exhaust temperature history settings

Relevant live page keys currently present include:

- `overview`
- `engine`
- `pid`
- `device_status_1`
- `device_status_2`

### Shared signal addresses (configuration version 3)

Declare each signal's address and decoding settings once in `signals`:

```json
"signals": {
  "engine_1.engine_power": {
    "label": "Engine Power",
    "source_type": "holding_register",
    "address": 40038,
    "scale": 1
  }
}
```

Overview and Engine both reference that ID in their page mappings:

```json
{"signal": "engine_1.engine_power", "key": "engine_power", "label": "Engine Power", "unit": "kW"}
```

- Edit `signals.engine_1.engine_power.address` (the literal JSON key is `engine_1.engine_power`), or use **Admin → Signal addresses → Save addresses**. Both pages use the new address on the next poll.
- Engine 2, 3 and 4 have separate IDs, such as `engine_2.engine_power`, so their addresses remain independent.
- Keep `source_type`, `address`, `scale`, `data_type`, and `register_count` in the shared definition. Page references cannot override these fields.
- Keep display settings (`key`, `label`, `unit`, `precision`, gauge colors, SVG IDs, and thresholds) in the relevant page. Existing page API payloads are preserved.
- Admin lists each signal once. **Used by** lists all affected pages; filtering by a page still edits the shared definition. Searching also matches labels and keys used by other pages.
- To add a signal, add a stable, unique ID under `signals`, then reference it from any page. Use semantic IDs rather than embedding the address in the name.
- Separate PID signals that currently happen to use the same address remain separate definitions when their names describe different devices. Address equality alone does not establish that they are the same signal.

Run backend regression checks from `HMI/backend`:

```bash
python -m unittest test_admin_addresses test_signal_config -v
```

## Public Assets

Notable assets currently in `public/`:

- `overview.png`
- `engine_image.png`
- `P&IDbackground.png`
- `Device_Status_1.png`
- `Device_Status_2.png`
- `Indicator1.svg`
- `Indicator2.svg`
- `Monitoritem_v2.svg`
- `overview.svg`
- `engine.svg`
- `pressure_trend.svg`
- `alarm.svg`

## Local Development

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Start the backend

```bash
python backend/app.py
```

Backend default address:

```text
http://127.0.0.1:8001
```

### 4. Start the frontend

```bash
npm run start
```

Frontend default address:

```text
http://localhost:5173
```

## Vite Development Proxy

Defined in `vite.config.mjs`:

```text
/api/* -> http://127.0.0.1:8001
```

The Vite dev server also ignores file watching inside:

```text
backend/database/
```

## Build

Create a production bundle with:

```bash
npm run build
```

The output is written to:

```text
build/
```

## Common Files To Know

### Frontend

- `src/App.jsx` -> route registration
- `src/services/pidMonitorApi.js` -> frontend API calls
- `src/hooks/usePolledPagePayload.js` -> shared polling hook
- `src/utils/deviceStatusMonitor.js` -> device status SVG mapping
- `src/components/` -> reusable UI pieces

### Backend

- `backend/app.py` -> Flask entry point
- `backend/modbus_api.py` -> live Modbus endpoints
- `backend/database_api.py` -> history/trend endpoints
- `backend/backend_config.json` -> main runtime config

## Troubleshooting

### The frontend shows `Backend unavailable, showing the latest available overlay.`

This means the active `GET /api/<pageName>` request failed.

Check:

- Flask backend is running
- the selected page key exists in `backend/backend_config.json`
- the backend was restarted after config changes
- the Modbus server is reachable
- the browser request to `/api/<pageName>` is not returning `404` or `500`

### Device status colors do not update

Check:

- the SVG nodes have stable `id` values
- `svg_id` in `backend/backend_config.json` matches the SVG `id`
- the backend returns `sections.indicators`
- the selected device list points to the expected SVG and page key

### Trend pages return no records

Check:

- the SQLite database exists
- the configured table and column names match the real database
- the selected time range contains data
- the selected engine and channel descriptions exist in the database

### Config changes do not appear in the app

Restart the Flask backend after editing:

- `backend/backend_config.json`

because the file is loaded on backend startup.

## Extra Docs

For page-by-page presentation notes, see:

- `FRONTEND_PAGES_CLIENT_PRESENTATION_GUIDE.md`
