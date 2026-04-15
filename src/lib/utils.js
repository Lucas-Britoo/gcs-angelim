/**
 * Utils Module - Funções de utilities reutilizáveis
 * Princípio DRY: centraliza funções genéricas
 */

export function sanitize(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function triggerHaptic() {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

export function optimizeImage(url) {
  if (!url) return '';
  if (url.includes('supabase.storage')) {
    return `${url}?width=200&quality=80`;
  }
  return url;
}

export async function shareGrowthGroup(gc) {
  const shareData = {
    title: `GC ${gc.nome} - Angelim`,
    text: `Participe do Grupo de Crescimento "${gc.nome}" em ${gc.bairro}. ${gc.dia_semana} às ${gc.horario}.`,
    url: window.location.href
  };
  
  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      console.log('Compartilhamento cancelado');
    }
  } else {
    await navigator.clipboard.writeText(shareData.url);
    return 'Link copiado!';
  }
  return null;
}

export function getInitials(name) {
  if (!name) return 'GC';
  const cleanName = name.replace(/^GC\s*/i, '').trim();
  const words = cleanName.split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleanName.substring(0, 2).toUpperCase();
}

export function getColorFromName(name) {
  if (!name) return '#171717';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6', '#F97316'];
  return colors[Math.abs(hash) % colors.length];
}

export function safeStringify(obj) {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) return '[Circular]';
      cache.add(value);
    }
    return value;
  });
}

export function renderGCThumb(gc) {
  if (!gc || !gc.nome) return '';
  
  const optimizedPhoto = optimizeImage(gc.foto_url);
  
  if (optimizedPhoto) {
    return `<img src="${optimizedPhoto}" class="w-full h-full object-cover" loading="lazy" alt="${sanitize(gc.nome)}">`;
  }
  
  const initials = getInitials(gc.nome);
  const bgColor = getColorFromName(gc.nome);
  
  return `
    <div class="gc-card__avatar w-full h-full flex items-center justify-center text-white font-bold text-xs font-black shadow-inner border border-white/20 rounded-2xl" style="background-color: ${bgColor};">
      ${initials}
    </div>
  `;
}