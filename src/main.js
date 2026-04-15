/**
 * ANGELIM PWA v3.0.0 - Refactored & Clean
 * Clean Architecture & SOLID Principles
 */

import L from 'leaflet';
import { supabase, isSupabaseConfigured } from './lib/supabase.js';
import { sanitize, triggerHaptic, shareGrowthGroup } from './lib/utils.js';
import { showToast, renderLoadingSkeletons, renderGrowthGroupList, getPopupHtml, toggleAdminUI } from './lib/ui.js';
import { initAppServices, loadGrowthGroupsWithCache, subscribeToRealtimeChanges } from './services.js';
import { renderDashboard } from './admin-dashboard.js';

const APP_CONFIG = {
  VERSION: '3.0.0',
  MAP_CENTER: [-2.909, -41.776],
  DEFAULT_ZOOM: 14,
  FOCUS_ZOOM: 16,
  CACHE_KEY: 'angelim_gc_cache_v4'
};

const State = {
  map: null,
  markersLayer: null,
  userLocation: null,
  growthGroups: [],
  hasFetched: false,
  activeSession: null
};

async function initApp() {
  try {
    await initAppServices();
    initMap();
    initEventListeners();
    initAuthListener();
    await loadGrowthGroups();
    setupRealtimeSync();
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    showToast('Erro ao iniciar aplicativo', 'error');
  }
}

function initAuthListener() {
  if (!supabase) return;
  
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 Auth Event:', event, session);
    
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      if (session) {
        toggleAdminUI(true);
      }
    } else if (event === 'SIGNED_OUT') {
      toggleAdminUI(false);
    }
  });
}

function initMap() {
  try {
    State.map = L.map('map', { zoomControl: false }).setView(APP_CONFIG.MAP_CENTER, APP_CONFIG.DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(State.map);
    L.control.zoom({ position: 'bottomright' }).addTo(State.map);
    State.markersLayer = new L.LayerGroup().addTo(State.map);
    setupGeolocation();
  } catch (error) {
    console.error('Map Init Error:', error);
  }
}

function setupGeolocation() {
  if (!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      State.userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
      L.circleMarker([State.userLocation.lat, State.userLocation.lng], { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.5, radius: 8 })
        .addTo(State.map).bindPopup('Você');
      State.map.setView([State.userLocation.lat, State.userLocation.lng], APP_CONFIG.DEFAULT_ZOOM);
    },
    (error) => console.warn('GPS Error:', error.message)
  );
}

function renderGroupMarkers(growthGroupsData) {
  if (!State.markersLayer) return;
  const validGroups = (growthGroupsData || []).filter(g => g && g.nome);
  State.markersLayer.clearLayers();
  validGroups.forEach(group => {
    if (!group.lat || !group.lng) return;
    const coords = [parseFloat(group.lat), parseFloat(group.lng)];
    const icon = L.divIcon({
      className: 'bg-transparent border-0',
      html: `<div class="w-11 h-11 bg-brand-dark rounded-full border-2 border-white shadow-xl flex items-center justify-center active:scale-90 transition-transform"><img src="/logo.svg" class="w-8 h-8"></div>`,
      iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -22]
    });
    const marker = L.marker(coords, { icon }).bindPopup(getPopupHtml(group), { maxWidth: 280, minWidth: 280, autoPanPadding: [100, 100], className: 'custom-popup' });
    group._marker = marker;
    marker.addTo(State.markersLayer);
  });
}

async function loadGrowthGroups() {
  renderLoadingSkeletons();
  const groups = await loadGrowthGroupsWithCache();
  
  if (groups.length > 0) {
    State.growthGroups = groups;
    renderGroupMarkers(groups);
    renderGrowthGroupList(groups, handleGroupClick);
    State.hasFetched = true;
  } else if (!navigator.onLine) {
    renderLoadingSkeletons();
  }
}

function setupRealtimeSync() {
  if (!supabase || !isSupabaseConfigured) return;
  subscribeToRealtimeChanges(() => loadGrowthGroups());
}

function handleGroupClick(groupId) {
  const group = State.growthGroups.find(g => String(g.id) === String(groupId));
  if (group && group._marker && State.map) {
    State.map.flyTo(group._marker.getLatLng(), APP_CONFIG.FOCUS_ZOOM, { animate: true, duration: 1.5 });
    group._marker.openPopup();
  }
}

