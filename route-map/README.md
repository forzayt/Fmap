# 🗺️ FMAP — Interactive Satellite Route Planner & Navigator

**FMAP** is a lightweight, responsive web application for interactive route planning, GPS geolocation, and instant route sharing over satellite imagery. Built with **React 18**, **MapLibre GL**, and **Vite**, FMAP integrates Open Source Routing Machine (**OSRM**) for road navigation, Esri ArcGIS for hybrid aerial tiles, and OpenStreetMap Nominatim for real-time reverse geocoding.

---

## ✨ Features

### 🛰️ High-Resolution Hybrid Satellite Map
- **Esri World Imagery**: Global high-resolution satellite imagery base layer.
- **Reference Overlays**: Integrated ArcGIS World Boundaries, Places, and Transportation tile sets, overlaying clear city, town, landmark, and street labels directly over aerial photography.
- **Map Controls**: Metric scale indicator, navigation controls, and double-click zoom management.

### 📍 Route Creation & Interactive Waypoints
- **Point-and-Click Waypoints**: Toggle route creation mode to set waypoints anywhere on the map with a custom crosshair cursor.
- **OSRM Road Routing**: Real-time road snapping and geometry calculation using the OSRM Driving engine.
- **Custom Visual Markers**:
  - 🚩 **Start Marker**: Directional red arrow icon.
  - 🔵 **Intermediate Waypoints**: High-contrast cyan dots with protective halo shadows.
  - 🏁 **Destination Marker**: Green finish flag with pole anchor.
- **Waypoint Editing**: Click any existing marker to delete it; the route automatically re-calculates and re-snaps remaining waypoints.

### 🏷️ Place Name Discovery & Reverse Geocoding
- **Live Route Header**: A floating capsule pill at the top of the viewport displays the reverse-geocoded place names:
  ```
  🟢 [Start Place] → 🔴 [Destination Place]
  ```
- **Marker Tooltips**: Hovering over any waypoint reveals its localized street/neighborhood name.
- **Cached Lookups**: In-memory coordinate caching minimizes external API calls to OpenStreetMap Nominatim.

### 🔗 Instant Route Sharing & Clipboard Auto-Copy
- **Zero-Backend URL Serialization**: Routes are encoded directly into the URL hash fragment:
  ```text
  https://example.com/#route=lon1,lat1;lon2,lat2;lon3,lat3
  ```
- **Auto-Copy to Clipboard**: Clicking **Share route** immediately copies the link to the clipboard using `navigator.clipboard` (with an invisible `execCommand('copy')` fallback).
- **Native Share Sheet**: Triggers the system Web Share dialog (`navigator.share`) on mobile devices and supported browsers, pre-populating route origin and destination names.
- **Small Toast Notification**: Compact, non-intrusive pill toast confirming clipboard status with smooth CSS slide-in animation and automatic 2.5-second dismissal.
- **Shared View Mode**: Opening a shared link automatically bounds the camera to the full route and provides a streamlined viewing experience.

### 📍 GPS Geolocation & Status Feedback
- **One-Tap Location**: Locate button with high-accuracy positioning, smooth camera fly-to, and an animated pulsing avatar.
- **Resilient Error Handling**: Informative feedback cards for permissions denied, timeout, unsupported browser, or insecure (non-HTTPS) contexts.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **[React 18](https://react.dev/)** | Component architecture and state management |
| **[Vite 5](https://vitejs.dev/)** | Fast developer server and production bundler |
| **[MapLibre GL JS](https://maplibre.org/)** | WebGL/vector map rendering engine |
| **[OSRM API](http://project-osrm.org/)** | Driving route calculation and coordinate snapping |
| **[ArcGIS Tile Services](https://www.esri.com/)** | Satellite imagery and place/transportation reference layers |
| **[OSM Nominatim](https://nominatim.openstreetmap.org/)** | Reverse geocoding for place and address resolution |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ recommended)
- `npm` or `pnpm`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/fmap.git
   cd fmap
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:5173` (ensure you use `localhost` or HTTPS for GPS geolocation support).

---

## 📦 Scripts

- `npm run dev`: Launches local Vite development server with Hot Module Replacement (HMR).
- `npm run build`: Compiles and minifies assets into `dist/` for production deployment.
- `npm run preview`: Locally previews the production build.

---

## 🗺️ Application Architecture

```
Fmap/
├── public/                 # Static assets (markers, icons)
│   ├── gps.png
│   └── walking.png
├── src/
│   ├── App.jsx             # Core map instance, routing engine, UI overlays
│   ├── index.css           # Global layout & reset rules
│   └── main.jsx            # React root mount point
├── package.json            # Project dependencies & build scripts
├── vite.config.js          # Vite build configuration
└── README.md               # Project documentation
```

### Key Logic in `App.jsx`
- **`satelliteStyle`**: Configures raster imagery and vector route layers with Esri tiles and label overlays.
- **`fetchRoute(points)`**: Queries the OSRM driving service to obtain full route LineString geometries.
- **`reverseGeocode(lon, lat)`**: Resolves geographical coordinates into human-readable city/street names with caching.
- **`copyText(text)`**: Dual-strategy clipboard copier supporting modern async Clipboard API and fallback methods.
- **`shareRoute()`**: Coordinates clipboard copy, toast presentation, and native Web Share API invocations.

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
