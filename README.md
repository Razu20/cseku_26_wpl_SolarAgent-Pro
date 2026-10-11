# SolarAgent Pro

## AI-Guided Solar Energy Consultation and Sizing System

SolarAgent Pro is an AI-guided solar energy consultation and system-sizing platform designed to transform an initial request such as **“I want solar”** into a structured, numerically grounded solar installation plan.

The system combines a conversational AI agent with deterministic engineering calculation engines. The AI agent is responsible for understanding user requirements, orchestrating the engineering tools, explaining results, and guiding the user through the process. Numeric engineering outputs are produced by deterministic calculation engines rather than being directly invented by the language model.

---

# 1. Academic and Project Information

| Item               | Information                                                         |
| ------------------ | ------------------------------------------------------------------- |
| Course Code        | 0714 02 CSE 4202                                                    |
| Course Title       | Web Programming & Mobile Application Development                    |
| Institution        | Computer Science & Engineering Discipline, Khulna University        |
| Project            | SolarAgent Pro                                                      |
| Deliverable        | Week 1 Deliverable - Initiation & SRS                               |
| Student 1          | Md. Sayem Hossian - 220217                                          |
| Student 2          | Razu Sarder - 220220                                                |
| Supervisor         | Dr. Kazi Masudul Alam, Professor, CSE Discipline, Khulna University |
| Documentation Date | August 18, 2026                                                     |

The original project documentation identifies the project as a CSE 4202 deliverable and assigns the project to the two listed students under the stated supervisor.

---

# 2. Vision

SolarAgent Pro aims to make preliminary solar-system planning accessible to homeowners and small shop owners who may not have prior solar-engineering knowledge.

Instead of requiring a user to understand:

- photovoltaic sizing,
- peak sun hours,
- battery capacity,
- depth of discharge,
- inverter sizing,
- component selection,
- installation requirements,
- cost estimation,

the system provides a guided workflow through which the user supplies understandable information and receives an engineering-oriented recommendation.

The platform is therefore designed around the principle:

> **Complex engineering calculations should be hidden behind a simple conversational experience while remaining auditable underneath.**

---

# 3. Core Design Principle

SolarAgent Pro follows a strict separation between:

### AI reasoning

The AI agent handles:

- natural-language interaction,
- user requirement interpretation,
- clarification,
- tool selection,
- result explanation,
- conversational recommendations,
- report narration.

### Deterministic engineering

The calculation engines handle:

- site suitability,
- energy demand,
- peak load,
- PV sizing,
- battery sizing,
- component selection,
- cost estimation,
- payback estimation,
- installation roadmap generation.

The uploaded specification explicitly defines this separation and requires numeric outputs to trace back to inspectable engineering calculations.

---

# 4. Project Objectives

## O1 - Low Barrier to Entry

Reduce the expertise barrier from requiring a site engineer for an initial assessment to a guided digital consultation.

## O2 - Auditable Results

Ensure that energy, system sizing, component, cost, and payback results originate from explicit calculation logic.

## O3 - Rapid Deployment

Provide a full-stack reference implementation using Express, TypeScript, React, and Vite that can be run locally with a relatively small setup process.

## O4 - Rigorous Documentation

Maintain academic-standard technical documentation, architecture diagrams, repository structure, contribution rules, and development methodology.

## O5 - Repeatable AI Lifecycle

Demonstrate the Agentic Engineering Development Lifecycle (AEDL) through a structured six-week development process.

These objectives are carried forward from the original project specification.

---

# 5. Target Users

## 5.1 Homeowners

Users interested in determining whether solar power is appropriate for their residence.

Typical requirements include:

- household appliance loads,
- roof characteristics,
- available roof area,
- desired backup duration,
- budget,
- grid availability.

## 5.2 Small Shop Owners

Users operating small commercial spaces that require:

- daytime solar generation,
- backup power,
- refrigeration,
- lighting,
- fans,
- computers,
- networking equipment,
- other small commercial loads.

## 5.3 Academic Evaluators

The system also serves as a demonstrable academic project showing:

- AI-agent integration,
- deterministic engineering computation,
- full-stack development,
- REST API design,
- report generation,
- software architecture,
- AI-assisted development methodology.

---

# 6. Major Functional Requirements

SolarAgent Pro is organized around nine major functional areas plus interface customization.

| Requirement | Module                   | Purpose                                       |
| ----------- | ------------------------ | --------------------------------------------- |
| FR-1        | Site Analysis            | Evaluate solar-site suitability               |
| FR-2        | Energy & Peak Load       | Calculate consumption and peak demand         |
| FR-3        | Array & Battery Sizing   | Determine PV and battery requirements         |
| FR-4        | Component Recommendation | Produce component BOM                         |
| FR-5        | Cost & Payback           | Estimate cost, savings and payback            |
| FR-6        | Roadmap & Safety         | Produce installation and maintenance guidance |
| FR-7        | Conversational Agent     | Orchestrate the complete workflow             |
| FR-8        | Report Generation        | Produce PDF/HTML reports                      |
| FR-9        | Visual Roof Context      | Accept optional roof photographs              |
| FR-10       | Theme Customization      | Support dark/light UI themes                  |

