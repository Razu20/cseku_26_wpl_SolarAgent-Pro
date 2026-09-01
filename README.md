# SolarAgent Pro

An AI solar energy engineer: one conversation takes a homeowner or shop owner from
"I want solar" to a complete, realistic installation plan — site suitability, load
calculation, system sizing, exact components, cost range, and a step-by-step
installation roadmap.

This repo has two parts that share one engineering methodology:

- **`backend/`** — FastAPI service with five deterministic calculation engines
  (site/irradiance, load & sizing, components, cost, roadmap) plus a Claude-powered
  conversational agent that calls those same engines as tools.
- **`frontend/`** — React + Vite + Tailwind app: structured forms for site & load,
  a results dashboard, and a chat panel wired to the backend agent.

There's also a **standalone live demo** (`solaragent_pro_demo.jsx` at the repo root,
outside `frontend/`) that reimplements the same math in-browser with no backend
required — that's what you saw rendered directly in the chat. It's for trying the
concept immediately; the `backend/` + `frontend/` pair is the real, extensible
project.

## Week 1 documentation

This project follows a six-week AI-assisted development plan (see
`docs/SolarAgent_Pro_SRS_Week1.docx`, Section 1.6). Week 1's deliverables:

- **`docs/SolarAgent_Pro_SRS_Week1.docx`** (also provided as `.pdf`) — the full Software
  Requirements Specification and Project Initiation document: scope, objectives, roles,
  a six-week timeline, functional/non-functional requirements traced to the actual code,
  use cases, and system diagrams.
- **`docs/initial_task_list.md`** — the seed backlog for Week 2's GitHub Projects board.
- **`CONTRIBUTING.md`** and **`.github/PULL_REQUEST_TEMPLATE.md`** — repository
  contribution setup.

> The SRS's table of contents is a live Word field — it may show blank in a quick preview
> tool; open it in Microsoft Word (or press Ctrl+A then F9 in LibreOffice) and it will
> populate. This is standard behavior for any generated `.docx`, not a rendering error.

## Contributing

See `CONTRIBUTING.md` for branching strategy, commit conventions, and the PR checklist.
Short version: branch from `main`, open a PR, make sure any new number a user can see
comes from an engine function, not directly from the model.

## License

Not yet declared — add one (MIT is a common default for a project like this) before
treating this as open source.

## Quick start


**Backend**

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then paste your ANTHROPIC_API_KEY into .env
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` for interactive API docs (FastAPI generates this
automatically).

**Frontend** (separate terminal)

```bash
cd frontend
npm install
cp .env.example .env        # defaults to http://localhost:8000, change if needed
npm run dev
```

Visit `http://localhost:5173`.

Both were built and verified end-to-end while producing this project: the backend's
full request chain (site → load → design → cost → PDF report) was exercised with
real numbers, and the frontend was built with Vite to confirm every import and
component resolves cleanly.

## How the engines work

All five engines live in `backend/app/engines/` and use standard preliminary-design
formulas, not arbitrary numbers:

| Engine | Formula |
|---|---|
| **Sizing** | `array_kW = daily_kWh / (peak_sun_hours × 0.75 performance_ratio)` — the 0.75 covers inverter, wiring, soiling, and temperature losses, compounded. |
| **Peak load** | `max(explicitly-simultaneous loads, theoretical_max × 0.7 diversity_factor)` — real buildings rarely run every appliance at once. |
| **Battery** | `(daily_kWh × autonomy_days) / (0.9 depth_of_discharge × 0.95 round_trip_efficiency)`, sized for LiFePO4. |
| **Components** | Panel tier (budget/standard/premium) chosen by roof-area constraint; inverter sized off both peak load and array size; BOS list is a standard residential/commercial checklist. |
| **Cost** | USD-equivalent per-watt ranges with a regional multiplier, clearly labeled as planning-stage estimates, never a quote. |

The agent (`backend/app/agent.py`) never states a number that didn't come from one
of these functions — see `backend/app/system_prompt.py`, rule 4.

## Adding real weather APIs

Irradiance/tariff data currently comes from `backend/app/engines/site_analysis.py`'s
`REGIONS` table — a documented estimation model, which is what the original spec
allows ("mock realistic data"). To swap in a live source, you only need to change
`estimate_resource()` in that one file; every other engine only depends on the four
fields it returns:

