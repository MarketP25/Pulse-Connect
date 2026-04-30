import fs from 'node:fs/promises'
import path from 'node:path'

import {
  BASE_PATH_BY_APP,
  CRITICAL_ENDPOINT_GUARD_MARKER,
  CRITICAL_LOCAL_ENDPOINTS,
  EDGE_EXECUTE_PROXY_ROUTES,
  REQUIRED_CANONICAL_ICONS,
  UNIFIED_ORIGIN_FILES,
  UNIFIED_ORIGIN_REQUIRED_PATHS,
  UNIFIED_ORIGIN_REQUIRED_SERVICE_NAMES,
} from './config.mjs'
import { findRepoRoot, pathExists, readJson } from '../pwa/_lib.mjs'

const NEXT_CONFIG_FILES = ['next.config.ts', 'next.config.js', 'next.config.mjs']
const CLIENT_DB_IMPORT_RE =
  /from\s+['"](firebase\/auth|firebase\/firestore|firebase\/database|@\/lib\/firebaseClient|@\/lib\/firebaseAdmin|pg|mongodb)['"]/
const CLIENT_DB_ALLOWLIST_PATH = '.governance/client-db-allowlist.json'
const CSI_INTERNAL_IMPORT_RE = /from\s+['"]@pulsco\/csi(?:\/[^'"]+)?['"]/
const CSI_API_ALLOWLIST = new Set([
  'pulse-connect-admin-ui/src/app/api/admin/csi/route.ts',
  'apps/pulse-connect-admin-ui/app/api/admin/csi/route.ts',
])

function rel(repoRoot, absolutePath) {
  return path.relative(repoRoot, absolutePath).replaceAll(path.sep, '/')
}

async function getAllPackageJsonFiles(repoRoot) {
  const out = []

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next' || entry.name === 'dist') {
          continue
        }
        await walk(full)
        continue
      }
      if (entry.name === 'package.json') out.push(full)
    }
  }

  await walk(repoRoot)
  return out
}

async function checkDuplicatePackageNames(repoRoot) {
  const errors = []
  const files = await getAllPackageJsonFiles(repoRoot)
  const byName = new Map()

  for (const file of files) {
    try {
      const pkg = await readJson(file)
      if (!pkg?.name) continue
      const arr = byName.get(pkg.name) || []
      arr.push(file)
      byName.set(pkg.name, arr)
    } catch {
      errors.push(`invalid JSON: ${rel(repoRoot, file)}`)
    }
  }

  for (const [name, locations] of byName.entries()) {
    if (locations.length <= 1) continue
    errors.push(`duplicate package name "${name}" in:\n  - ${locations.map((f) => rel(repoRoot, f)).join('\n  - ')}`)
  }

  return errors
}

async function resolveNextConfig(appDir) {
  for (const fileName of NEXT_CONFIG_FILES) {
    const candidate = path.join(appDir, fileName)
    if (await pathExists(candidate)) return candidate
  }
  return null
}

async function checkBasePaths(repoRoot) {
  const errors = []

  for (const [appRel, expectedBasePath] of Object.entries(BASE_PATH_BY_APP)) {
    const appDir = path.join(repoRoot, appRel)
    const configPath = await resolveNextConfig(appDir)
    if (!configPath) {
      errors.push(`missing next.config for ${appRel}`)
      continue
    }

    const raw = await fs.readFile(configPath, 'utf8')
    if (!raw.includes('basePath')) {
      errors.push(`${appRel} missing basePath in ${path.basename(configPath)}`)
      continue
    }
    if (!raw.includes(expectedBasePath)) {
      errors.push(`${appRel} basePath does not include expected value "${expectedBasePath}"`)
    }
  }

  return errors
}

async function checkCriticalEndpointGuards(repoRoot) {
  const errors = []

  for (const endpointRel of CRITICAL_LOCAL_ENDPOINTS) {
    const absolutePath = path.join(repoRoot, endpointRel)
    if (!(await pathExists(absolutePath))) {
      errors.push(`missing critical endpoint: ${endpointRel}`)
      continue
    }

    const raw = await fs.readFile(absolutePath, 'utf8')
    if (!raw.includes(CRITICAL_ENDPOINT_GUARD_MARKER)) {
      errors.push(`critical endpoint missing guard marker (${CRITICAL_ENDPOINT_GUARD_MARKER}): ${endpointRel}`)
    }
  }

  return errors
}

async function checkEdgeExecuteProxies(repoRoot) {
  const errors = []

  for (const routeRel of EDGE_EXECUTE_PROXY_ROUTES) {
    const absolutePath = path.join(repoRoot, routeRel)
    if (!(await pathExists(absolutePath))) {
      errors.push(`missing edge execute proxy route: ${routeRel}`)
      continue
    }
    const raw = await fs.readFile(absolutePath, 'utf8')
    if (!raw.includes('/edge/execute')) {
      errors.push(`route does not target /edge/execute: ${routeRel}`)
    }
    if (!raw.toLowerCase().includes('csi_gateway_access')) {
      errors.push(`route missing immutable reason_code=CSI_GATEWAY_ACCESS: ${routeRel}`)
    }
  }

  return errors
}

