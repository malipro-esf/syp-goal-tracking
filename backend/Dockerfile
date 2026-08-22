FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN groupadd --system syp && useradd --system --gid syp --home-dir /app syp

COPY pyproject.toml alembic.ini ./
COPY migrations ./migrations
COPY src ./src
RUN python -m pip install ".[ai]"

USER syp
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/ready', timeout=3)"

CMD ["fastapi", "run", "src/syp/main.py", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