The original SRS maps these requirements to the corresponding project modules.

---

# 7. System Workflow

The overall workflow is:

```text
User
  |
  v
Initial Solar Requirement
  |
  v
Site & Building Information
  |
  v
Site Analysis Engine
  |
  v
Energy & Peak Load Analysis
  |
  v
PV + Battery Sizing
  |
  v
Component Recommendation
  |
  v
Cost & Payback Estimation
  |
  v
Installation & Safety Roadmap
  |
  v
AI Agent Explanation
  |
  v
Dashboard + Downloadable Report
```

The AI agent coordinates this workflow through tool calls rather than independently generating engineering figures.

---

# 8. User Input Model

SolarAgent Pro is designed to collect information from the user through structured forms and conversational interaction.

## 8.1 Location Information

Potential inputs include:

- country,
- city/region,
- address,
- optional geographic coordinates.

## 8.2 Building Information

Potential inputs include:

- building type,
- roof type,
- available roof area,
- roof orientation,
- roof tilt,
- shading conditions,
- nearby trees,
- nearby buildings.

## 8.3 Electrical Load Information

Users can provide appliance inventories such as:

- appliance name,
- quantity,
- rated power,
- operating hours,
- expected usage pattern.

## 8.4 Solar Requirement

The system can use requirements such as:

- desired backup,
- battery autonomy target,
- grid availability,
- solar preference,
- budget constraints.

## 8.5 Optional Roof Photograph

The frontend can accept a roof photograph as additional visual context for the conversational agent. The original specification identifies this as FR-9.

---

# 9. Site Analysis Engine

File:

```text
apps/backend/src/services/engineering.ts
```

The Site Analysis Engine evaluates the suitability of the proposed location for solar deployment.

The current project specification states that it estimates:

- Peak Sun Hours (PSH),
- temperature,
- tariffs,
- overall suitability score,
- contributing suitability factors.

The suitability score is represented on a 0–100 scale.

## Example Output Structure

```json
{
  "peak_sun_hours": 4.8,
  "temperature": 29,
  "tariff": 10.5,
  "suitability_score": 86,
  "factors": {
    "solar_resource": "high",
    "shading": "low",
    "roof_condition": "good",
    "orientation": "acceptable"
  }
}
```

The exact production values and formulas should be taken from the implementation of `site_analysis.py`; this documentation does not invent a formula that is not present in the supplied specification.

---

# 10. Energy and Peak Load Engine

File:

```text
apps/backend/src/services/engineering.ts
```

The Energy Engine converts an appliance inventory into an estimated electrical demand profile.

Its responsibilities include:

- aggregating appliance consumption,
- estimating daily energy demand,
- calculating peak load,
- applying diversity factors,
- supporting subsequent PV and battery sizing.

The SRS identifies this functionality as FR-2.

## Conceptual Energy Calculation

For an appliance:

```text
Daily Energy = Power × Quantity × Operating Hours
```

with appropriate unit conversion where required.

For multiple appliances:

```text
Total Daily Energy =
Σ Appliance Daily Energy
```

The actual implementation may apply additional factors, and the source documentation specifically states that diversity factors are used for peak-load computation.

---

# 11. Peak Load Calculation

Peak load is important because the inverter must be capable of supplying the required simultaneous electrical demand.

Conceptually:

```text
Peak Load =
Σ Simultaneously Active Appliance Loads
```

A diversity factor can then be applied according to the implemented engineering model.

The resulting peak-load value is used as an input to the system-design and inverter-selection process.

---

# 12. PV Array Sizing

SolarAgent Pro determines PV array capacity using site solar availability and the calculated energy requirement.

The project specification explicitly identifies:

- PSH,
- PV array capacity in kWp,
- energy demand,

as core inputs/outputs of the sizing process.

A conceptual sizing relationship is:

```text
PV Capacity ∝
Daily Energy Requirement / Available Solar Resource
```

The exact derating, efficiency, loss, and sizing assumptions must remain aligned with the implementation of the engine.

---

# 13. Battery Sizing

Battery sizing is performed using:

- required storage,
- Depth of Discharge (DoD),
- autonomy target.

The project specification explicitly identifies battery sizing as part of FR-3.

A conceptual relationship is:

```text
Required Battery Capacity
    ≈
Required Stored Energy
    / Allowable Depth of Discharge
```