async function checkCanonicalPwaIcons(repoRoot) {
  const errors = []
  for (const iconRel of REQUIRED_CANONICAL_ICONS) {
    if (!(await pathExists(path.join(repoRoot, iconRel)))) {
      errors.push(`missing canonical icon: ${iconRel}`)
    }
  }
  return errors
}

async function checkPwaPackageDependency(repoRoot) {
  const errors = []
  for (const appRel of Object.keys(BASE_PATH_BY_APP)) {
    const pkgPath = path.join(repoRoot, appRel, 'package.json')
    if (!(await pathExists(pkgPath))) continue
    const pkg = await readJson(pkgPath)
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
    if (!deps['@pulsco/pwa']) {
      errors.push(`${appRel} missing @pulsco/pwa dependency`)
    }
  }
  return errors
}

async function checkUnifiedOriginRouting(repoRoot) {
  const errors = []
  const canonicalHostTokens = ['pulsco.global', 'www.pulsco.global']

  for (const relPath of UNIFIED_ORIGIN_FILES) {
    const absolutePath = path.join(repoRoot, relPath)
    if (!(await pathExists(absolutePath))) {
      errors.push(`missing unified-origin routing file: ${relPath}`)
      continue
    }

    const raw = await fs.readFile(absolutePath, 'utf8')
    for (const hostToken of canonicalHostTokens) {
      if (!raw.includes(hostToken)) {
        errors.push(`${relPath} missing host token: ${hostToken}`)
      }
    }

    for (const routeToken of UNIFIED_ORIGIN_REQUIRED_PATHS) {
      if (!raw.includes(routeToken)) {
        errors.push(`${relPath} missing route token: ${routeToken}`)
      }
    }
  }

  const composePath = path.join(repoRoot, 'infra', 'dev', 'docker-compose.yml')
  if (await pathExists(composePath)) {
    const compose = await fs.readFile(composePath, 'utf8')
    if (!compose.includes('unified-gateway')) {
      errors.push('infra/dev/docker-compose.yml missing unified-gateway service')
    }
  } else {
    errors.push('missing infra/dev/docker-compose.yml')
  }

  return errors
}

function extractServiceNamesFromYaml(raw) {
  const names = []
  const lines = raw.split(/\r?\n/)

  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*kind:\s*Service\s*$/.test(lines[i])) continue

    for (let j = i + 1; j < lines.length; j += 1) {
      const line = lines[j]
      if (/^\s*---\s*$/.test(line)) break
      if (/^\s*spec:\s*$/.test(line)) break
      if (/^\s*metadata:\s*$/.test(line)) continue

      const match = line.match(/^\s*name:\s*([a-z0-9.-]+)\s*$/)
      if (match?.[1]) {
        names.push(match[1])
        break
      }
    }
  }

  return names
}

async function checkUnifiedOriginServiceBackends(repoRoot) {
  const errors = []
  const k8sRoot = path.join(repoRoot, 'infra', 'k8s')
  const ingressPath = path.join(k8sRoot, 'pulsco-unified-origin-ingress.yaml')

  if (!(await pathExists(ingressPath))) {
    errors.push('missing infra/k8s/pulsco-unified-origin-ingress.yaml')
    return errors
  }

  const yamlFiles = []
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
        continue
      }
      if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) yamlFiles.push(full)
    }
  }
  await walk(k8sRoot)

  const definedServices = new Set()
  for (const file of yamlFiles) {
    const raw = await fs.readFile(file, 'utf8')
    for (const serviceName of extractServiceNamesFromYaml(raw)) definedServices.add(serviceName)
  }

  const ingressRaw = await fs.readFile(ingressPath, 'utf8')
  const referencedServices = new Set()
  for (const match of ingressRaw.matchAll(/name:\s*([a-z0-9-]+-service)\b/g)) {
    referencedServices.add(match[1])
  }

  for (const serviceName of UNIFIED_ORIGIN_REQUIRED_SERVICE_NAMES) {
    if (!definedServices.has(serviceName)) {
      errors.push(`missing required k8s Service manifest: ${serviceName}`)
    }
  }

  for (const serviceName of referencedServices) {
    if (!definedServices.has(serviceName)) {
      errors.push(`ingress references undefined Service: ${serviceName}`)
    }
  }

  return errors
}

