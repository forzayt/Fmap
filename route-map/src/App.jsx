import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

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

const locateButtonStyle = {
  position: 'absolute',
  top: '10px',
  left: '10px',
  zIndex: 10,
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: '8px',
  background: '#ffffff',
  color: '#1a1a1a',
  boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.1)',
  cursor: 'pointer',
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

function LocateIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="7" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function App() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const mountedRef = useRef(false)
  const [status, setStatus] = useState('idle')
  const [detail, setDetail] = useState('')

  useEffect(() => {
    mountedRef.current = true

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: satelliteStyle,
      zoom: 2,
      maxZoom: 19,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    mapRef.current = map

    // If the user already granted access, locate them without asking again.
    if (window.isSecureContext && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((permission) => {
          if (mountedRef.current && permission.state === 'granted') {
            requestLocation()
          }
        })
        .catch(() => {})
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
    if (!window.isSecureContext) {
      setStatus('insecure')
      return
    }
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

  const locating = status === 'requesting'
  const showCard = ['insecure', 'denied', 'error', 'unsupported'].includes(status)

  let message = ''
  let action = null

  switch (status) {
    case 'insecure':
      message = `Location needs a secure connection. You are on ${window.location.origin} — open the app at http://localhost:5173 instead.`
      action = (
        <button onClick={() => setStatus('idle')} style={buttonStyle}>
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
        <button onClick={() => setStatus('idle')} style={buttonStyle}>
          Dismiss
        </button>
      )
      break
    default:
      break
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <style>{`@keyframes fmap-spin { to { transform: rotate(360deg); } }`}</style>

      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <button
        type="button"
        onClick={requestLocation}
        disabled={locating}
        title={locating ? 'Finding your location…' : 'Find my location'}
        aria-label="Find my location"
        style={{ ...locateButtonStyle, opacity: locating ? 0.7 : 1, cursor: locating ? 'wait' : 'pointer' }}
      >
        {locating ? (
          <span
            style={{
              width: '18px',
              height: '18px',
              border: '2px solid #c7c7c7',
              borderTopColor: '#1a73e8',
              borderRadius: '50%',
              animation: 'fmap-spin 0.8s linear infinite',
            }}
          />
        ) : (
          <LocateIcon />
        )}
      </button>

      {showCard && (
        <div style={cardStyle}>
          <span>{message}</span>
          {action}
        </div>
      )}
    </div>
  )
}