Additional conversion losses and design margins should be applied according to the actual implementation.

---

# 14. Component Recommendation Engine

File:

```text
apps/backend/src/services/engineering.ts
```

The Component Engine generates a Bill of Materials (BOM).

The documented component categories include:

- solar panels,
- inverter,
- LiFePO4 battery bank,
- mounting system,
- Balance of System (BOS).

The engine is responsible for converting the calculated system requirement into a practical component configuration.

## Example BOM

```text
Solar Panels
├── Panel tier
├── Panel rating
└── Required quantity

Inverter
├── Recommended capacity
└── System type

Battery
├── Chemistry: LiFePO4
├── Required capacity
└── Recommended configuration

Mounting
├── Roof mounting
└── Associated hardware

BOS
├── Protection
├── Wiring
└── Other required system components
```

---

# 15. Cost and Payback Engine

File:

```text
apps/backend/src/services/engineering.ts
```

The Cost Engine estimates:

- total installed cost,
- cost range,
- annual energy yield,
- annual savings,
- simple payback horizon.

These functions constitute FR-5 in the original project specification.

## Conceptual Payback

```text
Simple Payback
=
Initial Installed Cost
/
Estimated Annual Savings
```

The actual implementation should be treated as the authoritative source for all final numerical results.

---

# 16. Roadmap and Safety Engine

File:

```text
apps/backend/src/services/engineering.ts
```

The Roadmap Engine transforms the design into an implementation-oriented plan.

Its documented responsibilities include:

- phased installation steps,
- safety warnings,
- common pitfalls,
- maintenance schedules.

This corresponds to FR-6.

## Example Roadmap

```text
Phase 1 — Site Verification
    ↓
Phase 2 — Final Electrical Design
    ↓
Phase 3 — Component Procurement
    ↓
Phase 4 — Mounting Installation
    ↓
Phase 5 — Electrical Installation
    ↓
Phase 6 — Commissioning
    ↓
Phase 7 — Monitoring & Maintenance
```

---

# 17. Conversational AI Agent

Files:

```text
apps/backend/src/routes/recommendations.ts
apps/backend/src/services/engineering.ts
```

The conversational agent uses the Anthropic Claude Messages API.

Its primary responsibilities are:

1. Understand the user's request.
2. Identify missing information.
3. Request required information.
4. Select appropriate engineering tools.
5. Execute deterministic calculations.
6. Interpret returned results.
7. Explain results to the user.
8. Coordinate the complete solar-planning workflow.

The original specification explicitly states that the agent must not state figures that were not returned by tool execution.

---

# 18. AI Agent Safety Principle

The agent should follow this rule:

```text
LLM
 |
 |---- User interpretation
 |
 |---- Tool selection
 |
 v
Deterministic Engine
 |
 |---- Numeric calculation
 |
 v
Tool Result
 |
 v
LLM explanation
```

It should **not** follow this unsafe pattern:

```text
User
  |
  v
LLM
  |
  v
Invented Solar System Numbers
```

This architecture is one of the project's most important engineering principles.

---

# 19. Report Generation

File:

```text
Report generation remains a planned extension of the current API baseline.
```

The system supports downloadable reports.

The documented implementation uses:

```text
ReportLab
```

for PDF generation and also supports HTML reports.

## Proposed Report Structure

```text
SolarAgent Pro Report

1. Executive Summary
2. Site Information
3. Solar Suitability
4. Energy Consumption
5. Peak Load
6. PV System Design
7. Battery Design
8. Component BOM
9. Cost Estimate
10. Savings & Payback
11. Installation Roadmap
12. Safety Recommendations
13. Maintenance Plan
14. Assumptions
15. Disclaimer
```

---

# 20. Frontend Architecture

The current frontend is implemented using:

- React,
- Vite,
- React Router,
- TypeScript.

The documented frontend contains components, context/state management, API communication, and the main application entry points.

## Frontend Responsibilities

```text
Vite + React Application
│
├── Landing page
├── Dashboard
├── Leads
├── Projects
├── Engineering
├── Inventory
├── Tickets
├── Recommendations
├── Monitoring
└── Audit explorer
```

---

# 21. Backend Architecture

The current backend uses:

```text
Express + TypeScript
```

Its responsibilities include:

- REST API endpoints,
- request validation,
- request validation with Zod,
- deterministic engineering execution,
- domain CRUD APIs,
- RBAC and audit primitives,
- Drizzle/PostgreSQL schema and migrations.

The current CRUD store is in memory for local development. The Drizzle schema and generated migration provide the persistence boundary for PostgreSQL/PostGIS deployment.

---

# 22. Overall Architecture

