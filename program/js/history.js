// js/history.js — IndexedDB 存储 & 历史管理

import { showToast, uuid } from './ui.js';

const DB_NAME = 'LiteratureScreener';
const DB_VERSION = 1;
const STORE_NAME = 'screening_tasks';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(new Error('无法打开本地数据库'));
  });
}

export async function saveTask(task) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise((resolve, reject) => {
      const request = store.put(task);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (e) {
    try {
      const fallback = JSON.parse(localStorage.getItem('literature_screener_fallback') || '[]');
      const existing = fallback.findIndex(t => t.id === task.id);
      if (existing >= 0) fallback[existing] = task;
      else fallback.push(task);
      if (fallback.length > 20) fallback.splice(0, fallback.length - 20);
      localStorage.setItem('literature_screener_fallback', JSON.stringify(fallback));
    } catch { /* silent */ }
  }
}

export async function loadTask(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const task = await new Promise((resolve) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    db.close();
    return task;
  } catch {
    try {
      const fallback = JSON.parse(localStorage.getItem('literature_screener_fallback') || '[]');
      return fallback.find(t => t.id === id) || null;
    } catch { return null; }
  }
}

export function loadHistoryList() {
  return new Promise(async (resolve) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      const tasks = [];

      const request = index.openCursor(null, 'prev');
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const t = cursor.value;
          tasks.push({
            id: t.id,
            createdAt: t.createdAt,
            config: { name: t.config?.name || '' },
            papers: t.papers,
            stats: t.stats,
            status: t.status,
          });
          cursor.continue();
        } else {
          db.close();
          resolve(tasks);
        }
      };
      request.onerror = () => { db.close(); resolve([]); };
    } catch {
      try {
        const fallback = JSON.parse(localStorage.getItem('literature_screener_fallback') || '[]');
        resolve(fallback);
      } catch { resolve([]); }
    }
  });
}

export async function deleteTask(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch { /* silent */ }
}

export async function clearHistory() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch { /* silent */ }
  localStorage.removeItem('literature_screener_fallback');
}

export async function exportHistory() {
  const tasks = await loadHistoryList();
  const fullTasks = [];
  for (const t of tasks) {
    const full = await loadTask(t.id);
    if (full) fullTasks.push(full);
  }
  const json = JSON.stringify(fullTasks, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `历史数据_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('历史数据已导出', 'success');
}

export async function importHistory(file) {
  try {
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file);
    });
    const tasks = JSON.parse(text);
    if (!Array.isArray(tasks)) throw new Error('数据格式错误');
    for (const task of tasks) {
      await saveTask(task);
    }
    showToast(`成功导入 ${tasks.length} 条记录`, 'success');
  } catch (err) {
    showToast(`导入失败：${err.message}`, 'error');
  }
}

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem('literature_screener_settings') || '{}');
  } catch {
    return {};
  }
}

export async function initHistory() {
  try {
    await openDB();
  } catch {
    console.warn('IndexedDB not available, using localStorage fallback');
  }
}
