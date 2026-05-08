"""
Generate the NRI Bridge India build invoice as a PDF in the project root.
Uses Segoe UI (system font) so the rupee symbol and typographic dashes
render correctly. Run: python generate_invoice.py
"""
import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
)

OUTPUT = "NRI-Bridge-India-Invoice.pdf"

GREEN = colors.HexColor("#4a6a2e")
DEEP = colors.HexColor("#3d3f2e")
CREAM = colors.HexColor("#f7f5ec")
MUTED = colors.HexColor("#6e6e5a")
LINE = colors.HexColor("#d8d4c5")


# ------------------------------------------------------------------
# Font registration — embed Segoe UI so ₹, —, ·, • render correctly
# ------------------------------------------------------------------
def _register_fonts():
    candidates = [
        ("Body", [
            r"C:\Windows\Fonts\segoeui.ttf",
            r"C:\Windows\Fonts\arial.ttf",
            r"C:\Windows\Fonts\calibri.ttf",
        ]),
        ("BodyBold", [
            r"C:\Windows\Fonts\segoeuib.ttf",
            r"C:\Windows\Fonts\arialbd.ttf",
            r"C:\Windows\Fonts\calibrib.ttf",
        ]),
    ]
    for name, paths in candidates:
        for p in paths:
            if os.path.exists(p):
                pdfmetrics.registerFont(TTFont(name, p))
                break
        else:
            raise RuntimeError(f"No font found for {name}")
    # Map bold variant for <b> inside Paragraphs
    from reportlab.pdfbase.pdfmetrics import registerFontFamily
    registerFontFamily("Body", normal="Body", bold="BodyBold",
                       italic="Body", boldItalic="BodyBold")


_register_fonts()

FONT = "Body"
FONT_B = "BodyBold"

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", fontName=FONT_B, fontSize=24, leading=28,
                    textColor=DEEP, spaceAfter=2)
H2 = ParagraphStyle("H2", fontName=FONT_B, fontSize=11, leading=14,
                    textColor=GREEN, spaceBefore=10, spaceAfter=4)
BODY = ParagraphStyle("Body", fontName=FONT, fontSize=9.5, leading=13,
                      textColor=DEEP)
BODY_B = ParagraphStyle("BodyB", parent=BODY, fontName=FONT_B)
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=8.5, leading=11,
                       textColor=MUTED)
RIGHT = ParagraphStyle("Right", parent=BODY, alignment=2)
RIGHT_BOLD = ParagraphStyle("RightBold", parent=RIGHT, fontName=FONT_B)
GROUP = ParagraphStyle("Group", parent=BODY, fontName=FONT_B,
                       textColor=GREEN, fontSize=10, leading=13)
TOTAL = ParagraphStyle("Total", parent=BODY, fontName=FONT_B,
                       textColor=colors.white, fontSize=12, alignment=2)
TOTAL_LBL = ParagraphStyle("TotalLbl", parent=TOTAL,
                           textColor=colors.white, alignment=2)


def rupee(n):
    """Format an integer as Indian-style ₹ amount: ₹ 1,50,000."""
    if n < 1000:
        return f"₹ {n}"
    x = str(n)
    last3 = x[-3:]
    rest = x[:-3]
    groups = []
    while len(rest) > 2:
        groups.insert(0, rest[-2:])
        rest = rest[:-2]
    if rest:
        groups.insert(0, rest)
    return "₹ " + ",".join(groups) + "," + last3


