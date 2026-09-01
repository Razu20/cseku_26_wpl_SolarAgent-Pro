"""
PDF report generation with reportlab. Pulls straight from the session's
already-computed engine results — this module does no calculation of its
own, only formatting, so the PDF can never disagree with the chat or the
JSON API about a number.
"""
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

INK = colors.HexColor("#14192B")
STEEL = colors.HexColor("#5C6478")
SOLAR_GOLD = colors.HexColor("#E8A93A")
RULE_GREY = colors.HexColor("#E5E5E5")

_base_styles = getSampleStyleSheet()
TITLE_STYLE = ParagraphStyle("SapTitle", parent=_base_styles["Title"], textColor=INK, fontSize=20, spaceAfter=4)
H2_STYLE = ParagraphStyle("SapH2", parent=_base_styles["Heading2"], textColor=STEEL, fontSize=11, spaceBefore=16, spaceAfter=6)
BODY_STYLE = ParagraphStyle("SapBody", parent=_base_styles["Normal"], fontSize=10, leading=14)
SMALL_STYLE = ParagraphStyle("SapSmall", parent=_base_styles["Normal"], fontSize=8, leading=11, textColor=STEEL)
CELL_LABEL_STYLE = ParagraphStyle("SapCellLabel", fontSize=9, leading=13, textColor=STEEL)
CELL_VALUE_STYLE = ParagraphStyle("SapCellValue", fontSize=9, leading=13, textColor=INK)
BADGE_STYLE = ParagraphStyle("SapBadge", fontSize=13, leading=16, textColor=INK, spaceAfter=6)


def _table(rows) -> Table:
    wrapped = [[Paragraph(str(r[0]), CELL_LABEL_STYLE), Paragraph(str(r[1]), CELL_VALUE_STYLE)] for r in rows]
    t = Table(wrapped, colWidths=[45 * mm, 115 * mm])
    t.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, RULE_GREY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def generate_pdf_report(session) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=18 * mm, leftMargin=20 * mm, rightMargin=20 * mm)

    site = session.site or {}
    site_analysis = session.site_analysis or {}
    energy = session.energy_result or {}
    design = session.design_result or {}
    cost = session.cost_result or {}
    roadmap = session.roadmap_result or {}
    resource = site_analysis.get("resource", {})
    tilt = site_analysis.get("tilt_orientation", {})
    panel = design.get("panel", {})
    inverter = design.get("inverter", {})
    battery = design.get("battery")
    suitability = design.get("suitability") or site_analysis.get("suitability") or {}

    elements = [
        Paragraph("SolarAgent Pro \u2014 Site Consultation Report", TITLE_STYLE),
        Paragraph(f"{site.get('city', 'N/A')}, {site.get('country', 'N/A')} \u00b7 {site.get('building_type', 'N/A')}", BODY_STYLE),
        Spacer(1, 10),
        Paragraph("Suitability", H2_STYLE),
        Paragraph(f"<b>{suitability.get('tier', 'Not yet calculated')}</b>" + (f" \u2014 {suitability['score']}/100" if suitability.get("score") is not None else ""), BADGE_STYLE),
    ]

    factor_rows = [[f["label"], f["detail"]] for f in suitability.get("factors", [])]
    if factor_rows:
        elements.append(_table(factor_rows))

    elements.append(Paragraph("Site &amp; Load", H2_STYLE))
    elements.append(_table([
        ["Roof", f"{site.get('roof_type', 'N/A')}, {site.get('roof_area_m2', 'N/A')} m\u00b2, shading: {site.get('shading', 'N/A')}"],
        ["Peak sun-hours", f"{resource.get('psh', 'N/A')} h/day (estimated \u2014 see note below)"],
        ["Recommended tilt", f"~{tilt.get('tilt_degrees', 'N/A')}\u00b0 facing {tilt.get('orientation', 'N/A')}"],
        ["Daily energy need", f"{energy.get('daily_energy_kwh', 'N/A')} kWh/day"],
        ["Estimated peak load", f"{energy.get('estimated_peak_load_w', 'N/A')} W"],
    ]))

    mode_label = (energy.get("system_mode") or "not set").replace("_", " ")
    elements.append(Paragraph(f"System Design \u2014 {mode_label}", H2_STYLE))
    battery_line = f"{battery['nominal_capacity_kwh']} kWh {battery['chemistry']} @ {battery['recommended_voltage']}" if battery else "None (grid-tied, no storage)"
    elements.append(_table([
        ["Panels", f"{panel.get('count', 'N/A')} \u00d7 {panel.get('wattage', 'N/A')}W {panel.get('type', '')} ({panel.get('actual_array_kw', 'N/A')} kW total)"],
        ["Inverter", f"{inverter.get('type', 'N/A')}, {inverter.get('size_kw', 'N/A')} kW"],
        ["Battery", battery_line],
        ["Mounting", design.get("mounting", "N/A")],
    ]))

    elements.append(Paragraph("Cost Estimate (USD-equivalent, approximate)", H2_STYLE))
    if cost:
        cost_range = f"${cost.get('installed_cost_low', 0):,} \u2013 ${cost.get('installed_cost_high', 0):,}"
        annual_gen = f"{cost.get('annual_generation_kwh', 0):,} kWh/yr"
        annual_savings = f"${cost.get('annual_savings_usd', 0):,}/yr"
        payback = f"{cost['payback_years']} years" if cost.get("payback_years") else "N/A"
    else:
        cost_range = annual_gen = annual_savings = payback = "Not yet calculated"
    elements.append(_table([
        ["Installed cost range", cost_range],
        ["Est. annual generation", annual_gen],
        ["Est. annual savings", annual_savings],
        ["Est. payback", payback],
    ]))

    elements.append(Paragraph("Installation Roadmap", H2_STYLE))
    for i, phase in enumerate(roadmap.get("phases", []), start=1):
        elements.append(Paragraph(f"<b>{i}. {phase['phase']}</b>", BODY_STYLE))
        items_html = "<br/>".join(f"\u2013 {item}" for item in phase["items"])
        elements.append(Paragraph(items_html, SMALL_STYLE))
        elements.append(Spacer(1, 6))

    if roadmap.get("safety_notes"):
        elements.append(Paragraph("Safety Notes", H2_STYLE))
        elements.append(Paragraph("<br/>".join(f"\u2013 {n}" for n in roadmap["safety_notes"]), SMALL_STYLE))

    elements.append(Spacer(1, 14))
    elements.append(Paragraph(
        "Generated by SolarAgent Pro. Irradiance, tariff, and cost figures come from a documented "
        "estimation model, not a live feed \u2014 not a substitute for a licensed site survey, structural "
        "check, or local-code compliant electrical design. Get 2\u20133 local supplier quotes before purchasing.",
        SMALL_STYLE,
    ))

    doc.build(elements)
    return buffer.getvalue()
