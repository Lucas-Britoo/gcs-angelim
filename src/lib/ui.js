/**
 * UI Module - Manipulação do DOM e componentes visuais
 * Princípio SRP: apenas responsabilidades de UI
 */

import { sanitize, triggerHaptic, renderGCThumb, safeStringify } from './utils.js';

const TOAST_CONTAINER_ID = 'toast-container';
const GC_LIST_CONTAINER_ID = 'public-gc-list';

export function showToast(message, type = 'error') {
  const container = document.getElementById(TOAST_CONTAINER_ID);
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

export function renderLoadingSkeletons() {
  const container = document.getElementById(GC_LIST_CONTAINER_ID);
  if (!container) return;
  
  container.innerHTML = [1,2,3,4].map(() => `
    <div class="bg-white/50 rounded-3xl p-4 border border-gray-100 flex gap-4 animate-pulse">
      <div class="w-16 h-16 skeleton rounded-2xl flex-shrink-0"></div>
      <div class="flex-1 space-y-3">
        <div class="h-4 skeleton w-3/4"></div>
        <div class="h-3 skeleton w-1/2"></div>
      </div>
    </div>
  `).join('');
}

export function renderGrowthGroupList(growthGroups, onGroupClick) {
  const container = document.getElementById(GC_LIST_CONTAINER_ID);
  if (!container) return;
  
  if (!growthGroups?.length) {
    container.innerHTML = `<div class="text-center py-20"><p class="text-gray-400 text-sm">Nenhum Grupo de Crescimento encontrado.</p></div>`;
    return;
  }

  container.innerHTML = growthGroups.map(gc => {
    return `
      <div class="bg-white rounded-3xl p-4 border border-gray-100 flex gap-4 hover:shadow-md transition-shadow active:scale-[0.98] transition-all cursor-pointer metric-card" data-id="${gc.id}">
        <div class="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
          ${renderGCThumb(gc)}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start mb-1">
            <h4 class="font-black text-gray-900 text-sm truncate uppercase tracking-tight">${sanitize(gc.nome)}</h4>
            <span class="text-[8px] font-bold bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full uppercase truncate">${sanitize(gc.bairro)}</span>
          </div>
          <p class="text-[10px] text-gray-500 font-semibold mb-1">${sanitize(gc.dia_semana || '')}, ${sanitize(gc.horario || '')}</p>
          ${gc.lider ? `<p class="text-[9px] text-brand-dark font-medium mb-2">Líder: ${sanitize(gc.lider)}</p>` : ''}
          <div class="flex gap-2 flex-wrap">
            <button data-action="directions" data-lat="${gc.lat}" data-lng="${gc.lng}" class="flex-1 bg-gray-50 text-gray-600 py-2 rounded-xl text-[9px] font-black uppercase text-center active:bg-gray-100 transition-all min-w-[80px]">Rotas 🚗</button>
            <button data-action="share" data-group='${safeStringify(gc).replace(/'/g, "&#39;")}' class="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl text-[9px] font-black uppercase text-center active:bg-blue-100 transition-all min-w-[80px]">Compartilhar 📤</button>
            <a href="https://wa.me/55${(gc.contato || '').replace(/\D/g, '')}" target="_blank" class="flex-1 bg-green-50 text-green-600 py-2 rounded-xl text-[9px] font-black uppercase text-center active:bg-green-100 transition-all flex items-center justify-center gap-1 min-w-[80px]">Zap 💬</a>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  if (onGroupClick) {
    setupListEventListeners(container, onGroupClick);
  }
}

function setupListEventListeners(container, onGroupClick) {
  container.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    
    triggerHaptic();
    const card = btn.closest('[data-id]');
    const groupId = card?.dataset.id;
    
    if (groupId && onGroupClick) {
      onGroupClick(groupId);
    }
  });
}

export function showErrorState(message) {
  const container = document.getElementById(GC_LIST_CONTAINER_ID);
  if (container) {
    container.innerHTML = `
      <div class="text-center py-8 px-4">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p class="text-red-500 font-semibold text-sm">${message}</p>
      </div>
    `;
  }
}

export function getPopupHtml(gc) {
  const thumbHtml = renderGCThumb(gc);
  return `
    <div class="p-0 overflow-hidden rounded-3xl bg-white">
      <div class="w-full h-24 bg-gray-100 overflow-hidden">
        ${thumbHtml}
      </div>
      <div class="p-5">
        <span class="text-[9px] font-black uppercase tracking-widest text-brand-dark opacity-60">${sanitize(gc.bairro) || 'Sem Bairro'}</span>
        <h3 class="text-base font-black text-gray-900 leading-tight mb-1">${sanitize(gc.nome)}</h3>
        ${gc.lider ? `<p class="text-[10px] text-gray-500 font-medium mb-1">Líder: ${sanitize(gc.lider)}</p>` : ''}
        ${gc.contato ? `<p class="text-[10px] text-gray-400 mb-3">Contato: ${sanitize(gc.contato)}</p>` : ''}
        <div class="flex flex-col gap-2">
          <a href="https://wa.me/55${(gc.contato || '').replace(/\D/g, '')}" target="_blank" class="w-full bg-green-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase text-center shadow-lg active:scale-95 transition-all">Quero Participar</a>
          <button onclick="window.openDirections(${gc.lat}, ${gc.lng})" class="w-full border border-gray-200 text-gray-500 py-2.5 rounded-xl text-[10px] font-black uppercase text-center active:bg-gray-50 transition-all font-sans">Como Chegar 🚗</button>
        </div>
      </div>
    </div>
  `;
}