def build():
    doc = SimpleDocTemplate(
        OUTPUT, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
        title="NRI Bridge India — Invoice INV-2026-001",
        author="Freelance Build",
    )
    story = []

    # ── Header band ───────────────────────────────────────────
    header_data = [[
        Paragraph("INVOICE", H1),
        Paragraph(
            "<b>Invoice #:</b> INV-2026-001<br/>"
            "<b>Date:</b> 27 April 2026<br/>"
            "<b>Project:</b> NRI Bridge India — SaaS Build",
            RIGHT,
        ),
    ]]
    header = Table(header_data, colWidths=[90 * mm, 84 * mm])
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(header)
    story.append(Spacer(1, 8))

    # ── From / Bill to ────────────────────────────────────────
    party_data = [[
        Paragraph(
            "<b>From</b><br/>"
            "[Your Name]<br/>"
            "[Your City, India]<br/>"
            "[Email] · [Phone]<br/>"
            "<font color='#6e6e5a'>GSTIN: Not Applicable — turnover below "
            "₹20L threshold</font>",
            BODY,
        ),
        Paragraph(
            "<b>Bill To</b><br/>"
            "[Client Name / NRI Bridge India]<br/>"
            "[Client Address]<br/>"
            "[Client Email]",
            BODY,
        ),
    ]]
    party = Table(party_data, colWidths=[87 * mm, 87 * mm])
    party.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("BACKGROUND", (0, 0), (-1, -1), CREAM),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("LINEAFTER", (0, 0), (0, 0), 0.5, LINE),
    ]))
    story.append(party)
    story.append(Spacer(1, 14))

    # ── Itemised table ────────────────────────────────────────
    story.append(Paragraph("Itemised Charges", H2))

    rows = [
        ["#", "Item", "Description", "Amount"],
        ["", Paragraph("Design", GROUP), "", ""],
        ["1", "UI / UX design system",
         "Earthy palette, typography, components, design tokens (shared.css)",
         rupee(12000)],
        ["2", "Landing & marketing pages",
         "Hero, services overview, contact, onboarding flow",
         rupee(8000)],
        ["", Paragraph("Frontend Development", GROUP), "", ""],
        ["3", "Service detail pages",
         "30+ templated pages across home / vehicle / parental / legal categories",
         rupee(18000)],
        ["4", "Client dashboard",
         "Service cards, task timeline, payments, documents, dispute centre",
         rupee(12000)],
        ["5", "Employee portal",
         "Task list, proof submission, photo upload, status pipeline",
         rupee(10000)],
        ["6", "Admin portal",
         "Multi-section dashboard: clients, tasks, disputes, payments, team, "
         "analytics, ops board",
         rupee(20000)],
        ["7", "Authentication pages",
         "Login, signup, OAuth callback, complete-profile",
         rupee(5000)],
        ["", Paragraph("Backend & Database", GROUP), "", ""],
        ["8", "Supabase schema + migrations",
         "27 migrations: clients, tasks, task_steps, step_proofs, employees, "
         "disputes, payments, metrics",
         rupee(18000)],
        ["9", "Auth + role system",
         "Email/password + Google OAuth, role detection, RLS policies",
         rupee(8000)],
        ["10", "File storage",
         "Supabase Storage bucket, signed URLs, 5 MB cap, KYC documents",
         rupee(4000)],
        ["", Paragraph("Feature Workflows", GROUP), "", ""],
        ["11", "Operations board",
         "Pipeline definitions, auto-assignment, skill / city / workload scoring",
         rupee(12000)],
        ["12", "Proof / dispute / escalation",
         "Multi-round proof submission, accept/dispute, escalation to admin",
         rupee(8000)],
        ["13", "Razorpay + invoice PDF",
         "Payments integration, client-side PDF invoice (html2pdf.js)",
         rupee(6000)],
        ["14", "Employee KYC workflow",
         "ID + address upload, admin approval, skill-based assignment",
         rupee(4000)],
        ["", Paragraph("Integrations & Deployment", GROUP), "", ""],
        ["15", "Google Apps Script bridge",
         "Form POSTs synced to Google Sheets (Signups, Logins, Contacts, Onboarding)",
         rupee(2000)],
        ["16", "Docker + nginx setup",
         "Static container, port 80, deployment-ready Dockerfile",
         rupee(2000)],
        ["17", "Testing & bug fixes",
         "End-to-end role testing, cross-portal regression fixes",
         rupee(1000)],
    ]

    # Wrap description column in Paragraph for proper wrapping
    wrapped = []
    for i, row in enumerate(rows):
        if i == 0:
            wrapped.append(row)
            continue
        if isinstance(row[1], Paragraph):
            wrapped.append(row)
            continue
        wrapped.append([
            row[0],
            Paragraph(row[1], BODY),
            Paragraph(row[2], BODY),
            row[3],
        ])

    table = Table(wrapped, colWidths=[10 * mm, 42 * mm, 90 * mm, 32 * mm],
                  repeatRows=1)
    style = TableStyle([
        # header
        ("FONTNAME", (0, 0), (-1, 0), FONT_B),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("ALIGN", (0, 0), (0, 0), "CENTER"),
        ("ALIGN", (3, 0), (3, 0), "RIGHT"),
        # body
        ("FONTNAME", (0, 1), (-1, -1), FONT),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (-1, -1), DEEP),
        ("ALIGN", (0, 1), (0, -1), "CENTER"),
        ("ALIGN", (3, 1), (3, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, GREEN),
        ("LINEBELOW", (0, 1), (-1, -1), 0.25, LINE),
    ])

    # Group separator rows
    for i, row in enumerate(wrapped):
        if i == 0:
            continue
        if isinstance(row[1], Paragraph) and row[2] == "":
            style.add("BACKGROUND", (0, i), (-1, i), CREAM)
            style.add("SPAN", (1, i), (3, i))
            style.add("LINEABOVE", (0, i), (-1, i), 0.4, LINE)
            style.add("LINEBELOW", (0, i), (-1, i), 0.4, LINE)
            style.add("TOPPADDING", (0, i), (-1, i), 7)
            style.add("BOTTOMPADDING", (0, i), (-1, i), 7)

    table.setStyle(style)
    story.append(table)

    # ── Total bar ─────────────────────────────────────────────
    total_data = [[
        Paragraph("Total", TOTAL_LBL),
        Paragraph(rupee(150000), TOTAL),
    ]]
    total = Table(total_data, colWidths=[142 * mm, 32 * mm])
    total.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), DEEP),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(total)
    story.append(Spacer(1, 16))

    # ── Payment terms ─────────────────────────────────────────
    story.append(Paragraph("Payment Terms", H2))
    terms = [
        "50% advance on project kick-off · 50% on handover",
        "Bank transfer / UPI — details on request",
        "Includes 30 days of post-handover bug fixes",
        "Hosting, Supabase, and domain renewals not included — billed at "
        "actuals or via a separate maintenance retainer",
    ]
    for t in terms:
        story.append(Paragraph("•&nbsp;&nbsp;" + t, BODY))

    story.append(Spacer(1, 12))

    # ── Out of scope ──────────────────────────────────────────
    story.append(Paragraph("Out of Scope (quoted separately)", H2))
    oos = [
        ("Ongoing maintenance & feature additions",
         f"{rupee(8000)} / month retainer"),
        ("Custom domain & SSL setup",
         f"{rupee(3000)} one-time"),
        ("Razorpay live-mode KYC assistance",
         f"{rupee(2000)} one-time"),
    ]
    oos_rows = [[Paragraph(name, BODY), Paragraph(price, RIGHT_BOLD)]
                for name, price in oos]
    oos_table = Table(oos_rows, colWidths=[114 * mm, 60 * mm])
    oos_table.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -2), 0.25, LINE),
    ]))
    story.append(oos_table)

    story.append(Spacer(1, 18))
    story.append(Paragraph(
        "Thank you for the engagement. GST not applicable as turnover is "
        "below the ₹20L registration threshold under the CGST Act.",
        SMALL,
    ))

    doc.build(story)
    print(f"Generated: {OUTPUT}")


if __name__ == "__main__":
    build()
