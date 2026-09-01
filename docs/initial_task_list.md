# Initial Task List — Week 1 Output

Seed backlog for the GitHub Projects board Week 2 sets up. Each item below is written
to be copy-pasted directly into a GitHub Issue (title + labels suggested). Status
reflects what's actually true as of this document, not a plan — several Sprint-1/2 items
were completed ahead of schedule because the AI-assisted build produced working code
during the initiation-phase scoping conversation (see SRS Section 1.6).

Labels used: `epic`, `engine`, `agent`, `frontend`, `docs`, `infra`, `good-first-issue`

---

## Done (Week 1)

- [x] **[epic] Site analysis engine** — irradiance/tariff estimation model + suitability
  scoring. `engine` `docs/SolarAgent_Pro_SRS_Week1.docx §2.3 FR-1`
- [x] **[epic] Load & sizing engine** — daily energy, peak load, array/battery sizing.
  `engine` `FR-2, FR-3`
- [x] **[epic] Component recommendation engine** — panel/inverter/battery/mounting/BOS.
  `engine` `FR-4`
- [x] **[epic] Cost engine** — installed-cost range, payback. `engine` `FR-5`
- [x] **[epic] Installation roadmap engine** — phased plan, safety, maintenance. `engine` `FR-6`
- [x] **[epic] Tool-calling conversational agent** — Claude + Anthropic Messages API,
  grounded in engine output. `agent` `FR-7`
- [x] **[epic] React frontend** — site/load forms, results dashboard, chat panel,
  dark/light theme. `frontend` `FR-9, FR-10`
- [x] **[epic] PDF/HTML report generation** — reportlab (backend), HTML export (live
  demo). `frontend` `engine` `FR-8`
- [x] **[task] README with setup instructions** `docs`
- [x] **[task] Example conversation flows (docs/example_conversations.md)** `docs`
- [x] **[task] Sample report (docs/sample_report.md)** `docs`
- [x] **[task] This SRS & Project Initiation document, with diagrams** `docs`
- [x] **[task] CONTRIBUTING.md + PR template** `docs` `infra`

## Not Started — Week 2 (Design & Planning)

- [ ] **[epic] UI wireframes** for each screen (site form, load form, dashboard, chat) —
  even though the UI is built, retroactive wireframes are useful onboarding artifacts.
  `frontend` `docs`
- [ ] **[epic] Architecture diagrams** — ER diagram for session state, sequence diagram
  for a full chat-driven tool-call round trip. `docs` `good-first-issue`
- [ ] **[task] Configure GitHub Projects board** — import this file's items as issues,
  set up Todo / In Progress / Done columns. `infra`

## Not Started — Weeks 3–6 (Hardening)

- [ ] **[epic] Automated test suite for the five engines** — they're pure functions, so
  this is close to a `good-first-issue`: assert known input → known output for a handful
  of representative cases (a Khulna hybrid shop, a Rajshahi off-grid house, etc. — real
  validated numbers are already in `docs/example_conversations.md`). `engine` `test`
- [ ] **[epic] Authentication** — no login exists yet; sessions are unauthenticated random
  IDs. `backend` `infra`
- [ ] **[epic] Persistent session store** — swap the in-memory `SessionStore` for Redis or
  a database; the seam is already isolated (`backend/app/session_store.py`). `backend`
- [ ] **[epic] Rate limiting on `/chat`** — it calls a paid API; needs abuse protection
  before any public deployment. `backend` `infra`
- [ ] **[task] Live weather API integration** — swap `estimate_resource()` in
  `engines/site_analysis.py` for PVGIS/Solcast/OpenWeather (see README "Adding real
  weather APIs" for the exact seam). `engine`
- [ ] **[task] Deployment config** — Dockerfile(s) + basic CI (lint/build on PR). `infra`

---

### How to import into GitHub

Each `[epic]`/`[task]` line above maps to one Issue. Suggested workflow: `gh issue create
--title "..." --label "engine,epic"` per line, or paste this file into a GitHub Project's
bulk-add view if your plan supports it.
