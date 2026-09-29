import { useEffect, useRef, useState } from 'react'

function resolveInitialValue(initialValue) {
  return typeof initialValue === 'function' ? initialValue() : initialValue
}

export function usePersistentState(storageKey, initialValue) {
  const [value, setValue] = useState(() => {
    const fallback = resolveInitialValue(initialValue)

    if (!storageKey || typeof window === 'undefined') return fallback

    try {
      const stored = window.sessionStorage.getItem(storageKey)
      return stored === null ? fallback : JSON.parse(stored)
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return

    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      // Si el navegador bloquea sessionStorage, la app sigue funcionando con estado local.
    }
  }, [storageKey, value])

  return [value, setValue]
}

export function usePageScroll(storageKey) {
  const scrollFrameRef = useRef(null)
  const restoreFrameRef = useRef(null)

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return undefined

    let cancelled = false

    const restore = () => {
      if (cancelled) return
      try {
        const saved = Number(window.sessionStorage.getItem(storageKey))
        if (Number.isFinite(saved) && saved > 0) {
          window.scrollTo({ top: saved, left: 0, behavior: 'auto' })
        }
      } catch {
        // Sin persistencia de scroll si sessionStorage no está disponible.
      }
    }

    const firstFrame = window.requestAnimationFrame(() => {
      restoreFrameRef.current = window.requestAnimationFrame(() => {
        restoreFrameRef.current = null
        restore()
      })
    })
    const timer1 = window.setTimeout(restore, 180)
    const timer2 = window.setTimeout(restore, 650)

    const saveScroll = () => {
      if (scrollFrameRef.current) return
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null
        try {
          window.sessionStorage.setItem(storageKey, String(window.scrollY || 0))
        } catch {
          // Ignorar si sessionStorage no está disponible.
        }
      })
    }

    window.addEventListener('scroll', saveScroll, { passive: true })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(firstFrame)
      if (restoreFrameRef.current) window.cancelAnimationFrame(restoreFrameRef.current)
      if (scrollFrameRef.current) window.cancelAnimationFrame(scrollFrameRef.current)
      window.clearTimeout(timer1)
      window.clearTimeout(timer2)
      window.removeEventListener('scroll', saveScroll)
      try {
        window.sessionStorage.setItem(storageKey, String(window.scrollY || 0))
      } catch {
        // Ignorar si sessionStorage no está disponible.
      }
    }
  }, [storageKey])
}

export function clearPersistentScope(prefix) {
  if (!prefix || typeof window === 'undefined') return

  try {
    const keys = []
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    keys.forEach((key) => window.sessionStorage.removeItem(key))
  } catch {
    // No bloquear el cierre de sesión si el navegador restringe el almacenamiento.
  }
}
