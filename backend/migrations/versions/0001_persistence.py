"""Initial persistence schema, immutable audit, additive migration."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0001_persistence"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "documents",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("public_id", sa.String(128), nullable=False, unique=True),
        sa.Column("channel", sa.String(100), nullable=False),
        sa.Column("media_type", sa.String(100), nullable=False),
        sa.Column("original_filename", sa.Text()),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("provider", sa.String(40), nullable=False),
        sa.Column("bucket", sa.String(100)),
        sa.Column("object_key", sa.Text(), nullable=False, unique=True),
        sa.Column("storage_state", sa.String(20), nullable=False),
        sa.Column("upload_token", sa.String(32)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("size_bytes >= 0"),
        sa.CheckConstraint("storage_state IN ('PENDING','READY','FAILED')"),
    )
    op.create_table(
        "triages",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column(
            "document_id", sa.String(32), sa.ForeignKey("documents.id"), nullable=False, unique=True
        ),
        sa.Column("document_type", sa.Text(), nullable=False),
        sa.Column("priority", sa.String(20), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("destination", sa.String(40), nullable=False),
        sa.Column("urgent_alert", sa.Boolean(), nullable=False),
        sa.Column("extraction_original", JSONB(), nullable=False),
        sa.Column("extraction_current", JSONB(), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("confidence >= 0 AND confidence <= 1"),
    )
    op.create_index("ix_triages_status", "triages", ["status"])
    op.create_index("ix_triages_destination", "triages", ["destination"])
    op.create_table(
        "review_events",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column(
            "triage_id", sa.String(32), sa.ForeignKey("triages.id"), nullable=False, unique=True
        ),
        sa.Column("action", sa.String(30), nullable=False),
        sa.Column("reviewer", sa.Text(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("previous_status", sa.String(30), nullable=False),
        sa.Column("new_status", sa.String(30), nullable=False),
        sa.Column("previous_destination", sa.String(40), nullable=False),
        sa.Column("new_destination", sa.String(40), nullable=False),
        sa.Column("before", JSONB(), nullable=False),
        sa.Column("after", JSONB(), nullable=False),
        sa.Column("corrections", JSONB(), nullable=False),
    )
    op.execute("""CREATE FUNCTION mediflow_forbid_audit_change() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
        RAISE EXCEPTION 'review_events are append-only'; END $$""")
    op.execute("""CREATE TRIGGER mediflow_immutable_review BEFORE UPDATE OR DELETE ON review_events
        FOR EACH ROW EXECUTE FUNCTION mediflow_forbid_audit_change()""")


def downgrade():
    raise RuntimeError("Downgrade destructivo no autorizado; usar migracion aditiva")
