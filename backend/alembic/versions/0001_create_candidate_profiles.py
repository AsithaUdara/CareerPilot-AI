"""Create candidate_profiles table

Revision ID: 0001_create_candidate_profiles
Revises:
Create Date: 2026-08-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_create_candidate_profiles"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_profiles",
        sa.Column("candidate_id", sa.String(length=64), primary_key=True),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("skills_csv", sa.Text(), nullable=False, server_default=""),
        sa.Column("education_csv", sa.Text(), nullable=False, server_default=""),
        sa.Column("projects_csv", sa.Text(), nullable=False, server_default=""),
        sa.Column("experience_csv", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )


def downgrade() -> None:
    op.drop_table("candidate_profiles")
