<#
Create a GitHub Pull Request via the REST API using a personal access token.

Usage (recommended):
  $env:GITHUB_TOKEN = '<your_token>'
  .\scripts\create-pr-api.ps1 -Title 'KYC: add compliance schema + automation' -Body '...'

The script reads the `origin` remote to determine owner/repo. It requires that
the current branch is pushed to origin (the script does not push).
#>

param(
  [string]$Title = "KYC: add compliance schema + automation",
  [string]$Body = "This PR adds KYC/compliance DB schema, API endpoints, AI automation wiring, feature flags, UI stubs, and scheduler. Run migrations and provision Redis before merging.",
  [string]$Base = "main"
)

function Fail($msg){ Write-Error $msg; exit 1 }

if (-not $env:GITHUB_TOKEN) {
  Fail "GITHUB_TOKEN environment variable is required. Create a token with 'repo' scope and set it: `$env:GITHUB_TOKEN = '<token>'`"
}

$origin = git remote get-url origin 2>$null
if (-not $origin) { Fail "Could not read 'origin' remote. Make sure you're in a git repo with origin set." }

# Parse owner/repo from origin URL
if ($origin -match 'git@github.com:(.+)/(.+)\.git') {
  $owner = $Matches[1]; $repo = $Matches[2]
} elseif ($origin -match 'https?://github.com/(.+)/(.+)(?:\.git)?') {
  $owner = $Matches[1]; $repo = $Matches[2]
} else {
  Fail "Unrecognized origin format: $origin"
}

$branch = git rev-parse --abbrev-ref HEAD
if (-not $branch) { Fail "Could not determine current branch." }

Write-Host "Creating PR from '$branch' into '$Base' on $owner/$repo"

$url = "https://api.github.com/repos/$owner/$repo/pulls"

$payload = @{ title = $Title; head = $branch; base = $Base; body = $Body } | ConvertTo-Json

try {
  $resp = Invoke-RestMethod -Method Post -Uri $url -Headers @{ Authorization = "token $env:GITHUB_TOKEN"; 'User-Agent' = 'pulsco-agent' } -ContentType 'application/json' -Body $payload
  Write-Host "Pull request created: $($resp.html_url)"
} catch {
  Write-Error "Failed to create PR: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.Content | Write-Host }
  exit 1
}
