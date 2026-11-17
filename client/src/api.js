// L'URL de l'API vient de VITE_API_URL, figée dans le bundle au moment du build.
// Changer cette variable sur Scalingo impose donc un redéploiement du client.
export function buildTasksUrl(baseUrl, id) {
  const base = String(baseUrl || '').replace(/\/+$/, '');
  return id === undefined ? `${base}/tasks` : `${base}/tasks/${id}`;
}

export function createApi(baseUrl = import.meta.env.VITE_API_URL) {
  async function call(method, id, body) {
    const response = await fetch(buildTasksUrl(baseUrl, id), {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || `Erreur HTTP ${response.status}`);
    }
    return data;
  }

  return {
    list: () => call('GET'),
    create: (title) => call('POST', undefined, { title, done: false }),
    update: (id, changes) => call('PUT', id, changes),
    remove: (id) => call('DELETE', id),
  };
}
