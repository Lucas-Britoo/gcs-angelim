/**
 * ANGELIM PWA v1.9.0 - "Control Center Edition"
 * Arquitetura modular, sincronização Supabase e Portal de Gestão Expandido.
 */

import L from 'leaflet';
import { supabase, isSupabaseConfigured } from './lib/supabase.js';
import { renderDashboard } from './admin-dashboard.js';

// --- CONFIGURAÇÕES & ESTADO ---
const APP_CONFIG = {
  VERSION: '1.9.0',
  MAP_CENTER: [-2.909, -41.767],
  DEFAULT_ZOOM: 13,
  FOCUS_ZOOM: 16,
  CACHE_KEY: 'gcs_cache_v1.9'
};

const State = {
  map: null,
  markersLayer: new L.LayerGroup(),
  userLocation: null,
  globalGCs: [],
  hasFetched: false,
  activeSession: null
};

// --- UTILITÁRIOS ---
export function sanitize(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = 'error') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-animate px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm flex items-center gap-3 w-full max-w-sm mx-auto pointer-events-auto border border-white/20 transition-all ${
    type === 'success' ? 'bg-brand-dark' : 'bg-red-600'
  }`;
  
  const icon = type === 'success' 
    ? `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>`
    : `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// --- CORE: MAPA & RENDERIZAÇÃO ---
function initMap() {
  try {
    State.map = L.map('map', { zoomControl: false }).setView(APP_CONFIG.MAP_CENTER, APP_CONFIG.DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(State.map);

    L.control.zoom({ position: 'bottomright' }).addTo(State.map);
    State.markersLayer.addTo(State.map);

    setupGPS();
    fetchGCs();
  } catch (err) { console.error("Map Init Error:", err); }
}

function setupGPS() {
  if (!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      State.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      L.circleMarker([State.userLocation.lat, State.userLocation.lng], { 
        color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.5, radius: 8 
      }).addTo(State.map).bindPopup("Você");
      State.map.setView([State.userLocation.lat, State.userLocation.lng], APP_CONFIG.DEFAULT_ZOOM);
    },
    () => console.warn("GPS Denied")
  );
}

function renderGCMarkers(gcs) {
  State.markersLayer.clearLayers();
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
    marker.addTo(State.markersLayer);
  });
}

