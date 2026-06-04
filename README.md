# Event Venue Finder for Münster

A web-based GIS application: an interactive map for discovering event venues in Münster, with public transport accessibility built in.

## Overview

| | |
|--|---|
| **Goal** | An interactive map for discovering event venues in Münster with public transport accessibility. |
| **Datasets** | Self-compiled event venues + external Münster bus stop locations, both in GeoJSON. |
| **Stack** | GeoServer (WFS) · Leaflet.js · OSRM Routing · HTML / CSS / JavaScript |
| **Key output** | Venue popups with full attributes, nearest bus stop, and walking route on click. |

## System Architecture

The application is organized into three tiers:

**Data Tier — Shapefile (`.shp`)**
- `event_venues.shp`
- `busstops.shp`
- UTF-8 encoding
- Stored in the GeoServer `data_dir`

**Service Tier — GeoServer WFS**
- OGC WFS endpoints
- CORS enabled
- `outputFormat=application/json`
- Separate stores within a workspace

**Presentation Tier — Leaflet.js Frontend**
- `Promise.all()` fetch
- Haversine proximity calculation
- Leaflet popups
- OSRM routing

> **Note:** CORS is required. The `CrossOriginFilter` is enabled in `web.xml` with `chainPreflight=false` for Jetty 10 compatibility.

## Data Preparation

1. **Author GeoJSON** — Self-compiled venue dataset with attributes, plus external bus stop GeoJSON for Münster.
2. **Convert in QGIS** — Export to Shapefile with UTF-8 encoding. Add a `.cpg` file to fix umlaut rendering.
3. **Publish in GeoServer** — Create workspace → store → publish layer. Compute the bounding box from data.
4. **Verify WFS** — Test the endpoint in a browser. Confirm a GeoJSON response with the correct features.

### Shapefile Limitations to Watch For

| Issue | Detail |
|-------|--------|
| **Field names** | Truncated to 10 chars (e.g. `available_evenings` → `available_`) |
| **Arrays** | Flattened to comma-separated strings |
| **Encoding** | Requires explicit UTF-8 + a `.cpg` companion file |
| **Booleans** | Stored as `0`/`1` integers, not `true`/`false` |

## Map Interface

- 🟠 **Orange markers** — Event venues
- 🔵 **Blue markers** — Bus stops
- **Hover tooltip** — Shows venue/stop name
- **Click venue** — Opens the full popup and draws a walking route

## Venue Popup & Nearest Bus Stop

Clicking a venue opens a popup with the full set of attributes, and the nearest bus stop is calculated via the Haversine formula.

Popup attributes:
- 📍 Address
- 👥 Min / Max capacity
- 🚻 Restrooms
- 🍺 Alcohol allowed
- 🍕 Food allowed
- 📋 Permit required
- 🔊 Noise restrictions
- 🌙 Available evenings
- 📅 Available weekends
- 🚌 Nearest bus stop (Haversine)

## Walking Route to Nearest Bus Stop

1. **User clicks venue** — `layer.on('click')` event fires.
2. **Find nearest stop** — Haversine loop over all bus stops.
3. **Call OSRM** — Pedestrian routing via `routing.openstreetmap.de`.
4. **Draw route** — Blue polyline; the previous route is removed first.

   <img width="1075" height="642" alt="image" src="https://github.com/user-attachments/assets/6463c303-cb4c-47e4-b542-78606b899625" />
   <img width="972" height="645" alt="image" src="https://github.com/user-attachments/assets/6b1bb59b-b88d-40db-a195-b9f03186d29a" />
   <img width="1049" height="643" alt="image" src="https://github.com/user-attachments/assets/81bcd7d5-12f2-44d6-a8b7-43e7c7d85f0e" />



## Challenges & Lessons Learned

- **CORS configuration** — `web.xml` `CrossOriginFilter` with `chainPreflight=false` required for Jetty 10. Both the filter and filter-mapping blocks were needed.
- **Shapefile field truncation** — All attribute references in `map.js` had to match the 10-char truncated names from GeoServer (e.g. `available_` vs `available_evenings`).
- **UTF-8 encoding** — German umlauts corrupted without an explicit UTF-8 export in QGIS and a `.cpg` companion file in the shapefile folder.
- **Client-side spatial logic** — The Haversine formula is computed entirely in the browser, so no server-side spatial query is needed for the nearest-stop calculation.

## Summary

- GeoJSON datasets published through GeoServer as OGC WFS services.
- Leaflet.js frontend fetches both layers in parallel via `Promise.all()`.
- Nearest bus stop computed client-side using the Haversine formula.
- Walking route drawn on click using Leaflet Routing Machine + OSRM.
- Shapefile limitations required workarounds for field names, arrays, and encoding.
