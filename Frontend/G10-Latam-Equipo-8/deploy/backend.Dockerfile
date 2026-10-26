FROM ghcr.io/astral-sh/uv:0.13.1 AS uv
FROM python:3.12-slim

COPY --from=uv /uv /uvx /bin/
ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_LINK_MODE=copy \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:${PATH}"
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project
COPY app/ ./app/
RUN groupadd --system --gid 10001 mediflow \
    && useradd --system --uid 10001 --gid mediflow --no-create-home mediflow \
    && mkdir -p /var/lib/mediflow \
    && chown 10001:10001 /var/lib/mediflow

USER 10001:10001
EXPOSE 8002
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "1"]