```text
+-------------------------------------------------------------+
|                         USER LAYER                          |
|                                                             |
|                 Homeowner / Shop Owner / Evaluator          |
+-------------------------------+-----------------------------+
                                |
                                | User Inputs
                                v
+-------------------------------------------------------------+
|                    REACT FRONTEND                           |
|                                                             |
| Forms | Dashboard | Chat | Theme | Report Download          |
+-------------------------------+-----------------------------+
                                |
                                | REST API
                                v
+-------------------------------------------------------------+
|                    EXPRESS BACKEND                          |
|                                                             |
| API Routes | Session Store | Agent | Report Generator       |
+-------------------------------+-----------------------------+
                                |
                                v
+-------------------------------------------------------------+
|              DETERMINISTIC ENGINE LAYER                     |
|                                                             |
| Site Analysis                                                |
| Energy & Peak Load                                           |
| PV & Battery Sizing                                          |
| Component Recommendation                                     |
| Cost & Payback                                               |
| Roadmap & Safety                                             |
+-------------------------------+-----------------------------+
                                ^
                                |
                                | Tool Results
                                |
+-------------------------------------------------------------+
|             ANTHROPIC CLAUDE MESSAGES API                   |
|                                                             |
| Conversational Reasoning + Tool Orchestration                |
+-------------------------------------------------------------+
```

The current architecture separates the React frontend, Express backend, deterministic services, and external conversational layer.

---

# 23. Repository Structure

```text
solaragent-pro/
│
├── apps/
│   ├── backend/
│   │   ├── src/routes/
│   │   ├── src/services/
│   │   ├── src/db/schema.ts
│   │   ├── src/store.ts
│   │   ├── src/index.ts
│   │   ├── drizzle.config.ts
│   │   └── drizzle/
│   └── web/
│       └── src/
│           ├── pages/
│           ├── main.tsx
│           └── styles.css
│
├── docs/
│   ├── SolarAgent_Pro_SRS_Week1.pdf
│   ├── initial_task_list.md
│   ├── example_conversations.md
│   └── sample_report.md
│
├── live-demo/
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

This structure follows the repository organization supplied in the original documentation.

---

# 24. API Layer

The Express backend exposes REST endpoints for communication between the frontend and backend.

## Development endpoints

Backend base URL:

```text
http://localhost:4000
```

Health check:

```text
GET /health
```

Core routes:

```text
POST/GET /api/v1/leads
POST/GET /api/v1/sites
POST/GET /api/v1/recommendations
POST/GET /api/v1/engineering
POST/GET /api/v1/quotes
POST/GET /api/v1/projects
GET       /api/v1/sites/:id/monitoring
POST/GET /api/v1/tickets
GET       /api/v1/audit
```

Operational CRUD routes:

```text
/api/v1/utilities
/api/v1/inventory
/api/v1/work-orders
/api/v1/nem-applications
/api/v1/devices
```

The operational routes support `GET`, `POST`, `PATCH`, and `DELETE` where applicable. Request bodies are validated with Zod.

---

# 25. Frontend–Backend Communication

The conceptual communication flow is:

```text
React + Vite
  |
  | HTTP Request
  v
Express
  |
  +---- Validate Request
  |
  +---- Update Session
  |
  +---- Invoke Agent
  |
  +---- Execute Engineering Tools
  |
  +---- Generate Response
  |
  v
JSON Response
  |
  v
React Dashboard
```

---

# 26. Session Management

The current local implementation uses an:

```text
In-Memory SessionStore
```

This is appropriate for the initial development/reference implementation.

For a production deployment, persistent storage can later be introduced, but such persistence is identified in the development roadmap rather than being treated as an already completed feature.

---

# 27. Theme Customization

The frontend supports:

- light theme,
- dark theme.

Theme management is handled through the frontend context/provider architecture.

This functionality is identified as FR-10 in the project specification.

---

# 28. Visual Roof Context

The platform supports optional roof-image input.

The intended workflow is:

```text
User uploads roof photograph
            |
            v
Frontend
            |
            v
Backend
            |
            v
AI Agent Visual Context
            |
            v
Additional conversational context
```

This feature should be considered contextual assistance rather than a replacement for professional physical site inspection.

---

# 29. Engineering Traceability

Every important numeric result should have a traceable origin.

```text
User Input
    |
    v
Validated Data
    |
    v
Deterministic Engine
    |
    v
Calculation
    |
    v
Structured Result
    |
    v
AI Explanation
```

For example:

```text
Appliance Data
      ↓
Energy Engine
      ↓
Daily kWh
      ↓
PV Sizing
      ↓
PV kWp
      ↓
Component Engine
      ↓
Panel + Inverter + Battery BOM
      ↓
Cost Engine
      ↓
Cost + Savings + Payback
```

This traceability is a central quality requirement of the project.

---

# 30. Configuration

Create a `.env` file when using PostgreSQL or other external services:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/solaragent
PORT=4000
```