async function checkUnifiedDeploymentContracts(repoRoot) {
  const errors = []

  for (const appRel of Object.keys(BASE_PATH_BY_APP)) {
    const pkgPath = path.join(repoRoot, appRel, 'package.json')
    if (!(await pathExists(pkgPath))) continue

    const pkg = await readJson(pkgPath)
    if (pkg.private !== true) {
      errors.push(`${appRel} must be private=true for monorepo-only deployment`)
    }

    const scripts = pkg.scripts || {}
    const deployLike = Object.keys(scripts).filter((name) => name.startsWith('deploy'))
    if (deployLike.length) {
      errors.push(`${appRel} contains standalone deploy scripts: ${deployLike.join(', ')}`)
    }
  }

  return errors
}

async function getClientDbAllowlist(repoRoot) {
  const allowlistPath = path.join(repoRoot, CLIENT_DB_ALLOWLIST_PATH)
  if (!(await pathExists(allowlistPath))) return new Set()

  try {
    const parsed = JSON.parse(await fs.readFile(allowlistPath, 'utf8'))
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.map((entry) => String(entry).replaceAll('\\', '/')))
  } catch {
    return new Set()
  }
}

async function walkFiles(rootDir, out = []) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue
      await walkFiles(full, out)
      continue
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue
    out.push(full)
  }
  return out
}

function isClientCandidate(fileRel, source) {
  if (fileRel.includes('/src/pages/api/')) return false
  if (fileRel.includes('/src/pages/')) return true
  return source.includes("'use client'") || source.includes('"use client"')
}

async function checkClientDbImports(repoRoot) {
  const errors = []
  const allowlist = await getClientDbAllowlist(repoRoot)
  const scanRoots = [
    path.join(repoRoot, 'apps'),
    path.join(repoRoot, 'pulse-connect-ui', 'src'),
    path.join(repoRoot, 'pulse-connect-admin-ui', 'src'),
    path.join(repoRoot, 'pulse-connect-admin-ui', 'apps'),
  ]

  const files = []
  for (const root of scanRoots) {
    if (!(await pathExists(root))) continue
    await walkFiles(root, files)
  }

  for (const absolutePath of files) {
    const fileRel = rel(repoRoot, absolutePath)
    const source = await fs.readFile(absolutePath, 'utf8')

    if (!isClientCandidate(fileRel, source)) continue
    if (!CLIENT_DB_IMPORT_RE.test(source)) continue

    if (allowlist.has(fileRel)) continue
    errors.push(`client-side DB/auth import outside allowlist: ${fileRel}`)
  }

  return errors
}

async function checkDashboardDirectCSIImports(repoRoot) {
  const errors = []
  const scanRoots = [
    path.join(repoRoot, 'pulse-connect-admin-ui', 'src'),
    path.join(repoRoot, 'pulse-connect-admin-ui', 'apps'),
    path.join(repoRoot, 'apps', 'pulse-connect-admin-ui'),
  ]

  const files = []
  for (const root of scanRoots) {
    if (!(await pathExists(root))) continue
    await walkFiles(root, files)
  }

  for (const absolutePath of files) {
    const fileRel = rel(repoRoot, absolutePath)
    const source = await fs.readFile(absolutePath, 'utf8')

    if (!CSI_INTERNAL_IMPORT_RE.test(source)) continue
    if (CSI_API_ALLOWLIST.has(fileRel)) continue
    if (fileRel.includes('/app/api/admin/csi/')) continue

    errors.push(`dashboard must access CSI only via admin gateway/api routes: ${fileRel}`)
  }

  return errors
}

async function main() {
  const repoRoot = await findRepoRoot(process.cwd())
  const checks = [
    { name: 'duplicate package names', run: () => checkDuplicatePackageNames(repoRoot) },
    { name: 'basePath contracts', run: () => checkBasePaths(repoRoot) },
    { name: 'critical endpoint guards', run: () => checkCriticalEndpointGuards(repoRoot) },
    { name: 'edge execute proxies', run: () => checkEdgeExecuteProxies(repoRoot) },
    { name: 'canonical pwa icons', run: () => checkCanonicalPwaIcons(repoRoot) },
    { name: 'shared PWA dependency', run: () => checkPwaPackageDependency(repoRoot) },
    { name: 'unified origin routing', run: () => checkUnifiedOriginRouting(repoRoot) },
    { name: 'unified origin services', run: () => checkUnifiedOriginServiceBackends(repoRoot) },
    { name: 'unified deployment contracts', run: () => checkUnifiedDeploymentContracts(repoRoot) },
    { name: 'client DB import governance', run: () => checkClientDbImports(repoRoot) },
    { name: 'dashboard CSI boundary', run: () => checkDashboardDirectCSIImports(repoRoot) },
  ]

  const allErrors = []
  for (const check of checks) {
    const errors = await check.run()
    if (errors.length) {
      allErrors.push(`[${check.name}]`)
      for (const err of errors) allErrors.push(`- ${err}`)
    }
  }

  if (allErrors.length) {
    console.error(`[governance] validation failed (${allErrors.length} issue line(s))`)
    for (const line of allErrors) console.error(line)
    process.exitCode = 1
    return
  }

  console.log('[governance] validation OK')
}

await main()
