import fs from 'node:fs/promises'
import path from 'node:path'

const appRoot = process.cwd()
const nextStaticDir = path.join(appRoot, '.next', 'static')
const outputPath = path.join(appRoot, 'public', 'pwa-precache.json')

async function pathExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

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

async function main() {
  if (!(await pathExists(nextStaticDir))) {
    console.warn(`[pwa] Skipping precache list generation: missing ${nextStaticDir}`)
    return
  }

  const files = await walk(nextStaticDir)

  const urls = Array.from(
    new Set(
      files.map((rel) => `/_next/static/${rel.replaceAll(path.sep, '/')}`)
    )
  ).sort()

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(urls, null, 2)}\n`, 'utf8')

  console.log(`[pwa] Wrote ${urls.length} precache URLs to ${outputPath}`)
}

await main()

