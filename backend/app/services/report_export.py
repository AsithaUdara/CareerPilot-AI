from __future__ import annotations

import re
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Optional
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.schemas import CareerReadinessReport

ACCENT = colors.HexColor("#1f7aef")
TEAL = colors.HexColor("#12a39a")
INK = colors.HexColor("#1b2433")
MUTED = colors.HexColor("#5a6578")
LINE = colors.HexColor("#d7e0ec")
CARD_BG = colors.HexColor("#f4f8fd")


def _agent(report: CareerReadinessReport, name: str):
    return next((a for a in report.agent_outputs if a.name == name), None)


def _p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(text or "").replace("\n", "<br/>"), style)


def _slug(value: str, max_len: int = 48) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", "-", (value or "").strip())
    cleaned = cleaned.strip("-")
    return (cleaned or "report")[:max_len]


def build_pdf_filename(
    report: CareerReadinessReport,
    resume_filename: Optional[str] = None,
) -> str:
    stem = _slug(Path(resume_filename or "resume").stem, 36)
    role = _slug(report.target_role or "role", 28)
    score = report.readiness_score if report.readiness_score is not None else "na"
    return f"CareerPilot-{stem}-{role}-Score{score}.pdf"


def _build_styles():
    base = getSampleStyleSheet()
    styles = {
        "brand": ParagraphStyle(
            "Brand",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=colors.white,
            alignment=TA_LEFT,
            spaceAfter=0,
        ),
        "brandSub": ParagraphStyle(
            "BrandSub",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=colors.HexColor("#dbeafe"),
            spaceAfter=0,
        ),
        "title": ParagraphStyle(
            "DocTitle",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=20,
            textColor=INK,
            spaceBefore=10,
            spaceAfter=4,
            leading=24,
        ),
        "subtitle": ParagraphStyle(
            "DocSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=MUTED,
            spaceAfter=12,
            leading=14,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            textColor=ACCENT,
            spaceBefore=14,
            spaceAfter=6,
            leading=15,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            textColor=INK,
            leading=13,
            spaceAfter=4,
        ),
        "muted": ParagraphStyle(
            "Muted",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            textColor=MUTED,
            leading=12,
            spaceAfter=2,
        ),
        "metaLabel": ParagraphStyle(
            "MetaLabel",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            textColor=MUTED,
            leading=9,
        ),
        "metaValue": ParagraphStyle(
            "MetaValue",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=INK,
            leading=13,
        ),
        "scoreBig": ParagraphStyle(
            "ScoreBig",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=28,
            textColor=ACCENT,
            alignment=TA_CENTER,
            leading=32,
        ),
        "scoreLabel": ParagraphStyle(
            "ScoreLabel",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=MUTED,
            alignment=TA_CENTER,
            leading=10,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            textColor=INK,
            leading=13,
            leftIndent=4,
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
    }
    return styles


def _meta_card(report: CareerReadinessReport, resume_filename: Optional[str], styles) -> Table:
    score = report.readiness_score if report.readiness_score is not None else "—"
    cv_name = Path(resume_filename).name if resume_filename else "Current resume"
    generated = datetime.now(timezone.utc).strftime("%d %b %Y")

    left = [
        [_p("RESUME", styles["metaLabel"])],
        [_p(cv_name, styles["metaValue"])],
        [Spacer(1, 4)],
        [_p("TARGET ROLE", styles["metaLabel"])],
        [_p(f"{report.target_role} · {report.seniority_level or 'Junior'}", styles["metaValue"])],
        [Spacer(1, 4)],
        [_p("JOB SOURCE", styles["metaLabel"])],
        [_p(report.job_source or "curated", styles["metaValue"])],
        [Spacer(1, 4)],
        [_p("GENERATED", styles["metaLabel"])],
        [_p(generated, styles["metaValue"])],
    ]
    right = [
        [_p(str(score), styles["scoreBig"])],
        [_p("READINESS SCORE", styles["scoreLabel"])],
    ]

    left_table = Table(left, colWidths=[118 * mm])
    left_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )
    right_table = Table(right, colWidths=[42 * mm])
    right_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 1, ACCENT),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    card = Table([[left_table, right_table]], colWidths=[120 * mm, 48 * mm])
    card.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
                ("BOX", (0, 0), (-1, -1), 1, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (0, 0), 12),
                ("RIGHTPADDING", (0, 0), (0, 0), 8),
                ("LEFTPADDING", (1, 0), (1, 0), 8),
                ("RIGHTPADDING", (1, 0), (1, 0), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    return card


def _bullet_list(items: list[str], styles, empty: str = "None listed.") -> ListFlowable | Paragraph:
    clean = [i.strip() for i in items if i and str(i).strip()]
    if not clean:
        return _p(empty, styles["muted"])
    return ListFlowable(
        [
            ListItem(_p(item, styles["bullet"]), leftIndent=8, bulletColor=ACCENT)
            for item in clean
        ],
        bulletType="bullet",
        start="•",
        leftIndent=12,
        bulletFontSize=9,
        spaceBefore=0,
        spaceAfter=4,
    )


def _numbered_list(items: list[str], styles) -> ListFlowable | Paragraph:
    clean = [i.strip() for i in items if i and str(i).strip()]
    if not clean:
        return _p("None listed.", styles["muted"])
    return ListFlowable(
        [
            ListItem(_p(item, styles["bullet"]), leftIndent=8, bulletColor=ACCENT)
            for item in clean
        ],
        bulletType="1",
        leftIndent=14,
        bulletFontSize=9,
        spaceBefore=0,
        spaceAfter=4,
    )


def render_report_pdf(
    report: CareerReadinessReport,
    resume_filename: Optional[str] = None,
) -> bytes:
    styles = _build_styles()
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="CareerPilot AI — Career Readiness Report",
        author="CareerPilot AI",
    )

    gap_agent = _agent(report, "SkillGapAgent")
    plan_agent = _agent(report, "LearningPlannerAgent")
    interview = _agent(report, "InterviewCoachAgent")
    resume_opt = _agent(report, "ResumeOptimizationAgent")
    match_agent = _agent(report, "JobMatchingAgent")

    header = Table(
        [
            [
                _p("CareerPilot AI", styles["brand"]),
                _p("Career Readiness Report", styles["brandSub"]),
            ]
        ],
        colWidths=[100 * mm, 70 * mm],
    )
    header.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), ACCENT),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )

    story = [
        header,
        Spacer(1, 10),
        _p("Career Readiness Report", styles["title"]),
        _p(
            "Explainable analysis for your target role — skills, gaps, hiring sprint, and next steps.",
            styles["subtitle"],
        ),
        _meta_card(report, resume_filename, styles),
        Spacer(1, 6),
    ]

    decision = (report.explainability or {}).get("decision_note") or (
        match_agent.strengths[0] if match_agent and match_agent.strengths else ""
    )
    if decision:
        story.extend(
            [
                _p("Summary", styles["section"]),
                HRFlowable(width="100%", thickness=0.6, color=LINE, spaceAfter=6),
                _p(decision, styles["body"]),
            ]
        )

    if report.profile.summary:
        story.extend(
            [
                _p("Profile snapshot", styles["section"]),
                HRFlowable(width="100%", thickness=0.6, color=LINE, spaceAfter=6),
                _p(report.profile.summary, styles["body"]),
            ]
        )

    story.extend(
        [
            _p("Top skills", styles["section"]),
            HRFlowable(width="100%", thickness=0.6, color=LINE, spaceAfter=6),
            _bullet_list(report.profile.skills[:12], styles, empty="No skills extracted."),
            _p("Priority skill gaps", styles["section"]),
            HRFlowable(width="100%", thickness=0.6, color=LINE, spaceAfter=6),
            _numbered_list((gap_agent.gaps[:8] if gap_agent else []), styles),
        ]
    )

    if report.seven_day_plan:
        story.extend(
            [
                _p("7-day hiring sprint", styles["section"]),
                HRFlowable(width="100%", thickness=0.6, color=LINE, spaceAfter=6),
                _numbered_list(report.seven_day_plan, styles),
            ]
        )

    if plan_agent and plan_agent.recommendations:
        story.extend(
            [
                _p("Learning roadmap", styles["section"]),
                HRFlowable(width="100%", thickness=0.6, color=LINE, spaceAfter=6),
                _numbered_list(plan_agent.recommendations[:6], styles),
            ]
        )

    if resume_opt and resume_opt.recommendations:
        story.extend(
            [
                _p("Resume optimization tips", styles["section"]),
                HRFlowable(width="100%", thickness=0.6, color=LINE, spaceAfter=6),
                _numbered_list(resume_opt.recommendations[:6], styles),
            ]
        )

    if interview and (interview.recommendations or interview.interview_tags):
        story.extend(
            [
                _p("Interview prep", styles["section"]),
                HRFlowable(width="100%", thickness=0.6, color=LINE, spaceAfter=6),
            ]
        )
        tags = interview.interview_tags or {}
        if tags:
            for key, items in tags.items():
                if not items:
                    continue
                label = key.replace("_", " ").title()
                story.append(_p(label, styles["metaValue"]))
                story.append(_bullet_list(items[:4], styles))
        elif interview.recommendations:
            story.append(_numbered_list(interview.recommendations[:6], styles))

    jobs = report.matched_jobs or []
    if jobs:
        story.extend(
            [
                _p("Matched opportunities", styles["section"]),
                HRFlowable(width="100%", thickness=0.6, color=LINE, spaceAfter=6),
            ]
        )
        for job in jobs[:5]:
            score = (
                f" · {int(round(job.match_score * 100))}% match"
                if isinstance(job.match_score, (int, float))
                else ""
            )
            title = f"{job.label} @ {job.company or 'Company n/a'}{score}"
            story.append(
                KeepTogether(
                    [
                        _p(title, styles["metaValue"]),
                        _p(
                            ", ".join((job.required_skills or [])[:6])
                            or (job.description_snippet or job.source),
                            styles["muted"],
                        ),
                        Spacer(1, 4),
                    ]
                )
            )

    story.extend(
        [
            Spacer(1, 16),
            HRFlowable(width="100%", thickness=0.8, color=TEAL, spaceAfter=6),
            _p(
                "Generated by CareerPilot AI — multi-agent career readiness analysis.",
                styles["footer"],
            ),
        ]
    )

    def _on_page(canvas, _doc):
        canvas.saveState()
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.4)
        canvas.line(16 * mm, 12 * mm, A4[0] - 16 * mm, 12 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(16 * mm, 8 * mm, "CareerPilot AI")
        canvas.drawRightString(A4[0] - 16 * mm, 8 * mm, f"Page {canvas.getPageNumber()}")
        canvas.restoreState()

    doc.build(story, onFirstPage=_on_page, onLaterPages=_on_page)
    return buffer.getvalue()
