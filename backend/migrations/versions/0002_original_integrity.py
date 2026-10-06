"""Prevent overwriting initial extraction and enforce technical decision values."""

from alembic import op

revision = "0002_original_integrity"
down_revision = "0001_persistence"
branch_labels = None
depends_on = None


def upgrade():
    op.create_check_constraint(
        "ck_triages_status",
        "triages",
        "status IN ('PROCESSED','NEEDS_AUDIT','APPROVED','REJECTED')",
    )
    op.create_check_constraint("ck_triages_priority", "triages", "priority IN ('Rutina','Urgente')")
    op.create_check_constraint(
        "ck_triages_version", "triages", "version > 0 AND schema_version > 0"
    )
    op.execute("""CREATE FUNCTION mediflow_forbid_original_change() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
        IF OLD.extraction_original IS DISTINCT FROM NEW.extraction_original THEN
            RAISE EXCEPTION 'extraction_original is immutable';
        END IF; RETURN NEW; END $$""")
    op.execute("""CREATE TRIGGER mediflow_immutable_extraction BEFORE UPDATE ON triages
        FOR EACH ROW EXECUTE FUNCTION mediflow_forbid_original_change()""")


def downgrade():
    raise RuntimeError("Downgrade no autorizado")
