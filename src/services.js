/**
 * Services Module - Funções que buscam e salvam dados
 * Orquestra a lógica de dados entre Supabase e IndexedDB
 */

import { supabase, isSupabaseConfigured } from './lib/supabase.js';
import { initDatabase, saveGrowthGroupsToCache, loadGrowthGroupsFromCache } from './database.js';

const TABLE_NAME = 'gcs';

export async function initAppServices() {
  await initDatabase();
}

export async function fetchAllGrowthGroups() {
  const result = {
    data: [],
    error: null
  };
  
  if (!isSupabaseConfigured) {
    result.error = new Error('Supabase não configurado');
    return result;
  }
  
  try {
    const response = await supabase.from(TABLE_NAME).select('*');
    
    if (response.error) {
      throw response.error;
    }
    
    result.data = response.data || [];
    return result;
  } catch (err) {
    console.error('❌ Erro ao buscar grupos:', err);
    result.error = err;
    return result;
  }
}

export async function createGrowthGroup(groupData) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não disponível');
  }
  
  try {
    const response = await supabase.from(TABLE_NAME).insert([groupData]);
    
    if (response.error) {
      throw response.error;
    }
    
    return { success: true, data: response.data };
  } catch (err) {
    console.error('❌ Erro ao criar grupo:', err);
    throw err;
  }
}

export async function updateGrowthGroup(id, groupData) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não disponível');
  }
  
  try {
    const response = await supabase.from(TABLE_NAME).update(groupData).eq('id', id);
    
    if (response.error) {
      throw response.error;
    }
    
    return { success: true, data: response.data };
  } catch (err) {
    console.error('❌ Erro ao atualizar grupo:', err);
    throw err;
  }
}

export async function deleteGrowthGroup(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não disponível');
  }
  
  try {
    const response = await supabase.from(TABLE_NAME).delete().eq('id', id);
    
    if (response.error) {
      throw response.error;
    }
    
    return { success: true };
  } catch (err) {
    console.error('❌ Erro ao excluir grupo:', err);
    throw err;
  }
}

export function subscribeToRealtimeChanges(callback) {
  if (!supabase || !isSupabaseConfigured) return null;
  
  const channel = supabase
    .channel('public:growthGroups')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: TABLE_NAME 
    }, (payload) => {
      console.log('📡 Alteração detectada:', payload.eventType);
      if (callback) callback(payload);
    })
    .subscribe((status, err) => {
      console.log('🔌 Status do Canal:', status, err ? err.message : '');
    });
  
  return channel;
}

export async function loadGrowthGroupsWithCache() {
  try {
    const cachedGroups = await loadGrowthGroupsFromCache();
    
    if (cachedGroups.length > 0) {
      return cachedGroups;
    }
  } catch (err) {
    console.warn('Cache vazio ou inacessível');
  }
  
  if (!navigator.onLine) {
    return [];
  }
  
  const result = await fetchAllGrowthGroups();
  
  if (result.data?.length > 0) {
    await saveGrowthGroupsToCache(result.data);
  }
  
  // RETURN DATA EVEN IF IT'S EMPTY BUT NO ERROR (to avoid infinite loading)
  return result.data || [];
}