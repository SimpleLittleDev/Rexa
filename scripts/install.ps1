# Rexa one-line installer for Windows (PowerShell 5.1+).
#
#   iwr -useb https://raw.githubusercontent.com/SimpleLittleDev/Rexa/main/scripts/install.ps1 | iex
#
# Env overrides:
#   $env:REXA_REPO   = "https://github.com/SimpleLittleDev/Rexa.git"
#   $env:REXA_BRANCH = "main"
#   $env:REXA_HOME   = "$env:USERPROFILE\.rexa"

$ErrorActionPreference = "Stop"

function Require-Cmd($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Error "Butuh '$name' di PATH"
        exit 1
    }
}

$repo   = if ($env:REXA_REPO)   { $env:REXA_REPO }   else { "https://github.com/SimpleLittleDev/Rexa.git" }
$branch = if ($env:REXA_BRANCH) { $env:REXA_BRANCH } else { "main" }
$home_  = if ($env:REXA_HOME)   { $env:REXA_HOME }   else { Join-Path $env:USERPROFILE ".rexa" }

Write-Host "Rexa installer" -ForegroundColor Cyan
Require-Cmd git
Require-Cmd node
Require-Cmd npm

$major = [int](node -p "process.versions.node.split('.')[0]")
if ($major -lt 20) {
    Write-Error "Node.js >= 20 required (you have $(node -v))"
    exit 1
}

if (Test-Path (Join-Path $home_ ".git")) {
    Write-Host "  > Updating $home_"
    git -C $home_ fetch --quiet origin $branch
    git -C $home_ reset --hard "origin/$branch"
} else {
    Write-Host "  > Cloning $repo -> $home_"
    git clone --branch $branch --depth 1 $repo $home_
}

Push-Location $home_
try {
    Write-Host "  > Installing dependencies"
    npm install --silent

    Write-Host "  > Building TypeScript"
    npm run build --silent

    Write-Host "  > Linking 'rexa' command globally"
    npm link --silent
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  rexa setup     # interactive wizard"
Write-Host "  rexa doctor    # verify environment"
Write-Host "  rexa chat      # CLI chat"
Write-Host ""
Write-Host "Rexa home: $home_"
Write-Host "Override anytime: `$env:REXA_HOME = 'C:\\path\\to\\config'"
