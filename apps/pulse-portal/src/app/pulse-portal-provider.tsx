'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type PulsePortalUser = {
  id: string
  name: string
} | null

type PulsePortalContextType = {
  isConnected: boolean
  user: PulsePortalUser
  connect: () => Promise<void>
  disconnect: () => void
}

const PulsePortalContext = createContext<PulsePortalContextType>({
  isConnected: false,
  user: null,
  connect: async () => {},
  disconnect: () => {},
})

export function usePulsePortal() {
  return useContext(PulsePortalContext)
}

type PulsePortalProviderProps = {
  children: ReactNode
}

export function PulsePortalProvider({ children }: PulsePortalProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [user, setUser] = useState<PulsePortalUser>(null)

  useEffect(() => {
    // Portal bootstrapping only; no auth/financial state is stored here.
    setIsConnected(true)
  }, [])

  const connect = async () => {
    setIsConnected(true)
    setUser({ id: 'public', name: 'Portal User' })
  }

  const disconnect = () => {
    setIsConnected(false)
    setUser(null)
  }

  return (
    <PulsePortalContext.Provider value={{ isConnected, user, connect, disconnect }}>
      {children}
    </PulsePortalContext.Provider>
  )
}

export default PulsePortalProvider

