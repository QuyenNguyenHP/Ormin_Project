# Frontend Pages Client Presentation Guide

## Purpose

This document explains the purpose, user-facing features, and connection requirements of each page in the HMI frontend.  
It is written in presentation-friendly English so it can be reused in customer demos, project handover sessions, and functional discussions.

## System Overview

The frontend is a React + Vite HMI dashboard for monitoring engine and fuel-related operations.

At a high level, the frontend connects to:

- Live operational data from the backend through `/api/*` endpoints
- Modbus TCP data acquisition handled by the backend
- Historical trend data stored in SQLite and exposed by backend history APIs

## Main Navigation Pages

The current frontend includes these main pages:

- `Overview`
- `Engine`
- `Pressure Trend`
- `Exh TempTrend`
- `D.O Consumption`
- `H.O Consumption`
- `P&ID`
- `Alarms`

## Common Frontend Behavior

Across the application, users will see a consistent layout with:

- A top header with communication status
- A left navigation sidebar for page switching
- A footer showing last update time and network state
- A dark industrial-style monitoring interface optimized for control-room use

## Connection Model

There are two main data modes in this frontend:

### 1. Live Monitoring Mode

Used by pages such as:

- `Overview`
- `Engine`
- `P&ID`

These pages request structured payloads from backend endpoints like:

- `/api/overview`
- `/api/engine`
- `/api/pid`

The backend is responsible for:

- Reading live values from Modbus TCP
- Applying scaling and threshold rules
- Returning UI-ready payloads for the frontend

### 2. Historical / Trend Mode

Used by pages such as:

- `Pressure Trend`
- `Exh TempTrend`
- `D.O Consumption`
- `H.O Consumption`

These pages request time-series data from history APIs such as:

- `/api/pressure_trend`
- `/api/exh_temp_trend`
- `/api/do-consumption`
- `/api/ho-consumption`

The backend is responsible for:

- Reading historical records from SQLite
- Filtering by engine and time range
- Returning trend-ready datasets for charts

## Page-by-Page Description

## 1. Overview Page

### Functional Purpose

The Overview page is the main summary dashboard of the system.  
It gives the operator a fast snapshot of the condition of multiple engines in one screen.

### Main Features

- Displays up to four engine summary cards
- Shows a headline gauge for each engine
- Shows key operating metrics such as:
- Running hours
- Engine speed
- Fuel oil pressure
- Lubricating oil pressure
- Lubricating oil temperature
- Boost air pressure
- Uses visual state indication for normal, warning, or alarm conditions

### Customer Value

- Excellent for first-look monitoring
- Helps operators identify abnormal engines immediately
- Reduces the need to open detailed screens for routine checks

### Connection Requirements

- Backend endpoint: `/api/overview`
- Requires valid backend page mapping for overview metrics
- Requires backend connectivity to the Modbus source
- Polling behavior is controlled by backend response metadata

## 2. Engine Page

### Functional Purpose

The Engine page provides a deep-dive technical view of one selected engine at a time.

### Main Features

- Engine selector for switching between engines
- Metrics grouped into logical technical sections
- Current groups include:
- Alternator Temperature
- Engine Parameters
- Exhaust Gas Temperature
- Fuel Oil System
- Fuel Oil Flow System
- Lub Oil System
- Oil Mist Detection
- PMS
- Cooling Water System
- Group card design allows quick scanning
- Some group titles are linked to related trend pages for deeper analysis

### Customer Value

- Supports troubleshooting and detailed engine review
- Organizes large quantities of data into clear engineering categories
- Improves operator understanding of subsystem relationships

### Connection Requirements

- Backend endpoint: `/api/engine`
- Requires engine-specific metric mapping in backend configuration
- Requires live Modbus connectivity through the backend

## 3. Pressure Trend Page

### Functional Purpose

The Pressure Trend page is designed for historical and near-live analysis of engine pressure behavior against engine load.

### Main Features

- Engine selection buttons
- UTC date/time range selection
- `Prev 24h` and `Next 24h` quick navigation
- Manual `Apply` action for selected time range
- `Live` mode for continuous update behavior
- Multi-series chart comparing engine load with:
- Fuel Oil Pressure
- Engine LO Pressure
- Intake Air Pressure
- Cooler Water Pressure
- Dual-axis visualization for pressure and load

### Customer Value

- Helps identify pressure deviations over time
- Supports performance diagnosis and early issue detection
- Allows engineers to compare behavior under different load conditions

### Connection Requirements

- Backend endpoint: `/api/pressure_trend`
- Requires historical data in SQLite
- Requires engine and channel description filtering support in backend
- Uses `/api/modbus-status` for communication state indication
- Live mode requires continuous backend availability

## 4. Exhaust Temperature Trend Page

### Functional Purpose

The Exh TempTrend page focuses on exhaust temperature behavior and compares cylinder temperatures with engine load.

### Main Features

- Engine selection
- UTC time range filtering
- 24-hour navigation buttons
- Live mode
- Multi-series chart including:
- Engine Power
- T/C Outlet Temperature
- Cylinder 1 to Cylinder 6 Exhaust Temperature
- T/C Inlet Temperature
- Dual-axis chart with temperature on one side and load on the other

### Customer Value

- Supports thermal performance monitoring
- Helps identify cylinder imbalance or combustion-related issues
- Useful for maintenance review and trend-based diagnosis

### Connection Requirements

