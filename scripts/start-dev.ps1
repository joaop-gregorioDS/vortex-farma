$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $taskRoot
docker compose -f infra/compose.services.yml up -d --wait
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível iniciar os serviços.' }
dotnet run --project backend/src/VortexFarma.Api --no-launch-profile -- --migrate
if ($LASTEXITCODE -ne 0) { throw 'Falha ao aplicar as migrations.' }
Start-Process -FilePath 'dotnet' -ArgumentList @('run','--project','backend/src/VortexFarma.Api','--no-launch-profile','--urls','http://127.0.0.1:5080') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRoot 'api.log') -RedirectStandardError (Join-Path $taskRoot 'api-error.log')
Start-Process -FilePath 'dotnet' -ArgumentList @('run','--project','backend/src/VortexFarma.Worker','--no-launch-profile') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRoot 'worker.log') -RedirectStandardError (Join-Path $taskRoot 'worker-error.log')
Set-Location -LiteralPath (Join-Path $taskRoot 'frontend')
npm ci
npm run dev
