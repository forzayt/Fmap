import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'

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
    'esri-transportation': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
    'esri-reference-labels': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
    route: {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: [] },
      },
    },
  },
  layers: [
    {
      id: 'esri-world-imagery',
      type: 'raster',
      source: 'esri-world-imagery',
    },
    {
      id: 'esri-transportation',
      type: 'raster',
      source: 'esri-transportation',
    },
    {
      id: 'esri-reference-labels',
      type: 'raster',
      source: 'esri-reference-labels',
    },
    {
      id: 'route-casing',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#062a33',
        'line-width': 9,
        'line-opacity': 0.6,
      },
    },
    {
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#00e5ff',
        'line-width': 5,
      },
    },
  ],
}

function createUserMarker() {
  const el = document.createElement('div')
  el.style.width = '40px'
  el.style.height = '40px'
  el.style.borderRadius = '50%'
  el.style.overflow = 'hidden'
  el.style.background = '#ffffff'
  el.style.border = '2px solid #1a73e8'
  el.style.boxSizing = 'border-box'
  el.style.padding = '3px'
  el.style.animation = 'fmap-pulse 2s infinite'
  el.innerHTML = `
    <img
      src="/walking.png"
      alt=""
      draggable="false"
      style="width:100%;height:100%;object-fit:contain;display:block;"
    />
  `
  return el
}

function createWaypointDot() {
  const el = document.createElement('div')
  el.style.width = '14px'
  el.style.height = '14px'
  el.style.borderRadius = '50%'
  el.style.background = '#00e5ff'
  el.style.border = '3px solid #ffffff'
  el.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.35), 0 2px 4px rgba(0, 0, 0, 0.45)'
  el.style.cursor = 'pointer'
  return el
}

function createStartArrow() {
  const el = document.createElement('div')
  el.style.width = '30px'
  el.style.height = '30px'
  el.style.cursor = 'pointer'
  el.style.filter = 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45))'
  el.innerHTML = `
    <svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2 L21.5 22 L12 17.2 L2.5 22 Z" fill="#e53935" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round" />
    </svg>
  `
  return el
}

function createFinishFlag() {
  const el = document.createElement('div')
  el.style.width = '30px'
  el.style.height = '30px'
  el.style.cursor = 'pointer'
  el.style.filter = 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45))'
  el.innerHTML = `
    <svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 2 V22" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" />
      <path d="M6 2 V22" stroke="#2e7d32" stroke-width="2.5" stroke-linecap="round" />
      <path d="M7 3 H20 L16.5 7.5 L20 12 H7 Z" fill="#43a047" stroke="#ffffff" stroke-width="1.3" stroke-linejoin="round" />
    </svg>
  `
  return el
}

async function fetchRoute(points) {
  const coordinates = points.map(([lon, lat]) => `${lon},${lat}`).join(';')
  const response = await fetch(`${OSRM_URL}/${coordinates}?overview=full&geometries=geojson`)
  if (!response.ok) throw new Error(`Routing request failed (${response.status})`)
  const data = await response.json()
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route found')
  return {
    coordinates: data.routes[0].geometry.coordinates,
    snapped: data.waypoints?.map((waypoint) => waypoint.location) ?? points,
  }
}

function readSharedRoute() {
  const hash = window.location.hash
  if (!hash.startsWith('#route=')) return null

  const points = hash
    .slice('#route='.length)
    .split(';')
    .map((pair) => pair.split(',').map(Number))
    .filter((pair) => pair.length === 2 && pair.every(Number.isFinite))

  return points.length >= 2 ? points : null
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the legacy method.
    }
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    return copied
  } catch {
    return false
  }
}

const geocodeCache = new Map()

