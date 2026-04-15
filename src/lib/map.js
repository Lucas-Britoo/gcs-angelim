import L from 'leaflet';

const APP_CONFIG = {
  MAP_CENTER: [-2.909, -41.776],
  DEFAULT_ZOOM: 14,
  FOCUS_ZOOM: 16
};

export function initMap(elementId = 'map') {
  const map = L.map(elementId, { zoomControl: false }).setView(APP_CONFIG.MAP_CENTER, APP_CONFIG.DEFAULT_ZOOM);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  return map;
}

export function setupGPS(map) {
  if (!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      L.circleMarker([userLocation.lat, userLocation.lng], { 
        color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.5, radius: 8 
      }).addTo(map).bindPopup("Você");
      map.setView([userLocation.lat, userLocation.lng], APP_CONFIG.DEFAULT_ZOOM);
    },
    () => console.warn("GPS Denied")
  );
}

export function renderGCMarkers(map, gcs) {
  const markersLayer = new L.LayerGroup().addTo(map);
  
  markersLayer.clearLayers();
  gcs.forEach(gc => {
    if (!gc.lat || !gc.lng) return;
    const coords = [parseFloat(gc.lat), parseFloat(gc.lng)];
    const brandIcon = L.divIcon({
      className: 'bg-transparent border-0',
      html: `<div class="w-11 h-11 bg-brand-dark rounded-full border-2 border-white shadow-xl flex items-center justify-center active:scale-90 transition-transform"><img src="/logo.svg" class="w-8 h-8"></div>`,
      iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -22]
    });
    const marker = L.marker(coords, { icon: brandIcon }).bindPopup(getPopupTemplate(gc), {
      maxWidth: 280, minWidth: 280, autoPanPadding: [100, 100], className: 'custom-popup'
    });
    gc._marker = marker;
    marker.addTo(markersLayer);
  });

  return markersLayer;
}

function getPopupTemplate(gc) {
  const name = gc.nome; // Assuming sanitize is handled in UI or pre-escaped
  const wppLink = `https://wa.me/55${(gc.contato || "").replace(/\D/g, "")}`;
  return `
    <div class="p-0 overflow-hidden rounded-3xl bg-white">
      ${gc.foto_url ? `<img src="${gc.foto_url}" class="w-full h-32 object-cover">` : '<div class="w-full h-24 bg-brand-light flex items-center justify-center font-bold text-white uppercase text-xs">Sem Foto</div>'}
      <div class="p-5">
        <span class="text-[9px] font-black uppercase tracking-widest text-brand-dark opacity-60">${gc.bairro || "Sem Bairro"}</span>
        <h3 class="text-base font-black text-gray-900 leading-tight mb-4">${name}</h3>
        <div class="flex flex-col gap-2">
          <a href="${wppLink}" target="_blank" class="w-full bg-green-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase text-center shadow-lg active:scale-95 transition-all">Quero Participar</a>
          <button onclick="window.openDirections(${gc.lat}, ${gc.lng})" class="w-full border border-gray-200 text-gray-500 py-2.5 rounded-xl text-[10px] font-black uppercase text-center active:bg-gray-50 transition-all font-sans">Como Chegar 🚗</button>
        </div>
      </div>
    </div>`;
}

export function focusGC(map, gc) {
  if (gc && gc._marker && map) {
    map.flyTo(gc._marker.getLatLng(), APP_CONFIG.FOCUS_ZOOM, { animate: true, duration: 1.5 });
    gc._marker.openPopup();
  }
}