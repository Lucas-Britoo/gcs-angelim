/**
 * Angelim PWA — Supabase Client (CDN Edition)
 * Inicializa o cliente Supabase diretamente no browser via ESM CDN.
 *
 * ⚠️  A anon key é segura de expor no client:
 *     a proteção real é feita pelo RLS (Row Level Security) no Supabase.
 *
 * Para trocar de projeto, edite apenas SUPABASE_URL e SUPABASE_ANON_KEY abaixo.
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ─── CONFIGURAÇÃO ──────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://ubxrhqehclgrpyzenuum.supabase.co';
const SUPABASE_ANON_KEY = 'sb_secret__iSvdogTgwz68bEu4z6qpg_L9RcBzps';
// ───────────────────────────────────────────────────────────────────────────────

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase: Configure SUPABASE_URL e SUPABASE_ANON_KEY em js/supabase-client.js');
}