async function reverseGeocode(lon, lat) {
  const key = `${lon.toFixed(4)},${lat.toFixed(4)}`
  if (geocodeCache.has(key)) return geocodeCache.get(key)

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=16`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      },
    )
    if (!response.ok) return null
    const data = await response.json()
    const address = data.address || {}
    const primary =
      data.name ||
      address.road ||
      address.pedestrian ||
      address.suburb ||
      address.neighbourhood ||
      address.city ||
      address.town ||
      address.village
    const secondary = address.city || address.town || address.state || address.country
    let place = primary
    if (primary && secondary && primary !== secondary) {
      place = `${primary}, ${secondary}`
    } else if (!place) {
      place = secondary || data.display_name?.split(',')[0] || 'Unknown Place'
    }
    geocodeCache.set(key, place)
    return place
  } catch {
    return null
  }
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

const routeControlsStyle = {
  position: 'absolute',
  bottom: '24px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
}

const routeButtonBaseStyle = {
  padding: '12px 28px',
  border: 'none',
  borderRadius: '999px',
  color: '#ffffff',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '15px',
  fontWeight: 600,
  letterSpacing: '0.2px',
  cursor: 'pointer',
}

const createRouteButtonStyle = {
  ...routeButtonBaseStyle,
  background: '#ef5350',
  boxShadow: '0 4px 16px rgba(239, 83, 80, 0.45)',
}

const finishRouteButtonStyle = {
  ...routeButtonBaseStyle,
  background: '#43a047',
  boxShadow: '0 4px 16px rgba(67, 160, 71, 0.45)',
}

const resetButtonStyle = {
  padding: '12px 20px',
  border: 'none',
  borderRadius: '999px',
  background: 'rgba(18, 22, 28, 0.85)',
  color: '#ffffff',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
}

const shareButtonStyle = {
  padding: '12px 20px',
  border: 'none',
  borderRadius: '999px',
  background: '#00bcd4',
  color: '#ffffff',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(0, 188, 212, 0.45)',
}

const toastStyle = {
  position: 'absolute',
  bottom: '84px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 30,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  borderRadius: '999px',
  background: 'rgba(18, 22, 28, 0.92)',
  color: '#ffffff',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '13px',
  fontWeight: 500,
  letterSpacing: '0.2px',
  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
  pointerEvents: 'none',
  animation: 'fmap-toast-in 0.2s ease',
  whiteSpace: 'nowrap',
}

const routeSummaryStyle = {
  position: 'absolute',
  top: '16px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 18px',
  borderRadius: '999px',
  background: 'rgba(18, 22, 28, 0.92)',
  color: '#ffffff',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '13px',
  fontWeight: 500,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
  maxWidth: 'min(640px, calc(100% - 32px))',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  animation: 'fmap-toast-in 0.2s ease',
}

const cardStyle = {
  position: 'absolute',
  bottom: '84px',
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

  const [routeMode, setRouteMode] = useState(false)
  const routeModeRef = useRef(false)
  const waypointsRef = useRef([])
  const waypointMarkersRef = useRef([])
  const routeRequestRef = useRef(0)
  const [routeCoords, setRouteCoords] = useState([])
  const [routeError, setRouteError] = useState('')
  const [toast, setToast] = useState('')
  const toastTimeoutRef = useRef(null)
  const [routePlaces, setRoutePlaces] = useState(null)
  const [sharedView, setSharedView] = useState(() => readSharedRoute() !== null)

  function updatePlaces(points) {
    if (!points || points.length === 0) {
      setRoutePlaces(null)
      return
    }

    if (points.length === 1) {
      reverseGeocode(points[0][0], points[0][1]).then((start) => {
        if (mountedRef.current && waypointsRef.current.length === 1) {
          setRoutePlaces({ start: start || 'Start point', end: '' })
        }
      })
      return
    }

    const startPoint = points[0]
    const endPoint = points[points.length - 1]

    Promise.all([
      reverseGeocode(startPoint[0], startPoint[1]),
      reverseGeocode(endPoint[0], endPoint[1]),
    ]).then(([start, end]) => {
      if (mountedRef.current && waypointsRef.current.length >= 2) {
        setRoutePlaces({
          start: start || 'Start',
          end: end || 'Destination',
        })
      }
    })
  }

  function showToast(text) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToast(text)
    toastTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setToast('')
      }
    }, 2500)
  }

  useEffect(() => {
    mountedRef.current = true

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: satelliteStyle,
      zoom: 2,
      maxZoom: 19,
      // Always show the attribution text instead of the collapsible "i" button.
      attributionControl: { compact: false },
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    mapRef.current = map

    const sharedRoute = readSharedRoute()
    if (sharedRoute) {
      setSharedView(true)
      restoreRoute(sharedRoute)
    } else if (window.isSecureContext && navigator.permissions?.query) {
      // If the user already granted access, locate them without asking again.
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
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
      routeRequestRef.current += 1
      markerRef.current?.remove()
      markerRef.current = null
      waypointMarkersRef.current.forEach((marker) => marker.remove())
      waypointMarkersRef.current = []
      mapRef.current = null
      map.remove()
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (container) container.classList.toggle('map-route-mode', routeMode)

    const map = mapRef.current
    if (map) {
      if (routeMode) map.doubleClickZoom.disable()
      else map.doubleClickZoom.enable()
    }
  }, [routeMode])

  useEffect(() => {
    const source = mapRef.current?.getSource('route')
    if (!source) return
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: routeCoords },
    })
  }, [routeCoords])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.on('click', handleMapClick)
    return () => map.off('click', handleMapClick)
  }, [])

  function showUserLocation(position) {
    const map = mapRef.current
    if (!map) return

    const userLocation = [position.coords.longitude, position.coords.latitude]

    markerRef.current?.remove()
    markerRef.current = new maplibregl.Marker({ element: createUserMarker() })
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

  function toggleRouteMode() {
    if (routeModeRef.current) {
      routeModeRef.current = false
      setRouteMode(false)
      rebuildWaypointMarkers()
      return
    }

    clearRoute()
    routeModeRef.current = true
    setRouteMode(true)
  }

  function resetRoute() {
    clearRoute()
    routeModeRef.current = false
    setRouteMode(false)
  }

  function clearRoute() {
    routeRequestRef.current += 1
    waypointsRef.current = []
    waypointMarkersRef.current.forEach((marker) => marker.remove())
    waypointMarkersRef.current = []
    setRouteCoords([])
    setRouteError('')
    setToast('')
    setRoutePlaces(null)

    if (window.location.hash.startsWith('#route=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  async function restoreRoute(points) {
    const map = mapRef.current
    if (!map) return

    waypointsRef.current = points
    updatePlaces(points)
    waypointMarkersRef.current = points.map((point, index) => {
      let role = 'middle'
      if (index === 0) role = 'start'
      else if (index === points.length - 1) role = 'finish'
      return createWaypointMarker(point, role)
    })

    const bounds = points.reduce(
      (result, point) => result.extend(point),
      new maplibregl.LngLatBounds(points[0], points[0]),
    )
    map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 0 })

    const requestId = ++routeRequestRef.current

    try {
      const { coordinates, snapped } = await fetchRoute(points)
      if (!mountedRef.current || requestId !== routeRequestRef.current) return

      waypointsRef.current = snapped
      snapped.forEach((location, index) => {
        waypointMarkersRef.current[index]?.setLngLat(location)
      })
      setRouteCoords(coordinates)
    } catch {
      if (!mountedRef.current || requestId !== routeRequestRef.current) return
      setRouteError('Could not load the shared route.')
    }
  }

  async function shareRoute() {
    if (waypointsRef.current.length < 2) return

    const routeParam = waypointsRef.current
      .map(([lon, lat]) => `${lon.toFixed(5)},${lat.toFixed(5)}`)
      .join(';')
    const url = `${window.location.origin}${window.location.pathname}#route=${routeParam}`

    // Start the copy immediately so it keeps the click's user activation.
    copyText(url).then((copied) => {
      if (mountedRef.current) {
        showToast(copied ? 'Route link copied to clipboard' : 'Could not copy the link')
      }
    })

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My route',
          text: routePlaces?.end
            ? `Route from ${routePlaces.start} to ${routePlaces.end}`
            : 'Check out this route',
          url,
        })
      } catch {
        // Sharing was cancelled or unavailable; the link is already copied.
      }
    }
  }

  function createWaypointMarker(point, role) {
    const element =
      role === 'start'
        ? createStartArrow()
        : role === 'finish'
          ? createFinishFlag()
          : createWaypointDot()

    const marker = new maplibregl.Marker({
      element,
      anchor: role === 'finish' ? 'bottom' : 'center',
    })
      .setLngLat(point)
      .addTo(mapRef.current)

    reverseGeocode(point[0], point[1]).then((name) => {
      if (name && element) {
        element.title = name
      }
    })

    marker.getElement().addEventListener('click', (event) => {
      event.stopPropagation()
      removeWaypoint(marker)
    })

    return marker
  }

  function rebuildWaypointMarkers() {
    const map = mapRef.current
    if (!map) return

    const points = waypointsRef.current
    const finished = !routeModeRef.current

    waypointMarkersRef.current.forEach((marker) => marker.remove())
    waypointMarkersRef.current = points.map((point, index) => {
      let role = 'middle'
      if (index === 0) role = 'start'
      else if (finished && index === points.length - 1) role = 'finish'
      return createWaypointMarker(point, role)
    })
  }

  async function removeWaypoint(marker) {
    if (!routeModeRef.current) return

    const index = waypointMarkersRef.current.indexOf(marker)
    if (index === -1) return

    const remaining = waypointsRef.current.filter((_, pointIndex) => pointIndex !== index)
    waypointsRef.current = remaining
    rebuildWaypointMarkers()
    updatePlaces(remaining)

    // Invalidate any route request that is still in flight.
    const requestId = ++routeRequestRef.current

    if (remaining.length < 2) {
      setRouteCoords([])
      setRouteError('')
      return
    }

    try {
      const { coordinates, snapped } = await fetchRoute(remaining)
      if (!mountedRef.current || requestId !== routeRequestRef.current) return

      snapped.forEach((location, snappedIndex) => {
        waypointMarkersRef.current[snappedIndex]?.setLngLat(location)
      })
      waypointsRef.current = snapped
      setRouteCoords(coordinates)
      setRouteError('')
    } catch {
      if (!mountedRef.current || requestId !== routeRequestRef.current) return
      setRouteError('Could not recalculate the route. Try again.')
    }
  }

  async function handleMapClick(event) {
    const map = mapRef.current
    if (!routeModeRef.current || !map) return

    const point = [event.lngLat.lng, event.lngLat.lat]
    const previous = waypointsRef.current
    const last = previous[previous.length - 1]

    if (last && Math.abs(last[0] - point[0]) < 1e-6 && Math.abs(last[1] - point[1]) < 1e-6) {
      return
    }

    const next = [...previous, point]
    waypointsRef.current = next
    updatePlaces(next)

    const marker = createWaypointMarker(point, next.length === 1 ? 'start' : 'middle')
    waypointMarkersRef.current.push(marker)

    if (next.length < 2) return

    const requestId = ++routeRequestRef.current

    try {
      const { coordinates, snapped } = await fetchRoute(next)
      if (!mountedRef.current || requestId !== routeRequestRef.current) return

      snapped.forEach((location, index) => {
        waypointMarkersRef.current[index]?.setLngLat(location)
      })
      waypointsRef.current = snapped
      setRouteCoords(coordinates)
      setRouteError('')
    } catch {
      if (!mountedRef.current || requestId !== routeRequestRef.current) return

      // Drop the point that could not be routed.
      waypointsRef.current = previous
      marker.remove()
      waypointMarkersRef.current = waypointMarkersRef.current.filter((item) => item !== marker)
      setRouteError('Could not build a route to that point. Try clicking closer to a road.')
    }
  }

  const locating = status === 'requesting'
  const showCard = ['insecure', 'denied', 'error', 'unsupported'].includes(status)
  const showShare = !routeMode && routeCoords.length > 0

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
      <style>{`
        @keyframes fmap-spin { to { transform: rotate(360deg); } }
        @keyframes fmap-toast-in {
          from {
            opacity: 0;
            transform: translate(-50%, 8px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        @keyframes fmap-pulse {
          0% { box-shadow: 0 0 0 0 rgba(26, 115, 232, 0.55), 0 2px 8px rgba(0, 0, 0, 0.45); }
          70% { box-shadow: 0 0 0 18px rgba(26, 115, 232, 0), 0 2px 8px rgba(0, 0, 0, 0.45); }
          100% { box-shadow: 0 0 0 0 rgba(26, 115, 232, 0), 0 2px 8px rgba(0, 0, 0, 0.45); }
        }
        .map-route-mode,
        .map-route-mode .maplibregl-canvas-container,
        .map-route-mode .maplibregl-canvas { cursor: crosshair !important; }
      `}</style>

      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {routePlaces && (
        <div style={routeSummaryStyle}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#4ade80', fontSize: '11px' }}>●</span>
            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {routePlaces.start}
            </span>
          </span>
          {routePlaces.end ? (
            <>
              <span style={{ opacity: 0.5 }}>→</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#ef5350', fontSize: '11px' }}>●</span>
                <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {routePlaces.end}
                </span>
              </span>
            </>
          ) : (
            <span style={{ opacity: 0.6, fontSize: '12px' }}>(click map for destination)</span>
          )}
        </div>
      )}

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

      {!sharedView && (
        <div style={routeControlsStyle}>
          {showShare && (
            <button type="button" onClick={shareRoute} style={shareButtonStyle}>
              Share route
            </button>
          )}
          <button type="button" onClick={resetRoute} style={resetButtonStyle}>
            Reset route
          </button>
          <button
            type="button"
            onClick={toggleRouteMode}
            style={routeMode ? finishRouteButtonStyle : createRouteButtonStyle}
          >
            {routeMode ? 'Finish route' : 'Create route'}
          </button>
        </div>
      )}

      {toast && (
        <div style={toastStyle} role="status" aria-live="polite">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4ade80"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toast}</span>
        </div>
      )}

      {routeError && (
        <div style={cardStyle}>
          <span>{routeError}</span>
          <button onClick={() => setRouteError('')} style={buttonStyle}>
            Dismiss
          </button>
        </div>
      )}

      {showCard && (
        <div style={cardStyle}>
          <span>{message}</span>
          {action}
        </div>
      )}
    </div>
  )
}
