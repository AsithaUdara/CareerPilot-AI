"""Add users table and candidate_profiles.user_id ownership

Revision ID: 0006_users_auth
Revises: 0005_profile_portfolio
Create Date: 2026-08-05
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0006_users_auth"
down_revision: Union[str, None] = "0005_profile_portfolio"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()

    if "users" not in tables:
        op.create_table(
            "users",
            sa.Column("id", sa.String(length=64), primary_key=True),
            sa.Column("google_sub", sa.String(length=128), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False, server_default=""),
            sa.Column("picture_url", sa.String(length=512), nullable=False, server_default=""),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)
        op.create_index("ix_users_email", "users", ["email"], unique=False)
    else:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("users")}
        if "ix_users_google_sub" not in existing_indexes:
            op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)
        if "ix_users_email" not in existing_indexes:
            op.create_index("ix_users_email", "users", ["email"], unique=False)

    columns = {col["name"] for col in inspector.get_columns("candidate_profiles")}
    if "user_id" not in columns:
        op.add_column(
            "candidate_profiles",
            sa.Column("user_id", sa.String(length=64), nullable=True),
        )
        op.create_index("ix_candidate_profiles_user_id", "candidate_profiles", ["user_id"])
        op.create_foreign_key(
            "fk_candidate_profiles_user_id",
            "candidate_profiles",
            "users",
            ["user_id"],
            ["id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("candidate_profiles")}
    if "user_id" in columns:
        op.drop_constraint("fk_candidate_profiles_user_id", "candidate_profiles", type_="foreignkey")
        op.drop_index("ix_candidate_profiles_user_id", table_name="candidate_profiles")
        op.drop_column("candidate_profiles", "user_id")
    if "users" in inspector.get_table_names():
        op.drop_index("ix_users_email", table_name="users")
        op.drop_index("ix_users_google_sub", table_name="users")
        op.drop_table("users")
