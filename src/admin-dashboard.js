/**
 * Unified Portal Management v1.9.0
 * Gestão integrada de métricas e edição em uma única tela panorâmica.
 */

import { sanitize } from './main.js';

export function renderDashboard(gcs, container) {
  if (!container || !gcs) return;

  const totalGCs = gcs.length;
  const districtCounts = {};
  gcs.forEach(gc => {
    const bairro = gc.bairro || 'Não Informado';
    districtCounts[bairro] = (districtCounts[bairro] || 0) + 1;
  });

  const topDistricts = Object.entries(districtCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const maxCount = topDistricts[0] ? topDistricts[0][1] : 1;

  container.innerHTML = `
    <!-- 🟢 SEÇÃO 1: MÉTRICAS E INSIGHTS -->
    <div class="grid grid-cols-2 gap-2 md:gap-3 mb-6">
      <div class="bg-brand-dark text-white p-4 md:p-5 rounded-3xl shadow-xl relative overflow-hidden">
        <span class="block text-[8px] md:text-[9px] uppercase font-black text-brand-accent mb-1 tracking-widest">Total GCs</span>
        <span class="text-3xl md:text-4xl font-black">${totalGCs}</span>
      </div>
      <div class="bg-white p-4 md:p-5 rounded-3xl border border-gray-100 shadow-sm">
        <span class="block text-[8px] md:text-[9px] uppercase font-black text-gray-400 mb-1 tracking-widest">Bairros</span>
        <span class="text-3xl md:text-4xl font-black text-gray-900">${Object.keys(districtCounts).length}</span>
      </div>
    </div>

    <!-- 📊 RANKING RÁPIDO -->
    <div class="bg-gray-50/50 p-4 md:p-5 rounded-3xl border border-gray-100 mb-8">
      <h4 class="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Densidade por Região</h4>
      <div class="space-y-4">
        ${topDistricts.map(([name, count]) => {
          const percent = (count / maxCount) * 100;
          return `
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-[11px] font-bold">
                <span class="text-gray-700">${sanitize(name)}</span>
                <span class="text-brand-dark opacity-60">${count}</span>
              </div>
              <div class="ranking-bar">
                <div class="ranking-bar-fill" style="width: ${percent}%"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 🛠️ SEÇÃO 2: GESTÃO INTEGRADA (O PORTAL) -->
    <div class="space-y-4">
      <div class="flex items-center justify-between px-2">
        <h4 class="text-[11px] font-black text-brand-dark uppercase tracking-widest">Gerenciar Grupos</h4>
        <button id="portal-new-gc" class="bg-brand-dark text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
          Novo GC
        </button>
      </div>

      <!-- Busca Interna do Admin -->
      <div class="relative">
        <input type="text" id="admin-search" placeholder="🔍 Buscar por nome ou bairro..." class="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3.5 text-xs font-semibold focus:ring-2 focus:ring-brand-dark outline-none shadow-sm capitalize">
      </div>

      <!-- Lista Scrollável de Edição -->
      <div id="admin-integrated-list" class="space-y-2 max-h-[400px] overflow-y-auto custom-scroll pr-1">
        ${renderPortalItems(gcs)}
      </div>
    </div>
  `;

  // --- LISTENERS ---
  const searchInput = document.getElementById('admin-search');
  searchInput.oninput = (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = gcs.filter(gc => 
      gc.nome.toLowerCase().includes(term) || 
      gc.bairro.toLowerCase().includes(term)
    );
    document.getElementById('admin-integrated-list').innerHTML = renderPortalItems(filtered);
  };

  document.getElementById('portal-new-gc').onclick = () => window.openGCEditor();
}

function renderPortalItems(gcs) {
  if (gcs.length === 0) return `<p class="text-center text-[10px] text-gray-400 py-10 uppercase font-bold tracking-widest">Nenhum resultado encontrado</p>`;

  return gcs.map(gc => `
    <div class="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-brand-dark transition-all group">
      <div class="min-w-0 pr-4">
        <p class="font-black text-xs text-gray-900 uppercase truncate">${sanitize(gc.nome)}</p>
        <div class="flex items-center gap-2 mt-0.5">
           <span class="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md uppercase">${sanitize(gc.bairro)}</span>
           ${gc.dia ? `<span class="text-[9px] font-medium text-gray-300">${sanitize(gc.dia)}</span>` : ''}
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button onclick="window.openGCEditor('${gc.id}')" 
          class="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-400 rounded-xl hover:bg-brand-dark hover:text-white transition-all shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
        </button>
      </div>
    </div>
  `).join('');
}

function percentFixed(count, total) {
  if (total === 0) return 0;
  return ((count / total) * 100).toFixed(0);
}