The backend reads `DATABASE_URL` for Drizzle migrations. The default value targets a local PostgreSQL instance. A live PostgreSQL/PostGIS service is required to apply migrations.

If AI provider integration is enabled later, keep its credential in the backend environment only:

```text
ANTHROPIC_API_KEY
```

The API key should be stored only in the backend environment and must never be exposed to the React client.

---

# 31. Backend Installation

## Requirements

The current backend requires:

```text
Node.js 20+
npm
```

## Setup

```bash
npm install
npm run dev --workspace apps/backend
```

The backend is available at:

```bash
http://localhost:4000
```

---

# 32. Frontend Installation

The current frontend requires:

```text
Node.js 20+
npm
```

as frontend prerequisites.

Run:

```bash
npm install
npm run dev --workspace apps/web
```

The development frontend is available at:

```text
http://localhost:5173
```

---

# 33. Local Development Environment

After starting both services:

```text
Frontend
http://localhost:5173

        |
        | REST API
        v

Backend
http://localhost:4000

    |
    +---- Health
      /health
```

The local development ports are 5173 for Vite and 4000 for Express.

To start both applications from the workspace root:

```bash
npm run dev
```

---

# 34. Example User Journey

## Step 1 — User Starts Consultation

```text
User:
I want to install solar for my house.
```

## Step 2 — Agent Collects Site Information

The agent requests the required site and building information.

## Step 3 — Site Analysis

The Site Analysis Engine evaluates the available site information.

## Step 4 — Load Assessment

The user provides appliance information.

Example:

```text
5 LED lights
3 fans
1 refrigerator
1 television
1 router
1 laptop
```

The Energy Engine calculates the resulting energy requirement and peak load.

## Step 5 — System Sizing

The sizing engine calculates the required:

```text
PV capacity
Battery capacity
```

## Step 6 — Components

The Component Engine generates:

```text
Panels
Inverter
Battery
Mounting
BOS
```

## Step 7 — Financial Analysis

The Cost Engine produces:

```text
Installed cost range
Estimated annual savings
Simple payback
```

## Step 8 — Installation Roadmap

The Roadmap Engine produces the implementation and maintenance guidance.

## Step 9 — AI Explanation

Claude explains the engineering results in natural language.

## Step 10 — Report

The user can obtain the structured PDF/HTML report.

---

# 35. Example Structured Result

A possible structured backend response can follow this conceptual model:

```json
{
  "site": {
    "suitability_score": 86,
    "peak_sun_hours": 4.8
  },
  "energy": {
    "daily_consumption_kwh": 8.2,
    "peak_load_w": 1450
  },
  "system": {
    "pv_capacity_kwp": 2.5,
    "battery_capacity_kwh": 5.0
  },
  "components": {
    "panels": {},
    "inverter": {},
    "battery": {},
    "mounting": {},
    "bos": {}
  },
  "financial": {
    "installed_cost": {},
    "annual_savings": {},
    "payback_years": {}
  },
  "roadmap": []
}
```

The exact schema should be finalized against the implementation and API models.

---

# 36. Testing Strategy

The project should test each deterministic engine independently before testing the complete agent workflow.

## Unit Testing

Test:

```text
site_analysis.py
energy_engine.py
component_engine.py
cost_engine.py
roadmap_engine.py
```

## Integration Testing

Verify:

```text
Frontend
  ↓
Express API
   ↓
Agent
   ↓
Tools
   ↓
Response
```

## Agent Testing

Verify that:

- the agent calls the appropriate tools,
- missing information is requested,
- numeric values originate from tools,
- tool failures are handled,
- unsupported assumptions are not presented as facts.

---

# 37. Numeric Integrity Tests

A critical test category is numeric integrity.

For every numeric result:

```text
Expected Result
      =
Deterministic Engine Result
```

and not:

```text
Expected Result
      =
LLM-generated approximation
```

The project's contribution/review standard explicitly requires numeric results to derive from pure engine functions under `engines/*.py`.

---

# 38. Error Handling

The system should gracefully handle:

### Missing user input

```text
Required information is missing.
```

The agent should request the missing information.

### Invalid numerical input

Examples:

```text
Negative appliance power
Negative operating hours
Invalid roof area
Invalid battery parameters
```

These should be rejected by backend validation.

### AI API failure

The system should return a controlled error rather than presenting fabricated engineering results.

### Engine failure

The agent should report that the calculation could not be completed instead of guessing.

### Report-generation failure

The calculation results should remain available even if PDF generation fails.

---

# 39. Security Considerations

## API Key Protection

Never expose:

```text
ANTHROPIC_API_KEY
```

to the frontend.

## Input Validation