- Backend endpoint: `/api/exh_temp_trend`
- Requires historical exhaust temperature data in SQLite
- Requires engine-specific trend records and time-series filtering
- Uses `/api/modbus-status` for live communication indicator

## 5. D.O Consumption Page

### Functional Purpose

The D.O Consumption page visualizes diesel oil consumption behavior for each engine.

### Main Features

- UTC time range selection
- 24-hour navigation controls
- Four engine trend cards shown together
- For each engine, the chart compares:
- D.O inlet flow
- D.O outlet flow
- Engine load / power overlay
- Automatically calculates consumption from the flow difference band over time
- Shows sample count and total calculated consumption in each chart card

### Customer Value

- Makes fuel usage easier to explain and quantify
- Helps identify abnormal return flow or unexpected consumption patterns
- Useful for operational review, fuel tracking, and efficiency analysis

### Connection Requirements

- Backend endpoint: `/api/do-consumption`
- Requires historical D.O flow records in SQLite
- Requires engine load/power history for chart overlay
- Requires backend configuration that maps:
- Inlet flow channels
- Outlet flow channels
- Power/load channel
- Display engine mapping
- Uses `/api/modbus-status` for connection status display

## 6. H.O Consumption Page

### Functional Purpose

The H.O Consumption page provides the same style of analysis as the D.O page, but for heavy oil consumption.

### Main Features

- UTC time range selection
- 24-hour time shift controls
- Separate chart card for each engine
- Comparison of:
- H.O inlet flow
- H.O outlet flow
- Engine load / power overlay
- Consumption calculation based on flow difference across time

### Customer Value

- Gives a clear view of heavy oil usage by engine
- Helps explain actual consumption behavior to operational stakeholders
- Supports fuel management and long-term efficiency review

### Connection Requirements

- Backend endpoint: `/api/ho-consumption`
- Requires historical H.O flow data in SQLite
- Requires engine load/power history
- Requires backend mapping of display engine, flow channels, and power source mapping
- Uses `/api/modbus-status` for communication state display

## 7. P&ID Page

### Functional Purpose

The P&ID page is the process visualization page of the system.  
It combines a background process diagram with dynamic operational overlays.

### Main Features

- Static P&ID background image
- SVG overlay for dynamic process values and digital states
- Real-time display of flow values such as:
- D.O transfer flow
- H.O transfer flow
- Inlet and outlet flows for DG#1 to DG#4
- Digital state indicators for pumps and tanks
- Color-coded flow values and ON/OFF states
- Graphical updates applied directly inside the SVG document

### Customer Value

- Provides a process-oriented operational view
- Allows users to understand system status spatially, not only numerically
- Very effective for customer demos and operator situational awareness

### Connection Requirements

- Backend endpoint: `/api/pid`
- Frontend assets required:
- `P&IDbackground.png`
- `Monitoritem_v2.svg`
- Backend must provide:
- Flow values
- Digital states
- Matching labels and IDs aligned to SVG element IDs
- Requires live backend and Modbus connectivity

## 8. Alarms Page

### Functional Purpose

The Alarms page is currently a placeholder page reserved for future development.

### Current Features

- Page title and subtitle only
- Existing route and navigation entry already in place

### Expected Future Role

- Central list of active alarms
- Alarm acknowledgement workflow
- Severity-based filtering
- Alarm history review

### Connection Requirements

- Current implementation does not require a dedicated data API
- Future implementation will likely require:
- Active alarm endpoint
- Alarm history storage
- Severity, timestamp, and acknowledgement metadata

## Backend and Connectivity Requirements Summary

To present the frontend successfully to a customer, the following dependencies should be available:

- The React frontend application
- The Flask backend API
- Modbus TCP connectivity for live pages
- SQLite historical database for trend and consumption pages
- Correct backend configuration in `backend_config.json`
- Matching channel descriptions between collector, database, and frontend expectations

## API Summary

### General Status Endpoint

- `/api/modbus-status`

### Live Page Endpoints

- `/api/overview`
- `/api/engine`
- `/api/pid`

### Historical Trend Endpoints

- `/api/pressure_trend`
- `/api/exh_temp_trend`
- `/api/do-consumption`
- `/api/ho-consumption`

## Recommended Customer Presentation Flow

For a clean customer demo, the pages can be presented in this order:

1. `Overview`  
   Start with the high-level system summary.

2. `Engine`  
   Move into detailed engine monitoring.

3. `P&ID`  
   Show the process-based visual representation.

4. `Pressure Trend`  
   Demonstrate diagnostic trend capability.

5. `Exh TempTrend`  
   Show thermal and combustion-related analysis.

6. `D.O Consumption`  
   Present diesel oil consumption visibility.

7. `H.O Consumption`  
   Present heavy oil consumption visibility.

8. `Alarms`  
   Explain the reserved roadmap area for future extension.

## Suggested Customer Positioning

This frontend can be presented as:

- A live monitoring dashboard
- An operational decision-support tool
- A historical analysis interface
- A presentation-ready HMI layer for marine or industrial engine systems

It combines:

- Real-time visibility
- Trend-based diagnostics
- Fuel analysis
- Process visualization
- Expandable alarm architecture

## File Reference

This guide is based on the current frontend routes and behavior implemented in:

- `src/App.jsx`
- `src/pages/*`
- `src/hooks/usePolledPagePayload.js`
- `src/services/pidMonitorApi.js`

