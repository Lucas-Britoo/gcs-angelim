import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

/**
 * Angelim PWA — Supabase Client (CDN Edition)
 * Inicializa o cliente Supabase diretamente no browser via ESM CDN.
 *
 * ⚠️  A anon key é segura de expor no client:
 *     a proteção real é feita pelo RLS (Row Level Security) no Supabase.
 *
 * Para trocar de projeto, edite apenas as variáveis de ambiente ou o arquivo .env
 */

// ─── CONFIGURAÇÃO ──────────────────────────────────────────────────────────────
// Try Vite env first, fallback to hardcoded for CDN compatibility
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL || 'https://ubxrhqehclgrpyzenuum.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieHJocWVoY2xncnB5emVudXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MDkzNDAsImV4cCI6MjA5MTE4NTM0MH0.SnGbsf86_AwOEdTyC0yRTRjFTRbQAPRuo1NhwnNevak';
// ───────────────────────────────────────────────────────────────────────────────

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase: Configure SUPABASE_URL e SUPABASE_ANON_KEY em js/supabase-client.js');
}
