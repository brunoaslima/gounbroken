#!/usr/bin/env python3
"""Go Unbroken — Workout Report PDF Mockup"""

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# ── Colours ──────────────────────────────────────────────────────────────────
BG       = HexColor("#0F0F0E")
LIME     = HexColor("#D4FF3A")
LIME_MED = HexColor("#8FBF1A")
LIME_DRK = HexColor("#6B8F14")
LIME_XDK = HexColor("#4A6B0E")
PRIMARY  = HexColor("#F0F0EC")
MUTED    = HexColor("#A8A8A4")
AMBER    = HexColor("#F59E0B")
BORDER   = HexColor("#2A2A2A")
DARK_GRY = HexColor("#1A1A1A")
BOX_GRY  = HexColor("#1C1C1C")

OUTPUT = "/Users/brunolima1/Documents/score crossfit/workout-report-mockup.pdf"

W, H = A4   # 595.27 x 841.89 pt
MARGIN = 36

# ── Helper: fill page background ─────────────────────────────────────────────
def fill_bg(c):
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)

# ── Helper: draw text safely ─────────────────────────────────────────────────
def txt(c, text, x, y, font="Helvetica", size=9, color=PRIMARY, align="left"):
    c.setFont(font, size)
    c.setFillColor(color)
    if align == "right":
        c.drawRightString(x, y, text)
    elif align == "center":
        c.drawCentredString(x, y, text)
    else:
        c.drawString(x, y, text)

# ── Helper: filled rect with optional border ──────────────────────────────────
def box(c, x, y, w, h, fill=None, stroke_color=None, stroke_w=0.5):
    if fill:
        c.setFillColor(fill)
    if stroke_color:
        c.setStrokeColor(stroke_color)
        c.setLineWidth(stroke_w)
    c.rect(x, y, w, h,
           fill=1 if fill else 0,
           stroke=1 if stroke_color else 0)

# ── Helper: horizontal progress bar ──────────────────────────────────────────
def progress_bar(c, x, y, total_w, h, pct, bg=DARK_GRY, fg=LIME):
    box(c, x, y, total_w, h, fill=bg)
    fill_w = total_w * pct / 100
    box(c, x, y, fill_w, h, fill=fg)

# ── Human body figure ─────────────────────────────────────────────────────────
def draw_figure(c, cx, top_y, flipped=False):
    """Draw a stick-figure made of rectangles centred at cx, starting at top_y (going down)."""
    # head
    hd_w, hd_h = 20, 20
    hd_x = cx - hd_w / 2
    hd_y = top_y - hd_h
    box(c, hd_x, hd_y, hd_w, hd_h, fill=DARK_GRY, stroke_color=BORDER, stroke_w=0.8)

    # neck
    nk_w, nk_h = 8, 10
    nk_x = cx - nk_w / 2
    nk_y = hd_y - nk_h
    box(c, nk_x, nk_y, nk_w, nk_h, fill=DARK_GRY)

    # shoulders
    sh_w, sh_h = 60, 12
    sh_x = cx - sh_w / 2
    sh_y = nk_y - sh_h
    box(c, sh_x, sh_y, sh_w, sh_h, fill=LIME)

    # arms (left/right relative to viewer)
    ar_w, ar_h = 10, 40
    larm_x = sh_x - ar_w
    rarm_x = sh_x + sh_w
    arm_y  = sh_y - ar_h
    box(c, larm_x, arm_y, ar_w, ar_h, fill=LIME)
    box(c, rarm_x, arm_y, ar_w, ar_h, fill=LIME)

    # torso
    tr_w, tr_h = 40, 45
    tr_x = cx - tr_w / 2
    tr_y = sh_y - tr_h
    box(c, tr_x, tr_y, tr_w, tr_h, fill=LIME_MED)

    # hips
    hp_w, hp_h = 44, 20
    hp_x = cx - hp_w / 2
    hp_y = tr_y - hp_h
    box(c, hp_x, hp_y, hp_w, hp_h, fill=LIME_DRK)

    # thighs
    th_w, th_h = 16, 40
    gap = 4
    lth_x = cx - gap - th_w
    rth_x = cx + gap
    th_y  = hp_y - th_h
    box(c, lth_x, th_y, th_w, th_h, fill=LIME_MED)
    box(c, rth_x, th_y, th_w, th_h, fill=LIME_MED)

    # shins
    sh2_w, sh2_h = 12, 35
    lsh_x = lth_x + (th_w - sh2_w) / 2
    rsh_x = rth_x + (th_w - sh2_w) / 2
    sh2_y = th_y - sh2_h
    box(c, lsh_x, sh2_y, sh2_w, sh2_h, fill=LIME_XDK)
    box(c, rsh_x, sh2_y, sh2_w, sh2_h, fill=LIME_XDK)

    return sh2_y  # bottom of figure

