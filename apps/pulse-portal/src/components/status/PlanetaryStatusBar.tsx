'use client'

type StatusItem = {
  label: string
  value: string | number
  status: 'online' | 'warning' | 'offline'
}

const STATUSES: StatusItem[] = [
  { label: 'API Gateway', value: '99.9%', status: 'online' },
  { label: 'Database', value: '99.8%', status: 'online' },
  { label: 'AI Engine', value: '98.5%', status: 'online' },
  { label: 'Firewall', value: '100%', status: 'online' },
]

function getStatusColor(status: StatusItem['status']) {
  switch (status) {
    case 'online':
      return 'bg-green-500'
    case 'warning':
      return 'bg-yellow-500'
    case 'offline':
      return 'bg-red-500'
    default:
      return 'bg-gray-500'
  }
}

export function PlanetaryStatusBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-md border-t border-purple-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center space-x-6">
            <span className="text-sm text-gray-400">Planetary Status:</span>
            {STATUSES.map((item) => (
              <div key={item.label} className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
                <span className="text-sm text-gray-300">{item.label}</span>
                <span className="text-xs text-gray-500">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-gray-500">Last Updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlanetaryStatusBar

