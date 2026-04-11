/**
 * Admin Intelligence Module v1.7.0
 * Dashboards dinâmicos e gestão de dados otimizada.
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
    .slice(0, 4);

  const maxCount = topDistricts[0] ? topDistricts[0][1] : 1;

  container.innerHTML = `
    <!-- Cards de Resumo -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="bg-brand-dark text-white p-5 rounded-3xl shadow-xl shadow-brand-dark/10 relative overflow-hidden">
        <div class="absolute -right-2 -bottom-2 w-16 h-16 bg-white/5 rounded-full blur-xl"></div>
        <span class="block text-[9px] uppercase font-black text-brand-accent mb-1 tracking-widest opacity-80">Total GCs</span>
        <span class="text-4xl font-black">${totalGCs}</span>
      </div>
      <div class="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <span class="block text-[9px] uppercase font-black text-gray-400 mb-1 tracking-widest">Bairros</span>
        <span class="text-4xl font-black text-gray-900">${Object.keys(districtCounts).length}</span>
      </div>
    </div>

    <!-- Seção de Ranking com Barras Progressivas -->
    <div class="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-5">
      <h4 class="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Ranking de Densidade</h4>
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

      ${topDistricts.length > 0 ? `
      <div class="pt-4 border-t border-gray-50">
         <p class="text-[10px] text-gray-400 leading-relaxed italic">Dica: O bairro <b>${sanitize(topDistricts[0][0])}</b> lidera com <b>${percentFixed(topDistricts[0][1], totalGCs)}%</b> da rede total.</p>
      </div>` : ''}
    </div>

    <!-- Ações CRUD (Look Contemporâneo) -->
    <div class="grid grid-cols-2 gap-3 mt-6">
       <button id="dashboard-new-gc" class="bg-brand-dark text-white p-5 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95">
         <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
         <span class="text-[9px] font-black uppercase tracking-widest">Adicionar</span>
       </button>
       <button id="dashboard-list-gcs" class="bg-gray-50 border border-gray-100 text-gray-900 p-5 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95">
         <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
         <span class="text-[9px] font-black uppercase tracking-widest">Gerenciar</span>
       </button>
    </div>
  `;

  document.getElementById('dashboard-new-gc').onclick = () => window.openGCEditor();
  document.getElementById('dashboard-list-gcs').onclick = () => renderAdminTable(gcs, container);
}

function renderAdminTable(gcs, container) {
  container.innerHTML = `
    <div class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div class="flex items-center gap-2 mb-4">
        <button id="back-to-stats" class="p-2.5 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors border border-gray-100">
          <svg class="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <span class="font-black text-xs uppercase tracking-[0.15em] text-brand-dark">Gestão da Rede</span>
      </div>
      
      <div class="space-y-2">
        ${gcs.map(gc => `
          <div class="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-[1.25rem] shadow-sm hover:shadow-md transition-shadow group">
            <div class="min-w-0 pr-4">
              <p class="font-black text-[11px] text-gray-900 uppercase truncate">${sanitize(gc.nome)}</p>
              <p class="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">${sanitize(gc.bairro)}</p>
            </div>
            <button onclick="window.openGCEditor(${JSON.stringify(gc).replace(/"/g, '&quot;')})" class="w-9 h-9 flex items-center justify-center bg-gray-50 text-gray-400 rounded-full group-hover:bg-brand-dark group-hover:text-white transition-all">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('back-to-stats').onclick = () => renderDashboard(gcs, container);
}

function percentFixed(count, total) {
  if (total === 0) return 0;
  return ((count / total) * 100).toFixed(0);
}
