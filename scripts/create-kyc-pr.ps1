<#
PowerShell helper to create a branch, commit KYC changes, push, and open a PR using GitHub CLI (`gh`).
Usage: .\scripts\create-kyc-pr.ps1 -BranchName "feature/kyc-compliance" -Title "KYC: add compliance schema + automation"
#>
param(
  [string]$BranchName = "feature/kyc-compliance",
  [string]$Title = "KYC: add compliance schema + automation",
  [string]$Body = "This PR adds KYC/compliance DB schema, API endpoints, AI automation wiring, feature flags, UI stubs, and scheduler. Run migrations and provision Redis before merging.",
  [switch]$DryRun
)

Write-Host "Preparing PR on branch: $BranchName"
if ($DryRun) {
  Write-Host "Dry run: listing changed files (git status --porcelain)"
  git status --porcelain
  exit 0
}

# Workaround: detect and automatically add the current repo to Git safe.directory
try {
  git status --porcelain 2>$null | Out-Null
} catch {
  $err = $_.Exception.Message
  if ($err -match "dubious ownership") {
    Write-Host "Detected dubious ownership; adding safe.directory for repository"
    git config --global --add safe.directory "$PWD"
  }
}

git checkout -b $BranchName
# Staging specific files is brittle. A better approach for a helper script might be
# to add all tracked changes, or to pass file patterns as parameters.
# For this review, we will remove error suppression to make failures more obvious.
git add .

# Use a portable staged-change check (list staged files)
$staged = & git diff --cached --name-only
if ($staged -and $staged.Trim().Length -gt 0) {
  git commit -m "$Title"
  git push --set-upstream origin $BranchName
  if (Get-Command gh -ErrorAction SilentlyContinue) {
    gh pr create --title "$Title" --body "$Body" --base main
  } else {
    Write-Host "gh CLI not found. Please run: gh pr create --title '$Title' --body '$Body' --base main"
  }
} else {
  Write-Host "No staged changes to commit. Use -DryRun to inspect status.";
}
