$ErrorActionPreference = 'Stop'

# Fixed config
$RemoteHost = 'api.sanjiaosoft.com'
$RemoteUser = 'triangle'
$RemotePort = 17235
$RemoteRoot = '/opt/triangle'
$ProjectRoot = 'E:\Project\Triangle'
$ReleaseName = 'triangle-release.tgz'
$ReleasePath = Join-Path $ProjectRoot $ReleaseName

function Require-Cmd {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Command not found: $Name. Please install it and add it to PATH."
  }
}

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $false)][string[]]$Arguments = @(),
    [string]$Step = 'native command'
  )
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Step failed (exit code: $LASTEXITCODE)"
  }
}

Require-Cmd -Name 'npm'
Require-Cmd -Name 'npx'
Require-Cmd -Name 'ssh'
Require-Cmd -Name 'scp'
Require-Cmd -Name 'tar'

$SshCmd = (Get-Command ssh).Source
$ScpCmd = (Get-Command scp).Source
$TarCmd = (Get-Command tar).Source

Write-Host "Using ssh: $SshCmd"
Write-Host "Using scp: $ScpCmd"
Write-Host "Using tar: $TarCmd"

Write-Host '==> 1) Build Frontend locally'
Set-Location "$ProjectRoot\Frontend"
Invoke-Native -FilePath 'npm' -Arguments @('ci') -Step 'Frontend npm ci'
Invoke-Native -FilePath 'npm' -Arguments @('run', 'build') -Step 'Frontend build'

Write-Host '==> 2) Build Backend locally'
Set-Location "$ProjectRoot\backend"
Invoke-Native -FilePath 'npm' -Arguments @('ci') -Step 'Backend npm ci'
Invoke-Native -FilePath 'npx' -Arguments @('prisma', 'generate') -Step 'Prisma generate'
Invoke-Native -FilePath 'npx' -Arguments @('prisma', 'generate', '--schema', 'prisma/schema.postgresql.prisma') -Step 'Prisma generate (postgresql schema)'

Write-Host '==> 3) Create release archive locally'
Set-Location $ProjectRoot
if (Test-Path $ReleasePath) {
  Remove-Item -Force $ReleasePath
}

$FrontendEnvLocalPath = "$ProjectRoot\Frontend\.env.local"
if (-not (Test-Path $FrontendEnvLocalPath)) {
  throw "Missing file: $FrontendEnvLocalPath"
}

$FrontendEnvLocalContent = Get-Content -Raw $FrontendEnvLocalPath
if ($FrontendEnvLocalContent -notmatch '(?m)^\s*API_INTERNAL_BASE_URL\s*=') {
  throw "Frontend/.env.local is missing API_INTERNAL_BASE_URL. Please add: API_INTERNAL_BASE_URL=http://127.0.0.1:58085"
}

Invoke-Native -FilePath $TarCmd -Arguments @(
  '-czf', $ReleaseName,
  '--exclude=.git',
  '--exclude=Frontend/node_modules',
  '--exclude=Frontend/.next/cache',
  '--exclude=Frontend/.env.local',
  '--exclude=backend/node_modules',
  '--exclude=backend/uploads',
  '--exclude=backend/.env',
  '--exclude=*.log',
  'Frontend',
  'backend'
) -Step 'Create release archive'

Write-Host '==> 4) Upload archive and env files with scp'
Invoke-Native -FilePath $ScpCmd -Arguments @(
  '-P', "$RemotePort",
  $ReleasePath,
  "${RemoteUser}@${RemoteHost}:${RemoteRoot}/$ReleaseName"
) -Step 'SCP release archive'

Invoke-Native -FilePath $ScpCmd -Arguments @(
  '-P', "$RemotePort",
  "$ProjectRoot\backend\.env",
  "${RemoteUser}@${RemoteHost}:${RemoteRoot}/backend/.env"
) -Step 'SCP backend .env'

Invoke-Native -FilePath $ScpCmd -Arguments @(
  '-P', "$RemotePort",
  "$ProjectRoot\Frontend\.env.local",
  "${RemoteUser}@${RemoteHost}:${RemoteRoot}/Frontend/.env.local"
) -Step 'SCP frontend .env.local'

Write-Host '==> 5) Extract and restart on remote (no seed)'
$RemoteCmd = @"
set -e
cd $RemoteRoot

mkdir -p Frontend backend backend/uploads backend/uploads/sign backend/uploads/sign-assets

tar -xzf $ReleaseName -C $RemoteRoot
rm -f $ReleaseName

cd $RemoteRoot/Frontend
npm ci --omit=dev

cd $RemoteRoot/backend
npm ci --omit=dev

pm2 restart triangle-frontend
pm2 restart triangle-backend
pm2 restart triangle-sign-service
pm2 save

curl -fsS http://127.0.0.1:58085/health >/dev/null
echo "Deploy done. Backend health check passed."
"@

Invoke-Native -FilePath $SshCmd -Arguments @(
  '-p', "$RemotePort",
  "${RemoteUser}@${RemoteHost}",
  $RemoteCmd
) -Step 'Remote deploy and restart'

Write-Host '==> 6) Cleanup local archive'
if (Test-Path $ReleasePath) {
  Remove-Item -Force $ReleasePath
}

Write-Host '==> All done'
