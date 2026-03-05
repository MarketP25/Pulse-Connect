import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { findRepoRoot, getNextAppDirs, pathExists, readJson } from './_lib.mjs'

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

async function readFileSafe(filePath) {
  return fs.readFile(filePath)
}

async function validateApp(repoRoot, appDir, canonical) {
  const rel = path.relative(repoRoot, appDir)
  const errors = []

  const publicDir = path.join(appDir, 'public')
  const requiredPublic = [
    'manifest.webmanifest',
    'offline.html',
    'sw.js',
    'favicon.ico',
    path.join('icons', 'icon-16x16.png'),
    path.join('icons', 'icon-32x32.png'),
    path.join('icons', 'favicon.ico'),
    path.join('icons', 'icon-152x152.jpeg'),
    path.join('icons', 'icon-192x192.jpeg'),
    path.join('icons', 'icon-512x512.jpeg'),
    path.join('icons', 'icon-152x152-maskable.jpeg'),
    path.join('icons', 'icon-512x512-maskable.jpeg'),
    path.join('icons', 'brand-1024x1024.jpeg'),
  ]

  for (const f of requiredPublic) {
    if (!(await pathExists(path.join(publicDir, f)))) {
      errors.push(`[${rel}] missing public/${f}`)
    }
  }

  // Canonical asset parity
  const parity = [
    ['public/manifest.webmanifest', canonical.manifest, path.join(publicDir, 'manifest.webmanifest')],
    ['public/offline.html', canonical.offline, path.join(publicDir, 'offline.html')],
    ['public/sw.js', canonical.sw, path.join(publicDir, 'sw.js')],
    ['public/favicon.ico', canonical.faviconIco, path.join(publicDir, 'favicon.ico')],
    ['public/icons/icon-16x16.png', canonical.icon16Png, path.join(publicDir, 'icons', 'icon-16x16.png')],
    ['public/icons/icon-32x32.png', canonical.icon32Png, path.join(publicDir, 'icons', 'icon-32x32.png')],
    ['public/icons/favicon.ico', canonical.iconFaviconIco, path.join(publicDir, 'icons', 'favicon.ico')],
    ['public/icons/icon-152x152.jpeg', canonical.icon152, path.join(publicDir, 'icons', 'icon-152x152.jpeg')],
    ['public/icons/icon-192x192.jpeg', canonical.icon192, path.join(publicDir, 'icons', 'icon-192x192.jpeg')],
    ['public/icons/icon-512x512.jpeg', canonical.icon512, path.join(publicDir, 'icons', 'icon-512x512.jpeg')],
    [
      'public/icons/icon-152x152-maskable.jpeg',
      canonical.icon152Maskable,
      path.join(publicDir, 'icons', 'icon-152x152-maskable.jpeg'),
    ],
    [
      'public/icons/icon-512x512-maskable.jpeg',
      canonical.icon512Maskable,
      path.join(publicDir, 'icons', 'icon-512x512-maskable.jpeg'),
    ],
    ['public/icons/brand-1024x1024.jpeg', canonical.brand1024, path.join(publicDir, 'icons', 'brand-1024x1024.jpeg')],
  ]

  for (const [label, canonBuf, appPath] of parity) {
    if (!(await pathExists(appPath))) continue
    const appBuf = await readFileSafe(appPath)
    if (sha256(appBuf) !== sha256(canonBuf)) {
      errors.push(`[${rel}] ${label} diverges from canonical assets`)
    }
  }

  // Manifest JSON basics
  try {
    const manifestPath = path.join(publicDir, 'manifest.webmanifest')
    if (await pathExists(manifestPath)) {
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
      const requiredFields = [
        'name',
        'short_name',
        'description',
        'start_url',
        'scope',
        'display',
        'theme_color',
        'background_color',
        'icons',
      ]
      for (const f of requiredFields) {
        if (!(f in manifest)) errors.push(`[${rel}] manifest missing field: ${f}`)
      }
    }
  } catch {
    errors.push(`[${rel}] manifest is not valid JSON`)
  }

  // Source integration checks
  const layoutPath = path.join(appDir, 'src', 'app', 'layout.tsx')
  if (!(await pathExists(layoutPath))) {
    errors.push(`[${rel}] missing src/app/layout.tsx (cannot validate meta tags)`)
    return errors
  }

  const layout = await fs.readFile(layoutPath, 'utf8')
  const requiredSnippets = [
    'rel="manifest"',
    'manifest.webmanifest',
    'name="theme-color"',
    'name="viewport"',
    '/favicon.ico',
    'icon-32x32.png',
    'icon-16x16.png',
    'apple-mobile-web-app-capable',
    'apple-mobile-web-app-status-bar-style',
  ]
  for (const s of requiredSnippets) {
    if (!layout.includes(s)) errors.push(`[${rel}] layout missing required PWA head snippet: ${s}`)
  }
  if (!layout.includes('PwaRegister') && !layout.includes('PWARegister')) {
    errors.push(`[${rel}] layout missing PwaRegister component`)
  }

  // Telemetry endpoint (same-origin, SW flush target)
  const telemetryRoutePath = path.join(appDir, 'src', 'app', 'api', 'public', 'telemetry', 'route.ts')
  if (!(await pathExists(telemetryRoutePath))) {
    errors.push(`[${rel}] missing src/app/api/public/telemetry/route.ts`)
  }

  // Ensure Next config transpiles shared PWA package
  const nextConfigCandidates = ['next.config.ts', 'next.config.js', 'next.config.mjs'].map((f) =>
    path.join(appDir, f),
  )

  let foundNextConfig = false
  for (const cfgPath of nextConfigCandidates) {
    if (!(await pathExists(cfgPath))) continue
    foundNextConfig = true

    try {
      const raw = await fs.readFile(cfgPath, 'utf8')
      if (!raw.includes('transpilePackages')) errors.push(`[${rel}] ${path.basename(cfgPath)} missing transpilePackages`)
      if (!raw.includes('@pulsco/pwa')) errors.push(`[${rel}] ${path.basename(cfgPath)} missing @pulsco/pwa reference`)
    } catch {
      errors.push(`[${rel}] unable to read ${path.basename(cfgPath)}`)
    }

    break
  }
  if (!foundNextConfig) errors.push(`[${rel}] missing next.config.(ts|js|mjs)`)

  // Dependency check: @pulsco/pwa
  const pkgPath = path.join(appDir, 'package.json')
  if (await pathExists(pkgPath)) {
    const pkg = await readJson(pkgPath)
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
    if (!deps['@pulsco/pwa']) errors.push(`[${rel}] missing dependency: @pulsco/pwa`)
  }

  return errors
}

