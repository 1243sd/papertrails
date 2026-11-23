const STORE = 'packs';
const CURRENT = 'current';

/** The ZIP content belongs to this browser origin, independently of the world seed. */
export function createTreasureStorage(name = 'papertrails-treasures') {
  let connection;
  let opening;
  let disposed = false;

  function database() {
    if (disposed) return Promise.reject(new Error('宝藏存储已关闭。'));
    if (connection) return Promise.resolve(connection);
    return opening ??= new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) { reject(new Error('当前浏览器无法使用本地宝藏存储。')); return; }
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onblocked = () => reject(new Error('宝藏存储正在被其他游戏窗口使用，请关闭其他窗口后重试。'));
      request.onerror = () => reject(new Error('无法打开本地宝藏存储。'));
      request.onsuccess = () => {
        const db = request.result;
        if (disposed) {
          db.close();
          reject(new Error('宝藏存储已关闭。'));
          return;
        }
        connection = db;
        db.onversionchange = () => {
          db.close();
          if (connection === db) connection = null;
        };
        resolve(db);
      };
    }).finally(() => { opening = null; });
  }

  async function access(mode, operation) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = operation(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result ?? null);
      const fail = () => reject(new Error(mode === 'readwrite' ? '无法保存宝藏包，请检查浏览器存储空间。' : '无法读取本地宝藏包。'));
      tx.onabort = fail;
      tx.onerror = fail;
    });
  }

  return {
    load() { return access('readonly', (store) => store.get(CURRENT)); },
    replace(pack) { return access('readwrite', (store) => store.put(pack, CURRENT)); },
    dispose() { disposed = true; connection?.close(); connection = null; },
  };
}
