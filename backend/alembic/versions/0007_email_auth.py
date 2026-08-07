"""Email auth: nullable google_sub, password_hash, unique email

Revision ID: 0007_email_auth
Revises: 0006_users_auth
Create Date: 2026-08-06
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0007_email_auth"
down_revision: Union[str, None] = "0006_users_auth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "users" not in inspector.get_table_names():
        return

    columns = {col["name"]: col for col in inspector.get_columns("users")}
    if "password_hash" not in columns:
        op.add_column(
            "users",
            sa.Column("password_hash", sa.String(length=255), nullable=True),
        )

    # Make google_sub nullable for email-only accounts
    op.alter_column(
        "users",
        "google_sub",
        existing_type=sa.String(length=128),
        nullable=True,
    )

    # Ensure email uniqueness (idempotent)
    indexes = {idx["name"] for idx in inspector.get_indexes("users")}
    if "ix_users_email_unique" not in indexes and "uq_users_email" not in indexes:
        # Drop non-unique email index if present, then add unique
        if "ix_users_email" in indexes:
            op.drop_index("ix_users_email", table_name="users")
        op.create_index("ix_users_email", "users", ["email"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "users" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("users")}
    if "password_hash" in columns:
        op.drop_column("users", "password_hash")
    op.alter_column(
        "users",
        "google_sub",
        existing_type=sa.String(length=128),
        nullable=False,
    )
