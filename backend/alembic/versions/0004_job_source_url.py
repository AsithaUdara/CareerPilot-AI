"""Add source_url to job_listings for curated real JD links

Revision ID: 0004_job_source_url
Revises: 0003_analysis_jobs
Create Date: 2026-08-05
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_job_source_url"
down_revision: Union[str, None] = "0003_analysis_jobs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "job_listings",
        sa.Column("source_url", sa.String(length=512), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("job_listings", "source_url")
