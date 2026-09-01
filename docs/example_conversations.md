# Example Conversation Flows

Both conversations below were run through the actual backend during development —
every number is a real output of the engines in `backend/app/engines/`, not
hand-written for effect.

---

## Example 1 — Shop owner, Khulna, hybrid system

> **Client:** Hi, I run a small shop in Khulna and I'm tired of load-shedding. What
> would solar cost me?

**SolarAgent Pro:** Happy to work through that with you. A few quick things first —
what's your roof like (type and roughly how much open area), and is it shaded by
anything nearby during the day?

> **Client:** It's a tin roof, maybe 200 square meters clear, no real shade — it's a
> standalone building.

*[calls `estimate_site_conditions`]*

**SolarAgent Pro:** Good news on the site: Khulna gets about 4.8 peak sun-hours a
day, and with a clear tin roof that puts you at an **Excellent** suitability score.
Tin roofs are also one of the easier mounting jobs — rail-mounted hooks that follow
your existing pitch, no extra structure needed.

Now let's size it. Can you list what you want the system to run, with roughly how
many hours a day each thing runs? Lighting, fans, a display fridge, anything else.

> **Client:** 8 LED lights, 40W each, on about 10 hours. 4 ceiling fans, 75W, also
> 10 hours. One small display fridge, 180W, runs most of the day, say 10 hours. And
> I have 2 sewing machines, 250W each, but they don't run together and only a few
> hours total.
>
> I still want grid power as backup — load-shedding is the problem, not total
> outages.

*[calls `calculate_energy_load`, `recommend_components`, `estimate_cost`,
`generate_installation_roadmap`]*

**SolarAgent Pro:** That's a hybrid setup then — grid-tied with battery backup, which
matches what you described. Here's the math and the plan:

Your load comes to **11.0 kWh/day**, with an estimated peak draw of about **910 W**
(I don't just add up every appliance's wattage — that assumes everything runs at
once, which it won't; I apply a diversity factor and take the higher of that or
your explicitly-simultaneous loads).

Sizing the array: 11.0 kWh ÷ (4.8 sun-hours × 0.75 performance ratio) ≈ **3.06 kW**
needed. With your roof having plenty of room, I'm recommending **budget-tier
polycrystalline panels** — no need to pay for premium efficiency when space isn't
tight: **10 × 335 W panels (3.35 kW total)**, needing about 19 m² of your 200 m².

- **Inverter:** hybrid, 2.91 kW (e.g. Deye SUN-K, Growatt SPF, or Victron
  MultiPlus-II class)
- **Battery:** 12.9 kWh LiFePO4 at 24V — sized to cover a full day's load-shedding
  outage, not just ride-through
- **Mounting:** tin-roof rail system, hook-bolt fixed

**Cost:** $2,137–$3,143 (USD-equivalent, installed) — that's a range, not a quote;
get 2-3 local supplier quotes before you commit. Expected generation is about
4,400 kWh/year, saving roughly $330/year at typical local tariffs, which puts
payback around **7.6 years**. That's longer than you'd see in a high-tariff country
— Bangladesh's residential tariff is relatively low, so the *reliability* benefit
during load-shedding is honestly a bigger part of the case here than the pure
savings math.

One thing before you buy anything: since this is hybrid (grid + battery), the
interconnection work should be done or signed off by a locally licensed
electrician — that's standard practice, not optional.

Want me to walk through the installation roadmap, or talk through where the budget
tier vs. a higher-efficiency panel would change things?

> **Client:** What if I skip the battery and just go straight grid-tie? How much
> cheaper is that?

**SolarAgent Pro:** Fair question — let's run it as on-grid instead of hybrid so I'm
not guessing.

*[calls `calculate_energy_load` again with `system_mode: on_grid`]*

Dropping the battery removes the single most expensive component. On-grid, the same
3.35 kW array and a grid-tie string inverter (Growatt MIN or Sungrow SG class,
cheaper than the hybrid unit) comes in meaningfully lower — but the trade-off is the
one you already told me matters: **a grid-tie inverter shuts off during
load-shedding**, by design, for safety (it can't backfeed a dead grid). If the
outages are the actual problem you're solving, hybrid is the right call even at the
higher upfront cost. If cost is the constraint and you can live with the shop going
dark during outages, on-grid is the cheaper path.

---

## Example 2 — Homeowner, Rajshahi, off-grid, partial shading

> **Client:** We're building a house outside Rajshahi, no grid connection planned
> for a while. Roof is flat concrete, about 60 sq meters, but there's a tree that
> shades part of it in the afternoon.

*[calls `estimate_site_conditions`]*

**SolarAgent Pro:** Rajshahi has strong sun resource — 4.9 peak sun-hours/day — but
that afternoon shading matters more than people expect: even partial shading can
cut a string's output well below what the shaded fraction alone would suggest,
because of how panels are wired in series. That brings your suitability to
**Good (64/100)** rather than Excellent. Worth knowing before you finalize: could the
tree be trimmed, or is the array better placed on the unshaded side of the roof?
Either fixes most of the penalty.

For now let's size around what you've got. What will the house run, and since
there's no grid at all, I'll ask a related question: how many days of cloudy-weather
backup do you want the battery to cover?

> **Client:** 8 LED bulbs at 10W, 6 hours. 4 ceiling fans at 75W, 10 hours. A fridge,
> 150W, call it 9 hours effective run time. A TV, 100W, maybe 4 hours, not always on
> with everything else. And a water pump, 750W, but only about an hour a day and
> never with anything else big running. Let's say 1.5 days of autonomy — we get
> some overcast weather.

*[calls `calculate_energy_load`, `recommend_components`, `estimate_cost`,
`generate_installation_roadmap`]*

**SolarAgent Pro:** Got it — fully off-grid, so every watt has to come from the array
and battery, no fallback. Here's what that means in practice:

**5.98 kWh/day**, peak load **966 W** (that peak is mostly your water pump plus
whatever's already running — it's the highest single moment, not the daily total).

Array: 5.98 ÷ (4.9 × 0.75) ≈ **1.63 kW** needed → **5 × 335 W budget-tier panels
(1.68 kW total)**, about 10 m² — comfortably inside your 60 m², even accounting for
avoiding the shaded section.

- **Inverter:** off-grid, 1.46 kW
- **Battery:** **10.5 kWh LiFePO4 at 24V**, sized for your 1.5-day autonomy target —
  this is the dominant cost in an off-grid system, which is normal
- **Charge controller:** MPPT, typically built into the inverter unit rather than a
  separate box
- **Mounting:** tilted frame, RCC roof hooks, 10–15° tilt (I'd recommend close to
  24°, matching your latitude, if the frame allows — that's the annual-optimal
  angle for a fixed array here)

**Cost:** $1,516–$2,230 installed (USD-equivalent) — notice the battery dominates
this compared to the shop example, even though this system is smaller, because
off-grid has no fallback and has to carry the full autonomy target itself. Payback
sits around **10.6 years** against your avoided-generator or avoided-connection
costs, though for a genuinely off-grid site the real comparison isn't "payback" so
much as "what's the alternative" — a diesel generator running daily costs more than
this over the same period, generally speaking.

Given the shading, my honest recommendation: get the tree trimmed or shift the
array to the clear half of the roof before you finalize panel placement — it's a
free suitability upgrade compared to any component change.

> **Client:** Can I get all this as a PDF for our contractor?

**SolarAgent Pro:** Yes — that's what the "Download Full Report" button on your
results dashboard generates (or `GET /api/session/{id}/report` if you're calling
the API directly). It has everything above plus the full installation roadmap and
safety notes.
