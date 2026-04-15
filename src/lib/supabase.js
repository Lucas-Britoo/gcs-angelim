import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

function showInitError() {
  const root = document.getElementById('app-root');
  if (root) {
    root.innerHTML = `
      <div class="fixed inset-0 bg-red-50 flex items-center justify-center p-8">
        <div class="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-md">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 class="text-xl font-black text-gray-900 mb-2">Configuração Necessária</h2>
          <p class="text-sm text-gray-500 mb-4">O app não foi configurado corretamente. Verifique as variáveis de ambiente.</p>
          <button onclick="window.location.reload()" class="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm">Tentar Novamente</button>
        </div>
      </div>
    `;
  }
}

if (!isSupabaseConfigured) {
  console.warn("⚠️ Supabase: Chaves de API não encontradas.");
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showInitError);
  } else {
    showInitError();
  }
}
