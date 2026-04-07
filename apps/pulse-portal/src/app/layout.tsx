import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'

import PwaRegister from '../../components/pwa-register'
import { UnifiedNavigation } from '../components/navigation/UnifiedNavigation'
import { PlanetaryStatusBar } from '../components/status/PlanetaryStatusBar'
import { PulsePortalProvider } from './pulse-portal-provider'
import { AdaptiveLayoutProvider } from '@pulsco/ui-components'
import { AdaptiveDebugIndicator } from '../components/layout/AdaptiveDebugIndicator'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pulsco - Your Digital Marketig Command Centre',
  description: 'Super-Intelligence Grade Location Intelligence Platform | 8+ Subsystem Integration | 195+ Countries',
  keywords: ['Pulsco', 'Pulse Connect', 'planetary', 'proximity', 'AI', 'location intelligence'],
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.jpeg" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
      </head>
      <body className={inter.className}>
        <PwaRegister appId="@pulsco/pulse-portal" />
        <PulsePortalProvider>
          <AdaptiveLayoutProvider>
            <AdaptiveDebugIndicator />
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
              <UnifiedNavigation />
              <PlanetaryStatusBar />
              <main className="relative z-10 flex-1">
                {children}
              </main>
              <footer className="relative z-10 border-t border-white/10 bg-black/40 text-xs text-slate-300">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 gap-2 flex-wrap">
                <span className="opacity-70">
                  © {new Date().getFullYear()} Pulsco. All rights reserved.
                </span>
                <div className="flex items-center gap-4">
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </PulsePortalProvider>
      </body>
    </html>
  )
}