All client-provided values should be validated on the backend.

## File Upload Security

Roof-image uploads should be:

- type validated,
- size limited,
- safely processed,
- prevented from becoming executable content.

## API Security

Production deployment should introduce appropriate:

- authentication,
- authorization,
- rate limiting,
- CORS restrictions,
- HTTPS,
- secret management.

These production controls are recommended architectural hardening measures and are not represented as already completed functionality in the supplied Week 1 document.

---

# 40. Engineering Limitations

SolarAgent Pro is intended as an intelligent preliminary solar consultation and sizing system.

Its outputs should not automatically be interpreted as a final construction-ready engineering design.

Final deployment should consider professional verification of:

- structural roof capacity,
- electrical protection,
- cable sizing,
- earthing,
- local electrical regulations,
- utility requirements,
- installation conditions,
- equipment availability,
- actual site measurements.

The system should therefore distinguish between:

```text
AI-assisted preliminary design
```

and:

```text
Professional final engineering approval
```

# 41. Current Development Status

The supplied project roadmap defines the following status:

````text
Week 1 — Initiation & SRS
        DELIVERED

Week 2 — Design & Planning
        PLANNED

Weeks 3–4 — Development Sprint 1
        PLANNED

Weeks 5–6 — Development Sprint 2
        PLANNED

Week 1 covers requirements, engines, and initial scaffolding. Week 2 focuses on design and planning. Weeks 3–4 focus on core development, while Weeks 5–6 focus on hardening, session persistence, and packaging.


# 42. Agentic Engineering Development Lifecycle

SolarAgent Pro follows the:

## AEDL — Agentic Engineering Development Lifecycle

The methodology treats AI as a development collaborator while retaining human ownership over:

* architecture,
* engineering decisions,
* code review,
* validation,
* final acceptance.

The six-week lifecycle is:

```text
Week 1
Initiation & SRS
       ↓
Week 2
Design & Planning
       ↓
Weeks 3–4
Development Sprint 1
       ↓
Weeks 5–6
Development Sprint 2
       ↓
Final Hardening & Packaging


# 43. Git Workflow

The project follows:

```text
GitHub Flow
````

with:

```text
main
```

maintained as the clean and runnable branch.

Feature branches use:

```text
feature/<feature-name>
```

Example:

```text
feature/battery-sizing
```

Bug fixes:

```text
fix/<bug-name>
```

Example:

```text
fix/tariff-rounding
```

---

# 44. Current Implementation Reference

The repository currently contains a working TypeScript full-stack baseline. The implementation is organized as an npm workspace:

```text
apps/backend   Express API, Zod validation, engineering services, CRUD store, Drizzle schema
apps/web       Vite + React application with routed operational pages
docs           Implementation traceability and project documentation
```

## Frontend routes

The Vite application currently exposes:

```text
/                  Landing page
/dashboard         Operations dashboard
/leads             Lead pipeline
/projects          Project list
/engineering       Engineering metrics
/inventory         Inventory overview
/tickets           Service tickets
/recommendations  Recommendation workbench
/monitoring        Fleet monitoring
/audit             Audit explorer
```

## Backend CRUD domains

The backend store and API route layer cover:

```text
Leads, sites, recommendations, engineering results
Projects, tickets, contacts, opportunities
Products, quotes, surveys
Utilities, inventory items, work orders
NEM applications, monitoring devices
```

The survey, product, quote, utility, inventory, work-order, NEM, and device APIs are available under `/api/v1` and support validated create, list, retrieve, update, and delete operations.

## Workspace commands

Run these commands from the repository root:

```bash
npm install
npm run dev        # start backend and frontend together
npm test           # run Vitest
npm run typecheck  # check backend and frontend TypeScript
npm run lint       # run ESLint
npm run build      # build both applications
npm run generate   # generate Drizzle SQL migration
npm run migrate    # apply migration to DATABASE_URL
npm run migrate:shop # apply the marketplace compatibility migration
npm run seed:marketplace # seed marketplace companies, categories, products, and packages
```

The generated migrations are located at:

```text
apps/backend/drizzle/
```

The migration can be generated without a database. Applying it requires a reachable PostgreSQL/PostGIS instance configured through `DATABASE_URL`. Admin utility/product CRUD and customer lead CRUD now use PostgreSQL through Drizzle; some legacy domains still use the in-memory store.

For a fresh local database:

```bash
copy .env.example .env
npm run migrate
npm run seed
```

The seed command is idempotent and creates sample leads, a utility, and catalog products for the admin and customer workspaces.

## Admin and customer workspaces

The admin workspace is available at `/admin` and provides database-backed utility and product management. The customer portal is available at `/customer` and provides project progress, package details, and a database-backed site-assessment request form.

## Verified baseline

