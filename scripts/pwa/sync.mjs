import fs from 'node:fs/promises'
import path from 'node:path'

import { findRepoRoot, getNextAppDirs, parseArgs, pathExists } from './_lib.mjs'

async function copyFile(source, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.copyFile(source, dest)
}

async function syncApp(repoRoot, appDir) {
  const portalIconsSrc = path.join(repoRoot, 'apps', 'pulse-portal', 'public', 'icons')
  const assetsRoot = path.join(repoRoot, 'assets')
  const pwaSrc = path.join(assetsRoot, 'pwa')

  const publicDir = path.join(appDir, 'public')
  await fs.mkdir(publicDir, { recursive: true })

  const targets = [
    {
      from: path.join(pwaSrc, 'manifest.webmanifest'),
      to: path.join(publicDir, 'manifest.webmanifest'),
    },
    {
      from: path.join(pwaSrc, 'offline.html'),
      to: path.join(publicDir, 'offline.html'),
    },
    {
      from: path.join(pwaSrc, 'sw.js'),
      to: path.join(publicDir, 'sw.js'),
    },
    {
      from: path.join(portalIconsSrc, 'icon-16x16.png'),
      to: path.join(publicDir, 'icons', 'icon-16x16.png'),
    },
    {
      from: path.join(portalIconsSrc, 'icon-32x32.png'),
      to: path.join(publicDir, 'icons', 'icon-32x32.png'),
    },
    {
      from: path.join(portalIconsSrc, 'favicon.ico'),
      to: path.join(publicDir, 'icons', 'favicon.ico'),
    },
    {
      from: path.join(portalIconsSrc, 'icon-152x152.jpeg'),
      to: path.join(publicDir, 'icons', 'icon-152x152.jpeg'),
    },
    {
      from: path.join(portalIconsSrc, 'icon-192x192.jpeg'),
      to: path.join(publicDir, 'icons', 'icon-192x192.jpeg'),
    },
    {
      from: path.join(portalIconsSrc, 'icon-512x512.jpeg'),
      to: path.join(publicDir, 'icons', 'icon-512x512.jpeg'),
    },
    {
      from: path.join(portalIconsSrc, 'icon-152x152-maskable.jpeg'),
      to: path.join(publicDir, 'icons', 'icon-152x152-maskable.jpeg'),
    },
    {
      from: path.join(portalIconsSrc, 'icon-512x512-maskable.jpeg'),
      to: path.join(publicDir, 'icons', 'icon-512x512-maskable.jpeg'),
    },
    {
      from: path.join(portalIconsSrc, 'brand-1024x1024.jpeg'),
      to: path.join(publicDir, 'icons', 'brand-1024x1024.jpeg'),
    },
    {
      from: path.join(portalIconsSrc, 'favicon.ico'),
      to: path.join(publicDir, 'favicon.ico'),
    },
  ]

  for (const t of targets) {
    if (!(await pathExists(t.from))) {
      throw new Error(`Missing canonical asset: ${t.from}`)
    }
    await copyFile(t.from, t.to)
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const repoRoot = await findRepoRoot(process.cwd())

  const appDirs = args.all
    ? await getNextAppDirs(repoRoot)
    : [path.resolve(args.app ? path.join(process.cwd(), args.app) : process.cwd())]

  for (const appDir of appDirs) {
    await syncApp(repoRoot, appDir)
    if (args.verbose) console.log(`[pwa] synced: ${path.relative(repoRoot, appDir)}`)
  }

  if (!args.verbose) console.log(`[pwa] synced ${appDirs.length} app(s)`)
}

await main()


