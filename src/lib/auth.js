import { supabase } from './supabase.js';

export function initAuth() {
  const authOverlay = document.getElementById('auth-overlay');
  const authForm = document.getElementById('auth-form');

  if (!authForm) return;

  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    
    if (!supabase) {
      showToast("Supabase offline", "error");
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showToast("Acesso Autorizado", "success");
      authOverlay.classList.add('hidden');
    } catch (err) { 
      showToast("Credenciais Inválidas", "error"); 
    }
  }

  authForm.onsubmit = handleLogin;
  
  document.getElementById('login-trigger').onclick = () => authOverlay.classList.remove('hidden');
  authOverlay.onclick = (e) => { if (e.target === authOverlay) authOverlay.classList.add('hidden'); };

  supabase.auth.onAuthStateChange((event, session) => {
    const adminPanel = document.getElementById('admin-panel');
    const loginTrigger = document.getElementById('login-trigger');

    if (session) {
      adminPanel.classList.remove('hidden');
      loginTrigger.innerHTML = `<div class="w-8 h-8 rounded-full bg-brand-dark text-white flex items-center justify-center font-black text-[10px]">${session.user.email.substring(0,2).toUpperCase()}</div>`;
      
      if (window.onAuthSuccess) window.onAuthSuccess(session);
    } else {
      adminPanel.classList.add('hidden');
      loginTrigger.innerHTML = `<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`;
      
      if (window.onAuthLogout) window.onAuthLogout();
    }
  });
}

function showToast(message, type = 'error') {
  // Assuming global showToast exists or imported. 
  // For decoupling, let's call the global one if available, or implement inline.
  if (window.showToast) window.showToast(message, type);
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.reload();
}