"""Add analysis reports and knowledge base tables

Revision ID: 0002_reports_and_knowledge
Revises: 0001_create_candidate_profiles
Create Date: 2026-08-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_reports_and_knowledge"
down_revision: Union[str, None] = "0001_create_candidate_profiles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "analysis_reports",
        sa.Column("report_id", sa.String(length=64), primary_key=True),
        sa.Column("candidate_id", sa.String(length=64), nullable=False),
        sa.Column("target_role", sa.String(length=128), nullable=False),
        sa.Column("report_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_analysis_reports_candidate_id", "analysis_reports", ["candidate_id"])

    op.create_table(
        "job_listings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("role_key", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("company", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("required_skills_csv", sa.Text(), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("seniority", sa.String(length=64), nullable=False, server_default="junior"),
    )
    op.create_index("ix_job_listings_role_key", "job_listings", ["role_key"])

    op.create_table(
        "skill_requirements",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("role_key", sa.String(length=128), nullable=False),
        sa.Column("skill", sa.String(length=128), nullable=False),
        sa.Column("priority", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("guidance", sa.Text(), nullable=False, server_default=""),
    )
    op.create_index("ix_skill_requirements_role_key", "skill_requirements", ["role_key"])

    op.create_table(
        "knowledge_docs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("role_key", sa.String(length=128), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False, server_default="guidance"),
        sa.Column("content", sa.Text(), nullable=False),
    )
    op.create_index("ix_knowledge_docs_role_key", "knowledge_docs", ["role_key"])


def downgrade() -> None:
    op.drop_index("ix_knowledge_docs_role_key", table_name="knowledge_docs")
    op.drop_table("knowledge_docs")
    op.drop_index("ix_skill_requirements_role_key", table_name="skill_requirements")
    op.drop_table("skill_requirements")
    op.drop_index("ix_job_listings_role_key", table_name="job_listings")
    op.drop_table("job_listings")
    op.drop_index("ix_analysis_reports_candidate_id", table_name="analysis_reports")
    op.drop_table("analysis_reports")
