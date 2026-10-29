"""Original-first processing with one-time extraction initialization."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0003_processing_state"
down_revision = "0002_original_integrity"
branch_labels = None
depends_on = None


def upgrade():
    # Existing rows are already complete; their immutable originals remain unchanged.
    op.add_column(
        "triages",
        sa.Column("processing_status", sa.String(20), nullable=False, server_default="SUCCEEDED"),
    )
    op.add_column("triages", sa.Column("processing_token", sa.String(32)))
    op.add_column("triages", sa.Column("processing_lease_until", sa.DateTime(timezone=True)))
    op.add_column("triages", sa.Column("processing_error", sa.String(60)))
    op.add_column(
        "triages",
        sa.Column("provenance", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    for name, column_type in [
        ("document_type", sa.Text()),
        ("priority", sa.String(20)),
        ("confidence", sa.Float()),
        ("extraction_original", JSONB()),
        ("extraction_current", JSONB()),
    ]:
        op.alter_column("triages", name, existing_type=column_type, nullable=True)
    op.create_check_constraint(
        "ck_triages_processing",
        "triages",
        "processing_status IN ('PENDING','PROCESSING','SUCCEEDED','FAILED')",
    )
    op.execute("""CREATE OR REPLACE FUNCTION mediflow_forbid_original_change() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
        IF OLD.extraction_original IS DISTINCT FROM NEW.extraction_original THEN
            IF OLD.extraction_original IS NOT NULL
               OR OLD.processing_status <> 'PROCESSING'
               OR OLD.processing_token IS NULL
               OR NEW.processing_status NOT IN ('SUCCEEDED','FAILED')
               OR NEW.processing_token IS NOT NULL
               OR NEW.extraction_original IS NULL THEN
                RAISE EXCEPTION 'extraction_original is immutable after initialization';
            END IF;
        END IF; RETURN NEW; END $$""")


def downgrade():
    raise RuntimeError("Downgrade destructivo no autorizado")
