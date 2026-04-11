/**
 * ANGELIM PWA v1.9.0 - "Control Center Edition"
 * Arquitetura modular, sincronização Supabase e Portal de Gestão Expandido.
 */

import L from 'leaflet';
import { supabase, isSupabaseConfigured } from './lib/supabase.js';
import { renderDashboard } from './admin-dashboard.js';

if (!isSupabaseConfigured) {
  console.warn("⚠️ Supabase: Chaves de API não encontradas. Configure as variáveis de ambiente.");
}

// --- ATIVAÇÃO DO MOTOR REALTIME (v3.0.0) ---
if (supabase) {
  const channel = supabase
    .channel('public:gcs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'gcs' }, (payload) => {
      console.log('📡 Sincronia Realtime:', payload.eventType);
      fetchGCs();
    })
    .subscribe((status) => {
      console.log('🔌 Status do Canal:', status);
      if (status === 'CHANNEL_ERROR') {
        console.warn('⚠️ Erro no Realtime. Verifique se a Replication está ativa no Dashboard.');
      }
    });
}

// --- CONFIGURAÇÕES & ESTADO ---
const APP_CONFIG = {
  VERSION: '3.2.0',
  MAP_CENTER: [-2.909, -41.776],
  DEFAULT_ZOOM: 14,
  FOCUS_ZOOM: 16,
  CACHE_KEY: 'angelim_gcs_cache_v3'
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

// --- UX: SKELETONS & NAVEGAÇÃO (v4.1.0) ---
function renderSkeletons() {
  const container = document.getElementById('public-gc-list');
  if (!container) return;
  container.innerHTML = Array(4).fill(0).map(() => `
    <div class="bg-white/50 rounded-3xl p-4 border border-gray-100 flex gap-4 animate-pulse">
      <div class="w-16 h-16 skeleton rounded-2xl flex-shrink-0"></div>
      <div class="flex-1 space-y-3">
        <div class="h-4 skeleton w-3/4"></div>
        <div class="h-3 skeleton w-1/2"></div>
      </div>
    </div>
  `).join('');
}

window.openDirections = (lat, lng) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const gMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  const appleUrl = `http://maps.apple.com/?daddr=${lat},${lng}`;

  if (confirm("Deseja abrir no Waze?")) {
    window.open(wazeUrl, '_blank');
  } else if (isIOS && confirm("Deseja abrir no Apple Maps?")) {
    window.open(appleUrl, '_blank');
  } else {
    window.open(gMapsUrl, '_blank');
  }
};

