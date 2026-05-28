# DRUMS HMI Dashboard

React + Vite HMI frontend with a Flask backend for live Modbus monitoring and SQLite-backed historical trends.

## Overview

This project is an operator-facing dashboard for DRUMS engine and fuel system monitoring. It combines:

- Live operational data from Modbus TCP
- Historical trend and consumption data from SQLite
- A multi-page HMI interface for overview, diagnostics, process visualization, and fuel analysis

The application is structured as:

```text
React + Vite frontend
  -> calls /api/*
Flask backend
  -> modbus_api.py for live data
  -> database_api.py for historical and trend data
```

## Tech Stack

- React 19
- Vite 6
- React Router 7
- MUI 7
- Tailwind CSS 4
- ECharts 5
- Flask 3
- pymodbus 3
- SQLite

## Current Pages

- `/` - Overview
- `/engine` - Engine details
- `/pid` - P&ID process view
- `/pressure_trend` - Pressure Trend
- `/exh_temp_trend` - Exhaust Temperature Trend
- `/do-consumption` - D.O Consumption
- `/ho-consumption` - H.O Consumption
- `/fo-consumption` - Redirects to `/do-consumption`
- `/alarms` - Placeholder page

## Data Architecture

The frontend uses two data models.

### 1. Live Modbus Pages

These pages poll structured backend payloads:

- Overview
- Engine
- P&ID

Frontend flow:

```text
Page
  -> usePolledPagePayload("page-name")
  -> GET /api/<page-name>
  -> backend/modbus_api.py
  -> backend/backend_config.json
  -> Modbus TCP device
```

The backend is responsible for:

1. Reading page mappings from `backend/backend_config.json`
2. Grouping Modbus addresses for efficient reads
3. Reading holding registers and discrete inputs
4. Applying scale, precision, and threshold logic
5. Returning UI-ready payloads in `sections + meta` format

### 2. Historical / Trend Pages

These pages query history APIs backed by SQLite:

- Pressure Trend
- Exhaust Temperature Trend
- D.O Consumption
- H.O Consumption

Frontend flow:

```text
Page
  -> fetch history API
  -> backend/database_api.py
  -> SQLite database
```

These pages support:

- UTC date/time range filtering
- Engine selection where applicable
- Historical chart rendering
- Live update mode on trend screens

## Directory Structure

```text
HMI/
  backend/
    app.py
    modbus_api.py
    database_api.py
    backend_config.json
    requirements.txt
    database/
      database
      flow_meter_history.db
      mock_do_flow_meter_data.csv
      import_database.py
    data_collecting/
      modbus_csv_db_collector.py
      modbus_csv_db_collector_config.json

  public/
    Monitoritem_v2.svg
    P&IDbackground.png
    engine_image.png
    *.svg icons

  src/
    components/
    hooks/
    pages/
    services/
```

## Main Frontend Services

Core frontend API calls are defined in:

- `src/services/pidMonitorApi.js`

Main helpers include:

- `fetchPagePayload(pageName)`
- `fetchModbusStatus()`
- `fetchPressureTrendHistory(...)`
- `fetchExhTempTrendHistory(...)`
- `fetchDOConsumptionHistory(...)`
- `fetchHOConsumptionHistory(...)`

The common live polling hook is:

- `src/hooks/usePolledPagePayload.js`

It:

- polls automatically using `meta.pollIntervalMs` when provided
- falls back to `2000ms` on backend error
- returns `payload`, `isLoading`, `error`, `lastUpdated`, and `pollIntervalMs`

## Backend API Summary

### Live Status

- `GET /api/modbus-status`

### Live Page Endpoints

- `GET /api/overview`
- `GET /api/engine`
- `GET /api/pid`

### Historical Endpoints

- `GET /api/pressure_trend`
- `GET /api/exh_temp_trend`
- `GET /api/do-consumption`
- `GET /api/ho-consumption`
- `GET /api/fo-consumption`

### Common History Query Parameters

- `windowMinutes`
- `startTime`
- `endTime`
- `engine`
- `channelDescription` (repeated query parameter where applicable)

Notes:

- `startTime` and `endTime` must be supplied together when using an absolute range
- if no absolute range is provided, the backend uses the configured default time window

## Page Summary

### Overview

- Shows up to four engine summary cards
- Displays a main gauge and key operating metrics for each engine
- Intended for fast system-wide monitoring

### Engine

- Shows detailed grouped metrics for one selected engine
- Groups include engine parameters, temperatures, fuel, lubrication, PMS, and cooling water
- Some groups link to related trend pages

### P&ID

- Displays a background process diagram with a dynamic SVG overlay
- Updates flow values and digital states in real time
- Useful for process-oriented monitoring and demonstrations

### Pressure Trend

- Compares engine load with pressure-related values over time
- Supports engine selection, UTC range selection, and live mode
- Uses dual-axis charting for pressure and load

### Exhaust Temperature Trend

- Compares engine load with turbocharger and cylinder exhaust temperatures
- Supports engine selection, UTC range selection, and live mode

### D.O Consumption

- Shows one chart card per engine
- Compares D.O inlet flow, D.O outlet flow, and engine load
- Calculates consumption from the flow difference over time

### H.O Consumption

- Same interaction model as D.O Consumption
- Uses H.O-specific inlet and outlet flow history with engine load overlay

### Alarms

- Placeholder page reserved for future alarm features

## Backend Configuration

Main backend settings are stored in:

- [backend/backend_config.json](./backend/backend_config.json)

This file defines:

- Modbus connection settings
- Per-page live mappings
- Historical database settings
- Consumption channel mappings
- Display engine to source engine mapping

Examples of configuration areas:

- `modbus`
- `fo_consumption`
- `ho_consumption`
- `pressure_trend_history`
- `exh_temp_trend_history`
- `pages`

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

Default backend address:

```text
http://127.0.0.1:8001
```

### 4. Start the frontend

```bash
npm run start
```

Default frontend address:

```text
http://localhost:5173
```

## Vite Proxy

The frontend proxies API requests through Vite during development.

See:

- `vite.config.mjs`

Typical behavior:

```text
/api/* -> http://127.0.0.1:8001
```

## Build

```bash
npm run build
```

The production bundle is generated in:

```text
build/
```

## Historical Data Import

The repository includes a CSV import utility:

- `backend/database/import_database.py`

This script can import:

- `backend/database/mock_do_flow_meter_data.csv`

into the SQLite database used by the backend.

## Troubleshooting

### Frontend shows no data

- confirm the Flask backend is running
- confirm the Vite proxy is correct
- inspect `/api/*` requests in the browser dev tools
- check whether the backend is returning an error payload

### Modbus connection is unavailable

- verify `modbus.host`
- verify `modbus.port`
- verify `modbus.unit_id`
- verify network routing and firewall access to the PLC or Modbus gateway

### Trend or consumption pages show no history

- verify the SQLite database file exists
- verify the configured table name
- verify the selected UTC time range actually contains data
- verify channel description names match the backend configuration

### P&ID values do not update correctly

- verify `/api/pid` response content
- verify SVG element IDs in `public/Monitoritem_v2.svg`
- verify backend labels match the expected frontend IDs

## Additional Documentation

For customer-facing page descriptions, see:

- [FRONTEND_PAGES_CLIENT_PRESENTATION_GUIDE.md](./FRONTEND_PAGES_CLIENT_PRESENTATION_GUIDE.md)

## Notes

- The current frontend uses real route names for `Pressure Trend`, `Exh TempTrend`, `D.O Consumption`, and `H.O Consumption`
- `Alarms` is still a placeholder
- `fo-consumption` currently redirects to `do-consumption`

