/**
 * ANGELIM PWA v2.0.0 — Static Edition
 * Supabase CDN + window.L (Leaflet global) + Vanilla ES6+
 *
 * Melhorias vs v1.9.0:
 *  - Singleton Guard no fetchGCs (evita duplo fetch no boot)
 *  - Debounce 250ms na busca pública e no admin
 *  - CSS semântico (sem classes Tailwind no JS)
 */

import { supabase, isSupabaseConfigured } from './supabase-client.js';
import { renderDashboard } from './admin-dashboard.js';

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase não configurado. Edite js/supabase-client.js');
}

// ─── REALTIME ─────────────────────────────────────────────────────────────────
if (supabase) {
  supabase
    .channel('public:gcs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'gcs' }, () => {
      console.log('📡 Realtime: tabela gcs atualizada');
      fetchGCs(true);
    })
    .subscribe(status => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('⚠️ Erro no Realtime. Verifique se Replication está ativa no Supabase.');
      }
    });
}

// ─── ESTADO ───────────────────────────────────────────────────────────────────
const APP_CONFIG = {
  VERSION: '2.0.0',
  MAP_CENTER: [-2.909, -41.776],
  DEFAULT_ZOOM: 14,
  FOCUS_ZOOM: 16,
  CACHE_KEY: 'angelim_gcs_cache_v3',
};

const State = {
  map: null,
  markersLayer: null,
  userLocation: null,
  globalGCs: [],
  isFetching: false,   // Singleton guard — evita duplo fetch
  hasFetched: false,
  activeSession: null,
};

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────
function sanitize(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'error') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  const icon = type === 'success'
    ? `<svg class="toast__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>`
    : `<svg class="toast__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// ─── MAPA ─────────────────────────────────────────────────────────────────────
function initMap() {
  try {
    const L = window.L;
    State.map = L.map('map', { zoomControl: false })
      .setView(APP_CONFIG.MAP_CENTER, APP_CONFIG.DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(State.map);

    L.control.zoom({ position: 'bottomright' }).addTo(State.map);
    State.markersLayer = L.layerGroup().addTo(State.map);

    setupGPS();
    fetchGCs();
  } catch (err) {
    console.error('Erro ao iniciar o mapa:', err);
  }
}

function setupGPS() {
  if (!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      State.userLocation = { lat, lng };
      window.L.circleMarker([lat, lng], {
        color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.5, radius: 8,
      }).addTo(State.map).bindPopup('Você está aqui');
      State.map.setView([lat, lng], APP_CONFIG.DEFAULT_ZOOM);
    },
    () => console.warn('GPS negado ou indisponível'),
  );
}

function renderGCMarkers(gcs) {
  const L = window.L;
  State.markersLayer.clearLayers();
  gcs.forEach(gc => {
    if (!gc.lat || !gc.lng) return;
    const coords = [parseFloat(gc.lat), parseFloat(gc.lng)];
    const brandIcon = L.divIcon({
      className: '',
      html: `<div class="map-marker"><img src="./public/logo.svg" alt="GC"></div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    });
    const marker = L.marker(coords, { icon: brandIcon }).bindPopup(
      getPopupTemplate(gc),
      { maxWidth: 280, minWidth: 280, autoPanPadding: [100, 100], className: 'custom-popup' },
    );
    gc._marker = marker;
    marker.addTo(State.markersLayer);
  });
}

// ─── POPUP ────────────────────────────────────────────────────────────────────
function getPopupTemplate(gc) {
  const name    = sanitize(gc.nome);
  const wppLink = `https://wa.me/55${(gc.contato || '').replace(/\D/g, '')}`;
  return `
    <div class="popup-card">
      ${gc.foto_url
        ? `<img src="${gc.foto_url}" class="popup-card__img" alt="${name}">`
        : `<div class="popup-card__no-photo">Sem Foto</div>`}
      <div class="popup-card__body">
        <span class="popup-card__bairro">${sanitize(gc.bairro || 'Sem Bairro')}</span>
        <h3 class="popup-card__name">${name}</h3>
        <div class="popup-card__actions">
          <a href="${wppLink}" target="_blank" rel="noopener" class="btn btn--green btn--full">Quero Participar</a>
          <button onclick="window.openDirections(${gc.lat}, ${gc.lng})" class="btn btn--outline btn--full">Como Chegar 🚗</button>
        </div>
      </div>
    </div>`;
}

