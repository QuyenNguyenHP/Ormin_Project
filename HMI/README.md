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
- `/do-consumption` -> `DOConsumption`
- `/ho-consumption` -> `HOConsumption`
- `/fo-consumption` -> redirects to `/do-consumption`
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
- `DOConsumption`
- `HOConsumption`

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
- reads page configs from `CONFIG["pages"]`
- opens a Modbus TCP client
- groups contiguous addresses for efficient reads
- reads holding registers and discrete inputs
- transforms raw values into UI-ready payloads
- serves page payloads through `GET /api/<page_name>`

Important implementation detail:

- `backend_config.json` is loaded once at startup into `CONFIG`
- if you change page mappings or Modbus config, restart the Flask backend to pick up the changes

### Historical backend

- `backend/database_api.py`

This module:

- reads database-related config from `backend/backend_config.json`
- resolves database paths
- queries SQLite for trend and consumption data
- returns records plus time-range metadata

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
- Live page mappings under `pages`
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
