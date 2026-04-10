import L from 'leaflet';

/**
 * Utilitário de Segurança: Sanitização rigorosa via DOM TextNode
 * Evita XSS forçando qualquer string para texto plano antes de inserir no DOM.
 */
function sanitize(str) {
  if (!str) return '';
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

/**
 * Função global genérica para exibir erros na UI sem vazar dados sensíveis
 */
function showError(message) {
  const statusEl = document.getElementById('app-status');
  const statusMsg = document.getElementById('app-status-message');
  if (statusEl && statusMsg) {
    statusMsg.textContent = message; // Seguro
    statusEl.classList.remove('hidden');
    setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 5000);
  }
}

/**
 * Fórmula de Haversine via Client-side
 * Calcula distância entre duas coordenadas em Kilômetros
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da terra em KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

// Estado Global App
let map = null;
let userLocation = null;
let markersLayer = new L.LayerGroup();

function initMap() {
  try {
    // Coordenadas centrais padrão (fallback)
    map = L.map('map').setView([-2.53, -44.30], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    
    markersLayer.addTo(map);

    // Tentar capturar geolocalização do usuário
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          // Marker do usuário
          L.circleMarker([userLocation.lat, userLocation.lng], {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.5,
            radius: 8
          }).addTo(map).bindPopup("Sua Localização").openPopup();
          
          map.setView([userLocation.lat, userLocation.lng], 13);
          
          fetchGCs(); // Busca apenas após ter o mapa (ou local)
        },
        (error) => {
          console.warn("Geolocalização negada ou falha. Mostrando mapa padrão.");
          fetchGCs();
        }
      );
    } else {
      fetchGCs();
    }
  } catch (error) {
    console.error(error); // Evita Information Disclosure pra UI
    showError("Erro ao inicializar o mapa interactivo.");
  }
}

/**
 * Renderezição segura dos cards
 */
function renderGCMarkers(gcs) {
  markersLayer.clearLayers();
  
  gcs.forEach(gc => {
    // Sanitizando todos os campos
    const name = sanitize(gc.nome);
    const leader = sanitize(gc.lider);
    const time = sanitize(gc.horario);
    let coords = [];
    
    try {
      coords = [parseFloat(gc.lat), parseFloat(gc.lng)];
      if (isNaN(coords[0]) || isNaN(coords[1])) throw new Error();
    } catch(e) {
      return; // Pula marker inválido
    }

    let distanceText = '';
    if (userLocation) {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, coords[0], coords[1]);
      distanceText = `<p class="text-sm mt-1 text-gray-500"><strong>Distância:</strong> ${dist.toFixed(1)} km</p>`;
    }

    const navUrl = sanitize(`https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}`);

    // Construção segura (usamos innerHTML apenas com variáveis já passadas pelo strict sanitize())
    const popupContent = `
      <div class="p-2 custom-popup min-w-[200px]">
        <h3 class="font-bold text-lg text-brand-dark mb-1">${name}</h3>
        <p class="text-sm text-gray-700"><strong>Líder:</strong> ${leader}</p>
        <p class="text-sm text-gray-700"><strong>Horário:</strong> ${time}</p>
        ${distanceText}
        <a href="${navUrl}" target="_blank" rel="noopener noreferrer" class="mt-3 block w-full text-center bg-brand text-white py-2 rounded-md font-semibold hover:bg-brand-accent transition-colors">
          Como Chegar
        </a>
      </div>
    `;

    L.marker(coords).addTo(markersLayer).bindPopup(popupContent);
  });
}

/**
 * Fetch Data via Proxy Netlify
 */
async function fetchGCs() {
  try {
    const defaultHeaders = {
      'Content-Type': 'application/json'
    };

    // Pega token da sessão se existir (Netlify Identity)
    const user = netlifyIdentity.currentUser();
    if (user && user.token) {
      defaultHeaders['Authorization'] = `Bearer ${user.token.access_token}`;
    }

    const res = await fetch('/.netlify/functions/get-gcs', {
      headers: defaultHeaders
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      renderGCMarkers(data);
    }
  } catch (error) {
    console.error("Fetch falhou", error);
    showError("Erro ao carregar os dados dos GCs.");
  }
}

/**
 * RBAC e Fluxo Netlify Identity
 */
function handleAuthChange(user) {
  const adminPanel = document.getElementById('admin-panel');
  const mapContainer = document.getElementById('map-container');
  const adminContent = document.getElementById('admin-content');

  if (user) {
    // Validar custom roles do JWT da Identity (app_metadata / user_metadata)
    // Atenção: Netlify Identity injeta roles em user.app_metadata.roles
    const roles = user.app_metadata?.roles || [];
    const isAdmin = roles.includes('admin');
    const isEditor = roles.includes('editor');

    if (isAdmin || isEditor) {
      adminPanel.classList.remove('hidden');
      adminPanel.classList.add('flex');
      // Reduz o tamanho do mapa em lg viewports
      mapContainer.classList.replace('w-full', 'md:w-[calc(100%-24rem)]');
      
      const roleName = isAdmin ? "Administrador" : "Editor";
      document.getElementById('admin-title').textContent = `Painel de Controle - ${roleName}`;
      
      // Sanitização básica só para garantir
      const emailSafe = sanitize(user.email);
      
      let html = `<p class="text-sm text-gray-700">Bem-vindo, <strong>${emailSafe}</strong>.</p>`;
      
      if (isAdmin) {
        html += `<div class="mt-4 p-4 bg-gray-100 rounded-md border border-gray-200">
          <p class="text-xs text-gray-500 mb-2">Permissões de Admin ativas. Ferramentas avançadas liberadas.</p>
          <button class="w-full bg-red-600 text-white text-sm py-2 rounded shadow hover:bg-red-700">Forçar Sincronização Dados</button>
        </div>`;
      } else if (isEditor) {
        html += `<div class="mt-4 p-4 bg-gray-100 rounded-md border border-gray-200">
          <p class="text-xs text-gray-500">Permissão de Editor ativa. Apenas modificações textuais permitidas.</p>
        </div>`;
      }
      
      adminContent.innerHTML = html; // Usamos variáveis seguras e lógica controlada

      // Re-fetch points passando o token nas headers
      fetchGCs();
    }
  } else {
    // Reset layout
    adminPanel.classList.add('hidden');
    adminPanel.classList.remove('flex');
    mapContainer.classList.replace('md:w-[calc(100%-24rem)]', 'w-full');
    adminContent.innerHTML = '';
    // Fetch anônimo
    fetchGCs();
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Inicializa mapa
  initMap();

  // Netlify Identity Handlers
  if (window.netlifyIdentity) {
    window.netlifyIdentity.on("init", user => handleAuthChange(user));
    window.netlifyIdentity.on("login", user => {
      window.netlifyIdentity.close();
      handleAuthChange(user);
    });
    window.netlifyIdentity.on("logout", () => handleAuthChange(null));
  }
});
