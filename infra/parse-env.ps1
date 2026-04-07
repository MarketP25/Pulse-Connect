# parse-env.ps1 - Read .env.local and output JSON for Terraform data.external
param(
  [string]$env_file = '.env.local'
)

if (-not (Test-Path $env_file)) {
  Write-Error "File not found: $env_file"
  exit 1
}

$secrets = @{}

Get-Content $env_file | ForEach-Object {
  if ($_ -match '^\s*([^#=]+?)\s*=\s*(.+?)\s*$') {
    $key = $matches[1].Trim()
    $val = $matches[2].Trim()
    if ($val -match '^"(.*)"$') { $val = $matches[1] } # unquote if quoted
    $secrets[$key] = $val
  }
}

$secrets | ConvertTo-Json -Compress