async function main() {
  const repoRoot = await findRepoRoot(process.cwd())
  const appDirs = await getNextAppDirs(repoRoot)

  const canonical = {
    manifest: await readFileSafe(path.join(repoRoot, 'assets', 'pwa', 'manifest.webmanifest')),
    offline: await readFileSafe(path.join(repoRoot, 'assets', 'pwa', 'offline.html')),
    sw: await readFileSafe(path.join(repoRoot, 'assets', 'pwa', 'sw.js')),
    faviconIco: await readFileSafe(path.join(repoRoot, 'apps', 'pulse-portal', 'public', 'icons', 'favicon.ico')),
    iconFaviconIco: await readFileSafe(path.join(repoRoot, 'apps', 'pulse-portal', 'public', 'icons', 'favicon.ico')),
    icon16Png: await readFileSafe(path.join(repoRoot, 'apps', 'pulse-portal', 'public', 'icons', 'icon-16x16.png')),
    icon32Png: await readFileSafe(path.join(repoRoot, 'apps', 'pulse-portal', 'public', 'icons', 'icon-32x32.png')),
    icon152: await readFileSafe(path.join(repoRoot, 'apps', 'pulse-portal', 'public', 'icons', 'icon-152x152.jpeg')),
    icon192: await readFileSafe(path.join(repoRoot, 'apps', 'pulse-portal', 'public', 'icons', 'icon-192x192.jpeg')),
    icon512: await readFileSafe(path.join(repoRoot, 'apps', 'pulse-portal', 'public', 'icons', 'icon-512x512.jpeg')),
    icon152Maskable: await readFileSafe(
      path.join(repoRoot, 'apps', 'pulse-portal', 'public', 'icons', 'icon-152x152-maskable.jpeg'),
    ),
    icon512Maskable: await readFileSafe(
      path.join(repoRoot, 'apps', 'pulse-portal', 'public', 'icons', 'icon-512x512-maskable.jpeg'),
    ),
    brand1024: await readFileSafe(path.join(repoRoot, 'apps', 'pulse-portal', 'public', 'icons', 'brand-1024x1024.jpeg')),
  }

  const allErrors = []
  for (const appDir of appDirs) {
    allErrors.push(...(await validateApp(repoRoot, appDir, canonical)))
  }

  if (allErrors.length) {
    console.error(`[pwa] validation failed (${allErrors.length} issue(s))`)
    for (const e of allErrors) console.error(`- ${e}`)
    process.exitCode = 1
    return
  }

  console.log(`[pwa] validation OK (${appDirs.length} app(s))`)
}

await main()