# ═════════════════════════════════════════════════════════════════════════════
# PAGE 1
# ═════════════════════════════════════════════════════════════════════════════
def draw_page1(c):
    fill_bg(c)

    # ── HEADER ────────────────────────────────────────────────────────────────
    lime_band_h = 50
    lime_band_y = H - lime_band_h
    box(c, 0, lime_band_y, W, lime_band_h, fill=LIME)

    # "GO UNBROKEN" on lime band
    txt(c, "GO UNBROKEN", MARGIN, lime_band_y + 16,
        font="Helvetica-Bold", size=20, color=BG)

    # "RELATORIO DE TREINOS" below lime band
    txt(c, "RELATORIO DE TREINOS", MARGIN, lime_band_y - 14,
        font="Helvetica", size=8, color=MUTED)

    # Right side: athlete name + period
    txt(c, "Caio Arruda", W - MARGIN, lime_band_y + 20,
        font="Helvetica-Bold", size=14, color=PRIMARY, align="right")
    txt(c, "01 ABR - 30 ABR 2026", W - MARGIN, lime_band_y - 14,
        font="Helvetica", size=9, color=MUTED, align="right")

    # ── DIVIDER ───────────────────────────────────────────────────────────────
    y_cursor = lime_band_y - 30

    # ── CONSISTENCIA section ──────────────────────────────────────────────────
    txt(c, "CONSISTENCIA", MARGIN, y_cursor, font="Helvetica", size=7, color=MUTED)
    y_cursor -= 4

    txt(c, "67%", MARGIN, y_cursor - 38, font="Helvetica-Bold", size=42, color=LIME)
    txt(c, "8 de 12 treinos realizados", MARGIN + 90, y_cursor - 20,
        font="Helvetica", size=11, color=PRIMARY)

    y_cursor -= 50

    # Progress bar
    bar_x = MARGIN
    bar_w = 400
    bar_h = 8
    progress_bar(c, bar_x, y_cursor, bar_w, bar_h, 67)
    y_cursor -= 20

    # Three status boxes
    labels = ["6 Completou", "2 Parcialmente", "4 Nao fez"]
    colors  = [LIME, AMBER, MUTED]
    bx_w, bx_h = 110, 22
    bx_gap = 8
    bx_start = MARGIN
    for i, (lbl, col) in enumerate(zip(labels, colors)):
        bx = bx_start + i * (bx_w + bx_gap)
        box(c, bx, y_cursor - bx_h, bx_w, bx_h, fill=DARK_GRY, stroke_color=col, stroke_w=0.7)
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(col)
        c.drawCentredString(bx + bx_w / 2, y_cursor - bx_h + 7, lbl)

    y_cursor -= bx_h + 20

    # ── VOLUME POR REGIAO ─────────────────────────────────────────────────────
    txt(c, "VOLUME POR REGIAO", MARGIN, y_cursor, font="Helvetica", size=7, color=MUTED)
    y_cursor -= 6

    # sub label
    fig_top = y_cursor - 4
    fig_cx_front = MARGIN + 50
    fig_cx_back  = MARGIN + 160

    fig_bottom = draw_figure(c, fig_cx_front, fig_top)
    draw_figure(c, fig_cx_back,  fig_top)

    # "FRONTAL" / "POSTERIOR" labels
    label_y = fig_top + 4
    txt(c, "FRONTAL",   fig_cx_front, label_y, font="Helvetica", size=6, color=MUTED, align="center")
    txt(c, "POSTERIOR", fig_cx_back,  label_y, font="Helvetica", size=6, color=MUTED, align="center")

    # Legend  (placed to the right of both figures)
    leg_x = MARGIN + 230
    leg_y = fig_top - 20
    legend_items = [
        (LIME,     "Upper Body — Muito treinado"),
        (LIME_MED, "Core / Full Body — Moderado"),
        (LIME_XDK, "Lower Body — Menos treinado"),
    ]
    for col, label in legend_items:
        c.setFillColor(col)
        c.circle(leg_x + 5, leg_y + 3, 4, fill=1, stroke=0)
        txt(c, label, leg_x + 14, leg_y, font="Helvetica", size=8, color=PRIMARY)
        leg_y -= 16

    # Move y_cursor to bottom of the figure area
    y_cursor = min(fig_bottom, leg_y) - 16

    # ── PADROES DE MOVIMENTO ──────────────────────────────────────────────────
    txt(c, "PADROES DE MOVIMENTO", MARGIN, y_cursor, font="Helvetica", size=7, color=MUTED)
    y_cursor -= 14

    movements = [
        ("Empurrar (Push)",  35),
        ("Cardio / Ergs",    30),
        ("Agachar (Squat)",  28),
        ("Puxar (Pull)",     22),
        ("Core",             18),
        ("Quadril / Post.",  15),
    ]
    lbl_col_w = 100
    bar_col_w = 220
    pct_col_x = MARGIN + lbl_col_w + bar_col_w + 6

    for name, pct in movements:
        txt(c, name, MARGIN, y_cursor, font="Helvetica", size=9, color=PRIMARY)
        bx = MARGIN + lbl_col_w
        progress_bar(c, bx, y_cursor - 2, bar_col_w, 8, pct)
        txt(c, f"{pct}%", pct_col_x, y_cursor,
            font="Helvetica-Bold", size=9, color=LIME)
        y_cursor -= 16


