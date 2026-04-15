/**
 * Database Module - Configuração do Dexie para modo offline
 * Gerencia a conexão com IndexedDB
 */

const DB_NAME = 'AngelimDB';
const DB_VERSION = 1;

let db = null;

export async function initDatabase() {
  if (!db) {
    db = new Dexie(DB_NAME);
    db.version(DB_VERSION).stores({
      growthGroups: '++id, nome, bairro, dia',
      pendingSync: '++id, action, data, timestamp'
    });
  }
  
  try {
    await db.open();
    console.log('💾 IndexedDB inicializada');
  } catch (err) {
    console.error('❌ Erro ao abrir IndexedDB:', err);
    throw err;
  }
}

export async function saveGrowthGroupsToCache(groups) {
  if (!db || !groups?.length) return false;
  
  try {
    await db.growthGroups.clear();
    await db.growthGroups.bulkAdd(groups);
    return true;
  } catch (err) {
    console.error('❌ Erro ao salvar no cache:', err);
    return false;
  }
}

export async function loadGrowthGroupsFromCache() {
  if (!db) return [];
  
  try {
    return await db.growthGroups.toArray();
  } catch (err) {
    console.warn('Cache vazio:', err);
    return [];
  }
}

export function getDatabase() {
  return db;
}