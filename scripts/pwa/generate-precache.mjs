import fs from 'node:fs/promises'
import path from 'node:path'

import { findRepoRoot, getNextAppDirs, parseArgs, pathExists } from './_lib.mjs'

async function walk(dir, relativeBase = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const out = []

  for (const entry of entries) {
    const rel = path.join(relativeBase, entry.name)
    const full = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      out.push(...(await walk(full, rel)))
      continue
    }

    const ext = path.extname(entry.name).toLowerCase()
    if (ext !== '.js' && ext !== '.css') continue
    out.push(rel)
  }

  return out
}

async function generateForApp(repoRoot, appDir) {
  const nextStaticDir = path.join(appDir, '.next', 'static')
  if (!(await pathExists(nextStaticDir))) return { appDir, wrote: false, count: 0 }

  const files = await walk(nextStaticDir)
  const urls = Array.from(
    new Set(files.map((rel) => `/_next/static/${rel.replaceAll(path.sep, '/')}`)),
  ).sort()

  const outputPath = path.join(appDir, 'public', 'pwa-precache.json')
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(urls, null, 2)}\n`, 'utf8')

  return { appDir, wrote: true, count: urls.length }
}

async function main() {
  const args = parseArgs(process.argv)
  const repoRoot = await findRepoRoot(process.cwd())

  const appDirs = args.all
    ? await getNextAppDirs(repoRoot)
    : [path.resolve(args.app ? path.join(process.cwd(), args.app) : process.cwd())]

  let wroteApps = 0
  for (const appDir of appDirs) {
    const res = await generateForApp(repoRoot, appDir)
    if (res.wrote) {
      wroteApps += 1
      if (args.verbose) console.log(`[pwa] precache: ${path.relative(repoRoot, appDir)} (${res.count})`)
    } else if (args.verbose) {
      console.log(`[pwa] precache: skipped (no .next/static): ${path.relative(repoRoot, appDir)}`)
    }
  }

  console.log(`[pwa] generated precache for ${wroteApps}/${appDirs.length} app(s)`)
}

await main()

