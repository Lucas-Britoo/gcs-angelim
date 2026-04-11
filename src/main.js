import L from 'leaflet';
import { renderDashboard } from './admin-dashboard.js';

/**
 * Utilitário de Segurança: Sanitização rigorosa via DOM TextNode
 * Evita XSS forçando qualquer string para texto plano antes de inserir no DOM.
 */
export function sanitize(str) {
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
let globalGCs = []; // Guarda a lista pra barra de pesquisa
let hasFetchedInitialData = false; // Flag para bloquear dupla chamada

function initMap() {
  try {
    // Coordenadas centrais padrão Parnaíba (PI)
    map = L.map('map').setView([-2.909, -41.767], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    
    markersLayer.addTo(map);

    // Botão de Localização (GPS)
    const gpsControl = L.control({ position: 'bottomright' });
    gpsControl.onAdd = function() {
      const btn = L.DomUtil.create('div', 'mb-24 md:mb-2 mr-2 pointer-events-auto');
      btn.innerHTML = `<button class="bg-white text-brand-dark p-3.5 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:bg-gray-50 active:scale-95 transition-all border border-gray-100" title="Ver Minha Localização" onclick="window.locateUser()"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 18A6 6 0 1012 6a6 6 0 000 12z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 22v-4M12 2v4M22 12h-4M2 12h4"></path></svg></button>`;
      return btn;
    };
    gpsControl.addTo(map);

    window.locateUser = () => {
      if(userLocation) {
        map.flyTo([userLocation.lat, userLocation.lng], 15, { animate: true, duration: 1 });
      } else {
        showError("Carregando sua localização ou permissão de GPS negada.");
      }
    };

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
    // Sanitizando todos os campos estendidos
    const name = sanitize(gc.nome);
    const dia = sanitize(gc.dia);
    const time = sanitize(gc.horario);
    const bairro = sanitize(gc.bairro);
    const endereco = sanitize(gc.endereco);
    const leader = sanitize(gc.lider);
    const contato = sanitize(gc.contato);
    const obs = gc.obs ? sanitize(gc.obs) : '';
    
    let coords = [];
    try {
      if (gc.lat === null || gc.lng === null) throw new Error(); // Ex. GC Online
      coords = [parseFloat(gc.lat), parseFloat(gc.lng)];
      if (isNaN(coords[0]) || isNaN(coords[1])) throw new Error();
    } catch(e) {
      return; // Pula marker inválido (ex: GCs via Meet sem lat/lng)
    }

    let distanceText = '';
    if (userLocation) {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, coords[0], coords[1]);
      distanceText = `<p class="text-xs text-brand-accent bg-gray-100 rounded px-2 py-1 inline-flex items-center shadow-sm w-fit mt-1"><svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> <b>${dist.toFixed(1)} km</b> distante</p>`;
    }

    const navUrl = sanitize(`https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}`);
    const wppLink = `https://wa.me/55${contato.replace(/\D/g, "")}`;
    const wppMsg = encodeURIComponent(`Olá! Vi o ${name} no Mapa Angelim e tenho interesse em participar de um encontro. Como faço?`);
    const joinWppLink = `${wppLink}?text=${wppMsg}`;

    // Construção segura premium google maps style com campos novos
    const popupContent = `
      <div class="custom-popup min-w-[240px]">
        <div class="bg-brand-dark p-3 rounded-t-2xl border-b border-brand-accent">
          <h3 class="font-bold text-base text-white leading-tight uppercase tracking-tight">${name}</h3>
          ${distanceText}
        </div>
        <div class="px-4 py-3 bg-white rounded-b-2xl">
          <div class="flex flex-col gap-1.5 mb-3 text-[13px]">
            
            <p class="text-gray-800 leading-tight">
              <span class="font-bold text-gray-400 block text-[10px] uppercase tracking-widest mb-0.5">Quando</span> 
              ${gc.id === 26 ? `<strong class="text-brand-dark font-black">Qua</strong> 19h30 &nbsp;&bull;&nbsp; <strong class="text-brand-dark font-black">Sáb</strong> 18h &nbsp;&bull;&nbsp; <strong class="text-brand-dark font-black">Dom</strong> 10h e 18h` : `${dia}, às ${time}`}
            </p>

            <p class="text-gray-800 leading-tight mt-1">
              <span class="font-bold text-gray-400 block text-[10px] uppercase tracking-widest mb-0.5">Onde</span> 
              <span class="font-semibold text-brand-dark">${bairro}</span><br>
              <span class="text-gray-500 italic">${endereco}</span>
            </p>

            <p class="text-gray-800 leading-tight mt-1">
              <span class="font-bold text-gray-400 block text-[10px] uppercase tracking-widest mb-0.5">Liderança</span> 
              ${leader}
            </p>
            
            ${contato && contato !== '-' ? `
            <div class="flex flex-col gap-2 mt-3">
              <a href="${joinWppLink}" target="_blank" class="w-full flex items-center justify-center bg-green-500 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-green-600 transition-all shadow-md active:scale-95 uppercase tracking-wide">
                 <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.964 9.964 0 001.333 4.993L2 22l5.233-1.237a9.994 9.994 0 004.779 1.217h.004c5.505 0 9.988-4.478 9.989-9.984 0-2.669-1.037-5.176-2.922-7.062A9.935 9.935 0 0012.012 2zm5.796 14.34c-.241.677-1.192 1.3-1.637 1.339-.427.039-1.272.183-3.64-1.393-2.844-1.894-4.664-5.006-4.805-5.197-.139-.193-1.147-1.545-1.147-2.946 0-1.402.723-2.096.979-2.366.255-.269.554-.338.735-.338.181 0 .363.003.521.01.168.007.391-.065.611.468.225.545.728 1.782.793 1.916.064.135.105.293.023.456-.081.161-.122.256-.242.39-.12.135-.251.29-.36.402-.121.121-.249.255-.109.497.139.24 .618.99 1.296 1.597.876.784 1.6026 1.028 1.843 1.15.241.12.383.099.525-.065.143-.162.617-.714.782-.96.164-.244.327-.202.551-.12.224.081 1.416.666 1.658.788.242.12.404.181.463.282.059.101.059.585-.182 1.261z"/></svg>
                Quero Participar
              </a>
              <a href="${navUrl}" target="_blank" rel="noopener noreferrer" class="w-full flex items-center justify-center border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all active:scale-95">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7l6-3 5.447 2.724A1 1 0 0121 7.618v10.764a1 1 0 01-1.447.894L15 17l-6 3z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7v13M15 4v13"></path></svg>
                VER NO MAPA
              </a>
            </div>` : ''}

          </div>
        </div>
      </div>
    `;

    // Ícone Premium Customizado com Logo
    const brandIcon = L.divIcon({
      className: 'bg-transparent border-0',
      html: `<div class="w-11 h-11 bg-brand-dark rounded-full border-2 border-white shadow-xl flex items-center justify-center overflow-hidden active:scale-90 transition-transform"><img src="/logo.svg" class="w-10 h-10 object-cover mt-0.5 ml-0.5"></div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22]
    });

    const marker = L.marker(coords, { icon: brandIcon }).bindPopup(popupContent);
    gc._leafletMarker = marker; // Salvando referência para a Pesquisa
    marker.addTo(markersLayer);
  });
}

/**
 * Utilitário de Status Online/Offline
 */
function updateOnlineStatus() {
  const statusEl = document.getElementById('online-status');
  if(!statusEl) return;

  if (navigator.onLine) {
    statusEl.classList.remove('bg-gray-400', 'shadow-none');
    statusEl.classList.add('bg-green-500', 'shadow-[0_0_8px_rgba(34,197,94,0.6)]');
    statusEl.title = "Sistema Online";
  } else {
    statusEl.classList.remove('bg-green-500', 'shadow-[0_0_8px_rgba(34,197,94,0.6)]');
    statusEl.classList.add('bg-gray-400', 'shadow-none');
    statusEl.title = "Sistema Offline (Modo Cache)";
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
/**
 * Motor de Busca da Barra Superior
 */
function setUpSearch() {
  const input = document.getElementById('search-input');
  const resultsBox = document.getElementById('search-results');
  if(!input || !resultsBox) return;

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !resultsBox.contains(e.target)) resultsBox.classList.add('hidden');
  });

  let debounceTimer;

  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const term = e.target.value.toLowerCase().trim();
      if (term.length < 2) {
        resultsBox.classList.add('hidden');
        return;
      }

      const filtered = globalGCs.filter(gc => {
      const nomeSafe = gc.nome ? gc.nome.toLowerCase() : '';
      const bairroSafe = gc.bairro ? gc.bairro.toLowerCase() : '';
      const liderSafe = gc.lider ? gc.lider.toLowerCase() : '';
      return nomeSafe.includes(term) || bairroSafe.includes(term) || liderSafe.includes(term);
    });

    if (filtered.length > 0) {
      resultsBox.innerHTML = filtered.map(gc => {
        return `<li class="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors" data-id="${gc.id}">
          <strong class="block text-brand-dark">${sanitize(gc.nome)}</strong>
          <span class="text-xs text-gray-500">${sanitize(gc.bairro)} • Líder: ${sanitize(gc.lider)}</span>
        </li>`;
      }).join('');
      resultsBox.classList.remove('hidden');

      resultsBox.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
          const id = parseInt(li.getAttribute('data-id'));
          const targetGC = globalGCs.find(g => g.id === id);
          if(targetGC && targetGC.lat && targetGC.lng && targetGC._leafletMarker) {
            map.flyTo([parseFloat(targetGC.lat), parseFloat(targetGC.lng)], 16, { duration: 1.2 });
            setTimeout(() => targetGC._leafletMarker.openPopup(), 1200);
          } else if (targetGC && !targetGC.lat) {
            showError("Este GC é Online. Não possui localização no mapa.");
          }
          resultsBox.classList.add('hidden');
          input.value = '';
        });
      });
    } else {
      resultsBox.innerHTML = `<li class="px-4 py-3 text-gray-400 text-xs text-center border-none">Nenhum banco de dados ou local encontrado.</li>`;
      resultsBox.classList.remove('hidden');
    }
    }, 250);
  });
}

/**
 * Fetch Data via Proxy Netlify
 */
async function fetchGCs(forceSync = false) {
  // Evita carregar duas vezes (GPS Boot vs Identity Boot)
  if (hasFetchedInitialData && !forceSync) return;
  hasFetchedInitialData = true;

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
      globalGCs = data; // Guarda pro auto-complete
      renderGCMarkers(data);
      setUpSearch();
      renderPublicSheet(data);
    }
  } catch (error) {
    console.error("Fetch falhou", error);
    showError("Erro ao carregar os dados dos GCs.");
  }
}

/**
 * Renderiza Gaveta Pública de GCs
 */
function renderPublicSheet(gcs) {
  const container = document.getElementById('public-gc-list');
  const sheet = document.getElementById('public-sheet');
  const handle = document.getElementById('sheet-handle');
  if(!container || !sheet) return;

  let isSheetOpen = false;

  const toggleSheet = (open) => {
    isSheetOpen = open;
    sheet.style.transform = ''; // Limpa rastros de gesto inline
    if(isSheetOpen) {
      sheet.classList.remove('translate-y-[calc(100%-55px)]');
      sheet.classList.add('translate-y-0');
    } else {
      sheet.classList.add('translate-y-[calc(100%-55px)]');
      sheet.classList.remove('translate-y-0');
    }
  };

  handle.addEventListener('click', () => toggleSheet(!isSheetOpen));

  // 📱 Injeção de Gestos Físicos Nativos (Arrastar Tela)
  let startY = 0, currentY = 0;
  handle.addEventListener('touchstart', (e) => { 
    startY = e.touches[0].clientY; 
    sheet.style.transition = 'none'; // Corta engine de animação CSS temporariamente
  }, {passive: true});
  
  handle.addEventListener('touchmove', (e) => {
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if(diff > 0 && isSheetOpen) sheet.style.transform = `translateY(${diff}px)`; // Empurrando pra baixo
    else if(diff < 0 && !isSheetOpen) sheet.style.transform = `translateY(calc(100% - 55px + ${diff}px))`; // Puxando pra cima
  }, {passive: true});
  
  handle.addEventListener('touchend', () => {
    sheet.style.transition = ''; // Libera o CSS de volta
    const diff = currentY - startY;
    if (diff > 50 && isSheetOpen) toggleSheet(false);
    else if (diff < -50 && !isSheetOpen) toggleSheet(true);
    else toggleSheet(isSheetOpen); // Se toque acidental, retrocede estado
  });

  const listHtml = gcs.map(gc => {
    return `<div class="gc-card bg-white border text-left border-gray-100 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow active:bg-gray-50 cursor-pointer" data-id="${gc.id}">
        <h4 class="font-black text-brand-dark uppercase tracking-tight text-[12px] mb-1 drop-shadow-sm">${sanitize(gc.nome)}</h4>
        <p class="text-[11px] text-gray-500 line-clamp-1 mb-1 font-semibold">${sanitize(gc.bairro)}</p>
        <p class="text-[10px] text-gray-400 capitalize"><span class="font-bold text-gray-300 uppercase tracking-widest">Líder: </span> ${sanitize(gc.lider)}</p>
      </div>`;
  }).join('');

  container.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-1 gap-3">${listHtml}</div>`;

  // Adicionando evento de forma segura (CSP Compliant) sem usar onclick no html
  const cards = container.querySelectorAll('.gc-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.getAttribute('data-id'));
      const target = globalGCs.find(g => g.id === id);
      
      if(target && target._leafletMarker && target.lat) {
        if(window.innerWidth < 768) {
          isSheetOpen = false;
          sheet.classList.add('translate-y-[calc(100%-55px)]');
          sheet.classList.remove('translate-y-0');
        }
        map.flyTo([parseFloat(target.lat), parseFloat(target.lng)], 16, { duration: 1.2 });
        setTimeout(() => target._leafletMarker.openPopup(), 1200);
      } else {
        showError("Este local não possui coordenada física no mapa.");
      }
    });
  });
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
        // Renderizar Dashboard em vez de lista simples
        renderDashboard(globalGCs, adminContent);
        
        // Re-fetch points forçando atualização ao logar
        fetchGCs(true);
      } else if (isEditor) {
        html += `<div class="mt-4 p-4 bg-gray-100 rounded-md border border-gray-200">
          <p class="text-xs text-gray-500">Permissão de Editor ativa. Apenas modificações textuais permitidas.</p>
        </div>`;
      }
      
      adminContent.innerHTML = html; // Usamos variáveis seguras e lógica controlada

      // Re-fetch points forçando atualização ao logar
      fetchGCs(true);
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
  console.log("App v1.2.1 - DOM Loaded (Security Patch)");
  
  // Inicializa monitor de rede
  updateOnlineStatus();

  // Inicializa mapa
  initMap();

  // Lógica de Dark Mode
  const modeToggle = document.getElementById('dark-mode-toggle');
  const moon = document.getElementById('moon-icon');
  const sun = document.getElementById('sun-icon');
  
  modeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    moon.classList.toggle('hidden', isDark);
    sun.classList.toggle('hidden', !isDark);
    
    // Troca o tile do mapa se ele existir
    if (map) {
      map.eachLayer(layer => {
        if(layer._url && layer._url.includes('basemaps')) {
          map.removeLayer(layer);
        } else if (layer._url && layer._url.includes('openstreetmap')) {
            map.removeLayer(layer);
        }
      });
      const newUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      
      L.tileLayer(newUrl, {
        maxZoom: 19,
        attribution: isDark ? '&copy; CartoDB' : '&copy; OpenStreetMap'
      }).addTo(map);
    }
  });

  // Registro do Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').then((reg) => {
        console.log('SW registration successful with scope: ', reg.scope);
      }).catch((err) => {
        console.warn('SW registration failed: ', err);
      });
    });
  }

  // Animação de entrada do Admin Panel (Movido para cá devido ao CSP)
  const adminPanel = document.getElementById('admin-panel');
  if (adminPanel) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('flex')) {
          setTimeout(() => mutation.target.classList.remove('translate-y-full'), 50);
        } else {
          mutation.target.classList.add('translate-y-full');
        }
      });
    });
    observer.observe(adminPanel, { attributes: true, attributeFilter: ['class'] });
  }

  // Netlify Identity Handlers
  if (window.netlifyIdentity) {
    console.log("Netlify Identity Widget detectado.");
    window.netlifyIdentity.init();
    
    // Listener de clique para o botão de Login (Cadeado)
    const loginTrigger = document.getElementById('login-trigger');
    if (loginTrigger) {
      loginTrigger.addEventListener('click', () => {
        console.log("Abrindo Modal de Login...");
        window.netlifyIdentity.open('login');
      });
    }

    window.netlifyIdentity.on("init", user => {
      console.log("Identity Initialized", user ? "User: " + user.email : "No User");
      handleAuthChange(user);
    });
    window.netlifyIdentity.on("login", user => {
      console.log("Login Success", user.email);
      window.netlifyIdentity.close();
      handleAuthChange(user);
    });
    window.netlifyIdentity.on("logout", () => {
      console.log("Logout Event");
      handleAuthChange(null);
    });
  } else {
    console.warn("Netlify Identity Widget não encontrado no window.");
  }
});
