import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const KOLLAM = [76.6141, 8.8932]

const satelliteStyle = {
  version: 8,
  sources: {
    'esri-world-imagery': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
  },
  layers: [
    {
      id: 'esri-world-imagery',
      type: 'raster',
      source: 'esri-world-imagery',
    },
  ],
}

function createUserDot() {
  const el = document.createElement('div')
  el.style.width = '18px'
  el.style.height = '18px'
  el.style.borderRadius = '50%'
  el.style.background = '#1a73e8'
  el.style.border = '3px solid #ffffff'
  el.style.boxShadow = '0 0 0 2px rgba(26, 115, 232, 0.35), 0 2px 6px rgba(0, 0, 0, 0.45)'
  return el
}

const cardStyle = {
  position: 'absolute',
  bottom: '40px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  maxWidth: 'min(560px, calc(100% - 32px))',
  padding: '12px 16px',
  borderRadius: '12px',
  background: 'rgba(18, 22, 28, 0.92)',
  color: '#ffffff',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '14px',
  lineHeight: 1.4,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
}

const buttonStyle = {
  flexShrink: 0,
  padding: '8px 14px',
  border: 'none',
  borderRadius: '8px',
  background: '#1a73e8',
  color: '#ffffff',
  fontFamily: 'inherit',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
}

export default function App() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const mountedRef = useRef(false)
  const [status, setStatus] = useState('checking')
  const [detail, setDetail] = useState('')

  useEffect(() => {
    mountedRef.current = true

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: satelliteStyle,
      center: KOLLAM,
      zoom: 13,
      maxZoom: 19,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    mapRef.current = map

    // Browsers only expose geolocation on HTTPS or localhost.
    if (!window.isSecureContext) {
      setStatus('insecure')
    } else if (!('geolocation' in navigator)) {
      setStatus('unsupported')
    } else if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((permission) => {
          if (!mountedRef.current) return
          if (permission.state === 'granted') requestLocation()
          else if (permission.state === 'denied') setStatus('denied')
          else setStatus('idle')
        })
        .catch(() => {
          if (mountedRef.current) setStatus('idle')
        })
    } else {
      setStatus('idle')
    }

    return () => {
      mountedRef.current = false
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current = null
      map.remove()
    }
  }, [])

  function showUserLocation(position) {
    const map = mapRef.current
    if (!map) return

    const userLocation = [position.coords.longitude, position.coords.latitude]

    markerRef.current?.remove()
    markerRef.current = new maplibregl.Marker({ element: createUserDot() })
      .setLngLat(userLocation)
      .addTo(map)

    map.flyTo({ center: userLocation, zoom: 15, duration: 1500 })
    setStatus('granted')
  }

  function requestLocation() {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported')
      return
    }

    setDetail('')
    setStatus('requesting')

    navigator.geolocation.getCurrentPosition(
      showUserLocation,
      (error) => {
        if (!mountedRef.current) return
        if (error.code === error.PERMISSION_DENIED) {
          setStatus('denied')
        } else {
          setDetail(error.message || 'Position unavailable.')
          setStatus('error')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  const showCard = status !== 'granted' && status !== 'dismissed' && status !== 'checking'

  let message = ''
  let action = null

  switch (status) {
    case 'idle':
      message = 'Allow location access to see where you are on the map.'
      action = (
        <button onClick={requestLocation} style={buttonStyle}>
          Allow location
        </button>
      )
      break
    case 'requesting':
      message = 'Getting your location…'
      break
    case 'insecure':
      message = `Location needs a secure connection. You are on ${window.location.origin} — open the app at http://localhost:5173 instead.`
      action = (
        <button onClick={() => setStatus('dismissed')} style={buttonStyle}>
          Dismiss
        </button>
      )
      break
    case 'denied':
      message =
        'Location is blocked for this site. Click the site icon in the address bar → Location → Allow, then press Try again.'
      action = (
        <button onClick={requestLocation} style={buttonStyle}>
          Try again
        </button>
      )
      break
    case 'error':
      message = `Couldn’t get your location. ${detail}`
      action = (
        <button onClick={requestLocation} style={buttonStyle}>
          Try again
        </button>
      )
      break
    case 'unsupported':
      message = 'Geolocation is not supported by this browser.'
      action = (
        <button onClick={() => setStatus('dismissed')} style={buttonStyle}>
          Dismiss
        </button>
      )
      break
    default:
      break
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {showCard && (
        <div style={cardStyle}>
          <span>{message}</span>
          {action}
        </div>
      )}
    </div>
  )
}
