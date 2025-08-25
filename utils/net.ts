// utils/net.ts
export async function safeJson(response: Response) {
  const ct = (response.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json')) return response.json();
  // Log corto y NO devolver [] para no pisar estado válido
  const text = await response.text().catch(() => '');
  console.warn('[seguimiento] Respuesta no JSON:', response.status, text.slice(0,120));
  return null;
}

export async function safeFetchJson(url: string, init?: RequestInit) {
  try {
    const resp = await fetch(url, {
      ...init,
      // en GET evitar Content-Type; deja sólo Accept
      headers: { ...(init?.headers || {}), Accept: 'application/json' },
    });
    return await safeJson(resp);
  } catch (e) {
    console.warn('[seguimiento] fetch error:', (e as Error).message);
    return null;
  }
}
