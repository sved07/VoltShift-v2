# VoltShift: Autonomous Grid Load-Shifting Agent

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Mapbox GL JS](https://img.shields.io/badge/Mapbox%20GL-3D-000000.svg?logo=mapbox&logoColor=white)](https://mapbox.com)
[![Gemini 2.5 Flash](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4.svg?logo=google&logoColor=white)](https://ai.google.dev)

VoltShift is an autonomous energy-systems AI agent orchestrating heavy industrial power workloads—specifically **hyperscale AI cluster distributed training batches** and **commercial EV delivery fleet charging depots**—across North American regional grid ISOs (**CAISO, ERCOT, PJM, MISO**) to minimize real-time carbon emissions ($gCO_2/kWh$), avoid fossil peaker plant dispatches, and exploit negative-priced renewable curtailment windows without breaching mission-critical SLAs.

---

## System Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │          VoltShift Autonomous Agent          │
                  │   (Multi-Region Diurnal Balancing Engine)    │
                  └───────────────▲───────────────▲──────────────┘
                                  │               │
            ┌─────────────────────┴───┐       ┌───┴────────────────────────┐
            │   Regional Grid Feed    │       │     Industrial Workloads   │
            │  (CAISO, ERCOT, PJM...) │       │  (AI Clusters & EV Depots) │
            │  - Real-time gCO2/kWh   │       │  - Peak kW & Baseline kW   │
            │  - Solar & Wind Curtail │       │  - SLA Deadline Constraints│
            │  - Marginal Peaker Fuel │       │  - Flexibility Index (0-1) │
            └─────────────────────────┘       └────────────────────────────┘
                                  │
                                  ▼
         ┌───────────────────────────────────────────────────┐
         │       Gemini AI Autonomous Decision Audit         │
         │   (gemini-2.5-flash / gemini-3.8-flash Reasoning) │
         │   - Primary Grid Catalyst Detection               │
         │   - Natural Language Decision Explanations        │
         │   - Forward 24-Hour Carbon Arbitrage Forecast     │
         └────────────────────────┬──────────────────────────┘
                                  │  WebSocket: /ws/grid-telemetry
                                  ▼
         ┌───────────────────────────────────────────────────┐
         │       Mapbox 3D Geospatial Operator Console       │
         │   - Color-coded ISO Polygons (<150g, 150-320g...) │
         │   - 3D Extruded Data Centers & Fleet Depots       │
         │   - Live Shift Badges (+kW BOOST / -kW THROTTLE)  │
         │   - Real-Time Disruption Injection (Gas Peaker)   │
         └───────────────────────────────────────────────────┘
```

---

## Key Features

1. **Autonomous Load Dispatch Engine**:
   - **Green Surplus Arbitrage**: When regional renewable generation exceeds 60% or carbon intensity drops below 180 $gCO_2/kWh$, the agent activates `BOOST` mode, surging industrial loads up to 100% rated capacity.
   - **Fossil Peaker Shedding**: When carbon surges above 350 $gCO_2/kWh$ (or upon marginal gas peaker activation), flexible workloads are `THROTTLED` by 50–80% or `DEFERRED`.
   - **Hard SLA Enforcement**: Workloads calculate the hours remaining before daily batch / overnight charging deadlines ($T_{\text{deadline}} - T_{\text{sim}}$). If the safety buffer drops below 3 hours and quota progress is incomplete, the agent overrides emissions thrift and dispatches nominal or boost power to prevent SLA defaults.

2. **Gemini AI Audit Layer**:
   - Evaluates grid telemetry using `@google/genai` with strict structured JSON schemas (`GeminiAgentExplanation`).
   - Generates natural-language reasoning cards explaining why specific facilities were shifted or deferred.
   - Projects 24-hour forward carbon intensity curves and recommends tactical dispatch windows.

3. **Mapbox 3D Geospatial Dashboard**:
   - Interactive dark-theme 3D map with camera pitch, tilt, and fly-to animations.
   - GeoJSON territory polygons color-coded by live carbon intensity:
     - 🟢 **Green** ($< 150\ gCO_2/kWh$): Solar/wind curtailment window.
     - 🟡 **Amber** ($150 - 320\ gCO_2/kWh$): Base combined-cycle gas generation.
     - 🔴 **Red** ($> 320\ gCO_2/kWh$): High marginal coal/peaker emissions.
   - 3D building extrusions (`fill-extrusion`) whose physical height scales in real-time with power draw ($kW$).
   - Custom animated markers displaying power shift deltas (e.g., `+550 kW [BOOST]`, `-800 kW [THROTTLED]`).

4. **Scenario & Disruption Controls**:
   - 24-Hour simulation slider (00:00 - 23:00) with diurnal sun/moon indicators.
   - "Simulate Gas Peaker Spike" disruption trigger for stress-testing grid resilience.
   - "Autonomous Dispatch" vs. "Unmanaged Baseline" mode toggle with real-time KPI delta comparison.

---

## Directory Structure

```
voltshift/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI server & WebSocket /ws/grid-telemetry
│   │   ├── config.py                # Environment configs & model parameters
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py           # Pydantic schemas (GridZone, Workload, etc.)
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── grid_monitor.py      # Diurnal solar/wind model & Electricity Maps client
│   │   │   ├── workload_manager.py  # SLA quota tracker & facility states
│   │   │   └── dispatch_agent.py    # Autonomous dispatch optimization algorithm
│   │   ├── ai/
│   │   │   ├── __init__.py
│   │   │   └── gemini_advisor.py    # Google GenAI (gemini-2.5-flash) structured reasoning
│   │   └── data/
│   │       └── mock_iso_telemetry.json
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapboxView.tsx       # 3D geospatial visualization with building extrusions
│   │   │   ├── AIAuditPanel.tsx     # Gemini autonomous decision audit stream
│   │   │   ├── WorkloadList.tsx     # AI clusters & commercial EV fleet monitoring
│   │   │   ├── MetricsBar.tsx       # Cumulative CO2 avoided & financial savings KPIs
│   │   │   └── ControlBar.tsx       # Simulation scrubber & peaker disruption controls
│   │   ├── hooks/
│   │   │   └── useGridSocket.ts     # Real-time WebSocket hook with fallback sync
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript interfaces matching backend models
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
└── README.md
```

---

## Quickstart Guide

### Option 1: AI Studio Full-Stack Runtime (Recommended)
VoltShift includes a unified Node.js + Express + Vite proxy server (`server.ts`) that runs directly in the development container:

```bash
# 1. Install dependencies
npm install

# 2. Run the unified dev server (serves frontend & /ws/grid-telemetry on port 3000)
npm run dev
```

### Option 2: Python FastAPI Backend + Vite Frontend

#### 1. Start the Python Backend
```bash
cd voltshift/backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Run FastAPI with uvicorn
uvicorn app.main:app --reload --port 8000
```
FastAPI Swagger documentation will be available at `http://localhost:8000/docs`.

#### 2. Start the React Frontend
```bash
cd voltshift/frontend

# Install dependencies
npm install

# Start Vite
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Environment Variables

### Backend (`voltshift/backend/.env`)
```ini
# Required for autonomous natural-language explanations and forward curves
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Optional: Real Electricity Maps API key (automatic fallback if omitted)
ELECTRICITY_MAPS_KEY=""

PORT=8000
HOST="0.0.0.0"
```

### Frontend (`voltshift/frontend/.env`)
```ini
# Optional: Mapbox GL public token for vector dark-v11 style
# (Falls back to Carto Dark Matter raster basemaps if omitted)
VITE_MAPBOX_TOKEN=""
```

---

## Technical Specifications

| Parameter | Value |
|---|---|
| **Simulation Resolution** | 1.5-second real-time telemetry tick loop |
| **Grid ISOs Tracked** | CAISO (California), ERCOT (Texas), PJM (Mid-Atlantic), MISO (Midwest) |
| **Monitored Facilities** | 4 AI Superclusters (9.3 MW nameplate) + 4 EV Commercial Depots (6.4 MW nameplate) |
| **AI Model** | Google GenAI `gemini-2.5-flash` / `gemini-3.8-flash` |
| **Average Carbon Abatement** | 30% to 42% emissions reduction vs. unmanaged flat baseline |
| **SLA Default Rate** | 0.0% (Hard deadline override invariant) |