The current baseline has passed the automated test suite, backend and frontend TypeScript checks, ESLint, and Drizzle migration generation. Live database execution, PostGIS-specific geometry operations, production authentication, and deployment configuration remain environment-dependent work.

Documentation:

```text
docs/<topic>
```

Example:

```text
docs/update-architecture
```

# 44. Commit Convention

The project follows Conventional Commits.

Supported prefixes include:

feat:
fix:
docs:
refactor:
test:
chore:

````

Examples:

```bash
feat: add battery sizing engine
````

```bash
fix: correct inverter capacity calculation
```

```bash
docs: update architecture documentation
```

````bash
test: add energy engine test cases

The supplied contribution guidelines define these commit categories.

# 45. Pull Request Quality Gate

Every pull request should verify:

[ ] Code follows project structure
[ ] Deterministic engines remain isolated
[ ] Numeric outputs originate from engines
[ ] API behavior is tested
[ ] Frontend behavior is verified
[ ] AI tool calls are validated
[ ] Documentation is updated
[ ] No secrets are committed
[ ] Tests pass

The most important project-specific quality gate is that generative AI must not directly fabricate solar-sizing figures.

# 46. Documentation Set

The repository documentation is organized into:

README.md
    |
    +-- Project overview
    +-- Architecture
    +-- Quick start
    +-- Contribution rules

docs/
    |
    +-- SolarAgent_Pro_SRS_Week1.pdf
    +-- initial_task_list.md
    +-- example_conversations.md
    +-- sample_report.md

The original repository specification identifies these documentation artifacts.

# 47. Recommended Documentation Expansion

As development progresses, the following documentation can be added:

docs/
├── architecture.md
├── api.md
├── engineering-methodology.md
├── calculation-model.md
├── database-schema.md
├── testing.md
├── deployment.md
├── security.md
├── troubleshooting.md
└── changelog.md

These should be updated alongside the actual implementation rather than documenting functionality that does not yet exist.

# 48. Production Evolution

The current architecture provides a strong reference implementation. A production-oriented version can evolve toward:

Current
Express + TypeScript
+
Vite + React
+
In-memory sessions
+
Claude
+
Deterministic engines

                ↓

Production
Express + TypeScript
+
Vite + React
+
Persistent database
+
Authentication
+
Cloud object storage
+
Monitoring
+
Structured logging
+
Background jobs
+
Production deployment

The exact production infrastructure should be selected according to deployment requirements.

# 49. Future Extensions

Potential future capabilities include:

## Advanced Solar Resource Data

Integrate authoritative external solar-resource datasets or APIs.

## Geographic Analysis

Use latitude/longitude to improve site-specific solar calculations.

## Roof Geometry

Add more detailed roof-area and orientation analysis.

## Image-Assisted Roof Analysis

Use computer vision to identify:

* roof regions,
* obstacles,
* shading,
* approximate usable roof area.

## Real-Time Equipment Catalog

Connect component recommendations to a maintained equipment database.

## Persistent User Profiles

Allow users to save and compare multiple solar designs.

## Monitoring Integration

Connect the planning platform with deployed solar systems.

## Mobile Application

Extend the React-based experience into a dedicated mobile interface.

These are future directions, not claims about already implemented functionality.

# 50. Engineering Data Flow

The complete engineering data flow is:

                  USER
                   |
                   v
        +----------------------+
        | Input Collection     |
        +----------+-----------+
                   |
                   v
        +----------------------+
        | Site Analysis        |
        +----------+-----------+
                   |
                   v
        +----------------------+
        | Load Analysis        |
        +----------+-----------+
                   |
                   v
        +----------------------+
        | PV/Battery Sizing    |
        +----------+-----------+
                   |
                   v
        +----------------------+
        | Component Selection  |
        +----------+-----------+
                   |
                   v
        +----------------------+
        | Cost & Payback       |
        +----------+-----------+
                   |
                   v
        +----------------------+
        | Roadmap & Safety     |
        +----------+-----------+
                   |
                   v
        +----------------------+
        | AI Explanation       |
        +----------+-----------+
                   |
                   v
        +----------------------+
        | Dashboard / Report   |
        +----------------------+

# 51. AI Tool-Calling Model

Conceptually, the agent operates as:

```text
User Message
     |
     v
Claude
     |
     | Determine required calculation
     v
Tool Selection
     |
     +---- site_analysis
     |
     +---- energy_engine
     |
     +---- sizing
     |
     +---- component_engine
     |
     +---- cost_engine
     |
     +---- roadmap_engine
     |
     v
Tool Result
     |
     v
Claude
     |
     v
Human-readable Explanation

This architecture ensures that the language model acts primarily as an intelligent orchestrator and communication layer.

# 52. Design Philosophy

SolarAgent Pro follows five important principles:

