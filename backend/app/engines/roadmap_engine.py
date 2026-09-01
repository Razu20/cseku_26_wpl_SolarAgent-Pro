"""
Installation roadmap engine: the 0 -> finished sequence, safety guidance,
common mistakes, and a maintenance schedule. Content is templated (a real
engineer's checklist doesn't change much project to project) but adapts
its net-metering / autonomy language to the chosen system mode.
"""


def generate_roadmap(system_mode: str) -> dict:
    approval_item = (
        "Apply for utility net-metering / interconnection approval"
        if system_mode != "off_grid"
        else "Confirm autonomy targets and battery bank sizing with the client"
    )

    phases = [
        {"phase": "Site Survey & Measurements", "items": [
            "Confirm roof structural capacity and exact usable area",
            "Check shading across seasons, not just the survey day",
            "Inspect existing electrical panel and grid connection point",
        ]},
        {"phase": "Design Finalization & Approvals", "items": [
            "Lock the single-line diagram and full component list (BOM)",
            approval_item,
            "Structural sign-off if roof condition is uncertain",
        ]},
        {"phase": "Material Procurement", "items": [
            "Order panels, inverter, battery, and mounting to the confirmed BOM",
            "Verify certifications on datasheets (IEC/UL as applicable locally)",
            "Confirm dry, ventilated battery storage ahead of install day",
        ]},
        {"phase": "Civil / Mounting Work", "items": [
            "Install racking per roof type with correct waterproofing/flashing",
            "Torque all mounting hardware to the manufacturer's spec",
            "Maintain fall-protection for the duration of roof work",
        ]},
        {"phase": "Electrical Installation", "items": [
            "Mount and wire panel strings",
            "Install inverter, battery bank, and combiner box",
            "DC + AC protection devices, earthing, cable labeling",
        ]},
        {"phase": "Commissioning & Testing", "items": [
            "Insulation resistance and open-circuit voltage test per string",
            "Polarity check before first energization",
            "Inverter start-up sequence and battery BMS check",
            "Configure production monitoring",
        ]},
        {"phase": "Safety Checks & Handover", "items": [
            "Final visual inspection; label every disconnect",
            "Hand over manuals, warranty documents, and the single-line diagram",
            "Walk the client through the shutdown procedure and monitoring app",
        ]},
    ]

    safety_notes = [
        "PV strings are live any time there is light on them \u2014 they cannot be \u2018switched off\u2019 like AC circuits. Treat DC wiring as energized at all times during work.",
        "Grid interconnection (on-grid/hybrid) should be performed or signed off by a locally licensed electrician \u2014 a regulatory requirement in most jurisdictions, not just good practice.",
        "Undersized cable is the most common installation defect \u2014 size to the manufacturer's maximum current with margin, not just typical operating current.",
        "Keep LiFePO4 batteries ventilated and out of direct sun/heat for longevity; follow the manufacturer's BMS and warranty conditions.",
        "A Surge Protection Device on both DC and AC sides is inexpensive insurance against lightning-induced transients \u2014 do not omit it to save cost.",
    ]

    common_mistakes = [
        "Undersizing cable or protection devices to save on materials cost",
        "Skipping the SPD or earthing kit",
        "Ignoring seasonal shading changes (trees grow, neighboring construction appears)",
        "Mixing old and new batteries, or different battery brands, in one bank",
        "Ignoring manufacturer warranty conditions during installation (voids coverage)",
    ]

    maintenance_schedule = [
        {"cadence": "Monthly", "task": "Visual inspection; clean panels if visibly dusty (soft brush + water, no harsh chemicals)"},
        {"cadence": "Every 6 months", "task": "Check electrical connections and earthing continuity"},
        {"cadence": "Annually", "task": "Professional inspection \u2014 thermal check for hotspots, battery health check, inverter firmware/log review"},
    ]

    return {
        "phases": phases,
        "safety_notes": safety_notes,
        "common_mistakes": common_mistakes,
        "maintenance_schedule": maintenance_schedule,
    }