function initEventListeners() {
  document.addEventListener('pointerdown', (event) => {
    const card = event.target.closest('.metric-card');
    if (card) triggerHaptic();
  });
  
  window.addEventListener('online', () => { showToast('Conexão restabelecida!', 'success'); loadGrowthGroups(); });
  window.addEventListener('offline', () => { showToast('Modo offline ativado', 'error'); });

  const loginTrigger = document.getElementById('login-trigger');
  const authOverlay = document.getElementById('auth-overlay');
  if (loginTrigger && authOverlay) {
    loginTrigger.onclick = () => authOverlay.classList.remove('hidden');
    authOverlay.onclick = (event) => { if (event.target === authOverlay) authOverlay.classList.add('hidden'); };
  }

  const authForm = document.getElementById('auth-form');
  if (authForm) authForm.onsubmit = handleAuthSubmit;
  
  setupPhotoUpload();
  setupAutoFill();
  setupSearch();
  setupGestures();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!supabase) return;
  
  const email = document.getElementById('auth-email')?.value?.trim();
  const password = document.getElementById('auth-password')?.value;
  
  if (!email || !password) {
    showToast('Preencha e-mail e senha', 'error');
    return;
  }
  
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    showToast('Acesso autorizado', 'success');
    document.getElementById('auth-overlay')?.classList.add('hidden');
  } catch (error) {
    showToast('Credenciais inválidas', 'error');
  }
}

function setupPhotoUpload() {
  const dropzone = document.getElementById('photo-dropzone');
  const fileInput = document.getElementById('gc-photo-input');
  if (!dropzone || !fileInput) return;
  
  dropzone.onclick = () => fileInput.click();
  fileInput.onchange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const preview = document.getElementById('photo-preview');
    const placeholder = document.getElementById('photo-placeholder');
    if (preview && placeholder) {
      const reader = new FileReader();
      reader.onload = (e) => { preview.src = e.target?.result; preview.classList.remove('hidden'); placeholder.classList.add('hidden'); };
      reader.readAsDataURL(file);
    }
  };
}

function setupAutoFill() {
  const latField = document.getElementById('gc-lat');
  const lngField = document.getElementById('gc-lng');
  if (!latField || !lngField) return;
  
  const handler = async () => {
    const lat = latField.value?.trim();
    const lng = lngField.value?.trim();
    if (!lat || !lng || lat.length < 5 || lng.length < 5) return;
    
    try {
      showToast('Buscando endereço...', 'success');
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      
      if (data.address) {
        const bairro = data.address.suburb || data.address.neighbourhood || data.address.village || data.address.town;
        const road = data.address.road || '';
        const houseNum = data.address.house_number || '';
        
        if (bairro) document.getElementById('gc-bairro').value = bairro;
        if (road) document.getElementById('gc-address').value = `${road}${houseNum ? ', ' + houseNum : ''}`;
        showToast('Endereço encontrado!', 'success');
      }
    } catch (error) { console.error('AutoFill error:', error); }
  };
  
  latField.onblur = handler;
  lngField.onblur = handler;
}

function setupSearch() {
  const searchInput = document.getElementById('public-search');
  if (!searchInput) return;
  
  searchInput.oninput = (event) => {
    const term = event.target.value.toLowerCase();
    if (!term) { renderGrowthGroupList(State.growthGroups, handleGroupClick); renderGroupMarkers(State.growthGroups); return; }
    const filtered = State.growthGroups.filter(g => g.nome?.toLowerCase().includes(term) || g.bairro?.toLowerCase().includes(term));
    renderGrowthGroupList(filtered, handleGroupClick);
    renderGroupMarkers(filtered);
  };
}

function setupGestures() {
  const sheetHandle = document.getElementById('sheet-handle');
  const publicSheet = document.getElementById('public-sheet');
  if (sheetHandle && publicSheet) setupGesture(sheetHandle, publicSheet, 'drawer-active');
  
  const adminHandle = document.getElementById('admin-handle');
  const adminPanel = document.getElementById('admin-panel');
  if (adminHandle && adminPanel) setupGesture(adminHandle, adminPanel, 'admin-active');
}

function setupGesture(handleElement, targetElement, activeClass) {
  let startY = 0, currentY = 0;
  handleElement.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
  handleElement.addEventListener('touchmove', (e) => { currentY = e.touches[0].clientY; }, { passive: true });
  handleElement.addEventListener('touchend', () => {
    const diff = startY - currentY;
    if (Math.abs(diff) < 30) return;
    if (diff > 50) targetElement.classList.add(activeClass);
    else if (diff < -50) targetElement.classList.remove(activeClass);
  });
  handleElement.onclick = () => targetElement.classList.toggle(activeClass);
}

window.focusGC = handleGroupClick;
window.openDirections = (lat, lng) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const gMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  const appleUrl = `http://maps.apple.com/?daddr=${lat},${lng}`;

  if (confirm('Deseja abrir no Waze?')) window.open(wazeUrl, '_blank');
  else if (isIOS && confirm('Deseja abrir no Apple Maps?')) window.open(appleUrl, '_blank');
  else window.open(gMapsUrl, '_blank');
};

window.shareGC = async (group) => {
  try {
    const groupObj = typeof group === 'string' ? JSON.parse(decodeURIComponent(group)) : group;
    const result = await shareGrowthGroup(groupObj);
    if (result) showToast(result, 'success');
  } catch (error) { showToast('Erro ao compartilhar', 'error'); }
};

window.signOut = async () => {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
    showToast('Logout realizado', 'success');
  } catch (error) {
    console.error('Logout error:', error);
  }
};

document.addEventListener('DOMContentLoaded', initApp);