function getPopupTemplate(gc) {
  const name = sanitize(gc.nome);
  const wppLink = `https://wa.me/55${(gc.contato || "").replace(/\D/g, "")}`;
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${gc.lat},${gc.lng}`;
  return `
    <div class="custom-card w-full overflow-hidden bg-white relative">
      ${gc.foto_url ? `<img src="${gc.foto_url}" class="w-full h-32 object-cover border-b border-gray-100">` : `<div class="bg-brand-dark h-3 p-4"></div>`}
      <div class="p-4">
        <h3 class="font-black text-gray-900 text-sm uppercase tracking-tight mb-2">${name}</h3>
        <div class="space-y-2 mb-4 text-[11px] font-semibold text-gray-600">
          <p class="flex items-center gap-2">📍 ${sanitize(gc.bairro)}</p>
          <p class="flex items-center gap-2">⏰ ${sanitize(gc.dia)}, ${sanitize(gc.horario)}</p>
        </div>
        <div class="flex flex-col gap-2">
          <a href="${wppLink}" target="_blank" class="w-full bg-green-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase text-center shadow-lg active:scale-95 transition-all">Quero Participar</a>
          <a href="${navUrl}" target="_blank" class="w-full border border-gray-200 text-gray-400 py-2.5 rounded-xl text-[10px] font-black uppercase text-center active:bg-gray-50 transition-all">Ver no Maps</a>
        </div>
      </div>
    </div>`;
}

async function fetchGCs() {
  const cached = localStorage.getItem(APP_CONFIG.CACHE_KEY);
  if (cached && !State.hasFetched) {
    State.globalGCs = JSON.parse(cached);
    renderGCMarkers(State.globalGCs);
    renderPublicSheet(State.globalGCs);
  }
  try {
    const { data, error } = await supabase?.from('gcs').select('*') || { data: null, error: { message: 'Supabase offline' } };
    if (error) throw error;
    if (JSON.stringify(data) !== cached) {
      State.globalGCs = data;
      localStorage.setItem(APP_CONFIG.CACHE_KEY, JSON.stringify(data));
      renderGCMarkers(data);
      renderPublicSheet(data);
      if (State.activeSession) renderDashboard(data, document.getElementById('admin-content'));
    }
    State.hasFetched = true;
  } catch (err) { console.error("Fetch Error:", err); }
}

function renderPublicSheet(gcs) {
  const container = document.getElementById('public-gc-list');
  if (!container) return;
  container.innerHTML = gcs.map(gc => `
    <div onclick="window.focusGC('${gc.id}')" class="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm mb-3 cursor-pointer active:scale-95 transition-all hover:border-brand-dark group">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-black text-xs uppercase text-brand-dark group-hover:text-blue-600">${sanitize(gc.nome)}</h4>
          <p class="text-[10px] text-gray-400">${sanitize(gc.bairro)}</p>
        </div>
        <svg class="w-4 h-4 text-gray-200 group-hover:text-brand-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
      </div>
    </div>
  `).join('');
}

window.focusGC = (id) => {
  const gc = State.globalGCs.find(g => String(g.id) === String(id));
  if (gc && gc._marker && State.map) {
    State.map.flyTo(gc._marker.getLatLng(), APP_CONFIG.FOCUS_ZOOM, { animate: true, duration: 1.5 });
    gc._marker.openPopup();
  }
};

// --- CRUD: EDITOR LOGIC ---
window.openGCEditor = (idOrGc = null) => {
  const editor = document.getElementById('gc-editor');
  const dashContent = document.getElementById('admin-content');
  const title = document.getElementById('admin-title');

  // Nova Lógica: Se vier apenas o ID, busca no State Global
  let gc = null;
  if (idOrGc && (typeof idOrGc === 'string' || typeof idOrGc === 'number')) {
    gc = State.globalGCs.find(g => String(g.id) === String(idOrGc));
  } else {
    gc = idOrGc;
  }

  dashContent.classList.add('hidden');
  editor.classList.remove('hidden');
  title.textContent = gc ? "Editando Grupo" : "Novo Grupo";

  // Reset/Preencher formulário
  document.getElementById('gc-form').reset();
  document.getElementById('gc-edit-id').value = gc ? gc.id : "";
  document.getElementById('gc-name').value = gc ? gc.nome || "" : "";
  document.getElementById('gc-bairro').value = gc ? gc.bairro || "" : "";
  document.getElementById('gc-leader').value = gc ? gc.lider || "" : "";
  
  if (gc?.foto_url) {
    document.getElementById('photo-preview').src = gc.foto_url;
    document.getElementById('photo-preview').classList.remove('hidden');
    document.getElementById('photo-placeholder').classList.add('hidden');
  } else {
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('photo-placeholder').classList.remove('hidden');
  }
};

document.getElementById('close-editor').onclick = () => {
  document.getElementById('gc-editor').classList.add('hidden');
  document.getElementById('admin-content').classList.remove('hidden');
  document.getElementById('admin-title').textContent = "Painel Portal";
};

document.getElementById('gc-form').onsubmit = async (e) => {
  e.preventDefault();
  const id = document.getElementById('gc-edit-id').value;
  const gcData = {
    nome: document.getElementById('gc-name').value,
    bairro: document.getElementById('gc-bairro').value,
    lider: document.getElementById('gc-leader').value,
    atualizado_em: new Date()
  };

  try {
    const { error } = id 
      ? await supabase?.from('gcs').update(gcData).eq('id', id)
      : await supabase?.from('gcs').insert([gcData]) || { error: 'Supabase Offline' };
    
    if (error) throw error;
    showToast("Sucesso! Sincronizando...", "success");
    document.getElementById('close-editor').click();
    fetchGCs();
  } catch (err) { showToast(err.message); }
};

// --- AUTH: PORTAL ACCESS ---
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  try {
    const { error } = await supabase?.auth.signInWithPassword({ email, password }) || { error: 'Erro' };
    if (error) throw error;
    showToast("Acesso Autorizado", "success");
    authOverlay.classList.add('hidden');
  } catch (err) { showToast("Credenciais Inválidas"); }
}

async function updateUI(session) {
  State.activeSession = session;
  const adminPanel = document.getElementById('admin-panel');
  const loginTrigger = document.getElementById('login-trigger');

  if (session) {
    adminPanel.classList.remove('hidden');
    loginTrigger.innerHTML = `<div class="w-8 h-8 rounded-full bg-brand-dark text-white flex items-center justify-center font-black text-[10px]">${session.user.email.substring(0,2).toUpperCase()}</div>`;
    
    // Se ainda não temos dados, buscamos agora para garantir o dash preenchido
    if (State.globalGCs.length === 0) {
      await fetchGCs();
    } else {
      renderDashboard(State.globalGCs, document.getElementById('admin-content'));
    }
  } else {
    adminPanel.classList.add('hidden');
    loginTrigger.innerHTML = `<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`;
  }
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  authForm.onsubmit = handleLogin;
  document.getElementById('login-trigger').onclick = () => authOverlay.classList.remove('hidden');
  authOverlay.onclick = (e) => { if (e.target === authOverlay) authOverlay.classList.add('hidden'); };
  
  // Listener Único de Autenticação para evitar duplicidade
  supabase?.auth.onAuthStateChange((event, session) => {
    console.log("Auth Event:", event);
    updateUI(session);
  });
});

window.signOut = async () => { await supabase?.auth.signOut(); window.location.reload(); };
