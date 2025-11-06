const RAW = (import.meta as any)?.env?.VITE_API_URL;
const API_BASE = (typeof RAW === 'string' && RAW !== 'undefined' ? RAW : '').replace(/\/+$/, ''); // '' atau '/api'

export const apiUrl = (path: string) => {
  const p = path.startsWith('/') ? path : `/${path}`;
  // kalau sudah '/api/...' jangan dobel
  if (p.startsWith('/api/')) return `${API_BASE}${p}`;
  return `${API_BASE}/api${p}`;
};
