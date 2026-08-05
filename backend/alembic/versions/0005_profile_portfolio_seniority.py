"""Add portfolio URLs to candidate profiles and seniority to analysis jobs

Revision ID: 0005_profile_portfolio
Revises: 0004_job_source_url
Create Date: 2026-08-05
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_profile_portfolio"
down_revision: Union[str, None] = "0004_job_source_url"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "candidate_profiles",
        sa.Column("github_url", sa.String(length=512), nullable=False, server_default=""),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column("linkedin_url", sa.String(length=512), nullable=False, server_default=""),
    )
    op.add_column(
        "analysis_jobs",
        sa.Column("seniority_level", sa.String(length=32), nullable=False, server_default="junior"),
    )


def downgrade() -> None:
    op.drop_column("analysis_jobs", "seniority_level")
    op.drop_column("candidate_profiles", "linkedin_url")
    op.drop_column("candidate_profiles", "github_url")
