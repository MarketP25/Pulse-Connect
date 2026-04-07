import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type AdaptiveScreenClass =
  | 'xxs'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | '7xl'

interface AdaptiveLayoutState {
  width: number
  screenClass: AdaptiveScreenClass
  isTouch: boolean
  prefersDark: boolean
  prefersLight: boolean
}

const getScreenClassFromWidth = (width: number): AdaptiveScreenClass => {
  if (width < 280) return 'xxs'
  if (width < 320) return 'xxs'
  if (width < 640) return 'xs'
  if (width < 768) return 'sm'
  if (width < 1024) return 'md'
  if (width < 1280) return 'lg'
  if (width < 1536) return 'xl'
  if (width < 1920) return '2xl'
  if (width < 2560) return '3xl'
  if (width < 3840) return '4xl'
  if (width < 5120) return '5xl'
  if (width < 7680) return '6xl'
  return '7xl'
}

const createAdaptiveState = (width: number): AdaptiveLayoutState => ({
  width,
  screenClass: getScreenClassFromWidth(width),
  isTouch: window.matchMedia('(pointer: coarse)').matches,
  prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  prefersLight: window.matchMedia('(prefers-color-scheme: light)').matches,
})

const AdaptiveLayoutContext = createContext<AdaptiveLayoutState | undefined>(undefined)

export const AdaptiveLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AdaptiveLayoutState>(() =>
    typeof window !== 'undefined' ? createAdaptiveState(window.innerWidth) : {
      width: 0,
      screenClass: 'md',
      isTouch: false,
      prefersDark: false,
      prefersLight: false,
    }
  )

  useEffect(() => {
    const update = () => {
      setState(createAdaptiveState(window.innerWidth))
    }

    update()

    window.addEventListener('resize', update)
    window.matchMedia('(pointer: coarse)').addEventListener('change', update)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', update)
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', update)

    return () => {
      window.removeEventListener('resize', update)
      window.matchMedia('(pointer: coarse)').removeEventListener('change', update)
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', update)
      window.matchMedia('(prefers-color-scheme: light)').removeEventListener('change', update)
    }
  }, [])

  const value = useMemo(() => ({ ...state }), [state])

  return <AdaptiveLayoutContext.Provider value={value}>{children}</AdaptiveLayoutContext.Provider>
}

export const useAdaptiveLayout = () => {
  const context = useContext(AdaptiveLayoutContext)
  if (!context) {
    throw new Error('useAdaptiveLayout must be used within AdaptiveLayoutProvider')
  }
  return context
}

export type { AdaptiveScreenClass }