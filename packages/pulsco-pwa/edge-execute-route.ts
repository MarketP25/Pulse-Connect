const REASON_CODE = 'CSI_GATEWAY_ACCESS'
const HIGH_RISK_ACTION_RE = /(delete|remove|revoke|refund|charge|transfer|cancel|deprecate|shutdown|destroy)/i

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  })
}

function getEdgeExecuteUrl() {
  return process.env.PULSCO_EDGE_GATEWAY_URL || '/edge/execute'
}

function hasPc365Headers(request: Request) {
  return Boolean(request.headers.get('x-pc365') && request.headers.get('x-founder') && request.headers.get('x-device'))
}

function isHighRiskAction(payload: Record<string, unknown>) {
  const action = typeof payload.action === 'string' ? payload.action : ''
  const subsystem = typeof payload.subsystem === 'string' ? payload.subsystem : ''
  return HIGH_RISK_ACTION_RE.test(action) || /billing|wallet|payments|admin|auth|edge|marp/i.test(subsystem)
}

export async function proxyEdgeExecute(request: Request, appId: string) {
  let payload: Record<string, unknown>
  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid JSON payload' }, 400)
  }

  if (isHighRiskAction(payload) && !hasPc365Headers(request)) {
    return json(
      {
        error: 'PC365_ATTESTATION_REQUIRED',
        reason_code: REASON_CODE,
        message: 'High-risk actions require x-pc365, x-founder, and x-device headers.',
      },
      403,
    )
  }

  const outboundHeaders = new Headers({
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'x-csi-reason-code': REASON_CODE,
    'x-pulsco-source-app': appId,
  })

  for (const headerName of ['x-pc365', 'x-founder', 'x-device', 'authorization', 'x-request-id']) {
    const value = request.headers.get(headerName)
    if (value) outboundHeaders.set(headerName, value)
  }

  try {
    const upstream = await fetch(getEdgeExecuteUrl(), {
      method: 'POST',
      headers: outboundHeaders,
      credentials: 'omit',
      cache: 'no-store',
      body: JSON.stringify({
        ...payload,
        reasonCode: REASON_CODE,
      }),
    })

    const raw = await upstream.text()
    return new Response(raw, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
      },
    })
  } catch {
    return json(
      {
        error: 'EDGE_GATEWAY_UNAVAILABLE',
        reason_code: REASON_CODE,
      },
      503,
    )
  }
}

export async function edgeExecuteOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'cache-control': 'no-store',
    },
  })
}
