$map = Get-Content 'C:\Users\user\Pulse Connect\.git-restore-map.json' -Raw | ConvertFrom-Json
$count=0
foreach ($e in $map) {
  $f = $e.file
  if ($f -match '\.bak\.merge' -or $f -match 'node_modules' -or $f -match '\\.idea/') { continue }
  Write-Output "CHECKOUT: $f"
  git checkout restore/missing-20251130 -- "$f" 2>$null
  if ($LASTEXITCODE -ne 0) { Write-Output "FAILED_CHECKOUT: $f" } else { $count++ }
}
Write-Output "CHECKED_OUT_COUNT:$count"
git status --porcelain
git add -A
try { git commit -m "Restore mapped files (clean, exclude artifacts/backups)" } catch { Write-Output "NO_CHANGES_TO_COMMIT" }
