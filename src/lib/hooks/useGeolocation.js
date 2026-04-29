/**
 * useGeolocation — Shared hook for requesting and caching the user's GPS coordinates.
 *
 * Returns:
 *   coords      – { lat, lng } or null
 *   locating    – true while the browser is resolving position
 *   error       – human-readable error string (empty when OK)
 *   requestLocation – call to prompt the user / resolve cached coords
 */
import { useState, useRef, useCallback } from 'react'

export default function useGeolocation() {
  const [coords, setCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const coordsRef = useRef(null)

  const requestLocation = useCallback(() => new Promise((resolve) => {
    if (coordsRef.current) return resolve(coordsRef.current)
    if (!navigator.geolocation) { setError('Geolocation not supported'); return resolve(null) }

    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        coordsRef.current = c
        setCoords(c)
        setLocating(false)
        resolve(c)
      },
      (err) => {
        setError(err.code === 1 ? 'Location permission denied.' : 'Could not get location.')
        setLocating(false)
        resolve(null)
      },
    )
  }), [])

  return { coords, coordsRef, locating, error, requestLocation }
}
