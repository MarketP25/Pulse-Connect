data "external" "env_secrets" {
  program = ["powershell.exe", "./parse-env.ps1", ".env.local"]
}
