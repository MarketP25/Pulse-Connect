const SENSITIVE_PATH_RE = /^\/(billing|wallet|admin|auth|edge|marp)(\/|$)/i
const CSI_REASON_CODE = 'CSI_GATEWAY_ACCESS'
const FIREWALL_ENDPOINT_PATH = '/marp/enforcement/enforce'

type TelemetryEvent = {
  event: string
  ts: number
  path?: string
  meta?: Record<string, string | number | boolean>
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function sanitizeEvent(input: unknown): TelemetryEvent | null {
  if (!isPlainObject(input)) return null

  const event = typeof input.event === 'string' ? input.event.trim() : ''
  if (!event || event.length > 64) return null

  const ts = typeof input.ts === 'number' && Number.isFinite(input.ts) ? Math.floor(input.ts) : Date.now()

  let path: string | undefined
  if (typeof input.path === 'string') {
    const rawPath = input.path.split('?')[0] ?? ''
    const cleaned = rawPath.slice(0, 256)
    if (cleaned && !SENSITIVE_PATH_RE.test(cleaned)) path = cleaned
  }

  let meta: TelemetryEvent['meta']
  if (isPlainObject(input.meta)) {
    const forbiddenKeyRe = /(token|auth|authorization|cookie|password|secret|wallet|billing|admin|edge|marp)/i
    const clean: NonNullable<TelemetryEvent['meta']> = {}

    for (const [key, value] of Object.entries(input.meta).slice(0, 12)) {
      if (forbiddenKeyRe.test(key)) continue
      if (typeof value === 'string') clean[key] = value.slice(0, 128)
      else if (typeof value === 'number' && Number.isFinite(value)) clean[key] = value
      else if (typeof value === 'boolean') clean[key] = value
    }

    if (Object.keys(clean).length) meta = clean
  }

  return { event, ts, path, meta }
}

function isDirectCsiUrl(url: URL) {
  const joined = `${url.hostname}${url.pathname}`.toLowerCase()
  return /(^|[.-])csi([.-]|$)/.test(url.hostname.toLowerCase()) || /\/csi(\/|$)/.test(joined)
}

function isFirewallUrl(url: URL) {
  const joined = `${url.hostname}${url.pathname}`.toLowerCase()
  return /firewall|marp/.test(joined)
}

function resolveFirewallForwardUrl() {
  const raw =
    (typeof process !== 'undefined' && process?.env?.PULSCO_CSI_FIREWALL_URL) ||
    (typeof process !== 'undefined' && process?.env?.PULSCO_MARP_FIREWALL_URL) ||
    (typeof process !== 'undefined' && process?.env?.PULSCO_CSI_GATEWAY_URL) ||
    ''

  if (!raw) return ''

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return ''
  }

  if (isDirectCsiUrl(parsed) || !isFirewallUrl(parsed)) {
    return ''
  }

  if (!parsed.pathname || parsed.pathname === '/') {
    parsed.pathname = FIREWALL_ENDPOINT_PATH
  }

  parsed.hash = ''
  parsed.search = ''
  return parsed.toString()
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { 'cache-control': 'no-store' },
  })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(null, { status: 400, headers: { 'cache-control': 'no-store' } })
  }

  const eventsRaw = isPlainObject(body) && Array.isArray(body.events) ? body.events : []
  if (eventsRaw.length > 50) {
    return new Response(null, { status: 413, headers: { 'cache-control': 'no-store' } })
  }

  const events = eventsRaw.map(sanitizeEvent).filter(Boolean) as TelemetryEvent[]

  // Central forwarding (optional) and firewall-enforced.
  // CSI must be reached through MARP firewall endpoint only.
  const forwardUrl = resolveFirewallForwardUrl()

  if (forwardUrl) {
    try {
      const res = await fetch(forwardUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csi-reason-code': CSI_REASON_CODE,
        },
        credentials: 'omit',
        cache: 'no-store',
        body: JSON.stringify({
          subsystemName: 'pulsco-pwa-telemetry',
          action: 'route-support-telemetry',
          payload: {
            source: 'pulsco-pwa',
            destination: 'support-intelligence',
            eventCount: events.length,
            schema: 'pulsco-csi-v1',
            events,
          },
          context: {
            source: 'pulsco',
            destination: 'edge',
          },
        }),
      })

      if (!res.ok) {
        return new Response(null, { status: 503, headers: { 'cache-control': 'no-store' } })
      }
    } catch {
      return new Response(null, { status: 503, headers: { 'cache-control': 'no-store' } })
    }
  } else {
    // Enterprise-safe default: accept and drop if no firewall endpoint is configured.
    // Direct CSI URLs are intentionally ignored to avoid firewall bypass.
    void events
  }

  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })
}
