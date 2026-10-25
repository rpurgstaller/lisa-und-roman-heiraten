@echo off
setlocal EnableExtensions

rem Requires the PostgreSQL client (psql) on PATH.
rem Set the connection string first, e.g.:
rem   set SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres?sslmode=require

if "%SUPABASE_DB_URL%"=="" (
  echo Environment variable SUPABASE_DB_URL is not set.
  exit /b 1
)

where psql >nul 2>&1
if errorlevel 1 (
  echo psql was not found on PATH. Install the PostgreSQL client tools.
  exit /b 1
)

echo WARNING: This deletes ALL tables and functions in the public schema, including all data.
set /p CONFIRM=Type RESET to continue: 
if not "%CONFIRM%"=="RESET" (
  echo Aborted.
  exit /b 1
)

set "DDL_DIR=%~dp0"

for %%F in (
  reset_database.sql
  create_schema.sql
  admin_read_policies.sql
  admin_insert_policies.sql
  admin_update_policies.sql
) do (
  echo Running %%F ...
  psql "%SUPABASE_DB_URL%" -v ON_ERROR_STOP=1 -f "%DDL_DIR%%%F"
  if errorlevel 1 (
    echo Failed while running %%F. Database may be partially reset.
    exit /b 1
  )
)

echo Schema reset completed.
endlocal
