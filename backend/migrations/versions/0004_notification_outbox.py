"""Persist metadata-only human-review notification intents."""

from alembic import op
import sqlalchemy as sa

revision = "0004_notification_outbox"
down_revision = "0003_processing_state"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "notification_outbox",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("triage_id", sa.String(32), sa.ForeignKey("triages.id"), nullable=False),
        sa.Column("event_type", sa.String(40), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("idempotency_key", sa.String(64), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_attempt_at", sa.DateTime(timezone=True)),
        sa.Column("delivered_at", sa.DateTime(timezone=True)),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True)),
        sa.Column("error_code", sa.String(60)),
        sa.CheckConstraint("event_type = 'REVIEW_REQUIRED'", name="ck_notification_outbox_event"),
        sa.CheckConstraint("channel = 'SLACK'", name="ck_notification_outbox_channel"),
        sa.CheckConstraint("attempt_count >= 0", name="ck_notification_outbox_attempt_count"),
        sa.UniqueConstraint("idempotency_key", name="uq_notification_outbox_idempotency"),
        sa.UniqueConstraint("triage_id", "event_type", name="uq_notification_outbox_triage_event"),
    )


def downgrade():
    raise RuntimeError("Downgrade destructivo no autorizado")