// ─── DIREÇÕES ─────────────────────────────────────────────────────────────────
window.openDirections = (lat, lng) => {
  const isIOS   = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const wazeUrl  = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  const appleUrl = `http://maps.apple.com/?daddr=${lat},${lng}`;
  const gMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  if (confirm('Deseja abrir no Waze?')) {
    window.open(wazeUrl, '_blank');
  } else if (isIOS && confirm('Deseja abrir no Apple Maps?')) {
    window.open(appleUrl, '_blank');
  } else {
    window.open(gMapsUrl, '_blank');
  }
};

// ─── SKELETONS ────────────────────────────────────────────────────────────────
function renderSkeletons() {
  const container = document.getElementById('public-gc-list');
  if (!container) return;
  container.innerHTML = Array(4).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-thumb"></div>
      <div class="skeleton-card__lines">
        <div class="skeleton skeleton-line skeleton-line--lg"></div>
        <div class="skeleton skeleton-line skeleton-line--sm"></div>
      </div>
    </div>
  `).join('');
}

// ─── FETCH GCS — com Singleton Guard ─────────────────────────────────────────
async function fetchGCs(forceRefresh = false) {
  if (State.isFetching) return; // ← Singleton: bloqueia duplo fetch
  State.isFetching = true;

  const cached = localStorage.getItem(APP_CONFIG.CACHE_KEY);

  // Exibe cache instantaneamente (se disponível) antes da chamada de rede
  if (cached && !State.hasFetched && !forceRefresh) {
    const cachedData = JSON.parse(cached);
    State.globalGCs = cachedData;
    renderGCMarkers(cachedData);
    renderPublicSheet(cachedData);
  } else if (!State.hasFetched) {
    renderSkeletons();
  }

  try {
    const { data, error } = await (
      supabase?.from('gcs').select('*').order('id', { ascending: true })
      ?? { data: null, error: { message: 'Supabase offline' } }
    );
    if (error) throw error;

    const fresh = JSON.stringify(data);
    if (fresh !== cached || forceRefresh) {
      State.globalGCs = data;
      localStorage.setItem(APP_CONFIG.CACHE_KEY, fresh);
      renderGCMarkers(data);
      renderPublicSheet(data);
      if (State.activeSession) {
        renderDashboard(data, document.getElementById('admin-content'));
      }
    }
    State.hasFetched = true;
  } catch (err) {
    console.error('Erro ao buscar GCs:', err);
    if (!State.hasFetched && !cached) {
      const list = document.getElementById('public-gc-list');
      if (list) list.innerHTML = `<p class="sheet-empty">Sem conexão. Verifique sua internet.</p>`;
    }
  } finally {
    State.isFetching = false;
  }
}

// ─── GAVETA PÚBLICA ───────────────────────────────────────────────────────────
function renderPublicSheet(gcs) {
  const container = document.getElementById('public-gc-list');
  if (!container) return;

  if (gcs.length === 0) {
    container.innerHTML = `<div class="sheet-empty-wrap"><p class="sheet-empty">Nenhum GC encontrado.</p></div>`;
    return;
  }

  container.innerHTML = gcs.map(gc => `
    <div class="gc-card" onclick="window.focusGC('${gc.id}')">
      <div class="gc-card__thumb">
        ${gc.foto_url
          ? `<img src="${gc.foto_url}" alt="${sanitize(gc.nome)}">`
          : `<div class="gc-card__initials">GC</div>`}
      </div>
      <div class="gc-card__info">
        <div class="gc-card__header">
          <h4 class="gc-card__name">${sanitize(gc.nome)}</h4>
          <span class="tag">${sanitize(gc.bairro)}</span>
        </div>
        <p class="gc-card__schedule">${sanitize(gc.dia)}, ${sanitize(gc.horario)}</p>
        <div class="gc-card__actions">
          <button onclick="event.stopPropagation(); window.openDirections(${gc.lat}, ${gc.lng})" class="btn btn--ghost btn--xs">Rotas 🚗</button>
          <a onclick="event.stopPropagation();" href="https://wa.me/55${(gc.contato || '').replace(/\D/g, '')}" target="_blank" rel="noopener" class="btn btn--green-ghost btn--xs">Zap 💬</a>
        </div>
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

// ─── CRUD: EDITOR ─────────────────────────────────────────────────────────────
window.openGCEditor = (idOrGc = null) => {
  const editor     = document.getElementById('gc-editor');
  const dashContent = document.getElementById('admin-content');
  const title      = document.getElementById('admin-title');

  let gc = null;
  if (idOrGc && (typeof idOrGc === 'string' || typeof idOrGc === 'number')) {
    gc = State.globalGCs.find(g => String(g.id) === String(idOrGc));
  } else {
    gc = idOrGc;
  }

  dashContent.classList.add('hidden');
  editor.classList.remove('hidden');
  title.textContent = gc ? 'Editando Grupo' : 'Novo Grupo';

  document.getElementById('gc-form').reset();
  document.getElementById('gc-edit-id').value  = gc?.id       ?? '';
  document.getElementById('gc-name').value     = gc?.nome     ?? '';
  document.getElementById('gc-bairro').value   = gc?.bairro   ?? '';
  document.getElementById('gc-leader').value   = gc?.lider    ?? '';
  document.getElementById('gc-dia').value      = gc?.dia      ?? '';
  document.getElementById('gc-horario').value  = gc?.horario  ?? '';
  document.getElementById('gc-contato').value  = gc?.contato  ?? '';
  document.getElementById('gc-address').value  = gc?.endereco ?? '';
  document.getElementById('gc-lat').value      = gc?.lat      ?? '';
  document.getElementById('gc-lng').value      = gc?.lng      ?? '';

  const preview     = document.getElementById('photo-preview');
  const placeholder = document.getElementById('photo-placeholder');
  if (gc?.foto_url) {
    preview.src = gc.foto_url;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }
};

function bindCloseEditor() {
  document.getElementById('close-editor').onclick = () => {
    document.getElementById('gc-editor').classList.add('hidden');
    document.getElementById('admin-content').classList.remove('hidden');
    document.getElementById('admin-title').textContent = 'Painel';
  };
}

// ─── AUTOFILL GEOGRÁFICO ──────────────────────────────────────────────────────
async function handleAutoFill() {
  const lat = document.getElementById('gc-lat').value.trim();
  const lng = document.getElementById('gc-lng').value.trim();
  if (lat && lng && lat.length > 5 && lng.length > 5) {
    try {
      showToast('Buscando endereço...', 'success');
      const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data.address) {
        const bairro   = data.address.suburb || data.address.neighbourhood || data.address.village || '';
        const road     = data.address.road || '';
        const houseNum = data.address.house_number || '';
        if (bairro) document.getElementById('gc-bairro').value = bairro;
        if (road)   document.getElementById('gc-address').value = `${road}${houseNum ? ', ' + houseNum : ''}`;
        showToast('Dados preenchidos!', 'success');
      }
    } catch (e) {
      console.error('Erro no AutoFill:', e);
    }
  }
}

// ─── UPLOAD DE FOTO ───────────────────────────────────────────────────────────
async function uploadPhoto(file) {
  if (!file || !supabase) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

  const { error } = await supabase.storage.from('gc-photos').upload(fileName, file);
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('gc-photos').getPublicUrl(fileName);
  return publicUrl;
}

// ─── DELETE GC ────────────────────────────────────────────────────────────────
window.deleteGC = async (id) => {
  if (!confirm('Tem certeza que deseja apagar este grupo permanentemente?')) return;
  try {
    const { error } = await supabase?.from('gcs').delete().eq('id', Number(id));
    if (error) throw error;
    localStorage.removeItem(APP_CONFIG.CACHE_KEY);
    showToast('Grupo removido!', 'success');
    fetchGCs(true);
  } catch (err) {
    showToast(`Erro ao apagar: ${err.message || 'Verifique sua conexão'}`);
    console.error(err);
  }
};

// ─── SALVAR GC ────────────────────────────────────────────────────────────────
function bindGCForm() {
  document.getElementById('gc-form').onsubmit = async (e) => {
    e.preventDefault();
    const id        = document.getElementById('gc-edit-id').value;
    const photoFile = document.getElementById('gc-photo-input').files[0];
    const loader    = document.getElementById('upload-status');

    try {
      let foto_url = null;
      if (photoFile) {
        loader.classList.remove('hidden');
        foto_url = await uploadPhoto(photoFile);
        loader.classList.add('hidden');
      }

      const gcData = {
        nome:     document.getElementById('gc-name').value,
        bairro:   document.getElementById('gc-bairro').value,
        lider:    document.getElementById('gc-leader').value,
        dia:      document.getElementById('gc-dia').value      || null,
        horario:  document.getElementById('gc-horario').value  || null,
        contato:  document.getElementById('gc-contato').value  || null,
        endereco: document.getElementById('gc-address').value  || null,
        lat:      document.getElementById('gc-lat').value      || null,
        lng:      document.getElementById('gc-lng').value      || null,
      };
      if (foto_url) gcData.foto_url = foto_url;

      const { error } = id
        ? await supabase?.from('gcs').update(gcData).eq('id', id)
        : await supabase?.from('gcs').insert([gcData]);
      if (error) throw error;

      localStorage.removeItem(APP_CONFIG.CACHE_KEY);
      showToast('Sincronizado com Sucesso!', 'success');
      document.getElementById('close-editor').click();
      setTimeout(() => fetchGCs(true), 500);
    } catch (err) {
      showToast(`Erro: ${err.message || 'Falha no processamento'}`);
      console.error(err);
      loader.classList.add('hidden');
    }
  };
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
// authOverlay e authForm são inicializados dentro do DOMContentLoaded
let authOverlay, authForm;

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const loader   = document.getElementById('auth-btn-loader');
  try {
    loader.classList.remove('hidden');
    const { error } = await (
      supabase?.auth.signInWithPassword({ email, password })
      ?? { error: 'Supabase offline' }
    );
    if (error) throw error;
    showToast('Acesso Autorizado', 'success');
    authOverlay.classList.add('hidden');
  } catch {
    showToast('Credenciais Inválidas');
  } finally {
    loader.classList.add('hidden');
  }
}

async function updateUI(session) {
  State.activeSession = session;
  const adminPanel   = document.getElementById('admin-panel');
  const loginTrigger = document.getElementById('login-trigger');

  if (session) {
    adminPanel.classList.remove('hidden');
    const initials = session.user.email.substring(0, 2).toUpperCase();
    loginTrigger.innerHTML = `<div class="user-avatar">${initials}</div>`;
    if (State.globalGCs.length === 0) {
      await fetchGCs();
    } else {
      renderDashboard(State.globalGCs, document.getElementById('admin-content'));
    }
  } else {
    adminPanel.classList.add('hidden');
    loginTrigger.innerHTML = `
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>`;
  }
}

window.signOut = async () => {
  await supabase?.auth.signOut();
  window.location.reload();
};

// ─── MOTOR DE GESTOS SWIPE ────────────────────────────────────────────────────
function initSwipe(handleId, targetId, activeClass) {
  const handle = document.getElementById(handleId);
  const target = document.getElementById(targetId);
  if (!handle || !target) return;

  let startY = 0, currentY = 0;
  handle.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  handle.addEventListener('touchmove',  e => { currentY = e.touches[0].clientY; }, { passive: true });
  handle.addEventListener('touchend', () => {
    const diff = startY - currentY;
    if (Math.abs(diff) < 30) return;
    if (diff > 50)       target.classList.add(activeClass);
    else if (diff < -50) target.classList.remove(activeClass);
  });
  handle.onclick = () => target.classList.toggle(activeClass);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Inicializa referências de DOM — seguro pois DOMContentLoaded garantiu o parse
  authOverlay = document.getElementById('auth-overlay');
  authForm    = document.getElementById('auth-form');

  // Vincula eventos que requerem DOM pronto
  bindCloseEditor();
  bindGCForm();

  initMap();
  initSwipe('sheet-handle', 'public-sheet', 'drawer-active');
  initSwipe('admin-handle', 'admin-panel', 'admin-active');

  // Auth
  authForm.onsubmit = handleLogin;
  document.getElementById('login-trigger').onclick = () => authOverlay.classList.remove('hidden');
  authOverlay.onclick = e => { if (e.target === authOverlay) authOverlay.classList.add('hidden'); };

  // Photo Upload
  const dropzone  = document.getElementById('photo-dropzone');
  const fileInput = document.getElementById('gc-photo-input');
  if (dropzone && fileInput) {
    dropzone.onclick = () => fileInput.click();
    fileInput.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const preview     = document.getElementById('photo-preview');
      const placeholder = document.getElementById('photo-placeholder');
      const reader      = new FileReader();
      reader.onload = ev => {
        preview.src = ev.target.result;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    };
  }

  // AutoFill Geográfico
  document.getElementById('gc-lat').onblur = handleAutoFill;
  document.getElementById('gc-lng').onblur = handleAutoFill;

  // Busca pública — debounce 250ms
  const publicSearch = document.getElementById('public-search');
  if (publicSearch) {
    publicSearch.addEventListener('input', debounce(e => {
      const term = e.target.value.toLowerCase();
      const filtered = State.globalGCs.filter(gc =>
        (gc.nome   || '').toLowerCase().includes(term) ||
        (gc.bairro || '').toLowerCase().includes(term),
      );
      renderPublicSheet(filtered);
      renderGCMarkers(filtered);
    }, 250));
  }

  // Auth state listener
  supabase?.auth.onAuthStateChange((event, session) => updateUI(session));
});
