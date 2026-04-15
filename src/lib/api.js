import { supabase } from './supabase.js';

const CACHE_KEY = 'angelim_gcs_cache_v3';

export async function fetchGCs() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
}

export async function syncGCs() {
  const { data, error } = await supabase.from('gcs').select('*');
  if (error) throw error;
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  return data;
}

export async function createGC(gcData) {
  const { error } = await supabase.from('gcs').insert([gcData]);
  if (error) throw error;
  localStorage.removeItem(CACHE_KEY);
}

export async function updateGC(id, gcData) {
  const { error } = await supabase.from('gcs').update(gcData).eq('id', id);
  if (error) throw error;
  localStorage.removeItem(CACHE_KEY);
}

export async function deleteGC(id) {
  const { error } = await supabase.from('gcs').delete().eq('id', id);
  if (error) throw error;
  localStorage.removeItem(CACHE_KEY);
}

export async function uploadPhoto(file) {
  if (!file || !supabase) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from('gc-photos')
    .upload(fileName, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('gc-photos')
    .getPublicUrl(fileName);

  return publicUrl;
}