# ═════════════════════════════════════════════════════════════════════════════
# PAGE 2
# ═════════════════════════════════════════════════════════════════════════════
def draw_page2(c):
    fill_bg(c)

    # Reuse header strip (lighter version — just brand name)
    lime_band_h = 50
    lime_band_y = H - lime_band_h
    box(c, 0, lime_band_y, W, lime_band_h, fill=LIME)
    txt(c, "GO UNBROKEN", MARGIN, lime_band_y + 16,
        font="Helvetica-Bold", size=20, color=BG)
    txt(c, "Caio Arruda", W - MARGIN, lime_band_y + 20,
        font="Helvetica-Bold", size=14, color=BG, align="right")

    y_cursor = lime_band_y - 30

    # ── FEEDBACK DO ALUNO ─────────────────────────────────────────────────────
    txt(c, "FEEDBACK DO ALUNO", MARGIN, y_cursor, font="Helvetica", size=7, color=MUTED)
    y_cursor -= 8

    fb_items = [
        ("LEVE . 1",        DARK_GRY, MUTED),
        ("NA MEDIDA . 5",   DARK_GRY, LIME),
        ("MUITO PESADO . 2",DARK_GRY, AMBER),
    ]
    fb_w, fb_h = 140, 34
    fb_gap = 10
    fb_x = MARGIN
    for label, bg, fg in fb_items:
        box(c, fb_x, y_cursor - fb_h, fb_w, fb_h, fill=bg, stroke_color=fg, stroke_w=0.8)
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(fg)
        c.drawCentredString(fb_x + fb_w / 2, y_cursor - fb_h + 12, label)
        fb_x += fb_w + fb_gap

    y_cursor -= fb_h + 10

    # Alert box
    alert_h = 26
    box(c, MARGIN, y_cursor - alert_h, W - 2 * MARGIN, alert_h,
        fill=HexColor("#1A1200"), stroke_color=AMBER, stroke_w=0.8)
    txt(c, "!  2 treinos marcados como muito pesados — considere reduzir volume no proximo ciclo.",
        MARGIN + 8, y_cursor - alert_h + 8, font="Helvetica", size=8, color=AMBER)

    y_cursor -= alert_h + 26

    # ── RECORDES PESSOAIS ─────────────────────────────────────────────────────
    txt(c, "RECORDES PESSOAIS", MARGIN, y_cursor, font="Helvetica", size=7, color=MUTED)
    y_cursor -= 6

    records = [
        ("Back Squat",   "80 kg"),
        ("Deadlift",     "100 kg"),
        ("Strict Press", "45 kg"),
        ("Power Clean",  "60 kg"),
        ("Front Squat",  "65 kg"),
    ]
    row_h = 22
    tbl_w = W - 2 * MARGIN

    # header row
    box(c, MARGIN, y_cursor - row_h, tbl_w, row_h, fill=DARK_GRY)
    txt(c, "Movimento", MARGIN + 8, y_cursor - row_h + 7,
        font="Helvetica-Bold", size=8, color=MUTED)
    txt(c, "Recorde", W - MARGIN - 8, y_cursor - row_h + 7,
        font="Helvetica-Bold", size=8, color=MUTED, align="right")
    y_cursor -= row_h

    for move, weight in records:
        box(c, MARGIN, y_cursor - row_h, tbl_w, row_h,
            stroke_color=BORDER, stroke_w=0.4)
        txt(c, move, MARGIN + 8, y_cursor - row_h + 7,
            font="Helvetica", size=9, color=PRIMARY)
        txt(c, weight, W - MARGIN - 8, y_cursor - row_h + 7,
            font="Helvetica-Bold", size=9, color=LIME, align="right")
        y_cursor -= row_h

    y_cursor -= 20

    # ── HISTORICO RECENTE ─────────────────────────────────────────────────────
    txt(c, "HISTORICO RECENTE", MARGIN, y_cursor, font="Helvetica", size=7, color=MUTED)
    y_cursor -= 6

    history = [
        ("29/04", "CrossFit . Full Body", "Feito",    LIME),
        ("26/04", "Upper Body",           "Feito",    LIME),
        ("24/04", "Forca",                "Parcial",  AMBER),
        ("22/04", "CrossFit",             "Feito",    LIME),
        ("19/04", "Lower Body",           "Nao fez",  MUTED),
        ("17/04", "Full Body",            "Feito",    LIME),
        ("15/04", "Upper Body",           "Parcial",  AMBER),
        ("12/04", "CrossFit",             "Feito",    LIME),
    ]
    status_symbols = {
        "Feito":   "v Feito",
        "Parcial": "~ Parcial",
        "Nao fez": "x Nao fez",
    }
    col_date_w  = 45
    col_focus_w = tbl_w - col_date_w - 80
    row_h = 20

    # header
    box(c, MARGIN, y_cursor - row_h, tbl_w, row_h, fill=DARK_GRY)
    txt(c, "Data",  MARGIN + 8,                             y_cursor - row_h + 6, font="Helvetica-Bold", size=8, color=MUTED)
    txt(c, "Foco",  MARGIN + col_date_w + 8,                y_cursor - row_h + 6, font="Helvetica-Bold", size=8, color=MUTED)
    txt(c, "Status",W - MARGIN - 8,                         y_cursor - row_h + 6, font="Helvetica-Bold", size=8, color=MUTED, align="right")
    y_cursor -= row_h

    for date, focus, status, col in history:
        box(c, MARGIN, y_cursor - row_h, tbl_w, row_h, stroke_color=BORDER, stroke_w=0.4)
        txt(c, date,  MARGIN + 8,                   y_cursor - row_h + 6, font="Helvetica", size=9, color=MUTED)
        txt(c, focus, MARGIN + col_date_w + 8,       y_cursor - row_h + 6, font="Helvetica", size=9, color=PRIMARY)
        sym = status_symbols.get(status, status)
        txt(c, sym,   W - MARGIN - 8,                y_cursor - row_h + 6, font="Helvetica-Bold", size=9, color=col, align="right")
        y_cursor -= row_h

    # ── FOOTER ────────────────────────────────────────────────────────────────
    footer_y = MARGIN + 16
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.5)
    c.line(MARGIN, footer_y + 10, W - MARGIN, footer_y + 10)
    txt(c, "Gerado por Go Unbroken . goUnbroken.app . Abril 2026",
        W / 2, footer_y, font="Helvetica", size=7, color=MUTED, align="center")


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════
def main():
    c = canvas.Canvas(OUTPUT, pagesize=A4)
    c.setTitle("Go Unbroken — Relatorio de Treinos")
    c.setAuthor("Go Unbroken")

    draw_page1(c)
    c.showPage()

    draw_page2(c)
    c.showPage()

    c.save()
    print(f"PDF saved to: {OUTPUT}")

if __name__ == "__main__":
    main()
