from alembic import context
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

from app.adapters.outbound.persistence_models import Base
from app.infrastructure.settings import Settings, postgres_url

settings = Settings(repository_mode="postgres")
secret = settings.database_url_direct or settings.database_url
if secret is None:
    raise RuntimeError("DATABASE_URL_DIRECT requerido para migraciones")
url = postgres_url(secret.get_secret_value())
if "-pooler" in url:
    raise RuntimeError("Usar conexion directa para migraciones")

if context.is_offline_mode():
    context.configure(url=url, target_metadata=Base.metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = create_engine(url, poolclass=NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=Base.metadata)
        with context.begin_transaction():
            context.run_migrations()
