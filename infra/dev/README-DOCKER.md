Docker development helper for PULSCO infra

Prerequisites
- Docker Desktop installed on Windows
- Docker CLI available in PATH

Quick start (PowerShell from repo root)

1) Start Docker and apply migrations (automated):

```powershell
.\scripts\start-docker-and-run-migrations.ps1
```

2) Manually start compose if you prefer:

```powershell
docker compose -f infra/dev/docker-compose.yml up -d
docker compose -f infra/dev/docker-compose.yml exec -T db psql -U postgres -d postgres -f /migrations/001_initial_schema.sql
```

Notes
- The compose file mounts `infra/db-migrations` into the container at `/migrations`.
- If `docker compose` fails, ensure Docker Desktop is running and that your user has access to the Docker socket.
