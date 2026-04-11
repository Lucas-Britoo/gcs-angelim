/**
 * Painel de Inteligência Administrativa - Angelim PWA
 * Processa estatísticas dos GCs em tempo real para exibir no Dashboard.
 */

import { sanitize } from './main.js';

export function renderDashboard(gcs, container) {
  if (!container || !gcs) return;

  // 1. Processamento de Dados
  const totalGCs = gcs.length;
  
  // Contagem por Bairro
  const districtCounts = {};
  gcs.forEach(gc => {
    const bairro = gc.bairro || 'Não Informado';
    districtCounts[bairro] = (districtCounts[bairro] || 0) + 1;
  });

  const topDistricts = Object.entries(districtCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Contagem por Dia
  const dayCounts = {};
  gcs.forEach(gc => {
    const dia = gc.dia || 'Outros';
    dayCounts[dia] = (dayCounts[dia] || 0) + 1;
  });

  // 2. Templates de HTML (Dashboard)
  const statsHtml = `
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="bg-brand-dark text-white p-4 rounded-2xl shadow-sm border border-brand-accent/20">
        <span class="block text-[10px] uppercase font-bold text-brand-accent mb-1 tracking-widest">Total de GCs</span>
        <span class="text-3xl font-black">${totalGCs}</span>
      </div>
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <span class="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-widest">Bairros Ativos</span>
        <span class="text-3xl font-black text-gray-900">${Object.keys(districtCounts).length}</span>
      </div>
    </div>

    <div class="space-y-4">
      <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <h4 class="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Ranking por Bairros</h4>
        <div class="space-y-2">
          ${topDistricts.map(([name, count]) => `
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-gray-700">${sanitize(name)}</span>
              <span class="text-xs font-bold text-brand-dark bg-white px-2 py-0.5 rounded-full border border-gray-200">${count}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="bg-amber-50 p-4 rounded-2xl border border-amber-100">
          <h4 class="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1">Dica do Sistema</h4>
          <p class="text-[11px] text-amber-700 leading-tight">O bairro <strong>${sanitize(topDistricts[0][0])}</strong> concentra a maior parte da sua rede. Que tal focar no próximo GC em uma nova região?</p>
      </div>
    </div>

    <!-- Botões de Ação CRUD -->
    <div class="grid grid-cols-2 gap-3 mt-6">
       <button id="dashboard-new-gc" class="bg-white border-2 border-dashed border-gray-300 text-gray-400 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-brand-dark hover:text-brand-dark transition-all group">
         <svg class="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
         <span class="text-[10px] font-bold uppercase tracking-wider">Novo GC</span>
       </button>
       <button id="dashboard-list-gcs" class="bg-white border-2 border-dashed border-gray-300 text-gray-400 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-brand-dark hover:text-brand-dark transition-all group">
         <svg class="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
         <span class="text-[10px] font-bold uppercase tracking-wider">Gerenciar</span>
       </button>
    </div>
  `;

  container.innerHTML = statsHtml;

  // Listeners para os botões do Dashboard
  document.getElementById('dashboard-new-gc').onclick = () => window.openGCEditor();
  document.getElementById('dashboard-list-gcs').onclick = () => renderAdminTable(gcs, container);
}

/**
 * Renderiza a lista de GCs para escolha de edição (CRUD List)
 */
function renderAdminTable(gcs, container) {
  const listHtml = `
    <div class="space-y-3">
      <div class="flex items-center gap-2 mb-4">
        <button id="back-to-stats" class="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button>
        <span class="font-bold text-sm uppercase tracking-wider">Lista de Grupos</span>
      </div>
      
      ${gcs.map(gc => `
        <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm">
          <div class="min-w-0">
            <p class="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">${sanitize(gc.nome)}</p>
            <p class="text-[10px] text-gray-500">${sanitize(gc.bairro)}</p>
          </div>
          <button onclick="window.openGCEditor(${JSON.stringify(gc).replace(/"/g, '&quot;')})" class="p-2 text-brand-dark hover:bg-gray-50 rounded-lg transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          </button>
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = listHtml;
  document.getElementById('back-to-stats').onclick = () => renderDashboard(gcs, container);
}

  container.innerHTML = statsHtml;
}