function getPopupTemplate(gc) {
  const name = sanitize(gc.nome);
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

async function fetchGCs() {
  const cached = localStorage.getItem(APP_CONFIG.CACHE_KEY);
  if (cached && !State.hasFetched) {
    const data = JSON.parse(cached);
    State.globalGCs = data;
    renderGCMarkers(data);
    renderPublicSheet(data);
  } else {
    renderSkeletons(); // Mostra skeletons se não houver cache inicial
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
  
  if (gcs.length === 0) {
    container.innerHTML = `<div class="text-center py-20"><p class="text-gray-400 text-sm">Nenhum GC encontrado.</p></div>`;
    return;
  }

  container.innerHTML = gcs.map(gc => {
    return `
      <div class="bg-white rounded-3xl p-4 border border-gray-100 flex gap-4 hover:shadow-md transition-shadow active:scale-[0.98] transition-all cursor-pointer" onclick="window.focusGC('${gc.id}')">
        <div class="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-brand-light">
          ${gc.foto_url ? `<img src="${gc.foto_url}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-white font-bold text-xs font-black">GC</div>`}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start mb-1">
            <h4 class="font-black text-gray-900 text-sm truncate uppercase tracking-tight">${sanitize(gc.nome)}</h4>
            <span class="text-[8px] font-bold bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full uppercase truncate">${sanitize(gc.bairro)}</span>
          </div>
          <p class="text-[10px] text-gray-500 font-semibold mb-3">${sanitize(gc.dia)}, ${sanitize(gc.horario)}</p>
          <div class="flex gap-2">
            <button onclick="event.stopPropagation(); window.openDirections(${gc.lat}, ${gc.lng})" class="flex-1 bg-gray-50 text-gray-600 py-2 rounded-xl text-[9px] font-black uppercase text-center active:bg-gray-100 transition-all">Rotas 🚗</button>
            <a onclick="event.stopPropagation();" href="https://wa.me/55${(gc.contato || "").replace(/\D/g, "")}" target="_blank" class="flex-1 bg-green-50 text-green-600 py-2 rounded-xl text-[9px] font-black uppercase text-center active:bg-green-100 transition-all items-center justify-center flex gap-1">Zap 💬</a>
          </div>
        </div>
      </div>
    `;
  }).join('');
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

  // Reset/Preencher formulário (v2.0.0 Total)
  document.getElementById('gc-form').reset();
  document.getElementById('gc-edit-id').value = gc ? gc.id : "";
  document.getElementById('gc-name').value = gc ? gc.nome || "" : "";
  document.getElementById('gc-bairro').value = gc ? gc.bairro || "" : "";
  document.getElementById('gc-leader').value = gc ? gc.lider || "" : "";
  document.getElementById('gc-dia').value = gc ? gc.dia || "" : "";
  document.getElementById('gc-horario').value = gc ? gc.horario || "" : "";
  document.getElementById('gc-contato').value = gc ? gc.contato || "" : "";
  document.getElementById('gc-address').value = gc ? gc.endereco || "" : "";
  document.getElementById('gc-lat').value = gc ? gc.lat || "" : "";
  document.getElementById('gc-lng').value = gc ? gc.lng || "" : "";
  
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
  document.getElementById('admin-title').textContent = "Painel";
};

// --- INTELIGÊNCIA GEOGRÁFICA: AUTOPREENCHIMENTO (v3.1.0) ---
async function handleAutoFill() {
  const lat = document.getElementById('gc-lat').value.trim();
  const lng = document.getElementById('gc-lng').value.trim();
  
  if (lat && lng && lat.length > 5 && lng.length > 5) {
    try {
      showToast("Buscando endereço...", "success");
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      
      if (data.address) {
        const bairro = data.address.suburb || data.address.neighbourhood || data.address.village || data.address.town || "";
        const road = data.address.road || "";
        const houseNum = data.address.house_number || "";
        
        if (bairro) document.getElementById('gc-bairro').value = bairro;
        if (road) document.getElementById('gc-address').value = `${road}${houseNum ? ', ' + houseNum : ''}`;
        
        showToast("Dados preenchidos!", "success");
      }
    } catch (e) { console.error("Erro no AutoFill:", e); }
  }
}

async function uploadPhoto(file) {
  if (!file || !supabase) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from('gc-photos')
    .upload(fileName, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('gc-photos')
    .getPublicUrl(fileName);

  return publicUrl;
}

window.deleteGC = async (id) => {
  if (!confirm("Tem certeza que deseja apagar este grupo permanentemente?")) return;
  
  try {
    const numericId = Number(id);
    console.log("🗑️ Tentando apagar ID:", numericId);
    
    const { error } = await supabase?.from('gcs').delete().eq('id', numericId);
    if (error) {
       console.error("❌ Erro Supabase no Delete:", error);
       throw error;
    }
    
    // Invalidação de Cache Total (v3.2)
    localStorage.removeItem('angelim_gcs_cache_v3');
    showToast("Grupo removido!", "success");
    fetchGCs();
  } catch (err) {
    showToast(`Erro ao apagar: ${err.message || 'Verifique sua conexão'}`);
    console.error(err);
  }
};

document.getElementById('gc-form').onsubmit = async (e) => {
  e.preventDefault();
  const id = document.getElementById('gc-edit-id').value;
  const photoFile = document.getElementById('gc-photo-input').files[0];
  const loader = document.getElementById('upload-status');
  
  try {
    let foto_url = null;
    
    // Se houver nova foto, fazemos o upload primeiro
    if (photoFile) {
      loader.classList.remove('hidden');
      foto_url = await uploadPhoto(photoFile);
      loader.classList.add('hidden');
    }

    const gcData = {
      nome: document.getElementById('gc-name').value,
      bairro: document.getElementById('gc-bairro').value,
      lider: document.getElementById('gc-leader').value,
      dia: document.getElementById('gc-dia').value || null,
      horario: document.getElementById('gc-horario').value || null,
      contato: document.getElementById('gc-contato').value || null,
      endereco: document.getElementById('gc-address').value || null,
      lat: document.getElementById('gc-lat').value || null,
      lng: document.getElementById('gc-lng').value || null
    };

    if (foto_url) gcData.foto_url = foto_url;

    const { error } = id 
      ? await supabase?.from('gcs').update(gcData).eq('id', id)
      : await supabase?.from('gcs').insert([gcData]) || { error: 'Supabase Offline' };
    
    if (error) throw error;
    
    // Invalidação de Cache (v2.5.0)
    localStorage.removeItem('angelim_gcs_cache');
    
    showToast("Sincronizado com Sucesso!", "success");
    document.getElementById('close-editor').click();
    
    // Pequeno delay para garantir propagação no Supabase
    setTimeout(() => {
      fetchGCs();
    }, 500);

  } catch (err) { 
    showToast(`Erro: ${err.message || 'Falha no processamento'}`); 
    console.error(err);
    loader.classList.add('hidden');
  }
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

// --- MOTOR DE GESTOS SWIPE (v4.0.0) ---
function initSwipe(handleId, targetId, activeClass) {
  const handle = document.getElementById(handleId);
  const target = document.getElementById(targetId);
  if (!handle || !target) return;

  let startY = 0;
  let currentY = 0;

  handle.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  handle.addEventListener('touchmove', (e) => {
    currentY = e.touches[0].clientY;
  }, { passive: true });

  handle.addEventListener('touchend', () => {
    const diff = startY - currentY;
    if (Math.abs(diff) < 30) return; // Evita cliques acidentais

    if (diff > 50) { // Swipe UP
      target.classList.add(activeClass);
    } else if (diff < -50) { // Swipe DOWN
      target.classList.remove(activeClass);
    }
  });

  // Clique simples também funciona como fallback
  handle.onclick = () => target.classList.toggle(activeClass);
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  
  // Inicializa Gestos Mobile
  initSwipe('sheet-handle', 'public-sheet', 'drawer-active');
  initSwipe('admin-handle', 'admin-panel', 'admin-active');

  // Listeners de Login
  authForm.onsubmit = handleLogin;
  document.getElementById('login-trigger').onclick = () => authOverlay.classList.remove('hidden');
  authOverlay.onclick = (e) => { if (e.target === authOverlay) authOverlay.classList.add('hidden'); };
  
  // Media & Upload
  const dropzone = document.getElementById('photo-dropzone');
  const fileInput = document.getElementById('gc-photo-input');
  if (dropzone && fileInput) {
    dropzone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const preview = document.getElementById('photo-preview');
        const placeholder = document.getElementById('photo-placeholder');
        const reader = new FileReader();
        reader.onload = (event) => {
          preview.src = event.target.result;
          preview.classList.remove('hidden');
          placeholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
      }
    };
  }

  // Busca e Autopreenchimento
  const latField = document.getElementById('gc-lat');
  const lngField = document.getElementById('gc-lng');
  if (latField && lngField) {
    latField.onblur = handleAutoFill;
    lngField.onblur = handleAutoFill;
  }

  const publicSearch = document.getElementById('public-search');
  if (publicSearch) {
    publicSearch.oninput = (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = State.globalGCs.filter(gc => 
        gc.nome.toLowerCase().includes(term) || 
        gc.bairro.toLowerCase().includes(term)
      );
      renderPublicSheet(filtered);
      renderGCMarkers(filtered);
    };
  }

  supabase?.auth.onAuthStateChange((event, session) => updateUI(session));
});

window.signOut = async () => { await supabase?.auth.signOut(); window.location.reload(); };
