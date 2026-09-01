"""
FastAPI application — Sprint 1 version.

New in Sprint 1:
  - User authentication (register / login / refresh / me) via /api/auth/*
  - Session ownership — sessions linked to user_id when authenticated
  - Database initialised on startup (SQLite / SQLAlchemy async)
  - /api/session/* routes refactored into session_router
  - All original calculation endpoints preserved unchanged
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from . import config
from .agent import agent
from .database import init_db
from .engines import component_engine, cost_engine, energy_engine, roadmap_engine, site_analysis
from .report_generator import generate_pdf_report
from .routers.auth_router import router as auth_router
from .routers.session_router import router as session_router
from .schemas import ChatRequest, ChatResponse, LoadInput, SiteInput
from .session_store import session_store
from .auth import get_current_user_optional


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="SolarAgent Pro API",
    version="2.0.0",
    description="Sprint 1: authentication added",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(session_router)


# ── Helpers ───────────────────────────────────────────────────────────────────
def _get_session(session_id: str):
    session = session_store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Unknown session_id.")
    return session


# ── Calculation endpoints (unchanged from v1) ─────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0-sprint1"}


@app.post("/api/session/{session_id}/site")
def submit_site(session_id: str, payload: SiteInput):
    session = _get_session(session_id)
    result = site_analysis.analyze_site(
        country=payload.country, city=payload.city, roof_type=payload.roof_type,
        roof_area_m2=payload.roof_area_m2, shading=payload.shading,
        building_type=payload.building_type,
    )
    session.site = payload.model_dump()
    session.site_analysis = result
    return result


@app.post("/api/session/{session_id}/load")
def submit_load(session_id: str, payload: LoadInput):
    session = _get_session(session_id)
    if session.site_analysis is None:
        raise HTTPException(status_code=400, detail="Submit site details first.")

    appliances = [a.model_dump() for a in payload.appliances]
    load = energy_engine.calculate_load(appliances)
    sizing = energy_engine.size_system(
        daily_energy_kwh=load["daily_energy_kwh"],
        psh=session.site_analysis["resource"]["psh"],
        system_mode=payload.system_mode,
        autonomy_days=payload.autonomy_days,
    )
    energy_result = {**load, **sizing, "system_mode": payload.system_mode}
    session.load_input = payload.model_dump()
    session.energy_result = energy_result

    design = component_engine.recommend_components(
        array_kw_needed=energy_result["array_kw_needed"],
        battery_kwh_needed=energy_result["battery_kwh_needed"],
        peak_load_w=energy_result["estimated_peak_load_w"],
        roof_type=session.site_analysis["roof_type"],
        roof_area_m2=session.site_analysis["roof_area_m2"],
        system_mode=payload.system_mode,
    )
    design["suitability"] = site_analysis.score_suitability(
        psh=session.site_analysis["resource"]["psh"],
        shading=session.site_analysis["shading"],
        roof_area_m2=session.site_analysis["roof_area_m2"],
        required_area_m2=design["panel"]["required_area_m2"],
    )
    session.design_result = design

    cost = cost_engine.estimate_cost(
        actual_array_kw=design["panel"]["actual_array_kw"],
        battery_kwh=(design["battery"] or {}).get("nominal_capacity_kwh", 0),
        tier=design["tier"],
        country=session.site_analysis["country"],
        psh=session.site_analysis["resource"]["psh"],
        tariff_usd_per_kwh=session.site_analysis["resource"]["tariff_usd_per_kwh"],
    )
    session.cost_result = cost

    roadmap = roadmap_engine.generate_roadmap(payload.system_mode)
    session.roadmap_result = roadmap

    return {
        "site_analysis": session.site_analysis,
        "energy": energy_result,
        "design": design,
        "cost": cost,
        "roadmap": roadmap,
    }


@app.post("/api/session/{session_id}/chat", response_model=ChatResponse)
def chat(session_id: str, payload: ChatRequest):
    session = _get_session(session_id)
    if not config.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured.")
    reply = agent.chat(session, payload.message)
    return {"reply": reply, "session_state": session.to_public_dict()}


@app.get("/api/session/{session_id}/report")
def get_report(session_id: str):
    session = _get_session(session_id)
    if session.design_result is None:
        raise HTTPException(status_code=400, detail="No completed plan yet.")
    pdf_bytes = generate_pdf_report(session)
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="SolarAgent_Report_{session_id}.pdf"'},
    )
