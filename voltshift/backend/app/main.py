import asyncio
import datetime
import json
from typing import Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .agents.grid_monitor import GridMonitor
from .agents.workload_manager import WorkloadManager
from .agents.dispatch_agent import DispatchAgent
from .ai.gemini_advisor import GeminiAdvisor
from .models.schemas import TelemetryPacket, ClientActionMessage

app = FastAPI(
    title="VoltShift: Autonomous Grid Load-Shifting Agent",
    version="1.0.0",
    description="Backend API and Real-Time WebSocket for Autonomous Grid Load Shifting"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

grid_monitor = GridMonitor()
workload_manager = WorkloadManager()
dispatch_agent = DispatchAgent(workload_manager)
gemini_advisor = GeminiAdvisor()

# Simulation Global State
class SimulationState:
    sim_hour: int = 13 # default sunny midday 13:00
    is_autonomous_mode: bool = True
    is_peaker_event: bool = False
    is_running_ticker: bool = True
    active_connections: Set[WebSocket] = set()

state = SimulationState()

async def generate_telemetry_packet() -> TelemetryPacket:
    zones = grid_monitor.get_grid_state(state.sim_hour, state.is_peaker_event)
    workloads, metrics = dispatch_agent.dispatch(
        zones=zones,
        sim_hour=state.sim_hour,
        is_autonomous_mode=state.is_autonomous_mode
    )
    explanation = await gemini_advisor.explain_dispatch(
        zones=zones,
        workloads=workloads,
        sim_hour=state.sim_hour,
        is_peaker_event=state.is_peaker_event,
        is_autonomous_mode=state.is_autonomous_mode
    )

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return TelemetryPacket(
        timestamp=now_iso,
        sim_hour=state.sim_hour,
        is_peaker_event=state.is_peaker_event,
        is_autonomous_mode=state.is_autonomous_mode,
        zones=zones,
        workloads=workloads,
        ai_explanation=explanation,
        cumulative_metrics=metrics,
    )

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "VoltShift Autonomous Agent", "hour": state.sim_hour}

@app.get("/api/telemetry", response_model=TelemetryPacket)
async def get_telemetry():
    return await generate_telemetry_packet()

@app.post("/api/action")
async def handle_action(msg: ClientActionMessage):
    if msg.action == "SET_HOUR" and msg.hour is not None:
        state.sim_hour = max(0, min(23, msg.hour))
    elif msg.action == "TOGGLE_MODE":
        if msg.autonomous_mode is not None:
            state.is_autonomous_mode = msg.autonomous_mode
        else:
            state.is_autonomous_mode = not state.is_autonomous_mode
    elif msg.action == "TRIGGER_PEAKER_SPIKE":
        if msg.peaker_active is not None:
            state.is_peaker_event = msg.peaker_active
        else:
            state.is_peaker_event = not state.is_peaker_event
    elif msg.action == "RESET_METRICS":
        workload_manager.reset_states()
        dispatch_agent.cumulative_co2_saved = 0.0
        dispatch_agent.cumulative_mwh_shifted = 0.0
        dispatch_agent.cumulative_cost_saved = 0.0

    # Broadcast immediate state to all active websocket clients
    packet = await generate_telemetry_packet()
    payload = packet.model_dump_json()
    for ws in list(state.active_connections):
        try:
            await ws.send_text(payload)
        except Exception:
            pass

    return {"status": "success", "sim_hour": state.sim_hour, "autonomous": state.is_autonomous_mode, "peaker": state.is_peaker_event}

@app.websocket("/ws/grid-telemetry")
async def websocket_grid_telemetry(websocket: WebSocket):
    await websocket.accept()
    state.active_connections.add(websocket)
    try:
        # Send initial snapshot immediately
        initial_packet = await generate_telemetry_packet()
        await websocket.send_text(initial_packet.model_dump_json())

        # Main receive loop for incoming commands from client
        while True:
            data = await websocket.receive_text()
            try:
                cmd = json.loads(data)
                action = cmd.get("action")
                if action == "SET_HOUR" and "hour" in cmd:
                    state.sim_hour = max(0, min(23, int(cmd["hour"])))
                elif action == "TOGGLE_MODE":
                    if "autonomous_mode" in cmd:
                        state.is_autonomous_mode = bool(cmd["autonomous_mode"])
                    else:
                        state.is_autonomous_mode = not state.is_autonomous_mode
                elif action == "TRIGGER_PEAKER_SPIKE":
                    if "peaker_active" in cmd:
                        state.is_peaker_event = bool(cmd["peaker_active"])
                    else:
                        state.is_peaker_event = not state.is_peaker_event
                elif action == "TOGGLE_TICKER":
                    state.is_running_ticker = not state.is_running_ticker

                # Send fast updated packet upon action
                packet = await generate_telemetry_packet()
                await websocket.send_text(packet.model_dump_json())
            except Exception as e:
                print(f"[WS Error]: {e}")
    except WebSocketDisconnect:
        state.active_connections.discard(websocket)
    except Exception:
        state.active_connections.discard(websocket)

@app.on_event("startup")
async def background_simulation_loop():
    async def ticker():
        while True:
            await asyncio.sleep(1.5)
            if state.is_running_ticker and state.active_connections:
                try:
                    packet = await generate_telemetry_packet()
                    payload = packet.model_dump_json()
                    for ws in list(state.active_connections):
                        try:
                            await ws.send_text(payload)
                        except Exception:
                            state.active_connections.discard(ws)
                except Exception as e:
                    print(f"[Ticker Error]: {e}")
    asyncio.create_task(ticker())