```python
def estimate_resource(country: str, city: str) -> dict:
    return {
        "psh": ...,                  # peak sun-hours/day
        "latitude": ...,
        "avg_temp_c": ...,
        "tariff_usd_per_kwh": ...,
        "is_city_level_estimate": ...,
        "is_known_country": ...,
    }
```

Good real sources, roughly in order of effort:

- **[PVGIS](https://re.jrc.ec.europa.eu/pvg_tools/en/)** (EU JRC) — free, no API key,
  excellent coverage of Africa/Asia/Europe, exactly the kind of tool this project is
  modeled on. REST endpoint: `PVcalc` for monthly/annual irradiance by lat/lon.
- **[Solcast](https://solcast.com/)** — commercial, very high accuracy, needs an API
  key and has a free tier for testing.
- **[OpenWeatherMap Solar Irradiance API](https://openweathermap.org/api/solar-panels-and-hvac-api)**
  — needs an API key, good if you're already using OpenWeather for temperature/weather.

Whichever you choose, call it with `httpx` (already a transitive dependency via
`anthropic`), cache the response (irradiance doesn't change minute to minute — an
in-memory TTL cache or Redis is enough), and keep the same return shape above so
nothing downstream needs to change.

## What's a solid foundation vs. what real production needs

Everything above was actually run and checked while building it — the math is real,
the API contract is real, the PDF generates real content, the frontend build is
clean. That's different from "enterprise production-ready," and it's worth being
precise about the gap:

**Already solid:** calculation engines, tool-calling agent architecture, REST API,
PDF generation, the full frontend flow, dark/light mode, roof-photo upload.

**Would need work before a real deployment:**
- **Auth** — there's no login; sessions are unauthenticated and keyed by a random ID.
- **Persistence** — `session_store.py` is in-memory and explicit about it; swap for
  Redis or a database for anything multi-instance or restart-safe.
- **Live weather data** — see above.
- **Real supplier pricing** — cost figures are illustrative ranges, not live quotes.
- **Rate limiting / abuse protection** on the `/chat` endpoint (it calls a paid API).
- **Test suite** — the engines were exercised manually end-to-end during the build,
  not wrapped in `pytest`. They're pure functions with clear inputs/outputs, so this
  is a natural next step.
- **Deployment config** — no Dockerfile/CI here; both halves are standard
  FastAPI/Vite apps and deploy the normal way (Uvicorn behind a proxy, static build
  behind a CDN).

## Project structure

```
solaragent-pro/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI routes
│   │   ├── agent.py                # tool-calling conversational agent
│   │   ├── system_prompt.py        # the solar engineer's full system prompt
│   │   ├── session_store.py        # in-memory session state
│   │   ├── schemas.py              # Pydantic request/response models
│   │   ├── config.py
│   │   ├── report_generator.py     # PDF report (reportlab)
│   │   └── engines/
│   │       ├── site_analysis.py    # irradiance estimate + suitability score
│   │       ├── energy_engine.py    # load calc + system/battery sizing
│   │       ├── component_engine.py # panels/inverter/battery/BOS
│   │       ├── cost_engine.py      # cost range + payback
│   │       └── roadmap_engine.py   # install roadmap + safety + maintenance
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── context/SessionContext.jsx
│       └── components/
│           ├── SiteAnalysisForm.jsx
│           ├── LoadAnalysisForm.jsx
│           ├── ResultsDashboard.jsx
│           ├── ChatPanel.jsx
│           └── ThemeToggle.jsx
├── docs/
│   ├── example_conversations.md
│   └── sample_report.md
└── solaragent_pro_demo.jsx          # standalone single-file live demo
```

## Design system

The visual language is deliberately grounded in solar/electrical engineering rather
than generic dashboard defaults: deep dusk-navy + brass "solar" gold + circuit
copper + graphite steel, IBM Plex Sans for conversation, IBM Plex Mono for every
number and spec (so data always *reads* as data). The suitability score renders as
an analog site-instrument gauge rather than a progress bar. Full token list in
`frontend/tailwind.config.js`.

## Safety note

This tool produces **planning-stage** estimates. Final designs should be validated
by a licensed electrician/engineer against local code before any purchase or
installation — the agent is instructed to say this whenever wiring, grid
connection, or permits come up, and it's worth repeating here.
