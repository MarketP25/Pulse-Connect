import fs from 'node:fs/promises'
import path from 'node:path'

export async function pathExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export async function findRepoRoot(startDir) {
  let dir = path.resolve(startDir)
  while (true) {
    if (await pathExists(path.join(dir, 'pnpm-workspace.yaml'))) return dir
    if (await pathExists(path.join(dir, '.git'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) {
      throw new Error(`Unable to locate repo root from: ${startDir}`)
    }
    dir = parent
  }
}

export async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

export async function listDirs(dir) {
  if (!(await pathExists(dir))) return []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory()).map((e) => path.join(dir, e.name))
}

export async function getNextAppDirs(repoRoot) {
  const candidates = new Set()

  // apps/*
  for (const dir of await listDirs(path.join(repoRoot, 'apps'))) candidates.add(dir)

  // top-level UIs
  candidates.add(path.join(repoRoot, 'pulse-connect-ui'))
  candidates.add(path.join(repoRoot, 'pulse-connect-admin-ui'))

  // nested admin dashboards
  for (const dir of await listDirs(path.join(repoRoot, 'pulse-connect-admin-ui', 'apps'))) candidates.add(dir)

  const out = []
  for (const dir of candidates) {
    const pkgPath = path.join(dir, 'package.json')
    if (!(await pathExists(pkgPath))) continue
    const pkg = await readJson(pkgPath)
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
    if (!deps.next) continue
    out.push(dir)
  }

  return out.sort()
}

export function parseArgs(argv) {
  const args = { all: false, app: null, verbose: false }
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--all') args.all = true
    else if (a === '--verbose') args.verbose = true
    else if (a === '--app') args.app = argv[++i]
    else throw new Error(`Unknown argument: ${a}`)
  }
  return args
}

