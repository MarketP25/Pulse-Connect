@echo off
echo Applying all SQL files in Pulsco project to pulsco_db...

REM Recursively loop through every .sql file under your Pulsco project
for /R %%f in (*.sql) do (
  echo Running %%f ...
  docker compose exec db psql -U pulsco -d pulsco -f "%%f"
)

echo Done applying SQL migrations.
pause
