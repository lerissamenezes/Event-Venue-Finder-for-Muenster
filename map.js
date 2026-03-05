// Venue data is loaded from event_venues.geojson via fetch below


// ── MAP INIT ─────────────────────────────────────────────────────────────────

const map = L.map('map').setView([51.9607, 7.6261], 14);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  maxZoom: 19
}).addTo(map);


// ── ICONS ─────────────────────────────────────────────────────────────────────

function venueIcon() {
  return L.divIcon({
    className: '',
    html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z" fill="#e06c3a"/>
      <circle cx="14" cy="14" r="6" fill="white"/>
    </svg>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36]
  });
}

function busStopIcon() {
  return L.divIcon({
    className: '',
    html: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="10" fill="#3a7de0" stroke="white" stroke-width="2"/>
      <text x="11" y="15" text-anchor="middle" font-size="11" fill="white"
            font-family="sans-serif" font-weight="bold">B</text>
    </svg>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14]
  });
}


// ── SPATIAL HELPERS ───────────────────────────────────────────────────────────

/**
 * Haversine formula — returns distance in metres between two [lng, lat] coords.
 */
function haversineDistance(coord1, coord2) {
  const R = 6371000; // Earth radius in metres
  const toRad = deg => deg * Math.PI / 180;

  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Given a venue coordinate and the full bus stop GeoJSON,
 * returns { name, stop_id, distance } for the nearest stop.
 */

function findNearestBusStop(venueCoord, busStops) {
  let nearest = null;
  let minDist = Infinity;
  let nearestCoords = null;

  for (const feature of busStops.features) {
    const dist = haversineDistance(venueCoord, feature.geometry.coordinates);
    if (dist < minDist) {
      minDist = dist;
      nearest = { ...feature.properties, distance: Math.round(dist) };
      nearestCoords = feature.geometry.coordinates;
    }
  }

  if (nearest) nearest.coords = nearestCoords;
  return nearest;
}


// ── POPUP BUILDERS ────────────────────────────────────────────────────────────

function badge(val) {
  return val
    ? `<span class="popup-badge badge-yes">Yes</span>`
    : `<span class="popup-badge badge-no">No</span>`;
}

function buildVenuePopup(p, nearest) {
  // suitable_f comes back as a comma-separated string from Shapefile
  const tags = p.suitable_f
    ? p.suitable_f.split(',').map(t => `<span class="popup-tag">${t.trim()}</span>`).join('')
    : '';

  const busStopRow = nearest
    ? `<div class="popup-row busstop-row">
        <span class="label">🚌 Nearest Bus Stop</span>
        <span class="value">${nearest.stop_name}</span>
        <span class="distance">${nearest.distance} m away</span>
       </div>`
    : '';

  return `
    <div class="popup-header">
      <div class="venue-type">${p.venue_type} · ${p.venue_cate} · ${p.atmosphere}</div>
      <h3>${p.venue_name}</h3>
    </div>
    <div class="popup-body">
      ${busStopRow}
      <div class="popup-row">
        <span class="label">📍 Address</span>
        <span class="value">${p.address}</span>
      </div>
      <div class="popup-row">
        <span class="label">👥 Capacity</span>
        <span class="value">${p.min_capaci} – ${p.max_capaci} people</span>
      </div>
      <div class="popup-row">
        <span class="label">🚻 Restrooms</span>
        <span class="value">${badge(p.has_restro)}</span>
      </div>
      <div class="popup-row">
        <span class="label">🍺 Alcohol</span>
        <span class="value">${badge(p.alcohol_al)}</span>
      </div>
      <div class="popup-row">
        <span class="label">🍕 Food</span>
        <span class="value">${badge(p.food_allow)}</span>
      </div>
      <div class="popup-row">
        <span class="label">📋 Permit needed</span>
        <span class="value">${badge(p.permit)}</span>
      </div>
      <div class="popup-row">
        <span class="label">🔊 Noise</span>
        <span class="value">${p.noise_rest}</span>
      </div>
      <div class="popup-row">
        <span class="label">🌙 Evenings</span>
        <span class="value">${badge(p.available_)}</span>
      </div>
      <div class="popup-row">
        <span class="label">📅 Weekends</span>
        <span class="value">${badge(p.availabl_1)}</span>
      </div>
      ${p.notes ? `<div style="font-size:0.78rem;color:#666;margin-top:8px;font-style:italic;">${p.notes}</div>` : ''}
      ${tags ? `<div class="popup-tags">${tags}</div>` : ''}
    </div>
    <div class="popup-footer">
      

      ${p.contact_ph ? `📞 ${p.contact_ph}` : ''}
      ${p.contact_ph && p.contact_em ? '&nbsp;|&nbsp;' : ''}
      ${p.contact_em ? `✉️ <a href="mailto:${p.contact_em}">${p.contact_em}</a>` : ''}
      ${p.website ? `<br><a href="${p.website}" target="_blank">🌐 Visit website</a>` : ''}
    </div>
  `;
}

function buildBusStopPopup(p) {
  return `
    <div class="popup-body busstop-popup">
      <h3>${p.stop_name}</h3>
      <div class="stop-id">Stop ID: ${p.stop_id ?? p.globalid ?? '—'}</div>
    </div>
  `;
}

let currentRoute = null;

function routeToNearestStop(venueCoord, busStopGeoJSON) {
  // Remove previous route if exists
  if (currentRoute) {
    map.removeControl(currentRoute);
    currentRoute = null;
  }

  const nearest = findNearestBusStop(venueCoord, busStopGeoJSON);
  if (!nearest) return;

  const venueLatlng = L.latLng(venueCoord[1], venueCoord[0]);
  const stopLatlng = L.latLng(nearest.coords[1], nearest.coords[0]);

  currentRoute = L.Routing.control({
    waypoints: [venueLatlng, stopLatlng],
    router: L.Routing.osrmv1({
       serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1'  // walking
    }),
    lineOptions: {
      styles: [{ color: '#3a7de0', weight: 4, opacity: 0.8 }]
    },
    createMarker: function() { return null; },
    show: false,          // hides the turn-by-turn panel
    addWaypoints: false,  // disables dragging waypoints
    routeWhileDragging: false,
    fitSelectedRoutes: true,
    showAlternatives: false
  }).addTo(map);
}
// ── LOAD BOTH GEOJSON FILES IN PARALLEL THEN RENDER ─────────────────────────

Promise.all([
  fetch('http://localhost:8080/geoserver/event_venues/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=event_venues%3Aevent_venues&outputFormat=application%2Fjson&maxFeatures=50&outputFormat=application/json')
    .then(res => res.json()),
  fetch('http://localhost:8080/geoserver/event_venues/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=event_venues%3Abusstops&outputFormat=application%2Fjson&outputFormat=application/json')
    .then(res => res.json())
  
])
.then(([venueGeoJSON, busStopGeoJSON]) => {

  // --- Render bus stops ---
  L.geoJSON(busStopGeoJSON, {
    pointToLayer: (feature, latlng) => L.marker(latlng, { icon: busStopIcon() }),
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindTooltip(p.name, { sticky: true, direction: 'top' });
      layer.bindPopup(buildBusStopPopup(p), { maxWidth: 220 });
    }
  }).addTo(map);

  // --- Render venues (bus stops already loaded, so proximity works) ---
  L.geoJSON(venueGeoJSON, {
    pointToLayer: (feature, latlng) => L.marker(latlng, { icon: venueIcon() }),
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      const nearest = findNearestBusStop(feature.geometry.coordinates, busStopGeoJSON);

      layer.bindTooltip(p.venue_name, { sticky: true, direction: 'top' });
      layer.bindPopup(buildVenuePopup(p, nearest), { maxWidth: 300 });

      layer.on('click', function () {
    routeToNearestStop(feature.geometry.coordinates, busStopGeoJSON);
  });
    }
  }).addTo(map);

})
.catch(err => {
  console.error(err);
  alert(`Failed to load data: ${err.message}\n\nMake sure all five files are in the same folder and you are running a local server (not opening the HTML directly as a file).`);
});
