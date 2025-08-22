import axios from 'axios';
import { store } from '../store';
import { authActions } from '../store';

const isProd = process.env.NODE_ENV === 'production';

const api = axios.create({
  baseURL: isProd
    ? 'https://musicartincubator-cadenza.onrender.com'
    : 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Important for cookies
});

const pendingRequests = new Map();

const cacheWrapper = async (method, url, config = {}) => {
  if (method.toLowerCase() !== 'get') {
    return api[method](url, config);
  }

  const isManualRefresh = config.headers?.['Cache-Control'] === 'no-cache';
  const baseURL = api.defaults.baseURL || window.location.origin;
  const fullURL = url.startsWith('http') ? url : `${baseURL}${url}`;
  const cacheKey = new Request(fullURL + (config.params ? `?${new URLSearchParams(config.params)}` : ''));

  try {
    const cache = await caches.open('dynamic-v2');
    if (isManualRefresh) {
      await cache.delete(cacheKey);
    } else {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        const data = await cachedResponse.json();
        return data;
      }
    }

    const response = await api[method](url, config);

    if (!isManualRefresh) {
      const responseToCache = new Response(JSON.stringify(response.data), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=300'
        }
      });
      await cache.put(cacheKey, responseToCache);
    }

    return response.data;
  } catch (error) {
    console.error('Cache operation failed:', error);
    const response = await api[method](url, config);
    return response.data;
  }
};

const cachedApi = {
  get: (url, config) => cacheWrapper('get', url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config)
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('isLoggedIn');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

const invalidateCache = async () => {
  const cache = await caches.open('dynamic-v2');
  const keys = await cache.keys();
  for (const key of keys) {
    await cache.delete(key);
  }
};

async function openRequestsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cadenza-requests', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const saveRequestToDB = async (url, method, data) => {
  if (!navigator.onLine) {
    console.log('[API] Offline - Request saved:', { url, method, data });

    const db = await openRequestsDB();
    const tx = db.transaction('requests', 'readwrite');
    const store = tx.objectStore('requests');
    await store.add({ url, method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

    toast.info('Zahtjev spremljen. Bit će poslan kad se vratiš online.', {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: 'var(--iznad)',
        color: 'var(--tekst)'
      }
    });

    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-post-requests');
      console.log('[API] Sync request registered');
    }
  }
};


cachedApi.post = async (url, data, config) => {
  if (navigator.onLine) {
    return api.post(url, data, config);
  } else {
    await saveRequestToDB(url, 'POST', data);
    return { offline: true, message: 'Zahtjev spremljen. Bit će poslan kad se vratiš online.' };
  }
};

cachedApi.put = async (url, data, config) => {
  if (navigator.onLine) {
    return api.put(url, data, config);
  } else {
    await saveRequestToDB(url, 'PUT', data);
    return { offline: true, message: 'Zahtjev spremljen. Bit će poslan kad se vratiš online.' };
  }
};

cachedApi.delete = async (url, config) => {
  if (navigator.onLine) {
    return api.delete(url, config);
  } else {
    await saveRequestToDB(url, 'DELETE', { url, config });
    return { offline: true, message: 'Zahtjev spremljen. Bit će poslan kad se vratiš online.' };
  }
};

const ApiConfig = {
  api,
  cachedApi,
  baseUrl: isProd
    ? 'https://musicartincubator-cadenza.onrender.com'
    : 'http://localhost:5000',
  socketUrl: isProd
    ? 'https://musicartincubator-cadenza.onrender.com'
    : 'http://localhost:5000',
  setAuthToken,
  invalidateCache
};

export default ApiConfig;
