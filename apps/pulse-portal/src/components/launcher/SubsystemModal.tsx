'use client'

import { useMemo } from 'react'
import { useSubsystemRegistry } from '../../hooks/useSubsystemRegistry'

type SubsystemModalProps = {
  subsystemId: string
  onClose: () => void
}

export function SubsystemModal({ subsystemId, onClose }: SubsystemModalProps) {
  const { subsystems } = useSubsystemRegistry()
  const subsystem = useMemo(() => subsystems.find((s) => s.id === subsystemId), [subsystems, subsystemId])
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

  if (!subsystem) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${subsystem.name} details`}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{subsystem.icon}</span>
              <h3 className="text-xl font-semibold text-white">{subsystem.name}</h3>
            </div>
            <p className="text-sm text-slate-300">{subsystem.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 p-5">
          {!isOnline && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
              You're offline. This portal won't simulate subsystem mutations or sensitive actions.
              Reconnect to launch subsystems.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-xs text-slate-400">Health</div>
              <div className="text-white font-semibold">{subsystem.health}%</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-xs text-slate-400">Regions</div>
              <div className="text-white font-semibold">{subsystem.regionCount}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-xs text-slate-400">Users</div>
              <div className="text-white font-semibold">{subsystem.userCount.toLocaleString()}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-white">Key Features</div>
            <div className="flex flex-wrap gap-2">
              {subsystem.features.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-1 text-xs text-slate-200"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <a
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                isOnline ? 'bg-purple-600 text-white hover:bg-purple-500' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              href={isOnline ? subsystem.endpoints.ui : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!isOnline}
              onClick={(e) => {
                if (!isOnline) e.preventDefault()
              }}
            >
              Open UI
            </a>
            <a
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                isOnline ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              href={isOnline ? subsystem.endpoints.health : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!isOnline}
              onClick={(e) => {
                if (!isOnline) e.preventDefault()
              }}
            >
              Health Check
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubsystemModal
