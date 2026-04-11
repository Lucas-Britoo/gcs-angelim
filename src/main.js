import L from 'leaflet';
import { supabase } from './lib/supabase.js';
import { renderDashboard } from './admin-dashboard.js';

/**
 * Utilitário de Segurança: Sanitização rigorosa via DOM TextNode
 */
export function sanitize(str) {
  if (!str) return '';
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

/**
 * Sistema de Feedback Visual (Toasts)
 */
function showToast(message, type = 'error') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-animate px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm flex items-center gap-3 w-full max-w-sm mx-auto pointer-events-auto border border-white/20 transition-all ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  }`;
  
  const icon = type === 'success' 
    ? `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>`
    : `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Estado Global App
let map = null;
let userLocation = null;
let markersLayer = new L.LayerGroup();
let globalGCs = []; 
let hasFetchedInitialData = false;

/**
 * Fórmula de Haversine
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

function initMap() {
  try {
    map = L.map('map').setView([-2.909, -41.767], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    markersLayer.addTo(map);

    const gpsControl = L.control({ position: 'bottomright' });
    gpsControl.onAdd = () => {
      const btn = L.DomUtil.create('div', 'mb-24 md:mb-2 mr-2 pointer-events-auto');
      btn.innerHTML = `<button class="bg-white text-brand-dark p-3.5 rounded-full shadow-lg border border-gray-100 active:scale-95 transition-all" title="Ver Localização"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 18A6 6 0 1012 6a6 6 0 000 12z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 22v-4M12 2v4M22 12h-4M2 12h4"></path></svg></button>`;
      btn.onclick = () => window.locateUser();
      return btn;
    };
    gpsControl.addTo(map);

    window.locateUser = () => {
      if(userLocation) map.flyTo([userLocation.lat, userLocation.lng], 15);
      else showToast("Aguardando coordenadas do GPS...");
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          L.circleMarker([userLocation.lat, userLocation.lng], { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.5, radius: 8 }).addTo(map).bindPopup("Você").openPopup();
          map.setView([userLocation.lat, userLocation.lng], 13);
          fetchGCs();
        },
        () => fetchGCs()
      );
    } else fetchGCs();
  } catch (err) { console.error(err); }
}

/**
 * Motor de Compressão de Imagens (Sênior)
 * Redimensiona para max 800px e comprime para JPEG 0.7
 */
async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max = 800;

        if (width > height) {
          if (width > max) { height *= max / width; width = max; }
        } else {
          if (height > max) { width *= max / height; height = max; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.7);
      };
    };
  });
}

/**
 * Função de Upload para Supabase Storage
 */
async function uploadPhoto(file, gcId) {
  // Comprime a imagem antes do upload
  const compressedFile = await compressImage(file);
  
  const fileExt = 'jpg'; // Forçamos JPG devido à compressão
  const fileName = `${gcId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `photos/${fileName}`;

  const { data, error } = await supabase.storage
    .from('gc-photos')
    .upload(filePath, compressedFile);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('gc-photos')
    .getPublicUrl(filePath);

  return publicUrl;
}


function renderGCMarkers(gcs) {
  markersLayer.clearLayers();
  gcs.forEach(gc => {
    const name = sanitize(gc.nome);
    if (!gc.lat || !gc.lng) return;
    const coords = [parseFloat(gc.lat), parseFloat(gc.lng)];

    let distanceText = '';
    if (userLocation) {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, coords[0], coords[1]);
      distanceText = `<p class="text-[10px] text-brand-accent bg-brand-dark/20 rounded px-2 py-1 inline-flex items-center mt-2 font-bold italic"><b>${dist.toFixed(1)} km</b> próximo</p>`;
    }

    const popupContent = getPopupStyle(gc, distanceText);

    const brandIcon = L.divIcon({
      className: 'bg-transparent border-0',
      html: `<div class="w-11 h-11 bg-brand-dark rounded-full border-2 border-white shadow-xl flex items-center justify-center overflow-hidden active:scale-90 transition-transform"><img src="/logo.svg" class="w-10 h-10 object-cover"></div>`,
      iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -22]
    });

    const marker = L.marker(coords, { icon: brandIcon }).bindPopup(popupContent);
    gc._marker = marker;
    marker.addTo(markersLayer);
  });
}

// Template de Popup Responsivo com Suporte a Foto
function getPopupStyle(gc, distanceHtml) {
  const name = sanitize(gc.nome);
  const wppLink = `https://wa.me/55${(gc.contato || "").replace(/\D/g, "")}`;
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${gc.lat},${gc.lng}`;

  return `
    <div class="custom-popup min-w-[240px] overflow-hidden rounded-[2rem] shadow-2xl border border-gray-100 bg-white relative">
      <!-- Botão Compartilhar -->
      <button onclick="window.shareGC('${name}', '${sanitize(gc.bairro)}')" class="absolute top-4 right-4 z-[10] bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/40 active:scale-90 transition-all border border-white/30">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
      </button>

      ${gc.foto_url ? `
        <div class="w-full h-32 bg-gray-100 relative">
          <img src="${gc.foto_url}" class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div class="absolute bottom-3 left-4">${distanceHtml}</div>
        </div>` : `
        <div class="bg-brand-dark p-4 pt-6">
          <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-2"><img src="/logo.svg" class="w-6 h-6"></div>
          ${distanceHtml}
        </div>`}
      
      <div class="p-5">
        <h3 class="font-black text-gray-900 text-base uppercase tracking-tight mb-3">${name}</h3>
        
        <div class="space-y-3 mb-5">
          <div class="flex items-start gap-2">
             <div class="w-5 h-5 rounded bg-gray-50 flex items-center justify-center shrink-0 mt-0.5"><svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
             <p class="text-[11px] text-gray-600 font-semibold">${sanitize(gc.dia)}, às ${sanitize(gc.horario)}</p>
          </div>
          <div class="flex items-start gap-2">
             <div class="w-5 h-5 rounded bg-gray-50 flex items-center justify-center shrink-0 mt-0.5"><svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>
             <p class="text-[11px] text-gray-600 font-semibold">${sanitize(gc.bairro)}<br><span class="text-[9px] text-gray-400 font-normal">${sanitize(gc.endereco)}</span></p>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <a href="${wppLink}" target="_blank" class="w-full bg-green-500 text-white py-3 rounded-xl text-[10px] font-black uppercase text-center shadow-lg shadow-green-200 active:scale-95 transition-all">Quero Participar</a>
          <a href="${navUrl}" target="_blank" class="w-full border border-gray-100 text-gray-400 py-3 rounded-xl text-[10px] font-black uppercase text-center active:bg-gray-50 transition-all">Ver no Maps</a>
        </div>
      </div>
    </div>`;
}


// Utilitário de Compartilhamento Nativo
window.shareGC = (name, bairro) => {
  const text = `📍 Conheça o ${name} em Parnaíba (Bairro ${bairro}).\nVeja no Mapa Angelim: https://gcs-angelim.netlify.app`;
  if (navigator.share) {
    navigator.share({ title: name, text, url: 'https://gcs-angelim.netlify.app' })
      .catch((err) => console.log('Share error', err));
  } else {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }
};

async function fetchGCs() {
  const CACHE_KEY = 'gcs_cache_v1';
  
  // 1. Tentar carregar do Cache primeiro (Instant Load)
  const cachedData = localStorage.getItem(CACHE_KEY);
  if (cachedData && !hasFetchedInitialData) {
    globalGCs = JSON.parse(cachedData);
    renderGCMarkers(globalGCs);
    renderPublicSheet(globalGCs);
  }

  try {
    const { data, error } = await supabase.from('gcs').select('*');
    if (error) throw error;

    // 2. Se mudou algo ou se não tinha cache, atualiza
    if (JSON.stringify(data) !== cachedData) {
      globalGCs = data;
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      renderGCMarkers(data);
      renderPublicSheet(data);
    }
    hasFetchedInitialData = true;
  } catch (err) {
    if (!cachedData) showToast("Falha ao sincronizar mapa");
  }
}


function renderPublicSheet(gcs) {
    const container = document.getElementById('public-gc-list');
    if(!container) return;
    container.innerHTML = gcs.map(gc => `<div class="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm mb-3">
        <h4 class="font-black text-xs uppercase text-brand-dark">${sanitize(gc.nome)}</h4>
        <p class="text-[10px] text-gray-400">${sanitize(gc.bairro)}</p>
    </div>`).join('');
}

/**
 * GESTÃO DE AUTENTICAÇÃO SUPABASE
 */
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authSwitchBtn = document.getElementById('auth-switch-btn');
const loader = document.getElementById('auth-btn-loader');

let isLoginMode = true;

function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  authTitle.textContent = isLoginMode ? 'Bem-vindo de volta' : 'Crie sua conta';
  authSubmitBtn.querySelector('span').textContent = isLoginMode ? 'Entrar' : 'Cadastrar';
  authSwitchBtn.innerHTML = isLoginMode 
    ? 'Ainda não tem conta? <span class="text-brand-dark underline font-bold">Cadastre-se</span>' 
    : 'Já possui uma conta? <span class="text-brand-dark underline font-bold">Entrar</span>';
  authForm.reset();
}

authSwitchBtn.addEventListener('click', toggleAuthMode);

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  authSubmitBtn.disabled = true;
  loader.classList.remove('hidden');

  try {
    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showToast("Login realizado com sucesso!", "success");
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      showToast("Conta criada! Verifique seu e-mail.", "success");
    }
  } catch (err) {
    showToast(err.message);
  } finally {
    authSubmitBtn.disabled = false;
    loader.classList.add('hidden');
  }
});

function updateUI(session) {
  const adminPanel = document.getElementById('admin-panel');
  const adminContent = document.getElementById('admin-content');

  if (session) {
    authOverlay.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    adminPanel.classList.remove('translate-y-full');
    renderDashboard(globalGCs, adminContent);
    fetchGCs(); // Garante dados atualizados
  } else {
    adminPanel.classList.add('hidden');
    adminPanel.classList.add('translate-y-full');
    // Se não estiver logado, mostramos o mapa em modo espectador ou forçamos login?
    // Vou forçar o overlay apenas se clicarem em 'Login' ou algo do tipo.
    // Mas conforme o PRD, vamos deixar o mapa visível e o login opcional ou sob demanda.
  }
}

// Botão de login flutuante
document.getElementById('login-trigger').addEventListener('click', () => {
  authOverlay.classList.remove('hidden');
});

// Listener de Estado de Autenticação
supabase.auth.onAuthStateChange((event, session) => {
  updateUI(session);
});

// Logout
window.signOut = async () => {
    await supabase.auth.signOut();
    showToast("Sessão encerrada", "success");
};

/**
 * ENGINE DO EDITOR DE GCs
 */
const gcEditor = document.getElementById('gc-editor');
const adminContent = document.getElementById('admin-content');
const photoInput = document.getElementById('gc-photo-input');
const photoPreview = document.getElementById('photo-preview');
const photoPlaceholder = document.getElementById('photo-placeholder');
const gcForm = document.getElementById('gc-form');

window.openGCEditor = (gc = null) => {
  gcEditor.classList.remove('hidden');
  adminContent.classList.add('hidden');
  gcForm.reset();
  photoPreview.classList.add('hidden');
  photoPlaceholder.classList.remove('hidden');

  if (gc) {
    document.getElementById('gc-edit-id').value = gc.id;
    document.getElementById('gc-name').value = gc.nome;
    document.getElementById('gc-bairro').value = gc.bairro;
    document.getElementById('gc-leader').value = gc.lider;
    if (gc.foto_url) {
      photoPreview.src = gc.foto_url;
      photoPreview.classList.remove('hidden');
      photoPlaceholder.classList.add('hidden');
    }
  } else {
    document.getElementById('gc-edit-id').value = '';
  }
};

document.getElementById('close-editor').onclick = () => {
  gcEditor.classList.add('hidden');
  adminContent.classList.remove('hidden');
};

document.getElementById('photo-dropzone').onclick = () => photoInput.click();

photoInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (re) => {
      photoPreview.src = re.target.result;
      photoPreview.classList.remove('hidden');
      photoPlaceholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }
};

gcForm.onsubmit = async (e) => {
  e.preventDefault();
  const id = document.getElementById('gc-edit-id').value || Date.now();
  const nome = document.getElementById('gc-name').value;
  const bairro = document.getElementById('gc-bairro').value;
  const lider = document.getElementById('gc-leader').value;
  const file = photoInput.files[0];

  const submitBtn = document.getElementById('save-gc-btn');
  const uploadStatus = document.getElementById('upload-status');
  
  submitBtn.disabled = true;
  submitBtn.textContent = "Salvando...";

  try {
    let foto_url = photoPreview.src.startsWith('http') ? photoPreview.src : null;

    if (file) {
      uploadStatus.classList.remove('hidden');
      foto_url = await uploadPhoto(file, id);
      uploadStatus.classList.add('hidden');
    }

    const { error } = await supabase.from('gcs').upsert({
      id, nome, bairro, lider, foto_url
    });

    if (error) throw error;

    showToast("Grupo salvo com sucesso!", "success");
    gcEditor.classList.add('hidden');
    adminContent.classList.remove('hidden');
    hasFetchedInitialData = false;
    fetchGCs(); // Atualiza mapa
  } catch (err) {
    showToast(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Salvar Alterações";
  }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  
  // Verifica sessão inicial
  supabase.auth.getSession().then(({ data: { session } }) => {
    updateUI(session);
  });
});