### 1. Explainability

The user should understand where important results originate.

### 2. Determinism

The same validated input should produce reproducible engineering calculations.

### 3. Separation of Concerns

AI reasoning and engineering computation remain separate.

### 4. Accessibility

Users without solar-engineering expertise should still be able to interact with the system.

### 5. Human Oversight

The system assists engineering decisions rather than replacing qualified professional verification.

# 53. Project Success Criteria

The project can be considered successful when it can demonstrate:

```text
User
 ↓
Provides site information
 ↓
Provides appliance/load information
 ↓
Receives site suitability
 ↓
Receives energy analysis
 ↓
Receives PV sizing
 ↓
Receives battery sizing
 ↓
Receives component BOM
 ↓
Receives cost/payback estimate
 ↓
Receives installation roadmap
 ↓
Interacts with AI agent
 ↓
Downloads report
````

while maintaining the fundamental requirement that numeric engineering outputs are generated by deterministic engines.

---

# 54. Quick Reference

## Backend

```bash
cd backend
python -m venv venv
pip install -r requirements.txt
npm run dev --workspace apps/backend
```

## Frontend

```bash
npm run dev --workspace apps/web
```

## URLs

```text
Frontend:
http://localhost:5173

Backend:
http://localhost:4000

Health check:
http://localhost:4000/health
```

---

# 55. Final Project Architecture

```text
                         SOLARAGENT PRO
                              |
          +-------------------+-------------------+
          |                                       |
          v                                       v
     React Frontend                         Claude Agent
          |                                       |
          |                                       |
          +-------------------+-------------------+
                              |
                              v
                       Express Backend
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
    Session Store        Tool Calling       Report Generator
                              |
                              v
                 Deterministic Engineering
                       Engine Layer
                              |
        +----------+----------+----------+----------+
        |          |          |          |          |
        v          v          v          v          v
      Site       Energy     Sizing    Component   Cost &
    Analysis     & Load               Engine      Payback
        |          |          |          |          |
        +----------+----------+----------+----------+
                              |
                              v
                       Roadmap & Safety
                              |
                              v
                     Structured Results
                              |
                              v
                   AI Explanation + Report
```

---

# 56. License and Acknowledgement

SolarAgent Pro is developed for:

**CSE 4202 — Web Programming & Mobile Application Development**

at:

**Computer Science & Engineering Discipline, Khulna University**

under the supervision of:

**Dr. Kazi Masudul Alam**

The supplied documentation specifies distribution under the **MIT License**.

# 57. Conclusion

SolarAgent Pro combines a conversational AI interface with deterministic solar-engineering calculation modules to provide an accessible preliminary solar consultation workflow.

Its central architectural contribution is the separation of:

```text
AI-based understanding and orchestration
```

from:

```text
deterministic engineering computation
```

This allows the system to provide a natural conversational experience while preserving traceability for important engineering numbers.

The project therefore demonstrates the integration of:

```text
Artificial Intelligence
        +
Solar Energy Engineering
        +
Full-Stack Web Development
        +
REST API Architecture
        +
Deterministic Calculation Engines
        +
Automated Report Generation
        +
Agentic Software Development
```

The current Week 1 foundation establishes the requirements, architecture, repository organization, calculation-engine structure, AI-agent layer, and development methodology. Subsequent development should implement and validate the planned functionality while keeping the engineering calculations auditable and the AI layer constrained to validated tool outputs.

## Vercel deployment

This repository includes a Vercel configuration for the Vite frontend and Express API:

1. Import the repository into Vercel with the repository root as the project root. In Vercel, set **Root Directory** to `.` (not `apps/web` or `apps/backend`).
2. Set the build command to `npm run vercel-build` (or leave the repository `vercel.json` setting unchanged). This command only builds the application.
3. Keep the output directory as `apps/web/dist`.
4. Add these environment variables in the Vercel project settings:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `SSLCOMMERZ_STORE_ID`
   - `SSLCOMMERZ_STORE_PASSWORD`
   - `SSLCOMMERZ_IS_SANDBOX`
   - `APP_URL` using the deployed HTTPS URL, without a trailing slash
5. Leave `VITE_API_URL` empty for a single-project deployment. The frontend then calls the same deployment through `/api/v1`.

The Express API is exposed through the serverless catch-all function in `api/[...path].ts`. Do not commit `.env`; use Vercel environment variables for production secrets.

Run database setup separately from a trusted environment with network access to PostgreSQL:

```bash
npm run db:setup
```

Do not add migrations or seed scripts to the Vercel build command. Vercel deployments can run repeatedly, and a database connection failure must not prevent the frontend/serverless bundle from being built. Make sure `DATABASE_URL` is configured in the environment where `npm run db:setup` is executed.
