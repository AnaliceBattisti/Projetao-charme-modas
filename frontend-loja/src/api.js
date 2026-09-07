export const BASE_URL = "http://localhost:3333";

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.erro || `Erro ${res.status} em ${path}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: "POST", body: JSON.stringify(data) }),
};

// As imagens são servidas pelo backend (/uploads/...), não pelo Vite.
export function imagemUrl(caminho) {
  return caminho ? `${BASE_URL}${caminho}` : null;
}
