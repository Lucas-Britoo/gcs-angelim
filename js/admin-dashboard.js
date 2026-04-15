/**
 * Angelim PWA — Admin Dashboard
 * Painel integrado de métricas e gestão de GCs.
 * Vanilla JS — sem dependências externas.
 */

// sanitize definido localmente para evitar dependência circular com app.js
function sanitize(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

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
    <!-- Métricas -->
    <div class="metric-grid">
      <div class="metric-card metric-card--dark">
        <span class="metric-label">Total GCs</span>
        <span class="metric-value">${totalGCs}</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Bairros</span>
        <span class="metric-value">${Object.keys(districtCounts).length}</span>
      </div>
    </div>

    <!-- Ranking Densidade -->
    <div class="density-chart">
      <h4 class="density-chart__title">Densidade por Região</h4>
      <div class="density-chart__bars">
        ${topDistricts.map(([name, count]) => {
          const percent = (count / maxCount) * 100;
          return `
            <div class="density-item">
              <div class="density-item__header">
                <span class="density-item__name">${sanitize(name)}</span>
                <span class="density-item__count">${count}</span>
              </div>
              <div class="ranking-bar">
                <div class="ranking-bar-fill" style="width: ${percent}%"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Portal de Gestão -->
    <div class="portal-section">
      <div class="portal-header">
        <h4 class="portal-title">Gerenciar Grupos</h4>
        <button id="portal-new-gc" class="btn btn--dark btn--sm">
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"/>
          </svg>
          Novo GC
        </button>
      </div>

      <div class="portal-search-wrap">
        <input type="text" id="admin-search" placeholder="🔍 Buscar por nome ou bairro..." class="input-field input-field--sm">
      </div>

      <div id="admin-integrated-list" class="portal-list custom-scroll">
        ${renderPortalItems(gcs)}
      </div>
    </div>
  `;

  // Busca interna do admin com debounce
  let searchTimer;
  const searchInput = document.getElementById('admin-search');
  searchInput.oninput = (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const term = e.target.value.toLowerCase();
      const filtered = gcs.filter(gc =>
        gc.nome.toLowerCase().includes(term) ||
        gc.bairro.toLowerCase().includes(term)
      );
      document.getElementById('admin-integrated-list').innerHTML = renderPortalItems(filtered);
    }, 250);
  };

  document.getElementById('portal-new-gc').onclick = () => window.openGCEditor();
}

function renderPortalItems(gcs) {
  if (gcs.length === 0) {
    return `<p class="portal-empty">Nenhum resultado encontrado</p>`;
  }

  return gcs.map(gc => `
    <div class="portal-item">
      <div class="portal-item__info">
        <p class="portal-item__name">${sanitize(gc.nome)}</p>
        <div class="portal-item__meta">
          <span class="tag">${sanitize(gc.bairro)}</span>
          ${gc.dia ? `<span class="portal-item__day">${sanitize(gc.dia)}</span>` : ''}
        </div>
      </div>
      <div class="portal-item__actions">
        <button onclick="window.openGCEditor('${gc.id}')" class="icon-btn icon-btn--edit" aria-label="Editar">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          </svg>
        </button>
        <button onclick="window.deleteGC('${gc.id}')" class="icon-btn icon-btn--delete" aria-label="Deletar">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}
